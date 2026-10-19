import RegulationHelp from '../Regulations/RegulationHelp';
import { useState } from "react";
import { Dialog, Field } from "./controls";
import { releaseAirShipment } from "./releaseLogic";
export default function ReleaseAirShipment({
  state,
  context,
  onStateChange,
  onDepartureChange,
  onClose,
}) {
  const [draft, setDraft] = useState({
      ...state.releaseDetails,
      departureAt:
        state.releaseDetails.departureAt || context.departureAt || "",
    }),
    [feedback, setFeedback] = useState("");
  const locked = context.finished || Boolean(context.departure.releasedAt);
  const release = () => {
    const result = releaseAirShipment(state, draft, {
      ...context,
      now: new Date(),
    });
    onStateChange(() => result.state);
    onDepartureChange(() => result.departure);
    setFeedback(result.state.feedback);
    if (result.ok) onClose();
  };
  return (
    <Dialog title="Release Air Shipment" onClose={onClose} wide>
    <RegulationHelp claims={['documents.load', 'loadPlan.actualWeight', 'departure.finalPlan']} assumptions={['The simulation release sequence and local timing gate are training workflow rules.']} />
      <div className="cdf-fields">
        <Field label="Mission" value={state.manifest?.mission} readOnly />
        <Field
          label="DEP Date/Time"
          type="datetime-local"
          value={draft.departureAt}
          disabled={locked}
          onChange={(v) => setDraft({ ...draft, departureAt: v })}
        />
        <Field label="DSOE ID" value={state.manifest?.dsoeId} readOnly />
        <Field
          label="Flight Nbr"
          value={draft.flightNumber}
          disabled={locked}
          onChange={(v) => setDraft({ ...draft, flightNumber: v })}
        />
        <Field
          label="EDD"
          type="datetime-local"
          value={draft.estimatedDelivery}
          disabled={locked}
          onChange={(v) => setDraft({ ...draft, estimatedDelivery: v })}
        />
        <Field label="Chalk" value={state.manifest?.chalk} readOnly />
      </div>
      <div className="cdf-fields">
        <fieldset>
          <legend>Cargo</legend>
          <div className="cdf-table">
            <table>
              <thead>
                <tr>
                  <th>Manifest</th>
                  <th>Ref ID</th>
                  <th>APOD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{state.manifest?.number}</td>
                  <td>{state.manifest?.refId}</td>
                  <td>{state.manifest?.pod}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>
        <fieldset>
          <legend>Passenger</legend>
          <p>No data to display.</p>
        </fieldset>
      </div>
      <p>
        Training rule: release the manifest within 30 minutes following
        aircraft departure.
      </p>
      <p role="status">{feedback}</p>
      <footer>
        <button type="button" disabled={locked} onClick={release}>
          Release
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </footer>
    </Dialog>
  );
}
