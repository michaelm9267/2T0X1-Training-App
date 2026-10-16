import CmosWorkspace from "../Cmos/CmosWorkspace";
import {
  migrateCdfCmos,
  projectCdf,
  legacyCdfRecord,
  assetKeysFor,
} from "../Cmos/courseAdapters";
import { validateShipment } from "./shipmentLogic";
import { validateHeader } from "./manifestLogic";
import { releaseAirShipment } from "./releaseLogic";
import { ORIGIN, paperwork } from "../CargoWindow/workflow";
import { withDocumentErrors } from "../CargoWindow/discrepancies";
import { DocumentBody } from "../Documentation/PaperworkDocument";
import { isStageComplete } from "../CargoWindow/exercise";
import { missionForSession } from "./trainingData";
import "./cdf-cmos.css";
export default function CdfCmosWorkspace({
  session,
  state,
  onStateChange,
  onExerciseChange,
  onDepartureChange,
  initialPage = "planning",
  onClose,
}) {
  const contextSession = {
    ...session,
    now: session.now || new Date(),
    cdfCmos: state,
    pieceKeys:
      session.pieceKeys ||
      Object.keys(session.shipments).slice(0, session.pieceCount),
  };
  const store = migrateCdfCmos(contextSession);
  const context = {
    storageError: session.storageError,
    course: "cdf",
    activeAssetKey: session.scenarioId,
    origin: ORIGIN,
    finished: Boolean(session.finished || session.test?.finishedAt),
    documents: [
      {
        id: "mission",
        title: "Mission paperwork",
        render: () => (
          <>
            <h2>Fictional mission source</h2>
            <dl>
              {Object.entries(missionForSession(session)).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p>
              MIL Mode F · TAC TRN1 · CIIC U · NMFC/UFC 999913 · Advice Nbr TRN1
            </p>
          </>
        ),
      },
      ...contextSession.pieceKeys.flatMap((key) =>
        paperwork(session.shipments[key]).map((doc) => ({
          id: `${key}-${doc.id}`,
          title: `${session.shipments[key].title} · ${doc.title}`,
          render: () => (
            <DocumentBody
              scenario={withDocumentErrors({
                ...session.shipments[key],
                destination: session.destination,
              }, session.exercises[key])}
              documentId={doc.id}
            />
          ),
        })),
      ),
    ],
    validateShipment: (d, id, store) => {
      const key = d.assetKey || assetKeysFor(store, store.shipments[id])[0];
      if (!session.shipments[key]) return [];
      const record = legacyCdfRecord(store, store.shipments[id], true);
      const scenario = {
        ...session.shipments[key],
        destination: session.destination,
      };
      return [
        ...validateShipment(record, scenario).map((e) => e.message),
        ...["precheck", "incheck"]
          .filter(
            (stage) =>
              !isStageComplete(scenario, stage, session.exercises[key]),
          )
          .map(
            (stage) =>
              `Complete physical ${stage} before passing shipment checks.`,
          ),
      ];
    },
    validateMovement: (kind, r) =>
      kind === "airManifests"
        ? validateHeader(
            { ...r.saved, number: r.saved?.manifestNumber },
            session,
          ).map((e) => e.message)
        : [],
    releaseErrors: (kind, r, next) => {
      if (kind !== "airManifests") return [];
      const p = projectCdf(next, contextSession);
      return releaseAirShipment(p.state, r.draft, {
        ...contextSession,
        exercises: p.exercises,
      }).errors.map((e) => e.message);
    },
  };
  const change = (next) => {
    const p = projectCdf(next, contextSession);
    for (const key of contextSession.pieceKeys)
      if (p.exercises[key]) onExerciseChange(key, () => p.exercises[key]);
    onStateChange(() => p.state);
    const active = next.airManifests[next.selection.airManifests];
    if (session.departure?.releasedAt && (!active || active.status !== "Released")) onDepartureChange(d => ({ ...d, releasedAt: null, basis: null }));
    if (active?.status === "Released") {
      const release = releaseAirShipment(
        p.state,
        { ...active.draft, ...active.releaseDetails },
        { ...contextSession, exercises: p.exercises },
      );
      if (release.ok) onDepartureChange(() => release.departure);
    }
  };
  return (
    <CmosWorkspace
      store={store}
      onChange={change}
      context={context}
      initialPage={initialPage}
      onClose={onClose}
    />
  );
}
