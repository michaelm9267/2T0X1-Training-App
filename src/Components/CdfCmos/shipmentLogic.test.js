import {
  saveShipment,
  saveHazardRecord,
  deleteHazardRecord,
  setHazardIndicator,
  validateShipment,
  editableShipment,
} from "./shipmentLogic";
import {
  expectedShipment,
  ammunitionFixture,
  hazardRequirements,
} from "./trainingData";
import { createExercise } from "../CargoWindow/exercise";
import { scenarios } from "../CargoWindow/scenarios";
const scenario = scenarios.find((s) => s.id === "isu-90");
test("saving does not assign cargo and draft edits do not change committed record", () => {
  const draft = expectedShipment(scenario),
    result = saveShipment(createExercise(), draft, scenario, {});
  expect(result.ok).toBe(true);
  expect(result.state.manifestAccepted).toBe(false);
  draft.weight = "999";
  expect(result.state.shipmentRecord.weight).not.toBe("999");
});
test("hazardous shipment requires applicable saved details and optional T9 can be unchecked", () => {
  expect(
    saveShipment(
      createExercise(),
      { ...expectedShipment(scenario), hazardRecords: [] },
      scenario,
      {},
    ).ok,
  ).toBe(false);
  expect(
    saveShipment(createExercise(), expectedShipment(scenario), scenario, {}).ok,
  ).toBe(true);
});
test("ammunition requires lot data", () => {
  const s = ammunitionFixture(),
    draft = expectedShipment(s);
  draft.hazardRecords[0].lots = [];
  expect(saveShipment(createExercise(), draft, s, {}).ok).toBe(false);
});
test("deleting one of two DG2 records preserves the other", () => {
  const record = hazardRequirements(scenario).records[0];
  let e = saveHazardRecord(createExercise(), record, scenario, {}).state;
  e = saveHazardRecord(e, { ...record, id: "haz-2" }, scenario, {}).state;
  expect(
    deleteHazardRecord(e, "haz-1", {}).state.manifestDraft.hazardRecords.map(
      (r) => r.id,
    ),
  ).toEqual(["haz-2"]);
});
test("indicator removal cancel preserves all hazard data; confirmation clears it", () => {
  const e = { ...createExercise(), manifestDraft: expectedShipment(scenario) };
  expect(setHazardIndicator(e, "N - Non-hazardous", false, {}).state).toEqual(
    e,
  );
  const result = setHazardIndicator(e, "N - Non-hazardous", true, {});
  expect(result.state.manifestDraft.hazardRecords).toEqual([]);
  expect(
    saveShipment(result.state, result.state.manifestDraft, scenario, {}).ok,
  ).toBe(false);
});
test("finished or assigned mutations are refused", () => {
  for (const options of [{ finished: true }, { assigned: true }])
    expect(
      saveShipment(
        createExercise(),
        expectedShipment(scenario),
        scenario,
        options,
      ).ok,
    ).toBe(false);
});
test("creating DG2 after deletion never overwrites a remaining record", () => {
  const record = hazardRequirements(scenario).records[0];
  let e = saveHazardRecord(createExercise(), record, scenario, {}).state;
  e = saveHazardRecord(e, { ...record, id: "haz-2" }, scenario, {}).state;
  e = deleteHazardRecord(e, "haz-1", {}).state;
  const r = saveHazardRecord(e, { ...record, id: undefined }, scenario, {});
  expect(r.state.manifestDraft.hazardRecords).toHaveLength(2);
  expect(
    new Set(r.state.manifestDraft.hazardRecords.map((h) => h.id)).size,
  ).toBe(2);
});
test("equivalent numeric entries are accepted", () => {
  const s = ammunitionFixture(),
    draft = expectedShipment(s);
  draft.weight = String(s.weight) + ".0";
  draft.hazardRecords[0].page2.metricQty = "15.0";
  draft.hazardRecords[0].lots[0].roundCount = "100.0";
  expect(saveShipment(createExercise(), draft, s, {}).ok).toBe(true);
});

test("confirmed hazard removal invalidates previously saved data and clears drafts", () => {
  const s = ammunitionFixture();
  let e = saveShipment(createExercise(), expectedShipment(s), s, {}).state;
  e.hazardDrafts = { new: { ...hazardRequirements(s).records[0] } };
  e = setHazardIndicator(e, "N - Non-hazardous", true, {}).state;
  expect(e.hazardDrafts).toEqual({});
  expect(e.shipmentRecord.hazardRecords).toEqual([]);
  expect(validateShipment(e.shipmentRecord, s).length).toBeGreaterThan(0);
});
test("DG2 Delete also withdraws saved hazardous preparation", () => {
  const s = ammunitionFixture();
  let e = saveShipment(createExercise(), expectedShipment(s), s, {}).state;
  e = deleteHazardRecord(e, "haz-1", {}).state;
  expect(e.shipmentRecord.hazardRecords).toEqual([]);
  expect(validateShipment(e.shipmentRecord, s).length).toBeGreaterThan(0);
});
test("saved and discarded shipment drafts contain only editable fields", () => {
  const s = ammunitionFixture();
  const draft = expectedShipment(s);
  delete draft.palletId;
  const e = saveShipment(createExercise(), draft, s, {}).state;
  expect(editableShipment(e.shipmentRecord)).toEqual(e.manifestDraft);
  expect(editableShipment(e.shipmentRecord).revision).toBeUndefined();
});

test('AFMAN UN template identifiers are accepted alongside legacy training identifiers', () => {
  for (const templateId of ['UN1950', 'TRN-UN1950']) {
    const record = expectedShipment(scenario);
    record.hazardRecords[0].templateId = templateId;
    expect(validateShipment(record, scenario)).toEqual([]);
  }
});

test('ammunition training paperwork uses AFMAN packaging and the Class 1 emergency contact', () => {
  const record = hazardRequirements(ammunitionFixture()).records[0];
  expect(record.page2.packingPara).toBe('A5.12.');
  expect(record.page2.emergencyContact).toBe('+1 (703) 695-4695 / +1 (703) 695-4696');
});
