import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    console.log('Request received at /api/chat');
    // Temporary hardcoded response for pipe verification


    try {
        const body = await request.json();
        console.log('Received body:', body);
        const { messages: uiMessages, id } = body;
        if (!uiMessages) {
            throw new Error('Missing messages field in request body');
        }

        // Check for API key (optional for demo, but will throw if missing)
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.warn('GOOGLE_GENERATIVE_AI_API_KEY is not set. Using dummy key.');
        } else {
            console.log('GOOGLE_GENERATIVE_AI_API_KEY is present (length)', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 'missing');
        }
        console.log('Gemini Request Sent with API Key:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

        const systemPrompt = `Bạn là DeeTwin - Trợ lý Sức khỏe Kỹ thuật số (Digital Bio-Guardian) thuộc hệ sinh thái mBOS.

Nhiệm vụ của bạn là hỗ trợ theo dõi chỉ số chuyển hóa (MSI), tư vấn sức khỏe dựa trên dữ liệu thực tế và kết nối người dùng với các Clinic chuyên khoa.

Xưng "Tôi", gọi người dùng là "Bạn/Anh/Chị".

---

QUY TẮC ĐỊNH DẠNG (BẮT BUỘC - không được vi phạm):
- Tuyệt đối KHÔNG dùng dấu sao (**) để in đậm.
- Tuyệt đối KHÔNG dùng bảng (table) hay markdown phức tạp.
- Sử dụng xuống dòng thường xuyên để tạo khoảng trắng dễ đọc trên màn hình nhỏ.
- Trình bày danh sách bằng dấu gạch ngang (-) đơn giản.
- Ngôn ngữ: Tiếng Việt tự nhiên, chuyên nghiệp, đồng cảm.

---

CHỈ SỐ SINH HỌC CỐT LÕI:

- MSI (Metabolic Stability Index): Chỉ số ổn định chuyển hóa. Phản ánh sự cân bằng giữa nhịp tim và đường huyết.

- MGC (Metabolic Glycemic Control): Hệ số kiểm soát Glucose. Mục tiêu lý tưởng là 90 mg/dL.

- MFV (Metabolic Flow Velocity): Vận tốc dòng chuyển hóa.

- EIB (Energy Intake Balance): Năng lực chịu tải của cơ thể.

---

KHẢ NĂNG:

- Phân tích dữ liệu: Nhận diện và giải thích các chỉ số từ thiết bị đeo hoặc ảnh chụp kết quả xét nghiệm (Vision).

- Nếu nhận được hình ảnh, kích hoạt chế độ Vision để trích xuất ngay các chỉ số (Huyết áp, Nhịp tim, Đường huyết...) và trả về kết quả phân tích.

- Dữ liệu của người dùng được đồng bộ hóa an toàn với hệ thống DeeTwin App và được bảo mật theo chuẩn HIPAA.

---

HÀNH ĐỘNG (CTA):

- Nếu chỉ số MSI hoặc MGC có dấu hiệu bất ổn, giải thích nhẹ nhàng rồi gọi tool show_medical_lead_form để mời đặt lịch tư vấn sâu.

- Nếu người dùng hỏi về đặt lịch, hướng dẫn họ dùng [WIDGET:BOOKING] hoặc liên hệ qua Zalo/WhatsApp.

- Luôn ưu tiên kết nối người dùng với Clinic hơn là tư vấn suông.

- Nếu không đủ dữ liệu để kết luận, yêu cầu cung cấp thêm chỉ số hoặc ảnh chụp, không đoán mò.

---

TOOLS:
- show_tiktok_video: Nhúng video TikTok.
- show_medical_lead_form: Hiển thị form đặt lịch khám/tư vấn.
- show_msi_dashboard: Hiển thị bảng chỉ số chuyển hóa.

MULTIMEDIA TAGS:
- [VIDEO: URL] cho video hướng dẫn.
- [WIDGET:PAY] để nạp token.
- [WIDGET:BOOKING] để đặt lịch.`;

        // Define tools
        const tools = {
            show_tiktok_video: tool({
                description: 'Embed a TikTok video player with the given video ID',
                inputSchema: z.object({
                    videoId: z.string().describe('The TikTok video ID (e.g., "v123456789")'),
                    caption: z.string().optional().describe('Optional caption for the video'),
                }),
                execute: async ({ videoId, caption }) => {
                    // Return data that the frontend can use to render the TikTokPlayer widget
                    return {
                        widget: 'TikTokPlayer',
                        videoId,
                        caption,
                    };
                },
            }),
            show_medical_lead_form: tool({
                description: 'Display a medical lead form to capture patient information',
                inputSchema: z.object({
                    clinicId: z.string().describe('The ID of the clinic to associate the lead with'),
                    defaultName: z.string().optional().describe('Default patient name'),
                }),
                execute: async ({ clinicId, defaultName }) => {
                    return {
                        widget: 'MedicalLeadForm',
                        clinicId,
                        defaultName,
                    };
                },
            }),
            show_msi_dashboard: tool({
                description: 'Display a dashboard with clinic sales and performance metrics',
                inputSchema: z.object({
                    clinicId: z.string().describe('The clinic ID to show metrics for'),
                    timeframe: z.enum(['day', 'week', 'month']).default('week').describe('Timeframe for metrics'),
                }),
                execute: async ({ clinicId, timeframe }) => {
                    return {
                        widget: 'MSIDashboard',
                        clinicId,
                        timeframe,
                    };
                },
            }),
        };

        const messages = await convertToModelMessages(uiMessages, { tools });

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        let result;
        try {
            result = streamText({
                model: google('gemini-3-flash-preview'), // Valid 2026 model name
                system: systemPrompt,
                messages,
                tools,
                onFinish: async ({ text }) => {
                    if (id && text) {
                        const supabase = await createClient();
                        // Save assistant message
                        await supabase.from('messages').insert({
                            clinic_id: id,
                            role: 'assistant',
                            content: text
                        });
                    }
                }
            });

            // Save user message (last one in history)
            if (id && uiMessages && uiMessages.length > 0) {
                const lastUserMessage = uiMessages[uiMessages.length - 1];
                if (lastUserMessage.role === 'user') {
                    const supabase = await createClient();
                    await supabase.from('messages').insert({
                        clinic_id: id,
                        role: 'user',
                        content: lastUserMessage.content || lastUserMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n')
                    });
                }
            }
        } catch (initError) {
            console.error('Model initialization failed, attempting fallback to gemini-2.5-flash...');
            result = streamText({
                model: google('gemini-2.5-flash'),
                system: systemPrompt,
                messages,
                tools,
            });
        }

        const crypto = await import('crypto');
        const response = result.toUIMessageStreamResponse({ 
            generateMessageId: () => id ?? crypto.randomUUID()
        });
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return response;
    } catch (error: any) {
        console.dir(error, { depth: null });
        // Log additional context
        console.log('API key length:', process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 'missing');
        console.log('Model attempted: gemini-1.5-flash'); 
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        return new Response(
            JSON.stringify({
                error: 'Chatbot request failed',
                message: errorMessage,
                stack: errorStack,
                hint: 'Check your GOOGLE_GENERATIVE_AI_API_KEY and model availability.'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    }
}