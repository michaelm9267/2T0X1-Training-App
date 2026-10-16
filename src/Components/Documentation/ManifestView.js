import { useCallback, useState } from 'react';
import CollapsibleCard from './CollapsibleCard';
import PrintManifest from './PrintManifest';
import RemoveFromManifest from './RemoveFromManifest';
import { isHazardousIndicator } from '../CargoWindow/workflow';

// The cargo manifest: every piece added from any training shipment, exactly as entered, read-only.
export default function ManifestView({ pieces, onRemove, manifest }) {
  const [printing, setPrinting] = useState(false);
  const closePrint = useCallback(() => setPrinting(false), []);
  const count = `${pieces.length} ${pieces.length === 1 ? 'piece' : 'pieces'}`;
  const totals = pieces.reduce((sum, { record }) => ({ weight: sum.weight + Number(record.weight), cube: sum.cube + record.length * record.width * record.height / 1728 }), { weight: 0, cube: 0 });
  return <CollapsibleCard label="Cargo manifest" title="Cargo manifest" summary={<span>{count}</span>}>
    {pieces.length === 0 ? <p className="muted">No pieces are on the manifest. Save an Air Manifest and assign prepared pallets or loose TCNs in CMOS.</p> : <>
      <div className="manifest-table"><table>
        <thead><tr><th>Pc</th><th>Shipment</th><th>TCN</th><th>Nomenclature</th><th>L × W × H (in)</th><th>Weight (lb)</th><th>Cube (ft³)</th><th>Origin / APOE</th><th>Destination / APOD</th><th>Haz</th><th>MSL</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
        <tbody>{pieces.map(({ scenarioId, title, record, mslApplied, current }, index) => <tr key={scenarioId} className={current ? 'manifest-current' : ''} aria-label={`${title} manifest entry`}>
          <td>{index + 1}</td><td>{title}{current ? ' (current)' : ''}</td><td className="manifest-tcn">{record.tcn}</td><td>{record.description}</td>
          <td>{record.length} × {record.width} × {record.height}</td><td>{record.weight}</td><td>{(record.length * record.width * record.height / 1728).toFixed(1)}</td>
          <td>{record.origin} / {record.apoe}</td><td>{record.destination} / {record.apod}</td>
          <td>{record.hazmat}{isHazardousIndicator(record.hazmat) && (record.hazardRecords?.length || record.dg2Template) ? ` · ${record.hazardRecords?.map(r=>r.templateId).join(', ') || record.dg2Template}` : ''}</td>
          <td>{mslApplied ? 'Applied' : 'Not applied'}</td>
          <td><RemoveFromManifest onRemove={() => onRemove(scenarioId)} /></td>
        </tr>)}</tbody>
        <tfoot><tr><th colSpan="5">Total · {count}</th><td>{totals.weight}</td><td>{totals.cube.toFixed(1)}</td><td colSpan="5" /></tr></tfoot>
      </table></div>
      <p className="reference-note">Manifested entries are locked. Remove a piece to correct it, then add it again.</p>
    </>}
    <div className="answer-options"><button type="button" className="primary-button" disabled={pieces.length === 0} onClick={() => setPrinting(true)}>Print manifest</button></div>
    {printing && pieces.length > 0 && <PrintManifest manifest={manifest} pieces={pieces} onClose={closePrint} />}
  </CollapsibleCard>;
}
