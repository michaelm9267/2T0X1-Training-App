import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FloatingWindow from './FloatingWindow';
import App from '../../App';
import * as workflow from '../CargoWindow/workflow';

// jsdom has no PointerEvent; a MouseEvent carries the pointer coordinates the drag needs.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent { constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId; } };

beforeEach(() => { window.localStorage.clear(); jest.spyOn(workflow, 'randomDestination').mockReturnValue('FB5294'); });
afterEach(() => { jest.restoreAllMocks(); });

test('a document window moves by its title bar, minimizes, and closes on Escape', () => {
  const onClose = jest.fn();
  render(<FloatingWindow title="DD Form 1149" onClose={onClose}><p>Form body</p></FloatingWindow>);
  const win = screen.getByRole('dialog', { name: 'DD Form 1149' });
  expect(win).not.toHaveAttribute('aria-modal');
  const bar = screen.getByLabelText(/DD Form 1149 title bar/);
  const left = parseFloat(win.style.left), top = parseFloat(win.style.top);
  fireEvent.pointerDown(bar, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(bar, { clientX: 40, clientY: 140, pointerId: 1 });
  fireEvent.pointerUp(bar, { pointerId: 1 });
  expect([parseFloat(win.style.left) - left, parseFloat(win.style.top) - top]).toEqual([-60, 40]);
  bar.focus();
  fireEvent.keyDown(bar, { key: 'ArrowLeft' });
  expect(parseFloat(win.style.left) - left).toBe(-70);
  userEvent.click(screen.getByRole('button', { name: 'Minimize DD Form 1149' }));
  expect(screen.getByText('Form body')).not.toBeVisible();
  userEvent.click(screen.getByRole('button', { name: 'Restore DD Form 1149' }));
  fireEvent.keyDown(screen.getByText('Form body'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('the DSOE stays open while the trainee keeps working in the page', () => {
  render(<App />);
  userEvent.click(screen.getByRole('button', { name: 'View DSOE' }));
  expect(screen.getByRole('dialog', { name: 'Deployment Schedule of Events' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: '2. Incheck' }));
  expect(screen.getByRole('heading', { name: 'Incheck' })).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Deployment Schedule of Events' })).toBeInTheDocument();
});

test('each section button opens or closes its section, and all can collapse or expand', () => {
  render(<App />);
  const jump = screen.getByRole('navigation', { name: 'Jump to section' });
  const checklist = () => screen.getByRole('button', { name: 'Stage checklist' });
  userEvent.click(within(jump).getByRole('button', { name: 'Close Stage checklist' }));
  expect(checklist()).toHaveAttribute('aria-expanded', 'false');
  userEvent.click(within(jump).getByRole('button', { name: 'Open Stage checklist' }));
  expect(checklist()).toHaveAttribute('aria-expanded', 'true');
  // Closing from the card heading updates its button too.
  userEvent.click(checklist());
  expect(within(jump).getByRole('button', { name: 'Open Stage checklist' })).toHaveAttribute('aria-pressed', 'false');
  userEvent.click(within(jump).getByRole('button', { name: 'Collapse all' }));
  expect(screen.getByRole('button', { name: 'Cargo frustration' })).toHaveAttribute('aria-expanded', 'false');
  userEvent.click(within(jump).getByRole('button', { name: 'Expand all' }));
  expect(screen.getByRole('button', { name: 'Cargo frustration' })).toHaveAttribute('aria-expanded', 'true');
  expect(within(jump).getByRole('button', { name: 'Close Cargo frustration' })).toHaveAttribute('aria-pressed', 'true');
});

test('the section opened last moves to the top of the panel and goes back when closed', () => {
  render(<App />);
  const jump = screen.getByRole('navigation', { name: 'Jump to section' });
  const card = label => screen.getByRole('region', { name: label });
  userEvent.click(within(jump).getByRole('button', { name: 'Close Stage checklist' }));
  userEvent.click(within(jump).getByRole('button', { name: 'Close Cargo frustration' }));
  userEvent.click(within(jump).getByRole('button', { name: 'Open Stage checklist' }));
  expect(card('Stage checklist')).toHaveStyle({ order: '-1' });
  // Opening another from its own heading takes the top; the first goes back to its place.
  userEvent.click(screen.getByRole('button', { name: 'Cargo frustration' }));
  expect(card('Cargo frustration')).toHaveStyle({ order: '-1' });
  expect(card('Stage checklist').style.order).toBe('');
  // Closing it returns the top to the section opened before it that is still open.
  userEvent.click(within(jump).getByRole('button', { name: 'Close Cargo frustration' }));
  expect(card('Cargo frustration').style.order).toBe('');
  expect(card('Stage checklist')).toHaveStyle({ order: '-1' });
  userEvent.click(within(jump).getByRole('button', { name: 'Collapse all' }));
  expect(card('Stage checklist').style.order).toBe('');
});
