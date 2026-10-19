import {
  createCmosStore,
  createRecord,
  editRecord,
  saveRecord,
  checkRecord,
  transition,
  assignShipments,
  currentCheck,
} from "./model";
import {
  getQuote,
  assignQuote,
  retrieveExpressDocuments,
  closeoutCarrier,
  validateFunds,
  clearHazards,
} from "./operations";
function ready() {
  let s = createRecord(createCmosStore(), "shipments", {
    tcn: "TRN001",
    description: "Training box",
    milMode: "J",
    nmfc: "999913",
    rdd: "999",
    nsn: "NNSN",
    ciic: "U",
    origin: "F00001",
    destination: "F00002",
    tac: "TRN1",
    // Funds already validated (Val Funds → TGET → LOA Val Status P), so the shipment can be rated.
    loa: "P",
  });
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    weight: "20",
    length: "12",
    width: "12",
    height: "12",
    typePack: "BX",
  });
  s = saveRecord(s, "pieces", "pieces-1");
  s = saveRecord(s, "shipments", "shipments-1");
  return checkRecord(s, "shipments", "shipments-1");
}
test("standalone quote cannot assign; linked quote assigns SPE and becomes stale on shipment edit", () => {
  let s = createRecord(ready(), "quotes", {
    weight: "20",
    originZip: "99506",
    destinationZip: "94535",
    packageType: "Package",
    length: "12",
    width: "12",
    height: "12",
  });
  s = getQuote(s, "quotes-1").store;
  expect(s.quotes["quotes-1"].result.rates.length).toBeGreaterThan(1);
  expect(assignQuote(s, "quotes-1", 0).outcome.status).toBe("failed");
  s = editRecord(s, "quotes", "quotes-1", { shipmentId: "shipments-1" });
  s = getQuote(s, "quotes-1").store;
  s = assignQuote(s, "quotes-1", 0).store;
  expect(s.express["express-1"].draft.scac).toBe("FDE");
  s = editRecord(s, "shipments", "shipments-1", { tac: "CHANGED" });
  expect(s.quotes["quotes-1"].result).toBeNull();
});
test("international request checks required details and returns simulated rating after status request", () => {
  let s = createRecord(ready(), "express", {
    shipmentId: "shipments-1",
    scac: "FDE",
    service: "IP",
    shipDate: "13Oct2026",
    packageType: "Package",
    domInt: "INT",
  });
  s = saveRecord(s, "express", "express-1");
  s = checkRecord(s, "express", "express-1");
  expect(
    transition(s, "express", "express-1", "Send Request").outcome.status,
  ).toBe("failed");
  s = editRecord(s, "express", "express-1", {
    shipmentValue: "100",
    harmonizedCode: "1234",
    itn: "TRN-ITN",
  });
  s = saveRecord(s, "express", "express-1");
  s = checkRecord(s, "express", "express-1");
  s = transition(s, "express", "express-1", "Send Request").store;
  expect(s.express["express-1"].result.state).toBe("pending");
  s = transition(s, "express", "express-1", "Status Request").store;
  expect(s.express["express-1"].result.tracking).toMatch(/^\d{12}$/); // FedEx Express format
  s = retrieveExpressDocuments(s, "express-1", ["Carrier label"]).store;
  expect(
    Object.values(s.documents).some((d) => d.draft.title === "Carrier label"),
  ).toBe(true);
  s = closeoutCarrier(s, "FDE", "13Oct2026").store;
  expect(s.express["express-1"].status).toBe("Closed out");
  expect(
    Object.values(s.documents).some((d) => d.draft.title === "Pickup report"),
  ).toBe(true);
  s = transition(s, "express", "express-1", "Cancel").store;
  expect(s.express["express-1"].result).toBeNull();
});
test("multi-TCN CBL requires current checks and final printing before release", () => {
  let s = createRecord(ready(), "bills", {
    scac: "TRNC",
    currency: "USD",
    estimatedCharges: "25",
    waybill: "TRNWB",
    deliveryDate: "15Oct2026",
  });
  s = assignShipments(s, "bills", "bills-1", ["shipments-1"]);
  s = saveRecord(s, "bills", "bills-1");
  s = checkRecord(s, "bills", "bills-1");
  expect(currentCheck(s.bills["bills-1"])).toBe(true);
  expect(transition(s, "bills", "bills-1", "Release").outcome.status).toBe(
    "failed",
  );
  s = transition(s, "bills", "bills-1", "Final Print").store;
  expect(transition(s, "bills", "bills-1", "Release").outcome.messages).toContain("Departure Date is required: enter ddMmmyyyy/HHmm (e.g. 18Oct2026/1956).");
  s = transition(s, "bills", "bills-1", "Release", { releaseDetails: { departureDate: "18Oct2026/1956" } }).store;
  expect(s.bills["bills-1"].status).toBe("Released");
});
test("clearing hazardous indicator removes pending and saved DG records without blocking save", () => {
  let s = ready();
  s = createRecord(s, "hazards", {
    shipmentId: "shipments-1",
    piece: "invalid",
    lots: [{ id: "lot-1", roundCount: "unknown" }],
  });
  s = saveRecord(s, "hazards", "hazards-1");
  s = editRecord(s, "shipments", "shipments-1", { t9Required: true });
  s = clearHazards(s, "shipments-1");
  expect(Object.keys(s.hazards)).toHaveLength(0);
  expect(s.shipments["shipments-1"].draft.t9Required).toBe(false);
  expect(s.shipments["shipments-1"].draft.hazmat).toBe("N - Not hazardous");
});
test("fund validation reports simulated result without changing the TAC or discarding input", () => {
  const s = createRecord(createCmosStore(), "shipments", { tac: "" });
  const r = validateFunds(s, "shipments", "shipments-1");
  expect(r.outcome.status).toBe("failed");
  expect(r.store.shipments["shipments-1"].draft.tac).toBe("");
});
test("retrieval alone does not mark a carrier document printed", () => {
  let s = createRecord(ready(), "express", {
    shipmentId: "shipments-1",
    scac: "FDE",
    service: "Ground",
    shipDate: "13Oct2026",
    packageType: "Box",
  });
  s = saveRecord(s, "express", "express-1");
  s = checkRecord(s, "express", "express-1");
  s = transition(s, "express", "express-1", "Send Request").store;
  s = transition(s, "express", "express-1", "Status Request").store;
  s = retrieveExpressDocuments(s, "express-1", ["Carrier label"]).store;
  expect(Object.values(s.documents)[0].saved.printed).toBe(false);
});
test("departure parameters do not invalidate an already checked and printed manifest", () => {
  let s = createRecord(ready(), "truckManifests", {
    dsoeId: "TRN01",
    chalk: "001",
    conveyanceMode: "9",
    equipmentType: "AV1",
    destinationDODAAC: "FB6520", originDODAAC: "FA5030", pickUpDate: "13OCT2026", truckSerialBumperNumber: "TMO", motorCarrierName: "773 LRS/LGRTC",
  });
  s = assignShipments(s, "truckManifests", "truckManifests-1", ["shipments-1"]);
  s = saveRecord(s, "truckManifests", "truckManifests-1");
  s = checkRecord(s, "truckManifests", "truckManifests-1");
  s = transition(s, "truckManifests", "truckManifests-1", "Final Print").store;
  const result = transition(
    s,
    "truckManifests",
    "truckManifests-1",
    "Release",
    { releaseDetails: { departureAt: "2026-10-13T14:00" } },
  );
  expect(result.outcome.status).toBe("success");
  expect(
    result.store.truckManifests["truckManifests-1"].releaseDetails.departureAt,
  ).toBe("2026-10-13T14:00");
});
test("quote results account for dimensional weight", () => {
  let s = createRecord(ready(), "quotes", {
    originZip: "99506",
    destinationZip: "94535",
    weight: "1",
    length: "24",
    width: "24",
    height: "24",
    packageType: "Box",
  });
  s = getQuote(s, "quotes-1").store;
  expect(s.quotes["quotes-1"].result.rates[0].ratedWeight).toBe(100);
});
test("funds must be validated (LOA Val Status P) before an SPE request or a rate quote", () => {
  const { prevalidateLoa, FUNDS_REQUIRED } = require("./model");
  let s = editRecord(ready(), "shipments", "shipments-1", { loa: "" });
  s = createRecord(s, "express", { shipmentId: "shipments-1", scac: "FDE", service: "PO", domInt: "DOM", shipDate: "12Oct2026", packageType: "Box" });
  s = saveRecord(s, "express", "express-1");
  expect(transition(s, "express", "express-1", "Send Request").outcome.messages).toContain(FUNDS_REQUIRED("TRN001"));
  s = createRecord(s, "quotes", { shipmentId: "shipments-1", weight: "20", length: "12", width: "12", height: "12", originZip: "99506", destinationZip: "99701" });
  expect(getQuote(s, "quotes-1").outcome.messages).toContain(FUNDS_REQUIRED("TRN001"));
  expect(prevalidateLoa(editRecord(s, "shipments", "shipments-1", { tac: "" }), "shipments-1")).toMatchObject({ ok: false, message: "TAC is required to validate funds." });
  const validated = prevalidateLoa(s, "shipments-1");
  expect(validated.ok).toBe(true);
  expect(validated.store.shipments["shipments-1"].draft.loa).toBe("P");
  expect(transition(validated.store, "express", "express-1", "Send Request").outcome.messages || []).not.toContain(FUNDS_REQUIRED("TRN001"));
});
