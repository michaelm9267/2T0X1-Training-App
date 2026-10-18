import { manifestFields, isHazardousIndicator } from "../CargoWindow/workflow";
import { hazardRequirements, cargoKind } from "./trainingData";
const clone = (value) => JSON.parse(JSON.stringify(value));
const error = (field, message) => ({ field, message });
const numericSame = (a, b) =>
  String(a ?? "").trim() !== "" &&
  Number.isFinite(Number(a)) &&
  Number(a) === Number(b);
const same = (a, b) =>
  String(a ?? "")
    .trim()
    .toUpperCase() ===
  String(b ?? "")
    .trim()
    .toUpperCase();
const blocked = (exercise, options) =>
  options.finished || options.assigned || exercise.manifestAccepted;
const result = (state, errors = [], message = "Record successfully saved") => ({
  ok: !errors.length,
  state: {
    ...state,
    manifestFeedback: errors.length
      ? errors.map((e) => e.message).join(" ")
      : message,
  },
  errors,
});
export function validateShipment(record, scenario) {
  const errors = manifestFields(scenario)
    .filter((field) => field.id !== "hazmat" || !scenario.ammo)
    .filter(
      (field) =>
        !(typeof field.expected === "number"
          ? numericSame(record[field.id], field.expected)
          : same(record[field.id], field.expected)),
    )
    .map((field) =>
      error(field.id, `${field.title} does not match the shipment paperwork.`),
    );
  const requirements = hazardRequirements(scenario);
  if (scenario.ammo && !same(record.hazmat, "A - Ammunition/explosives"))
    errors.push(error("hazmat", "Select the ammunition indicator."));
  if (
    requirements.t9Required &&
    (!record.t9Required || !String(record.t9Remarks || "").trim())
  )
    errors.push(error("t9Remarks", "Required T-9 remarks are missing."));
  if (requirements.records.length) {
    if (!isHazardousIndicator(record.hazmat))
      errors.push(
        error("hazmat", "Hazardous data is required for this shipment."),
      );
    for (const expected of requirements.records) {
      const actual = (record.hazardRecords || []).find(
        (r) =>
          (same(r.templateId, expected.templateId) || same(r.page2?.unId, expected.page2.unId)) &&
          same(r.piece, expected.piece),
      );
      if (!actual) {
        errors.push(
          error(
            "hazardRecords",
            `DG2 record ${expected.templateId} is required.`,
          ),
        );
        continue;
      }
      if (!same(actual.certifier, expected.certifier))
        errors.push(
          error(
            "certifier",
            "Certifying official does not match the paperwork.",
          ),
        );
      for (const [key, value] of Object.entries(expected.page1))
        if (actual.page1?.[key] !== value)
          errors.push(error(key, `${key} does not match the paperwork.`));
      for (const [key, value] of Object.entries(expected.page2))
        if (
          !(["metricQty", "imperialQty", "packagingUnits"].includes(key)
            ? numericSame(actual.page2?.[key], value)
            : same(actual.page2?.[key], value))
        )
          errors.push(
            error(key, `${key} does not match the hazardous paperwork.`),
          );
      if (!same(actual.hazardCode, expected.hazardCode))
        errors.push(
          error("hazardCode", "Hazard Codes does not match the paperwork."),
        );
      for (const lot of expected.lots)
        if (
          !(actual.lots || []).some((a) =>
            Object.entries(lot)
              .filter(([key]) => key !== "id")
              .every(([key, value]) =>
                [
                  "roundCount",
                  "new",
                  "metricNew",
                  "pieces",
                  "weight",
                  "cube",
                ].includes(key)
                  ? numericSame(a[key], value)
                  : same(a[key], value),
              ),
          )
        )
          errors.push(
            error(
              "lots",
              "Applicable ammunition lot data is missing or incorrect.",
            ),
          );
    }
  }
  return errors;
}
export const editableShipment = (record) =>
  record
    ? clone(
        Object.fromEntries(
          Object.entries(record).filter(
            ([key]) => !["revision", "palletId"].includes(key),
          ),
        ),
      )
    : {};
export function saveShipment(exercise, draft, scenario, options = {}) {
  if (blocked(exercise, options))
    return result(exercise, [
      error(
        "locked",
        "Unassign the cargo before changing it. Finished tests are locked.",
      ),
    ]);
  const errors = validateShipment(draft, scenario);
  if (errors.length)
    return result({ ...exercise, manifestDraft: clone(draft) }, errors);
  const record = {
    ...editableShipment(draft),
    palletId: cargoKind(scenario).palletId,
    revision: (exercise.shipmentRecord?.revision || 0) + 1,
  };
  return result(
    {
      ...exercise,
      shipmentRecord: record,
      manifestDraft: editableShipment(record),
      manifestAccepted: false,
    },
    [],
    "Transaction Successfully Processed. Shipment saved; not assigned to an air manifest.",
  );
}
export function saveHazardRecord(exercise, record, scenario, options = {}) {
  if (blocked(exercise, options))
    return result(exercise, [error("locked", "Record is locked.")]);
  const errors = [];
  if (
    !Number.isInteger(Number(record.piece)) ||
    Number(record.piece) < 1 ||
    Number(record.piece) > 9999
  )
    errors.push(error("piece", "Piece must be between 1 and 9999."));
  if (!String(record.templateId || "").trim())
    errors.push(error("templateId", "DG2 Template ID is required."));
  if (!String(record.certifier || "").trim())
    errors.push(error("certifier", "Enter Name and Title is required."));
  if (errors.length) return result(exercise, errors);
  const records = exercise.manifestDraft.hazardRecords || [];
  const existingIds = new Set(records.map((record) => record.id));
  let sequence = 1;
  while (existingIds.has(`haz-${sequence}`)) sequence += 1;
  const saved = clone({ ...record, id: record.id || `haz-${sequence}` });
  return result({
    ...exercise,
    manifestDraft: {
      ...exercise.manifestDraft,
      hazardRecords: [...records.filter((r) => r.id !== saved.id), saved],
    },
  });
}
export function deleteHazardRecord(exercise, id, options = {}) {
  if (blocked(exercise, options))
    return result(exercise, [error("locked", "Record is locked.")]);
  return result(
    {
      ...exercise,
      hazardDrafts: Object.fromEntries(
        Object.entries(exercise.hazardDrafts || {}).filter(
          ([key]) => key !== id,
        ),
      ),
      ...(exercise.shipmentRecord
        ? {
            shipmentRecord: {
              ...exercise.shipmentRecord,
              revision: (exercise.shipmentRecord.revision || 0) + 1,
              hazardRecords: (
                exercise.shipmentRecord.hazardRecords || []
              ).filter((record) => record.id !== id),
            },
          }
        : {}),
      manifestDraft: {
        ...exercise.manifestDraft,
        hazardRecords: (exercise.manifestDraft.hazardRecords || []).filter(
          (r) => r.id !== id,
        ),
      },
    },
    [],
    "DG2 record deleted.",
  );
}
export function setHazardIndicator(
  exercise,
  indicator,
  confirmed,
  options = {},
) {
  if (blocked(exercise, options))
    return result(exercise, [error("locked", "Record is locked.")]);
  const clearing =
    !isHazardousIndicator(indicator) &&
    ((exercise.manifestDraft.hazardRecords || []).length > 0 ||
      (exercise.shipmentRecord?.hazardRecords || []).length > 0 ||
      Object.keys(exercise.hazardDrafts || {}).length > 0);
  if (clearing && !confirmed)
    return {
      ok: false,
      state: exercise,
      errors: [
        error(
          "confirmation",
          "This will remove all hazardous data associated with the TCN.",
        ),
      ],
    };
  const cleared = {
    hazmat: indicator,
    hazardRecords: [],
    t9Required: false,
    t9Remarks: "",
  };
  return result({
    ...exercise,
    ...(!isHazardousIndicator(indicator)
      ? {
          hazardDrafts: {},
          ...(exercise.shipmentRecord
            ? {
                shipmentRecord: {
                  ...exercise.shipmentRecord,
                  ...cleared,
                  revision: (exercise.shipmentRecord.revision || 0) + 1,
                },
              }
            : {}),
        }
      : {}),
    manifestDraft: {
      ...exercise.manifestDraft,
      hazmat: indicator,
      t9Required: isHazardousIndicator(indicator),
      ...(!isHazardousIndicator(indicator)
        ? { hazardRecords: [], t9Required: false, t9Remarks: "" }
        : {}),
    },
  });
}
export const committedManifestRecord = (exercise) =>
  exercise.shipmentRecord || exercise.manifestRecord || null;
