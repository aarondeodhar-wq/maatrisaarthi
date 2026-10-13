// Firebase Authentication & User Profile Management (MaatriSaarthi Health Cloud)
//
// Identity is owned by Firebase Auth. The user's role lives in Firestore at
// user_accounts/{uid}; firestore.rules prevents users from changing their own
// role or approval flag, so the client cannot grant itself privileges.

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { isNativeApp, nativeGoogleSignIn, nativeSignOut } from './nativeAuth';

// Live Firebase Project Configuration (MaatriSaarthi Cloud)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCssYrkWLs_EMeXxGhkzCSAQofU113Fwk0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "maatrisaarthi.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "maatrisaarthi",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "maatrisaarthi.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "536118937101",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:536118937101:web:9458bd11ccf7401b55b744",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0Z4JE7HWHW"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  role: UserRole;
  // Staff accounts start unapproved; a Ward Officer (or the Firebase console) sets this to true.
  approved: boolean;
  email?: string;
  village?: string;
  lmp?: string;
  doctorReg?: string;
  beneficiaryId?: string;   // MOTHER accounts: the mothers/{id} record they own
  createdAt: string;
}

// Remove data written by earlier builds: a plaintext user/password registry,
// a forgeable session object, and locally generated OTP codes.
try {
  localStorage.removeItem('maatrisaarthi_firebase_users_v3');
  localStorage.removeItem('maatri_active_session');
  Object.keys(localStorage)
    .filter(k => k.startsWith('otp_'))
    .forEach(k => localStorage.removeItem(k));
} catch (e) {}

// Offline cache of the signed-in user's profile so ASHA workers can reopen the app
// without connectivity. It only drives the UI; Firestore rules still enforce access.
const PROFILE_CACHE_KEY = 'maatrisaarthi_profile_cache';

function cacheProfile(profile: UserProfile | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (e) {}
}

function getCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: UserProfile = JSON.parse(raw);
    return parsed.uid === uid ? parsed : null;
  } catch (e) {
    return null;
  }
}

/**
 * Firebase email/password auth needs an email, so phone-number accounts use a
 * deterministic internal address derived from the 10-digit mobile number.
 */
export function phoneToAuthEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `${digits}@phone.maatrisaarthi.app`;
}

function identifierToAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  return trimmed.includes('@') ? trimmed.toLowerCase() : phoneToAuthEmail(trimmed);
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'user_accounts', uid));
    const profile = snap.exists() ? (snap.data() as UserProfile) : null;
    cacheProfile(profile);
    return profile;
  } catch (err) {
    // Network failure: fall back to the cached profile for this same uid
    return getCachedProfile(uid);
  }
}

async function createProfile(profile: UserProfile): Promise<UserProfile> {
  await setDoc(doc(db, 'user_accounts', profile.uid), stripUndefined(profile));
  cacheProfile(profile);
  return profile;
}

/**
 * Returns the Firestore profile for a freshly authenticated Firebase user,
 * creating one with the requested role if this is their first sign-in.
 * Staff roles are created unapproved.
 */
export async function ensureUserProfile(user: User, requestedRole: UserRole, name?: string): Promise<UserProfile> {
  const existing = await fetchUserProfile(user.uid);
  if (existing) return existing;
  return createProfile({
    uid: user.uid,
    name: name || user.displayName || user.phoneNumber || 'MaatriSaarthi User',
    phone: user.phoneNumber || '',
    email: user.email || undefined,
    role: requestedRole,
    approved: requestedRole === 'MOTHER',
    createdAt: new Date().toISOString()
  });
}

/**
 * Google Account Login (no fallback: a failed popup is a failed login)
 */
export const loginWithGoogleAccount = async (role: UserRole): Promise<UserProfile> => {
  // Popups do not work inside the Android WebView, so the app uses native Google sign-in
  const user = isNativeApp()
    ? await nativeGoogleSignIn(auth)
    : (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  return ensureUserProfile(user, role);
};

/**
 * Register a new Firebase Auth account (phone + password) and its profile
 */
export const registerUserAccount = async (params: {
  name: string;
  phone: string;
  role: UserRole;
  village: string;
  password: string;
  lmp?: string;
  doctorReg?: string;
}): Promise<UserProfile> => {
  const cred = await createUserWithEmailAndPassword(auth, phoneToAuthEmail(params.phone), params.password);
  return createProfile({
    uid: cred.user.uid,
    name: params.name.trim(),
    phone: params.phone.trim(),
    role: params.role,
    approved: params.role === 'MOTHER',
    village: params.village.trim(),
    lmp: params.lmp,
    doctorReg: params.doctorReg || undefined,
    createdAt: new Date().toISOString()
  });
};

/**
 * Sign in with mobile number (or email) and password, verified by Firebase Auth
 */
export const signInWithPassword = async (identifier: string, password: string): Promise<UserProfile> => {
  const cred = await signInWithEmailAndPassword(auth, identifierToAuthEmail(identifier), password);
  const profile = await fetchUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('No MaatriSaarthi profile exists for this account. Please sign up first.');
  }
  return profile;
};

/**
 * Links a MOTHER account to the beneficiary record she created at sign-up
 */
export async function linkBeneficiaryToProfile(uid: string, beneficiaryId: string): Promise<void> {
  await updateDoc(doc(db, 'user_accounts', uid), { beneficiaryId });
  const cached = getCachedProfile(uid);
  if (cached) cacheProfile({ ...cached, beneficiaryId });
}

export async function signOutUser(): Promise<void> {
  cacheProfile(null);
  await nativeSignOut();
  await signOut(auth);
}

/**
 * Subscribes to Firebase Auth state. Calls back with the user's profile, or null
 * when signed out. Signed-in users without a profile yet (mid-registration) are
 * reported as null and picked up by the explicit login callback instead.
 */
export function subscribeToAuthProfile(onChange: (profile: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChange(null);
      return;
    }
    onChange(await fetchUserProfile(user.uid));
  });
}

/**
 * Human-readable message for Firebase Auth error codes
 */
export function describeAuthError(err: any): string {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Incorrect mobile number or password.';
    case 'auth/email-already-in-use':
      return 'An account with this mobile number already exists. Please sign in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP code.';
    case 'auth/code-expired':
      return 'This OTP has expired. Please request a new one.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for MaatriSaarthi yet. Please contact your administrator.';
    case 'auth/network-request-failed':
      return 'No network connection. Please try again when online.';
    default:
      return err?.message || 'Sign-in failed.';
  }
}
