import { useState } from 'react';
import { Dialog } from './controls';

// CMOS Hazard UOM codes, in the order shown by the reference lookup screens.
export const BL_HAZARD_UOMS = [
  ['20', '20 Foot Container'], ['2R', 'Kilocurie'], ['4D', 'Curie'], ['BR', 'Barrel'],
  ['CW', 'Hundred Pounds (CWT)'], ['D2', 'Shares'], ['FO', 'Fluid Ounce'], ['GA', 'Gallon'],
  ['LB', 'Pound'], ['LG', 'Long Ton'], ['M0', 'Magnetic Tapes'], ['M5', 'Microcurie'],
  ['MU', 'Millicurie'], ['NS', 'Short Ton'], ['OZ', 'Ounce - Av'], ['PS', 'Pounds per Sq. Inch'],
  ['PT', 'Pint'], ['Q2', 'Pint U.S. Dry'], ['QT', 'Quart'], ['G2', 'U.S Gallons per Minute'], ['PN', 'Pounds Net'],
];
export const METRIC_HAZARD_UOMS = [
  ['2C', 'Roentgen'], ['2Q', 'Kilobecquerel'], ['2Y', 'Milliroentgen'], ['40', 'Milliliter per Second'],
  ['4N', 'Megabecquerel'], ['GM', 'Grams per Sq. Meter'], ['GR', 'Gram'], ['HG', 'Hectogram'],
  ['KG', 'Kilogram'], ['KR', 'Kiloroentgen'], ['LT', 'Liter'], ['MC', 'Microgram'],
  ['ME', 'Milligram'], ['MG', 'Metric Gross Ton'], ['ML', 'Milliliter'], ['MP', 'Metric Ton'],
  ['R2', 'Becquerel'], ['H4', 'Hectoliter'], ['08', 'Nanocurie'], ['09', 'Terabecquerels'],
  ['G4', 'Gigabecquerel'], ['L', 'Liter (Air IATA)'],
];

export default function HazardUomLookup({ metric, onSelect, onClose }) {
  const [codeFilter, setCodeFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [selected, setSelected] = useState('');
  const rows = (metric ? METRIC_HAZARD_UOMS : BL_HAZARD_UOMS).filter(([code, description]) =>
    code.includes(codeFilter.toUpperCase()) && description.toUpperCase().includes(descriptionFilter.toUpperCase()));
  const select = code => { onSelect(code); onClose(); };
  return <Dialog title="Hazard UOM Lookup" onClose={onClose} overlayClassName="shared-hazard-uom-overlay">
    <div className="shared-hazard-uom-lookup">
      <div className="shared-hazard-uom-toolbar"><button onClick={() => { setCodeFilter(''); setDescriptionFilter(''); setSelected(''); }}>Clear</button></div>
      <div className="shared-hazard-uom-scroll">
        <table>
          <thead>
            <tr>
              <th><input aria-label="Filter Haz UOM Code" value={codeFilter} onChange={e => { setCodeFilter(e.target.value); setSelected(''); }} /></th>
              <th><input aria-label="Filter UOM Description" value={descriptionFilter} onChange={e => { setDescriptionFilter(e.target.value); setSelected(''); }} /></th>
            </tr>
            <tr><th>Haz UOM Code</th><th>Description</th></tr>
          </thead>
          <tbody>{rows.map(([code, description]) => <tr key={code} tabIndex={0} aria-selected={selected === code} onClick={() => setSelected(code)} onDoubleClick={() => select(code)} onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); select(code); }
            else if (e.key === ' ') { e.preventDefault(); setSelected(code); }
          }}><td>{code}</td><td>{description}</td></tr>)}</tbody>
        </table>
        {!rows.length && <p>No matching codes found.</p>}
      </div>
      <div className="shared-hazard-uom-status">{rows.length} row(s) found.</div>
      <footer><button disabled={!selected} onClick={() => select(selected)}>Select</button><button onClick={onClose}>Close</button></footer>
    </div>
  </Dialog>;
}
