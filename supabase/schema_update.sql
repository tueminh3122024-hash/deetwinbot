-- DeeTwin Schema Update
-- Run this in Supabase SQL Editor (safe to run multiple times)

-- 1. Extend clinics table
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS tax_id        TEXT,
    ADD COLUMN IF NOT EXISTS doctor_name   TEXT,
    ADD COLUMN IF NOT EXISTS specialty     TEXT,
    ADD COLUMN IF NOT EXISTS working_hours TEXT,
    ADD COLUMN IF NOT EXISTS map_url       TEXT,
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS address       TEXT;

-- 2. topup_requests
CREATE TABLE IF NOT EXISTS topup_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    token_amount  BIGINT NOT NULL,
    price_vnd     BIGINT,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at   TIMESTAMPTZ
);

-- 3. chat_history
CREATE TABLE IF NOT EXISTS chat_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id   UUID REFERENCES clinics(id) ON DELETE SET NULL,
    message     TEXT NOT NULL,
    response    TEXT NOT NULL,
    tokens_used INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. bookings (Tally Webhook target)
-- NOTE: email field MUST match the user Google Login email for auto-mapping
CREATE TABLE IF NOT EXISTS bookings (
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

CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings(email);

-- 5. profiles - add missing columns
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS full_name  TEXT,
    ADD COLUMN IF NOT EXISTS age        INT,
    ADD COLUMN IF NOT EXISTS phone      TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 6. RLS Policies

-- chat_history: users see only their own rows
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_history" ON chat_history;
CREATE POLICY "user_own_history" ON chat_history
    FOR ALL USING (auth.uid() = user_id);

-- topup_requests: service role only (managed via admin)
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_own_topups" ON topup_requests;
CREATE POLICY "clinic_own_topups" ON topup_requests
    FOR ALL USING (true);

-- bookings: users see bookings where email matches their login email
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_bookings" ON bookings;
CREATE POLICY "user_own_bookings" ON bookings
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Clinics: allow service role full access (managed by admin)
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_service_access" ON clinics;
CREATE POLICY "clinic_service_access" ON clinics
    FOR ALL USING (true);

-- 7. decrement_clinic_tokens RPC
CREATE OR REPLACE FUNCTION decrement_clinic_tokens(
    clinic_id UUID,
    amount    INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clinics
    SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - amount)
    WHERE id = clinic_id;
END;
$$;
