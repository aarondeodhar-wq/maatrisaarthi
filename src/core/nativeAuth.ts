// Native sign-in for the Android app (Capacitor).
//
// Google blocks OAuth popups inside WebViews, and Firebase's web reCAPTCHA is unreliable
// there, so in the Android app Google and phone sign-in run through the native Firebase
// SDK (@capacitor-firebase/authentication). The native result is handed to the Firebase
// JS SDK via signInWithCredential, so the JS SDK stays the single source of auth state
// that Firestore and security rules use.

import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Auth, GoogleAuthProvider, PhoneAuthProvider, signInWithCredential, User } from 'firebase/auth';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function nativeGoogleSignIn(auth: Auth): Promise<User> {
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return a token. Google sign-in may not be configured for the Android app yet.');
  }
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return cred.user;
}

let pendingVerificationId: string | null = null;

/**
 * Sends the SMS code natively. Resolves when the code has been sent and the user
 * must type it in. Rejects if verification fails.
 */
export async function nativeSendPhoneOtp(phoneE164: string): Promise<void> {
  pendingVerificationId = null;
  await FirebaseAuthentication.removeAllListeners();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    Promise.all([
      FirebaseAuthentication.addListener('phoneCodeSent', event => {
        pendingVerificationId = event.verificationId;
        finish(resolve);
      }),
      FirebaseAuthentication.addListener('phoneVerificationFailed', event => {
        finish(() => reject(new Error(event.message || 'Phone verification failed.')));
      })
    ])
      .then(() => FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phoneE164, skipNativeAuth: true }))
      .catch(err => finish(() => reject(err)));
  });
}

/**
 * Confirms the SMS code with the Firebase JS SDK and returns the signed-in user.
 */
export async function nativeConfirmPhoneOtp(auth: Auth, code: string): Promise<User> {
  if (!pendingVerificationId) {
    throw new Error('Please request an OTP first.');
  }
  const credential = PhoneAuthProvider.credential(pendingVerificationId, code.trim());
  const result = await signInWithCredential(auth, credential);
  pendingVerificationId = null;
  return result.user;
}

/**
 * Clears any native session (e.g. the cached Google account choice).
 */
export async function nativeSignOut(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await FirebaseAuthentication.signOut();
  } catch (e) {
    // Nothing signed in natively
  }
}
