import CmosWorkspace from "../Cmos/CmosWorkspace";
import { migrateCdfCmos, projectCdf } from "../Cmos/courseAdapters";
import { headerFormatErrors } from "./manifestLogic";
import { releaseAirShipment } from "./releaseLogic";
import { ORIGIN, paperwork } from "../CargoWindow/workflow";
import { withDocumentErrors } from "../CargoWindow/discrepancies";
import { DocumentBody } from "../Documentation/PaperworkDocument";
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
    adviceNumbers: [["TRN1", "", "", "01Oct2025", "30Sep2027"]],
    // The deployment's DSOE, offered first in the Air Schedule DSOE lookup.
    dsoes: (() => {
      const mission = missionForSession(session);
      return [[mission.dsoeId, mission.chalk, mission.pod, "D", "A"]];
    })(),
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
    // CMOS checks only what is entered in CMOS; it never compares entries with the paperwork.
    validateMovement: (kind, r) =>
      kind === "airManifests"
        ? headerFormatErrors(r.saved || {}).map((e) => e.message)
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
