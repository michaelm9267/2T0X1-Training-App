import FloatingWindow from "../Session/FloatingWindow";
import { Barcode } from "../Documentation/MilitaryShippingLabel";
import { data, totals, piecesFor } from "./model";
export function GeneratedDocument({ document, store }) {
  const d = data(document, true),
    snapshot = d.snapshot || {};
  const ids = d.shipmentIds || [];
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
      <dl>
        {Object.entries(snapshot)
          .filter(([, v]) => typeof v !== "object")
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{String(v ?? "")}</dd>
            </div>
          ))}
      </dl>
      {d.ownerKind === "hazards" && <section className="shared-dg2-print">
        <h3>Dangerous goods identification and shipper</h3>
        <dl>{Object.entries(snapshot.page2 || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl>
        {Object.keys(snapshot.page1 || {}).length > 0 && <><h3>Indicators and additional information</h3><dl>{Object.entries(snapshot.page1).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl></>}
        {(snapshot.lots || []).map(lot => <div key={lot.id}><h3>Ammunition lot {lot.lotNumber || lot.id}</h3><dl>{Object.entries(lot).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "")}</dd></div>)}</dl></div>)}
      </section>}
      {ids.length > 0 && (
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
      {d.title === "Military shipping label" &&
        ids.map((id) =>
          (d.pieceSnapshots
            ? d.pieceSnapshots
                .filter((p) => p.shipmentId === id)
                .map((p) => ({ id: p.id, saved: p }))
            : piecesFor(store, [id], true)
          ).map((p) => (
            <section className="shared-msl" key={p.id}>
              <h3>DD Form 1387 · Military shipping label</h3>
              <Barcode
                text={
                  (
                    d.shipmentSnapshots?.find((s) => s.id === id) ||
                    store.shipments[id]?.saved
                  )?.tcn || "TRAINING"
                }
              />
              <p>
                TCN{" "}
                {
                  (
                    d.shipmentSnapshots?.find((s) => s.id === id) ||
                    store.shipments[id]?.saved
                  )?.tcn
                }{" "}
                · Piece {p.saved?.number || p.id}
              </p>
              <p>
                Consignor{" "}
                {
                  (
                    d.shipmentSnapshots?.find((s) => s.id === id) ||
                    store.shipments[id]?.saved
                  )?.origin
                }{" "}
                · Consignee{" "}
                {
                  (
                    d.shipmentSnapshots?.find((s) => s.id === id) ||
                    store.shipments[id]?.saved
                  )?.destination
                }
              </p>
              <p>
                {p.saved?.weight} lb · {p.saved?.typePack}
              </p>
            </section>
          )),
        )}
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
export default function DocumentManager({
  openIds,
  documents,
  store,
  onClose,
  onPrint,
}) {
  return openIds.map((id) => {
    const source = documents.find((d) => d.id === id),
      generated = store.documents[id];
    if (!source && !generated) return null;
    const title =
      source?.title || generated.saved?.title || generated.draft.title;
    return (
      <FloatingWindow
        key={id}
        title={title}
        label={title}
        onClose={() => onClose(id)}
        className="paper-sheet shared-document-window"
        printable
        onPrint={generated && !source ? () => onPrint?.(id) : undefined}
      >
        {source ? (
          source.render()
        ) : (
          <GeneratedDocument document={generated} store={store} />
        )}
      </FloatingWindow>
    );
  });
}
