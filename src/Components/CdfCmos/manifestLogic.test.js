import {
  emptyCdfCmos,
  createAirManifest,
  assignCargo,
  unassignCargo,
  editCheck,
  markPrinted,
  reconcileCdfCmos,
  manifestPieces,
} from "./manifestLogic";
import { missionForSession, expectedShipment, cargoKind } from "./trainingData";
import { newPracticeSession } from "../CargoWindow/practice";
const context = () => {
  const s = newPracticeSession({ section: "departure", random: () => 0.4 });
  for (const [key, piece] of Object.entries(s.shipments))
    s.exercises[key].shipmentRecord = expectedShipment({
      ...piece,
      destination: s.destination,
    });
  return { ...s, pieceKeys: Object.keys(s.shipments).slice(0, s.pieceCount) };
};
const create = (c) =>
  createAirManifest(emptyCdfCmos(), missionForSession(c), c, "EDF6286001")
    .state;
const assignment = (c, key) => ({
  id: cargoKind(c.shipments[key]).palletId || key,
  kind: cargoKind(c.shipments[key]).kind,
  pieceKeys: [key],
});
test("manifest must be saved before assignment", () => {
  const c = context();
  expect(assignCargo(emptyCdfCmos(), assignment(c, c.pieceKeys[0]), c).ok).toBe(
    false,
  );
});
test("pallet assignment includes contents once and duplicates reject", () => {
  const c = context(),
    key = c.pieceKeys.find((k) => c.shipments[k].id === "463l-pallet"),
    a = assignment(c, key);
  const result = assignCargo(create(c), a, c);
  expect(result.ok).toBe(true);
  expect(manifestPieces(result.state, c)).toHaveLength(1);
  expect(assignCargo(result.state, a, c).ok).toBe(false);
  expect(
    assignCargo(result.state, { id: key, kind: "loose", pieceKeys: [key] }, c)
      .ok,
  ).toBe(false);
  expect(unassignCargo(result.state, a.id, c).state.assignments).toEqual([]);
});
test("unready or frustrated cargo cannot assign", () => {
  const c = context(),
    key = c.pieceKeys[0];
  c.exercises[key] = { ...c.exercises[key], dsoeViewed: false };
  expect(assignCargo(create(c), assignment(c, key), c).ok).toBe(false);
  c.exercises[key].dsoeViewed = true;
  c.exercises[key].frustrations = [{ released: false }];
  expect(assignCargo(create(c), assignment(c, key), c).ok).toBe(false);
});
test("edit check requires all cargo and valid saved hazards", () => {
  const c = context();
  expect(editCheck(create(c), c).ok).toBe(false);
  let state = create(c);
  for (const key of c.pieceKeys)
    state = assignCargo(state, assignment(c, key), c).state;
  expect(editCheck(state, c).ok).toBe(true);
  const hazard = c.pieceKeys.find(
    (k) => c.exercises[k].shipmentRecord.hazardRecords.length,
  );
  c.exercises[hazard].shipmentRecord.hazardRecords = [];
  expect(editCheck(state, c).ok).toBe(false);
});
test("saved changes invalidate checks and prints; number stays stable", () => {
  const c = context();
  let state = create(c);
  for (const key of c.pieceKeys)
    state = assignCargo(state, assignment(c, key), c).state;
  state = editCheck(state, c).state;
  state = markPrinted(state, "pull", c).state;
  state = markPrinted(state, "manifest", c).state;
  c.exercises[c.pieceKeys[0]].manifestDraft = { weight: "999" };
  expect(reconcileCdfCmos(state, c).checkedRevision).toBe(state.revision);
  c.exercises[c.pieceKeys[0]].shipmentRecord.weight = "999";
  const next = reconcileCdfCmos(state, c);
  expect(next.checkedRevision).toBe(null);
  expect(next.pullSheetRevision).toBe(null);
  expect(next.manifestPrintRevision).toBe(null);
  expect(next.manifest.number).toBe("EDF6286001");
});

test("hazardous cargo cannot be assigned after confirmed hazardous data removal", () => {
  const c = context(),
    key = c.pieceKeys.find(
      (k) => c.exercises[k].shipmentRecord.hazardRecords.length,
    );
  c.exercises[key].manifestAccepted = false;
  const { setHazardIndicator } = require("./shipmentLogic");
  c.exercises[key] = setHazardIndicator(
    c.exercises[key],
    "N - Non-hazardous",
    true,
    {},
  ).state;
  expect(assignCargo(create(c), assignment(c, key), c).ok).toBe(false);
});
