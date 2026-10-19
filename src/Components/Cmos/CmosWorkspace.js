import RegulationHelp from '../Regulations/RegulationHelp';
import { wholeCube } from "./model";
import { cmosPageClaims } from '../Regulations/claims';
import AirManifestScreen from "./AirManifestScreen";
import AirScheduleScreen from "./AirScheduleScreen";
import ReleaseAirShipment from "./ReleaseAirShipment";
import CblRelease from "./CblRelease";
import PalletsScreen from "./PalletsScreen";
import { carrierAccount, servicesFor } from "./trackingNumbers";
import SmallPackageScreen from "./SmallPackageScreen";
import SpeDocuments from "./SpeDocuments";
import TruckManifestScreen from "./TruckManifestScreen";
import TruckRelease from "./TruckRelease";
import { nextTruckManifestNumber, truckAddress, TRUCK_SAMPLES } from "./truckManifestLogic";
import { movementDocumentFor } from "./model";
import { money } from "./money";
import { closedLabel } from "./SpePrints";
import TgetAdapter from "./TgetAdapter";
import CmosDateField from "./CmosDateField";
import { formatScheduleDate } from "./airScheduleLogic";
import RoutingScreen from "./RoutingScreen";
import { routingDefaults, ROUTING_SAMPLES } from "./routingLogic";
import { cmosUser } from "../../currentUser";
import DeploymentParametersScreen from "./DeploymentParametersScreen";
import { planningDefaults } from "./deploymentLogic";
import CommercialBolScreen from "./CommercialBolScreen";
import { CBL_SAMPLES, cblDefaults, fillFromShipments, nextCblNumber, addressPatch } from "./cblLogic";
import { rinTextFor, gblocForDodaac } from "./dtrReference";
import { AIR_MANIFEST_SAMPLES, availableForAirManifest, nextAirManifestNumber, airManifestCounterKey } from "./airManifestLogic";
import { PLANNING_STATUS_GROUPS, planningStatus, planningStatusLabel, isPlanningViewOnly, incheckedStatus, incheckPlanningRecord } from "./planningStatuses";
import { documentTcn, documentType, nonMilstripTcn } from "./tcnCreation";
import { ediForMilMode, requiresNmfc } from "./modeReference";
import HazardousTcn from "./HazardousTcn";
import { isHazardousIndicator, ORIGIN } from "../CargoWindow/workflow";
import DetailTabs from "./DetailTabs";
import { useState, useEffect, useRef, useCallback } from "react";
import CmosWindow from "../Outbound/CmosWindow";
import {
  screens,
  planningColumns,
  planningHeader,
  planningMain,
  pieceFields,
  collections,
  field,
} from "./referenceInventory";
import {
  createRecord,
  editRecord,
  saveRecord,
  checkRecord,
  assignShipments,
  deriveShipment,
  deleteRecord,
  transition,
  data,
  totals,
  piecesFor,
  currentCheck,
  MISSING_PREFIX,
  DG2_TEMPLATE_MISSING,
  T9_MISC_MISSING,
  prevalidateLoa,
} from "./model";
import {
  getQuote,
  assignQuote,
  closeoutCarrier,
  generateDocument,
  validateFunds,
  clearHazards,
  markDocumentPrinted,
} from "./operations";
import { Fields, Lookup, EntryDialog, Dialog } from "./controls";
import { derivePrimeDic } from "./primeDic";
import DocumentManager, { DocumentContent } from "./DocumentManager";
import PaperworkWindow, { PaperworkContext, openPaperworkWindow } from "./PaperworkWindow";
import "./cmos.css";
// Normalize before individual field handlers read the entry, including modal fields.
function uppercaseEntry(event) {
  const input = event.target;
  if (input.tagName !== "TEXTAREA" &&
      !(input.tagName === "INPUT" && /^(text|search|tel|email|url)$/.test(input.type))) return;
  const value = input.value.toUpperCase();
  if (input.value === value) return;
  const { selectionStart, selectionEnd, selectionDirection } = input;
  const start = selectionStart === null ? null : input.value.slice(0, selectionStart).toUpperCase().length;
  const end = selectionEnd === null ? null : input.value.slice(0, selectionEnd).toUpperCase().length;
  input.value = value;
  if (start !== null && end !== null) input.setSelectionRange(start, end, selectionDirection);
}
function CmosDocumentation({ collapsed, children }) {
  return collapsed ? <details className="shared-air-documentation"><summary>Documentation</summary>{children}</details> : children;
}
export const CMOS_PAGES = {
  "Shipment Planning": "planning",
  "Air Schedule": "schedule",
  "Deployment Parameters": "deployment",
  "Air Manifest": "air",
  Pallets: "pallets",
  "Commercial BOL": "cbl",
  "Truck Manifest": "truck",
  Routings: "routing",
  "Small Package Express": "spe",
  "Rate Quote": "quote",
};
const match = (v, q) => {
  if (!q) return true;
  const pattern = String(q)
    .split("%")
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(q.includes("%") ? `^${pattern}$` : pattern, "i").test(
    String(v ?? ""),
  );
};
// Stable fictional traffic fills the reference-style grid without entering the exercise store.
const planningTraffic = Array.from({ length: 36 }, (_, i) => {
  const dodaac = ["FB2823", "FB3300", "FB4407", "FY4484", "FB5688", "FB2300"][i % 6];
  const tcn = `${dodaac}628${String(i + 1).padStart(4, "0")}XXX`;
  const statusCode = i < 8 ? null : ["PI", "ST", "AT", "00", "PA", "PS", "CT", "FC"][i % 8];
  return {
    id: `traffic-${i}`, status: "Draft", inchecked: statusCode ? ["PI", "ST", "AT"].includes(statusCode) : i % 4 !== 0, sample: true,
    ...(statusCode ? { statusCode } : {}),
    draft: { tcn, leadTcn: i % 7 === 0 ? `${dodaac}6280001XXX` : "",
      consolidation: i % 3 === 0 ? "N" : "", docNbr: i % 5 === 0 ? `${dodaac}628${String(i + 1).padStart(4, "0")}` : "",
      docType: i % 3 === 0 ? "M - MILSTRIP" : "O - Other",
      primeDic: "TX1", ediMode: "AF", expMode: "F", nmfc: "999913",
      description: ["FIBER USER MANUAL", "AIRCRAFT REPAIR PARTS", "GROUND SUPPORT EQUIPMENT", "COMMUNICATIONS EQUIPMENT", "TOOL KIT, GENERAL PURPOSE", "ADMINISTRATIVE SUPPLIES"][i % 6],
      totalCost: String([100, 285, 12450, 3750, 1850, 75][i % 6]) + ".00",
      nsn: `761001${String(4820100 + i).padStart(7, "0")}`, partNoAin: `TRN-${String(i + 1).padStart(4, "0")}`,
      origin: ORIGIN, ciic: "U", secClass: "U", typeCargo: "Z", hazmat: "N - Not hazardous",
      tac: ["F8R4", "F7C8", "F2RS", "", "F9GD"][i % 5],
      destination: dodaac, pod: i % 6 === 0 ? "SUU" : "", milMode: i % 6 === 0 ? "9" : "1",
      tp: String(i % 3 + 1), rdd: i % 3 === 0 ? "999" : "N1A", pieces: String(i % 4 + 1),
      weight: String([100, 20, 700, 257, 1300, 10][i % 6]), cube: String([10, 5, 76, 2, 693, 1][i % 6]),
      holdCodes: i % 11 === 0 ? "2" : "", frustratedReason: i % 11 === 0 ? "2" : "" },
  };
});
const planningHeaderRows = [
  [["docType"], ["palId"], ["dsoeId"]],
  [["docNbr"], ["movDoc"], ["chalk", "planId"]],
  [["tcn"], ["ttan"], ["uln"]],
  [["leadTcn"], ["ttn"], ["uic"]],
];
const planningMainRows = [
  [["primeDic", "lineItems"], ["description"], ["milMode", "ediMode", "expMode"],
    ["nmfc", "rate", "spi"], ["tac", "adviceNbr"], ["acctClass"], ["sdnMord", "loa"]],
  [["totalCost", "nsn"], ["cage", "partNoAin"], ["origin", "poe", "poeDodaac"],
    ["destination", "pod"], ["ciic", "secClass", "typeCargo"], ["rdd", "tp", "proj"],
    ["eta", "fmsCaseNumber", "holdCode"], ["markFor"]],
  [["shipmentId"], ["containerId"], ["aggregateId", "consolidationId"], ["etrrId", "pcfn"],
    ["tmrNumber"], ["rfTagNumber"], ["status"]],
];
const LIST_FIRST = ["planning", "air", "cbl"];
const defaults = {
  shipments: {
    docType: "N - Non-MILSTRIP",
    primeDic: "TX1",
    ediMode: "AF",
    secClass: "U",
    tp: "3",
    hazmat: "N - Not hazardous",
  },
  airManifests: { complete: "No" },
  truckManifests: { equipmentOwner: "G", conveyanceMode: "9" },
  routings: { requestType: "OR", routeId: "RG", atrHours: "24" },
  bills: { currency: "USD" },
  express: {},
  quotes: { quoteType: "SPE Domestic", packageType: "Package" },
};
export default function CmosWorkspace({
  store,
  onChange,
  context = {},
  initialPage = "planning",
  onClose,
}) {
  const [page, setPage] = useState(initialPage),
    [opened, setOpened] = useState(!LIST_FIRST.includes(initialPage)),
    [tab, setTab] = useState(
      Object.keys(screens[initialPage]?.tabs || screens.planning.tabs)[0],
    ),
    [message, setMessage] = useState(""),
    [queries, setQueries] = useState({}),
    [search, setSearch] = useState({}),
    [selected, setSelected] = useState([]),
    [planningSelection, setPlanningSelection] = useState([]),
    [lookup, setLookup] = useState(null),
    [entry, setEntry] = useState(null),
    [confirm, setConfirm] = useState(null),
    [consistency, setConsistency] = useState(null),
    [assignment, setAssignment] = useState(false),
    // The TGET Adapter window started by Val Funds: { id, tcn, tac, minimized }.
    [tget, setTget] = useState(null),
    [assignIds, setAssignIds] = useState([]),
    [assignQuery, setAssignQuery] = useState(""),
    [docs, setDocs] = useState([]),
    [paperworkWin, setPaperworkWin] = useState(null),
    [paperworkId, setPaperworkId] = useState(""),
    [documentId, setDocumentId] = useState(context.documents?.[0]?.id || ""),
    [printDialog, setPrintDialog] = useState(false),
    [docTitles, setDocTitles] = useState(["Carrier label"]),
    [closeout, setCloseout] = useState(false),
    [closeDate, setCloseDate] = useState(""),
    [closeScac, setCloseScac] = useState(""),
    [release, setRelease] = useState(false),
    [hazTab, setHazTab] = useState("Page 1"),
    [rateIndex, setRateIndex] = useState(null),
    [previewDocuments, setPreviewDocuments] = useState({}),
    [viewSelection, setViewSelection] = useState({});
  const latest = useRef({ store, onChange, context });
  latest.current = { store, onChange, context };
  const pending = Object.values(store.express)
    .filter((r) => r.result?.state === "pending")
    .map((r) => r.id)
    .join("|");
  useEffect(() => {
    if (!pending || context.finished) return;
    const timer = setTimeout(() => {
      const current = latest.current;
      let next = current.store;
      for (const eid of pending.split("|"))
        if (next.express[eid]?.result?.state === "pending")
          next = transition(
            next,
            "express",
            eid,
            "Receive Response",
            current.context,
          ).store;
      current.onChange(next);
    }, 250);
    return () => clearTimeout(timer);
  }, [pending, context.finished]);
  const definition = screens[page] || screens.planning,
    kind = definition.kind,
    id = context.finished
      ? viewSelection[kind] || store.selection?.[kind]
      : store.selection?.[kind],
    record = store[kind]?.[id] || (page === "air" ? AIR_MANIFEST_SAMPLES.find(r => r.id === id) : page === "truck" ? TRUCK_SAMPLES.find(r => r.id === id) : page === "cbl" ? CBL_SAMPLES.find(r => r.id === id) : page === "routing" ? ROUTING_SAMPLES.find(r => r.id === id) : undefined),
    draft = data(record),
    locked = Boolean(context.finished || (page === "planning" && opened && isPlanningViewOnly(record)));
  const visibleTabs = Object.keys(definition.tabs).filter(t =>
    (page !== "planning" || t !== "DG2" || isHazardousIndicator(draft.hazmat)) &&
    (t !== "T-9 Misc" || draft.t9Required || ["A", "W"].includes(draft.atcmdType))
  );
  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0];
  useEffect(() => {
    if (tab !== activeTab) setTab(activeTab);
  }, [tab, activeTab]);
  const viewDocument = (did) => {
    setDocs((prev) => [...new Set([...prev, did])]);
  };
  // The separate paperwork window. It closes with CMOS.
  const openPaperwork = (did) => {
    const win = openPaperworkWindow();
    if (!win) {
      setMessage("The browser blocked the paperwork window. Allow pop-ups for this site, or use View documentation.");
      if (did) viewDocument(did);
      return;
    }
    if (did) {
      setPaperworkId(did);
      setDocs((prev) => prev.filter((x) => x !== did));
    }
    setPaperworkWin(win);
  };
  const closePaperwork = useCallback(() => setPaperworkWin(null), []);
  const paperworkRef = useRef(null);
  paperworkRef.current = paperworkWin;
  useEffect(() => () => paperworkRef.current?.close(), []);
  const change = (next) => {
    if (!locked) onChange(next);
  };
  const apply = (r) => {
    if (locked && r.documentId)
      setPreviewDocuments((prev) => ({
        ...prev,
        [r.documentId]: r.store.documents[r.documentId],
      }));
    else change(r.store);
    setMessage((r.outcome?.messages || []).join(" "));
    if (r.documentId) setDocs((prev) => [...new Set([...prev, r.documentId])]);
  };
  const edit = (key, value) => {
    let patch = { [key]: value };
    if (kind === "shipments" && key === "hazmat") patch.t9Required = isHazardousIndicator(value);
    // A new TAC has not been validated: Val Funds must run again before rating.
    if (kind === "shipments" && key === "tac" && value !== draft.tac) patch.loa = "";
    // SPE: choosing a SCAC bills prepaid (PP) to the installation's account with that carrier.
    // A service the new carrier does not offer is cleared.
    if (kind === "express" && key === "scac") Object.assign(patch, { billTo: value ? "PP" : "", carrierAcctNbr: carrierAccount(value),
      ...(servicesFor(value).some(([code]) => code === draft.service) ? {} : { service: "" }) });
    if (kind === "shipments" && key === "docType" && value !== draft.docType) {
      const type = documentType(value);
      if (["N", "I"].includes(type)) patch.docNbr = "";
      if (type === "I") patch.tcn = "";
      if (type === "N") {
        const tcn = nonMilstripTcn(store, context.now);
        if (!tcn) { setMessage("All Non-MILSTRIP serials 001–999 are in use for this date."); return; }
        patch.tcn = tcn;
      } else if (["N", "I"].includes(documentType(draft.docType))) patch.tcn = "";
    }
    if (kind === "shipments" && key === "tcn" && documentType(draft.docType) === "O") patch.docNbr = "";
    if (kind === "shipments" && key === "milMode") patch.ediMode = ediForMilMode(value);
    if (kind === "shipments" && key === "ciic") {
      const forced =
        "$12345689ABCDEFGHKLO".includes(value) && value.length === 1;
      patch.repship = forced ? true : Boolean(draft.repship);
    }
    // A DSOE with Deployment Parameters fills this shipment's blank fields.
    if (kind === "shipments" && key === "dsoeId") Object.assign(patch, planningDefaults(store, value, draft));
    if (key === "protectiveService") patch.dd1907 = Boolean(value);
    // Picking an Air Schedule mission fills the manifest's DSOE ID and Chalk.
    if (kind === "airManifests" && key === "mission") {
      const mission = Object.values(store.missions || {}).find(m => m.saved && String(m.saved.missionNumber).toUpperCase() === String(value).trim().toUpperCase());
      if (mission) {
        if (mission.saved.dsoeId) patch.dsoeId = mission.saved.dsoeId;
        if (mission.saved.chalk) patch.chalk = mission.saved.chalk;
      }
    }
    // CMOS builds the Prime DIC from the shipment, so it follows every change to it.
    if (kind === "shipments") patch.primeDic = derivePrimeDic({ ...draft, ...patch });
    if (
      kind === "shipments" &&
      key === "hazmat" &&
      value.startsWith("N") &&
      Object.values(store.hazards).some((r) => r.draft.shipmentId === id)
    ) {
      setConfirm({
        title: "Remove hazardous data?",
        run: () => change(clearHazards(store, id)),
      });
      return;
    }
    change(editRecord(store, kind, id, patch));
  };
  // `open` goes straight to the selected record (e.g. Routings B/L → its Commercial BOL).
  const go = (next, { open = false } = {}) => {
    setPage(next);
    setTab(Object.keys(screens[next].tabs)[0]);
    setOpened(open || !LIST_FIRST.includes(next));
    setEntry(null);
    setSelected([]);
    setMessage("");
  };
  const choose = (id) => {
    if (locked) setViewSelection((prev) => ({ ...prev, [kind]: id }));
    else {
      const next = page === "planning" ? preparePlanningRecords([id]) : store;
      change({ ...next, selection: { ...next.selection, [kind]: id } });
    }
    setSelected([id]);
    if (page === "planning" && !opened) setPlanningSelection([id]);
    if (page !== "planning") setOpened(true);
  };
  const selectPlanning = (ids) => {
    if (store.shipments[ids[0]]) choose(ids[0]);
    else setSelected([]);
    setPlanningSelection(ids);
  };
  const preparePlanningRecords = (ids, incheck = false) => {
    let next = store;
    for (const selectedId of ids) {
      const sample = planningTraffic.find(r => r.id === selectedId);
      if (!next.shipments[selectedId] && sample) {
        const header = { ...sample.draft };
        delete header.pieces;
        delete header.weight;
        delete header.cube;
        next = createRecord(next, "shipments", header, sample.id);
        next = { ...next, shipments: { ...next.shipments, [selectedId]: { ...next.shipments[selectedId], inchecked: sample.inchecked, ...(sample.statusCode ? { statusCode: sample.statusCode } : {}) } } };
      }
      const existing = next.shipments[selectedId];
      if (existing && !String(existing.draft.origin || "").trim()) {
        next = editRecord(next, "shipments", selectedId, {
          origin: context.sourceOrigin || context.origin || ORIGIN,
        });
      }
      if (incheck && next.shipments[selectedId])
        next = { ...next, shipments: { ...next.shipments, [selectedId]: incheckPlanningRecord(next.shipments[selectedId]) } };
    }
    return next;
  };
  const openPlanningTcn = (row) => {
    if (locked) setViewSelection(prev => ({ ...prev, shipments: row.id }));
    else {
      const next = preparePlanningRecords(planningSelection.includes(row.id) ? planningSelection : [row.id]);
      change({ ...next, selection: { ...next.selection, shipments: row.id } });
    }
    setSelected([row.id]);
    if (!planningSelection.includes(row.id)) setPlanningSelection([row.id]);
    setOpened(true);
    setTab("Pieces");
  };
  const newRecord = (manifestType = "Cargo") => {
    const airType = manifestType === "Mail" ? "Mail" : "Cargo";
    const manifestNumber = kind === "airManifests" ? nextAirManifestNumber(store, airType) : null;
    if (kind === "airManifests" && !manifestNumber) { setMessage("All manifest numbers in this training series are in use."); return; }
    const movementDocNbr = kind === "bills" ? nextCblNumber(store) : null;
    if (kind === "bills" && !movementDocNbr) { setMessage("All movement document numbers in this training series are in use."); return; }
    const tcn = kind === "shipments" ? nonMilstripTcn(store, context.now) : null;
    if (kind === "shipments" && !tcn) { setMessage("All Non-MILSTRIP serials 001–999 are in use for this date."); return; }
    let next = createRecord(store, kind, {
      ...defaults[kind],
      ...(kind === "shipments"
        ? {
            tcn,
            docNbr: "",
            assetKey: context.activeAssetKey || null,
            origin: context.sourceOrigin || context.origin || ORIGIN,
          }
        : {}),
      ...(kind === "routings" ? { originDODAAC: context.origin || ORIGIN, origin: context.origin || ORIGIN, ...addressPatch("origin", context.origin || ORIGIN) } : {}),
      // Truck Manifest: origin and shipper default to the consignor; DSN phone type as CMOS shows.
      ...(kind === "truckManifests" ? { originDODAAC: context.origin || ORIGIN, origin: context.origin || ORIGIN, ...truckAddress("origin", context.origin || ORIGIN), shipperDODAAC: context.origin || ORIGIN, ...truckAddress("shipper", context.origin || ORIGIN), destinationPhoneType: "DSN" } : {}),
      ...(kind === "bills" ? { ...cblDefaults(context.origin || "FA5030"), movementDocNbr } : {}),
      ...(kind === "routings" ? routingDefaults(store, { gbloc: gblocForDodaac(context.origin || ORIGIN) || "MKFZ", origin: context.origin || ORIGIN, requester: cmosUser(), now: context.now ? new Date(context.now) : new Date() }) : {}),
      ...(kind === "express" ? { shipmentId: store.selection?.shipments } : {}),
      ...(kind === "quotes" ? { quoteTab: tab } : {}),
      ...(["airManifests", "truckManifests"].includes(kind)
        ? {
            manifestNumber: kind === "airManifests" ? manifestNumber : nextTruckManifestNumber(store) || `TRN-TM-${Object.keys(store[kind]).length + 1}`,
            ...(kind === "airManifests" ? { mode: "F", manifestType: typeof manifestType === "string" ? manifestType : "Cargo" } : {}),
          }
        : {}),
    });
    if (kind === "bills") next = { ...next, counters: { ...next.counters, cbl: Number(movementDocNbr.slice(-5)) } };
    if (kind === "airManifests") next = { ...next, counters: { ...next.counters, [airManifestCounterKey(airType)]: Number(manifestNumber.slice(-4)) + 1 } };
    if (kind === "shipments") {
      const sid = next.selection.shipments;
      next = { ...next, shipments: { ...next.shipments, [sid]: { ...next.shipments[sid], inchecked: false } } };
    }
    change(next);
    setOpened(true);
    setSelected([]);
    setTab(Object.keys(definition.tabs)[0]);
    setMessage("New record. Save at any time.");
  };
  const save = (close = false) => {
    if (!record) {
      setMessage("Select or create a record.");
      return;
    }
    change(saveRecord(store, kind, id));
    setMessage(
      "Transaction Successfully Processed. Record successfully saved.",
    );
    if (close) {
      setOpened(false);
      setEntry(null);
    }
  };
  const check = () => {
    const next = checkRecord(store, kind, id, context);
    change(next);
    const c = next[kind][id]?.check;
    if (kind === "shipments" && c && !c.passed) {
      // CMOS reports a failed Edit TCN in the status area and lists what is missing in a
      // separate Consistency Check Results window.
      setMessage(<span className="shared-edit-failed"><strong><span aria-hidden="true">✕</span> Edit TCN Failed</strong><br />TCN Failed Edit Checks</span>);
      setConsistency({
        tcn: next[kind][id].saved?.tcn || next[kind][id].draft.tcn || "",
        placement: next[kind][id].saved?.palId ? "pallet" : "loose",
        missing: c.errors.filter((e) => e.startsWith(MISSING_PREFIX)).map((e) => e.slice(MISSING_PREFIX.length)),
        dg2: c.errors.includes(DG2_TEMPLATE_MISSING),
        misc: c.errors.includes(T9_MISC_MISSING),
        other: c.errors.filter((e) => !e.startsWith(MISSING_PREFIX) && e !== DG2_TEMPLATE_MISSING && e !== T9_MISC_MISSING),
      });
      return;
    }
    setMessage(
      c?.passed
        ? "Passed Edits"
        : (c?.errors || ["Select a record."]).join(" "),
    );
  };
  const openEntry = (k, rid, title, fields) =>
    setEntry({ kind: k, id: rid, title, fields });
  const beginNewPiece = (base) => {
    const number = Math.max(0, ...piecesFor(base, [id]).map(p => Number(p.draft.number) || 0)) + 1;
    const next = createRecord(base, "pieces", {
      shipmentId: id,
      number: String(number),
      assetKey: record?.draft.assetKey || null,
    });
    change(next);
    setSelected([]);
    setEntry({ kind: "pieces", id: next.selection.pieces, title: "Piece Information", fields: pieceFields, isNew: true });
  };
  const newPiece = () => beginNewPiece(store);
  const newCollection = (collection) => {
    const next = createRecord(store, "documents", {
      ownerId: id,
      ownerKind: kind,
      collection,
    });
    change(next);
    openEntry(
      "documents",
      next.selection.documents,
      `${collection} detail`,
      collections[collection],
    );
  };
  const printFor = (kind, id, title, variant = "Draft", options = {}) => {
    const record = store[kind]?.[id];
    const saved = saveRecord(
      locked
        ? { ...store, documents: { ...store.documents, ...previewDocuments } }
        : store,
      kind,
      id,
    );
    let next = saved;
    if (variant === "Final" && !locked) {
      const r = transition(next, kind, id, "Final Print", context);
      if (r.outcome.status === "failed") {
        apply(r);
        return;
      }
      next = r.store;
    } else next = transition(next, kind, id, "Print", context).store;
    if (title === "Cargo pull sheet")
      next = {
        ...next,
        airManifests: {
          ...next.airManifests,
          [id]: {
            ...next.airManifests[id],
            pullRevision: next.airManifests[id].revision,
            pullBasis: next.airManifests[id].printBasis,
            printRevision: record.printRevision,
            printBasis: record.printBasis,
          },
        },
      };
    apply(generateDocument(next, kind, id, title, variant, options));
  };
  const print = (title, variant, options) =>
    printFor(kind, id, title, variant, options);
  const shipmentNavigation = (nextPage) => {
    let next = store;
    const targetKind = screens[nextPage].kind;
    const exists = Object.values(next[targetKind]).find(
      (r) => r.draft.shipmentId === id,
    );
    if (exists)
      next = {
        ...next,
        selection: { ...next.selection, [targetKind]: exists.id },
      };
    else {
      const t = totals(next, [id]);
      next = createRecord(next, targetKind, {
        ...defaults[targetKind],
        shipmentId: id,
        tcn: draft.tcn,
        originZip: context.shipmentSources?.[id]?.originZip || "",
        destinationZip: context.shipmentSources?.[id]?.destinationZip || "",
        weight: String(t.weight || ""),
        length: piecesFor(next, [id])[0]?.draft.length || "",
        width: piecesFor(next, [id])[0]?.draft.width || "",
        height: piecesFor(next, [id])[0]?.draft.height || "",
      });
    }
    change(next);
    go(nextPage);
  };
  function action(name) {
    if (name === "Save") return save();
    if (name === "Save and Close") return save(true);
    if (name === "Close") {
      setOpened(false);
      return;
    }
    if (name === "New") return newRecord();
    if (["Edit TCN", "Edit Check", "Edit Data", "Edit"].includes(name))
      return check();
    if (name === "Delete") {
      setConfirm({
        title: "Delete this record and its linked details?",
        run: () => {
          change(deleteRecord(store, kind, id));
          setOpened(false);
        },
      });
      return;
    }
    if (["First", "Previous", "Next", "Last"].includes(name)) {
      const rows =
        page === "planning" && planningSelection.length > 1
          ? planningSelection
          : Object.keys(store[kind]);
      let i = rows.indexOf(id);
      i =
        name === "First"
          ? 0
          : name === "Last"
            ? rows.length - 1
            : name === "Previous"
              ? Math.max(0, i - 1)
              : Math.min(rows.length - 1, i + 1);
      choose(rows[i]);
      return;
    }
    if (name === "Expr Ship") return shipmentNavigation("spe");
    if (name === "Rate Quote") return shipmentNavigation("quote");
    if (name === "Ship Plan") {
      go("planning");
      return;
    }
    if (["Assign Pallets", "View Loose Cargo"].includes(name)) {
      setAssignment(true);
      setAssignIds([]);
      return;
    }
    if (name === "Unassign") {
      change(assignShipments(store, kind, id, selected, true));
      return;
    }
    if (name === "Create AIT") {
      apply(
        generateDocument(
          saveRecord(store, kind, id),
          kind,
          id,
          "AIT shipment data",
        ),
      );
      return;
    }
    if (name === "EEI") {
      const next = createRecord(store, "documents", {
        ownerKind: kind,
        ownerId: id,
        collection: "EEI",
      });
      change(next);
      openEntry(
        "documents",
        next.selection.documents,
        "Electronic Export Information",
        [
          field("ITN", "itn"),
          field("Shipment Value", "shipmentValue"),
          field("Harmonized Code", "harmonizedCode"),
          field("Country of Destination", "countryOfDestination"),
          field("Export License", "exportLicense"),
        ],
      );
      return;
    }
    if (name === "Validate Funds" && kind === "express") {
      // SPE Validate Funds runs TGET for the TCN's shipment; rating needs its LOA Val Status P.
      const shipment = store.shipments[draft.shipmentId];
      if (!shipment) return setMessage("Select a TCN before validating funds.");
      return setTget({ id: shipment.id, tcn: shipment.draft.tcn || "", tac: shipment.draft.tac || "", minimized: false });
    }
    if (name === "Validate Funds") return apply(validateFunds(store, kind, id));
    if (name === "Get Quote")
      return apply(
        getQuote(editRecord(store, kind, id, { quoteTab: tab }), id),
      );
    if (name === "Assign") {
      const result = assignQuote(store, id, rateIndex);
      apply(result);
      if (result.outcome.status === "success") go("spe");
      return;
    }
    if (name === "Clear") {
      change(
        editRecord(
          store,
          kind,
          id,
          Object.fromEntries(
            Object.keys(draft)
              .filter((k) => !["shipmentId", "assetKey"].includes(k))
              .map((k) => [k, ""]),
          ),
        ),
      );
      return;
    }
    if (name === "Print Express Docs") {
      setPrintDialog({ page, kind, id });
      return;
    }
    if (name === "Closeout") {
      setCloseScac(draft.scac || "");
      setCloseDate(draft.shipDate || "");
      setCloseout(true);
      return;
    }
    if (name === "Web Tracking") {
      if (record?.result?.tracking) {
        apply(generateDocument(store, kind, id, "Tracking status", "Final"));
      } else
        setMessage("Send Request and receive a response to obtain tracking.");
      return;
    }
    if (name === "Notices") {
      setTab(page === "routing" ? "Notices" : tab);
      setMessage(
        record?.result?.state === "failed"
          ? "Communication lost. Use Status Request to retry."
          : `No pending notices. Current status: ${record?.status || "Draft"}`,
      );
      return;
    }
    // Send Request saves the current entries first; the trainee does not have to Save.
    if (name === "Send Request")
      return apply(transition(kind === "express" ? saveRecord(store, kind, id) : store, kind, id, name, context));
    if (name === "Status Request")
      return apply(transition(store, kind, id, name, context));
    if (name === "Cancel")
      return apply(transition(store, kind, id, name, context));
    if (["Abort Manifest", "Abort"].includes(name))
      return apply(transition(store, kind, id, "Abort", context));
    if (name === "Release") {
      setRelease(true);
      setMessage("");
      return;
    }
    if (name === "Export") {
      apply(generateDocument(store, kind, id, "Manifest export"));
      return;
    }
    if (name === "Print Pull Sheet") return print("Cargo pull sheet", "Final");
    if (name === "Print Manifest")
      return print(`${page === "air" ? "Air" : "Truck"} manifest`, "Final");
    if (name === "Print Route Report") return print("Route report");
    if (name === "Print") {
      if (page === "cbl") {
        setDocTitles(["Final"]);
        // Print options, not bill fields (editing the bill would void its edit check). Estimated
        // Pickup Date starts from the route order's earliest pickup, else today.
        const route = Object.values(store.routings || {}).find((r) => Object.values(r.draft.equipGroups || {}).some((g) => g.cblId === id));
        const pickup = draft.estimatedPickupDate || String(route?.draft.pickupEarliest || "").split("/")[0] || formatScheduleDate(context.now ? new Date(context.now) : new Date());
        setPrintDialog({ page, kind, id, customs: "No", estimatedPickupDate: pickup });
      } else print("Rate quote");
    }
  }
  const collectionRows = (collection) =>
    Object.values(store.documents).filter(
      (r) =>
        r.draft.ownerId === id &&
        r.draft.ownerKind === kind &&
        r.draft.collection === collection,
    );
  const documents = [
    ...(context.documents || []),
    ...Object.values(store.documents)
      .filter((r) => r.saved?.title)
      .map((r) => ({ id: r.id, title: r.saved.title })),
  ];
  const total = totals(
    store,
    kind === "shipments"
      ? [id]
      : draft.shipmentIds || [draft.shipmentId].filter(Boolean),
  );
  const linked = store.shipments[draft.shipmentId]?.draft || {};
  const shown = {
    ...draft,
    // Mov Doc: the TCN's movement document (SPE tracking, CBL, truck or air manifest number).
    ...(kind === "shipments" && record && movementDocumentFor(store, id) ? { movDoc: movementDocumentFor(store, id) } : {}),
    ...(kind === "shipments" && record ? { primeDic: derivePrimeDic(draft), consolidationInd: draft.consolidationInd || "N", courierInd: draft.courierInd || "N" } : {}),
    status: page === "planning" && record ? planningStatusLabel(record) : record?.status,
    totalWeight: String(total.weight),
    totalCube: String(wholeCube(total.cube)),
    ...(page === "spe"
      ? {
          tcn: linked.tcn || "",
          consignee: linked.destination || "",
          nomenclature: linked.description || "",
          pieces: String(total.pieces),
          weight: String(total.weight),
          cube: String(wholeCube(total.cube)),
          milMode: linked.milMode || "",
          ediMode: linked.ediMode || "",
          hazardous: linked.hazmat || "",
          movementDocNumber: record?.result?.tracking || "",
          estimatedCharges: money(record?.result?.charges, "$.00"),
          trackingNumber: record?.result?.tracking || "",
          ratedWeight: String(record?.result?.ratedWeight || ""),
          gfmId: record?.result?.gfmId || "",
          maxTransitDays: record?.result?.transitDays || "",
          closedReleasedDate:
            record?.status === "Closed out" && record.result?.closedAt ? closedLabel(record.result.closedAt) : "",
        }
      : {}),
  };
  const readOnlyIds = [
    // LOA Val Status is filled by TGET (Val Funds).
    ...(page === "planning" ? ["loa"] : []),
    ...(page === "planning" && record && movementDocumentFor(store, id) ? ["movDoc"] : []),
    "status",
    "totalWeight",
    "totalCube",
    ...(page === "spe"
      ? [
          "tcn",
          "consignee",
          "nomenclature",
          "pieces",
          "weight",
          "cube",
          "milMode",
          "ediMode",
          "hazardous",
          "movementDocNumber",
          "estimatedCharges",
          "trackingNumber",
          "ratedWeight",
          "gfmId",
          "maxTransitDays",
          "closedReleasedDate",
        ]
      : []),
  ];
  const completeDocumentNumber = () => {
    if (locked || !["M", "O"].includes(documentType(draft.docType)) || !String(draft.docNbr || "").trim()) return;
    const tcn = documentTcn(draft.docNbr);
    if (!tcn) { setMessage("Document number must contain 14 characters, or 15 including its suffix."); return; }
    change(editRecord(store, "shipments", id, { docNbr: String(draft.docNbr).trim().toUpperCase(), tcn }));
  };
  const renderFields = (fields, values = shown, onEdit = edit) => (
    <Fields
      fields={fields.map((f) => ({
        ...f,
        readOnly: Boolean(f.readOnly) || (values === shown && (readOnlyIds.includes(f.id) || (page === "planning" && f.id === "docNbr" && ["N", "I"].includes(documentType(draft.docType))))),
        ...(page === "planning" && values === shown && f.id === "tcn" && documentType(draft.docType) === "I" ? {
          placeholder: "F00001$$E100100XX",
          help: "Enter the full increment TCN: F + five-character ULN + $$ + E and four-digit increment + 00XX.",
        } : {}),
        ...(page === "planning" && values === shown && f.id === "docNbr" ? {
          disabled: ["N", "I"].includes(documentType(draft.docType)),
          required: documentType(draft.docType) === "M",
          onBlur: completeDocumentNumber,
        } : {}),
      }))}
      values={values}
      onEdit={onEdit}
      locked={locked}
      openLookup={(f, rows) =>
        setLookup({ f, rows, onSelect: (v) => onEdit(f.id, v) })
      }
    />
  );
  const detailTabs = (t) => (
      <DetailTabs
        apply={apply}
        {...{
          page,
          tab: t,
          total,
          locked,
          selected,
          newPiece,
          store,
          id,
          change,
          print,
          setMessage,
          setSelected,
          setConfirm,
          rowTable,
          openEntry,
          definition,
          setHazTab,
          draft,
          record,
          setAssignment,
          setAssignIds,
          kind,
          edit,
          context,
          go,
          newCollection,
          collectionRows,
          renderFields,
        }}
      />
  );
  const renderPlanningColumn = (fields, rows) => rows.map((ids, i) => (
    <div className="shared-detail-field-row" key={i}>
      {renderFields(ids.map(id => fields.find(f => f.id === id)).filter(Boolean)
        .map(f => f.id === "nmfc" && requiresNmfc(draft.milMode) ? { ...f, required: true } : f))}
      {ids.includes("acctClass") && <button disabled={locked} onClick={() => {
        const next = createRecord(store, "documents", { ownerId: id, ownerKind: kind, collection: "Accounting" });
        change(next);
        openEntry("documents", next.selection.documents, "Accounting detail", collections.Accounting);
      }}>Edit Acct Cl</button>}
      {ids.includes("loa") && <button disabled={locked} onClick={() => kind === "shipments" ? setTget({ id, tcn: draft.tcn || "", tac: draft.tac || "", minimized: false }) : apply(validateFunds(store, kind, id))}>Val Funds</button>}
    </div>
  ));
  const rowTable = (rows, fields, editRow, checkbox = false) => (
    <div className="shared-table-scroll">
      <table className="shared-table">
        <thead>
          <tr>
            <th>{checkbox ? "Select" : "Edit"}</th>
            {fields.map((f) => (
              <th key={f.id}>{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {checkbox ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.draft.tcn || r.id}`}
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked
                          ? [...prev, r.id]
                          : prev.filter((x) => x !== r.id),
                      )
                    }
                  />
                ) : (
                  <button
                    aria-label={`Edit ${r.id}`}
                    onClick={() => editRow(r)}
                  >
                    {r.draft.number || r.draft.tcn || "Edit"}
                  </button>
                )}
              </td>
              {fields.map((f) => (
                <td key={f.id}>{String(r.draft[f.id] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>No data to display.</p>}
      <p>{rows.length} row(s) found.</p>
    </div>
  );
  const activeEntry = entry && store[entry.kind]?.[entry.id];
  const hazardEdit = (key, v) =>
    change(editRecord(store, "hazards", entry.id, { [key]: v }));
  const planningRow = (r) => ({
    ...r.draft,
    ...(!r.sample ? (({ cube, ...t }) => ({ ...t, cube: wholeCube(cube) }))(totals(store, [r.id])) : {}),
    docType: (r.draft.docType || "N").slice(0, 1),
    status: planningStatus(r),
    movementDocument: (!r.sample && movementDocumentFor(store, r.id)) || r.draft.movementDocument || "",
  });
  const trafficRows = planningTraffic.filter(r => !store.shipments[r.id] && !Object.values(store.shipments).some(s => s.draft.tcn === r.draft.tcn));
  const headerRows = [...Object.values(store.shipments), ...trafficRows].filter((r) =>
    Object.entries(search).every(([k, q]) =>
      k === "status" && search.tcn ? true : match(planningRow(r)[k], q),
    ),
  );
  return (
    <PaperworkContext.Provider value={openPaperwork}>
    <div className="cmos-input-scope" onChangeCapture={uppercaseEntry}>
      <CmosWindow
        origin={{ cmosDodaac: "FA5030" }}
        page={page}
        title={definition.title}
        pages={CMOS_PAGES}
        onNavigate={go}
        onClose={onClose}
      >
        <div className={`shared-cmos ${page === "planning" ? (opened ? "shared-planning-detail" : "shared-planning-list") : ""}`}>
          {context.storageError && (
            <p role="alert">
              Browser storage is unavailable. Your work remains editable in this
              tab; export the session to keep a copy.
            </p>
          )}
          <RegulationHelp claims={cmosPageClaims(page)} assumptions={['CMOS interface steps, example dates, manifest assignments, and local release gates are simulated. Code sources apply to the selected code and do not validate every field in a shipment.']} />
          <CmosDocumentation collapsed={["air", "cbl"].includes(page)}>
          <div className="shared-document-bar">
            <label>
              Documentation
              <select
                aria-label="Documentation"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              >
                <option value="">Select document</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!documentId}
              onClick={() => viewDocument(documentId)}
            >
              View documentation
            </button>
            <button type="button" onClick={() => openPaperwork(documentId)}>
              Open in new window
            </button>
            <span>
              Training simulation ·{" "}
              {context.course === "outbound" ? "Outbound" : "CDF"}
            </span>
          </div>
          </CmosDocumentation>
          <div>
            <div>
              {page === "deployment" ? <DeploymentParametersScreen store={store} change={change} locked={Boolean(context.finished)} setMessage={setMessage} adviceNumbers={context.adviceNumbers} />
              : page === "spe" ? <SmallPackageScreen {...{ store, record, locked, change, setMessage, action, renderFields, shown, context }} />
              : page === "pallets" ? <PalletsScreen store={store} change={change} locked={Boolean(context.finished)} openShipPlan={id => { go("planning"); openPlanningTcn({ id }); }} />
              : page === "schedule" ? <AirScheduleScreen store={store} change={change} locked={Boolean(context.finished)} setMessage={setMessage} dsoes={context.dsoes} />
              : page === "routing" ? <RoutingScreen
                {...{ store, record, opened, locked, edit, change, action, setMessage, renderFields, newCollection, go }}
                now={context.now}
                newRouting={() => newRecord()}
                openRouting={row => {
                  change({ ...store, selection: { ...store.selection, routings: row.id } });
                  setOpened(true); setSelected([]);
                }}
              />
              : page === "air" ? <AirManifestScreen
                {...{ store, record, opened, locked, renderFields, total, selected, setSelected, change, setMessage, action }}
                openShipPlan={id => { go("planning"); openPlanningTcn({ id }); }}
                newManifest={newRecord}
                openManifest={row => {
                  if (!row) return;
                  if (locked) setViewSelection(prev => ({ ...prev, airManifests: row.id }));
                  else if (!store.airManifests[row.id]) change(createRecord(store, "airManifests", row.draft, row.id));
                  else change({ ...store, selection: { ...store.selection, airManifests: row.id } });
                  setOpened(true); setSelected([]);
                }}
              /> : page === "truck" ? <TruckManifestScreen
                {...{ store, record, opened, locked, renderFields, change, edit, action }}
                renderTab={detailTabs}
                newManifest={newRecord}
                openManifest={row => {
                  if (!row) return;
                  if (locked) setViewSelection(prev => ({ ...prev, truckManifests: row.id }));
                  else if (!store.truckManifests[row.id]) change(createRecord(store, "truckManifests", row.draft, row.id));
                  else change({ ...store, selection: { ...store.selection, truckManifests: row.id } });
                  setOpened(true); setSelected([]);
                }}
              /> : page === "cbl" ? <CommercialBolScreen
                {...{ store, record, opened, locked, renderFields, change, edit, action, setAssignment, setAssignIds, openEntry, collectionRows, newCollection, print, setMessage }}
                renderTab={detailTabs}
                newBill={newRecord}
                openBill={row => {
                  if (locked) setViewSelection(prev => ({ ...prev, bills: row.id }));
                  else if (!store.bills[row.id]) { const next = createRecord(store, "bills", row.draft, row.id); change({ ...next, bills: { ...next.bills, [row.id]: { ...next.bills[row.id], status: row.status } } }); }
                  else change({ ...store, selection: { ...store.selection, bills: row.id } });
                  setOpened(true); setSelected([]);
                }}
              /> : page === "planning" && !opened ? (
                <>
                  <form className="shared-planning-search" role="search" aria-label="Shipment Planning search" onSubmit={e => { e.preventDefault(); setSearch(queries); }}>
                    <label htmlFor="planning-status">Status</label>
                    <select id="planning-status" aria-label="Search Status" value={queries.status || ""} onChange={e => setQueries({ ...queries, status: e.target.value })}>
                      <option value="">All Statuses</option>
                      {PLANNING_STATUS_GROUPS.map(group => <optgroup key={group.label} label={group.label}>
                        {group.statuses.map(([code, label]) => <option key={code} value={code}>{code} - {label}</option>)}
                      </optgroup>)}
                    </select>
                    <label htmlFor="planning-tcn">TCN</label>
                    <input id="planning-tcn" aria-label="TCN" value={queries.tcn || ""} onChange={e => setQueries({ ...queries, tcn: e.target.value })} />
                    <div className="shared-planning-search-buttons"><button type="submit">Search</button><button type="button" onClick={() => { setQueries({}); setSearch({}); selectPlanning([]); }}>Clear</button></div>
                    <p>Searching by TCN will ignore selected Status.<br /><strong>Tip</strong> Add % to inputs for partial searches (Ex: %1234%)</p>
                  </form>
                  <div className="shared-planning-grid">
                  <div className="shared-toolbar">
                    <button disabled={locked} onClick={newRecord}>
                      New
                    </button>
                    <button aria-label="Clear selection" onClick={() => selectPlanning([])}>Clear</button>
                    <button
                      disabled={locked || !planningSelection.length || planningSelection.every(sid => isPlanningViewOnly(store.shipments[sid] || planningTraffic.find(row => row.id === sid)))}
                      onClick={() => {
                        change(preparePlanningRecords(planningSelection, true));
                        const status = incheckedStatus(search.status);
                        if (status && !search.tcn) {
                          setSearch({ ...search, status });
                          setQueries({ ...queries, status });
                        }
                      }}
                    >
                      Incheck
                    </button>
                    <button
                      disabled={locked || !selected.length || isPlanningViewOnly(record)}
                      onClick={() => {
                        change(deriveShipment(store, id, "Copy"));
                        setOpened(true);
                      }}
                    >
                      Copy TCN
                    </button>
                    <button
                      disabled={locked || !selected.length || isPlanningViewOnly(record)}
                      onClick={check}
                    >
                      Edit Check
                    </button>
                  </div>
                  <div className="shared-table-scroll">
                    <table className="shared-table">
                      <thead>
                        <tr className="shared-planning-filters"><th />{planningColumns.map(f => <th key={f.id}><input aria-label={["tcn", "status"].includes(f.id) ? `Filter ${f.label}` : f.label} value={queries[f.id] || ""} onChange={e => setQueries({ ...queries, [f.id]: e.target.value })} /></th>)}</tr>
                        <tr><th aria-label="Select shipment" />{planningColumns.map(f => <th key={f.id}>{f.label === "Consolidation" ? "Consolidation Document Number" : f.label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {!headerRows.length && <tr><td colSpan={planningColumns.length + 1}>No data to display.</td></tr>}
                        {headerRows.map((r) => {
                          return (
                            <tr key={r.id} aria-selected={planningSelection.includes(r.id)}>
                              <td>
                                <input
                                  type="checkbox"
                                  aria-label={`Select row ${r.draft.tcn || r.id}`}
                                  checked={planningSelection.includes(r.id)}
                                  disabled={locked && r.sample}
                                  onChange={(event) => selectPlanning(event.target.checked
                                    ? [...planningSelection, r.id]
                                    : planningSelection.filter(x => x !== r.id))}
                                />
                                <button
                                  aria-label={`Select ${r.draft.tcn || r.id}`}
                                  disabled={locked && r.sample}
                                  onClick={() => selectPlanning([r.id])}
                                >
                                  ▧
                                </button>
                              </td>
                              {planningColumns.map((f) => (
                                <td key={f.id}>
                                  {f.id === "tcn" ? <button
                                    className="shared-tcn-link"
                                    aria-label={`Open TCN ${r.draft.tcn || r.id}`}
                                    disabled={locked && r.sample}
                                    onClick={() => openPlanningTcn(r)}
                                  >{r.draft.tcn || r.id}</button> : String(planningRow(r)[f.id] ?? "")}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="shared-planning-count">{headerRows.length} row(s) found.</div>
                  </div>
                </>
              ) : (
                <div className={page === "planning" ? "shared-detail-frame" : ""}>
                  {page === "planning" && <h3 className="shared-detail-title">Shipment Planning</h3>}
                  <div className="shared-toolbar shared-record-tools">
                    <button disabled={locked} onClick={newRecord}>
                      New
                    </button>
                    <label>
                      Record
                      <select
                        aria-label="Select record"
                        value={id || ""}
                        onChange={(e) => choose(e.target.value)}
                      >
                        <option value="">Select</option>
                        {Object.values(store[kind]).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.draft.tcn ||
                              r.draft.manifestNumber ||
                              r.draft.movementDocNbr ||
                              r.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    {page === "planning" &&
                      ["Copy", "Duplicate", "Partial", "Split"].map((a) => (
                        <button
                          disabled={
                            locked ||
                            !record ||
                            (["Partial", "Split"].includes(a) &&
                              !selected.length)
                          }
                          key={a}
                          onClick={() => {
                            change(deriveShipment(store, id, a, selected));
                            setSelected([]);
                          }}
                        >
                          {a}
                        </button>
                      ))}
                  </div>
                  {record && opened ? (
                    <>
                      <div
                        className={`shared-header ${page === "planning" ? "shared-planning-header" : ""}`}
                      >
                        {page === "planning"
                          ? planningHeader.map((group, i) => (
                              <div key={i}>{renderPlanningColumn(group, planningHeaderRows[i])}</div>
                            ))
                          : renderFields(definition.header)}
                      </div>
                      {page === "planning" && (
                        <div className="shared-planning-main">
                          {planningMain.map((group, i) => (
                            <div key={i}>{renderPlanningColumn(group, planningMainRows[i])}</div>
                          ))}
                        </div>
                      )}
                      <div
                        className="shared-tab-bar"
                        role="tablist"
                        aria-label={`${definition.title} tabs`}
                      >
                        {visibleTabs.map((t) => (
                            <button
                              role="tab"
                              aria-selected={t === activeTab}
                              key={t}
                              onClick={() => {
                                setTab(t);
                                setSelected([]);
                              }}
                            >
                              {t}
                            </button>
                          ))}
                      </div>
                      <section role="tabpanel" aria-label={activeTab}>
                        {detailTabs(activeTab)}
                      </section>
                      {page === "quote" && record.result?.rates && (
                        <>
                          <table className="shared-table">
                            <thead>
                              <tr>
                                <th>Select</th>
                                <th>Carrier Name</th>
                                <th>SCAC</th>
                                <th>Svc Type</th>
                                <th>Rated Weight</th>
                                <th>Max Days Transit</th>
                                <th>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.result.rates.map((r, i) => (
                                <tr key={r.scac}>
                                  <td>
                                    <input
                                      type="radio"
                                      aria-label={`Select quote ${r.scac}`}
                                      checked={rateIndex === i}
                                      onChange={() => setRateIndex(i)}
                                    />
                                  </td>
                                  <td>{r.name}</td>
                                  <td>{r.scac}</td>
                                  <td>{r.service}</td>
                                  <td>{r.ratedWeight}</td>
                                  <td>{r.transitDays}</td>
                                  <td>${r.cost}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      {page === "spe" && record.result && (
                        <p>
                          Request {record.result.state} · Tracking{" "}
                          {record.result.tracking || "Pending"} · Charges $
                          {record.result.charges || "—"} · Rated weight{" "}
                          {record.result.ratedWeight || "—"} · GFM ID{" "}
                          {record.result.gfmId || "—"}
                        </p>
                      )}
                      <p className="shared-record-status">
                        Status: {page === "planning" ? `${planningStatus(record)} · ${record.status}` : record.status} · Revision {record.revision} ·{" "}
                        {currentCheck(record)
                          ? "Passed current check"
                          : "Check required"}
                        {["air", "truck", "cbl", "routing"].includes(page) &&
                          ` · Pieces ${total.pieces} · Weight ${total.weight} · Cube ${wholeCube(total.cube)}`}
                      </p>
                      <div className="shared-toolbar shared-bottom">
                        {definition.actions
                          .filter((a) => a !== "New")
                          .map((a) => (
                            <button
                              key={a}
                              disabled={
                                locked &&
                                ![
                                  "Print",
                                  "Print Express Docs",
                                  "Print Manifest",
                                  "Print Pull Sheet",
                                  "Print Route Report",
                                  "Web Tracking",
                                  "Close",
                                  "Ship Plan",
                                ].includes(a)
                              }
                              onClick={() => action(a)}
                            >
                              {a}
                            </button>
                          ))}
                      </div>
                    </>
                  ) : (
                    <>
                      {rowTable(
                        Object.values(store[kind]),
                        definition.header,
                        (r) => {
                          choose(r.id);
                          setOpened(true);
                        },
                      )}
                      <p>Select an existing record or click New.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </CmosWindow>
      <DocumentManager
        openIds={docs}
        documents={context.documents || []}
        store={{
          ...store,
          documents: { ...store.documents, ...previewDocuments },
        }}
        onPrint={(did) => {
          if (!locked) apply(markDocumentPrinted(store, did));
        }}
        onClose={(did) => setDocs((prev) => prev.filter((x) => x !== did))}
        onPopOut={openPaperwork}
      />
      {paperworkWin && (
        <PaperworkWindow
          win={paperworkWin}
          documents={documents}
          selectedId={paperworkId}
          onSelect={setPaperworkId}
          renderDocument={(did) => <DocumentContent id={did} documents={context.documents || []} store={{ ...store, documents: { ...store.documents, ...previewDocuments } }} />}
          onPrint={(did) => {
            if (!locked && store.documents[did] && !(context.documents || []).some((d) => d.id === did)) apply(markDocumentPrinted(store, did));
          }}
          onClose={closePaperwork}
        />
      )}
      {lookup && (
        <Lookup
          field={lookup.f}
          rows={lookup.rows}
          onSelect={lookup.onSelect}
          onClose={() => setLookup(null)}
        />
      )}
      {entry && activeEntry && entry.kind !== "hazards" && (
        <EntryDialog
          title={entry.title}
          fields={entry.fields}
          record={activeEntry}
          locked={locked}
          isPiece={entry.kind === "pieces"}
          onAddPiece={entry.kind === "pieces" ? () => beginNewPiece(saveRecord(store, "pieces", entry.id)) : undefined}
          onEdit={(key, v) =>
            change(editRecord(store, entry.kind, entry.id, {
              [key]: v,
              // Choosing a DTR route instruction note brings its text, unless the trainee already wrote one.
              ...(key === "rin" && rinTextFor(v) && !activeEntry.draft.description ? { description: rinTextFor(v) } : {}),
            }))
          }
          onSave={(close) => {
            change(saveRecord(store, entry.kind, entry.id));
            setMessage("Record successfully saved.");
            if (close) setEntry(null);
          }}
          onDelete={() =>
            setConfirm({
              title: "Delete detail record?",
              run: () => {
                change(deleteRecord(store, entry.kind, entry.id));
                setEntry(null);
              },
            })
          }
          onClose={() => {
            if (entry.isNew && entry.kind === "pieces" && !activeEntry.saved)
              change(deleteRecord(store, "pieces", entry.id));
            setEntry(null);
          }}
        />
      )}
      {entry && activeEntry && entry.kind === "hazards" && (
        <HazardousTcn
          {...{
            activeEntry,
            locked,
            hazTab,
            setHazTab,
            renderFields,
            hazardEdit,
            entry,
            store,
            change,
            setLookup,
            setConfirm,
            setEntry,
            setMessage,
          }}
        />
      )}
      {assignment && (
        <Dialog title="Assign TCNs" onClose={() => setAssignment(false)} wide>
          {page === "air" && <p>Only shipments with MIL Mode F in Shipment Planning are eligible for Air Manifest assignment.</p>}
          <label>
            TCN
            <input
              aria-label="Assignment TCN search"
              value={assignQuery}
              onChange={(e) => setAssignQuery(e.target.value)}
            />
          </label>
          <table className="shared-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>TCN</th>
                <th>Nomenclature</th>
                <th>Pieces</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(store.shipments)
                .filter((r) => match(r.draft.tcn, assignQuery))
                .filter(r => page !== "air" || (availableForAirManifest(store, id, r) && !(draft.shipmentIds || []).includes(r.id) && (assignment === "pallet" ? Boolean(r.draft.palletId) : !r.draft.palletId)))
                .filter((r, index, rows) => page !== "air" || assignment !== "pallet" || rows.findIndex(other => other.draft.palletId === r.draft.palletId) === index)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Assign ${r.draft.tcn || r.id}`}
                        checked={assignIds.includes(r.id)}
                        onChange={(e) =>
                          setAssignIds((prev) =>
                            e.target.checked
                              ? [...prev, r.id]
                              : prev.filter((x) => x !== r.id),
                          )
                        }
                      />
                    </td>
                    <td>{r.draft.tcn}</td>
                    <td>{r.draft.description}</td>
                    <td>{totals(store, [r.id]).pieces}</td>
                    <td>{totals(store, [r.id]).weight}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <footer>
            <button
              disabled={locked || !assignIds.length}
              onClick={() => {
                let next = assignShipments(store, kind, id, assignIds);
                if (kind === "bills") next = editRecord(next, kind, id, fillFromShipments(next, next.bills[id].draft));
                change(next);
                setAssignIds([]);
                setMessage(`TCNs assigned. Save the ${kind === "bills" ? "bill of lading" : kind === "routings" ? "route order" : "manifest"}.`);
              }}
            >
              Assign
            </button>
            <button onClick={() => setAssignment(false)}>Close</button>
          </footer>
        </Dialog>
      )}
      {printDialog && printDialog.page === "cbl" && (() => {
        const setOption = (patch) => setPrintDialog((current) => ({ ...current, ...patch }));
        // Print BOL: F - Final or D - Draft, Customs, and the estimated pickup date.
        return <Dialog title="Print BOL" bare onClose={() => setPrintDialog(false)} overlayClassName="shared-print-bol-overlay">
          <div className="shared-print-bol">
            <label>Print Option:<select aria-label="Print Option" value={docTitles[0] === "Final" ? "F" : "D"} onChange={(e) => setDocTitles([e.target.value === "F" ? "Final" : "Draft"])}>
              <option value="F">F - Final</option><option value="D">D - Draft</option></select></label>
            <fieldset><legend>Customs:</legend>
              {["Yes", "No"].map((v) => <label key={v}><input type="radio" name="bol-customs" aria-label={`Customs ${v}`} checked={printDialog.customs === v} onChange={() => setOption({ customs: v })} /> {v}</label>)}
            </fieldset>
            <label>Estimated Pickup Date:<CmosDateField label="Estimated Pickup Date" width="130px" value={printDialog.estimatedPickupDate || ""} onChange={(v) => setOption({ estimatedPickupDate: v })} /></label>
            <footer>
              <button onClick={() => { printFor(printDialog.kind, printDialog.id, "Commercial Bill of Lading", docTitles[0] === "Final" ? "Final" : "Draft", { printOptions: { customs: printDialog.customs, estimatedPickupDate: printDialog.estimatedPickupDate } }); setPrintDialog(false); }}>OK</button>
              <button onClick={() => setPrintDialog(false)}>Cancel</button>
            </footer>
          </div>
        </Dialog>;
      })()}
      {printDialog && printDialog.page !== "cbl" && (
        <SpeDocuments store={store} locked={locked} current={printDialog.id} now={context.now} origin={context.origin || ORIGIN} change={change}
          viewDocument={viewDocument} onClose={() => setPrintDialog(false)} />
      )}
      {closeout && (
        <Dialog
          title="Carrier Closeout and Pickup Report"
          onClose={() => setCloseout(false)}
        >
          <Fields
            fields={[field("SCAC", "scac"), field("Shipment Date", "date")]}
            values={{ scac: closeScac, date: closeDate }}
            onEdit={(k, v) =>
              k === "scac" ? setCloseScac(v) : setCloseDate(v)
            }
          />
          <p>Close out rated packages for this carrier and day?</p>
          <button
            disabled={locked}
            onClick={() => apply(closeoutCarrier(store, closeScac, closeDate))}
          >
            OK
          </button>
          <button
            onClick={() => {
              const doc = Object.values(store.documents).find(
                (d) =>
                  d.saved?.title === "Pickup report" &&
                  d.saved.scac === closeScac &&
                  d.saved.date === closeDate,
              );
              if (doc) setDocs((prev) => [...new Set([...prev, doc.id])]);
              else
                setMessage(
                  "Close out this carrier/date to create the pickup report.",
                );
            }}
          >
            Pickup Report
          </button>
          <button onClick={() => setCloseout(false)}>Close</button>
        </Dialog>
      )}
      {release && page === "air" && (
        <ReleaseAirShipment store={store} record={record} locked={locked} message={message}
          onEdit={(key, value) => change({ ...store, [kind]: { ...store[kind], [id]: { ...record, releaseDraft: { ...record.releaseDraft, [key]: value } } } })}
          onRelease={releaseDetails => {
            const result = transition(store, kind, id, "Release", { ...context, releaseDetails });
            apply(result);
            if (result.outcome.status === "success") setRelease(false);
          }}
          onClose={() => setRelease(false)} />
      )}
      {release && page === "cbl" && (
        <CblRelease record={record} locked={locked} message={message}
          onEdit={(key, value) => change({ ...store, [kind]: { ...store[kind], [id]: { ...record, releaseDraft: { ...record.releaseDraft, [key]: value } } } })}
          onRelease={releaseDetails => {
            const result = transition(store, kind, id, "Release", { ...context, releaseDetails });
            apply(result);
            if (result.outcome.status === "success") setRelease(false);
          }}
          onClose={() => setRelease(false)} />
      )}
      {release && page === "truck" && (
        <TruckRelease record={record} locked={locked} message={message}
          onEdit={(key, value) => change({ ...store, [kind]: { ...store[kind], [id]: { ...record, releaseDraft: { ...record.releaseDraft, [key]: value } } } })}
          onRelease={releaseDetails => {
            const result = transition(store, kind, id, "Release", { ...context, releaseDetails });
            apply(result);
            if (result.outcome.status === "success") setRelease(false);
          }}
          onClose={() => setRelease(false)} />
      )}
      {release && !["air", "cbl", "truck"].includes(page) && (
        <Dialog
          title={`Release ${definition.title}`}
          onClose={() => setRelease(false)}
        >
          {renderFields(
            page === "cbl"
              ? [
                  field("Carrier/Waybill Nbr", "waybill"),
                  field("Estimated Delivery Date", "deliveryDate"),
                ]
              : [
                  field("Departure Date/Time", "departureAt", "departure"),
                  field("Flight Nbr", "flightNumber"),
                ],
            { ...draft, ...record?.releaseDraft },
            (key, value) =>
              change({
                ...store,
                [kind]: {
                  ...store[kind],
                  [id]: {
                    ...record,
                    releaseDraft: { ...record.releaseDraft, [key]: value },
                  },
                },
              }),
          )}
          <p>
            Save preserves incomplete departure data. Release performs
            operational checks.
            {context.course === "cdf" && page === "air"
              ? " CDF requires JI, accepted load plan, and release within 30 minutes following departure."
              : ""}
          </p>
          <button
            disabled={locked}
            onClick={() => {
              change({
                ...store,
                [kind]: {
                  ...store[kind],
                  [id]: {
                    ...record,
                    releaseDetails: { ...record.releaseDraft },
                  },
                },
              });
              setMessage("Release details successfully saved.");
            }}
          >
            Save
          </button>
          <button
            disabled={locked}
            onClick={() => {
              const result = transition(store, kind, id, "Release", {
                ...context,
                releaseDetails: { ...record.releaseDraft },
              });
              apply(result);
              if (result.outcome.status === "success") setRelease(false);
            }}
          >
            Release
          </button>
          <button onClick={() => setRelease(false)}>Close</button>
        </Dialog>
      )}
      {consistency && (
        <Dialog title="Consistency Check Results" onClose={() => setConsistency(null)} overlayClassName="shared-consistency-overlay">
          <div className="shared-consistency">
            {consistency.missing.length > 0 && <>
              <p>TCN '{consistency.tcn}' ({consistency.placement}) is missing:</p>
              <ul aria-label="Missing data">{consistency.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              <p>Use Shipment Planning to enter data.</p>
            </>}
            {consistency.dg2 && <section aria-label="Hazardous data">
              <p>TCN '{consistency.tcn}' ({consistency.placement}) is missing DG/-2 TEMPLATE ID.</p>
              <p>Use Hazardous TCNs to enter data.</p>
            </section>}
            {consistency.misc && <section aria-label="Miscellaneous data">
              <p>No miscellaneous data found for TCN '{consistency.tcn}'</p>
              <p>Use Shipment Planning to enter data.</p>
            </section>}
            {consistency.other.length > 0 && <>
              <ul aria-label="Other edit errors">{consistency.other.map((m) => <li key={m}>{m}</li>)}</ul>
              <p>Use Shipment Planning to enter data.</p>
            </>}
            <footer><button onClick={() => setConsistency(null)}>Close</button></footer>
          </div>
        </Dialog>
      )}
      {tget && <div hidden={tget.minimized || undefined}>
        <TgetAdapter tcn={tget.tcn} tac={tget.tac}
          onComplete={() => {
            const result = prevalidateLoa(store, tget.id);
            if (result.ok) change(result.store);
            setMessage(result.ok ? <span>Funds validated for {tget.tcn}. LOA Val Status P.</span> : result.message);
            if (tget.minimized) setTget(null);
            return { ok: result.ok, details: result.ok ? "LOA prevalidated. Funds available (training)." : result.message };
          }}
          onClose={running => running ? setTget(current => current && { ...current, minimized: true }) : setTget(null)} />
      </div>}
      {confirm && (
        <Dialog title={confirm.title} onClose={() => setConfirm(null)}>
          <p>This removes the selected data and invalidates related checks.</p>
          <button
            onClick={() => {
              confirm.run();
              setConfirm(null);
            }}
          >
            Confirm
          </button>
          <button onClick={() => setConfirm(null)}>Cancel</button>
        </Dialog>
      )}
    </div>
    </PaperworkContext.Provider>
  );
}
