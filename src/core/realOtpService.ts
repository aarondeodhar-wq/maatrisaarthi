// SMS OTP login using Firebase Phone Authentication.
// Codes are generated, sent and verified by Firebase only; nothing is generated
// or stored on the device, and there are no bypass codes.

import { auth } from './firebaseAuth';
import { isNativeApp, nativeSendPhoneOtp, nativeConfirmPhoneOtp } from './nativeAuth';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User
} from 'firebase/auth';

// In-memory holder for Firebase ConfirmationResult
let activeConfirmationResult: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initializes or gets the invisible reCAPTCHA verifier for Firebase Phone Auth
 */
export function setupRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch (e) {
      // Ignored
    }
  }

  activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return activeRecaptchaVerifier;
}

/**
 * Formats a 10-digit or local number to E.164 international format (+91 for India)
 */
export function formatToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (phone.startsWith('+')) {
    return phone;
  }
  return `+91${digits}`;
}

/**
 * Sends a 6-digit SMS OTP via Firebase Phone Auth. Throws on failure.
 */
export async function dispatchRealSmsOtp(
  phoneNumber: string,
  containerId: string = 'recaptcha-container'
): Promise<void> {
  // The Android app sends the SMS through the native SDK (no reCAPTCHA in the WebView)
  if (isNativeApp()) {
    await nativeSendPhoneOtp(formatToE164(phoneNumber));
    return;
  }
  const verifier = setupRecaptcha(containerId);
  activeConfirmationResult = await signInWithPhoneNumber(auth, formatToE164(phoneNumber), verifier);
}

/**
 * Verifies the OTP with Firebase and returns the signed-in Firebase user. Throws on failure.
 */
export async function verifyRealSmsOtp(enteredCode: string): Promise<User> {
  if (isNativeApp()) {
    return nativeConfirmPhoneOtp(auth, enteredCode);
  }
  if (!activeConfirmationResult) {
    throw new Error('Please request an OTP first.');
  }
  const credential = await activeConfirmationResult.confirm(enteredCode.trim());
  activeConfirmationResult = null;
  return credential.user;
}
