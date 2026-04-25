-- 1. XÓA SẠCH CÁC HÀM CŨ (DỌN DẸP RÁC ĐỂ TRÁNH LỖI OVERLOADING)
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, INT);
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, NUMERIC);
DROP FUNCTION IF EXISTS decrement_clinic_tokens(UUID, NUMERIC, UUID, NUMERIC);

-- 2. TẠO LẠI HÀM TRỪ TIỀN CHUẨN (HỖ TRỢ CẢ 2 CÁCH GỌI THAM SỐ)
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

-- 3. HÀM TRIGGER (XỬ LÝ TỰ ĐỘNG KHI CÓ TIN NHẮN MỚI)
CREATE OR REPLACE FUNCTION handle_chat_token_deduction()
RETURNS TRIGGER AS $$
DECLARE
    current_rate NUMERIC;
    raw_setting TEXT;
BEGIN
    -- Lấy giá trị thô từ system_settings
    SELECT value::TEXT INTO raw_setting 
    FROM system_settings 
    WHERE key = 'token_rate';

    -- Làm sạch dữ liệu: Xóa dấu ngoặc kép " (nếu có do kiểu JSONB) và ép kiểu về Numeric
    -- Nếu không tìm thấy, mặc định tỷ lệ là 5 tin nhắn = 1 token
    current_rate := COALESCE(REPLACE(raw_setting, '"', '')::NUMERIC, 5);

    -- Thực hiện trừ token của clinic
    IF NEW.clinic_id IS NOT NULL THEN
        UPDATE clinics
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - (1.0 / current_rate))
        WHERE id = NEW.clinic_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GẮN TRIGGER VÀO BẢNG CHAT_HISTORY
DROP TRIGGER IF EXISTS trigger_deduct_tokens ON chat_history;
CREATE TRIGGER trigger_deduct_tokens
AFTER INSERT ON chat_history
FOR EACH ROW
EXECUTE FUNCTION handle_chat_token_deduction();
