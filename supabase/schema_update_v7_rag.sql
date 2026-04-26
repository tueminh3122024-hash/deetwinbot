-- DeeTwin RAG & History Upgrade
-- =============================================================
-- 1. Kích hoạt tiện ích Vector (để dùng cho RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Bảng Knowledge Base (Bộ não tri thức)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE, -- NULL nếu là tri thức chung toàn hệ thống
    source_type TEXT CHECK (source_type IN ('file', 'web', 'text')),
    source_name TEXT, -- Tên file hoặc URL
    content     TEXT, -- Nội dung văn bản thô
    embedding   VECTOR(1536), -- Vector 1536 chiều cho Gemini/OpenAI Embeddings
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng Logs tập trung (cho Admin thống kê)
-- Chúng ta sẽ dùng bảng chat_history hiện có nhưng thêm các index quan trọng
CREATE INDEX IF NOT EXISTS idx_chat_history_clinic_id ON chat_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);

-- 4. RLS cho Knowledge Base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to knowledge" 
    ON knowledge_base FOR ALL 
    USING (auth.jwt() ->> 'email' IN (SELECT value FROM system_settings WHERE key = 'admin_emails'));

-- 5. Hàm tìm kiếm Vector (Similarity Search)
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_clinic_id UUID
) RETURNS TABLE (
  id UUID,
  content TEXT,
  source_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.source_name,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE (kb.clinic_id IS NULL OR kb.clinic_id = p_clinic_id)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
