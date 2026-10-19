import publications from './publications.json';
import passages from './passages.json';
import { CLAIMS } from './claims';
import dteb from '../Cmos/dtrReference.json';
import afman from '../Cmos/afmanDg2Catalog.json';

const assetUrl = url => url.startsWith('asset:') ? `${process.env.PUBLIC_URL || ''}/${url.slice(6)}` : url;
export function getCitation(id) {
  if (String(id).startsWith('afman604.table.')) {
    const row = afman.entries.find(item => item.id === id.slice(15));
    if (!row || !row.page) return null;
    return { id, title: 'AFMAN 24-604', edition: '6 June 2025', section: `Table A4.1 · ${row.unId} · ${row.name}`,
      quote: [row.unId, row.name, row.division, row.subsidiary, row.packingGroup, row.specialProvisions, row.packingPara].filter(Boolean).join('\n'),
      url: assetUrl(publications.afman604.url), pdfPage: row.page, printedPage: String(row.page), verifiedAt: '2026-10-18', sourceKind: 'government publication copy' };
  }
  if (String(id).startsWith('dteb.')) {
    const [, key, ...parts] = id.split('.');
    const code = parts.join('.'), table = dteb.tables[key];
    const row = table?.rows.find(item => String(item[0]) === code);
    if (!row) return null;
    return { id, title: 'DTEB Transportation Reference Data', edition: `Retrieved ${dteb.retrieved}`,
      section: `${table.table} · ${code}`, quote: row.join('\n'), verifiedAt: dteb.retrieved,
      sourceKind: 'official download',
      url: `https://www.business.ustranscom.mil/cmd/associated/dteb/files/refdata/${table.table}.htm#:~:text=${encodeURIComponent(String(row[1] || code))}` };
  }
  const passage = passages[id];
  const publication = passage && publications[passage.publicationId];
  return publication ? { ...passage, title: publication.title, edition: publication.edition,
    url: assetUrl(publication.url), officialUrl: publication.officialUrl, sourceKind: publication.sourceKind } : null;
}
export function citationHref(citation) {
  return citation.pdfPage ? `${citation.url.split('#')[0]}#page=${citation.pdfPage}` : citation.url;
}
export const citationsForClaim = id => (CLAIMS[id] || []).map(getCitation).filter(Boolean);

// Resolve only explicit publication/paragraph references supplied by a React call site, never DOM text.
export function resolveReference(reference = '') {
  const text = String(reference);
  const ids = [];
  const push = id => { if (passages[id] && !ids.includes(id)) ids.push(id); };
  if (/(?:App(?:endix)?\s*O|III-O-)/i.test(text) && !/Part\s*II\b(?!I)/i.test(text)) {
    const ranges = [...text.matchAll(/(K\.\d\.[a-z])\((\d+)\)\s*[–-]\s*\((\d+)\)/g)];
    for (const [, parent, start, end] of ranges) for (let n = +start; n <= Math.min(+end, +start + 20); n++) push(`dtr3.appO.${parent}(${n})`);
    for (const match of text.matchAll(/K\.\d(?:\.[a-z])?(?:\(\d+\))?(?:\([a-z]\))?|J\.16/g)) push(`dtr3.appO.${match[0]}`);
  }
  if (/App(?:endix)?\s*P/i.test(text) && !/Part\s*II\b(?!I)/i.test(text)) {
    for (const match of text.matchAll(/(?:B|C)\.\d|\bA\b/g)) push(`dtr3.appP.${match[0]}`);
    if (/C\.1\s*[–-]\s*2/.test(text)) push('dtr3.appP.C.2');
  }
  if (/Table\s*203-3/i.test(text)) push('dtr2.203.Table203-3');
  if (/(?:Chapter\s*203|DTR[^·]*203).*B\.2\b/i.test(text)) push('dtr2.203.B.2');
  if (/(?:Chapter\s*202|DTR[^·]*202).*M\.1\b/i.test(text)) push('dtr2.202.M.1');
  if (/AFMAN\s*24[-–]604/i.test(text)) {
    for (const match of text.matchAll(/A\d+(?:\.\d+)+/g)) push(`afman604.${match[0]}`);
  }
  if (/DAFI\s*24[-–]602\s*V?2/i.test(text)) {
    for (const match of text.matchAll(/(?:A\d+|\d+)(?:\.\d+){1,4}/g)) push(`dafi602.${match[0]}`);
    if (/Table\s*2\.1/i.test(text)) push('dafi602.Table2.1');
  }
  return ids.map(getCitation);
}
export { publications, passages };

export function citationForHazard(un, name) {
  const normalize = value => String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const row = afman.entries.find(item => item.unId === un && item.name.split(/\s+or\s+/i).some(part => normalize(part) === normalize(name)));
  return row ? getCitation(`afman604.table.${row.id}`) : null;
}
