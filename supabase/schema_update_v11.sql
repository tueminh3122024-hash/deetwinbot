-- DeeTwin Schema Update v11: Final Stabilizer & Real-time Fix
-- =============================================================

-- 1. Fix the "clinics_id_fkey" error
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_id_fkey;

-- 2. Ensure Real-time tokens work perfectly
ALTER TABLE clinics REPLICA IDENTITY FULL;

-- 3. Stabilize profiles table (Ensure 'role' exists for admin policies)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 4. Fix system_settings table constraints
-- Ensure 'key' is the primary key so ON CONFLICT works.
DO $$ 
BEGIN
    -- Check if primary key exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'system_settings' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE system_settings ADD PRIMARY KEY (key);
    END IF;
END $$;

-- 5. Seed/Reset default settings
-- Now that we've ensured 'key' is a primary key, ON CONFLICT will work.
INSERT INTO system_settings (key, value)
VALUES 
    ('token_rate', '5'::jsonb),
    ('master_prompt', '"Bạn là DeeTwin, trợ lý y tế kỹ thuật số chuyên nghiệp. Hãy tư vấn sức khỏe dựa trên các chỉ số MSI, Glucose và Biometric của người dùng. Khi cần đặt lịch, hãy dùng mã [WIDGET:BOOKING]."'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 6. Fix chat_history RLS for Admin
DROP POLICY IF EXISTS "admin_view_all_history" ON chat_history;
CREATE POLICY "admin_view_all_history" ON chat_history
    FOR ALL USING (
        (auth.jwt() ->> 'role' = 'admin') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );
