import { isStageComplete } from "../CargoWindow/exercise";
import { planBasis } from "../LoadPlan/loadPlanLogic";
import { releaseManifest, setDepartureTime } from "../Departure/departureLogic";
import { reconcileCdfCmos, manifestBasis } from "./manifestLogic";
export function releaseAirShipment(state, details, context) {
  state = reconcileCdfCmos(state, context);
  const errors = [];
  const error = (message) => errors.push({ field: "release", message });
  if (context.finished) error("Finished tests are locked.");
  if (!state.manifest) error("Save an air manifest first.");
  if (
    state.pullSheetRevision !== state.revision ||
    state.manifestPrintRevision !== state.revision
  )
    error(
      "Open both current print displays to complete the training print tasks.",
    );
  const keys = state.assignments.flatMap((a) => a.pieceKeys);
  if (context.pieceKeys.some((k) => !keys.includes(k)))
    error("Every piece on the DSOE must be assigned.");
  const ready = context.pieceKeys.every((key) =>
    isStageComplete(
      { ...context.shipments[key], destination: context.destination },
      "ji",
      context.exercises[key],
    ),
  );
  if (!ready)
    error(
      "Every piece on the DSOE must pass JI before the manifest is released.",
    );
  const basis = planBasis(
    context.pieceKeys.map((key) => ({
      ...context.shipments[key],
      key,
      manifested: isStageComplete(
        { ...context.shipments[key], destination: context.destination },
        "manifest",
        context.exercises[key],
      ),
    })),
  );
  if (!context.loadPlan.accepted || context.loadPlan.basis !== basis)
    error("Accept the current load plan before release.");
  if (!String(details.flightNumber || "").trim())
    error("Flight Nbr is required: enter it on the mission in Air Schedule.");
  if (errors.length) {
    const feedback = errors.map((e) => e.message).join(" ");
    return {
      ok: false,
      state: {
        ...state,
        feedback,
        mistakes: [
          ...state.mistakes,
          {
            kind: "release",
            detail: feedback,
            reference:
              "Supplied Manage Air Manifest guide / exercise requirements",
          },
        ],
      },
      departure: context.departure,
      errors,
    };
  }
  const departure = releaseManifest(
    setDepartureTime(context.departure, details.departureAt),
    {
      departureAt: details.departureAt,
      now: context.now,
      ready,
      basis: manifestBasis(state, context),
    },
  );
  return {
    ok: Boolean(departure.releasedAt),
    state: {
      ...state,
      releaseDetails: { ...details },
      feedback: departure.feedback,
    },
    departure,
    errors: departure.releasedAt
      ? []
      : [{ field: "departureAt", message: departure.feedback }],
  };
}
