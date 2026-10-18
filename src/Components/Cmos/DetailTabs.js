import Dg2List from "./Dg2List";
import T9MiscTab from "./T9MiscTab";
import { generateDocument } from "./operations";
import { collections, pieceFields } from "./referenceInventory";
import {
  piecesFor,
  createRecord,
  deriveShipment,
  deleteRecord,
  assignShipments,
  editRecord,
  totals,
} from "./model";
export default function DetailTabs({
  page,
  tab,
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
  apply,
}) {
  if (page === "planning" && tab === "Ultimate Consignee") {
    const fields = definition.tabs[tab];
    const rows = [["ucName"], ["ucAddress"], ["ucAddress2"], ["ucCity"], ["ucCountry", "ucState", "ucZip"], ["ucPhone"]];
    return <div className="shared-consignee">
      {rows.map((ids, i) => <div className="shared-consignee-row" key={i}>{renderFields(ids.map(id => fields.find(f => f.id === id)))}</div>)}
      <button disabled={locked} onClick={() => change(editRecord(store, "shipments", id, Object.fromEntries(fields.map(f => [f.id, ""]))))}>Clear Ultimate Consignee Data</button>
    </div>;
  }
  if (page === "planning" && tab === "Indicators") {
    const fields = definition.tabs[tab];
    const protective = String(draft.protectiveService || "").padEnd(4, " ").split("");
    const rows = [
      [["hazmat"], ["t9Required"], ["micapShipment"], ["repship"], ["protectiveService"], ["atcmdType"], ["eei", "demil", "usml", "determinationNbr"], ["routing"], ["weaponsShipment"], ["etrrInd"], ["equipmentSysInd"], ["commoditySH"]],
      [["dangerGoods13872Required"], ["consolidationInd", "supplyInd"], ["dd1907"], ["dunnageRequired"], ["courierInd"], ["mailShipment"], ["vetInspectableContainer"], ["serializedShipment"], ["airDim"]],
    ];
    return <div className="shared-indicators">
      {rows.map((column, i) => <div className="shared-indicator-column" key={i}>
        {column.map((ids, n) => <div className="shared-indicator-row" key={n}>
          {ids[0] === "protectiveService" ? <div className="shared-protective-service"><span>Protective Service Ind</span>
            {[0, 1, 2, 3].map(index => <input key={index} aria-label={`Protective Service Ind ${index + 1}`} maxLength={1} disabled={locked} readOnly={index > 0} value={protective[index].trim()} onChange={e => {
              const next = [...protective]; next[index] = e.target.value || " "; edit("protectiveService", next.join("").trimEnd());
            }} />)}
          </div> : renderFields(ids.map(id => fields.find(f => f.id === id)).filter(Boolean))}
        </div>)}
      </div>)}
    </div>;
  }
  if (page === "planning" && tab === "Pieces")
    return (
      <>
        <div className="shared-piece-totals">
          {[["Total PCS", total.pieces], ["Total WT", total.weight], ["Total CU", total.cube.toFixed(1)]].map(([label, value]) =>
            <label key={label}>{label}<input aria-label={label} readOnly value={value} /></label>
          )}
        </div>
        <div className="shared-toolbar">
          <button disabled={locked} aria-label="New piece" onClick={newPiece}>
            New
          </button>
          <button
            disabled={locked || !selected.length}
            onClick={() => {
              let next = store;
              for (const pid of selected) {
                const p = store.pieces[pid];
                if (p)
                  next = createRecord(next, "pieces", {
                    ...p.draft,
                    number: String(piecesFor(next, [id]).length + 1),
                    assetKey: null,
                  });
              }
              change(next);
            }}
          >
            Duplicate
          </button>
          <button onClick={() => print("Military shipping label")}>
            Print All Pieces
          </button>
          <button
            onClick={() => {
              if (!selected.length) {
                setMessage("Select pieces to print.");
                return;
              }
              print("Military shipping label", "Draft", { pieceIds: selected });
            }}
          >
            Print Selected Pieces
          </button>
          {page === "truck" && (
            <button
              disabled={locked || !selected.length}
              onClick={() =>
                apply(
                  generateDocument(
                    store,
                    kind,
                    id,
                    "AIT shipment data",
                    "Draft",
                    { shipmentIds: selected },
                  ),
                )
              }
            >
              Create AIT for TCN
            </button>
          )}
          <button onClick={() => setSelected([])}>Clear</button>
          <button
            disabled={locked || !selected.length}
            onClick={() => {
              change(deriveShipment(store, id, "Partial", selected));
              setSelected([]);
            }}
          >
            Partial
          </button>
          <button
            disabled={locked}
            onClick={() =>
              setConfirm({
                title: "Delete all pieces?",
                run: () => {
                  let next = store;
                  for (const p of piecesFor(store, [id]))
                    next = deleteRecord(next, "pieces", p.id);
                  change(next);
                },
              })
            }
          >
            Delete All
          </button>
        </div>
        <div className="shared-pieces-grid">
          <div className="shared-table-scroll"><table className="shared-table">
            <thead>
              <tr className="shared-piece-filter-strip" aria-hidden="true"><th />{pieceFields.map(f => <th key={f.id}><span /></th>)}</tr>
              <tr><th scope="col"><span className="visually-hidden">Select</span></th>{pieceFields.map(f => <th key={f.id} scope="col">{f.label}</th>)}</tr>
            </thead>
            <tbody>{piecesFor(store, [id]).map(p => (
              <tr key={p.id} aria-selected={selected.includes(p.id)}>
                <td><input type="checkbox" aria-label={`Select ${p.id}`} checked={selected.includes(p.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, p.id] : prev.filter(pid => pid !== p.id))} /></td>
                {pieceFields.map(f => <td key={f.id}>{f.id === "number"
                  ? <button aria-label={`Edit piece ${p.draft.number || p.id}`} onClick={() => openEntry("pieces", p.id, "Piece Information", pieceFields)}>{p.draft.number || "1"}</button>
                  : f.id === "cube"
                    ? ((Number(p.draft.length) || 0) * (Number(p.draft.width) || 0) * (Number(p.draft.height) || 0) / 1728).toFixed(1)
                    : String(p.draft[f.id] ?? "")}</td>)}
              </tr>
            ))}</tbody>
          </table>{!piecesFor(store, [id]).length && <p>No data to display.</p>}</div>
          <div className="shared-piece-count">{piecesFor(store, [id]).length} row(s) found.</div>
        </div>
      </>
    );
  if (page === "planning" && tab === "T-9 Misc")
    return <T9MiscTab key={id} {...{ store, id, draft, locked, change }} />;
  if (page === "planning" && tab === "DG2")
    return <Dg2List key={id} store={store} shipmentId={id} {...{ locked, change, openEntry, setHazTab, setConfirm, setMessage, apply }} />;
  if (["TCNs", "TCNs Assigned", "Pallets"].includes(tab)) {
    const ids = draft.shipmentIds || [];
    const rows = ids
      .map((sid) => store.shipments[sid])
      .filter(Boolean)
      .map((r) => ({
        ...r,
        draft: { ...r.draft, ...totals(store, [r.id]) },
      }));
    return (
      <>
        <div className="shared-toolbar">
          <button
            disabled={locked || !record}
            onClick={() => {
              setAssignment(true);
              setAssignIds([]);
            }}
          >
            Assign TCNs or Aggregates
          </button>
          <button
            disabled={locked || !selected.length}
            onClick={() =>
              change(assignShipments(store, kind, id, selected, true))
            }
          >
            Unassign
          </button>
          {page === "truck" &&
            ["Load", "Unload"].map((label) => (
              <button
                disabled={locked || !selected.length}
                key={label}
                onClick={() =>
                  edit(
                    "loadedIds",
                    label === "Load"
                      ? [...new Set([...(draft.loadedIds || []), ...selected])]
                      : (draft.loadedIds || []).filter(
                          (x) => !selected.includes(x),
                        ),
                  )
                }
              >
                {label}
              </button>
            ))}
          {page === "routing" && (
            <button
              disabled={locked || !ids.length}
              onClick={() => {
                const r = store.shipments[ids[0]].draft;
                edit("origin", r.origin);
                change(
                  editRecord(store, kind, id, {
                    origin: r.origin,
                    destination: r.destination,
                    originSplc:
                      context.shipmentSources?.[ids[0]]?.originSPLC || "",
                    destSplc:
                      context.shipmentSources?.[ids[0]]?.destinationSPLC || "",
                  }),
                );
              }}
            >
              Copy TCN Data
            </button>
          )}
          {page === "truck" && (
            <button
              disabled={locked || !selected.length}
              onClick={() =>
                apply(
                  generateDocument(
                    store,
                    kind,
                    id,
                    "AIT shipment data",
                    "Draft",
                    { shipmentIds: selected },
                  ),
                )
              }
            >
              Create AIT for TCN
            </button>
          )}
          <button onClick={() => setSelected([])}>Clear</button>
          <button onClick={() => go("planning")}>Ship Plan</button>
        </div>
        {rowTable(rows, definition.tabs[tab], () => {}, true)}
        {page === "truck" && (
          <p>Loaded: {(draft.loadedIds || []).length} TCN(s).</p>
        )}
      </>
    );
  }
  if (collections[tab])
    return (
      <>
        <button disabled={locked || !record} onClick={() => newCollection(tab)}>
          New
        </button>
        {rowTable(collectionRows(tab), collections[tab], (r) =>
          openEntry("documents", r.id, `${tab} detail`, collections[tab]),
        )}
      </>
    );
  if (
    tab === "Shipment Status" ||
    (page === "routing" && ["Status", "Notices"].includes(tab))
  )
    return (
      <table className="shared-table">
        <thead>
          <tr>
            {[
              "Action",
              "Action Date",
              "Time GMT",
              "User ID",
              "Receiver ID",
              "Lead TCN",
              "Additional Info",
              "Revision",
              "Status",
            ].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {store.history
            .filter((h) => h.id === id)
            .map((h, i) => (
              <tr key={i}>
                <td>{h.action}</td>
                <td>{typeof h.date === "string" ? h.date.slice(0, 10) : ""}</td>
                <td>
                  {typeof h.date === "string" ? h.date.slice(11, 19) : ""}
                </td>
                <td>{h.user || ""}</td>
                <td>{h.receiverId || ""}</td>
                <td>{h.leadTcn || record?.draft.tcn || ""}</td>
                <td>{h.additionalInfo || (h.errors || []).join(" ")}</td>
                <td>{h.revision}</td>
                <td>{h.status}</td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  return (
    <>
      {renderFields(definition.tabs[tab] || [])}
      {page === "quote" && tab === "Freight Rate Quotes" && (
        <>
          <h4>Service Codes</h4>
          <button
            disabled={locked}
            onClick={() => newCollection("Service Codes")}
          >
            New service code
          </button>
          {rowTable(
            collectionRows("Service Codes"),
            collections["Service Codes"],
            (r) =>
              openEntry(
                "documents",
                r.id,
                "Service Codes detail",
                collections["Service Codes"],
              ),
          )}
        </>
      )}
      {tab === "Billing" && (
        <>
          <h4>Accounting</h4>
          <button disabled={locked} onClick={() => newCollection("Accounting")}>
            New accounting row
          </button>
          {rowTable(collectionRows("Accounting"), collections.Accounting, (r) =>
            openEntry(
              "documents",
              r.id,
              "Accounting detail",
              collections.Accounting,
            ),
          )}
        </>
      )}
      {page === "routing" && tab === "Response" && record?.result && (
        <dl>
          {Object.entries(record.result).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
