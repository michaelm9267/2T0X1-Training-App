import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from './AuthGate';
import * as client from './firebaseClient';
import { publishSave } from '../../cloudBridge';
import { cmosUser } from '../../currentUser';

jest.mock('./firebaseClient', () => ({
  onAuth: jest.fn(),
  signInEmail: jest.fn(),
  signInGoogle: jest.fn(),
  resetPassword: jest.fn(),
  signOut: jest.fn(),
  allowlistEntry: jest.fn(),
  touchProfile: jest.fn(() => Promise.resolve()),
  readCourse: jest.fn(() => Promise.resolve(null)),
  writeCourse: jest.fn(() => Promise.resolve()),
}));

let authCallback;
beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  client.onAuth.mockImplementation((callback) => { authCallback = callback; return () => {}; });
  // CRA resets mock implementations before each test.
  client.touchProfile.mockResolvedValue();
  client.readCourse.mockResolvedValue(null);
  client.writeCourse.mockResolvedValue();
  client.signInEmail.mockResolvedValue();
});
const signedIn = (email = 'trainee@example.com') => authCallback({ uid: 'u1', email, displayName: 'T' });

test('signed-out visitors see only the sign-in screen', async () => {
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => authCallback(null));
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  expect(screen.queryByText('Training app')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'trainee@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
  userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(client.signInEmail).toHaveBeenCalledWith('trainee@example.com', 'secret');
});

test('a wrong password shows a plain message', async () => {
  client.signInEmail.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => authCallback(null));
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'a@b.co' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } });
  userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
});

test('a signed-in user who is not on the allow-list is turned away', async () => {
  client.allowlistEntry.mockResolvedValue(null);
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => signedIn('stranger@example.com'));
  expect(await screen.findByRole('alert')).toHaveTextContent('stranger@example.com is not on the approved list');
  expect(screen.queryByText('Training app')).not.toBeInTheDocument();
});

test('an approved trainee gets the app, their cloud work restored, and saves mirrored', async () => {
  client.allowlistEntry.mockResolvedValue({ role: 'trainee' });
  client.readCourse.mockImplementation(async (uid, course) => course === 'outbound'
    ? { data: JSON.stringify({ version: 5, mode: 'guided', stepId: 'pack' }), cmos: null, updatedAt: 5 }
    : null);
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => signedIn());
  expect(await screen.findByText('Training app')).toBeInTheDocument();
  expect(screen.getByText(/Signed in as/)).toHaveTextContent('Signed in as T · Trainee');
  expect(JSON.parse(window.localStorage.getItem('outbound-trainer-session')).stepId).toBe('pack');
  expect(client.touchProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ role: 'trainee' }));
  publishSave('outbound', { version: 5, mode: 'guided', stepId: 'mark' });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  await waitFor(() => expect(client.writeCourse).toHaveBeenCalledWith('u1', 'outbound', expect.anything()), { timeout: 5000 });
  delete document.visibilityState;
});

test('the demo account opens the app without cloud saving', async () => {
  client.allowlistEntry.mockResolvedValue({ role: 'demo' });
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => signedIn('demo@example.com'));
  expect(await screen.findByText(/Demo · work is not saved/)).toBeInTheDocument();
  expect(client.readCourse).not.toHaveBeenCalled();
  publishSave('cdf', { mode: 'guided' });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(client.writeCourse).not.toHaveBeenCalled();
});

test('the account bar shows the name from the allow-list, falling back to the email', async () => {
  client.allowlistEntry.mockResolvedValue({ role: 'instructor', name: 'SSgt Michael May' });
  const { unmount } = render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => authCallback({ uid: 'u2', email: 'mm@example.com', displayName: null }));
  expect(await screen.findByText(/Signed in as/)).toHaveTextContent('Signed in as SSgt Michael May · Instructor');
  expect(cmosUser()).toBe('SSGT MICHAEL MAY');
  unmount();
  client.allowlistEntry.mockResolvedValue({ role: 'trainee' });
  render(<AuthGate><p>Training app</p></AuthGate>);
  await waitFor(() => authCallback({ uid: 'u3', email: 'new@example.com', displayName: null }));
  expect(await screen.findByText(/Signed in as/)).toHaveTextContent('Signed in as new@example.com · Trainee');
});
