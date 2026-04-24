# DeeTwin Project Structure Summary

Dự án DeeTwin được xây dựng trên nền tảng Next.js 15+ (Turbopack) kết hợp với Supabase, tập trung vào trải nghiệm y tế số (Cyber-Medical).

## 1. Directory Structure

### 📂 `src/app` (Next.js App Router)
- `(dashboard)/`: Chứa các trang dành cho Clinic (Lịch hẹn, Bệnh nhân, Cài đặt).
- `admin/`: Module quản trị Master dành cho Root Admin (Quản lý Clinic, Tokenomics, System Prompt).
- `api/chat/`: Backend xử lý logic AI, streaming và trừ Token.
- `chat/`: Trang chat dành cho người dùng cuối (User).
- `settings/`: Trang cấu hình hồ sơ cá nhân và phòng mạch.

### 📂 `src/components` (UI Components)
- `chat/`: Chứa `ChatBox.tsx` (Lõi của hệ thống AI) và các Widget (Video, Booking, MSI Dashboard).
- `Navigation/`: Sidebar, Bottom Tab Bar được thiết kế theo phong cách Cyber-Medical.
- `providers/`: `AIProvider.tsx` quản lý State toàn cục (Token balance, Real-time sync).

### 📂 `src/lib` (Logic & Utils)
- `supabase/`: Cấu hình `client.ts` (Client-side) và `admin.ts` (Server-side Service Role).
- `actions/`: Chứa các Next.js Server Actions cho Admin (fetchClinics, updateSettings...).

### 📂 `supabase/` (Database)
- Chứa các file `schema_update_vX.sql` theo dõi lịch sử cập nhật DB.

## 2. Core Technology Stack
- **Framework**: Next.js (App Router, Server Actions).
- **Styling**: Tailwind CSS + Lucide Icons + Glassmorphism Design.
- **Database**: Supabase (PostgreSQL) + Realtime (để nhảy số Token tức thì).
- **AI Engine**: Google Gemini 1.5 Flash (via Vercel AI SDK).
- **Booking**: Tally.so Integration (via dynamic iframes).

## 3. Key Data Flow
1. **User Chat**: Client gửi tin nhắn -> AI SDK xử lý -> `onFinish` lưu vào `chat_history`.
2. **Token Deduction**: Khi có record mới trong `chat_history` -> Database Trigger tự động trừ `token_balance` của Clinic tương ứng.
3. **Admin Control**: Admin cập nhật `token_rate` -> Trigger tự động áp dụng tỷ lệ mới cho mọi lần trừ tiền sau đó.
