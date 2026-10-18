import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, sendPasswordResetEmail, signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return null;
  const store = await getDoc(doc(sessionRef, 'cmos', 'store'));
  return { ...snap.data(), cmos: store.exists() ? store.data().json : null };
}

export async function writeCourse(uid, course, { session, cmos }) {
  const sessionRef = doc(db, 'users', uid, 'sessions', course);
  if (cmos !== undefined) await setDoc(doc(sessionRef, 'cmos', 'store'), { json: cmos, updatedAt: session.updatedAt });
  await setDoc(sessionRef, session);
}
