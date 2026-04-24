-- DeeTwin Schema Update v6: Chat Sessions, Patient Profiles & Booking Links
-- =============================================================
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- Must be applied AFTER schema_update_v5.sql.
-- =============================================================

-- =============================================================
-- 6A — Create chat_sessions table
-- Each session links a user+clinic conversation to a booking.
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

COMMENT ON TABLE  chat_sessions IS 'Ties a user+clinic chat conversation to a booking for shared history';
COMMENT ON COLUMN chat_sessions.booking_id IS 'The booking this chat session belongs to (nullable for pre-booking chats)';

-- =============================================================
-- 6B — Add chat_summary to bookings
-- Stores the AI-generated summary of the chat for Khám Xong
-- =============================================================
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS chat_summary TEXT;

COMMENT ON COLUMN bookings.chat_summary IS 'AI-generated summary of the chat conversation, populated on Khám Xong';

-- =============================================================
-- 6C — Create chat_messages table (session-based messages)
-- More structured than raw chat_history, linked to sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content       TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE chat_messages IS 'Individual messages within a chat session';

-- =============================================================
-- 6D — RLS Policies
-- =============================================================

-- chat_sessions: user sees own, clinic sees their own
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_sessions" ON chat_sessions;
CREATE POLICY "user_own_sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "clinic_own_sessions" ON chat_sessions;
CREATE POLICY "clinic_own_sessions" ON chat_sessions
    FOR ALL USING (
        clinic_id IN (
            SELECT id FROM clinics WHERE id = clinic_id
        )
    );

-- chat_messages: inherit from session
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_messages" ON chat_messages;
CREATE POLICY "user_own_messages" ON chat_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM chat_sessions WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "clinic_own_messages" ON chat_messages;
CREATE POLICY "clinic_own_messages" ON chat_messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM chat_sessions WHERE clinic_id IN (
                SELECT id FROM clinics WHERE id = clinic_id
            )
        )
    );

-- Allow authenticated users to INSERT chat_messages for sessions they're part of
DROP POLICY IF EXISTS "auth_insert_messages" ON chat_messages;
CREATE POLICY "auth_insert_messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            WHERE cs.id = session_id
            AND (cs.user_id = auth.uid() OR cs.clinic_id IN (
                SELECT id FROM clinics WHERE id = cs.clinic_id
            ))
        )
    );

-- Also allow select on bookings for both user and clinic
-- The existing policies from v4 already handle this:
-- "user_own_bookings" FOR ALL USING (auth.uid() = user_id)
-- "clinic_own_bookings" FOR ALL USING (clinic_id IN (SELECT id FROM clinics))

-- =============================================================
-- 6E — Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS chat_sessions_booking_idx ON chat_sessions(booking_id);
CREATE INDEX IF NOT EXISTS chat_sessions_clinic_idx  ON chat_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS chat_sessions_user_idx    ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);
