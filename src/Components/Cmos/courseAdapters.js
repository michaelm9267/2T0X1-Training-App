import { ediForMilMode } from "./modeReference";
import {
  createCmosStore,
  createRecord,
  saveRecord,
  normalizeCmosStore,
  data,
  piecesFor,
  totals,
  currentCheck,
  assignShipments,
  deleteRecord,
  documentCurrent,
  dependencyBasis,
} from "./model";
import { manifestFields } from "../CargoWindow/workflow";
import { cargoKind } from "../CdfCmos/trainingData";
import { manifestBasis } from "../CdfCmos/manifestLogic";
import { stepForMode } from "../Outbound/outboundLogic";
import { planningFields } from "../Outbound/cmosLogic";
const cdfHeader = (r) => ({
  hazmat: "N - Not hazardous",
  ...r,
  poe: r.poe ?? r.apoe ?? "",
  pod: r.pod ?? r.apod ?? "",
  milMode: r.milMode || "F",
  tac: r.tac || "TRN1",
  ciic: r.ciic || "U",
  primeDic: r.primeDic || "TX1",
  ediMode: r.ediMode || ediForMilMode(r.milMode || "F"),
  secClass: r.secClass || "U",
  tp: r.tp || "3",
});
const outHeader = (r) => ({
  ...r,
  description: r.description ?? r.nomen ?? "",
  origin: r.origin ?? r.consignor ?? "",
  destination: r.destination ?? r.consignee ?? "",
  hazmat: r.hazmat ?? r.hazInd ?? "N - Not hazardous",
});
function appendLegacyPiece(store, sid, p, key) {
  let next = createRecord(store, "pieces", {
    ...p,
    shipmentId: sid,
    assetKey: key,
    number: p.number || "1",
  });
  return saveRecord(next, "pieces", next.selection.pieces);
}
export function migrateCdfCmos(session) {
  if (session.cdfCmos?.sharedCmos)
    return normalizeCmosStore(session.cdfCmos.sharedCmos);
  let store = createCmosStore();
  const keys =
    session.pieceKeys ||
    Object.keys(session.shipments).slice(0, session.pieceCount);
  for (const key of keys) {
    const e = session.exercises[key],
      saved = e.shipmentRecord || e.manifestRecord,
      draft = e.manifestDraft || {};
    store = createRecord(store, "shipments", {
      ...cdfHeader({ ...saved, ...draft }),
      assetKey: key,
      sourceTcn: manifestFields(session.shipments[key])[0].expected,
      tcn:
        draft.tcn ??
        saved?.tcn ??
        manifestFields(session.shipments[key])[0].expected,
      docType: "I - Increment",
      palletId: draft.palletId || saved?.palletId || cargoKind(session.shipments[key]).palletId || "",
    });
    const sid = store.selection.shipments;
    if (saved) {
      store.shipments[sid] = {
        ...store.shipments[sid],
        saved: {
          ...cdfHeader(saved),
          assetKey: key,
          sourceTcn: manifestFields(session.shipments[key])[0].expected,
          docType: "I - Increment",
          palletId: saved.palletId || cargoKind(session.shipments[key]).palletId || "",
        },
        revision: saved.revision || 1,
        status: "Saved",
        legacyAccepted: Boolean(e.manifestAccepted),
      };
      store = appendLegacyPiece(
        store,
        sid,
        {
          weight: saved.weight,
          length: saved.length,
          width: saved.width,
          height: saved.height,
          typePack: saved.typePack || "PC",
        },
        key,
      );
    }
    for (const h of draft.hazardRecords || saved?.hazardRecords || []) {
      store = createRecord(store, "hazards", { ...h, shipmentId: sid });
      if ((saved?.hazardRecords || []).some((old) => old.id === h.id))
        store = saveRecord(store, "hazards", store.selection.hazards);
    }
    if (saved)
      store.shipments[sid] = {
        ...store.shipments[sid],
        legacyAccepted: Boolean(e.manifestAccepted),
      };
    for (const [hid, h] of Object.entries(e.hazardDrafts || {}))
      if (
        hid === "new" ||
        !(saved?.hazardRecords || []).some((x) => x.id === hid)
      )
        store = createRecord(store, "hazards", { ...h, shipmentId: sid });
  }
  const old = session.cdfCmos;
  if (old?.manifest) {
    const assigned = old.assignments.flatMap((a) => a.pieceKeys);
    store = createRecord(store, "airManifests", {
      ...old.manifest,
      manifestNumber: old.manifest.number,
      shipmentIds: Object.values(store.shipments)
        .filter((r) => assigned.includes(r.draft.assetKey))
        .map((r) => r.id),
    });
    const id = store.selection.airManifests;
    store = saveRecord(store, "airManifests", id);
    const r = store.airManifests[id];
    store.airManifests[id] = {
      ...r,
      check:
        old.checkedRevision === old.revision
          ? {
              revision: r.revision,
              passed: true,
              errors: [],
              provenance: "legacy edit check",
            }
          : null,
      printRevision:
        old.manifestPrintRevision === old.revision ? r.revision : null,
      pullRevision: old.pullSheetRevision === old.revision ? r.revision : null,
      legacyState: true,
    };
  }
  store.selection.shipments =
    Object.values(store.shipments).find(
      (r) => r.draft.assetKey === session.scenarioId,
    )?.id || Object.keys(store.shipments)[0];
  return store;
}
export function migrateOutboundCmos(session) {
  if (session.sharedCmos) return normalizeCmosStore(session.sharedCmos);
  let store = createCmosStore();
  for (const shipment of session.shipments) {
    const e = session.exercises[shipment.key],
      r = e.cmos?.record;
    const advance = planningFields(shipment);
    const initial = Object.fromEntries(
      Object.entries(advance)
        .filter(([, v]) => v.advance || v.preset)
        .map(([k, v]) => [k, v.expected ?? ""]),
    );
    store = createRecord(store, "shipments", {
      ...outHeader(r?.draft || initial),
      assetKey: shipment.key,
      docType: r?.draft?.docType || initial.docType,
      tcn: r?.draft?.tcn ?? shipment.tcn,
      advance: Boolean(shipment.advance),
      status: r?.saved ? "PI" : "00",
    });
    const sid = store.selection.shipments;
    if (r?.saved) {
      store.shipments[sid] = {
        ...store.shipments[sid],
        saved: { ...store.shipments[sid].draft },
        revision: 1,
        status: "Saved",
        legacyAccepted: true,
      };
    }
    for (const p of r?.pieces || [])
      store = appendLegacyPiece(store, sid, p, shipment.key);
    if (r?.saved)
      store.shipments[sid] = { ...store.shipments[sid], legacyAccepted: true };
    if (e.spe) {
      store = createRecord(store, "express", {
        ...e.spe.draft,
        shipmentId: sid,
      });
      const eid = store.selection.express;
      store = saveRecord(store, "express", eid);
      store.express[eid] = {
        ...store.express[eid],
        result: e.spe.rated
          ? { ...e.spe.result, state: "success", revision: 1 }
          : null,
        status: e.spe.rated ? "Response received" : "Saved",
      };
    }
  }
  store.selection.shipments =
    Object.values(store.shipments).find(
      (r) => r.draft.assetKey === session.selected,
    )?.id || Object.keys(store.shipments)[0];
  return store;
}
export function legacyCdfRecord(store, r, saved = false) {
  const d = data(r, saved),
    ps = piecesFor(store, [r.id], saved),
    t = totals(store, [r.id], saved),
    first = data(ps[0], saved);
  const h = Object.values(store.hazards)
    .filter((h) => data(h, saved).shipmentId === r.id)
    .map((h) => ({ ...data(h, saved), id: h.id }));
  return {
    ...d,
    apoe: d.poe,
    apod: d.pod,
    pieces: t.pieces || d.pieces || "",
    weight: t.weight || first.weight || "",
    length: first.length || "",
    width: first.width || "",
    height: first.height || "",
    hazmat: d.hazmat?.startsWith("O")
      ? "H - Hazardous material"
      : d.hazmat?.startsWith("N")
        ? "N - Non-hazardous"
        : d.hazmat,
    hazardRecords: h,
    revision: r.revision,
    palletId: null,
  };
}
const eligible = (r) =>
  currentCheck(r) ||
  (r?.legacyAccepted && JSON.stringify(r.draft) === JSON.stringify(r.saved));
export function assetKeysFor(store, r) {
  const keys = piecesFor(store, [r.id])
    .map((p) => p.draft.assetKey)
    .filter(Boolean);
  return [...new Set([...keys, r.draft.assetKey].filter(Boolean))];
}
export function projectCdf(store, session) {
  const exercises = { ...session.exercises };
  for (const r of Object.values(store.shipments)) {
    for (const key of assetKeysFor(store, r)) {
      const e = exercises[key];
      if (!e) continue;
      exercises[key] = {
        ...e,
        manifestDraft: legacyCdfRecord(store, r),
        shipmentRecord: r.saved
          ? legacyCdfRecord(store, r, true)
          : e.shipmentRecord,
        sharedManaged: true,
      };
    }
  }
  for (const [key, e] of Object.entries(exercises))
    if (
      e.sharedManaged &&
      !Object.values(store.shipments).some((r) =>
        assetKeysFor(store, r).includes(key),
      )
    )
      exercises[key] = {
        ...e,
        manifestAccepted: false,
        shipmentRecord: null,
        manifestRecord: null,
        manifestDraft: {},
      };
  const active =
      store.airManifests[store.selection.airManifests] ||
      Object.values(store.airManifests)[0],
    old = session.cdfCmos;
  const mistakes = [...(old.mistakes || [])];
  store.history.forEach((event, index) => {
    if (
      event.status === "Edits failed" &&
      !mistakes.some((m) => m.sharedEvent === index)
    )
      mistakes.push({
        sharedEvent: index,
        stage: "CMOS",
        kind: "CMOS",
        detail: (event.errors || ["CMOS edit check failed."]).join(" "),
        reference: "Supplied CMOS training guides",
      });
  });
  let state = { ...old, mistakes, sharedCmos: store };
  if (active?.saved) {
    const assigned = (active.saved.shipmentIds || [])
      .map((id) => store.shipments[id])
      .filter(
        (r) =>
          r &&
          eligible(r) &&
          assetKeysFor(store, r).some((key) => exercises[key]),
      );
    const assignedKeys = [
      ...new Set(assigned.flatMap((r) => assetKeysFor(store, r))),
    ].filter(
      (key) =>
        exercises[key] &&
        Object.values(store.shipments)
          .filter((r) => assetKeysFor(store, r).includes(key))
          .every((r) => assigned.some((a) => a.id === r.id)),
    );
    const assignments = assignedKeys.map((key) => {
      const k = cargoKind(session.shipments[key]);
      return { id: k.palletId || key, kind: k.kind, pieceKeys: [key] };
    });
    const manifest = {
      ...active.saved,
      number: active.saved.manifestNumber || active.id,
      origin: active.saved.origin || "F00001",
    };
    const revision = active.revision;
    state = {
      ...state,
      manifest,
      headerDraft: active.draft,
      aborted: active.status === "Aborted",
      assignments,
      revision,
      checkedRevision: currentCheck(active) ? revision : null,
      manifestPrintRevision:
        active.printRevision === revision &&
        (!active.printBasis ||
          active.printBasis ===
            dependencyBasis(store, "airManifests", active.id))
          ? revision
          : null,
      pullSheetRevision:
        active.pullRevision === revision &&
        (!active.pullBasis ||
          active.pullBasis ===
            dependencyBasis(store, "airManifests", active.id))
          ? revision
          : null,
    };
    for (const [key, e] of Object.entries(exercises))
      exercises[key] = {
        ...e,
        manifestAccepted: assignedKeys.includes(key),
        manifestRecord: assignedKeys.includes(key)
          ? e.shipmentRecord
          : e.manifestRecord,
      };
    state.basis = manifestBasis(state, { ...session, exercises });
  }
  if (!active && old.manifest) {
    state = {
      ...state,
      manifest: null,
      headerDraft: {},
      assignments: [],
      revision: old.revision + 1,
      checkedRevision: null,
      pullSheetRevision: null,
      manifestPrintRevision: null,
      basis: null,
    };
    for (const [key, e] of Object.entries(exercises))
      exercises[key] = { ...e, manifestAccepted: false };
  }
  return { exercises, state };
}
export function projectOutbound(store, exercises) {
  const next = { ...exercises };
  for (const [key, e] of Object.entries(next))
    if (
      e.sharedManaged &&
      !Object.values(store.shipments).some((r) =>
        assetKeysFor(store, r).includes(key),
      )
    )
      next[key] = {
        ...e,
        planningChecked: false,
        milMode: null,
        mode: null,
        spe: null,
        cmos: { ...e.cmos, record: null },
        printed: { ...e.printed, msl: false, carrierLabel: false },
        labels: { ...e.labels, msl: false, carrier: false },
        forms: {
          ...e.forms,
          surface: { ...e.forms.surface, accepted: false },
          amc: { ...e.forms.amc, accepted: false },
        },
      };
  for (const r of Object.values(store.shipments)) {
    for (const key of assetKeysFor(store, r)) {
      const e = next[key];
      if (!e) continue;
      const d = data(r),
        p = piecesFor(store, [r.id]).map((p) => p.draft);
      const related = Object.values(store.shipments).filter((x) =>
        assetKeysFor(store, x).includes(key),
      );
      const checked = related.every(eligible);
      const spe = Object.values(store.express).find(
        (x) => x.draft.shipmentId === r.id,
      );
      const bills = Object.values(store.bills).filter((b) =>
        b.saved?.shipmentIds?.includes(r.id),
      );
      const trucks = Object.values(store.truckManifests).filter((b) =>
        b.saved?.shipmentIds?.includes(r.id),
      );
      const air = Object.values(store.airManifests).filter((b) =>
        b.saved?.shipmentIds?.includes(r.id),
      );
      const printed = Object.values(store.documents).filter(
        (doc) =>
          doc.saved?.printed &&
          doc.saved.shipmentIds?.includes(r.id) &&
          documentCurrent(store, doc),
      );
      next[key] = {
        ...e,
        sharedManaged: true,
        planningChecked: checked,
        milMode: checked ? d.milMode : null,
        mode: checked ? stepForMode(d.milMode) : null,
        cmos: {
          ...e.cmos,
          record: {
            ...e.cmos?.record,
            draft: {
              ...d,
              nomen: d.description,
              consignor: d.origin,
              consignee: d.destination,
              hazInd: d.hazmat,
            },
            pieces: p,
            saved: Boolean(r.saved),
            feedback: r.saved ? "Saved; run Edit TCN to check." : "",
          },
        },
        spe: spe
          ? {
              draft: spe.draft,
              rated: spe.result?.state === "success",
              result: spe.result,
            }
          : null,
        printedBasis: {
          msl:
            printed.find((x) => x.saved.title === "Military shipping label")
              ?.saved.basis || (!e.sharedManaged ? e.printedBasis?.msl : null),
          carrierLabel:
            printed.find((x) => x.saved.title === "Carrier label")?.saved
              .basis ||
            (!e.sharedManaged ? e.printedBasis?.carrierLabel : null),
        },
        labels: {
          ...e.labels,
          msl: Boolean(
            e.labels?.msl &&
            (!e.sharedManaged ||
              printed.some(
                (x) =>
                  x.saved.title === "Military shipping label" &&
                  x.saved.basis === e.labelBasis?.msl,
              )),
          ),
          carrier: Boolean(
            e.labels?.carrier &&
            (!e.sharedManaged ||
              printed.some(
                (x) =>
                  x.saved.title === "Carrier label" &&
                  x.saved.basis === e.labelBasis?.carrier,
              )),
          ),
        },
        printed: {
          ...e.printed,
          msl:
            printed.some((x) => x.saved.title === "Military shipping label") ||
            (!e.sharedManaged && e.printed?.msl),
          carrierLabel:
            printed.some((x) => x.saved.title === "Carrier label") ||
            (!e.sharedManaged && e.printed?.carrierLabel),
        },
        forms: {
          ...e.forms,
          surface: {
            ...e.forms.surface,
            accepted: bills.some(
              (b) =>
                b.status === "Released" && b.releaseRevision === b.revision,
            ),
          },
          amc: {
            ...e.forms.amc,
            accepted: [...trucks, ...air].some(
              (b) =>
                b.status === "Released" && b.releaseRevision === b.revision,
            ),
          },
        },
      };
    }
  }
  return next;
}

export function withdrawCdfAssignments(store, assetKeys) {
  if (!store) return store;
  let next = store;
  const ids = Object.values(store.shipments)
    .filter((r) =>
      assetKeysFor(store, r).some((key) => assetKeys.includes(key)),
    )
    .map((r) => r.id);
  for (const r of Object.values(store.airManifests)) {
    if (r.draft.shipmentIds?.some((id) => ids.includes(id))) {
      next = assignShipments(next, "airManifests", r.id, ids, true);
      next = saveRecord(next, "airManifests", r.id);
    }
  }
  return next;
}

export function resetOutboundShipment(store, key, shipment, exercise) {
  let next = store;
  for (const r of Object.values(store.shipments))
    if (r.draft.assetKey === key) next = deleteRecord(next, "shipments", r.id);
  const fresh = migrateOutboundCmos({
    shipments: [shipment],
    exercises: { [key]: exercise },
    selected: key,
  });
  return createRecord(
    next,
    "shipments",
    Object.values(fresh.shipments)[0].draft,
  );
}

export function resetCdfShipment(store, key, scenario) {
  let next = withdrawCdfAssignments(store, [key]);
  for (const r of Object.values(next.shipments))
    if (r.draft.assetKey === key) next = deleteRecord(next, "shipments", r.id);
  return createRecord(next, "shipments", {
    ...cdfHeader({}),
    docType: "I - Increment",
    tcn: manifestFields(scenario)[0].expected,
    sourceTcn: manifestFields(scenario)[0].expected,
    assetKey: key,
  });
}
