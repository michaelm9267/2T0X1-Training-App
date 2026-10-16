import { useEffect, useRef, useState } from "react";
import { Dialog, Field, useDiscard } from "./controls";
import HazardTemplateLookup from "./HazardTemplateLookup";
import AmmoLotDialog from "./AmmoLotDialog";
import { saveHazardRecord } from "./shipmentLogic";
export const PAGE1_FLAGS = [
  "Reportable Quantity",
  "Empty With Residue",
  "Radioactive Material",
  "Limited Quantity",
  "Marine Pollutant",
  "Dry Ice",
  "Dangerous When Wet",
  "Dangerous When Hot",
  "Poison",
  "Hazardous Sub Constituents",
  "Waste",
  "Combustible Liquid",
  "Packaged Prior to Jan 1990",
  "NOS Item",
];
export const PAGE1_FIELDS = [
  ["imdg", "IMDG Information"],
  ["technicalName", "Technical Name for NOS Item"],
  ["dotE", "DOT-E Number"],
  ["explosiveApproval", "DOT Explosive Approval Number"],
  ["competentApproval", "Competent Authority Approval Number"],
  ["maxSpeed", "Max Operating Speed"],
  ["poisonZone", "Poison-Inhalation Hazard Zone"],
];
export const PAGE2_FIELDS = [
  ["properShippingName", "Proper Shipping Name"],
  ["division", "UN Class/Div Nbr"],
  ["compatibility", "Compatibility Grp"],
  ["imdg", "IMDGC"],
  ["percentage", "Percentage"],
  ["sym", "Sym"],
  ["unId", "UN/NA ID Nbr"],
  ["packingGroup", "Packing Group", ["I", "II", "III", "N/A"]],
  ["subsidiary", "Sub Risk"],
  ["specialProvisions", "Spec Provisions"],
  ["packingPara", "Packaging Para"],
  ["suppPackingPara", "Supp Packaging Para"],
  ["hazardClassName", "Hazard Class Name"],
  ["hazardLabel", "Hazard Label"],
  ["flashpoint", "Flashpoint/UOM"],
  ["inhabitedDistance", "Inhab Build Dist"],
  ["packaging", "Type Packing/Net Qty"],
  ["imperialQty", "B/L Hazmat Qty/UOM"],
  ["imperialUom", "B/L UOM", ["LB", "GAL"]],
  ["packagingUnits", "Nbr Packaging Units"],
  ["metricQty", "Metric Hazmat Qty/UOM"],
  ["metricUom", "Metric UOM", ["KG", "L"]],
  ["quantityType", "Hazmat Qty UOM Type", ["NET", "GROSS"]],
  ["identicalContainers", "Number of Identical Containers"],
  ["additionalHandling", "Additional Handling Information"],
  [
    "aircraft",
    "Pax/Cargo Aircraft/Cargo Aircraft Only",
    ["Passenger and cargo aircraft", "Cargo aircraft only"],
  ],
  ["dtr", "DTR"],
  ["shipper", "Shipper Name"],
  ["phone", "Phone Nbr"],
  ["address1", "Address 1"],
  ["address2", "Address 2"],
  ["city", "Base/City"],
  ["country", "Country"],
  ["state", "State"],
  ["zip", "Zip"],
  ["emergencyContact", "Emergency Contact"],
];
export default function HazardousTcnDialog({
  initial,
  savedRecord,
  onDraft,
  exercise,
  scenario,
  onSave,
  onClose,
  locked,
}) {
  const [draft, setDraft] = useState(
    initial || {
      piece: "",
      templateId: "",
      templateType: "DG",
      certifier: "",
      page1: {},
      page2: {},
      hazardCode: "",
      lots: [],
      certificationStatement: "",
    },
  );
  const [saved, setSaved] = useState(
      savedRecord || (initial?.id ? initial : undefined),
    ),
    [tab, setTab] = useState("Page 1"),
    [lookup, setLookup] = useState(false),
    [lot, setLot] = useState(null),
    [feedback, setFeedback] = useState("");
  const draftCallback = useRef(onDraft);
  draftCallback.current = onDraft;
  useEffect(() => {
    if (!locked) draftCallback.current?.(draft);
  }, [draft, locked]);
  const discard = useDiscard(
    JSON.stringify(draft) !== JSON.stringify(saved || {}),
    onClose,
  );
  const change = (id, value) => setDraft((d) => ({ ...d, [id]: value }));
  const save = (close) => {
    const result = saveHazardRecord(exercise, draft, scenario, {
      finished: locked,
    });
    setFeedback(result.state.manifestFeedback);
    if (result.ok) {
      const record =
        result.state.manifestDraft.hazardRecords.find(
          (r) => r.id === draft.id,
        ) || result.state.manifestDraft.hazardRecords.slice(-1)[0];
      onSave(record);
      setDraft(record);
      setSaved(record);
      if (close) onClose();
    }
  };
  const templateSelected = (t) => {
    setDraft((d) => ({
      ...d,
      templateId: t.templateId,
      templateType: t.templateType,
      page2: {
        ...d.page2,
        properShippingName: t.name,
        unId: t.unId,
        division: t.division,
        compatibility: t.compatibility,
        packingGroup: t.packingGroup,
        hazardClassName: t.className,
        hazardLabel: t.label,
      },
    }));
    setLookup(false);
  };
  return (
    <Dialog title="Maintain Hazardous TCNs" onClose={discard.requestClose} wide>
      <div className="cdf-fields">
        <Field
          label="Piece"
          value={draft.piece}
          disabled={locked}
          onChange={(v) => change("piece", v)}
        />
        <div>
          <Field
            label="DG2 Template ID"
            value={draft.templateId}
            disabled={locked}
            onChange={(v) => change("templateId", v)}
          />
          <button
            type="button"
            aria-label="Look up DG2 Template ID"
            disabled={locked}
            onClick={() => setLookup(true)}
          >
            ⌕
          </button>
        </div>
        <Field label="DG2 Template Type" value={draft.templateType} readOnly />
        <Field
          label="Enter Name and Title"
          value={draft.certifier}
          disabled={locked}
          onChange={(v) => change("certifier", v)}
        />
      </div>
      <div className="cdf-tabs" role="tablist" aria-label="Hazard details">
        {["Page 1", "Page 2", "Hazard Cargo", "Certification Statement"].map(
          (t) => (
            <button
              type="button"
              role="tab"
              key={t}
              aria-selected={tab === t}
              disabled={!saved}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <div className="cdf-panel" role="tabpanel">
        {!saved ? (
          <p>
            Enter the piece, template, and certifying official, then select
            Save.
          </p>
        ) : (
          <>
            {tab === "Page 1" && (
              <>
                <div className="cdf-flags">
                  {PAGE1_FLAGS.map((label) => (
                    <label key={label}>
                      {label}
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={Boolean(draft.page1[label])}
                        onChange={(e) =>
                          change("page1", {
                            ...draft.page1,
                            [label]: e.target.checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="cdf-fields">
                  {PAGE1_FIELDS.map(([id, label]) => (
                    <Field
                      key={id}
                      label={label}
                      value={draft.page1[id]}
                      disabled={locked}
                      onChange={(v) =>
                        change("page1", { ...draft.page1, [id]: v })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {tab === "Page 2" && (
              <div className="cdf-fields">
                {PAGE2_FIELDS.map(([id, label, options]) => (
                  <Field
                    key={id}
                    label={label}
                    options={options}
                    value={draft.page2[id]}
                    disabled={locked}
                    onChange={(v) =>
                      change("page2", { ...draft.page2, [id]: v })
                    }
                  />
                ))}
              </div>
            )}
            {tab === "Hazard Cargo" && (
              <>
                <Field
                  label="Hazard Codes"
                  value={draft.hazardCode}
                  disabled={locked}
                  onChange={(v) => change("hazardCode", v)}
                />
                <h4>Ammo Lot</h4>
                <p>
                  Total Round Count{" "}
                  {draft.lots.reduce(
                    (sum, l) => sum + Number(l.roundCount || 0),
                    0,
                  )}
                </p>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setLot({})}
                >
                  New
                </button>
                <div className="cdf-table">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Lot Number",
                          "DODIC",
                          "Round Count",
                          "NEW",
                          "UOM",
                          "Pieces",
                          "Weight",
                          "Cube",
                        ].map((t) => (
                          <th key={t}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lots.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <button type="button" onClick={() => setLot(l)}>
                              {l.lotNumber}
                            </button>
                          </td>
                          {[
                            "dodic",
                            "roundCount",
                            "new",
                            "uom",
                            "pieces",
                            "weight",
                            "cube",
                          ].map((k) => (
                            <td key={k}>{l[k]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!draft.lots.length && <p>No data to display.</p>}
                </div>
              </>
            )}
            {tab === "Certification Statement" && (
              <Field
                label="Certification Statement"
                value={draft.certificationStatement}
                disabled={locked}
                onChange={(v) => change("certificationStatement", v)}
              />
            )}
          </>
        )}
      </div>
      <p role="status">{feedback}</p>
      <footer>
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
      {lookup && (
        <HazardTemplateLookup
          onSelect={templateSelected}
          onClose={() => setLookup(false)}
        />
      )}
      {lot && (
        <AmmoLotDialog
          initial={lot}
          locked={locked}
          onClose={() => setLot(null)}
          onSave={(l) => {
            const existingIds = new Set(draft.lots.map((record) => record.id));
            let sequence = 1;
            while (existingIds.has(`lot-${sequence}`)) sequence += 1;
            const id = l.id || `lot-${sequence}`;
            change("lots", [
              ...draft.lots.filter((a) => a.id !== id),
              { ...l, id },
            ]);
            return { ...l, id };
          }}
          onDelete={(id) =>
            change(
              "lots",
              draft.lots.filter((l) => l.id !== id),
            )
          }
        />
      )}
      {discard.confirmation}
    </Dialog>
  );
}
