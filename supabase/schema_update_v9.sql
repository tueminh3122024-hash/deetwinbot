-- DeeTwin Schema Update v9: Dynamic Token Logic & System Settings
-- =============================================================

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed defaults (5 replies = 1 token)
INSERT INTO system_settings (key, value)
VALUES 
    ('token_rate', '5'::jsonb),
    ('master_prompt', '"Bạn là Bio-Guardian, hệ thống AI y tế cao cấp..."'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Convert token_balance to NUMERIC for fractional tokens
ALTER TABLE clinics 
    ALTER COLUMN token_balance TYPE NUMERIC USING token_balance::NUMERIC;

-- 3. Update decrement_clinic_tokens RPC to handle NUMERIC
CREATE OR REPLACE FUNCTION decrement_clinic_tokens(
    p_clinic_id UUID,
    p_amount    NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clinics
    SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - p_amount)
    WHERE id = p_clinic_id;
END;
$$;

-- 4. Update increment_clinic_tokens RPC to handle NUMERIC
CREATE OR REPLACE FUNCTION increment_clinic_tokens(
    p_clinic_id UUID,
    p_amount    NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clinics
    SET token_balance = COALESCE(token_balance, 0) + p_amount
    WHERE id = p_clinic_id;
END;
$$;

-- 5. Add RLS for system_settings (Admin only for write, anyone for read)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_settings" ON system_settings;
CREATE POLICY "allow_read_settings" ON system_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_settings" ON system_settings;
CREATE POLICY "admin_manage_settings" ON system_settings
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'email' = 'admin@deetwin.vn' -- Fallback for testing
    );
