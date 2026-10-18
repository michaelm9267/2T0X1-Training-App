import { useState } from "react";
import { Dialog } from "../CdfCmos/controls";
import { DODAAC_INFO, AERIAL_PORTS } from "../CargoWindow/workflow";
import DateField from "../Outbound/DateField";
import { MODE_REFERENCE, MIL_EDI_REFERENCE } from "./modeReference";
import { CIIC_REFERENCE, HOLD_CODE_REFERENCE } from "./planningReferences";
import ReferenceLookup from "./ReferenceLookup";
import CommodityLookup from "./CommodityLookup";
import { COMMODITY_CODES, DEMIL_CODES } from "./commodityReference";
import { AIR_MANIFEST_REFERENCES, EQUIPMENT_TYPES, TYPE_PACK_CODES, GBLOCS, MEASURE_UNITS, RIN_CODES, ROUTE_ORDER_SERVICES, SPECIAL_SERVICES } from "./dtrReference";
export { Dialog };
export const lookupValues = (f) => {
  if (f.id === "ucCountry") return [
    ["US", "United States"], ["CA", "Canada"], ["DE", "Germany"], ["GB", "United Kingdom"],
    ["JP", "Japan"], ["KR", "South Korea"], ["AU", "Australia"], ["IT", "Italy"], ["ES", "Spain"], ["GU", "Guam"],
  ];
  if (f.id === "ucState") return Object.entries({
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  });
  if (/scac/i.test(f.id))
    return [
      ["FDE", "Federal Express"],
      ["FDEG", "FedEx Ground"],
      ["UPSN", "United Parcel Service"],
      ["UPSQ", "UPS Freight"],
      ["TRNC", "Training Motor Carrier"],
    ];
  if (f.id === "commoditySH") return COMMODITY_CODES;
  if (f.id === "demil") return DEMIL_CODES;
  if (f.id === "rin") return RIN_CODES;
  if (/equipment|equipType/i.test(f.id)) return EQUIPMENT_TYPES;
  if (f.id === "svcCode") return SPECIAL_SERVICES;
  if (/^(uom|volumeUom)$/.test(f.id)) return MEASURE_UNITS;
  if (f.id === "gbloc") return GBLOCS;
  if (f.id === "refId") return AIR_MANIFEST_REFERENCES;
  if (f.id === "svcAgencyCode") return ROUTE_ORDER_SERVICES;
  if (f.id === "ciic") return CIIC_REFERENCE;
  if (f.id === "holdCode") return HOLD_CODE_REFERENCE;
  if (/^(milMode|ediMode)$/i.test(f.id)) return MIL_EDI_REFERENCE;
  if (f.id === "expMode") return MODE_REFERENCE;
  if (/poe$|pod$/i.test(f.id)) return AERIAL_PORTS.map((v) => [v, v]);
  if (/typePack/i.test(f.id)) return TYPE_PACK_CODES;
  if (/origin$|destination$|dodaac/i.test(f.id))
    return Object.entries(DODAAC_INFO).map(([id, v]) => [
      id,
      `${v.city || ""} ${v.name || ""}`,
    ]);
  if (/service$|svcCode/i.test(f.id))
    return [
      ["2Day", "2Day"],
      ["Ground", "Ground"],
      ["IP", "International Priority"],
      ["Next Day Air", "Next Day Air"],
      ["LFT", "Liftgate"],
      ["AIR", "Air service"],
    ];
  if (/nmfc/i.test(f.id))
    return [
      ["999913", "Training general freight"],
      ["061700", "Electronic equipment"],
    ];
  return null;
};
export function Fields({
  fields,
  values,
  onEdit,
  locked = false,
  openLookup,
  prefix = "",
}) {
  return (
    <div className="shared-fields">
      {fields.map((f) => {
        const label = prefix ? `${prefix} ${f.label}` : f.label;
        const name = f.ariaLabel || label;
        const options = f.options;
        const lookup = f.type === "checkbox" || options || f.lookup === false ? null : (f.lookup || lookupValues(f));
        const value = values?.[f.id] ?? "";
        return (
          <div
            className={`shared-field ${f.type === "checkbox" ? "shared-flag" : ""}`}
            key={f.id}
            data-field={f.id}
          >
            <span>{f.required && <span className="shared-required-mark" aria-hidden="true">* </span>}{label}</span>
            <span className="shared-control">
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  aria-label={name}
                  checked={Boolean(value)}
                  disabled={
                    locked || f.readOnly ||
                    (f.id === "repship" &&
                      "$12345689ABCDEFGHKLO".includes(
                        String(values?.ciic || ""),
                      ) &&
                      String(values?.ciic || "").length === 1)
                  }
                  onChange={(e) => onEdit(f.id, e.target.checked)}
                />
              ) : f.type === "textarea" ? (
                <textarea aria-label={name} value={value} readOnly={Boolean(f.readOnly)} disabled={locked} onChange={e => onEdit(f.id, e.target.value)} />
              ) : options ? (
                <select
                  aria-label={name}
                  value={value}
                  disabled={locked || f.readOnly}
                  onChange={(e) => onEdit(f.id, e.target.value)}
                >
                  <option value="" />
                  {value && !options.includes(value) && (
                    <option value={value}>{value}</option>
                  )}
                  {options.map((o) => (
                    <option key={o} value={o}>{f.optionLabels?.[o] || o}</option>
                  ))}
                </select>
              ) : /date$/i.test(f.id) &&
                !f.id.toLowerCase().includes("frustrat") ? (
                <DateField
                  label={name}
                  value={value}
                  disabled={locked}
                  readOnly={f.readOnly}
                  onChange={(v) => onEdit(f.id, v)}
                />
              ) : (
                <input
                  aria-label={name}
                  value={value}
                  placeholder={f.placeholder}
                  title={f.help}
                  required={Boolean(f.required)}
                  onBlur={f.onBlur}
                  readOnly={Boolean(f.readOnly)}
                  disabled={locked || f.disabled}
                  onChange={(e) => onEdit(f.id, e.target.value)}
                />
              )}
              {lookup && openLookup && (
                <button
                  type="button"
                  aria-label={`Look up ${f.lookupLabel || name}`}
                  disabled={locked || f.readOnly}
                  onClick={(event) => {
                    event.preventDefault();
                    openLookup(f, lookup);
                  }}
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
                    <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
export function Lookup({ field, rows, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const matches = rows.filter((r) =>
    r.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const reference = {
    ciic: { title: "CIIC Lookup", columns: ["CIIC", "Description"] },
    holdCode: { title: "Hold Code Lookup", columns: ["Code", "Description"] },
    demil: { title: "DEMIL Lookup", columns: ["DEMIL", "Description"] },
    adviceNumber: { title: "Advice Number Lookup", columns: ["Advice Number", "Fund Identifier", "SDN", "Effective Date", "Expiration Date"] },
    milMode: { title: "MIL/EDI Mode Code Lookup", columns: ["MIL Mode", "EDI Mode", "Description"] },
    ediMode: { title: "MIL/EDI Mode Code Lookup", columns: ["MIL Mode", "EDI Mode", "Description"], valueIndex: 1 },
  }[field.id];
  if (field.id === "commoditySH") return <CommodityLookup onSelect={onSelect} onClose={onClose} />;
  if (reference) return <ReferenceLookup {...reference} rows={rows} onSelect={onSelect} onClose={onClose} />;
  return (
    <Dialog title={`${field.label} lookup`} onClose={onClose} overlayClassName="shared-lookup-overlay">
      <div className="shared-lookup">
      <label>
        Code / description
        <input
          aria-label="Lookup search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="shared-lookup-scroll"><table>
        <thead>
          <tr>
            <th>Select</th>
            <th>{/^(milMode|expMode)$/i.test(field.id) ? field.label : "Code"}</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {matches.map(([id, name]) => (
            <tr key={id} aria-selected={selected === id} onClick={() => setSelected(id)}>
              <td>
                <input
                  type="radio"
                  aria-label={`Select ${id}`}
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                />
              </td>
              <td>{id}</td>
              <td>{name}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {!matches.length && <p>No matching codes found.</p>}
      <footer>
        <button
          disabled={!selected}
          onClick={() => {
            onSelect(selected);
            onClose();
          }}
        >
          Select
        </button>
        <button onClick={onClose}>Close</button>
      </footer>
      </div>
    </Dialog>
  );
}
export function EntryDialog({
  title,
  fields,
  record,
  onEdit,
  onSave,
  onClose,
  onDelete,
  locked,
  children,
  isPiece = false,
  onAddPiece,
}) {
  const [lookup, setLookup] = useState(null);
  const renderFields = (items) => <Fields
    fields={items.map(f => isPiece && ["number", "cube"].includes(f.id) ? { ...f, readOnly: true } : f)}
    values={isPiece ? {
      ...record.draft,
      cube: record.draft.length && record.draft.width && record.draft.height
        ? (Number(record.draft.length) * Number(record.draft.width) * Number(record.draft.height) / 1728).toFixed(1)
        : "",
    } : record.draft}
    onEdit={onEdit} locked={locked}
    openLookup={(f, rows) => setLookup({ f, rows })}
  />;
  return (
    <Dialog title={title} onClose={onClose} wide={!isPiece} overlayClassName={isPiece ? "shared-piece-overlay" : ""}>
      {isPiece ? <div className="shared-piece-entry-columns">
        {[["number", "weight", "cube", "typePack"], ["length", "width", "height", "packer"], ["maxTemp", "minTemp", "volumeQty", "volumeUom"]].map((ids, i) =>
          <div key={i}>{renderFields(ids.map(id => fields.find(f => f.id === id)).filter(Boolean))}</div>
        )}
      </div> : renderFields(fields)}
      {children}
      <footer>
        {onAddPiece && <button disabled={locked} onClick={onAddPiece}>Add Piece</button>}
        <button disabled={locked} onClick={() => onSave(false)}>
          Save
        </button>
        <button disabled={locked} onClick={() => onSave(true)}>
          Save and Close
        </button>
        {onDelete && (
          <button disabled={locked} onClick={onDelete}>
            Delete
          </button>
        )}
        <button onClick={onClose}>Close</button>
      </footer>
      {lookup && (
        <Lookup
          field={lookup.f}
          rows={lookup.rows}
          onSelect={(v) => onEdit(lookup.f.id, v)}
          onClose={() => setLookup(null)}
        />
      )}
    </Dialog>
  );
}
