import { useState } from "react";
import { trainingTemplates } from "./trainingData";
import { Dialog, Field } from "./controls";
export default function HazardTemplateLookup({ onSelect, onClose }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null);
  const rows = trainingTemplates.filter((t) =>
    `${t.templateId} ${t.unId} ${t.name}`
      .toUpperCase()
      .includes(query.toUpperCase()),
  );
  return (
    <Dialog title="DG2 Template ID Lookup" onClose={onClose} wide>
      <Field label="Filter templates" value={query} onChange={setQuery} />
      <div className="cdf-table">
        <table>
          <thead>
            <tr>
              <th>DG2 Template ID</th>
              <th>Sequence</th>
              <th>Template Type</th>
              <th>Proper Shipping Name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.templateId}
                aria-selected={selected === t}
                onClick={() => setSelected(t)}
              >
                <td>
                  <button type="button" onClick={() => setSelected(t)}>
                    {t.templateId}
                  </button>
                </td>
                <td>1</td>
                <td>{t.templateType}</td>
                <td>{t.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{rows.length} row(s) found.</p>
      <footer>
        <button
          type="button"
          disabled={!selected}
          onClick={() => onSelect(selected)}
        >
          Select
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </footer>
    </Dialog>
  );
}
