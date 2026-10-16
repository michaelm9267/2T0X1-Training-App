import { newPracticeSession } from "../CargoWindow/practice";
import { newOutboundSession } from "../Outbound/OutboundTrainer";
import {
  migrateCdfCmos,
  migrateOutboundCmos,
  projectCdf,
  projectOutbound,
} from "./courseAdapters";
import { editRecord, saveRecord, createRecord, checkRecord } from "./model";
test("CDF migration retains unfinished data and associates physical cargo without inventing passed checks", () => {
  const s = newPracticeSession({ section: "manifest", random: () => 0.2 });
  const key = s.scenarioId;
  s.exercises[key].manifestDraft = { tcn: "", description: "unfinished" };
  const store = migrateCdfCmos(s);
  const r = Object.values(store.shipments).find(
    (r) => r.draft.assetKey === key,
  );
  expect(r.draft.description).toBe("unfinished");
  expect(r.check).toBeNull();
  expect(
    Object.values(store.pieces).some((p) => p.draft.assetKey === key),
  ).toBe(false);
});
test("Outbound migration keeps legacy saved work, but saving a correction cannot complete planning", () => {
  const s = newOutboundSession({ random: () => 0.2 });
  const cargo = s.shipments[0];
  s.exercises[cargo.key].cmos.record = {
    saved: true,
    draft: { tcn: cargo.tcn, nomen: "LEGACY", milMode: "J" },
    pieces: [{ weight: "12" }],
  };
  let store = migrateOutboundCmos(s);
  const r = Object.values(store.shipments).find(
    (r) => r.draft.assetKey === cargo.key,
  );
  expect(r.saved.description).toBe("LEGACY");
  expect(r.check).toBeNull();
  store = saveRecord(
    editRecord(store, "shipments", r.id, { tcn: "" }),
    "shipments",
    r.id,
  );
  const projected = projectOutbound(store, s.exercises);
  expect(projected[cargo.key].planningChecked).toBe(false);
  expect(projected[cargo.key].cmos.record.draft.tcn).toBe("");
});
test("a shared store survives migration intact and does not leak into another course", () => {
  const s = newOutboundSession({ random: () => 0.2 });
  let store = migrateOutboundCmos(s);
  store = createRecord(store, "bills", { waybill: "incomplete" });
  const loaded = migrateOutboundCmos({
    ...s,
    sharedCmos: JSON.parse(JSON.stringify(store)),
  });
  expect(loaded.bills["bills-1"].draft.waybill).toBe("incomplete");
  expect(
    migrateCdfCmos(
      newPracticeSession({ section: "manifest", random: () => 0.2 }),
    ).bills,
  ).toEqual({});
});
test("CDF draft save projects raw fields without awarding manifest acceptance", () => {
  const s = newPracticeSession({ section: "manifest", random: () => 0.2 });
  let store = migrateCdfCmos(s);
  const r = Object.values(store.shipments).find(
    (r) => r.draft.assetKey === s.scenarioId,
  );
  store = saveRecord(
    editRecord(store, "shipments", r.id, { tcn: "" }),
    "shipments",
    r.id,
  );
  const result = projectCdf(store, s);
  expect(result.exercises[s.scenarioId].shipmentRecord.tcn).toBe("");
  expect(result.exercises[s.scenarioId].manifestAccepted).toBe(false);
});
test("CDF import preserves incomplete saved ammunition quantities", () => {
  const { exportSession, importSession } = require("../../session");
  const s = newPracticeSession({
    section: "manifest",
    cargo: "ammunition",
    random: () => 0.2,
  });
  let store = migrateCdfCmos(s);
  const id = store.selection.shipments;
  store = createRecord(store, "hazards", {
    shipmentId: id,
    piece: "?",
    page1: {},
    page2: {},
    lots: [{ id: "lot-1", roundCount: "unknown", weight: "wrong" }],
  });
  store = saveRecord(store, "hazards", store.selection.hazards);
  store = saveRecord(store, "shipments", id);
  const p = projectCdf(store, s);
  const imported = importSession(
    exportSession({ ...s, exercises: p.exercises, cdfCmos: p.state }),
  );
  expect(imported).not.toBeNull();
  expect(
    imported.cdfCmos.sharedCmos.hazards["hazards-1"].saved.lots[0].roundCount,
  ).toBe("unknown");
});
test("Outbound source queue gives each customer a unique TCN even with repeated random selections", () => {
  const s = newOutboundSession({ random: () => 0.8 });
  expect(new Set(s.shipments.map((s) => s.tcn)).size).toBe(4);
});
test("removing a CDF physical assignment also removes its shared manifest link", () => {
  const { withdrawCdfAssignments } = require("./courseAdapters");
  const s = newPracticeSession({ section: "departure", random: () => 0.4 });
  const store = migrateCdfCmos(s),
    key = s.scenarioId;
  const next = withdrawCdfAssignments(store, [key]);
  expect(Object.values(next.airManifests)[0].saved.shipmentIds).toEqual([
    "shipments-2",
    "shipments-3",
    "shipments-4",
    "shipments-5",
    "shipments-6",
  ]);
});

test("Outbound reset clears the selected shared shipment without erasing other customers", () => {
  const { resetOutboundShipment } = require("./courseAdapters");
  const { createOutboundExercise } = require("../Outbound/outboundLogic");
  const s = newOutboundSession({ random: () => 0.8 });
  let store = migrateOutboundCmos(s);
  store = saveRecord(
    editRecord(store, "shipments", "shipments-1", { description: "OLD" }),
    "shipments",
    "shipments-1",
  );
  const next = resetOutboundShipment(
    store,
    s.shipments[0].key,
    s.shipments[0],
    createOutboundExercise(),
  );
  expect(
    Object.values(next.shipments).filter(
      (r) => r.draft.assetKey === s.shipments[0].key,
    ),
  ).toHaveLength(1);
  expect(
    Object.values(next.shipments).find(
      (r) => r.draft.assetKey === s.shipments[0].key,
    ).saved,
  ).toBeNull();
  expect(next.shipments["shipments-2"]).toEqual(store.shipments["shipments-2"]);
});
test("CDF reset replaces stale CMOS data with the new physical shipment TCN", () => {
  const { resetCdfShipment } = require("./courseAdapters");
  const s = newPracticeSession({ section: "manifest", random: () => 0.4 });
  let store = migrateCdfCmos(s);
  store = saveRecord(
    editRecord(store, "shipments", store.selection.shipments, {
      description: "STALE",
    }),
    "shipments",
    store.selection.shipments,
  );
  const reset = { ...s.shipments[s.scenarioId], tcn: "TRN-RESET" };
  const next = resetCdfShipment(store, s.scenarioId, reset);
  const r = Object.values(next.shipments).find(
    (r) => r.draft.assetKey === s.scenarioId,
  );
  expect(r.saved).toBeNull();
  expect(r.draft.tcn).toBe("TRN-RESET");
  expect(r.draft.description).not.toBe("STALE");
});
test('CDF saving invalid work creates no penalty, while a failed explicit check reaches grading once',()=>{const s=newPracticeSession({section:'manifest',random:()=>.2});let store=migrateCdfCmos(s);store=saveRecord(store,'shipments',store.selection.shipments);expect(projectCdf(store,s).state.mistakes).toHaveLength(0);store=checkRecord(store,'shipments',store.selection.shipments);const projected=projectCdf(store,s);expect(projected.state.mistakes).toHaveLength(1);expect(projectCdf(store,{...s,cdfCmos:projected.state}).state.mistakes).toHaveLength(1);});
test('deleting the shared air manifest clears CDF assignment and release projections',()=>{const {deleteRecord}=require('./model');const s=newPracticeSession({section:'departure',random:()=>.4}),store=migrateCdfCmos(s);const next=deleteRecord(store,'airManifests',store.selection.airManifests);const p=projectCdf(next,s);expect(p.state.manifest).toBeNull();expect(p.state.assignments).toEqual([]);expect(p.exercises[s.scenarioId].manifestAccepted).toBe(false);});
