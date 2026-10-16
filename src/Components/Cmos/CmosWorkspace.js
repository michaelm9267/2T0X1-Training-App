import AirManifestScreen from "./AirManifestScreen";
import { AIR_MANIFEST_SAMPLES, availableForAirManifest, nextAirManifestNumber, airManifestCounterKey } from "./airManifestLogic";
import { PLANNING_STATUS_GROUPS, planningStatus, planningStatusLabel, isPlanningViewOnly, incheckedStatus, incheckPlanningRecord } from "./planningStatuses";
import { documentTcn, documentType, nonMilstripTcn } from "./tcnCreation";
import { ediForMilMode } from "./modeReference";
import HazardousTcn from "./HazardousTcn";
import { isHazardousIndicator } from "../CargoWindow/workflow";
import DetailTabs from "./DetailTabs";
import { useState, useEffect, useRef } from "react";
import FloatingWindow from "../Session/FloatingWindow";
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
} from "./model";
import {
  getQuote,
  assignQuote,
  retrieveExpressDocuments,
  closeoutCarrier,
  generateDocument,
  validateFunds,
  clearHazards,
  markDocumentPrinted,
} from "./operations";
import { parseCmosDate } from "./dateLogic";
import { Fields, Lookup, EntryDialog, Dialog } from "./controls";
import DocumentManager from "./DocumentManager";
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
  "Air Manifest": "air",
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
      origin: "FB5000", ciic: "U", secClass: "U", typeCargo: "Z", hazmat: "N - Not hazardous",
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
const defaults = {
  shipments: {
    docType: "N - Non-MILSTRIP",
    primeDIC: "TX1",
    ediMode: "AF",
    secClass: "U",
    tp: "3",
    hazmat: "N - Not hazardous",
  },
  airManifests: { complete: "No" },
  truckManifests: { equipmentOwner: "G", conveyanceMode: "9" },
  routings: { requestType: "OR", routeId: "RG", atrHours: "24" },
  bills: { currency: "USD" },
  express: { packageType: "Package", domInt: "DOM" },
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
    [opened, setOpened] = useState(!["planning", "air"].includes(initialPage)),
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
    [assignment, setAssignment] = useState(false),
    [assignIds, setAssignIds] = useState([]),
    [assignQuery, setAssignQuery] = useState(""),
    [docs, setDocs] = useState([]),
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
    record = store[kind]?.[id] || (page === "air" ? AIR_MANIFEST_SAMPLES.find(r => r.id === id) : undefined),
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
    if (key === "protectiveService") patch.dd1907 = Boolean(value);
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
  const go = (next) => {
    setPage(next);
    setTab(Object.keys(screens[next].tabs)[0]);
    setOpened(!["planning", "air"].includes(next));
    setEntry(null);
    setSelected([]);
    setMessage("");
  };
  const choose = (id) => {
    if (locked) setViewSelection((prev) => ({ ...prev, [kind]: id }));
    else change({ ...store, selection: { ...store.selection, [kind]: id } });
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
    const tcn = kind === "shipments" ? nonMilstripTcn(store, context.now) : null;
    if (kind === "shipments" && !tcn) { setMessage("All Non-MILSTRIP serials 001–999 are in use for this date."); return; }
    let next = createRecord(store, kind, {
      ...defaults[kind],
      ...(kind === "shipments"
        ? {
            tcn,
            docNbr: "",
            assetKey: context.activeAssetKey || null,
            origin: context.sourceOrigin || context.origin || "",
          }
        : {}),
      ...(kind === "express" ? { shipmentId: store.selection?.shipments } : {}),
      ...(kind === "quotes" ? { quoteTab: tab } : {}),
      ...(["airManifests", "truckManifests"].includes(kind)
        ? {
            manifestNumber: kind === "airManifests" ? manifestNumber : `TRN-TM-${Object.keys(store[kind]).length + 1}`,
            ...(kind === "airManifests" ? { mode: "F", manifestType: typeof manifestType === "string" ? manifestType : "Cargo" } : {}),
          }
        : {}),
    });
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
    if (name === "Send Request")
      return apply(transition(store, kind, id, name, context));
    if (name === "Status Request")
      return apply(transition(store, kind, id, name, context));
    if (name === "Cancel")
      return apply(transition(store, kind, id, name, context));
    if (["Abort Manifest", "Abort"].includes(name))
      return apply(transition(store, kind, id, "Abort", context));
    if (name === "Release") {
      setRelease(true);
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
        setDocTitles(["Draft"]);
        setPrintDialog({ page, kind, id });
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
    status: page === "planning" && record ? planningStatusLabel(record) : record?.status,
    totalWeight: String(total.weight),
    totalCube: total.cube.toFixed(1),
    ...(page === "spe"
      ? {
          tcn: linked.tcn || "",
          consignee: linked.destination || "",
          nomenclature: linked.description || "",
          pieces: String(total.pieces),
          weight: String(total.weight),
          cube: total.cube.toFixed(1),
          milMode: linked.milMode || "",
          ediMode: linked.ediMode || "",
          hazardous: linked.hazmat || "",
          movementDocNumber: record?.result?.tracking || "",
          estimatedCharges: record?.result?.charges || "",
          trackingNumber: record?.result?.tracking || "",
          ratedWeight: String(record?.result?.ratedWeight || ""),
          gfmId: record?.result?.gfmId || "",
          maxTransitDays: record?.result?.transitDays || "",
          closedReleasedDate:
            record?.status === "Closed out" ? draft.shipDate || "" : "",
        }
      : {}),
  };
  const readOnlyIds = [
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
  const renderPlanningColumn = (fields, rows) => rows.map((ids, i) => (
    <div className="shared-detail-field-row" key={i}>
      {renderFields(ids.map(id => fields.find(f => f.id === id)).filter(Boolean))}
      {ids.includes("acctClass") && <button disabled={locked} onClick={() => {
        const next = createRecord(store, "documents", { ownerId: id, ownerKind: kind, collection: "Accounting" });
        change(next);
        openEntry("documents", next.selection.documents, "Accounting detail", collections.Accounting);
      }}>Edit Acct Cl</button>}
      {ids.includes("loa") && <button disabled={locked} onClick={() => apply(validateFunds(store, kind, id))}>Val Funds</button>}
    </div>
  ));
  const expressRows = Object.values(store.express).filter((r) => {
    const tcn = store.shipments[r.draft.shipmentId]?.draft.tcn || "";
    return (
      match(tcn, search.speTcn) &&
      match(r.draft.scac, search.speScac) &&
      (!search.startDate ||
        parseCmosDate(r.draft.shipDate) >= parseCmosDate(search.startDate)) &&
      (!search.endDate ||
        parseCmosDate(r.draft.shipDate) <= parseCmosDate(search.endDate))
    );
  });
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
    ...(!r.sample ? totals(store, [r.id]) : {}),
    docType: (r.draft.docType || "N").slice(0, 1),
    status: planningStatus(r),
  });
  const trafficRows = planningTraffic.filter(r => !store.shipments[r.id] && !Object.values(store.shipments).some(s => s.draft.tcn === r.draft.tcn));
  const headerRows = [...Object.values(store.shipments), ...trafficRows].filter((r) =>
    Object.entries(search).every(([k, q]) =>
      k === "status" && search.tcn ? true : match(planningRow(r)[k], q),
    ),
  );
  return (
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
          <CmosDocumentation collapsed={page === "air"}>
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
            <span>
              Training simulation ·{" "}
              {context.course === "outbound" ? "Outbound" : "CDF"}
            </span>
          </div>
          </CmosDocumentation>
          <div className={page === "spe" ? "shared-spe-layout" : ""}>
            {page === "spe" && (
              <aside className="shared-spe-query">
                <Fields
                  fields={[
                    field("Start Date", "startDate"),
                    field("End Date", "endDate"),
                    field("Search TCN", "speTcn"),
                    field("Search SCAC", "speScac"),
                  ]}
                  values={queries}
                  onEdit={(k, v) => setQueries({ ...queries, [k]: v })}
                />
                <div className="shared-toolbar">
                  <button onClick={() => setSearch(queries)}>Search</button>
                  <button
                    onClick={() => {
                      setQueries({});
                      setSearch({});
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div className="shared-table-scroll">
                  <table className="shared-table">
                    <thead>
                      <tr>
                        <th>TCN</th>
                        <th>SCAC</th>
                        <th>Tracking</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expressRows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button onClick={() => choose(r.id)}>
                              {store.shipments[r.draft.shipmentId]?.draft.tcn ||
                                r.id}
                            </button>
                          </td>
                          <td>{r.draft.scac}</td>
                          <td>{r.result?.tracking}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>{expressRows.length} row(s) found.</p>
                </div>
              </aside>
            )}
            <div>
              {page === "air" ? <AirManifestScreen
                {...{ store, record, opened, locked, renderFields, total, selected, setSelected, change, setMessage, action }}
                newManifest={newRecord}
                openManifest={row => {
                  if (!row) return;
                  if (locked) setViewSelection(prev => ({ ...prev, airManifests: row.id }));
                  else if (!store.airManifests[row.id]) change(createRecord(store, "airManifests", row.draft, row.id));
                  else change({ ...store, selection: { ...store.selection, airManifests: row.id } });
                  setOpened(true); setSelected([]);
                }}
                showAssignment={category => { setAssignment(category); setAssignIds([]); setAssignQuery(""); }}
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
                        <DetailTabs
                          apply={apply}
                          {...{
                            page,
                            tab: activeTab,
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
                          ` · Pieces ${total.pieces} · Weight ${total.weight} · Cube ${total.cube.toFixed(1)}`}
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
      />
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
            change(editRecord(store, entry.kind, entry.id, { [key]: v }))
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
                change(assignShipments(store, kind, id, assignIds));
                setAssignIds([]);
                setMessage("TCNs assigned. Save the manifest.");
              }}
            >
              Assign
            </button>
            <button onClick={() => setAssignment(false)}>Close</button>
          </footer>
        </Dialog>
      )}
      {printDialog && (
        <FloatingWindow
          className="paper-sheet shared-print-options"
          title={
            printDialog.page === "cbl"
              ? "Print Commercial Bill of Lading"
              : "Print Small Package Express Documents"
          }
          onClose={() => setPrintDialog(false)}
        >
          {printDialog.page === "cbl" ? (
            <>
              <label>
                Print version
                <select
                  aria-label="Print version"
                  value={docTitles[0] || "Draft"}
                  onChange={(e) => setDocTitles([e.target.value])}
                >
                  <option>Draft</option>
                  <option>Final</option>
                </select>
              </label>
              <Fields
                fields={[field("Estimated Pickup Date", "estimatedPickupDate")]}
                values={store[printDialog.kind]?.[printDialog.id]?.draft || {}}
                locked={locked}
                onEdit={(key, value) =>
                  change(
                    editRecord(store, printDialog.kind, printDialog.id, {
                      [key]: value,
                    }),
                  )
                }
              />
              <button
                onClick={() => {
                  printFor(
                    printDialog.kind,
                    printDialog.id,
                    "Commercial Bill of Lading",
                    docTitles[0] === "Final" ? "Final" : "Draft",
                  );
                }}
              >
                OK
              </button>
            </>
          ) : (
            <>
              {["Carrier label", "Commercial invoice", "Shipment receipt"].map(
                (title) => (
                  <label key={title}>
                    <input
                      type="checkbox"
                      checked={docTitles.includes(title)}
                      onChange={(e) =>
                        setDocTitles((prev) =>
                          e.target.checked
                            ? [...prev, title]
                            : prev.filter((x) => x !== title),
                        )
                      }
                    />
                    {title}
                  </label>
                ),
              )}
              <button
                disabled={locked}
                onClick={() =>
                  apply(
                    retrieveExpressDocuments(store, printDialog.id, docTitles),
                  )
                }
              >
                Retrieve
              </button>
              <h4>Available documents</h4>
              {Object.values(store.documents)
                .filter(
                  (d) => d.saved?.ownerId === printDialog.id && d.saved.title,
                )
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      if (!locked) apply(markDocumentPrinted(store, d.id));
                      viewDocument(d.id);
                    }}
                  >
                    Print {d.saved.title}
                  </button>
                ))}
              <button
                onClick={() => {
                  setCloseScac(
                    store[printDialog.kind]?.[printDialog.id]?.draft.scac || "",
                  );
                  setCloseDate(
                    store[printDialog.kind]?.[printDialog.id]?.draft.shipDate ||
                      "",
                  );
                  setCloseout(true);
                }}
              >
                Pickup Report
              </button>
            </>
          )}
          <button onClick={() => setPrintDialog(false)}>Close</button>
        </FloatingWindow>
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
      {release && (
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
                  field("Departure Date/Time", "departureAt"),
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
              ? " CDF requires JI, accepted load plan, and the 30-minute training departure window."
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
  );
}
