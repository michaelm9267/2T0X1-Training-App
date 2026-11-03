import { useEffect, useRef, useState } from 'react';
import { onSave } from '../../cloudBridge';
import { setCurrentUser } from '../../currentUser';
import * as client from './firebaseClient';
import { createCloudSync, hydrate, clearLocal, claimLocal } from './cloudSync';
import WapsStudyTool from '../Waps/WapsStudyTool';
import CfetpCenter from '../Cfetp/CfetpCenter';
import AcronymTooltip from '../Glossary/AcronymTooltip';
import './auth.css';

// The app opens only for signed-in users on the instructor's allow-list. Trainee and instructor
// work is mirrored to their account; a demo account (for showcasing the app) keeps work in this
// browser only and starts fresh at each sign-in. The WAPS Study Tool and the CFETP / TTG trainer
// guide are open to signed-out visitors (guest mode, or a link ending in #waps or #cfetp); what
// they save stays in this browser.
const ERRORS = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
  'auth/network-request-failed': 'No connection to the sign-in service. Check the network and try again.',
};
const ROLE_LABELS = { instructor: 'Instructor', trainee: 'Trainee', demo: 'Demo · work is not saved after sign-out' };
const message = (error) => ERRORS[error?.code] || 'Sign-in failed. Try again or contact your instructor.';

function Shell({ children }) {
  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand">
        <img src={`${process.env.PUBLIC_URL}/transitiq-mark.svg`} alt="" />
        <div><h1 id="auth-title">Transit IQ</h1><span>2T0X1 Training Portal</span></div>
      </div>
      {children}
    </section>
  </main>;
}

const GUEST_TOOLS = {
  waps: { hash: '#waps', label: '2T0 WAPS Study Tool', note: 'progress is saved in this browser only', Tool: WapsStudyTool },
  cfetp: { hash: '#cfetp', label: 'CFETP / TTGs', note: 'session lists and training ticks are saved in this browser only', Tool: CfetpCenter },
};
const guestFromHash = () => Object.keys(GUEST_TOOLS).find(id => GUEST_TOOLS[id].hash === window.location.hash) || null;

function SignIn({ onGuest }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const run = async (task) => {
    setBusy(true); setNotice(null);
    try { await task(); } catch (error) { setNotice({ error: true, text: message(error) }); }
    setBusy(false);
  };
  return <Shell>
    <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => client.signInEmail(email, password)); }}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button type="submit" className="auth-primary" disabled={busy}>Sign in</button>
      <button type="button" className="auth-link" disabled={busy} onClick={() => {
        if (!email.trim()) { setNotice({ error: true, text: 'Enter your email first, then choose Forgot password.' }); return; }
        run(async () => { await client.resetPassword(email); setNotice({ text: 'If that account exists, a password reset email is on its way.' }); });
      }}>Forgot password?</button>
    </form>
    <div className="auth-divider"><span>or</span></div>
    <button type="button" className="auth-google" disabled={busy} onClick={() => run(client.signInGoogle)}>
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" /><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" /><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" /><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" /></svg>
      Sign in with Google
    </button>
    {notice && <p className={notice.error ? 'auth-error' : 'auth-note'} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
    <p className="auth-fine">Accounts are issued by your instructor.</p>
    <div className="auth-divider"><span>no account?</span></div>
    <div className="auth-guest-options">
      <button type="button" className="auth-guest" onClick={() => onGuest('waps')}>Study for WAPS without signing in</button>
      <button type="button" className="auth-guest" onClick={() => onGuest('cfetp')}>Open the CFETP / TTG trainer guide without signing in</button>
    </div>
  </Shell>;
}

function Guest({ tool, onSwitch, onSignIn }) {
  const { label, note, Tool } = GUEST_TOOLS[tool];
  const other = tool === 'waps' ? 'cfetp' : 'waps';
  return <>
    <div className="auth-account-bar">
      <span><strong>Guest</strong> · {label} · {note}</span>
      <button type="button" onClick={() => onSwitch(other)}>Open {GUEST_TOOLS[other].label}</button>
      <button type="button" onClick={onSignIn}>Sign in</button>
    </div>
    <Tool />
    <AcronymTooltip />
  </>;
}

export default function AuthGate({ children }) {
  const [state, setState] = useState({ phase: 'loading' });
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => {window.removeEventListener('online', update); window.removeEventListener('offline', update);};
  }, []);
  const [guest, setGuest] = useState(guestFromHash);
  const setGuestMode = (tool) => {
    setGuest(tool);
    window.history.replaceState(null, '', tool ? GUEST_TOOLS[tool].hash : window.location.pathname + window.location.search);
  };
  const guestView = tool => <Guest tool={tool} onSwitch={setGuestMode} onSignIn={() => setGuestMode(null)} />;
  const sync = useRef(null);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    if (!online) return undefined;
    let revision = 0;
    const unsubscribe = client.onAuth(async (user) => {
      const current = ++revision;
      const isCurrent = () => revision === current;
      sync.current?.stop(); sync.current = null;
      setSyncError('');
      if (!user) {
        try { if (JSON.parse(localStorage.getItem('transit-iq-cloud'))?.uid) clearLocal(); } catch { /* no owned browser snapshot */ }
        setCurrentUser(''); setState({phase: 'signedOut'}); return;
      }
      setState({phase: 'checking', user});
      try {
        const entry = await client.allowlistEntry(user.email);
        if (!isCurrent()) return;
        if (!entry) {setState({phase: 'denied', user}); return;}
        const role = entry.role || 'trainee';
        if (role === 'demo') claimLocal(user.uid);
        else {
          await hydrate({uid: user.uid, readCourse: client.readCourse, isCurrent});
          if (!isCurrent()) return;
          client.touchProfile(user.uid, {email: user.email.toLowerCase(), displayName: user.displayName || '', role}).catch(() => {});
          sync.current = createCloudSync({uid: user.uid, writeCourse: client.writeCourse,
            onError: () => {if (isCurrent()) setSyncError('Account sync is unavailable. Your work is saved in this browser and will retry.');},
            onSuccess: () => {if (isCurrent()) setSyncError('');}});
          try {const waps = JSON.parse(localStorage.getItem('waps-progress-e5')); if (waps) sync.current.handleSave('waps', waps);} catch { /* no valid browser WAPS snapshot */ }
        }
        const name = String(entry.name || user.displayName || user.email).trim();
        setCurrentUser(role === 'demo' ? 'Demo' : name);
        setState({phase: 'ready', user, role, name});
      } catch (error) {
        if (!isCurrent()) return;
        console.error('Transit IQ sign-in setup failed', error);
        setState({phase: 'error', user});
      }
    });
    return () => {revision += 1; unsubscribe();};
  }, [online]);

  // Keep collecting local edits while offline; stop only when the gate unmounts or the
  // next authenticated account replaces the sync instance.
  useEffect(() => () => sync.current?.stop(), []);

  useEffect(() => {
    if (state.phase !== 'ready') return undefined;
    const unsubscribe = onSave((course, session) => sync.current?.handleSave(course, session));
    const flush = () => { if (document.visibilityState === 'hidden') sync.current?.flush({ final: true }); };
    const pagehide = () => sync.current?.flush({ final: true });
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', pagehide);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [state.phase]);

  async function signOut() {
    setState((current) => ({ ...current, phase: 'signingOut' }));
    let saved = false;
    try { saved = (await sync.current?.flush({final: true})) !== false; } catch { /* preserve work unless explicitly discarded */ }
    if (!saved && !window.confirm('Your latest work has not reached your account. Sign out and erase this browser’s unsent copy anyway?')) {
      setState(current => ({...current, phase: 'ready'}));
      return;
    }
    sync.current?.stop();
    clearLocal();
    await client.signOut();
    window.location.reload();
  }

  if (!online && state.phase !== 'ready') return guestView(guest || 'waps');
  if (state.phase === 'loading' || state.phase === 'checking') return <Shell><p className="auth-note" role="status">Signing in…</p></Shell>;
  if (state.phase === 'signedOut') return guest ? guestView(guest) : <SignIn onGuest={setGuestMode} />;
  if (state.phase === 'signingOut') return <Shell><p className="auth-note" role="status">Saving your work and signing out…</p></Shell>;
  if (state.phase === 'denied' || state.phase === 'error') return <Shell>
    <p className="auth-error" role="alert">{state.phase === 'denied'
      ? `${state.user.email} is not on the approved list for Transit IQ. Ask your instructor to add you.`
      : 'Your saved work could not be loaded. Check the connection and sign in again.'}</p>
    <button type="button" className="auth-primary" onClick={() => client.signOut()}>Sign out</button>
  </Shell>;
  return <>
    <div className="auth-account-bar">
      <span title={state.user.email}>Signed in as <strong>{state.name}</strong>{ROLE_LABELS[state.role] ? ` · ${ROLE_LABELS[state.role]}` : ''}</span>
      <button type="button" onClick={signOut}>Sign out</button>
    </div>
    {syncError && <p className="auth-note" role="status">{syncError}</p>}
    {children}
  </>;
}
