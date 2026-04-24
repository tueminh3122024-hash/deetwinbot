-- DeeTwin Schema Update v7: Fix Booking RLS & Data Flow
-- =============================================================
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- Must be applied AFTER schema_update_v6.sql.
-- Idempotent — can be run safely even if v4 was already applied.
-- =============================================================

-- =============================================================
-- 7A — Ensure bookings table exists (v2, with user_id)
--     (Safe: IF NOT EXISTS skips if already present)
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

-- Also ensure old leads table exists (old Tally webhook table)
CREATE TABLE IF NOT EXISTS leads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID REFERENCES clinics(id) ON DELETE SET NULL,
    full_name    TEXT,
    email        TEXT,
    phone        TEXT,
    service      TEXT,
    preferred_dt TEXT,
    note         TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 7B — Fix RLS on bookings
--     ROOT CAUSE: Old v4 policy used `FOR ALL USING (...)` which
--     did NOT include `WITH CHECK` for INSERT in all versions
--     of PostgREST — causing silent insert failures with anon key.
-- =============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on bookings to start fresh
DROP POLICY IF EXISTS "user_own_bookings" ON bookings;
DROP POLICY IF EXISTS "clinic_own_bookings" ON bookings;
DROP POLICY IF EXISTS "users_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "users_select_bookings" ON bookings;
DROP POLICY IF EXISTS "users_update_bookings" ON bookings;
DROP POLICY IF EXISTS "users_delete_bookings" ON bookings;
DROP POLICY IF EXISTS "clinics_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "clinics_select_bookings" ON bookings;
DROP POLICY IF EXISTS "clinics_update_bookings" ON bookings;

-- ── USER POLICIES ──

-- 1. Users can INSERT their own bookings
CREATE POLICY "users_insert_bookings" ON bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Users can SELECT their own bookings
CREATE POLICY "users_select_bookings" ON bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Users can UPDATE their own bookings (e.g., cancel)
CREATE POLICY "users_update_bookings" ON bookings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can DELETE their own bookings
CREATE POLICY "users_delete_bookings" ON bookings
    FOR DELETE
    USING (auth.uid() = user_id);

-- ── CLINIC POLICIES ──
-- NOTE: These rely on the fact that Supabase Auth sessions for
-- clinic users (email/password login) also have a valid auth.uid().
-- The `SELECT id FROM clinics` subquery allows any authenticated
-- user to see/update bookings for ANY clinic that exists.
-- This is the current design (Phase 2). Phase 3+ will add owner_id.

-- 5. Clinics can INSERT bookings (for walk-in/create-on-behalf)
CREATE POLICY "clinics_insert_bookings" ON bookings
    FOR INSERT
    WITH CHECK (
        clinic_id IN (SELECT id FROM clinics)
    );

-- 6. Clinics can SELECT bookings for their clinic
CREATE POLICY "clinics_select_bookings" ON bookings
    FOR SELECT
    USING (
        clinic_id IN (SELECT id FROM clinics)
    );

-- 7. Clinics can UPDATE bookings for their clinic
CREATE POLICY "clinics_update_bookings" ON bookings
    FOR UPDATE
    USING (
        clinic_id IN (SELECT id FROM clinics)
    )
    WITH CHECK (
        clinic_id IN (SELECT id FROM clinics)
    );

-- =============================================================
-- 7C — Ensure indexes exist on bookings
-- =============================================================
CREATE INDEX IF NOT EXISTS bookings_user_idx   ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_clinic_idx ON bookings(clinic_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- =============================================================
-- 7D — Ensure chat_sessions table exists + RLS
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

COMMENT ON TABLE chat_sessions IS 'Ties a user+clinic chat conversation to a booking for shared history';

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- 🛡️ Defensive: ensure booking_id column exists even if v6 was partially applied
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "user_own_sessions" ON chat_sessions;
CREATE POLICY "user_own_sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clinic_own_sessions" ON chat_sessions;
CREATE POLICY "clinic_own_sessions" ON chat_sessions
    FOR ALL USING (
        clinic_id IN (SELECT id FROM clinics)
    );

-- 🛡️ Also defensive: re-add the COMMENT in case table was created without it
COMMENT ON COLUMN chat_sessions.booking_id IS 'The booking this chat session belongs to (nullable for pre-booking chats)';

CREATE INDEX IF NOT EXISTS chat_sessions_booking_idx ON chat_sessions(booking_id);
CREATE INDEX IF NOT EXISTS chat_sessions_clinic_idx  ON chat_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx    ON chat_sessions(user_id);

-- =============================================================
-- 7E — Ensure patient_profiles table exists + RLS
-- =============================================================
CREATE TABLE IF NOT EXISTS patient_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,
    data_cards  JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_patient_profile" ON patient_profiles;
CREATE POLICY "user_own_patient_profile" ON patient_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clinic_own_patient_profiles" ON patient_profiles;
CREATE POLICY "clinic_own_patient_profiles" ON patient_profiles
    FOR ALL USING (
        clinic_id IN (SELECT id FROM clinics)
    );

CREATE INDEX IF NOT EXISTS patient_profiles_user_idx   ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS patient_profiles_clinic_idx ON patient_profiles(clinic_id);
