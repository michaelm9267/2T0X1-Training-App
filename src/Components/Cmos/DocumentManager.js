import FloatingWindow from "../Session/FloatingWindow";
import { Barcode, MslLabel, dodaacLines } from "../Documentation/MilitaryShippingLabel";
import { data, totals, piecesFor } from "./model";
import RouteReport from "./RouteReport";
import BillOfLadingDocument from "./BillOfLadingDocument";
// What a CMOS shipment and one of its pieces print on the DD Form 1387.
function cmosMslData(s, piece, number, count) {
  const dodaac = String(s.destination || "").toUpperCase();
  const uc = String(s.ucName || "").trim();
  const consignee = uc
    ? [`${dodaac}  ${uc}`, s.ucPhone && `CP ${s.ucPhone}`, s.ucAddress, s.ucAddress2, [s.ucCity, s.ucState, s.ucZip].filter(Boolean).join(" "), s.ucCountry]
    : dodaacLines(dodaac);
  const cube = ((Number(piece.length) || 0) * (Number(piece.width) || 0) * (Number(piece.height) || 0)) / 1728;
  return {
    tcn: s.tcn, from: s.origin, fromLines: dodaacLines(s.origin), tac: s.tac, service: ["F", "9"].includes(s.milMode) ? "AMC" : s.milMode,
    piece: number, of: count, weight: piece.weight, cube: cube ? Math.ceil(cube) : "", shipped: s.shipDate || "",
    rdd: s.rdd, project: s.proj, priority: s.tp, poe: s.poe || dodaac, shipToLines: s.poe ? dodaacLines(s.poeDodaac) : consignee.filter(Boolean),
    pod: s.pod, fmsCase: s.fmsCaseNumber, consignee: dodaac, consigneeLines: [...consignee, s.markFor && `MARK FOR: ${s.markFor}`].filter(Boolean),
  };
}
export function GeneratedDocument({ document, store }) {
  const d = data(document, true),
    snapshot = d.snapshot || {};
  const ids = d.shipmentIds || [];
  const msl = d.title === "Military shipping label";
  if (d.title === "Commercial Bill of Lading" && d.ownerKind === "bills")
    return <div className="shared-document paper-sheet"><p className="training-watermark">FICTIONAL TRAINING DOCUMENT</p><BillOfLadingDocument d={d} store={store} /></div>;
  if (d.title === "Route report" && d.ownerKind === "routings")
    return <div className="shared-document paper-sheet"><p className="training-watermark">FICTIONAL TRAINING DOCUMENT</p><RouteReport d={d} store={store} /></div>;
  return (
    <div className="shared-document paper-sheet">
      <p className="training-watermark">FICTIONAL TRAINING DOCUMENT</p>
      <h2>{d.title}</h2>
      <p>
        {d.variant || "Draft"} · Record revision {d.ownerRevision ?? "—"}
      </p>
      {d.title === "Carrier label" && (
        <Barcode text={d.result?.tracking || "TRAINING"} />
      )}
      {!msl && <dl>
        {Object.entries(snapshot)
          .filter(([, v]) => typeof v !== "object")
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{String(v ?? "")}</dd>
            </div>
          ))}
      </dl>}
      {d.ownerKind === "hazards" && <section className="shared-dg2-print">
        <h3>Dangerous goods identification and shipper</h3>
        <dl>{Object.entries(snapshot.page2 || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl>
        {Object.keys(snapshot.page1 || {}).length > 0 && <><h3>Indicators and additional information</h3><dl>{Object.entries(snapshot.page1).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl></>}
        {(snapshot.lots || []).map(lot => <div key={lot.id}><h3>Ammunition lot {lot.lotNumber || lot.id}</h3><dl>{Object.entries(lot).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl></div>)}
      </section>}
      {ids.length > 0 && !msl && (
        <table>
          <thead>
            <tr>
              <th>TCN</th>
              <th>Nomenclature</th>
              <th>Pieces</th>
              <th>Weight</th>
              <th>Cube</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const snapshot = d.shipmentSnapshots?.find((s) => s.id === id);
              const r = snapshot ? { saved: snapshot } : store.shipments[id],
                t = snapshot?.totals || totals(store, [id], true);
              return (
                <tr key={id}>
                  <td>{r?.saved?.tcn}</td>
                  <td>{r?.saved?.description}</td>
                  <td>{t.pieces}</td>
                  <td>{t.weight}</td>
                  <td>{(Number(t.cube) || 0).toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {msl &&
        ids.map((id) => {
          const shipment = d.shipmentSnapshots?.find((s) => s.id === id) || store.shipments[id]?.saved || {};
          const all = d.pieceSnapshots
            ? d.pieceSnapshots.filter((p) => p.shipmentId === id).map((p) => ({ id: p.id, saved: p }))
            : piecesFor(store, [id], true);
          const count = shipment.totals?.pieces || all.length;
          return all.map((p, i) => (
            <section className="shared-msl" key={p.id}>
              <MslLabel label={`Military shipping label, piece ${p.saved?.number || i + 1} of ${count}`} d={cmosMslData(shipment, p.saved || {}, p.saved?.number || i + 1, count)} />
            </section>
          ));
        })}
      {d.details?.length > 0 && (
        <section>
          <h3>Supporting details</h3>
          {d.details.map((detail, i) => (
            <dl key={i}>
              {Object.entries(detail)
                .filter(
                  ([k, v]) =>
                    !["ownerId", "ownerKind", "collection"].includes(k) &&
                    typeof v !== "object",
                )
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
            </dl>
          ))}
        </section>
      )}
      {d.packages && (
        <>
          <p>
            SCAC {d.scac} · Shipment date {d.date}
          </p>
          <table>
            <thead>
              <tr>
                <th>TCN</th>
                <th>Tracking</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {d.packages.map((p) => (
                <tr key={p.tracking}>
                  <td>{p.tcn}</td>
                  <td>{p.tracking}</td>
                  <td>{p.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
// A document by id: course-supplied paperwork first, then a document CMOS generated.
export function documentTitle(id, documents, store) {
  const source = documents.find((d) => d.id === id),
    generated = store.documents[id];
  if (!source && !generated) return null;
  return source?.title || generated.saved?.title || generated.draft.title;
}
export function DocumentContent({ id, documents, store }) {
  const source = documents.find((d) => d.id === id),
    generated = store.documents[id];
  if (source) return source.render();
  return generated ? <GeneratedDocument document={generated} store={store} /> : null;
}
export default function DocumentManager({
  openIds,
  documents,
  store,
  onClose,
  onPrint,
  onPopOut,
}) {
  return openIds.map((id) => {
    const source = documents.find((d) => d.id === id),
      generated = store.documents[id];
    const title = documentTitle(id, documents, store);
    if (!title) return null;
    return (
      <FloatingWindow
        key={id}
        title={title}
        label={title}
        onClose={() => onClose(id)}
        className="paper-sheet shared-document-window"
        printable
        onPrint={generated && !source ? () => onPrint?.(id) : undefined}
        actions={onPopOut && <button type="button" title="Move this document to a separate window" onClick={() => onPopOut(id)}>New window ↗</button>}
      >
        <DocumentContent id={id} documents={documents} store={store} />
      </FloatingWindow>
    );
  });
}
