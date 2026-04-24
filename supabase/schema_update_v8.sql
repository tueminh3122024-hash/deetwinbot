-- DeeTwin Schema Update v8: Final Sync & Fixes
-- =============================================================
-- Run this in Supabase SQL Editor. 
-- Ensures all necessary columns exist and RLS is clean.
-- =============================================================

-- 1. Ensure chat_summary exists in bookings (Required for Appointments page)
ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS chat_summary TEXT;

COMMENT ON COLUMN bookings.chat_summary IS 'AI-generated summary of the chat conversation, populated on Khám Xong';

-- 2. Ensure booking_id exists in chat_sessions (Required for linking)
ALTER TABLE chat_sessions 
    ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- 3. Cleanup RLS for bookings (Ensure clinics can see them)
DROP POLICY IF EXISTS "clinics_select_bookings" ON bookings;
CREATE POLICY "clinics_select_bookings" ON bookings
    FOR SELECT
    USING (
        clinic_id IN (SELECT id FROM clinics)
    );

-- 4. Cleanup RLS for chat_sessions
DROP POLICY IF EXISTS "clinic_own_sessions" ON chat_sessions;
CREATE POLICY "clinic_own_sessions" ON chat_sessions
    FOR ALL USING (
        clinic_id IN (SELECT id FROM clinics)
    );

-- 5. Add missing updated_at trigger if needed (Optional but good)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
