import {
  createRecord,
  editRecord,
  saveRecord,
  deleteRecord,
  transition,
  totals,
  data,
  piecesFor,
  dependencyBasis,
  documentCurrent,
} from "./model";
const outcome = (store, status, ...messages) => ({
  store,
  outcome: { status, messages },
});
export function validateFunds(store, kind, id) {
  const d = store[kind]?.[id]?.draft || {};
  const tac = d.tac || d.billTo;
  return outcome(
    store,
    tac ? "success" : "failed",
    tac
      ? "Funds validation: fictional training account available."
      : "Enter TAC or Bill To before validating funds.",
  );
}
export function clearHazards(store, id) {
  let next = store;
  for (const r of Object.values(store.hazards))
    if (r.draft.shipmentId === id) next = deleteRecord(next, "hazards", r.id);
  return editRecord(next, "shipments", id, {
    hazmat: "N - Not hazardous",
    dangerGoods13872Required: false,
  });
}
export function getQuote(store, id) {
  let next = saveRecord(store, "quotes", id);
  const r = next.quotes[id],
    d = r?.saved || {};
  const errors = [];
  for (const f of ["weight", "length", "width", "height"])
    if (!(Number(d[f]) > 0)) errors.push(`${f} must be greater than zero.`);
  if (d.quoteTab === "Freight Rate Quotes") {
    if (!d.originSplc || !d.destinationSplc)
      errors.push("Origin and destination SPLCs are required.");
    if (!d.nmfcUfc) errors.push("NMFC/UFC is required.");
  } else if (!d.originZip || !d.destinationZip)
    errors.push("Origin and destination ZIP codes are required.");
  if (errors.length) return outcome(next, "failed", ...errors);
  const ratedWeight = Math.max(
    Number(d.weight),
    Math.ceil((Number(d.length) * Number(d.width) * Number(d.height)) / 139),
  );
  const serviceQty = Object.values(next.documents)
    .filter(
      (r) => r.saved?.ownerId === id && r.saved?.collection === "Service Codes",
    )
    .reduce((sum, r) => sum + (Number(r.saved.qty) || 0), 0);
  const rates = [
    ["FDE", "Federal Express", "2Day", 2, 1],
    ["FDEG", "FedEx Ground", "Ground", 4, 0.65],
    ["UPSN", "United Parcel Service", "Next Day Air", 1, 1.6],
    ["UPSQ", "UPS Freight", "Ground", 5, 0.8],
  ].map(([scac, name, service, days, factor]) => ({
    scac,
    name,
    service,
    transitDays: days,
    ratedWeight,
    cost: (
      12 +
      ratedWeight * factor +
      serviceQty * 5 +
      (Number(d.declaredValue) || 0) * 0.002
    ).toFixed(2),
    equipment: d.equipmentTypeOrdered || "Package",
  }));
  next = {
    ...next,
    quotes: {
      ...next.quotes,
      [id]: {
        ...r,
        status: "Quoted",
        result: {
          revision: r.revision,
          shipmentRevision: next.shipments[d.shipmentId]?.revision,
          rates,
        },
      },
    },
  };
  return outcome(next, "success", "Simulated carrier quotes received.");
}
export function assignQuote(store, id, index) {
  const r = store.quotes[id],
    d = r?.draft || {},
    rate = r?.result?.rates[index];
  if (!d.shipmentId || !store.shipments[d.shipmentId])
    return outcome(
      store,
      "failed",
      "Standalone quotes cannot assign a carrier. Open Rate Quote from a shipment.",
    );
  if (
    !rate ||
    r.result.revision !== r.revision ||
    r.result.shipmentRevision !== store.shipments[d.shipmentId].revision
  )
    return outcome(
      store,
      "failed",
      "Get a current quote and select a carrier.",
    );
  let next = store;
  const existing = Object.values(next.express).find(
    (e) => e.draft.shipmentId === d.shipmentId,
  );
  const patch = {
    shipmentId: d.shipmentId,
    scac: rate.scac,
    service: rate.service,
    domInt: d.quoteType === "SPE International" ? "INT" : "DOM",
    packageType: d.packageType || "Package",
    shipDate: d.shipDate || "",
    quoteId: id,
  };
  next = existing
    ? editRecord(next, "express", existing.id, patch)
    : createRecord(next, "express", patch);
  return outcome(
    next,
    "success",
    "Carrier assigned. Complete SPE details and Send Request.",
  );
}
export function generateDocument(
  store,
  kind,
  id,
  title,
  variant = "Draft",
  options = {},
) {
  const r = store[kind]?.[id];
  if (!r) return outcome(store, "failed", "Select a record.");
  const ids =
    options.shipmentIds ||
    (kind === "shipments"
      ? [id]
      : r.saved?.shipmentIds || [r.saved?.shipmentId].filter(Boolean));
  const shipmentSnapshots = ids.map((sid) => ({
    id: sid,
    revision: store.shipments[sid]?.revision,
    ...store.shipments[sid]?.saved,
    totals: totals(store, [sid], true),
  }));
  const pieceSnapshots = piecesFor(store, ids, true)
    .filter((p) => !options.pieceIds || options.pieceIds.includes(p.id))
    .map((p) => ({ id: p.id, ...p.saved }));
  const details = Object.values(store.documents)
    .filter((d) => d.saved?.ownerId === id && d.saved.collection)
    .map((d) => d.saved);
  let next = createRecord(store, "documents", {
    ownerKind: kind,
    ownerId: id,
    title,
    variant,
    ownerRevision: r.revision,
    basis: dependencyBasis(store, kind, id),
    snapshot: data(r, true),
    result: r.result,
    shipmentIds: ids,
    shipmentSnapshots,
    pieceSnapshots,
    details,
    printed: options.printed !== false,
    totals: totals(store, ids, true),
  });
  const docId = next.selection.documents;
  next = saveRecord(next, "documents", docId);
  return {
    ...outcome(next, "success", `${title} available.`),
    documentId: docId,
  };
}
export function retrieveExpressDocuments(store, id, titles) {
  const r = store.express[id];
  if (r?.result?.state !== "success")
    return outcome(
      store,
      "failed",
      "Rate this shipment before retrieving documents.",
    );
  let next = store;
  for (const title of titles)
    next = generateDocument(next, "express", id, title, "Final", {
      printed: false,
    }).store;
  next = transition(next, "express", id, "Retrieve").store;
  return outcome(
    next,
    "success",
    "Selected documents retrieved; choose a document to print.",
  );
}
export function closeoutCarrier(store, scac, date) {
  const rows = Object.values(store.express).filter(
    (r) =>
      r.draft.scac === scac &&
      r.draft.shipDate === date &&
      r.result?.state === "success" &&
      r.status !== "Closed out",
  );
  if (!scac || !date || !rows.length)
    return outcome(
      store,
      "failed",
      "No rated packages for this carrier and shipment date.",
    );
  let next = store;
  for (const r of rows)
    next = transition(next, "express", r.id, "Closeout").store;
  next = createRecord(next, "documents", {
    title: "Pickup report",
    variant: "Final",
    scac,
    date,
    expressIds: rows.map((r) => r.id),
    packages: rows.map((r) => ({
      tcn: store.shipments[r.draft.shipmentId]?.saved?.tcn,
      tracking: r.result.tracking,
      weight: r.result.ratedWeight,
    })),
    ownerKind: "express",
    ownerId: rows[0].id,
  });
  next = saveRecord(next, "documents", next.selection.documents);
  return {
    ...outcome(next, "success", "Daily carrier closeout completed."),
    documentId: next.selection.documents,
  };
}

export function markDocumentViewed(store, id) {
  return store;
}
export function markDocumentPrinted(store, id) {
  if (!documentCurrent(store, store.documents[id]))
    return outcome(
      store,
      "failed",
      "Retrieve a current document before printing.",
    );
  return outcome(
    saveRecord(
      editRecord(store, "documents", id, { printed: true }),
      "documents",
      id,
    ),
    "success",
    "Document printed.",
  );
}
