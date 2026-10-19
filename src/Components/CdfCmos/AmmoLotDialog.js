import RegulationHelp from '../Regulations/RegulationHelp';
import { useState } from "react";
import { Dialog, Field, useDiscard } from "./controls";
export const LOT_FIELDS = [
  ["lotNumber", "Lot Number"],
  ["dodic", "DODIC"],
  ["roundCount", "Round Count"],
  ["new", "NEW/UOM"],
  ["uom", "NEW UOM", ["LB", "KG"]],
  ["metricNew", "NEW (Metric)/UOM"],
  ["metricUom", "Metric UOM", ["KG", "LB"]],
  ["pieces", "Pieces"],
  ["weight", "Weight"],
  ["cube", "Cube"],
];
export default function AmmoLotDialog({
  initial,
  onSave,
  onDelete,
  onClose,
  locked,
}) {
  const [draft, setDraft] = useState(initial || {}),
    [saved, setSaved] = useState(initial || {}),
    [feedback, setFeedback] = useState("");
  const discard = useDiscard(
    JSON.stringify(draft) !== JSON.stringify(saved),
    onClose,
  );
  const save = (close) => {
    if (locked) return;
    const required = [
      "lotNumber",
      "dodic",
      "roundCount",
      "new",
      "uom",
      "metricNew",
      "metricUom",
    ];
    if (
      required.some((k) => !String(draft[k] || "").trim()) ||
      ["roundCount", "new", "metricNew", "pieces", "weight", "cube"].some(
        (k) =>
          draft[k] !== undefined &&
          (!Number.isFinite(Number(draft[k])) || Number(draft[k]) < 0),
      )
    ) {
      setFeedback("Enter the applicable lot data and nonnegative quantities.");
      return;
    }
    const record = onSave(draft);
    setDraft(record);
    setSaved(record);
    setFeedback("Record successfully saved.");
    if (close) onClose();
  };
  return (
    <Dialog title="Ammo Information" onClose={discard.requestClose}>
    <RegulationHelp claims={['hazmat.declaration', 'hazmat.emergency']} assumptions={['Fictional lot identifiers, round counts and net explosive quantities are exercise values.']} />
      <div className="cdf-fields">
        {LOT_FIELDS.map(([id, label, options]) => (
          <Field
            key={id}
            label={label}
            value={draft[id]}
            options={options}
            disabled={locked}
            onChange={(v) => setDraft({ ...draft, [id]: v })}
          />
        ))}
      </div>
      <p role="status">{feedback}</p>
      <footer>
        <button type="button" disabled={locked} onClick={() => save(false)}>
          Save
        </button>
        <button type="button" disabled={locked} onClick={() => save(true)}>
          Save and Close
        </button>
        <button
          type="button"
          disabled={locked || !draft.id}
          onClick={() => {
            onDelete(draft.id);
            onClose();
          }}
        >
          Delete
        </button>
        <button type="button" onClick={discard.requestClose}>
          Close
        </button>
      </footer>
      {discard.confirmation}
    </Dialog>
  );
}
