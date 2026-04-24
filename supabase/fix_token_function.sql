-- Dọn dẹp các hàm cũ để tránh lỗi "Overloading" (Candidate function mismatch)
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, INT);
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, NUMERIC);
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, NUMERIC, UUID, NUMERIC);

-- Hàm trừ Token chuẩn hóa mới
CREATE OR REPLACE FUNCTION decrement_clinic_tokens(
    p_clinic_id UUID DEFAULT NULL,
    p_amount    NUMERIC DEFAULT NULL,
    clinic_id   UUID DEFAULT NULL,
    amount      NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_id UUID;
    target_amt NUMERIC;
BEGIN
    target_id := COALESCE(p_clinic_id, clinic_id);
    target_amt := COALESCE(p_amount, amount);

    IF target_id IS NOT NULL AND target_amt IS NOT NULL THEN
        UPDATE clinics
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - target_amt)
        WHERE id = target_id;
    END IF;
END;
$$;

-- Trigger tự động trừ token khi có tin nhắn mới
CREATE OR REPLACE FUNCTION handle_chat_token_deduction()
RETURNS TRIGGER AS $$
DECLARE
    current_rate NUMERIC;
BEGIN
    SELECT COALESCE((value->>0)::NUMERIC, 5) INTO current_rate 
    FROM system_settings 
    WHERE key = 'token_rate';

    IF NEW.clinic_id IS NOT NULL THEN
        UPDATE clinics
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - (1.0 / current_rate))
        WHERE id = NEW.clinic_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deduct_tokens ON chat_history;
CREATE TRIGGER trigger_deduct_tokens
AFTER INSERT ON chat_history
FOR EACH ROW
EXECUTE FUNCTION handle_chat_token_deduction();
