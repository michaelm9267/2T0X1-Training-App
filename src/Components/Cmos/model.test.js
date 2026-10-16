import {
  createCmosStore,
  createRecord,
  editRecord,
  saveRecord,
  checkRecord,
  assignShipments,
  transition,
  totals,
  deriveShipment,
  normalizeCmosStore,
} from "./model";
const newShipment = () =>
  createRecord(createCmosStore(), "shipments", {
    tcn: "TRN001",
    milMode: "J",
    description: "Training box",
    origin: "F00001",
    destination: "F00002",
    tac: "TRN1",
  });
test("saving incomplete raw input preserves it and never passes checks", () => {
  let s = createRecord(createCmosStore(), "shipments", {});
  s = editRecord(s, "shipments", "shipments-1", { weight: "wrong", tcn: "" });
  s = saveRecord(s, "shipments", "shipments-1");
  expect(s.shipments["shipments-1"].saved).toMatchObject({
    weight: "wrong",
    tcn: "",
  });
  expect(s.shipments["shipments-1"].check).toBeNull();
  s = editRecord(s, "shipments", "shipments-1", { tcn: "FIXED" });
  expect(s.shipments["shipments-1"].draft.tcn).toBe("FIXED");
  expect(
    normalizeCmosStore(JSON.parse(JSON.stringify(s))).shipments["shipments-1"]
      .draft.weight,
  ).toBe("wrong");
});
test("check failures preserve drafts; a changed saved revision invalidates checks", () => {
  let s = saveRecord(
    createRecord(createCmosStore(), "shipments", {}),
    "shipments",
    "shipments-1",
  );
  s = checkRecord(s, "shipments", "shipments-1");
  expect(s.shipments["shipments-1"].check.passed).toBe(false);
  s = newShipment();
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    weight: "10",
    length: "12",
    width: "12",
    height: "12",
    typePack: "BX",
  });
  s = saveRecord(s, "pieces", "pieces-1");
  s = saveRecord(s, "shipments", "shipments-1");
  s = checkRecord(s, "shipments", "shipments-1");
  expect(s.shipments["shipments-1"].check.passed).toBe(true);
  s = saveRecord(s, "shipments", "shipments-1");
  expect(s.shipments["shipments-1"].check.passed).toBe(true);
  s = editRecord(s, "pieces", "pieces-1", { weight: "11" });
  expect(s.shipments["shipments-1"].check).toBeNull();
});
test("manifest references survive TCN edits and totals count each piece", () => {
  let s = newShipment();
  for (const w of ["10", "20"]) {
    s = createRecord(s, "pieces", {
      shipmentId: "shipments-1",
      weight: w,
      length: "12",
      width: "12",
      height: "12",
    });
    s = saveRecord(s, "pieces", s.selection.pieces);
  }
  s = createRecord(s, "truckManifests", {});
  s = assignShipments(s, "truckManifests", "truckManifests-1", ["shipments-1"]);
  s = editRecord(s, "shipments", "shipments-1", { tcn: "CORRECTED" });
  expect(s.truckManifests["truckManifests-1"].draft.shipmentIds).toEqual([
    "shipments-1",
  ]);
  expect(totals(s, ["shipments-1"])).toEqual({
    pieces: 2,
    weight: 30,
    cube: 2,
  });
});
test("partial shipment moves selected pieces without duplicating physical assets", () => {
  let s = newShipment();
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    assetKey: "box-1",
    weight: "10",
  });
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    assetKey: "box-2",
    weight: "20",
  });
  s = deriveShipment(s, "shipments-1", "Split", ["pieces-2"]);
  expect(s.shipments["shipments-2"].draft.parentId).toBe("shipments-1");
  expect(s.pieces["pieces-2"].draft.shipmentId).toBe("shipments-2");
  expect(s.pieces["pieces-1"].draft.shipmentId).toBe("shipments-1");
});
test("operational errors do not prevent saving or clear entries", () => {
  let s = createRecord(createCmosStore(), "bills", { waybill: "unfinished" });
  const r = transition(s, "bills", "bills-1", "Release");
  expect(r.outcome.status).toBe("failed");
  s = saveRecord(r.store, "bills", "bills-1");
  expect(s.bills["bills-1"].saved.waybill).toBe("unfinished");
});
test("creating a new piece invalidates a previous shipment check immediately", () => {
  let s = newShipment();
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    weight: "10",
    length: "12",
    width: "12",
    height: "12",
    typePack: "BX",
  });
  s = saveRecord(s, "pieces", "pieces-1");
  s = saveRecord(s, "shipments", "shipments-1");
  s = checkRecord(s, "shipments", "shipments-1");
  expect(s.shipments["shipments-1"].check.passed).toBe(true);
  s = createRecord(s, "pieces", { shipmentId: "shipments-1" });
  expect(s.shipments["shipments-1"].check).toBeNull();
});
test("equipment changes invalidate the route check and print readiness", () => {
  let s = createRecord(createCmosStore(), "routings", {});
  s.routings["routings-1"].check = { passed: true, revision: 0 };
  s.routings["routings-1"].printRevision = 0;
  s = createRecord(s, "documents", {
    ownerKind: "routings",
    ownerId: "routings-1",
    collection: "Equip Load Plan",
  });
  expect(s.routings["routings-1"].check).toBeNull();
  expect(s.routings["routings-1"].printRevision).toBeNull();
});
