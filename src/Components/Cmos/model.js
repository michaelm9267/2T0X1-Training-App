import { eligibleForAirManifest, airAssignmentIds, refreshAirManifestSample } from "./airManifestLogic";
import { documentType } from "./tcnCreation";
import { parseCmosDate, parseEasternDateTime } from "./dateLogic";
// Serializable shared CMOS records. Saving is deliberately independent of checking.
export const KINDS = [
  "shipments",
  "pieces",
  "hazards",
  "routings",
  "airManifests",
  "truckManifests",
  "bills",
  "express",
  "quotes",
  "documents",
];
const clone = (x) => JSON.parse(JSON.stringify(x));
export const createCmosStore = () => ({
  version: 1,
  ...Object.fromEntries(KINDS.map((k) => [k, {}])),
  counters: {},
  selection: {},
  history: [],
});
export const data = (record, saved = false) =>
  saved ? record?.saved || {} : record?.draft || {};
export const currentCheck = (r) =>
  Boolean(
    r?.check?.passed &&
    r.check.revision === r.revision &&
    JSON.stringify(r.draft) === JSON.stringify(r.saved),
  );
export function createRecord(store, kind, draft = {}, id) {
  if (!KINDS.includes(kind)) return store;
  let n = Math.max(1, store.counters?.[kind] || 1);
  while (store[kind][`${kind}-${n}`]) n++;
  id = id || `${kind}-${n}`;
  if (store[kind][id]) return store;
  const next = {
    ...store,
    counters: {
      ...store.counters,
      [kind]: Math.max(n + 1, Number(id.match(/-(\d+)$/)?.[1] || 0) + 1),
    },
    [kind]: {
      ...store[kind],
      [id]: {
        id,
        draft: clone(draft),
        saved: null,
        revision: 0,
        check: null,
        status: "Draft",
        result: null,
      },
    },
    selection: { ...store.selection, [kind]: id },
  };
  return ["pieces", "hazards"].includes(kind) || draft.collection
    ? invalidate(next, kind, id)
    : next;
}
function invalidate(store, kind, id) {
  const next = { ...store };
  const owner =
    kind === "documents" && store.documents[id]?.draft.collection
      ? store.documents[id].draft.ownerId
      : null;
  const affected = new Set(
    kind === "shipments"
      ? [id]
      : ["pieces", "hazards"].includes(kind)
        ? [store[kind][id]?.draft.shipmentId]
        : [],
  );
  const dependentQuotes = new Set(
    kind === "quotes"
      ? [id]
      : kind === "documents" &&
          store.documents[id]?.draft.ownerKind === "quotes"
        ? [owner]
        : [],
  );
  for (const q of Object.values(store.quotes))
    if (affected.has(q.draft.shipmentId)) dependentQuotes.add(q.id);
  for (const k of KINDS) {
    next[k] = { ...store[k] };
    for (const [key, r] of Object.entries(next[k])) {
      if (
        (k === kind && key === id) ||
        key === owner ||
        dependentQuotes.has(r.draft.quoteId) ||
        affected.has(key) ||
        r.draft.shipmentIds?.some((x) => affected.has(x)) ||
        affected.has(r.draft.shipmentId)
      )
        next[k][key] = {
          ...r,
          check: null,
          result: null,
          legacyAccepted: false,
          printRevision: null,
          printBasis: null,
          finalPrintRevision: null,
          finalPrintBasis: null,
          pullRevision: null,
          pullBasis: null,
          releaseRevision: null,
          retrieved: false,
          status:
            r.status === "Released"
              ? "Correction required"
              : r.status === "Draft"
                ? "Draft"
                : "Saved",
        };
    }
  }
  return next;
}
export function editRecord(store, kind, id, patch) {
  const r = store[kind]?.[id];
  if (!r) return store;
  const draft = { ...r.draft, ...clone(patch) };
  if (JSON.stringify(draft) === JSON.stringify(r.draft)) return store;
  const next = invalidate(store, kind, id);
  return {
    ...next,
    [kind]: { ...next[kind], [id]: { ...next[kind][id], draft } },
  };
}
export function saveRecord(store, kind, id) {
  const r = store[kind]?.[id];
  if (!r) return store;
  const changed = JSON.stringify(r.saved) !== JSON.stringify(r.draft);
  const next = changed ? invalidate(store, kind, id) : store;
  return {
    ...next,
    [kind]: {
      ...next[kind],
      [id]: {
        ...next[kind][id],
        saved: clone(r.draft),
        revision: r.revision + (changed ? 1 : 0),
        status: r.status === "Draft" ? "Saved" : next[kind][id].status,
      },
    },
    history: changed
      ? [
          ...store.history,
          {
            kind,
            id,
            action: "Save",
            revision: r.revision + 1,
            status: "Saved",
            date: new Date().toISOString(),
            user: "TRAINEE",
          },
        ]
      : store.history,
  };
}
export function piecesFor(store, ids, saved = false) {
  return Object.values(store.pieces).filter((p) =>
    ids.includes(data(p, saved).shipmentId),
  );
}
export function totals(store, ids, saved = false) {
  return piecesFor(store, ids, saved).reduce(
    (t, p) => {
      const d = data(p, saved);
      return {
        pieces: t.pieces + 1,
        weight: t.weight + (Number(d.weight) || 0),
        cube:
          t.cube +
          ((Number(d.length) || 0) *
            (Number(d.width) || 0) *
            (Number(d.height) || 0)) /
            1728,
      };
    },
    { pieces: 0, weight: 0, cube: 0 },
  );
}
const required = {
  shipments: ["tcn", "description", "milMode", "origin", "destination", "tac"],
  pieces: ["shipmentId", "weight", "length", "width", "height", "typePack"],
  hazards: ["shipmentId", "piece", "templateId", "certifier"],
  routings: ["requestType", "atrHours", "pickupEarliest", "deliveryLatest"],
  airManifests: ["mission", "dsoeId", "chalk", "pod", "destination"],
  truckManifests: ["dsoeId", "chalk", "conveyanceMode", "equipmentType"],
  bills: ["scac", "currency", "estimatedCharges"],
  express: ["scac", "service", "shipDate", "packageType"],
  quotes: [],
};
export function validationErrors(store, kind, id, context = {}) {
  const r = store[kind]?.[id],
    d = data(r, true),
    errors = [];
  if (!r?.saved) errors.push("Save this record before running a check.");
  if (r && JSON.stringify(r.draft) !== JSON.stringify(r.saved))
    errors.push("Save your changes before running a check.");
  for (const field of required[kind] || [])
    if (!String(d[field] ?? "").trim()) errors.push(`Required: ${field}`);
  if (kind === "pieces")
    for (const f of ["weight", "length", "width", "height"])
      if (!(Number(d[f]) > 0)) errors.push(`${f} must be greater than zero.`);
  if (kind === "shipments") {
    if (documentType(d.docType) === "M" && !String(d.docNbr || "").trim()) errors.push("Required: docNbr");
    if (!piecesFor(store, [id], true).length)
      errors.push("At least one saved piece is required.");
    for (const p of piecesFor(store, [id], true))
      errors.push(...validationErrors(store, "pieces", p.id));
    if (["A", "W"].includes(d.atcmdType) && !d.t9Remarks)
      errors.push("T-9 remarks are required.");
    if (d.hazmat && !d.hazmat.startsWith("N")) {
      const hs = Object.values(store.hazards).filter(
        (h) => h.saved?.shipmentId === id,
      );
      if (!hs.length) errors.push("DG2 hazardous data is required.");
      hs.forEach((h) =>
        errors.push(...validationErrors(store, "hazards", h.id)),
      );
    }
    const duplicate = Object.values(store.shipments).some(
      (x) => x.id !== id && x.saved?.tcn && x.saved.tcn === d.tcn,
    );
    if (duplicate) errors.push("TCN already belongs to another shipment.");
  }
  if (
    ["routings", "airManifests", "truckManifests", "bills", "express"].includes(
      kind,
    )
  ) {
    const ids = d.shipmentIds || [d.shipmentId].filter(Boolean);
    if (!ids.length) errors.push("Assign at least one TCN.");
    if (kind === "airManifests") {
      const eligible = airAssignmentIds(store, id, ids);
      if (ids.some(sid => !eligible.includes(sid))) errors.push("Air Manifest cargo is ineligible or assigned to another manifest. Every pallet member must have MIL Mode F.");
      if (eligible.some(sid => !ids.includes(sid))) errors.push("Assign every shipment in a pallet together.");
    }
    ids.forEach((sid) => {
      if (kind === "airManifests" && !eligibleForAirManifest(store.shipments[sid])) errors.push(`Shipment ${store.shipments[sid]?.draft.tcn || sid} must have MIL Mode F in Shipment Planning for Air Manifest assignment.`);
      if (
        !currentCheck(store.shipments[sid]) &&
        !(
          store.shipments[sid]?.legacyAccepted &&
          JSON.stringify(store.shipments[sid].draft) ===
            JSON.stringify(store.shipments[sid].saved)
        )
      )
        errors.push(
          `Shipment ${store.shipments[sid]?.draft.tcn || sid} requires a current Edit TCN check.`,
        );
    });
  }
  if (kind === "hazards" && !d.page2?.properShippingName)
    errors.push("Proper shipping name is required.");
  if (kind === "routings") {
    if (
      !Object.values(store.documents).some(
        (x) =>
          x.saved?.ownerId === id &&
          x.saved.collection === "Equip Load Plan" &&
          String(x.saved.equipmentType || "").trim() &&
          JSON.stringify(x.draft) === JSON.stringify(x.saved),
      )
    )
      errors.push("Add equipment to the load plan.");
    for (const f of [
      "pickupEarliest",
      "pickupLatest",
      "deliveryEarliest",
      "deliveryLatest",
    ])
      if (d[f] && parseEasternDateTime(d[f]) === null)
        errors.push(`${f} must be a valid Eastern date/time.`);
    const pickup = parseEasternDateTime(d.pickupEarliest),
      delivery = parseEasternDateTime(d.deliveryLatest);
    if (pickup !== null && delivery !== null && pickup > delivery)
      errors.push("Pickup must precede delivery.");
    if (!(Number(d.atrHours) > 0))
      errors.push("ATR carrier response hours must be greater than zero.");
  }
  if (kind === "express" && d.quoteId) {
    const q = store.quotes[d.quoteId];
    if (
      !q?.result ||
      q.result.revision !== q.revision ||
      JSON.stringify(q.draft) !== JSON.stringify(q.saved)
    )
      errors.push("Get and assign a current carrier quote.");
  }
  if (kind === "express" && d.shipDate && parseCmosDate(d.shipDate) === null)
    errors.push("Shipment date must be a valid CMOS date.");
  if (kind === "express" && d.domInt === "INT")
    for (const f of ["shipmentValue", "harmonizedCode"])
      if (!d[f]) errors.push(`International shipment requires ${f}.`);
  if (kind === "express" && d.domInt === "INT" && !d.itn && !d.eeiExemptionCode)
    errors.push(
      "Enter ITN or an EEI exemption code for this international shipment.",
    );
  if (context.validateMovement && r)
    errors.push(...context.validateMovement(kind, r, store));
  if (context.validateShipment && kind === "shipments")
    errors.push(...context.validateShipment(d, id, store));
  return [...new Set(errors)];
}
export function checkRecord(store, kind, id, context = {}) {
  const r = store[kind]?.[id];
  if (!r) return store;
  const errors = validationErrors(store, kind, id, context);
  return {
    ...store,
    [kind]: {
      ...store[kind],
      [id]: {
        ...r,
        check: { revision: r.revision, passed: !errors.length, errors },
        status: errors.length ? "Edits failed" : "Passed Edits",
      },
    },
    history: [
      ...store.history,
      {
        kind,
        id,
        action: "Edit Check",
        revision: r.revision,
        status: errors.length ? "Edits failed" : "Passed Edits",
        errors,
        date: new Date().toISOString(),
        user: "TRAINEE",
      },
    ],
  };
}
export function assignShipments(store, kind, id, ids, remove = false) {
  const r = store[kind]?.[id];
  if (!r) return store;
  const prev = r.draft.shipmentIds || [];
  const valid = kind === "airManifests" ? airAssignmentIds(store, id, ids, remove) : ids.filter(x => store.shipments[x]);
  return editRecord(store, kind, id, {
    shipmentIds: remove
      ? prev.filter((x) => !valid.includes(x))
      : [...new Set([...prev, ...valid])],
  });
}
export function deriveShipment(store, id, action, selectedPieces = []) {
  const original = store.shipments[id];
  if (!original) return store;
  let next = createRecord(store, "shipments", {
    ...original.draft,
    tcn: "",
    assetKey: null,
    parentId: id,
    derivation: action,
  });
  const newId = next.selection.shipments;
  for (const p of piecesFor(store, [id])) {
    if (["Partial", "Split"].includes(action)) {
      if (selectedPieces.includes(p.id)) {
        next = editRecord(next, "pieces", p.id, { shipmentId: newId });
        if (p.saved)
          next.pieces[p.id] = {
            ...next.pieces[p.id],
            saved: { ...p.saved, shipmentId: newId },
            revision: p.revision + 1,
          };
        for (const h of Object.values(next.hazards))
          if (
            h.draft.shipmentId === id &&
            (h.draft.pieceId === p.id ||
              String(h.draft.piece) === String(p.draft.number))
          ) {
            next = editRecord(next, "hazards", h.id, { shipmentId: newId });
            if (h.saved)
              next.hazards[h.id] = {
                ...next.hazards[h.id],
                saved: { ...h.saved, shipmentId: newId },
                revision: h.revision + 1,
              };
          }
      }
    } else
      next = createRecord(next, "pieces", {
        ...p.draft,
        shipmentId: newId,
        assetKey: null,
        sourcePieceId: p.id,
      });
  }
  if (["Partial", "Split"].includes(action) && !piecesFor(next, [id]).length) {
    next = editRecord(next, "shipments", id, { assetKey: null });
  }
  return next;
}
export function deleteRecord(store, kind, id) {
  const next = invalidate(store, kind, id);
  next[kind] = { ...next[kind] };
  delete next[kind][id];
  if (kind === "shipments") {
    for (const k of ["pieces", "hazards", "express"])
      next[k] = Object.fromEntries(
        Object.entries(next[k]).filter(([, r]) => r.draft.shipmentId !== id),
      );
    for (const k of ["routings", "airManifests", "truckManifests", "bills"])
      for (const r of Object.values(next[k]))
        if (r.draft.shipmentIds?.includes(id))
          next[k][r.id] = {
            ...r,
            draft: {
              ...r.draft,
              shipmentIds: r.draft.shipmentIds.filter((x) => x !== id),
            },
            saved: r.saved
              ? {
                  ...r.saved,
                  shipmentIds: r.saved.shipmentIds?.filter((x) => x !== id),
                }
              : null,
          };
  }
  next.selection = { ...next.selection, [kind]: null };
  return next;
}
export function transition(store, kind, id, action, context = {}) {
  const r = store[kind]?.[id];
  if (!r)
    return {
      store,
      outcome: { status: "failed", messages: ["Select a record."] },
    };
  let errors = [];
  const releaseDetails = { ...r.releaseDetails, ...context.releaseDetails };
  const operationalDraft = { ...r.draft, ...releaseDetails };
  if (["Release", "Send Request", "Final Print"].includes(action)) {
    if (!currentCheck(r))
      errors.push("Run a successful current edit check first.");
    errors.push(...validationErrors(store, kind, id, context));
  }
  if (action === "Release") {
    if (!operationalDraft.departureAt && kind !== "bills")
      errors.push("Enter departure date/time.");
    if (
      kind === "bills" &&
      (!operationalDraft.waybill || !operationalDraft.deliveryDate)
    )
      errors.push("Waybill and estimated delivery date are required.");
    if (
      ["airManifests", "truckManifests", "bills"].includes(kind) &&
      (r.printRevision !== r.revision ||
        (r.printBasis && r.printBasis !== dependencyBasis(store, kind, id)) ||
        (kind === "bills" &&
          (r.finalPrintRevision !== r.revision ||
            r.finalPrintBasis !== dependencyBasis(store, kind, id))))
    )
      errors.push("Print the current movement document before release.");
    if (context.releaseErrors)
      errors.push(
        ...context.releaseErrors(
          kind,
          { ...r, draft: operationalDraft },
          store,
        ),
      );
  }
  if (errors.length)
    return {
      store,
      outcome: { status: "failed", messages: [...new Set(errors)] },
    };
  const d = r.draft;
  let result = r.result,
    status = r.status;
  if (action === "Send Request") {
    status = "Pending";
    result = { state: "pending", revision: r.revision };
  }
  if (action === "Status Request" || action === "Receive Response") {
    if (!result)
      return {
        store,
        outcome: { status: "failed", messages: ["Send a request first."] },
      };
    status = "Response received";
    result = {
      ...result,
      state: context.simulateFailure ? "failed" : "success",
      tracking: `TRN${id.replace(/\D/g, "").padStart(12, "0")}`,
      charges: (
        totals(store, d.shipmentIds || [d.shipmentId], true).weight * 0.85 +
        12
      ).toFixed(2),
      ratedWeight: totals(store, d.shipmentIds || [d.shipmentId], true).weight,
      gfmId: `TRN-GFM-${id}`,
      transitDays: "2",
    };
    if (result.state === "failed") status = "Communication lost";
  }
  if (action === "Cancel") {
    status = "Cancelled";
    result = null;
  }
  if (["Abort", "Unrelease"].includes(action)) {
    status = "Aborted";
    result = null;
  }
  if (action === "Release") status = "Released";
  if (action === "Closeout") {
    if (result?.state !== "success")
      return {
        store,
        outcome: {
          status: "failed",
          messages: ["A rated shipment is required for closeout."],
        },
      };
    status = "Closed out";
  }
  const changed = {
    ...r,
    status,
    result,
    ...(["Print", "Final Print"].includes(action)
      ? {
          printRevision: r.revision,
          printBasis: dependencyBasis(store, kind, id),
        }
      : {}),
    ...(action === "Final Print"
      ? {
          finalPrintRevision: r.revision,
          finalPrintBasis: dependencyBasis(store, kind, id),
        }
      : {}),
    ...(["Abort", "Unrelease"].includes(action)
      ? {
          check: null,
          releaseRevision: null,
          printRevision: null,
          printBasis: null,
          finalPrintRevision: null,
          finalPrintBasis: null,
          pullRevision: null,
          pullBasis: null,
        }
      : {}),
    ...(action === "Release"
      ? { releaseRevision: r.revision, releaseDetails }
      : {}),
    ...(action === "Retrieve" ? { retrieved: true } : {}),
  };
  return {
    store: {
      ...store,
      [kind]: { ...store[kind], [id]: changed },
      history: [
        ...store.history,
        {
          kind,
          id,
          action,
          revision: r.revision,
          status,
          date: new Date().toISOString(),
          user: "TRAINEE",
        },
      ],
    },
    outcome: { status: "success", messages: [`${action}: ${status}`] },
  };
}
export function normalizeCmosStore(raw) {
  const next = createCmosStore();
  if (!raw || raw.version !== 1) return next;
  for (const k of KINDS) {
    const rows = raw[k];
    if (rows && typeof rows === "object" && !Array.isArray(rows))
      for (const [id, r] of Object.entries(rows))
        if (
          r &&
          r.draft &&
          typeof r.draft === "object" &&
          !Array.isArray(r.draft)
        )
          next[k][id] = {
            ...r,
            id,
            draft: clone(r.draft),
            saved: plain(r.saved) ? clone(r.saved) : null,
            revision: Number(r.revision) || 0,
            check: plain(r.check)
              ? {
                  ...r.check,
                  errors: Array.isArray(r.check.errors)
                    ? r.check.errors.filter((x) => typeof x === "string")
                    : [],
                }
              : null,
            result: plain(r.result)
              ? {
                  ...scalars(r.result),
                  ...(r.result.rates
                    ? {
                        rates: Array.isArray(r.result.rates)
                          ? r.result.rates
                              .filter(
                                (x) =>
                                  plain(x) &&
                                  typeof x.scac === "string" &&
                                  typeof x.name === "string",
                              )
                              .map(scalars)
                          : [],
                      }
                    : {}),
                }
              : null,
          };
  }
  for (const [id, record] of Object.entries(next.airManifests)) next.airManifests[id] = refreshAirManifestSample(record);
  for (const key of ["airManifestCargo", "airManifestMail"]) {
    const value = Number(raw.counters?.[key]);
    if (Number.isInteger(value) && value > 0 && value <= 10000) next.counters[key] = value;
  }
  const historicalIds = [
    ...(Array.isArray(raw.history)
      ? raw.history.filter(plain).map((h) => h.id)
      : []),
    ...Object.values(next.documents).flatMap((r) => [
      r.draft.ownerId,
      ...(Array.isArray(r.draft.shipmentIds) ? r.draft.shipmentIds : []),
    ]),
  ].filter((x) => typeof x === "string");
  for (const k of KINDS) {
    next.counters[k] = Math.max(
      1,
      Number(raw.counters?.[k]) || 1,
      ...historicalIds
        .filter((id) => id.startsWith(`${k}-`))
        .map((id) => Number(id.match(/-(\d+)$/)?.[1] || 0) + 1),
      ...Object.keys(next[k]).map(
        (id) => Number(id.match(/-(\d+)$/)?.[1] || 0) + 1,
      ),
    );
    for (const r of Object.values(next[k]))
      for (const d of [r.draft, r.saved].filter(Boolean)) {
        if (k === "hazards") {
          d.page1 = plain(d.page1) ? scalars(d.page1) : {};
          d.page2 = plain(d.page2) ? scalars(d.page2) : {};
          d.lots = Array.isArray(d.lots)
            ? d.lots
                .filter(plain)
                .map((lot, i) => ({
                  ...scalars(lot),
                  id: typeof lot.id === "string" ? lot.id : `lot-${i + 1}`,
                }))
            : [];
        }
        if (k === "documents")
          for (const f of [
            "shipmentIds",
            "shipmentSnapshots",
            "pieceSnapshots",
            "details",
            "packages",
            "expressIds",
          ])
            if (d[f] !== undefined)
              d[f] = Array.isArray(d[f])
                ? d[f].filter((x) =>
                    ["shipmentIds", "expressIds"].includes(f)
                      ? typeof x === "string"
                      : plain(x),
                  )
                : [];
      }
  }
  for (const k of ["pieces", "hazards", "express"])
    next[k] = Object.fromEntries(
      Object.entries(next[k]).filter(
        ([, r]) => !r.draft.shipmentId || next.shipments[r.draft.shipmentId],
      ),
    );
  for (const k of ["routings", "airManifests", "truckManifests", "bills"])
    for (const r of Object.values(next[k])) {
      r.draft.shipmentIds = (
        Array.isArray(r.draft.shipmentIds) ? r.draft.shipmentIds : []
      ).filter((id) => next.shipments[id]);
      if (r.saved)
        r.saved.shipmentIds = (
          Array.isArray(r.saved.shipmentIds) ? r.saved.shipmentIds : []
        ).filter((id) => next.shipments[id]);
    }
  next.selection =
    raw.selection && typeof raw.selection === "object"
      ? { ...raw.selection }
      : {};
  next.history = Array.isArray(raw.history)
    ? raw.history.filter(plain).map((h) => ({
        ...h,
        errors: Array.isArray(h.errors)
          ? h.errors.filter((x) => typeof x === "string")
          : [],
      }))
    : [];
  return next;
}

const scalars = (x) =>
  Object.fromEntries(
    Object.entries(x).filter(
      ([, v]) =>
        v === null || ["string", "number", "boolean"].includes(typeof v),
    ),
  );
const plain = (x) => Boolean(x && typeof x === "object" && !Array.isArray(x));
// Include raw and saved child work; operational flags do not alter document identity.
export function dependencyBasis(store, kind, id, visited = []) {
  if (visited.includes(`${kind}:${id}`)) return null;
  const r = store[kind]?.[id];
  if (!r) return null;
  const path = [...visited, `${kind}:${id}`];
  const ids =
    kind === "shipments"
      ? [id]
      : r.draft.shipmentIds || [r.draft.shipmentId].filter(Boolean);
  return JSON.stringify([
    kind,
    id,
    r.revision,
    r.draft,
    r.saved,
    ids.map((sid) => [
      sid,
      kind === "shipments"
        ? null
        : dependencyBasis(store, "shipments", sid, path),
      ...["pieces", "hazards"].map((k) =>
        Object.values(store[k])
          .filter(
            (c) => c.draft.shipmentId === sid || c.saved?.shipmentId === sid,
          )
          .map((c) => [c.id, c.revision, c.draft, c.saved]),
      ),
    ]),
    Object.values(store.documents)
      .filter(
        (c) =>
          c.draft.collection &&
          c.draft.ownerId === id &&
          c.draft.ownerKind === kind,
      )
      .map((c) => [c.id, c.revision, c.draft, c.saved]),
    r.draft.quoteId
      ? dependencyBasis(store, "quotes", r.draft.quoteId, path)
      : null,
    kind === "express" || kind === "quotes" ? r.result : null,
  ]);
}
export const documentCurrent = (store, doc) =>
  Boolean(
    doc?.saved?.basis &&
    doc.saved.basis ===
      dependencyBasis(store, doc.saved.ownerKind, doc.saved.ownerId),
  );
