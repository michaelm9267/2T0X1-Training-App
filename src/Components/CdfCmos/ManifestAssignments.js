import { useState } from "react";
import { Dialog, Field } from "./controls";
import { cargoKind } from "./trainingData";
import { committedManifestRecord } from "./shipmentLogic";
export default function ManifestAssignments({
  kind,
  state,
  context,
  onAssign,
  onClose,
  locked,
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [feedback, setFeedback] = useState("");
  const assigned = state.assignments.flatMap((a) => a.pieceKeys);
  const rows = context.pieceKeys
    .filter(
      (key) =>
        !assigned.includes(key) &&
        cargoKind(context.shipments[key]).kind === kind &&
        committedManifestRecord(context.exercises[key]),
    )
    .map((key) => ({
      key,
      scenario: context.shipments[key],
      record: committedManifestRecord(context.exercises[key]),
      id: cargoKind(context.shipments[key]).palletId || key,
    }))
    .filter((row) =>
      `${row.id} ${row.record.tcn} ${row.scenario.title}`
        .toUpperCase()
        .includes(query.toUpperCase()),
    );
  return (
    <Dialog
      title={kind === "pallet" ? "Assign Pallets" : "Assign Loose Cargo"}
      onClose={onClose}
      wide
    >
      <Field
        label={kind === "pallet" ? "Filter pallets" : "Filter TCNs"}
        value={query}
        onChange={(v) => {
          setQuery(v);
          setSelected(null);
        }}
      />
      <div className="cdf-table">
        <table>
          <thead>
            <tr>
              <th>{kind === "pallet" ? "ID" : "TCN"}</th>
              <th>POD</th>
              <th>Haz Code</th>
              <th>Pieces</th>
              <th>Weight</th>
              <th>Cargo Location</th>
              <th>DSOE ID</th>
              <th>Chalk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} aria-selected={selected === r.key}>
                <td>
                  <button
                    type="button"
                    aria-label={`Select cargo ${r.record.tcn}`}
                    onClick={() => setSelected(r.key)}
                  >
                    {kind === "pallet" ? r.id : r.record.tcn}
                  </button>
                </td>
                <td>{r.record.apod}</td>
                <td>{r.record.hazmat?.slice(0, 1)}</td>
                <td>{r.record.pieces}</td>
                <td>{r.record.weight}</td>
                <td>CDF</td>
                <td>{state.manifest.dsoeId}</td>
                <td>{state.manifest.chalk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>No data to display.</p>}
      </div>
      <p role="status">{feedback}</p>
      <p>{rows.length} row(s) found.</p>
      <footer>
        <button
          type="button"
          disabled={locked || !rows.some((r) => r.key === selected)}
          onClick={() => {
            const r = rows.find((r) => r.key === selected);
            const result = onAssign({ kind, id: r.id, pieceKeys: [r.key] });
            setFeedback(result.state.feedback);
            if (result.ok) setSelected(null);
          }}
        >
          Assign
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </footer>
    </Dialog>
  );
}
