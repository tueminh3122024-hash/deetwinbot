-- DeeTwin Schema Update v4: Leads, Bookings & Patient Profiles
-- =============================================================
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- Must be applied AFTER schema_update.sql, v2, and v3.

-- =============================================================
-- 1A — Extend clinics table
-- =============================================================
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS phone           TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS system_prompt_2 TEXT;

COMMENT ON COLUMN clinics.phone IS 'Required, unique — primary identifier for clinics';
COMMENT ON COLUMN clinics.system_prompt_2 IS 'Optional second custom AI system prompt written by the clinic';

-- =============================================================
-- 1B — Rename existing bookings → leads
-- =============================================================
-- The current `bookings` table (from schema_update.sql) is for Tally
-- webhook leads. Rename it to `leads` so the name `bookings` can
-- be reused for the v2 in-app booking table below.
ALTER TABLE IF EXISTS bookings RENAME TO leads;

-- Drop the old policy name and create a renamed one on `leads`
DROP POLICY IF EXISTS "user_own_bookings" ON leads;
CREATE POLICY "user_own_leads" ON leads
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- =============================================================
-- 1C — Create new bookings table (v2, in-app booking)
-- =============================================================
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

COMMENT ON TABLE  bookings IS 'In-app bookings linked to authenticated users and clinics';
COMMENT ON COLUMN bookings.status IS 'pending → accepted or completed';

-- =============================================================
-- 1D — Create patient_profiles table
-- =============================================================
CREATE TABLE IF NOT EXISTS patient_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
    data_cards  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  patient_profiles IS 'Patient medical/multimedia profile cards linked to a user and clinic';
COMMENT ON COLUMN patient_profiles.data_cards IS 'Flexible array of multimedia card objects.
Example:
[
  {
    "type": "image",
    "url": "https://...",
    "caption": "X-ray result 2026-04-01",
    "uploaded_at": "2026-04-24T10:00:00Z"
  },
  {
    "type": "note",
    "content": "Patient reports improved mobility",
    "author": "Dr. Smith",
    "created_at": "2026-04-24T10:05:00Z"
  }
]';

-- =============================================================
-- 1E — RLS Policies
-- =============================================================

-- bookings: row-level security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users see their own bookings
DROP POLICY IF EXISTS "user_own_bookings" ON bookings;
CREATE POLICY "user_own_bookings" ON bookings
    FOR ALL USING (auth.uid() = user_id);

-- Clinics see bookings for their clinic
DROP POLICY IF EXISTS "clinic_own_bookings" ON bookings;
CREATE POLICY "clinic_own_bookings" ON bookings
    FOR ALL USING (
        clinic_id IN (
            SELECT id FROM clinics WHERE id = clinic_id
        )
    );

-- patient_profiles: row-level security
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;

-- Users see their own patient profile
DROP POLICY IF EXISTS "user_own_patient_profile" ON patient_profiles;
CREATE POLICY "user_own_patient_profile" ON patient_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Clinics see patient profiles linked to their clinic
DROP POLICY IF EXISTS "clinic_own_patient_profiles" ON patient_profiles;
CREATE POLICY "clinic_own_patient_profiles" ON patient_profiles
    FOR ALL USING (
        clinic_id IN (
            SELECT id FROM clinics WHERE id = clinic_id
        )
    );

-- =============================================================
-- 1F — Indexes
-- =============================================================

-- bookings indexes
CREATE INDEX IF NOT EXISTS bookings_user_idx   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_clinic_idx ON bookings(clinic_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- patient_profiles indexes
CREATE INDEX IF NOT EXISTS patient_profiles_user_idx   ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS patient_profiles_clinic_idx ON patient_profiles(clinic_id);
