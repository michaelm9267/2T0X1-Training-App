import { useState } from "react";
import {
  manifestFields,
  HAZ_INDICATORS,
  isHazardousIndicator,
  paperwork,
} from "../CargoWindow/workflow";
import {
  saveShipment,
  deleteHazardRecord,
  setHazardIndicator,
  editableShipment,
} from "./shipmentLogic";
import { Dialog, Field, Confirm } from "./controls";
import HazardousTcnDialog from "./HazardousTcnDialog";
import { DocumentBody } from "../Documentation/PaperworkDocument";
export default function ShipmentPlanning({ session, onExerciseChange }) {
  const [query, setQuery] = useState(""),
    [searched, setSearched] = useState(null),
    [key, setKey] = useState(null),
    [tab, setTab] = useState("Pieces"),
    [hazard, setHazard] = useState(null),
    [confirm, setConfirm] = useState(null),
    [paper, setPaper] = useState(null);
  const keys = Object.keys(session.shipments).slice(0, session.pieceCount),
    scenario = key
      ? { ...session.shipments[key], destination: session.destination }
      : null,
    exercise = key ? session.exercises[key] : null;
  const draft = exercise?.manifestDraft || {},
    locked = Boolean(session.test?.finishedAt || exercise?.manifestAccepted),
    hazardous = isHazardousIndicator(draft.hazmat);
  const fields = scenario ? manifestFields(scenario) : [];
  const change = (id, value) => {
    if (locked) return;
    onExerciseChange(key, (e) => ({
      ...e,
      manifestDraft: { ...e.manifestDraft, [id]: value },
      manifestFeedback: "",
    }));
  };
  const dirty =
    exercise &&
    JSON.stringify(editableShipment(exercise.manifestDraft)) !==
      JSON.stringify(editableShipment(exercise.shipmentRecord));
  const leave = (action) =>
    dirty
      ? setConfirm({
          message: "Discard unsaved shipment changes?",
          action: () => {
            onExerciseChange(key, (e) => ({
              ...e,
              manifestDraft: editableShipment(e.shipmentRecord),
            }));
            action();
          },
        })
      : action();
  const save = (close) => {
    const result = saveShipment(exercise, exercise.manifestDraft, scenario, {
      finished: Boolean(session.test?.finishedAt),
      assigned: exercise.manifestAccepted,
    });
    onExerciseChange(key, (e) => ({
      ...result.state,
      ...(!result.ok
        ? {
            mistakes: [
              ...(e.mistakes || []),
              {
                kind: "manifest",
                detail: result.errors.map((e) => e.message).join(" "),
                reference: "Supplied Manage Hazardous TCN guide",
              },
            ],
          }
        : {}),
    }));
    if (close && result.ok) setKey(null);
  };
  const indicator = (v) => {
    const result = setHazardIndicator(exercise, v, false, { assigned: locked });
    if (result.errors.some((e) => e.field === "confirmation"))
      setConfirm({
        message: result.errors[0].message,
        action: () =>
          onExerciseChange(
            key,
            (e) => setHazardIndicator(e, v, true, {}).state,
          ),
      });
    else onExerciseChange(key, () => result.state);
  };
  const cube =
    draft.length && draft.width && draft.height
      ? (
          (Number(draft.length) * Number(draft.width) * Number(draft.height)) /
          1728
        ).toFixed(1)
      : "";
  const renderField = (id) => {
    const field = fields.find((f) => f.id === id);
    return (
      <Field
        key={id}
        label={field.title}
        value={draft[id]}
        options={field.options}
        disabled={locked}
        onChange={(v) => change(id, v)}
      />
    );
  };
  return (
    <div className="cdf-cmos-page">
      <div className="cdf-query">
        <Field label="Search TCN" value={query} onChange={setQuery} />
        <button type="button" onClick={() => setSearched(query)}>
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setSearched(null);
          }}
        >
          Clear
        </button>
      </div>
      <div className="cdf-table">
        <table>
          <thead>
            <tr>
              <th>TCN</th>
              <th>Nomenclature</th>
              <th>Doc Type</th>
              <th>Status</th>
              <th>Pieces</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {searched !== null &&
              keys
                .filter((k) =>
                  manifestFields({
                    ...session.shipments[k],
                    destination: session.destination,
                  })[0]
                    .expected.toUpperCase()
                    .includes(searched.toUpperCase()),
                )
                .map((k) => {
                  const s = {
                      ...session.shipments[k],
                      destination: session.destination,
                    },
                    record = session.exercises[k].shipmentRecord;
                  return (
                    <tr key={k}>
                      <td>
                        <button
                          type="button"
                          aria-label={`Select TCN ${manifestFields(s)[0].expected}`}
                          onClick={() =>
                            leave(() => {
                              setKey(k);
                              setTab("Pieces");
                            })
                          }
                        >
                          {manifestFields(s)[0].expected}
                        </button>
                      </td>
                      <td>{s.subtitle}</td>
                      <td>I</td>
                      <td>{record ? "PI" : "Not saved"}</td>
                      <td>1</td>
                      <td>{record?.weight || ""}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {(searched === null ||
          !keys.some((k) =>
            manifestFields(session.shipments[k])[0]
              .expected.toUpperCase()
              .includes(searched.toUpperCase()),
          )) && <p>No data to display.</p>}
      </div>
      {key && (
        <Dialog
          title="Shipment Planning"
          onClose={() => leave(() => setKey(null))}
          wide
        >
          <p className="cdf-transaction">
            {locked
              ? "Shipment is assigned or the test is finished. Unassign cargo to edit it."
              : ""}
          </p>
          <div className="cdf-paper-buttons">
            <span>Paperwork:</span>
            {paperwork(scenario).map((p) => (
              <button type="button" key={p.id} onClick={() => setPaper(p)}>
                {p.title}
              </button>
            ))}
          </div>
          <div className="cdf-fields">
            <Field label="Doc Type" value="I - Increment" readOnly />
            {renderField("tcn")}
            <Field
              label="Status"
              value="PI · PLANNING AND PACKAGING"
              readOnly
            />
            {[
              "pieces",
              "description",
              "origin",
              "apoe",
              "destination",
              "apod",
            ].map(renderField)}
            <Field label="Prime DIC" value="TX1" readOnly />
            <Field label="CIIC" value="U" readOnly />
            <Field label="TP" value="3" readOnly />
          </div>
          <div
            className="cdf-tabs"
            role="tablist"
            aria-label="Shipment planning tabs"
          >
            {[
              "Pieces",
              "Ultimate Consignee",
              "Indicators",
              ...(hazardous ? ["DG2", "T-9 Misc"] : []),
              "Shipment Status",
              "Cargo Frustration",
            ].map((t) => (
              <button
                type="button"
                role="tab"
                key={t}
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="cdf-panel" role="tabpanel">
            {tab === "Pieces" && (
              <>
                <div className="cdf-totals">
                  Total PCS {draft.pieces || 0} · Total WT {draft.weight || 0} ·
                  Total CU {cube || 0}
                </div>
                <div className="cdf-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Weight</th>
                        <th>Cube</th>
                        <th>Length</th>
                        <th>Width</th>
                        <th>Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>{renderField("weight")}</td>
                        <td>{cube}</td>
                        {["length", "width", "height"].map((id) => (
                          <td key={id}>{renderField(id)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === "Indicators" && (
              <>
                <Field
                  label="Hazardous/Ammunition Ind"
                  value={draft.hazmat}
                  options={HAZ_INDICATORS}
                  disabled={locked}
                  onChange={indicator}
                />
                <label>
                  Misc T-9 Required
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={Boolean(draft.t9Required)}
                    onChange={(e) => change("t9Required", e.target.checked)}
                  />
                </label>
                <label>
                  Danger Goods/1387-2 Required
                  <input type="checkbox" disabled checked={hazardous} />
                </label>
              </>
            )}
            {tab === "DG2" && (
              <>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setHazard({})}
                >
                  New
                </button>
                <div className="cdf-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Piece</th>
                        <th>DG2 Template ID</th>
                        <th>Hazard Label</th>
                        <th>Proper Shipping Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.hazardRecords || []).map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button type="button" onClick={() => setHazard(r)}>
                              {r.piece}
                            </button>
                          </td>
                          <td>{r.templateId}</td>
                          <td>{r.page2?.hazardLabel}</td>
                          <td>{r.page2?.properShippingName}</td>
                          <td>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                onExerciseChange(
                                  key,
                                  (e) => deleteHazardRecord(e, r.id, {}).state,
                                )
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!(draft.hazardRecords || []).length && (
                    <p>No data to display.</p>
                  )}
                </div>
              </>
            )}
            {tab === "T-9 Misc" && (
              <Field
                label="T-9 Remarks"
                value={draft.t9Remarks}
                disabled={locked}
                onChange={(v) => change("t9Remarks", v)}
              />
            )}
            {tab === "Ultimate Consignee" && (
              <p>
                {draft.destination || "No consignee selected."} / {draft.apod}
              </p>
            )}
            {tab === "Shipment Status" && (
              <p>
                {exercise.shipmentRecord
                  ? "Record successfully saved."
                  : "Shipment has not been saved."}{" "}
                {exercise.manifestAccepted
                  ? "Assigned to Air Manifest."
                  : "Unassigned."}
              </p>
            )}
            {tab === "Cargo Frustration" && (
              <div>
                {exercise.frustrations.length ? (
                  exercise.frustrations.map((f, i) => (
                    <p key={i}>
                      {f.reason} · {f.note} ·{" "}
                      {f.released ? "RELEASED" : "FRUSTRATED"}
                    </p>
                  ))
                ) : (
                  <p>No data to display.</p>
                )}
              </div>
            )}
          </div>
          <p role="status">{exercise.manifestFeedback}</p>
          <footer>
            <button type="button" disabled={locked} onClick={() => save(false)}>
              Save
            </button>
            <button type="button" disabled={locked} onClick={() => save(true)}>
              Save and Close
            </button>
            <button type="button" onClick={() => leave(() => setKey(null))}>
              Close
            </button>
          </footer>
          {hazard && (
            <HazardousTcnDialog
              initial={
                exercise.hazardDrafts?.[hazard.id || "new"] ||
                (hazard.id ? hazard : undefined)
              }
              savedRecord={
                hazard.id
                  ? draft.hazardRecords?.find((r) => r.id === hazard.id)
                  : undefined
              }
              onDraft={(record) =>
                onExerciseChange(key, (e) => ({
                  ...e,
                  hazardDrafts: {
                    ...e.hazardDrafts,
                    [record.id || "new"]: record,
                  },
                }))
              }
              exercise={exercise}
              scenario={scenario}
              locked={locked}
              onClose={() => {
                onExerciseChange(key, (e) => ({
                  ...e,
                  hazardDrafts: Object.fromEntries(
                    Object.entries(e.hazardDrafts || {}).filter(
                      ([id]) => id !== (hazard.id || "new"),
                    ),
                  ),
                }));
                setHazard(null);
              }}
              onSave={(r) => {
                setHazard(r);
                onExerciseChange(key, (e) => ({
                  ...e,
                  manifestDraft: {
                    ...e.manifestDraft,
                    hazardRecords: [
                      ...(e.manifestDraft.hazardRecords || []).filter(
                        (a) => a.id !== r.id,
                      ),
                      r,
                    ],
                  },
                  hazardDrafts: Object.fromEntries(
                    Object.entries(e.hazardDrafts || {}).filter(
                      ([id]) => id !== "new",
                    ),
                  ),
                }));
              }}
            />
          )}
          {paper && (
            <Dialog title={paper.title} onClose={() => setPaper(null)} wide>
              <div className="paper-sheet">
                <DocumentBody scenario={scenario} documentId={paper.id} />
              </div>
            </Dialog>
          )}
        </Dialog>
      )}
      {confirm && (
        <Confirm
          message={confirm.message}
          onConfirm={() => {
            confirm.action();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
