import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createPortal } from 'react-dom';
import RegulationLink from './RegulationLink';
const link = () => screen.getByRole('link', { name: 'Keys and combinations' });
const advance = ms => act(() => jest.advanceTimersByTime(ms));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
function Example() { return <RegulationLink citationId="dtr3.appO.K.2.e(6)">Keys and combinations</RegulationLink>; }

test('opens a normal source link immediately but waits three full seconds to show its quotation', () => {
  render(<Example />);
  expect(link()).toHaveAttribute('target', '_blank');
  expect(link()).toHaveAttribute('rel', 'noopener noreferrer');
  expect(link()).toHaveAttribute('href', expect.stringContaining('#page=8'));
  fireEvent.mouseEnter(link()); advance(2999);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.mouseMove(link()); advance(1);
  expect(screen.getByRole('dialog')).toHaveTextContent('Locks without keys/combos');
});
test('cancels early hover and starts a fresh delay on re-entry', () => {
  render(<Example />); fireEvent.mouseEnter(link()); advance(2000); fireEvent.mouseLeave(link()); advance(4000);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.mouseEnter(link()); advance(2999); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  advance(1); expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('stays open when crossing the gap, using the popup, or moving focus inside it', () => {
  render(<Example />); fireEvent.mouseEnter(link()); advance(3000);
  const popup = screen.getByRole('dialog');
  fireEvent.mouseLeave(link()); advance(100); fireEvent.mouseEnter(popup); advance(10000);
  fireEvent.scroll(within(popup).getByRole('blockquote')); fireEvent.mouseDown(popup); advance(10000);
  expect(popup).toBeInTheDocument();
  fireEvent.focus(within(popup).getByRole('link', { name: /Open source/ }));
  fireEvent.mouseLeave(popup); advance(1000); expect(popup).toBeInTheDocument();
  fireEvent.blur(within(popup).getByRole('link', { name: /Open source/ }), { relatedTarget: document.body });
  advance(200); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('supports keyboard focus, Escape, and a touch-friendly quotation button', () => {
  render(<Example />); fireEvent.focus(link()); expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Show regulation quotation/ }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('shows only the active citation and cleans up on unmount', () => {
  const { unmount } = render(<><Example /><RegulationLink citationId="dtr3.appP.C.2">Rounding</RegulationLink></>);
  fireEvent.mouseEnter(link()); advance(3000);
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'Rounding' })); advance(3000);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog')).toHaveTextContent('Any answer with a fraction of .5');
  unmount(); advance(10000); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('renders popup in the trigger owner document', () => {
  const iframe = document.createElement('iframe'); document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const { unmount } = render(createPortal(<Example />, doc.body));
  fireEvent.focus(within(doc.body).getByRole('link', { name: 'Keys and combinations' }));
  expect(within(doc.body).getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  unmount();
  iframe.remove();
});
test('unverified IDs remain plain text without source claims', () => {
  render(<RegulationLink citationId="unverified">Unverified rule</RegulationLink>);
  expect(screen.getByText('Unverified rule')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('Escape dismisses the quote without closing its underlying document', () => {
  const closeDocument = jest.fn();
  render(<div onKeyDown={closeDocument}><Example /></div>);
  fireEvent.focus(link());
  fireEvent.keyDown(within(screen.getByRole('dialog')).getByRole('link', { name: /Open source/ }), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(closeDocument).not.toHaveBeenCalled();
});
test('changing the cited source closes the old quote and requires a new hover', () => {
  const { rerender } = render(<RegulationLink citationId="dtr3.appO.K.2.e(6)">Keys and combinations</RegulationLink>); fireEvent.focus(link());
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  rerender(<RegulationLink citationId="dtr3.appP.C.1">Formula</RegulationLink>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
