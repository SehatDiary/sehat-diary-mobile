# Sehat Diary — Mobile

React Native (Expo) app for [Sehat Diary](https://github.com/SehatDiary/sehat_diary),
a family health diary for the Indian market.

> Scan your prescription, understand it in Hindi, get reminded to take
> medicines, keep all reports in one place. — *Apni sehat, apni diary.*

Two people use this app:

- **Caregiver** (Rahul, 34) — manages elderly parents remotely: scans
  prescriptions, tracks adherence, follows up on tests and referrals
- **Patient** (Papa, 65+) — Hindi speaker: reads today's medicines, marks them
  taken, reads what the doctor said in Hindi

## Quick start

Requires **Node 20+** (see `engines` in `package.json`) and the Rails API
running locally.

```bash
npm ci

# Physical device: point the app at your machine's LAN IP
EXPO_PUBLIC_API_BASE=http://192.168.1.5:3000/api/v1 npx expo start

# Emulator/simulator: the default works (10.0.2.2 on Android, localhost on iOS)
npx expo start
```

Full local setup, including running Rails so a phone can reach it, is in
[DEV_SETUP.md](DEV_SETUP.md).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` | Launch on a device or emulator |
| `npm test` | Jest — API contract tests and pure-logic unit tests |
| `npm run typecheck` | `tsc --noEmit` |

CI runs `typecheck` and `test` on every PR (`.github/workflows/ci.yml`).

## How the code is arranged

```
src/
├── api/          One module per endpoint family; adapts wire shapes to app types
│   └── __tests__/  Contract tests — fixtures copied from the API contract doc
├── hooks/        React Query wrappers around the api modules
├── screens/
│   ├── auth/       OTP request and verify
│   ├── caregiver/  Dashboard, family, sessions, prescriptions, lab reports
│   ├── patient/    Daily medicines, visit history, medicine detail, caregivers
│   └── common/     Settings
├── navigation/   Root gate → CaregiverNavigator | PatientNavigator (by role)
├── services/     Notifications, and pure helpers extracted for testing
├── store/        Zustand auth store (token in SecureStore)
├── i18n/         hi.ts + en.ts — Hindi is primary for patient-facing text
└── types/        Wire shapes; mirror the backend contract doc
```

## Working with the API

`sehat_diary/docs/API_CONTRACT.md` is the source of truth for every response
shape. Two rules keep the two repos from drifting apart again:

1. When a response shape changes, update the contract doc in the same PR.
2. Mirror the change in `src/types/` **and** in the matching
   `src/api/__tests__/*.contract.test.ts` fixture, so a mismatch fails CI
   rather than silently rendering an empty screen.

## Conventions

- **Hindi first** on patient-facing text; English is a fallback, never a
  default. Patient screens use ≥18px type — the reader is 65+.
- **No hardcoded user-facing strings** — everything goes through `i18n.t`, with
  keys present in both `en.ts` and `hi.ts`.
- **Never auto-save AI extraction.** The prescription confirm screen gates on
  per-medicine confidence; low-confidence rows must be reviewed before
  medicines are created.
- Extract pure logic (de-dup rules, gates, text selection) into its own module
  so it can be unit-tested without native modules.

## Releases

`eas.json` defines a `preview` profile that builds an installable APK for beta
families; see [BETA_INSTRUCTIONS.md](BETA_INSTRUCTIONS.md) and
[QA_CHECKLIST.md](QA_CHECKLIST.md).

```bash
eas build --profile preview --platform android
```
