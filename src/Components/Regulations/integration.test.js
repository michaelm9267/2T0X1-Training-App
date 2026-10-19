import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ModeContext } from '../Session/mode';
import JiInspectionList from '../Training/JiInspectionList';
import { ClaimLink, RegulationReference } from './RegulationHelp';
import { getCitation } from './catalog';

test('reference list links directly to verified inspection wording and shows the source after three seconds', () => {
  jest.useFakeTimers(); render(<JiInspectionList onClose={() => {}} />);
  const links = screen.getAllByRole('link').filter(node => /App O K.2.e\(6\)/.test(node.textContent));
  expect(links.length).toBeGreaterThan(0);
  fireEvent.mouseEnter(links[0]); act(() => jest.advanceTimersByTime(3000));
  expect(within(screen.getByRole('dialog', { name: /DTR Part III.*K.2.e\(6\)/ })).getByRole('blockquote')).toHaveTextContent('Locks without keys/combos');
  jest.useRealTimers();
});
test('explicit range citations preserve every applicable source and assessment renders plain text', () => {
  const { rerender } = render(<RegulationReference reference="DTR Part III App O K.2.d(1)–(2)" />);
  expect(screen.getByRole('link', { name: /K.2.d\(2\)/ })).toBeInTheDocument();
  rerender(<ModeContext.Provider value="test"><ClaimLink claimId="cargo.access">Keys and combinations</ClaimLink></ModeContext.Provider>);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
test('official code definitions and AFMAN variants have a precise, verified source record', () => {
  expect(getCitation('dteb.typePacks.MW').quote).toContain('Multiwall');
  const citation = getCitation('afman604.P5');
  expect(citation.pdfPage).toBe(133); expect(citation.url).toContain('afman24-604-2025-excerpt.pdf');
  expect(citation.quote).toBe('P5 Transport this material on passenger and cargo aircraft without passenger restriction.');
});
