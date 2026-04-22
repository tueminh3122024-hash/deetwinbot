-- DeeTwin Schema Update v2
-- Run in Supabase SQL Editor

-- 1. Add custom_system_prompt column to clinics
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS custom_system_prompt TEXT,
    ADD COLUMN IF NOT EXISTS bot_avatar_url        TEXT,
    ADD COLUMN IF NOT EXISTS bot_name              TEXT;

-- 2. medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id    UUID REFERENCES clinics(id) ON DELETE SET NULL,
    image_url    TEXT,
    raw_json     JSONB,          -- full Gemini extraction result
    msi          NUMERIC,
    eib          NUMERIC,
    mfv          NUMERIC,
    mgc          NUMERIC,
    notes        TEXT,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS medical_records_user_idx ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS medical_records_clinic_idx ON medical_records(clinic_id);

-- RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_records" ON medical_records;
CREATE POLICY "user_own_records" ON medical_records
    FOR ALL USING (auth.uid() = user_id);

-- 3. Increment token RPC (for top-up by admin)
CREATE OR REPLACE FUNCTION increment_clinic_tokens(
    clinic_id UUID,
    amount    INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clinics
    SET token_balance = COALESCE(token_balance, 0) + amount
    WHERE id = clinic_id;
END;
$$;

-- 4. decrement_clinic_tokens already exists from v1, but update to be safe
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
