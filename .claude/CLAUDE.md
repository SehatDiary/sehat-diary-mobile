# Sehat Diary — Rails API

## What This Project Is

Sehat Diary is a family health management app for the Indian market.

**Product in one sentence:**
"Scan your prescription, understand it in Hindi, get reminded to take medicines, keep all reports in one place."

**Tagline:** Apni sehat, apni diary.

**Two users:**
- Caregiver (Rahul, 34, urban professional managing elderly parents remotely)
- Patient (Papa, 65+, senior citizen, Hindi speaker, chronic conditions)

---

## Hard Limits — Never Cross These

- Never auto-save AI extraction — user must always confirm before medicines are created
- Never diagnose or interpret symptoms
- Never recommend OTC medicines
- Never replace the doctor
- Never store sensitive data without encryption
- All AI extraction is informational only — app organizes, reminds, translates. That's it.

---

## Repository Structure

```
sehat-diary-api/          # This repo — Rails API only
sehat-diary-mobile/       # Separate repo — React Native + Expo
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ruby on Rails 7.1 (API mode) |
| Database | PostgreSQL |
| Auth | Devise + devise-jwt (JWT tokens) |
| Background jobs | Sidekiq + Redis |
| AI | Anthropic claude-sonnet-4-6 (Vision API) |
| Image storage | Cloudflare R2 (S3-compatible) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Hosting | Railway |
| CDN + SSL | Cloudflare |
| OTP SMS | Twilio |
| Error monitoring | Sentry |

---

## Authentication

**Primary:** Phone OTP login
**Future:** Gmail OAuth via OmniAuth (structure in place, not implemented)

**Flow:**
1. POST /api/v1/auth/request_otp { phone_number }
2. OTP sent via Twilio SMS (logged to console in development)
3. POST /api/v1/auth/verify_otp { phone_number, otp }
4. Returns JWT token — valid 30 days
5. All subsequent requests: Authorization: Bearer {token}

**Token location:** Authorization header (never cookies — this is an API)

**OTP expiry:** 10 minutes

**Roles:**
- `super_admin` — full access, user management, AI cost stats
- `caregiver` — manages own family members, sessions, prescriptions
- `patient` — read-only, sees only own medicines and today's reminders
- `doctor` — future role, not implemented yet

**Role check helpers in BaseController:**
- `require_super_admin!`
- `require_caregiver_or_admin!`
- `require_active_user!`

---

## Database Schema

### Core Tables (Sprint 1 — foundation)

```
users
  phone_number (unique), name, role, active
  otp_code, otp_sent_at
  fcm_token (for push notifications)
  provider, uid (for future OAuth)
  jti (JWT revocation)

family_members
  user_id → users
  name, age, conditions (jsonb)

health_sessions
  family_member_id → family_members
  title, visit_date, doctor_name, status

prescriptions
  health_session_id → health_sessions
  raw_image_url, extracted_json, confirmed_json
  status: pending_confirmation | confirmed | rejected
```

### Visit-Centric Tables (Sprint 2 — prescription data model)

```
doctors
  name, qualification, specialization
  registration_number (unique)
  hospital_clinic_name, hospital_city
  phone_number, email
  created_by_user_id → users

doctor_visits                         ← CENTRAL TABLE
  health_session_id → health_sessions
  doctor_id → doctors (nullable)
  prescription_id → prescriptions (nullable)
  visit_date, visit_type
  chief_complaint, diagnosis, clinical_findings
  vitals (jsonb: bp, weight, spo2, pulse, blood_sugar)
  patient_name_on_rx, patient_match_status
  next_visit_date, next_visit_instructions
  special_instructions
  raw_extraction (jsonb — full AI response stored here)
  summary_en, summary_hi

prescribed_medicines                  (renamed from medicines)
  doctor_visit_id → doctor_visits
  prescription_id → prescriptions
  name, strength, form, dose, frequency, timing, duration
  hindi_explanation, english_explanation
  confidence: high | medium | low
  raw_text (exactly as written on prescription)
  is_active, stopped_at, stopped_reason

prescribed_tests
  doctor_visit_id → doctor_visits
  test_name, test_type (lab/imaging/pathology/procedure)
  body_part, urgency (routine/urgent/stat)
  status: pending | booked | completed | cancelled
  hindi_name, instructions, due_by_date
  lab_report_url (when completed)

referrals
  doctor_visit_id → doctor_visits
  referred_to_name, referred_to_specialty
  referred_to_hospital, reason, urgency
  status: pending | visited | cancelled
  hindi_explanation
  resulting_health_session_id (FK to health_sessions when followed up)

visit_instructions
  doctor_visit_id → doctor_visits
  instruction_type: diet | exercise | lifestyle | restriction | monitoring | device | general
  description, hindi_description
  frequency, duration, priority

visit_summaries
  doctor_visit_id → doctor_visits
  summary_type: patient_summary | caregiver_update | doctor_briefing
  language: en | hi
  content (AI-generated text)
  ai_api_log_id → ai_api_logs
  generated_at

ai_api_logs
  model_name (e.g. claude-sonnet-4-6)
  feature: prescription_extraction | visit_summary_generation | hindi_translation
  source_type, source_id (polymorphic)
  prompt_tokens, completion_tokens, total_tokens
  cost_usd (precision: 10, scale: 6)
  duration_ms, status: success | error | timeout
  error_message, request_summary (jsonb — NOT full prompt, just key params)

adherence_logs
  medicine_id → prescribed_medicines
  scheduled_at, taken_at
  status: pending | taken | missed | snoozed
```

### Key Relationships

```
User
└── FamilyMembers (has_many)
    └── HealthSessions (has_many)
        ├── Prescriptions (has_many)
        │   └── DoctorVisit (has_one)
        └── DoctorVisits (has_many)
            ├── Doctor (belongs_to)
            ├── PrescribedMedicines (has_many)
            │   └── AdherenceLogs (has_many)
            ├── PrescribedTests (has_many)
            ├── Referrals (has_many)
            ├── VisitInstructions (has_many)
            └── VisitSummaries (has_many)
```

---

## API Structure

All routes under: `/api/v1/`

```
Public (no auth):
  GET  /api/v1/health
  POST /api/v1/auth/request_otp
  POST /api/v1/auth/verify_otp

Auth required:
  DELETE /api/v1/auth/logout
  GET    /api/v1/auth/me
  POST   /api/v1/auth/update_fcm_token

  # Family management
  GET/POST        /api/v1/family_members
  GET/PATCH       /api/v1/family_members/:id
  GET             /api/v1/family_members/:id/pending_actions

  # Doctors
  GET/POST        /api/v1/doctors
  GET/PATCH       /api/v1/doctors/:id

  # Health sessions
  GET/POST        /api/v1/family_members/:fmid/health_sessions
  GET/PATCH       /api/v1/family_members/:fmid/health_sessions/:id

  # Doctor visits
  GET/POST        /api/v1/family_members/:fmid/health_sessions/:hsid/doctor_visits
  GET             /api/v1/family_members/:fmid/health_sessions/:hsid/doctor_visits/:id

  # Prescriptions
  POST            /api/v1/uploads/prescription_image
  POST            /api/v1/family_members/:fmid/health_sessions/:hsid/prescriptions
  POST            /api/v1/family_members/:fmid/health_sessions/:hsid/prescriptions/:id/confirm
  GET             /api/v1/family_members/:fmid/health_sessions/:hsid/prescriptions/:id

  # Tests and referrals
  GET             /api/v1/family_members/:fmid/health_sessions/:hsid/doctor_visits/:dvid/prescribed_tests
  PATCH           /api/v1/prescribed_tests/:id/mark_completed
  PATCH           /api/v1/referrals/:id/mark_visited

  # Adherence (medicine tracking)
  GET             /api/v1/adherence/today
  PATCH           /api/v1/adherence/:id/mark_taken
  PATCH           /api/v1/adherence/:id/snooze

Super admin only:
  GET             /api/v1/admin/users
  PATCH           /api/v1/admin/users/:id/toggle_active
  PATCH           /api/v1/admin/users/:id/change_role
  GET             /api/v1/admin/stats
  GET             /api/v1/admin/ai_stats
```

---

## Services

### PrescriptionExtractorService
**File:** `app/services/prescription_extractor_service.rb`

- Input: prescription object (has raw_image_url)
- Calls Anthropic claude-sonnet-4-6 Vision API
- Extracts: medicines, tests, referrals, instructions, vitals, diagnosis, doctor info
- Always logs to AiApiLog after every call (success or failure)
- Returns: { success:, data:, low_confidence_medicines:, has_warnings: }
- NEVER auto-saves — extraction must be confirmed by user first

**Confidence levels:** high | medium | low
Low confidence medicines are flagged for user review.

### VisitBuilderService
**File:** `app/services/visit_builder_service.rb`

- Called after user confirms extraction
- Runs inside a single transaction
- Creates in order: Doctor → DoctorVisit → PrescribedMedicines →
  PrescribedTests → Referrals → VisitInstructions
- Runs patient name matching automatically
- Enqueues VisitSummaryJob after completion

### ReminderSchedulerService
**File:** `app/services/reminder_scheduler_service.rb`

- Called after prescription confirm
- Creates AdherenceLogs for next 30 days per medicine
- Enqueues MedicineReminderJob for each

### VisitSummaryService
**File:** `app/services/visit_summary_service.rb`

- Generates Hindi + English summaries via Anthropic API
- Hindi: 3-4 simple sentences for the patient/senior
- English: 3-4 sentences for the caregiver
- Always logs to AiApiLog
- Never blocks the main confirm flow — runs in background job

### ImageUploadService
**File:** `app/services/image_upload_service.rb`

- Uploads to Cloudflare R2
- Local dev: saves to tmp/uploads/ if R2 not configured
- Max file size: 10MB
- Accepted: jpg, png, pdf

### FirebaseNotificationService
**File:** `app/services/firebase_notification_service.rb`

- Sends FCM push notifications
- Hindi text by default for patient reminders
- Development: logs to console instead of sending

### TwilioService
**File:** `app/services/twilio_service.rb`

- Sends OTP SMS via Twilio
- Development: logs OTP to Rails console

---

## Background Jobs

| Job | Queue | Trigger | What it does |
|-----|-------|---------|--------------|
| MedicineReminderJob | reminders | Scheduled by ReminderSchedulerService | Sends FCM push to patient |
| MarkMissedJob | reminders | 2 hours after reminder fires | Marks adherence_log as missed if not taken |
| CaregiverAlertJob | reminders | After 2+ missed in a week | Notifies caregiver |
| VisitSummaryJob | summaries | After prescription confirm | Generates Hindi + English summaries |

---

## AI Logging Rules

Every Anthropic API call MUST log to `ai_api_logs`. Never skip this.

Log these fields:
- model_name, feature, source_type, source_id
- prompt_tokens, completion_tokens, cost_usd, duration_ms, status

Do NOT log:
- Full prompt text (too large, PII risk)
- Full response JSON (stored in raw_extraction on doctor_visit)
- Image data

AiApiLog.record() rescues all errors — logging failure must NEVER crash the main flow.

Current pricing (claude-sonnet-4-6):
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

---

## Patient Name Matching

After extraction, the app checks if the prescription patient name
matches the selected family member.

Logic in `DoctorVisit#match_patient_name!`:
- Strip titles (Mr, Mrs, Dr, Shri, Smt)
- Split into words, check for any word overlap
- Status: matched | unmatched | skipped
- If unmatched: return warning to frontend — user decides whether to proceed

Example:
- Extracted: "Mrs. Maltibai Patte"
- Stored: "Maltibai"
- Result: matched (word "maltibai" overlaps)

---

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://localhost/sehat_diary_development

# Auth
DEVISE_JWT_SECRET_KEY=
SECRET_KEY_BASE=
RAILS_MASTER_KEY=

# AI
ANTHROPIC_API_KEY=

# Storage
CF_ACCOUNT_ID=
CF_ACCESS_KEY_ID=
CF_SECRET_ACCESS_KEY=
CF_BUCKET_NAME=sehat-diary-images

# Notifications
FIREBASE_SERVER_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Redis
REDIS_URL=redis://localhost:6379/0

# Monitoring
SENTRY_DSN=

# Environment
RAILS_ENV=development
```

---

## Development Conventions

**Controllers:**
- All under `app/controllers/api/v1/`
- All inherit from `Api::V1::BaseController`
- Never put business logic in controllers — use services

**Services:**
- All in `app/services/`
- One responsibility per service
- Always return structured hash: { success:, data: } or raise

**Models:**
- Validations on every field
- Enums for all status fields
- Never raw string comparisons — always use enum helpers

**Never do:**
- Fat controllers
- Business logic in models beyond validations
- Direct Anthropic API calls outside of services
- Hardcoded strings — use I18n or constants

---

## Coding Style

- Ruby style: standard Rails conventions
- Always use strong parameters in controllers
- Wrap multi-step operations in `ActiveRecord::Base.transaction`
- Rescue specific errors, not bare `rescue`
- Log errors to Sentry in production, Rails.logger in development

---

## Testing a Prescription Scan End-to-End

```bash
# 1. Start server
rails server

# 2. Get OTP
curl -X POST http://localhost:3000/api/v1/auth/request_otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919999999999"}'

# 3. Verify OTP (check console for code in dev)
curl -X POST http://localhost:3000/api/v1/auth/verify_otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919999999999", "otp": "123456"}'

# 4. Upload prescription image
curl -X POST http://localhost:3000/api/v1/uploads/prescription_image \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@/path/to/prescription.jpg"

# 5. Create prescription (triggers AI extraction)
curl -X POST http://localhost:3000/api/v1/family_members/1/health_sessions/1/prescriptions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "URL_FROM_STEP_4"}'

# 6. Confirm (creates all visit records)
curl -X POST http://localhost:3000/api/v1/family_members/1/health_sessions/1/prescriptions/1/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmed_data": EXTRACTED_DATA_FROM_STEP_5}'
```

---

## Deployment

**Platform:** Railway
**URL:** https://api.sehatdiary.in
**Branch:** main auto-deploys

```bash
# Deploy
railway up

# Run migrations on Railway
railway run rails db:migrate

# Check logs
railway logs
```

Procfile:
```
web: bundle exec puma -C config/puma.rb
worker: bundle exec sidekiq
```

---

## Current Sprint Status

| Sprint | Status | Key deliverable |
|--------|--------|----------------|
| Sprint 1 | ✅ Complete | Auth, family members, basic prescription scan, medicines, reminders |
| Sprint 2 | 🔄 In progress | doctors, doctor_visits, prescribed_tests, referrals, ai_api_logs, VisitBuilderService |

### Sprint 2 Tickets In Progress
- #18 — doctors table
- #19 — doctor_visits table (BLOCKER — most others depend on this)
- #20 — prescribed_tests, referrals, visit_instructions
- #21 — ai_api_logs
- #22 — VisitBuilderService refactor (biggest ticket)
- #23 — visit_summaries + AI generation
- #24 — Frontend updates for visit detail
- #25 — Action items dashboard

---

## Key Business Rules

1. **One DoctorVisit per Prescription** — every scan creates exactly one visit
2. **Doctor is reusable** — find_or_create_from_extraction prevents duplicates
3. **Confirmation is mandatory** — never create medicines without user review
4. **AI logs are append-only** — never update or delete AiApiLog records
5. **Patient view is read-only** — patient role cannot modify any records
6. **Adherence logs are for 30 days only** — created on prescription confirm
7. **Hindi is primary for patient** — every medicine and reminder must have hindi_explanation
8. **Caregiver sees everything** — compliance, alerts, full history
9. **Transactions wrap all VisitBuilderService operations** — all or nothing
10. **Costs are tracked** — every Anthropic call logged with token count and USD cost
