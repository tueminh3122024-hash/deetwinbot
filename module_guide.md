# DeeTwin Module & Development Guide

Tài liệu này hướng dẫn cách vận hành và phát triển tiếp các Module lõi của DeeTwin.

## 1. Module Admin & Clinic Management
- **Entry Point**: `/admin/login` -> `/admin`.
- **Chức năng**: 
  - CRUD Clinic: Tạo mới phòng mạch với Email/SĐT định danh.
  - Token Control: Nạp tiền (Top-up) thủ công cho Clinic.
  - System Config: Chỉnh sửa `token_rate` (Số tin nhắn / 1 Token) và `master_prompt`.
- **Lưu ý**: Mọi thao tác Admin sử dụng `adminClient` (Service Role) để bypass RLS, đảm bảo quyền tối thượng.

## 2. Module Chat & AI Intelligence
- **Component**: `ChatBox.tsx`.
- **Tính năng**:
  - Tự động nhận diện Widget: `[WIDGET:BOOKING]`, `[WIDGET:PAY]`, `[WIDGET:VIDEO]`.
  - Tự động làm đẹp văn bản: Thay `###` bằng icon Lửa, thêm icon cho "Kết luận", "Tóm tắt".
  - Multimedia: Hỗ trợ TikTok, YouTube, Tally Form (auto-height).

## 3. Module Tokenomics (Giải pháp cuối cùng)
Lỗi `text ->> integer` xuất hiện do kiểu dữ liệu không đồng nhất. Dưới đây là đoạn SQL "Vá lỗi" cuối cùng để hệ thống trừ tiền hoạt động 100%:

```sql
-- VÁ LỖI TRỪ TOKEN (FINAL FIX)
-- Chạy đoạn này để sửa lỗi "operator does not exist: text ->> integer"

CREATE OR REPLACE FUNCTION handle_chat_token_deduction()
RETURNS TRIGGER AS $$
DECLARE
    current_rate NUMERIC;
    raw_value TEXT;
BEGIN
    -- Lấy giá trị thô từ cài đặt
    SELECT (value::TEXT) INTO raw_value 
    FROM system_settings 
    WHERE key = 'token_rate';

    -- Làm sạch và ép kiểu an toàn (xử lý cả dấu ngoặc kép của JSON)
    current_rate := COALESCE(REPLACE(raw_value, '"', '')::NUMERIC, 5);

    -- Thực hiện trừ tiền
    IF NEW.clinic_id IS NOT NULL THEN
        UPDATE clinics
        SET token_balance = GREATEST(0, COALESCE(token_balance, 0) - (1.0 / current_rate))
        WHERE id = NEW.clinic_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kích hoạt lại trigger
DROP TRIGGER IF EXISTS trigger_deduct_tokens ON chat_history;
CREATE TRIGGER trigger_deduct_tokens
AFTER INSERT ON chat_history
FOR EACH ROW
EXECUTE FUNCTION handle_chat_token_deduction();
```

## 4. Hướng dẫn phát triển Module mới
Khi bạn muốn tạo một Module mới (ví dụ: Module Báo cáo sức khỏe):
1. **DB**: Tạo bảng mới trong Supabase, luôn có `clinic_id` để phân quyền.
2. **Action**: Tạo Server Action trong `src/lib/actions/` để handle logic nghiệp vụ.
3. **UI**: Sử dụng phong cách Glassmorphism: `bg-gray-900/50 backdrop-blur-md border border-gray-800`.
4. **AI**: Cập nhật `master_prompt` trong Admin để AI biết cách hướng người dùng vào Module mới đó.
