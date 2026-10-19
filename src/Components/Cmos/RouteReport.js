import { REQUEST_STATUS_TEXT } from './routingResponse';

// Route Order Request Summary (Print Route Report): the request history, each equipment group's
// award, and a Carrier Detail page for every carrier quote. All carrier data is fictional.
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const money = (n) => (n === '' || n === undefined ? '' : Number(n).toFixed(2));

function Footer({ origin, printed, page, pages }) {
  return <footer className="route-report-footer"><span>Route Order Request Summary</span><span>DODAAC: {origin}</span><span>{printed}</span><span>Page {page} of {pages}</span></footer>;
}

export default function RouteReport({ d, store }) {
  const r = d.snapshot || {};
  const now = new Date(d.printedAt || Date.now());
  const printed = `${pad(now.getDate())}${MONTHS[now.getMonth()]}${now.getFullYear()}`;
  const julian = `${now.getFullYear() % 10}${String(Math.round((now - new Date(now.getFullYear(), 0, 0)) / 864e5)).padStart(3, '0')}`;
  const shipments = Object.fromEntries((d.shipmentSnapshots || []).map((s) => [s.id, s]));
  // Every group the assigned TCNs ride in, with whatever the order holds for it so far.
  const keys = [...new Set([...(r.shipmentIds || []).map((id) => (r.tcnGroups || {})[id] || '01'), ...Object.keys(r.equipGroups || {})])].sort();
  const groups = keys.map((key) => [key, (r.equipGroups || {})[key] || {}]);
  const tcnsFor = (group) => (r.shipmentIds || []).filter((id) => ((r.tcnGroups || {})[id] || '01') === group).map((id) => shipments[id]?.tcn || store?.shipments?.[id]?.saved?.tcn).filter(Boolean);
  const carrierPages = groups.flatMap(([group, g]) => (g.carriers || []).map((c) => ({ group, g, c })));
  const pages = 1 + carrierPages.length;
  const status = r.requestStatus ? `${r.requestStatus}/${REQUEST_STATUS_TEXT[r.requestStatus] || ''}` : '';
  const weight = (d.totals?.weight ?? 0);
  return <div className="route-report">
    <section className="route-report-page">
      <header className="route-report-title"><h2>Route Order Request Summary</h2>
        <p>Date: {printed} &nbsp; Julian: {julian} &nbsp; Time: {pad(now.getHours())}:{pad(now.getMinutes())} &nbsp; GMT: {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}</p></header>
      <div className="route-report-grid3">
        <p><b>SHIPMENT ID:</b> {r.shipmentId}</p><p><b>ROUTE ORDER NBR:</b> {r.routingOrderNumber}</p><p><b>REQUEST STATUS:</b></p>
        <p><b>REQUEST DATE:</b> {String(r.requestDate || '').toUpperCase()}</p><p><b>TYPE OF REQUEST:</b> {r.requestType}</p><p>{status}</p>
      </div>
      <h3 className="route-report-band">Request Status Detail</h3>
      <table className="route-report-log"><thead><tr><th>ACTION DATE/TIME</th><th>USERID</th><th>ACTION</th></tr></thead>
        <tbody>{(r.requestLog || []).map((e, i) => <tr key={i}><td>{e.at}</td><td>{e.user}</td><td>{e.action}</td></tr>)}</tbody></table>
      {groups.map(([group, g]) => <div className="route-report-group" key={group}>
        <p className="route-report-line"><b>EQUIPMENT GROUP:</b> {group} &nbsp; <b>B/L:</b> {g.cblNumber || ''} &nbsp; <b>RELEASE DATE:</b> {g.releaseDate || ''} &nbsp; <b>NMFC:</b> {g.nmfc || g.carriers?.[0]?.ratedCommod || ''} {g.nmfcSub || '0'}</p>
        <p><b>SCAC ASSIGNED:</b> {g.assignedScac || ''}</p>
        <h4 className="route-report-band small">TCNS</h4>
        {tcnsFor(group).map((tcn) => <p key={tcn} className="route-report-indent">{tcn}</p>)}
        <div className="route-report-grid2"><div><b>EQUIP GROUP<br />EQUIP TYPES</b>{(g.equipment || []).map((t) => <p key={t}>{t}</p>)}</div>
          <div><b>EQUIP GROUP<br />ACC/PROT SVC CODES</b>{(g.serviceCodes || []).map((s, i) => <p key={i}>{s.code}</p>)}</div></div>
      </div>)}
      <Footer origin={r.origin} printed={printed} page={1} pages={pages} />
    </section>
    {carrierPages.map(({ group, g, c }, i) => <section className="route-report-page" key={`${group}-${c.scac}`}>
      <h3 className="route-report-center">CARRIER DETAIL EQUIP GROUP {group}</h3>
      <div className="route-report-grid2">
        <dl><dt>SHIPMENT ID:</dt><dd>{r.shipmentId}</dd><dt>ORIGIN DODAAC:</dt><dd>{r.origin}</dd><dt>DEST DODAAC:</dt><dd>{r.destination}</dd><dt>ROUTE ORDER:</dt><dd>{r.routingOrderNumber}</dd></dl>
        <dl><dt>AVAIL DATE:</dt><dd>{String(r.pickupEarliest || '').split('/')[0].toUpperCase()}</dd><dt>QUANTITY SHIPPED:</dt><dd>{weight}</dd><dt>SHIPMENT PRIORITY:</dt><dd>{r.tp}</dd><dt>REQUESTOR ID:</dt><dd>{r.requesterName}</dd></dl>
      </div>
      <p><b>SHIPPING NOTES:</b></p>
      <p><b>RATING TECHNICIAN:</b> {r.ratingTech}<br /><b>RATING TECHNICIAN PHONE NBR :</b> {r.ratingTechPhone}</p>
      <hr />
      <p><b>SCAC:</b> {c.scac} - {c.name}<br /><b>RANK NBR:</b> {c.rank}<br /><b>PHONE 1:</b> {c.phone}<br /><b>PHONE 2:</b></p>
      <div className="route-report-grid3">
        <dl><dt>TENDER:</dt><dd>{c.tender}</dd><dt>EFFECTIVE:</dt><dd>{c.effective}</dd><dt>EXPIRES:</dt><dd>{c.expires}</dd><dt>OFFER ID:</dt><dd>{c.offerId}</dd><dt>RATED COMMOD:</dt><dd>{c.ratedCommod}</dd></dl>
        <dl><dt>LINE HAUL MILES:</dt><dd>{c.lineHaulMiles}</dd><dt>LINE COST:</dt><dd>{money(c.lineCost)}</dd><dt>SVC COST:</dt><dd>{money(c.svcCost)}</dd><dt>PERMIT COST:</dt><dd /><dt>MISC COST:</dt><dd /><dt>TOTAL COST:</dt><dd>{money(c.totalCost)}</dd></dl>
        <dl><dt>ACTUAL WEIGHT:</dt><dd>{c.actualWeight}</dd><dt>MIN WEIGHT:</dt><dd>{c.minWeight}</dd><dt>MAX WEIGHT:</dt><dd>{c.maxWeight}</dd><dt>RATED MILES:</dt><dd>{c.ratedMiles}</dd><dt>RATE USED:</dt><dd>{c.rateUsed}</dd><dt>RATE QUAL:</dt><dd>{c.rateQual}</dd><dt>RATE UOM:</dt><dd /></dl>
      </div>
      <hr />
      <p><b>RESPONDER CONTACT</b><br /><b>NAME:</b> {c.contact?.name}<br /><b>PHONE:</b> {c.contact?.phone}<br /><b>EMAIL:</b> {c.contact?.email}</p>
      <p><b>CONTRACT NBR:</b></p>
      <p><b>MODE:</b> {c.mode} &nbsp; <b>EQUIPMENT:</b> {c.eqType}</p>
      <hr />
      <p><b>RINS:</b></p>
      <div className="route-report-rins">{['101', '105', '111', '115', '123', '131', '141', '332', '351'].map((rin) => <span key={rin}>{rin}:</span>)}</div>
      <p><b>RATED SERVICE CODES:</b></p>
      <table className="route-report-svc"><thead><tr><th>SVC CODE</th><th>RATE</th><th>CHARGE</th><th>UOM QTY1</th><th>UOM QTY2</th><th>UOM QTY3</th></tr></thead><tbody /></table>
      <p><b>TOTAL SERVICE COST:</b> 0.00</p>
      <p><b>VIA ROUTING SCAC:</b></p><p><b>CARRIER REMARKS:</b></p>
      <hr />
      <p><b>CARRIER CONTACT:</b><br /><b>NAME:</b><br /><b>DATE:</b><br /><b>TIME:</b><br /><b>REASON CARRIER NOT USED:</b> {g.reasons?.[c.scac] || ''}<br /><b>REMARKS:</b></p>
      <Footer origin={r.origin} printed={printed} page={i + 2} pages={pages} />
    </section>)}
  </div>;
}
