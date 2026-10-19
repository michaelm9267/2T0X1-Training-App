import {
  createCmosStore,
  createRecord,
  editRecord,
  saveRecord,
  checkRecord,
  assignShipments,
  deriveShipment,
  deleteRecord,
  transition,
  normalizeCmosStore,
  currentCheck,
} from "./model";
import {
  generateDocument,
  getQuote,
  assignQuote,
  retrieveExpressDocuments,
  markDocumentViewed,
} from "./operations";
import { projectCdf, projectOutbound, migrateCdfCmos } from "./courseAdapters";
import { newPracticeSession } from "../CargoWindow/practice";
import { createOutboundExercise, applyLabel } from "../Outbound/outboundLogic";
function ready() {
  let s = createRecord(createCmosStore(), "shipments", {
    assetKey: "customer-1",
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
    assetKey: "customer-1",
    number: "1",
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
function rated() {
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
  return transition(s, "express", "express-1", "Status Request").store;
}
test("normalization repairs nested lots and history without losing raw scalar values", () => {
  let s = createRecord(ready(), "hazards", {
    shipmentId: "shipments-1",
    page1: [],
    page2: { metricQty: "wrong" },
    lots: {},
  });
  s.history = [
    null,
    {
      status: "Edits failed",
      errors: ["wrong"],
      kind: "shipments",
      id: "shipments-1",
    },
  ];
  const n = normalizeCmosStore(JSON.parse(JSON.stringify(s)));
  expect(n.hazards["hazards-1"].draft.lots).toEqual([]);
  expect(n.hazards["hazards-1"].draft.page2.metricQty).toBe("wrong");
  expect(n.history).not.toContain(null);
});
test("normalization rejects saved arrays and malformed carrier rate rows", () => {
  const s = rated();
  s.express["express-1"].saved = [];
  s.express["express-1"].result.rates = [null, { name: {}, scac: "FDE" }];
  const n = normalizeCmosStore(s);
  expect(n.express["express-1"].saved).toBeNull();
  expect(n.express["express-1"].result.rates).not.toContain(null);
});
test("split moves hazardous ownership with its physical piece and projects the asset once", () => {
  const session = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  let s = migrateCdfCmos(session);
  const parent = Object.values(s.shipments).find(
      (r) => r.draft.assetKey === session.scenarioId,
    ),
    piece = Object.values(s.pieces).find(
      (r) => r.draft.shipmentId === parent.id,
    );
  s = deriveShipment(s, parent.id, "Split", [piece.id]);
  const child = s.selection.shipments;
  s = saveRecord(
    editRecord(s, "shipments", child, { tcn: "TRN-SPLIT", nsn: "NNSN", ciic: "U", commoditySH: "AZ", poe: "ANC", pod: "FAI", tac: "TRN1", eta: "1", airDim: "A" }),
    "shipments",
    child,
  );
  s = checkRecord(s, "shipments", child);
  s = assignShipments(s, "airManifests", s.selection.airManifests, [child]);
  s = saveRecord(s, "airManifests", s.selection.airManifests);
  expect(
    Object.values(s.hazards).filter((h) => h.saved?.shipmentId === parent.id),
  ).toHaveLength(0);
  const p = projectCdf(s, session);
  expect(
    p.state.assignments
      .flatMap((a) => a.pieceKeys)
      .filter((k) => k === session.scenarioId),
  ).toHaveLength(1);
});
test("piece corrections invalidate MSL print credit and already applied labels", () => {
  let s = generateDocument(
    ready(),
    "shipments",
    "shipments-1",
    "Military shipping label",
  ).store;
  let e = projectOutbound(s, {
    "customer-1": { ...createOutboundExercise(), packed: true },
  })["customer-1"];
  e = applyLabel(e, "msl");
  expect(e.labels.msl).toBe(true);
  s = saveRecord(
    editRecord(s, "pieces", "pieces-1", { weight: "999" }),
    "pieces",
    "pieces-1",
  );
  s = checkRecord(s, "shipments", "shipments-1");
  e = projectOutbound(s, { "customer-1": e })["customer-1"];
  expect(e.printed.msl).toBe(false);
  expect(e.labels.msl).toBe(false);
});
test("editing an assigned quote invalidates dependent express checks and rating", () => {
  let s = createRecord(ready(), "quotes", {
    shipmentId: "shipments-1",
    originZip: "99506",
    destinationZip: "94535",
    weight: "20",
    length: "12",
    width: "12",
    height: "12",
  });
  s = getQuote(s, "quotes-1").store;
  s = assignQuote(s, "quotes-1", 0).store;
  s = saveRecord(
    editRecord(s, "express", "express-1", { shipDate: "13Oct2026" }),
    "express",
    "express-1",
  );
  s = checkRecord(s, "express", "express-1");
  s = transition(s, "express", "express-1", "Send Request").store;
  s = transition(s, "express", "express-1", "Status Request").store;
  expect(s.express["express-1"].result.state).toBe("success");
  s = editRecord(s, "quotes", "quotes-1", { weight: "99" });
  expect(currentCheck(s.express["express-1"])).toBe(false);
  expect(s.express["express-1"].result).toBeNull();
});
test("draft CBL printing cannot satisfy final-print release", () => {
  let s = createRecord(ready(), "bills", {
    scac: "TRNC",
    currency: "USD",
    estimatedCharges: "25",
    waybill: "TRNWB",
    deliveryDate: "16Oct2026",
  });
  s = assignShipments(s, "bills", "bills-1", ["shipments-1"]);
  s = saveRecord(s, "bills", "bills-1");
  s = checkRecord(s, "bills", "bills-1");
  s = transition(s, "bills", "bills-1", "Print").store;
  expect(transition(s, "bills", "bills-1", "Release").outcome.status).toBe(
    "failed",
  );
});
test("abort clears release and both print prerequisites and changes the CDF basis", () => {
  const session = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  const s = migrateCdfCmos(session),
    before = projectCdf(s, session);
  const result = transition(
    s,
    "airManifests",
    s.selection.airManifests,
    "Abort",
  );
  const after = projectCdf(result.store, { ...session, cdfCmos: before.state });
  expect(after.state.basis).not.toBe(before.state.basis);
  expect(after.state.pullSheetRevision).toBeNull();
  expect(after.state.manifestPrintRevision).toBeNull();
});
test("deleting managed cargo clears CMOS accomplishments while preserving packing work", () => {
  let s = rated();
  let e = projectOutbound(s, {
    "customer-1": { ...createOutboundExercise(), packed: true },
  })["customer-1"];
  s = deleteRecord(s, "shipments", "shipments-1");
  const n = projectOutbound(s, { "customer-1": e })["customer-1"];
  expect(n.planningChecked).toBe(false);
  expect(n.mode).toBeNull();
  expect(n.spe).toBeNull();
  expect(n.packed).toBe(true);
});
test("deleting SPE clears its rating instead of restoring the old projected result", () => {
  let s = rated();
  const e = projectOutbound(s, { "customer-1": createOutboundExercise() })[
    "customer-1"
  ];
  s = deleteRecord(s, "express", "express-1");
  expect(projectOutbound(s, { "customer-1": e })["customer-1"].spe).toBeNull();
});
test("deleted record identities are never reused by a replacement", () => {
  let s = generateDocument(
    ready(),
    "shipments",
    "shipments-1",
    "Military shipping label",
  ).store;
  s = deleteRecord(s, "shipments", "shipments-1");
  s = createRecord(s, "shipments", { assetKey: "customer-1", tcn: "TRN-NEW" });
  expect(s.selection.shipments).not.toBe("shipments-1");
  expect(
    normalizeCmosStore(JSON.parse(JSON.stringify(s))).selection.shipments,
  ).toBe("shipments-2");
});
test("viewing a retrieved document stays read-only and does not award printing", () => {
  let s = retrieveExpressDocuments(rated(), "express-1", [
    "Carrier label",
  ]).store;
  const id = s.selection.documents;
  s = markDocumentViewed(s, id);
  expect(s.documents[id].saved.printed).toBe(false);
});
test("empty unsaved equipment cannot pass routing edits", () => {
  let s = createRecord(ready(), "routings", {
    requestType: "OR",
    atrHours: "24",
    pickupEarliest: "2026-10-14T08:00",
    deliveryLatest: "2026-10-16T14:00",
  });
  s = assignShipments(s, "routings", "routings-1", ["shipments-1"]);
  s = createRecord(s, "documents", {
    ownerKind: "routings",
    ownerId: "routings-1",
    collection: "Equip Load Plan",
  });
  s = saveRecord(s, "routings", "routings-1");
  s = checkRecord(s, "routings", "routings-1");
  expect(s.routings["routings-1"].check.passed).toBe(false);
});

test("editing physical cargo clears both air print prerequisites even after rechecking", () => {
  const session = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  let s = migrateCdfCmos(session);
  const airId = s.selection.airManifests;
  const piece = Object.values(s.pieces)[0];
  s = editRecord(s, "pieces", piece.id, { weight: "999" });
  expect(s.airManifests[airId].pullRevision).toBeNull();
  expect(s.airManifests[airId].printRevision).toBeNull();
});

test("a quote correction must be requoted before its assigned SPE can be checked again", () => {
  let s = createRecord(ready(), "quotes", {
    shipmentId: "shipments-1",
    originZip: "99506",
    destinationZip: "94535",
    weight: "20",
    length: "12",
    width: "12",
    height: "12",
  });
  s = assignQuote(getQuote(s, "quotes-1").store, "quotes-1", 0).store;
  s = saveRecord(
    editRecord(s, "express", "express-1", { shipDate: "13Oct2026" }),
    "express",
    "express-1",
  );
  s = saveRecord(
    editRecord(s, "quotes", "quotes-1", { weight: "99" }),
    "quotes",
    "quotes-1",
  );
  expect(
    checkRecord(s, "express", "express-1").express["express-1"].check.passed,
  ).toBe(false);
});
