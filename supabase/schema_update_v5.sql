-- DeeTwin Schema Update v5: Clinic Services & Booking Flow
-- =============================================================
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- Must be applied AFTER schema_update_v4.sql.
-- =============================================================

-- =============================================================
-- 5A — Create clinic_services table
-- =============================================================
CREATE TABLE IF NOT EXISTS clinic_services (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

COMMENT ON TABLE  clinic_services IS 'Services offered by each clinic, manageable via Settings UI';
COMMENT ON COLUMN clinic_services.name IS 'Service name (e.g. Tổng quát, Răng hàm mặt)';
COMMENT ON COLUMN clinic_services.description IS 'Optional description of the service';

-- =============================================================
-- 5B — RLS Policies for clinic_services
-- =============================================================
ALTER TABLE clinic_services ENABLE ROW LEVEL SECURITY;

-- Clinic admins can manage their own services
DROP POLICY IF EXISTS "clinic_own_services" ON clinic_services;
CREATE POLICY "clinic_own_services" ON clinic_services
    FOR ALL USING (
        clinic_id IN (
            SELECT id FROM clinics WHERE id = clinic_id
        )
    );

-- Authenticated users can read services (for the booking popup)
DROP POLICY IF EXISTS "users_read_services" ON clinic_services;
CREATE POLICY "users_read_services" ON clinic_services
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================
-- 5C — Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS clinic_services_clinic_idx ON clinic_services(clinic_id);
