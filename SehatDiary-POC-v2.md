# Sehat Diary — POC Planning Document
**Version:** 2.0 | **Updated:** March 2026

---

> **"Scan your prescription, understand it in Hindi, get reminded to take medicines, keep all reports in one place."**
>
> *Apni sehat, apni diary.*

---

## 1. Product Overview

| Attribute | Detail |
|-----------|--------|
| Product name | Sehat Diary |
| Tagline | Apni sehat, apni diary. |
| Target market | India — Android first |
| Primary user | Urban professional, age 30-45, managing parents' health remotely |
| End user | Senior citizen, 60+, Hindi speaker, chronic conditions |
| POC goal | 5-10 families using the app and scanning prescriptions |
| POC timeline | 8 weeks to build, 1 week to distribute |
| Budget | Under Rs. 5 Lakhs total |

### 1.1 The Problem

- Senior citizens cannot understand English prescriptions
- Medicine names, doses and timings are confusing
- Families manage health records on paper — easy to lose
- Caregivers in other cities have no visibility into compliance
- Going to a doctor without history wastes time and causes errors
- Test results, referrals, and doctor instructions get forgotten

### 1.2 The Solution

- Scan any prescription — printed or handwritten
- AI extracts medicines, tests, referrals, and instructions in seconds
- Every medicine explained in simple Hindi and English
- Automatic reminders for the patient
- Caregiver sees compliance from anywhere
- All reports and prescriptions stored in one place forever
- Full visit history — doctor details, diagnosis, follow-up actions

### 1.3 Hard Limits — What This App Will Never Do

> These boundaries are non-negotiable.

- No diagnosis or symptom interpretation
- No OTC medicine recommendations
- No replacing the doctor
- No auto-saving AI extraction — user must always confirm
- No storing sensitive data without encryption

---

## 2. Two Users, Two Completely Different Interfaces

### Caregiver (Rahul, 34 — downloads the app)
- Full dashboard with family member compliance
- Uploads prescriptions
- Sees all visit history, pending tests, referrals
- Gets alerted when Papa misses medicines
- Generates doctor visit summaries

### Patient / Senior (Papa, 65+ — receives reminders)
- Simple Hindi interface only
- Sees only today's medicines
- One tap: "ली ✓" to mark taken
- Large fonts, minimum 18px everywhere
- No complex navigation

---

## 3. Feature Set

### Feature 1: Prescription Scanning

The core feature. Everything else depends on this working.

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| Image upload | Take photo or upload from gallery / WhatsApp | P0 |
| Handwritten OCR | AI reads printed and handwritten prescriptions | P0 |
| Medicine extraction | Name, dose, frequency, timing, duration | P0 |
| Test extraction | Lab tests and imaging ordered by doctor | P0 |
| Referral extraction | Specialist referrals with reason | P0 |
| Instruction extraction | Diet, exercise, device instructions | P0 |
| Confidence flagging | Low confidence items highlighted for review | P0 |
| User confirmation | User reviews and confirms before saving | P0 |
| Hindi explanation | Each medicine explained in simple Hindi | P0 |
| English explanation | Plain English for caregiver view | P0 |
| Patient name match | Verify prescription is for correct family member | P0 |
| Doctor info | Name, hospital, qualification extracted and stored | P1 |
| Vitals | BP, weight, SpO2 if present on prescription | P1 |

### Feature 2: Medicine Reminders

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| Auto-scheduling | Reminders from confirmed prescription data | P0 |
| Push notifications | Firebase FCM to patient phone | P0 |
| Hindi reminder text | Notification in Hindi by default | P0 |
| One-tap confirm | Single "ली ✓" button to mark taken | P0 |
| Caregiver alert | Notify caregiver if 2+ misses in a week | P1 |
| Snooze | 30-minute snooze on reminder | P1 |

### Feature 3: Health Sessions + Visit History

Each doctor visit = one session. All activity links to it.

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| Create session | Start a new session for a doctor visit | P0 |
| Link prescription | Attach scanned prescription to session | P0 |
| Visit timeline | View all visits chronologically | P0 |
| Pending action items | Tests and referrals as to-do items | P0 |
| Hindi + English summary | AI-generated visit summary after scan | P1 |
| Lab report upload | Upload PDF or photo of test report | P1 |
| Doctor summary PDF | Auto-generate before next visit | P2 |

### Feature 4: Family Management

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| Add family member | Name, age, conditions | P0 |
| Caregiver dashboard | All members, compliance, alerts | P0 |
| Patient view | Simple Hindi — today's medicines only | P0 |
| Pending actions | Tests and referrals per member | P0 |
| Compliance tracking | Weekly adherence percentage | P1 |
| Invite member | SMS invite to family member phone | P1 |

> **P0** = Must have. App does not work without this.
> **P1** = Build after P0 is stable and tested.
> **P2** = Future sprint.

---

## 4. Technology Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | React Native + Expo (Android APK) |
| Backend API | Ruby on Rails 7.1 (API mode) |
| Database | PostgreSQL (managed by Railway) |
| AI — prescription scanning | Anthropic claude-sonnet-4-6 (Vision) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Background jobs | Sidekiq + Redis |
| Image storage | Cloudflare R2 (S3-compatible, free tier) |
| API hosting | Railway |
| Domain + CDN + SSL | Cloudflare (free) |
| OTP login | Twilio SMS |
| Crash monitoring | Sentry (free tier) |
| App distribution | EAS Build (Expo Application Services) |

---

## 5. Database Schema (Updated — Sprint 2)

The database is visit-centric. Every piece of data ties back to one doctor visit.

```
User
└── FamilyMembers
    └── HealthSessions
        ├── Prescriptions (the scan)
        └── DoctorVisits (created after confirmation)
            ├── Doctor (reusable across visits)
            ├── PrescribedMedicines → AdherenceLogs
            ├── PrescribedTests
            ├── Referrals
            ├── VisitInstructions
            └── VisitSummaries (AI-generated)
```

### Why doctor_visits is the central table

A single prescription can contain:
- Multiple medicines with doses and timing
- Lab tests ordered (X-ray, blood tests, MRI)
- Specialist referrals with reason
- Lifestyle instructions (exercise, diet, device)
- Vitals recorded (BP, weight, SpO2)
- Diagnosis text
- Next visit date

All of this is captured in `doctor_visits` and its child tables.

### AI API Logging

Every Anthropic API call is logged to `ai_api_logs`:
- Model name, feature, source (which prescription)
- Token counts (input + output)
- Cost in USD (auto-calculated)
- Duration in milliseconds
- Success / error status

This enables cost tracking, debugging, and quality analysis.

---

## 6. Key Services

| Service | What it does |
|---------|-------------|
| `PrescriptionExtractorService` | Calls Claude Vision, extracts all prescription data |
| `VisitBuilderService` | After confirmation, creates Doctor + DoctorVisit + all child records |
| `ReminderSchedulerService` | Creates 30 days of AdherenceLogs + enqueues reminder jobs |
| `VisitSummaryService` | Generates Hindi + English summaries via Anthropic |
| `ImageUploadService` | Uploads to Cloudflare R2 |
| `FirebaseNotificationService` | Sends FCM push notifications |
| `TwilioService` | Sends OTP SMS |

---

## 7. Step-by-Step Setup

### Step 1: Create Accounts and Services (1-2 hours)

**Domain:** Buy `sehatdiary.in` on BigRock.in (~Rs. 800/year)

**Cloudflare (free SSL + CDN):**
1. Create account at cloudflare.com
2. Add site: sehatdiary.in
3. Copy 2 nameservers to BigRock DNS settings
4. Wait 10-30 minutes

**Railway (API hosting):**
```bash
npm install -g @railway/cli
railway login
```
Cost: ~Rs. 700/month

**Anthropic API:**
1. console.anthropic.com → API Keys → create key
2. Add ~Rs. 500 in credits for POC
Cost: ~Rs. 1.5-3 per prescription scan

**Firebase (push notifications):**
1. console.firebase.google.com → new project: sehat-diary
2. Add Android app: com.sehatdiary.app
3. Download google-services.json
4. Copy Server Key from Project Settings

**Cloudflare R2 (image storage):**
1. Cloudflare dashboard → R2 → create bucket: sehat-diary-images
2. Create API token with R2 read/write
3. Note Account ID, Access Key ID, Secret Access Key
Cost: Free up to 10GB

### Step 2: Deploy Rails API

```bash
# Clone and set up
git clone https://github.com/your-org/sehat-diary-api
cd sehat-diary-api
bundle install
rails db:create db:migrate

# Deploy to Railway
railway init
railway add postgresql
railway add redis
railway up
railway run rails db:migrate
```

**Required environment variables on Railway:**
```
RAILS_ENV=production
RAILS_MASTER_KEY=
SECRET_KEY_BASE=
DEVISE_JWT_SECRET_KEY=
ANTHROPIC_API_KEY=
CF_ACCOUNT_ID=
CF_ACCESS_KEY_ID=
CF_SECRET_ACCESS_KEY=
CF_BUCKET_NAME=sehat-diary-images
FIREBASE_SERVER_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SENTRY_DSN=
```

**Connect custom domain:**
1. Railway → Settings → Add Custom Domain: api.sehatdiary.in
2. Cloudflare DNS: CNAME api → [Railway target], Proxy ON
3. Test: `curl https://api.sehatdiary.in/api/v1/health`

### Step 3: Build and Distribute Android APK

```bash
cd sehat-diary-mobile
npm install
eas build:configure

# Build APK for beta
eas build --platform android --profile preview
```

Share EAS download link via WhatsApp.

**Testers must enable unknown sources once:**
Settings → Security → Install unknown apps → Allow

---

## 8. Pre-Launch Checklist

Do not share with families until all checks pass on your own device.

| Check | How to verify | Done |
|-------|--------------|------|
| API health | `curl https://api.sehatdiary.in/api/v1/health` | [ ] |
| Database connected | Railway logs show no DB errors | [ ] |
| OTP login | Receive SMS on real phone number | [ ] |
| Prescription scan | Upload real prescription, verify extraction | [ ] |
| Patient name match | Verify match / warning logic works | [ ] |
| Tests extracted | Check prescribed_tests created | [ ] |
| Hindi text | Check hindi_explanation on every medicine | [ ] |
| Visit summary | Check Hindi + English summaries generated | [ ] |
| Reminder fires | Set reminder 2 min ahead, verify notification | [ ] |
| Mark taken | "ली ✓" updates adherence_log | [ ] |
| Caregiver dashboard | Shows family members and compliance | [ ] |
| Pending actions | Tests and referrals show as action items | [ ] |
| App loads in 3s | Cold start on real Android device | [ ] |
| No crash on empty | All empty states handled gracefully | [ ] |

---

## 9. Release Plan

| Phase | Timeline | What happens |
|-------|----------|-------------|
| Phase 0 — Internal | Week 1-8 | Build and test on your own device only |
| Phase 1 — POC Beta | Week 9 | Share APK with 5-10 known families via WhatsApp |
| Phase 2 — Iteration | Week 10-12 | Fix issues from beta, OTA updates via EAS |
| Phase 3 — Play Store | Week 13-16 | Submit to Google Play, open to wider audience |
| Phase 4 — Growth | Month 5+ | Marketing, referrals, B2B conversations |

### Week-by-Week Build Timeline

| Week | What gets built |
|------|----------------|
| 1 | Rails setup, auth (phone OTP), user roles |
| 2 | Family members CRUD, health sessions, basic API |
| 3 | Image upload to R2, Claude Vision integration |
| 4 | Extraction + confirmation, all visit tables (Sprint 2) |
| 5 | VisitBuilderService, tests/referrals/instructions tables |
| 6 | Firebase reminders, Sidekiq jobs, adherence tracking |
| 7 | React Native: caregiver dashboard, prescription upload flow |
| 8 | React Native: patient view (Hindi), session detail, action items |
| 9 | End-to-end testing, EAS APK build, Railway deploy |
| 10 | Share with 5 families, observe, collect feedback |
| 11-12 | Fix top 3 issues, OTA updates |
| 13 | Google Play Store submission |

### Google Play Submission (Phase 3)

1. Pay Rs. 1,750 one-time at play.google.com/console
2. Create app listing with Hindi + English description
3. Prepare 5 screenshots from existing UI
4. Build: `eas build --platform android --profile production`
5. Upload AAB → Internal Testing → test 5 accounts → promote to Production
6. Review time: 1-3 days

---

## 10. North Star Metric

> **Did Papa mark medicines taken 5 out of 7 days this week?**

Target for POC success: 3 out of 5 beta families achieve this consistently.

Everything else — downloads, sessions, scans — is secondary until this metric is healthy.

---

## 11. Cost Breakdown

### One-Time Costs

| Item | Cost |
|------|------|
| sehatdiary.in domain (1 year) | Rs. 800 |
| Google Play developer account | Rs. 1,750 |
| Apple developer (skip for now) | Rs. 8,000 — defer |
| **Total one-time** | **Rs. 2,550** |

### Monthly Running Costs (POC)

| Item | Monthly |
|------|---------|
| Railway (API + PostgreSQL + Redis) | Rs. 700 |
| Anthropic API (200 scans × Rs. 2) | Rs. 400 |
| Twilio SMS (200 OTPs × Rs. 0.50) | Rs. 100 |
| Cloudflare, Firebase, R2, Sentry, EAS | Rs. 0 |
| **Total monthly** | **~Rs. 1,200** |

### Budget Summary

| Item | Amount |
|------|--------|
| Total available budget | Rs. 5,00,000 |
| One-time setup | Rs. 2,550 |
| Monthly running cost | Rs. 1,200/month |
| Months of runway | 34+ months at zero revenue |
| Claude Code Max (3 months build) | Rs. 8,000 × 3 = Rs. 24,000 |
| **Total POC cost including build** | **~Rs. 30,000** |

---

## 12. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AI misreads handwritten prescription | High | Always require user confirmation. Flag low-confidence items. |
| Senior users cannot install APK | Medium | Do it for them in person. Create 60-second video guide. |
| Reminders not received on Xiaomi/Realme | Medium | Test on 3+ Android devices before sharing. Known issue documented. |
| Railway downtime | Low | 99.9% SLA. Acceptable for POC. |
| Anthropic API cost spike | Low | Set spending limit in console. Alert at Rs. 500. |
| Regulatory concern about health advice | Low | App never diagnoses. Only organizes and explains existing prescriptions. |

---

## 13. POC Success Criteria

After 30 days of beta, all of the following must be true:

- [ ] 5 families have installed the app and scanned at least 1 prescription
- [ ] 3 of 5 families have Papa marking medicines 5 out of 7 days/week
- [ ] Zero reports of AI extracting a completely wrong medicine name
- [ ] At least 2 families say Hindi explanations are genuinely helpful
- [ ] Zero critical app crashes during normal usage
- [ ] Pending tests and referrals visible as action items in dashboard

### After POC Success

1. Interview all 5 families — find the top 3 pain points
2. Fix those 3 pain points before adding any new features
3. Submit to Google Play Store
4. Begin monetization conversations — B2B2C first (corporate HR, insurance)
5. Expand language support beyond Hindi

---

## 14. What Is Explicitly Out of Scope for POC

- iOS / TestFlight
- Video recording of doctor visits
- Multi-language beyond Hindi and English
- Doctor-facing features
- Insurance integration
- OTC medicine recommendations (never — regulatory risk)
- Symptom checker or diagnosis
- ABDM / health ID integration (future)

---

*Sehat Diary — POC Planning Document v2.0 — Confidential*
