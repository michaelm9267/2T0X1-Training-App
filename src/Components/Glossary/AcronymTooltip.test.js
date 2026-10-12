import { act, fireEvent, render, screen } from '@testing-library/react';
import AcronymTooltip from './AcronymTooltip';
import { acronymAt, findAcronyms, lookup } from './acronyms';

test('finds glossary terms as whole words, plurals, and parts of paired words', () => {
  expect(findAcronyms('Record the TCN and GWT.').map(hit => hit.term)).toEqual(['TCN', 'GWT']);
  expect(lookup('DoDAACs')).toBe('DoDAAC');
  expect(findAcronyms('Consignor/POE')).toEqual([{ term: 'POE', start: 10, end: 13 }]);
  expect(findAcronyms('ISU-90 container')[0].term).toBe('ISU-90');
  expect(findAcronyms('Record the raw tcn at this age')).toEqual([]);
  expect(acronymAt('D1 / W1 (FAW)', 10).term).toBe('FAW');
  expect(acronymAt('D1 / W1 (FAW)', 3)).toBeUndefined();
});

test('hovering an acronym shows what it means and moving away hides it', () => {
  render(<><p>Verify the TCN on the label</p><AcronymTooltip /></>);
  const text = screen.getByText('Verify the TCN on the label').firstChild;
  const original = { caret: document.caretRangeFromPoint, rects: Range.prototype.getClientRects };
  const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(); return 1; });
  Range.prototype.getClientRects = () => [{ left: 100, right: 130, top: 10, bottom: 26, width: 30, height: 16 }];
  try {
    document.caretRangeFromPoint = () => ({ startContainer: text, startOffset: 12 });
    act(() => { fireEvent.mouseMove(document, { clientX: 110, clientY: 18 }); });
    expect(screen.getByRole('tooltip')).toHaveTextContent('TCNTransportation Control Number');
    document.caretRangeFromPoint = () => ({ startContainer: text, startOffset: 2 });
    act(() => { fireEvent.mouseMove(document, { clientX: 20, clientY: 18 }); });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  } finally {
    document.caretRangeFromPoint = original.caret;
    Range.prototype.getClientRects = original.rects;
    raf.mockRestore();
  }
});
