-- DeeTwin Schema Update v10: Clinic Details & RLS Fix
-- =============================================================

-- 1. Extend clinics table with missing fields for Admin CRUD
ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS email        TEXT,
    ADD COLUMN IF NOT EXISTS legal_info   TEXT,
    ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE;

-- 2. Ensure system_settings RLS is robust
-- Allow admin role OR the specific admin email to manage settings
DROP POLICY IF EXISTS "admin_manage_settings" ON system_settings;
CREATE POLICY "admin_manage_settings" ON system_settings
    FOR ALL USING (
        (auth.jwt() ->> 'role' = 'admin') OR 
        (auth.jwt() ->> 'email' = 'admin@deetwin.vn') OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

-- 3. Ensure clinics RLS allows admin to manage everything
DROP POLICY IF EXISTS "admin_manage_clinics" ON clinics;
CREATE POLICY "admin_manage_clinics" ON clinics
    FOR ALL USING (
        (auth.jwt() ->> 'role' = 'admin') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

-- 4. chat_history RLS for clinic viewing
-- Clinics can see history where clinic_id matches
DROP POLICY IF EXISTS "clinic_view_history" ON chat_history;
CREATE POLICY "clinic_view_history" ON chat_history
    FOR SELECT USING (
        clinic_id IN (SELECT id FROM clinics)
    );
