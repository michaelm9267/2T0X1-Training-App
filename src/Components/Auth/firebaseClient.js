import {splitPayload, joinPayload} from './wapsPayload';
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, sendPasswordResetEmail, signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

// The Firebase web config identifies the project; it is not a secret. Access is enforced by
// Firebase Authentication and the Firestore security rules (firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyCrY1wH0J30DC7lFY_adyEpQdSMrvduA9Q',
  authDomain: 't0x1-training-app.firebaseapp.com',
  projectId: 't0x1-training-app',
  storageBucket: 't0x1-training-app.firebasestorage.app',
  messagingSenderId: '152305525573',
  appId: '1:152305525573:web:d4137ddc6a73f40ed8542c',
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const onAuth = (callback) => onAuthStateChanged(auth, callback);
export const signInEmail = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const signOut = () => firebaseSignOut(auth);

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    // Some managed browsers block pop-ups; fall back to a full-page redirect.
    if (error?.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
    throw error;
  }
}

// allowlist/{email} → { role: "trainee" | "instructor" | "demo" }, or null when not listed.
export async function allowlistEntry(email) {
  const snap = await getDoc(doc(db, 'allowlist', String(email || '').toLowerCase()));
  return snap.exists() ? snap.data() : null;
}

export const touchProfile = (uid, profile) =>
  setDoc(doc(db, 'users', uid), { ...profile, lastSeenAt: Date.now() }, { merge: true });

// One session document per course, plus its simulated CMOS database in cmos/store.
export async function readCourse(uid, course) {
  const sessionRef = doc(db, 'users', uid, 'sessions', course);
  if (course === 'waps') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) return null;
      const header = snap.data();
      if (!header.payload) return {...header, cmos: null}; // legacy single-document snapshot
      if (!Number.isInteger(header.payload.parts) || header.payload.parts < 1 || header.payload.parts > 400) throw new Error('Invalid saved WAPS snapshot.');
      const snapshots = await Promise.all(Array.from({length: header.payload.parts}, (_, i) => getDoc(doc(sessionRef, 'payloads', String(i)))));
      try {return {...header, data: joinPayload(snapshots.map(p => p.exists() ? p.data() : null), header.payload), cmos: null};}
      catch { /* Header and chunks straddled a concurrent batch write; fetch the current generation. */ }
    }
    throw new Error('WAPS progress changed while loading. Try signing in again.');
  }
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return null;
  const store = await getDoc(doc(sessionRef, 'cmos', 'store'));
  return { ...snap.data(), cmos: store.exists() ? store.data().json : null };
}

export async function writeCourse(uid, course, { session, cmos }) {
  const sessionRef = doc(db, 'users', uid, 'sessions', course);
  if (course === 'waps') {
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const parts = splitPayload(session.data, generation);
    const previous = await getDoc(sessionRef);
    const previousCount = previous.exists() ? previous.data().payload?.parts || 0 : 0;
    const batch = writeBatch(db);
    parts.forEach((part, i) => batch.set(doc(sessionRef, 'payloads', String(i)), part));
    // Fixed slots prevent old generations accumulating indefinitely. Batch updates are atomic;
    // generation checks on read detect a reader spanning two commits.
    for (let i = parts.length; i < Math.min(previousCount, 400); i += 1) batch.delete(doc(sessionRef, 'payloads', String(i)));
    const {data, ...summary} = session;
    batch.set(sessionRef, {...summary, payload: {generation, parts: parts.length}});
    await batch.commit();
    return;
  }
  if (cmos !== undefined) await setDoc(doc(sessionRef, 'cmos', 'store'), { json: cmos, updatedAt: session.updatedAt });
  await setDoc(sessionRef, session);
}
