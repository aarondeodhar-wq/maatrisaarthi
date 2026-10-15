# MaatriSaarthi

Maternal health tracking for ASHA workers, PHC doctors, ward officers and pregnant mothers,
in Marathi, Hindi and English. React + TypeScript + Vite, Firebase (Auth + Firestore), and
Capacitor for the Android app.

## Status

This is a prototype. Read these limits before using it with real patients:

- **Risk triage is rule-based**, using hand-set thresholds for blood pressure, hemoglobin,
  blood sugar and danger signs. It is not a trained ML model and its accuracy has not been
  validated on labelled clinical data. It supports clinical judgement and does not replace it.
- **SMS/WhatsApp alerts are only sent if `VITE_ALERT_GATEWAY_URL` is configured.** Without
  it, every alert is reported as NOT SENT.
- **There is no 108 integration.** The SOS button opens the phone dialer for 108, and a
  person must place the call.
- Some screens still show demo content (sample mothers in `src/data/mockMaternalData.ts`).
- **Random BP, sugar and SpO2 entry: declined.** Vitals are only recorded during structured ANC contacts under the verified time-limited QR/PIN scan window. Unverified ad-hoc entries are excluded to preserve clinical data integrity.
- **Mother-side medicine entry: not added.** Prescriptions and medications can only be issued by PHC doctors or recorded by verified ASHA field workers during home visits; pregnant mothers cannot self-enter medications.

## Setup

```bash
npm install
cp .env.example .env    # fill in the Firebase web config
npm run dev
```

### Firebase project setup

1. Authentication → Sign-in method: enable **Email/Password**, **Phone** and **Google**.
2. Authentication → Settings → Authorized domains: add your hosting domain(s).
3. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules,database
   ```
4. Create the first ward officer: sign up in the app as Ward Officer, then set
   `approved: true` on that user's `user_accounts/{uid}` document in the Firebase console.
   Approved ward officers can approve other staff accounts.

## Access model

Identity comes from Firebase Auth. Each user has a profile at `user_accounts/{uid}` holding
their `role` and `approved` flag. Users cannot change either field themselves (see
[firestore.rules](firestore.rules)).

| Role | Can access |
|---|---|
| Mother | Only her own record (`mothers/{id}` where `ownerUid` is her uid); can update her consent settings |
| ASHA worker (approved) | Mothers where `assignedAshaUid` is her uid; mothers she registers are assigned to her |
| PHC doctor (approved) | All mothers; can issue prescriptions |
| Ward officer (approved) | All mothers; can approve staff and assign ASHA workers |

Staff accounts start unapproved and see a "pending approval" screen until approved.
Mothers registered by an ASHA worker have no `ownerUid` until linked, so they cannot yet
sign in to see their own record.

## Offline sync

Changes (registrations, vitals, prescriptions) are queued in local storage with the full
updated record. When online, each is written to Firestore immediately and removed from the
queue only after the write succeeds. Failed writes stay queued and are retried on the next
sync. Incoming cloud data is merged with local records that still have queued changes.

## Android

```bash
npm run android:sync   # builds web assets and syncs them into android/
npm run android:open   # opens Android Studio
```

The Capacitor config disables WebView debugging, mixed content and cleartext traffic. Build
a signed release APK before distributing it. Note that Google sign-in via popup and Firebase
phone-auth reCAPTCHA have limitations inside an Android WebView.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Run oxlint |
