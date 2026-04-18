# Sehat Diary — QA Checklist (v1)

End-to-end QA script for a Sehat Diary release candidate. Work top-to-bottom on a real device. File a GitHub issue for anything that fails; do not continue past a blocked section without noting it.

---

## 0. Pre-flight

- [ ] Tester has both a real iOS device and a real Android device (emulators are acceptable for feature work but not for push-notification verification)
- [ ] Both devices have the release-candidate build installed (EAS `preview` APK for Android, TestFlight or EAS `preview` for iOS)
- [ ] Both devices have a working SIM or OTP-reachable phone number
- [ ] Backend staging (or prod, if no staging) is reachable — check `/api/v1/health` returns `{ status: "ok" }`
- [ ] Tester can read both Hindi and English (or has someone who can for Hindi verification)

## 1. Known v1 blockers

Before starting, confirm these are resolved on the RC. If any are still open, STOP and escalate.

- **Backend:** https://github.com/SehatDiary/sehat_diary/issues?q=is%3Aopen+label%3Av1-blocker
- **Mobile:** https://github.com/SehatDiary/sehat-diary-mobile/issues?q=is%3Aopen+label%3Av1-blocker

## 2. Test accounts

Seeded on dev/staging only. On prod, use fresh numbers.

| Phone | Name | Role | Notes |
|---|---|---|---|
| +919999999999 | Super Admin | super_admin | admin dashboards |
| +918888888888 | Rajesh Patel | caregiver | 2 family members with confirmed + extracted prescriptions |
| +917777777777 | Priya Sharma | caregiver | for multi-caregiver isolation tests |
| +916666666666 | Inactive User | caregiver (inactive) | for blocked-login test |

Dev OTP is returned in the `request_otp` API response when Twilio is not configured.

---

## 3. Golden journeys

Every item must pass on BOTH iOS and Android before sign-off.

### Journey A — Caregiver onboarding & first prescription

- [ ] Fresh install → no stored auth
- [ ] Enter phone → receive OTP (SMS on prod, API echo on dev)
- [ ] Verify OTP → lands on caregiver Dashboard
- [ ] Add family member (name + relation required; age/gender/conditions optional)
- [ ] Tap family member → FamilyMember screen renders profile
- [ ] Tap "New Visit" → session created, shown as `active`
- [ ] Tap FAB → Upload Prescription screen
- [ ] Grant camera permission → take photo OR grant gallery → pick photo
- [ ] Processing spinner appears → extraction completes (may take 10–30s)
- [ ] Review screen shows extracted medicines; low-confidence items have orange border and are editable
- [ ] Edit one medicine name → value persists
- [ ] Tap Confirm → VisitConfirmed screen shows Hindi + English summaries, doctor name, date
- [ ] Back to SessionDetail → doctor visit, medicines, tests, referrals all visible
- [ ] Check backend: `GET /api/v1/adherence/today` returns logs at correct times

### Journey B — Patient ↔ caregiver link

> Skip this journey if issue #85 (patient role signup) is still unresolved.

- [ ] Device 1 (patient) signs up on a fresh number → lands on DailyMedicines
- [ ] Open ManageCaregivers → Add caregiver → enter Device 2's phone
- [ ] Lookup says "registered, can invite"
- [ ] Send invite → see Pending state with expiry countdown
- [ ] Device 2 (caregiver) receives push notification within 30s
- [ ] Device 2 opens app → PendingInvites shows the invitation with "accept / decline"
- [ ] Device 2 taps Accept → Device 1 receives "accepted" push
- [ ] Device 2's Dashboard now lists the patient as a family member
- [ ] Device 1's ManageCaregivers moves the invite from "Pending" to "Current"

### Journey C — Lab report with critical findings

- [ ] On an active session, tap "Upload Lab Report"
- [ ] Grant permissions → pick 2–3 images of a real CBC or similar report
- [ ] Upload succeeds → analyzing screen shows polling
- [ ] Analysis completes within ~60s (Claude-dependent)
- [ ] LabReportResult opens showing findings grouped by section
- [ ] Toggle Hindi / English summary — both render with no missing strings
- [ ] Toggle "show normal findings" — normal items appear/hide
- [ ] If report has critical findings: red border + siren icon appears first
- [ ] Back to SessionDetail → lab report card shows "ready" state
- [ ] Patient's DailyMedicines shows critical-alert banner at top
- [ ] Caregiver Dashboard pending-actions shows the critical finding

### Journey D — Multi-caregiver isolation

- [ ] Sign in as Rajesh (+918888888888) on Device 1
- [ ] Sign in as Priya (+917777777777) on Device 2
- [ ] Rajesh's Dashboard shows only Rajesh's family members
- [ ] Priya's Dashboard shows only Priya's family members
- [ ] Rajesh invites Priya as a caregiver → Priya accepts
- [ ] Priya's Dashboard now also shows Rajesh's family members, grouped/labeled as someone else's
- [ ] Priya cannot delete Rajesh's family members (endpoint returns 403 or button is hidden)

### Journey E — Session resume / crash recovery

- [ ] Start a prescription upload
- [ ] Force-quit the app during the processing spinner
- [ ] Reopen app → no zombie state, either the upload recovered or the session is cleanly idle
- [ ] Force-quit during lab report analysis polling → reopen → polling resumes on the correct report
- [ ] Turn on airplane mode mid-API-call → user sees a clear error, not a hang

### Journey F — Reminder lifecycle (requires patience or time-travel)

- [ ] Confirm a prescription with a medicine scheduled in the next ~1 hour (edit seed or use a test helper)
- [ ] 30 min before dose → patient receives push on locked device
- [ ] Tap "Mark Taken" from notification → app opens and medicine shows Taken ✓
- [ ] Verify backend: `AdherenceLog.taken = true`, `acknowledged_at` set
- [ ] For a separate dose, ignore the push for 30 min → second reminder arrives
- [ ] Ignore for 2h total → caregiver receives "missed medicine" push
- [ ] Caregiver taps push → MemberAdherence opens with the correct medicine highlighted

---

## 4. Feature-level sweeps

Run these after journeys pass.

### 4.1 Auth

- [ ] Invalid phone format (<10 digits, non-numeric) → Send button disabled
- [ ] Non-Indian number → handled or clearly rejected
- [ ] Expired OTP (>10 min) → verify fails with clear error
- [ ] Wrong OTP 3× → no lockout bug, can retry
- [ ] Resend OTP 30s countdown works
- [ ] DEV mode shows OTP hint on screen (dev builds only)
- [ ] Inactive user (+916666666666) → login blocked
- [ ] Kill and reopen app → session persists (no re-login required)
- [ ] Logout → returns to RequestOtpScreen, old token rejected on API retry

### 4.2 Prescription scanning

- [ ] Camera permission: grant, deny, "don't ask again" — each handled
- [ ] Gallery permission: grant, deny
- [ ] Oversize image (>10MB) → rejected cleanly
- [ ] Blurry image → extraction either succeeds with low-confidence flags or fails with retry
- [ ] Non-prescription image (random photo) → extraction fails gracefully
- [ ] Handwritten prescription → tested at least once end-to-end
- [ ] Printed prescription → tested at least once end-to-end
- [ ] Hindi-only and bilingual prescriptions → tested
- [ ] Patient name mismatch warning appears when prescription name ≠ family member name
- [ ] Cancel mid-scan (back button) → no orphaned records in DB

### 4.3 Lab report upload

- [ ] 1 image → works
- [ ] 4 images → works
- [ ] 5+ images → rejected
- [ ] 1 PDF → works
- [ ] Image + PDF together → rejected (mutually exclusive)
- [ ] Navigate away during polling → polling stops (check network inspector)
- [ ] Analysis failure → error state with retry
- [ ] Share button produces readable plain-text export

### 4.4 Medication adherence

- [ ] Today's medicines grouped correctly into morning/afternoon/evening/night
- [ ] Mark Taken button → optimistic update + server confirm
- [ ] Progress ring color thresholds: <50% red, 50–79% yellow, ≥80% green
- [ ] Pull-to-refresh reloads from server
- [ ] Critical lab banner appears when applicable, is dismissible per session

### 4.5 Caregiver relationships (patient side)

- [ ] Lookup: registered / not registered / already connected / self-invite — each shows correct modal state
- [ ] Rate limit: 6th lookup within an hour → 429 with friendly message
- [ ] WhatsApp/SMS fallback link opens correct app
- [ ] Pending invite countdown decrements correctly day-to-day
- [ ] Cancel pending invite → removed from list
- [ ] Remove active caregiver → confirmation, then removed

### 4.6 Caregiver invitations (caregiver side)

- [ ] Accept → status updates, patient appears in Dashboard
- [ ] Decline → status updates, no patient added
- [ ] Expired invite (>7 days) → action buttons hidden, card grayed out
- [ ] Empty state when no invites

### 4.7 Admin (super_admin)

- [ ] User list filters by role and active status
- [ ] Toggle user active/inactive works
- [ ] Attempting self-deactivation → 422 with error
- [ ] Attempting self-role-change → 422 with error
- [ ] Stats dashboard shows sane counts
- [ ] AI cost dashboard shows monthly USD + daily breakdown

### 4.8 Internationalization

- [ ] Fresh install defaults to Hindi
- [ ] All visible strings are translated — screen-by-screen sweep, no English-in-Hindi-UI leaks
- [ ] Hindi text renders with correct font (no tofu boxes) on Samsung, Xiaomi, Pixel
- [ ] Dates and numbers use `hi-IN` locale
- [ ] Missing Hindi key falls back to English rather than the key itself

---

## 5. Non-functional

- [ ] Cold start <3s on a mid-range Android
- [ ] Dashboard with 10 family members renders smoothly
- [ ] DailyMedicines with 20+ medicines scrolls at 60fps
- [ ] Airplane mode during upload → clear error, no crash
- [ ] Slow 3G simulated (network throttle) → upload eventually completes or errors cleanly
- [ ] No PII in device logs (adb logcat / Xcode console)
- [ ] Large-text OS setting doesn't break layouts
- [ ] Tested with OS screen reader active on at least one critical screen
- [ ] Status-badge colors meet WCAG AA contrast

## 6. Device matrix

Must pass:
- [ ] iPhone 12 (iOS 17)
- [ ] iPhone SE (iOS 16)
- [ ] Pixel 6 (Android 14)
- [ ] Samsung A-series (Android 12)

Should pass:
- [ ] iPad (portrait-locked, no layout breakage)
- [ ] Xiaomi Redmi (common in India)
- [ ] Low-RAM Android (3GB)

Smoke only:
- [ ] Android 10 minimum target
- [ ] iPhone 15 Pro Max (large screen)

## 7. Sign-off

- [ ] All journeys A–E pass on iOS and Android
- [ ] Journey F pass on at least one device per OS
- [ ] No open P0 or P1 bugs
- [ ] No open `v1-blocker` labeled issues on either repo
- [ ] Backend request specs green in CI
- [ ] Rubocop + Brakeman clean
- [ ] EAS production build installs cleanly on a fresh device (not dev client)
- [ ] Push notifications verified on production-signed build (NOT dev client — they behave differently)

Tester: _______________  Date: _______________  Build: _______________
