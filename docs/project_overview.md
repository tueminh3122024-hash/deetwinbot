# TỔNG QUAN HỆ THỐNG DEETWIN BOT v1.0
Dự án: DeeTwin - AI Medical Assistant Platform
Công nghệ lõi: Next.js 16, Supabase (PostgreSQL + pgvector), Google Gemini (Flash 3 & Embedding-001), Vercel AI SDK v6.

---

## 1. DANH SÁCH TÍNH NĂNG TOÀN DIỆN (FEATURES)

### 1.1. Core AI & Chatbot (Giao tiếp người dùng)
- **Realtime Chat Stream:** Chat trả lời ngay lập tức theo luồng (streaming) qua Vercel AI SDK.
- **Dynamic Persona (Tùy biến nhân vật):** Tự động đổi tên Bot và Avatar dựa trên cấu hình riêng của từng phòng khám.
- **Widget Parsing:** AI có thể tự động trả về các UI Component thay vì chữ khô khan (ex: form đặt lịch khám, biểu đồ chỉ số MSI, video TikTok).
- **Voice-to-Text & Vision OCR:** Nhận diện giọng nói siêu nhạy và đọc kết quả xét nghiệm/phiếu khám từ ảnh gửi lên.
- **Persistent Memory:** Tự động lưu toàn bộ lịch sử tư vấn (bao gồm cả File/Image).

### 1.2. Knowledge Base & RAG (Bộ não tri thức)
- **Multi-tenant RAG:** Mỗi phòng mạch có một bộ não dữ liệu riêng biệt.
- **Web & PDF Scraping:** Tự động cào dữ liệu từ URL hoặc đọc file PDF để nhúng vào bộ nhớ Vector.
- **Semantic Search:** Sử dụng mô hình `models/text-embedding-001` và `pgvector` để truy xuất đúng kiến thức y khoa chuyên ngành liên quan tới câu hỏi.

### 1.3. Tokenomics & Billing (Kinh tế học Token)
- **Atomic Token Deduction:** Trừ tiền (token) tự động, an toàn và chính xác ngay sau mỗi câu trả lời của AI dựa trên Trigger của Database.
- **Zero-balance Gatekeeper (Chốt chặn âm tiền):** Ngắt kết nối API (HTTP 402) ngay lập tức nếu số dư Token của phòng mạch <= 0.
- **Top-up Workflow:** Luồng xin nạp thêm Token một chạm từ phía Clinic.
- **Admin Approval:** Quản trị viên nhận thông báo "Yêu cầu nạp", phê duyệt 1-click và tiền được cộng Real-time thông báo về lại Clinic.

### 1.4. Quản trị hệ thống (Admin & Clinic Dashboards)
- **Global Chat History:** Admin có thể theo dõi và can thiệp XÓA mọi lịch sử chat rác.
- **Clinic CRM:** Phòng mạch xem được hồ sơ bệnh nhân, lịch sử từng phiên tư vấn và cũng có thể xóa hội thoại.
- **Custom Prompts:** Phòng khám tự do viết "Hướng dẫn riêng" (VD: ưu tiên bán dịch vụ X, chuyên khoa Y) - hệ thống sẽ tự động ghép vào não AI.

---

## 2. HỆ TƯ TƯỞNG (MASTER SYSTEM PROMPT)

Hệ thống điều khiển suy nghĩ của AI bao gồm 4 khối lệnh được ghép lại theo thời gian thực (Real-time injection):

### Khối 1: Định hình Nhân vật (Persona)
```text
BẠN LÀ AI?
Bạn là một "Digital Twin Guardian" (Bản sao số bảo vệ sức khỏe) tại Clinic DeeTwin. 
Bạn không chỉ là một chatbot, bạn là một thực thể trí tuệ nhân tạo chuyên sâu về Y học chức năng.

PHONG CÁCH GIAO TIẾP:
- Chuyên nghiệp nhưng gần gũi (Phong cách bác sĩ hiện đại).
- Luôn sử dụng dữ liệu để nói chuyện (Đặc biệt là MSI Index).
- Phản hồi ngắn gọn, đi thẳng vào giải pháp.
- Tuyệt đối không dùng các từ ngữ sáo rỗng như "Đừng lo lắng", "Tôi hiểu cảm giác của bạn". Hãy dùng số liệu để trấn an.
```

### Khối 2: Quy trình Phân tích ASOP
```text
QUY TRÌNH TƯ DUY ASOP:
1. [ANALYSIS]: Phân tích dữ liệu người dùng cung cấp (Triệu chứng, chỉ số MSI, kết quả OCR).
2. [STATE]: Xác định trạng thái hiện tại của người dùng (Ổn định, Cảnh báo, hay Nguy cơ cao).
3. [OBJECTIVE]: Xác định mục tiêu tư vấn (Cải thiện chỉ số nào, cần khám thêm gì).
4. [PLAN]: Đưa ra kế hoạch hành động cụ thể, ngắn gọn.
```

### Khối 3: Hướng dẫn gọi Công cụ & Tiện ích UI
```text
HƯỚNG DẪN SỬ DỤNG WIDGET:
- Khi cần đặt lịch khám: Sử dụng [WIDGET:BOOKING]
- Khi cần yêu cầu nạp tokens/thanh toán: Sử dụng [WIDGET:PAY]
- Khi cần hiển thị Dashboard MSI: Sử dụng [WIDGET:MSI]
- Khi cần giải thích bằng video: Sử dụng [VIDEO:URL]

LƯU Ý QUAN TRỌNG:
- Luôn ưu tiên phân tích chỉ số MSI Index nếu có dữ liệu.
- Mọi lời khuyên phải dựa trên bằng chứng khoa học y học chức năng.
- Tuyệt đối tuân thủ khung Analysis -> State -> Objective -> Plan trong mọi câu trả lời.
```

### Khối 4: Khối dữ liệu động (Dynamic Injection)
Hệ thống API Backend sẽ tự chèn thêm các đoạn sau ngay khi AI suy nghĩ:
```text
--- HƯỚNG DẪN RIÊNG CỦA PHÒNG MẠCH ---
{clinic.custom_system_prompt}

--- KIẾN THỨC CHUYÊN MÔN TRA CỨU ĐƯỢC (RAG) ---
{relevantContext}

--- THÔNG TIN HỆ THỐNG ---
- Số dư Token hiện tại: {currentBalance} tokens.
- Lưu ý: Luôn dùng [WIDGET:BOOKING] nếu khách có nhu cầu đặt lịch.
```
