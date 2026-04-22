import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export const maxDuration = 60

// ─── Base DeeTwin system prompt ─────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `Bạn là DeeTwin - Trợ lý Sức khỏe Kỹ thuật số (Digital Bio-Guardian) thuộc hệ sinh thái mBOS.

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

- MSI (Metabolic Stability Index): Chỉ số ổn định chuyển hóa. Phản ánh sự cân bằng giữa nhịp tim và đường huyết. Thang điểm 0-100.

- MGC (Metabolic Glycemic Control): Hệ số kiểm soát Glucose. Mục tiêu lý tưởng là 90 mg/dL.

- MFV (Metabolic Flow Velocity): Vận tốc dòng chuyển hóa. Đơn vị ml/min. Bình thường > 60.

- EIB (Energy Intake Balance): Năng lực cân bằng năng lượng. Đơn vị %. Bình thường > 80%.

---

KHẢ NĂNG:

- Phân tích dữ liệu: Nhận diện và giải thích các chỉ số từ thiết bị đeo hoặc ảnh chụp kết quả xét nghiệm.

- Nếu nhận được hình ảnh, trích xuất ngay các chỉ số (Huyết áp, Nhịp tim, Đường huyết...) và trả về kết quả phân tích.

- Dữ liệu được bảo mật theo chuẩn HIPAA.

---

HÀNH ĐỘNG (CTA):

- Nếu chỉ số MSI hoặc MGC bất ổn, giải thích nhẹ nhàng rồi gọi tool show_medical_lead_form để mời đặt lịch tư vấn.

- Nếu người dùng hỏi đặt lịch, hướng dẫn dùng [WIDGET:BOOKING] hoặc liên hệ Zalo/WhatsApp.

- Luôn ưu tiên kết nối người dùng với Clinic hơn tư vấn suông.

- Nếu không đủ dữ liệu, yêu cầu cung cấp thêm chỉ số hoặc ảnh chụp.

---

MULTIMEDIA TAGS:
- [VIDEO: URL] cho video hướng dẫn
- [WIDGET:PAY] để nạp token
- [WIDGET:BOOKING] để đặt lịch`

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages: uiMessages, id: clinicId } = body

        if (!uiMessages) {
            return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 })
        }

        // ── Fetch clinic custom prompt and token balance ──────────────────────
        let systemPrompt = BASE_SYSTEM_PROMPT
        let currentTokenBalance = 0

        if (clinicId) {
            try {
                const supabase = await createClient()
                const { data: clinic } = await supabase
                    .from('clinics')
                    .select('custom_system_prompt, token_balance, bot_name')
                    .eq('id', clinicId)
                    .single()

                if (clinic) {
                    currentTokenBalance = clinic.token_balance ?? 0

                    // Block if out of tokens
                    if (currentTokenBalance <= 0) {
                        return new Response(JSON.stringify({ error: 'Insufficient tokens' }), {
                            status: 402,
                            headers: { 'Content-Type': 'application/json' },
                        })
                    }

                    // Inject custom prompt after base prompt
                    if (clinic.custom_system_prompt?.trim()) {
                        systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n---\n\nHƯỚNG DẪN RIÊNG CỦA PHÒNG MẠCH:\n${clinic.custom_system_prompt}`
                    }
                }
            } catch (e) {
                console.warn('[chat] Could not fetch clinic config:', e)
            }
        }

        // ── Convert UI messages → model messages ──────────────────────────────
        const messages = await convertToModelMessages(uiMessages)

        // ── Define tools ──────────────────────────────────────────────────────
        const tools = {
            show_tiktok_video: tool({
                description: 'Embed a TikTok video in the chat when discussing health topics with video examples',
                inputSchema: z.object({
                    videoId: z.string().describe('The TikTok video ID to embed'),
                    caption: z.string().optional().describe('Optional caption for the video'),
                }),
                execute: async ({ videoId, caption }) => ({ widget: 'TikTokPlayer', videoId, caption }),
            }),
            show_medical_lead_form: tool({
                description: 'Display a medical lead form to capture patient information for clinic booking',
                inputSchema: z.object({
                    clinicId: z.string().describe('The clinic ID'),
                    defaultName: z.string().optional(),
                }),
                execute: async ({ clinicId, defaultName }) => ({ widget: 'MedicalLeadForm', clinicId, defaultName }),
            }),
            show_msi_dashboard: tool({
                description: 'Show the MSI/metabolic dashboard for a clinic',
                inputSchema: z.object({
                    clinicId: z.string(),
                    timeframe: z.enum(['day', 'week', 'month', 'quarter']).optional(),
                }),
                execute: async ({ clinicId, timeframe }) => ({ widget: 'MSIDashboard', clinicId, timeframe }),
            }),
        }

        // ── Stream response ───────────────────────────────────────────────────
        let result
        try {
            result = streamText({
                model: google('gemini-3-flash-preview'),
                system: systemPrompt,
                messages,
                tools,
                onFinish: async ({ text, usage }) => {
                    if (!clinicId) return
                    try {
                        const supabase = await createClient()

                        // 1. Atomic token deduction using RPC
                        const tokensUsed = usage?.totalTokens ?? 0
                        if (tokensUsed > 0) {
                            await supabase.rpc('decrement_clinic_tokens', {
                                clinic_id: clinicId,
                                amount: tokensUsed,
                            })
                        }

                        // 2. Save assistant message to messages table
                        if (text) {
                            await supabase.from('messages').insert({
                                clinic_id: clinicId,
                                role: 'assistant',
                                content: text,
                            })
                        }

                        // 3. Save last user message
                        const lastUser = uiMessages.at(-1)
                        if (lastUser?.role === 'user') {
                            const userText = Array.isArray(lastUser.content)
                                ? lastUser.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n')
                                : lastUser.content
                            if (userText) {
                                await supabase.from('messages').insert({
                                    clinic_id: clinicId,
                                    role: 'user',
                                    content: userText,
                                })
                            }
                        }
                    } catch (e) {
                        console.error('[chat] onFinish DB error:', e)
                    }
                },
            })
        } catch {
            // Fallback to stable model
            console.warn('[chat] Primary model failed, falling back to gemini-2.5-flash')
            result = streamText({
                model: google('gemini-2.5-flash'),
                system: systemPrompt,
                messages,
                tools,
            })
        }

        const crypto = await import('crypto')
        const response = result.toUIMessageStreamResponse({
            generateMessageId: () => clinicId ?? crypto.randomUUID(),
        })
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    } catch (error: any) {
        console.error('[chat] Error:', error)
        return new Response(
            JSON.stringify({
                error: 'Chat request failed',
                message: error.message,
                hint: 'Check GOOGLE_GENERATIVE_AI_API_KEY and model availability.',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        )
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}