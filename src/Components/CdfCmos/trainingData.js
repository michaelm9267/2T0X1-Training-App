import { unMatches, applyDg2Template, emergencyContactsFor } from '../Cmos/dg2Reference';
import {
  manifestFields,
  DODAAC_INFO,
  hazdecRequired,
} from "../CargoWindow/workflow";
import { UN_NUMBERS } from "../Documentation/unNumbers";
import { scenarios } from "../CargoWindow/scenarios";

// Fictional CMOS templates: template IDs are deliberately separate from UN/NA numbers.
export const trainingTemplates = UN_NUMBERS.map((entry) => ({
  templateId: `TRN-${entry.un}`,
  templateType: "DG",
  unId: entry.un,
  name: entry.names[0],
  division: entry.division,
  compatibility: entry.compatibility,
  packingGroup: entry.packingGroup,
  label: entry.label,
  className: entry.className,
}));
export const cargoKind = (scenario) =>
  scenario.id === "463l-pallet"
    ? { kind: "pallet", palletId: `TRN-PAL-${scenario.key || scenario.id}` }
    : { kind: "loose", palletId: null };
export function missionForSession(session) {
  const destination = session.destination || "FB5612";
  return {
    mission: "TRNC17001",
    dsoeId: "TRN01",
    chalk: "001C",
    pod: DODAAC_INFO[destination]?.port || "",
    destination: DODAAC_INFO[destination]?.city || destination,
    complete: "No",
    remarks: "",
    flightNumber: "TRN001",
  };
}
export function ammunitionFixture() {
  return {
    ...scenarios.find((s) => s.id === "463l-pallet"),
    id: "training-ammunition",
    key: "training-ammunition",
    title: "Ammunition crate",
    subtitle: "Training ammunition",
    length: 48,
    width: 40,
    height: 30,
    weight: 200,
    ammo: true,
    paperworkCopies: { hazdec: 3 },
    paperworkRequirements: { packing: true, hazdec: true },
    hazardRequired: true,
    tcn: "F00001$$E100900XX",
  };
}
export function hazardRequirements(scenario) {
  if (!(scenario.hazardRequired || hazdecRequired(scenario)))
    return { t9Required: false, records: [] };
  const un = scenario.ammo
    ? "UN0012"
    : scenario.id === "isu-90"
      ? "UN1950"
      : scenario.kind === "generator"
        ? "UN3528"
        : "UN3166";
  const template = trainingTemplates.find((t) => t.unId === un);
  const reference = unMatches(un).find(r => !r.forbidden && !r.referenceOnly && r.division === template.division && !r.subsidiary);
  const referenceDraft = reference ? applyDg2Template({}, reference) : null;
  const qty = scenario.ammo
    ? "15"
    : scenario.id === "isu-90"
      ? "12"
      : String(Math.round(scenario.weight * 0.45359237));
  const record = {
    id: "haz-1",
    piece: "1",
    templateId: reference?.id || template.templateId,
    templateType: "DG",
    certifier: "TRAINING CERTIFIER, TSgt (FICTIONAL)",
    page1: {},
    page2: {
      ...referenceDraft?.page2,
      properShippingName:
        scenario.kind === "generator"
          ? "MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED"
          : template.name,
      unId: un,
      division: template.division,
      packingGroup: template.packingGroup,
      compatibility: template.compatibility,
      hazardClassName: referenceDraft?.page2.hazardClassName || template.className,
      hazardLabel: referenceDraft?.page2.hazardLabel || template.label,
      packaging: scenario.ammo
        ? "1 CT X 15 KG N.E.W."
        : scenario.id === "isu-90"
          ? "1 fibreboard box"
          : "1 unpackaged",
      packingPara: reference?.packingPara || "",
      metricQty: qty,
      metricUom: "KG",
      imperialQty: String((Number(qty) / 0.45359237).toFixed(2)),
      imperialUom: "LB",
      quantityType: "NET",
      packagingUnits: "1",
      aircraft: "Cargo aircraft only",
      emergencyContact: emergencyContactsFor({ division: template.division })[0].number,
    },
    hazardCode: scenario.ammo ? "1.4S" : template.division,
    lots: scenario.ammo
      ? [
          {
            id: "lot-1",
            lotNumber: "TRN-001",
            dodic: "A059",
            roundCount: "100",
            new: "33.07",
            uom: "LB",
            metricNew: "15",
            metricUom: "KG",
            pieces: "1",
            weight: "200",
            cube: "33.3",
          },
        ]
      : [],
    certificationStatement:
      "Fictional shipment certification recorded for this training exercise.",
  };
  return { t9Required: false, records: [record] };
}
export function expectedShipment(scenario) {
  const fields = Object.fromEntries(
    manifestFields(scenario).map((f) => [f.id, String(f.expected)]),
  );
  if (scenario.ammo) fields.hazmat = "A - Ammunition/explosives";
  return {
    ...fields,
    t9Required: false,
    t9Remarks: "",
    hazardRecords: hazardRequirements(scenario).records,
    palletId: cargoKind(scenario).palletId,
  };
}
