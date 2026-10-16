import { isStageComplete } from "../CargoWindow/exercise";
import { DODAAC_PORTS, ORIGIN } from "../CargoWindow/workflow";
import { cargoKind, missionForSession } from "./trainingData";
import { committedManifestRecord, validateShipment } from "./shipmentLogic";
const err = (field, message) => ({ field, message });
const fail = (state, errors) => ({
  ok: false,
  state: {
    ...state,
    feedback: errors.map((e) => e.message).join(" "),
    mistakes: [
      ...(state.mistakes || []),
      {
        stage: "CMOS",
        kind: "CMOS",
        detail: errors.map((e) => e.message).join(" "),
        reference: "Supplied CMOS training guides",
      },
    ],
  },
  errors,
});
const success = (state, feedback) => ({
  ok: true,
  state: { ...state, feedback },
  errors: [],
});
export const emptyCdfCmos = () => ({
  headerDraft: {},
  manifest: null,
  assignments: [],
  revision: 0,
  checkedRevision: null,
  pullSheetRevision: null,
  manifestPrintRevision: null,
  basis: null,
  releaseDetails: {},
  mistakes: [],
  feedback: "",
});
export function validateHeader(draft, context) {
  const expected = missionForSession(context),
    errors = [];
  if (!/^[A-Za-z0-9]{9,12}$/.test(draft.mission || ""))
    errors.push(
      err("mission", "Mission must contain 9–12 letters and numbers."),
    );
  for (const key of ["mission", "dsoeId", "chalk", "pod", "destination"])
    if (
      String(draft[key] || "")
        .trim()
        .toUpperCase() !== String(expected[key]).toUpperCase()
    )
      errors.push(err(key, `${key} does not match the mission paperwork.`));
  if (!["Yes", "No"].includes(draft.complete))
    errors.push(err("complete", "Select Complete Yes or No."));
  return errors;
}
export const manifestPieces = (state, context) =>
  state.assignments
    .flatMap((a) => a.pieceKeys)
    .map((key) => ({
      scenarioId: key,
      title: context.shipments[key].title,
      record: committedManifestRecord(context.exercises[key]),
      mslApplied: context.exercises[key].mslApplied,
      palletId: cargoKind(context.shipments[key]).palletId,
    }))
    .filter((p) => p.record);
export const manifestBasis = (state, context) =>
  JSON.stringify([
    state.manifest,
    state.assignments,
    Boolean(state.aborted),
    manifestPieces(state, context).map((p) => [p.scenarioId, p.record]),
  ]);
function revise(state, context) {
  const next = {
    ...state,
    revision: state.revision + 1,
    checkedRevision: null,
    pullSheetRevision: null,
    manifestPrintRevision: null,
  };
  return { ...next, basis: manifestBasis(next, context) };
}
export function reconcileCdfCmos(state, context) {
  if (!state.manifest) return state;
  return state.basis === manifestBasis(state, context)
    ? state
    : revise(state, context);
}
export function createAirManifest(state, draft, context, generatedNumber) {
  if (context.finished)
    return fail(state, [err("locked", "Finished tests are locked.")]);
  if (state.manifest)
    return fail(state, [
      err("manifest", "This deployment already has an air manifest."),
    ]);
  const errors = validateHeader(draft, context);
  if (errors.length)
    return fail({ ...state, headerDraft: { ...draft } }, errors);
  return success(
    revise(
      {
        ...state,
        headerDraft: { ...draft },
        manifest: {
          ...draft,
          number: generatedNumber,
          origin: ORIGIN,
          apoe: DODAAC_PORTS[ORIGIN],
          refId: "UA",
        },
      },
      context,
    ),
    "Transaction Successfully Processed. Record successfully saved.",
  );
}
export function saveAirManifest(state, draft, context) {
  if (!state.manifest)
    return fail(state, [err("manifest", "Create the manifest first.")]);
  if (context.finished || context.departure?.releasedAt)
    return fail(state, [err("locked", "Manifest is locked.")]);
  const errors = validateHeader(draft, context);
  if (errors.length)
    return fail({ ...state, headerDraft: { ...draft } }, errors);
  const manifest = { ...state.manifest, ...draft };
  return success(
    JSON.stringify(manifest) === JSON.stringify(state.manifest)
      ? state
      : revise({ ...state, manifest, headerDraft: { ...draft } }, context),
    "Record successfully saved.",
  );
}
export function assignCargo(state, assignment, context) {
  if (!state.manifest)
    return fail(state, [
      err("manifest", "Save an air manifest before assigning cargo."),
    ]);
  if (context.finished || context.departure?.releasedAt)
    return fail(state, [err("locked", "Manifest is locked.")]);
  if (
    !assignment.pieceKeys.length ||
    assignment.pieceKeys.some((key) => !context.pieceKeys.includes(key))
  )
    return fail(state, [err("cargo", "Select applicable cargo.")]);
  if (
    new Set(assignment.pieceKeys).size !== assignment.pieceKeys.length ||
    state.assignments.some(
      (a) =>
        a.id === assignment.id ||
        a.pieceKeys.some((k) => assignment.pieceKeys.includes(k)),
    )
  )
    return fail(state, [err("cargo", "Cargo is already assigned.")]);
  const errors = [];
  for (const key of assignment.pieceKeys) {
    const scenario = {
        ...context.shipments[key],
        destination: context.destination,
      },
      exercise = context.exercises[key],
      record = committedManifestRecord(exercise);
    const kind = cargoKind(scenario);
    if (
      kind.kind !== assignment.kind ||
      (assignment.kind === "pallet" && kind.palletId !== assignment.id)
    )
      errors.push(
        err("cargo", "Choose the applicable pallet or loose cargo table."),
      );
    if (!record)
      errors.push(err("cargo", "Save the Shipment Planning record first."));
    else errors.push(...validateShipment(record, scenario));
    if (
      !isStageComplete(scenario, "precheck", exercise) ||
      !isStageComplete(scenario, "incheck", exercise) ||
      (exercise.frustrations || []).some((f) => !f.released)
    )
      errors.push(
        err(
          "cargo",
          "Complete Precheck and Incheck and release all frustrations before assignment.",
        ),
      );
  }
  if (errors.length) return fail(state, errors);
  return success(
    revise(
      {
        ...state,
        assignments: [
          ...state.assignments,
          { ...assignment, pieceKeys: [...assignment.pieceKeys] },
        ],
      },
      context,
    ),
    "Transaction Successfully Processed. Cargo assigned to Air Manifest.",
  );
}
export function unassignCargo(state, id, context) {
  if (context.finished)
    return fail(state, [err("locked", "Finished tests are locked.")]);
  return success(
    revise(
      { ...state, assignments: state.assignments.filter((a) => a.id !== id) },
      context,
    ),
    "Cargo unassigned. Shipment entries are unlocked.",
  );
}
export function editCheck(state, context) {
  state = reconcileCdfCmos(state, context);
  if (context.finished)
    return fail(state, [err("locked", "Finished tests are locked.")]);
  const errors = state.manifest
    ? validateHeader(state.manifest, context)
    : [err("manifest", "Save an air manifest first.")];
  const keys = state.assignments.flatMap((a) => a.pieceKeys);
  if (context.pieceKeys.some((k) => !keys.includes(k)))
    errors.push(err("cargo", "Every piece on the DSOE must be assigned."));
  for (const key of keys) {
    const s = { ...context.shipments[key], destination: context.destination },
      e = context.exercises[key];
    errors.push(...validateShipment(committedManifestRecord(e) || {}, s));
    if ((e.frustrations || []).some((f) => !f.released))
      errors.push(err("cargo", "Assigned cargo is frustrated."));
  }
  return errors.length
    ? fail({ ...state, checkedRevision: null }, errors)
    : success(
        { ...state, checkedRevision: state.revision },
        "Manifest Passed Edit Checks.",
      );
}
export function markPrinted(state, kind, context) {
  state = reconcileCdfCmos(state, context);
  if (context.finished)
    return fail(state, [err("locked", "Finished tests are locked.")]);
  if (!state.manifest || !state.assignments.length)
    return fail(state, [err("manifest", "Assign cargo before printing.")]);
  return success(
    {
      ...state,
      [kind === "pull" ? "pullSheetRevision" : "manifestPrintRevision"]:
        state.revision,
    },
    "Print display opened. Training print task recorded.",
  );
}
