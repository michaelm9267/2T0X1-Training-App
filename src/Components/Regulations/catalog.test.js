import { getCitation, citationHref, citationsForClaim, resolveReference } from './catalog';

test('uses physical PDF pages and preserves HTML anchors', () => {
  expect(citationHref({ url: 'https://example.gov/manual.pdf', pdfPage: 9, printedPage: '7' })).toBe('https://example.gov/manual.pdf#page=9');
  expect(citationHref({ url: 'https://example.gov/rules#section-2' })).toBe('https://example.gov/rules#section-2');
});
test('resolves exact inspection paragraphs to verified wording, not app summaries', () => {
  const citation = getCitation('dtr3.appO.K.2.e(6)');
  expect(citation.section).toBe('Appendix O K.2.e(6)');
  expect(citation.pdfPage).toBe(8);
  expect(citation.quote).toContain('Locks without keys/combos will be removed from the item or the item will be removed from chalk.');
  expect(resolveReference('DTR Part III App O K.2.e(6)')[0].id).toBe(citation.id);
  expect(citationsForClaim('cargo.access')[0].id).toBe(citation.id);
});
test('never fabricates authority for unknown or simulation-only claims', () => {
  expect(getCitation('not-a-rule')).toBeNull();
  expect(citationsForClaim('training.floorLimits')).toEqual([]);
  expect(resolveReference('DAFI 24-605V2 §3.54.1')).toEqual([]);
});

test('hazard row citations keep gas and liquid UN3166 variants separate', () => {
  expect(getCitation('afman604.table.UN3166').quote).toContain('FLAMMABLE GAS POWERED');
  expect(getCitation('afman604.table.UN3166-2').quote).toContain('FLAMMABLE LIQUID POWERED');
  expect(getCitation('afman604.table.UN3166-2').pdfPage).toBe(228);
});

test('every claim resolves to verified records with complete provenance', () => {
  const { CLAIMS } = require('./claims');
  const { publications, passages } = require('./catalog');
  for (const [claim, ids] of Object.entries(CLAIMS)) for (const id of ids) expect({ claim, id, found: Boolean(getCitation(id)) }).toEqual({ claim, id, found: true });
  for (const [key, passage] of Object.entries(passages)) {
    const publication = publications[passage.publicationId];
    expect({ key, publication: Boolean(publication) }).toEqual({ key, publication: true });
    expect(passage.id).toBe(key);
    expect(passage.section.trim()).not.toBe('');
    expect(passage.quote.trim().length).toBeGreaterThan(20);
    // A PDF publication must link to a physical page.
    expect({ key, pdfPage: !/\.pdf($|#)/i.test(publication.url) || (Number.isInteger(passage.pdfPage) && passage.pdfPage > 0) }).toEqual({ key, pdfPage: true });
    // Regressions found in the source audit: table-of-contents leaders quoted instead of the table, and
    // paragraph numbers that a PDF extractor bunched together ahead of the text ("1. 2. 3. 4. Marking ...").
    expect({ key, tocLeaders: /\.{8,}/.test(passage.quote) }).toEqual({ key, tocLeaders: false });
    expect({ key, bunchedNumbers: /(?:\b\d+\.\s){2,}/.test(passage.quote) }).toEqual({ key, bunchedNumbers: false });
  }
  for (const [id, publication] of Object.entries(publications)) expect({ id, url: Boolean(publication.url), edition: Boolean(publication.edition) }).toEqual({ id, url: true, edition: true });
});

test('CMOS data-entry screens and field labels never cite joint inspection (DTR Part III Appendix O)', () => {
  const { cmosPageClaims, CLAIMS } = require('./claims');
  const { FIELD_CLAIMS } = require('./RegulationHelp');
  const jointInspection = claim => (CLAIMS[claim] || []).filter(id => id.startsWith('dtr3.appO'));
  for (const page of ['planning', 'spe', 'cbl', 'truck', 'routing', 'air', 'schedule', 'quote']) expect({ page, ji: cmosPageClaims(page).flatMap(jointInspection) }).toEqual({ page, ji: [] });
  expect(Object.values(FIELD_CLAIMS).flatMap(jointInspection)).toEqual([]);
  expect(citationsForClaim('outbound.msl').map(c => c.id)).toEqual(['dtr2.208.E']);
});
