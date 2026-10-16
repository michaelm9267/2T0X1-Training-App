import { useState } from "react";
import { Dialog, Field, useDiscard } from "./controls";
import {
  createAirManifest,
  saveAirManifest,
  assignCargo,
  unassignCargo,
  editCheck,
  markPrinted,
  manifestPieces,
} from "./manifestLogic";
import { manifestNumber } from "../Documentation/PrintManifest";
import PrintManifest from "../Documentation/PrintManifest";
import ManifestAssignments from "./ManifestAssignments";
import CargoPullSheet from "./CargoPullSheet";
export default function AirManifest({
  state,
  context,
  onStateChange,
  onRequestRelease,
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [tab, setTab] = useState("Assigned Pallets"),
    [assign, setAssign] = useState(null),
    [selected, setSelected] = useState(null),
    [printing, setPrinting] = useState(null),
    [number] = useState(
      () =>
        state.manifest?.number ||
        manifestNumber(new Date(context.startedAt || Date.now())),
    );
  const draft = state.headerDraft || {},
    locked = Boolean(context.finished || context.departure?.releasedAt),
    pieces = manifestPieces(state, context);
  const dirty = state.manifest
    ? [
        "mission",
        "dsoeId",
        "chalk",
        "pod",
        "destination",
        "complete",
        "remarks",
      ].some((k) => (draft[k] ?? "") !== (state.manifest[k] ?? ""))
    : Object.values(draft).some(Boolean);
  const discard = useDiscard(dirty, () => {
    onStateChange((s) => ({
      ...s,
      headerDraft: s.manifest ? { ...s.manifest } : {},
    }));
    setOpen(false);
  });
  const transact = (fn, ...args) => {
    const result = fn(state, ...args);
    onStateChange(() => result.state);
    return result;
  };
  const save = (close) => {
    const result = state.manifest
      ? transact(saveAirManifest, draft, context)
      : transact(createAirManifest, draft, context, number);
    if (result.ok && close) setOpen(false);
  };
  const change = (key, value) => {
    if (!locked)
      onStateChange((s) => ({
        ...s,
        headerDraft: { ...s.headerDraft, [key]: value },
      }));
  };
  const print = (kind) => {
    if (context.finished) {
      setPrinting(kind);
      return;
    }
    const result = transact(markPrinted, kind, context);
    if (result.ok) setPrinting(kind);
  };
  const rows = state.assignments.filter(
    (a) => a.kind === (tab === "Assigned Pallets" ? "pallet" : "loose"),
  );
  return (
    <div className="cdf-cmos-page">
      <div className="cdf-query">
        <Field label="Search Manifest" value={query} onChange={setQuery} />
        <button
          type="button"
          disabled={locked || !!state.manifest}
          onClick={() => {
            onStateChange((s) => ({ ...s, headerDraft: s.headerDraft || {} }));
            setOpen(true);
          }}
        >
          New Cargo Manifest
        </button>
      </div>
      <div className="cdf-table">
        <table>
          <thead>
            <tr>
              <th>Manifest</th>
              <th>Mission</th>
              <th>POD</th>
              <th>Weight</th>
              <th>DSOE ID</th>
              <th>Chalk</th>
            </tr>
          </thead>
          <tbody>
            {state.manifest &&
              `${state.manifest.number} ${state.manifest.mission}`
                .toUpperCase()
                .includes(query.toUpperCase()) && (
                <tr>
                  <td>
                    <button
                      type="button"
                      aria-label={`Open manifest ${state.manifest.number}`}
                      onClick={() => {
                        onStateChange((s) => ({
                          ...s,
                          headerDraft: Object.keys(s.headerDraft).length
                            ? s.headerDraft
                            : { ...s.manifest },
                        }));
                        setOpen(true);
                      }}
                    >
                      {state.manifest.number}
                    </button>
                  </td>
                  <td>{state.manifest.mission}</td>
                  <td>{state.manifest.pod}</td>
                  <td>
                    {pieces.reduce((n, p) => n + Number(p.record.weight), 0)}
                  </td>
                  <td>{state.manifest.dsoeId}</td>
                  <td>{state.manifest.chalk}</td>
                </tr>
              )}
          </tbody>
        </table>
        {!state.manifest && <p>No data to display.</p>}
      </div>
      {open && (
        <Dialog title="Air Manifest" onClose={discard.requestClose} wide>
          <div className="cdf-fields">
            <Field
              label="Manifest"
              value={state.manifest?.number || number}
              readOnly
            />
            {[
              ["mission", "Mission"],
              ["dsoeId", "DSOE ID"],
              ["chalk", "Chalk"],
              ["pod", "POD"],
              ["destination", "Destination"],
            ].map(([id, label]) => (
              <Field
                key={id}
                label={label}
                value={draft[id]}
                disabled={locked}
                onChange={(v) => change(id, v)}
              />
            ))}
            <Field label="Mode" value="F" readOnly />
            <Field
              label="Weight"
              value={pieces.reduce((n, p) => n + Number(p.record.weight), 0)}
              readOnly
            />
            <Field
              label="Cube"
              value={pieces
                .reduce(
                  (n, p) =>
                    n +
                    (p.record.length * p.record.width * p.record.height) / 1728,
                  0,
                )
                .toFixed(1)}
              readOnly
            />
            <Field label="Ref ID" value="UA" readOnly />
            <Field
              label="Complete"
              value={draft.complete}
              options={["Yes", "No"]}
              disabled={locked}
              onChange={(v) => change("complete", v)}
            />
            <Field
              label="Remarks"
              value={draft.remarks}
              disabled={locked}
              onChange={(v) => change("remarks", v)}
            />
          </div>
          <div
            className="cdf-tabs"
            role="tablist"
            aria-label="Air manifest tabs"
          >
            {["Assigned Pallets", "View Loose Cargo"].map((t) => (
              <button
                type="button"
                role="tab"
                key={t}
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setSelected(null);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="cdf-panel">
            <div className="cdf-assignment-toolbar">
              <button
                type="button"
                disabled={locked || !state.manifest}
                onClick={() =>
                  setAssign(tab === "Assigned Pallets" ? "pallet" : "loose")
                }
              >
                {tab === "Assigned Pallets"
                  ? "Unassigned Pallets"
                  : "Assign TCNs"}
              </button>
              <button
                type="button"
                disabled={context.finished || !selected}
                onClick={() => {
                  transact(unassignCargo, selected, context);
                  setSelected(null);
                }}
              >
                Unassign
              </button>
            </div>
            <div className="cdf-table">
              <table>
                <thead>
                  <tr>
                    <th>{tab === "Assigned Pallets" ? "ID" : "TCN"}</th>
                    <th>POD</th>
                    <th>Haz Code</th>
                    <th>Pieces</th>
                    <th>Weight</th>
                    <th>DSOE ID</th>
                    <th>Chalk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const content = pieces.filter((p) =>
                      a.pieceKeys.includes(p.scenarioId),
                    );
                    return (
                      <tr key={a.id} aria-selected={selected === a.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelected(a.id)}
                          >
                            {a.kind === "pallet"
                              ? a.id
                              : content[0]?.record.tcn}
                          </button>
                        </td>
                        <td>{content[0]?.record.apod}</td>
                        <td>{content[0]?.record.hazmat?.slice(0, 1)}</td>
                        <td>{content.length}</td>
                        <td>
                          {content.reduce(
                            (n, p) => n + Number(p.record.weight),
                            0,
                          )}
                        </td>
                        <td>{state.manifest.dsoeId}</td>
                        <td>{state.manifest.chalk}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <p>No data to display.</p>}
            </div>
            <p>{rows.length} row(s) found.</p>
          </div>
          <p role="status">{state.feedback}</p>
          <footer>
            <button
              type="button"
              disabled={!pieces.length}
              onClick={() => print("manifest")}
            >
              Print Manifest
            </button>
            <button
              type="button"
              disabled={!pieces.length}
              onClick={() => print("pull")}
            >
              Print Cargo Pull Sheet
            </button>
            <button
              type="button"
              disabled={context.finished || !state.manifest}
              onClick={() => transact(editCheck, context)}
            >
              Edit Check
            </button>
            <button
              type="button"
              disabled={locked || !state.manifest}
              onClick={onRequestRelease}
            >
              Release
            </button>
            <button type="button" disabled={locked} onClick={() => save(false)}>
              Save
            </button>
            <button type="button" disabled={locked} onClick={() => save(true)}>
              Save and Close
            </button>
            <button type="button" onClick={discard.requestClose}>
              Close
            </button>
          </footer>
          {assign && (
            <ManifestAssignments
              kind={assign}
              state={state}
              context={context}
              locked={locked}
              onClose={() => setAssign(null)}
              onAssign={(a) => transact(assignCargo, a, context)}
            />
          )}
          {discard.confirmation}
        </Dialog>
      )}
      {printing === "pull" && (
        <CargoPullSheet
          manifest={state.manifest}
          pieces={pieces}
          onClose={() => setPrinting(null)}
        />
      )}
      {printing === "manifest" && (
        <PrintManifest
          manifest={state.manifest}
          pieces={pieces}
          onClose={() => setPrinting(null)}
        />
      )}
    </div>
  );
}
