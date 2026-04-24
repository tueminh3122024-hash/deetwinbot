# DeeTwin Modular v2.0 — Database Schema & Auth Logic Plan

## Current State Summary

### Existing Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| clinics | id, name, token_balance, status, tax_id, doctor_name, specialty, working_hours, map_url, description, address, custom_system_prompt, bot_avatar_url, bot_name | Missing `phone` and `system_prompt_2` |
| bookings | id, clinic_id, full_name, email, phone, service, preferred_dt, note, status | Current table is Tally-form focused (generic leads) |
| profiles | id, full_name, age, phone, avatar_url, role | Patient/user profiles |
| medical_records | id, user_id, clinic_id, image_url, raw_json, msi, eib, mfv, mgc, notes | OCR extraction results |
| chat_history | id, user_id, clinic_id, message, response, tokens_used | Chat storage |
| topup_requests | id, clinic_id, token_amount, price_vnd, status | Token top-up requests |

### Existing Auth
- Login page: Email/password for clinics (Supabase auth)
- Signup page: Email/password + clinic_name for clinics
- No Google Auth for patients yet
- Admin dashboard checks `profiles.role = 'admin'`

---

## Subtask 1: Database Schema (Supabase SQL)

### 1A — Update `clinics` table
```sql
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS phone           TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS system_prompt_2 TEXT;
```
- `phone`: Required, unique — becomes the primary identifier for clinics (replaces email as login identifier)
- `system_prompt_2`: Optional — second custom AI system prompt written by the clinic
- `token_balance`: Already exists (v1 schema), no action needed

### 1B — Create new `bookings` table (v2)
```sql
CREATE TABLE IF NOT EXISTS bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id    UUID REFERENCES clinics(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'completed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ
);
```
Note: The existing `bookings` table (from schema_update.sql) is for Tally webhook leads. This new table is for direct in-app booking with proper user_id linkage. Consider whether to:
- Rename existing table to `leads` and use new `bookings` for the purpose above
- Or keep both and name the new one `appointments` to avoid conflict

**Recommendation**: Rename existing `bookings` → `leads` to avoid confusion, then create new `bookings` with the v2 schema.

### 1C — Create `patient_profiles` table
```sql
CREATE TABLE IF NOT EXISTS patient_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
    data_cards  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- `data_cards` JSONB: Flexible array of multimedia card objects
  ```json
  [
    {
      "id": "uuid",
      "type": "video|image|ocr_text",
      "url": "https://...",
      "title": "Optional title",
      "metadata": { ... },
      "created_at": "timestamp"
    }
  ]
  ```

### 1D — RLS Policies for new tables
- `bookings`: Users see own bookings (`auth.uid() = user_id`); Clinics see bookings for their clinic
- `patient_profiles`: Users see own profile; Clinics see profiles linked to them

### 1E — Indexes for performance
- `bookings`: Index on `user_id`, `clinic_id`, `status`
- `patient_profiles`: Index on `user_id`, `clinic_id`

---

## Subtask 2: Clinic Registration Auth (Next.js Components)

### 2A — Clinic Registration Page Enhancement
Modify [`src/app/(auth)/signup/page.tsx`](src/app/(auth)/signup/page.tsx:1) to:
- Add `phone` field (required, with Vietnamese phone validation: `/(84|0[3|5|7|8|9])+([0-9]{8})\b/`)
- Add `doctor_name`, `specialty`, `address` fields (full info)
- Keep existing `email`, `password`, `clinic_name` fields
- On signup success: create clinic record in `clinics` table with `phone` as identifier

### 2B — Clinic Login with Phone Support
- Option A: Allow login with phone OR email
- Option B: Phone-only login for clinics
- Keep email/password as fallback for existing users

### 2C — Patient Google Auth Integration
- Add "Sign in with Google" button to login page
- On first Google sign-in, create `profiles` record automatically
- Patient OAuth flow: Google → Supabase Auth → redirect to chat

### 2D — Server Actions for Clinic Registration
Create/update `src/lib/actions/auth.ts` or similar with:
- `registerClinic(data)` — inserts into `clinics` + creates auth user
- `checkClinicPhone(phone)` — checks uniqueness
- Handle transaction: auth user creation + clinic record creation

---

## Design Decisions

| Decision | Option Chosen | Rationale |
|----------|--------------|-----------|
| Rename existing `bookings` → `leads` | **Yes** | Avoids naming conflict with new v2 bookings table |
| New bookings table name | `bookings` | Matches user requirement naming |
| Phone validation pattern | Vietnamese format (`84|0[3|5|7|8|9]xxxxxxxx`) | Primary market is Vietnam |
| Auth identity change | Phone as primary, email as fallback | User requirement: "phone used as primary identifier" |
| Google Auth for patients | Add to existing login page | Minimal UI change, reuses existing Supabase OAuth |

---

## Files to Create/Modify

### Database Schema
- **CREATE**: `supabase/schema_update_v4.sql` — All SQL changes in one migration file

### Source Code
- **MODIFY**: [`src/app/(auth)/signup/page.tsx`](src/app/(auth)/signup/page.tsx:1) — Add phone, doctor_name, specialty, address fields
- **MODIFY**: [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx:1) — Add Google OAuth button + phone login support
- **CREATE**: `src/lib/actions/auth.ts` — Server actions for clinic registration
- **MODIFY**: [`src/lib/types/admin.ts`](src/lib/types/admin.ts:1) — Add phone, system_prompt_2 to Clinic type
- **MODIFY**: [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts:1) — No changes needed (already works)
- **MODIFY**: [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts:1) — No changes needed

### Files NOT to touch (Voice, OCR, Layout)
- `src/components/chat/VoiceMic.tsx`
- `src/components/chat/VisionOCR.tsx`
- `src/components/chat/ChatBox.tsx` (layout stays)
- `src/components/layout/ChatLayout.tsx`
- `src/components/Navigation/AppShell.tsx`
- All files in `public/static/`
- `src/app/api/voice-to-text/`
- `src/app/api/tts/`
- `src/app/api/ocr-extract/`

---

## Execution Order

1. **Database migration** (`supabase/schema_update_v4.sql`) — Must run first
2. **Type definitions** (`src/lib/types/admin.ts`) — Update Clinic interface
3. **Server actions** (`src/lib/actions/auth.ts`) — Backend logic
4. **Signup page** — Add clinic registration fields + phone
5. **Login page** — Add Google OAuth for patients + phone login
6. **RLS policies review** — Ensure new tables are protected
