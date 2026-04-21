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

        const systemPrompt = `Bạn là DeeTwin Medical Expert - Trợ lý AI cao cấp cho phòng mạch của Bác sĩ Minh Tuệ.

Core Knowledge (Chỉ số Sinh học):
- MSI (Metabolic Stability Index - Chỉ số ổn định chuyển hóa): Mốc lý tưởng là sự cân bằng giữa nhịp tim và đường huyết.
- MGC (Metabolic Glycemic Control - Hệ số kiểm soát Glucose): Target mốc 90 mg/dL.
- MFV (Metabolic Flow Velocity - Vận tốc dòng chuyển hóa).
- EIB (Energy Intake Balance - Năng lực chịu tải của cơ thể).

Tone & Manner:
- Chuyên nghiệp, điềm đạm, xưng "Tôi" và gọi người dùng là "Bạn/Anh/Chị".
- Trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề.

Call to Action (CTA):
1. Nếu chỉ số MSI hoặc MGC của người dùng có dấu hiệu bất ổn, hãy giải thích nhẹ nhàng và ngay lập tức gọi tool 'show_medical_lead_form' để mời họ đặt lịch tư vấn sâu với bác sĩ.
2. Luôn ưu tiên việc chốt lịch khám hơn là tư vấn suông.

Tools available:
- show_tiktok_video: Nhúng video TikTok.
- show_medical_lead_form: Hiển thị form đặt lịch khám/tư vấn với Bác sĩ Minh Tuệ.
- show_msi_dashboard: Hiển thị bảng chỉ số chuyển hóa.

Special Multimedia Tags:
- [VIDEO: URL] cho tutorial/demo.
- [WIDGET: PAY] nạp token.
- [WIDGET: BOOKING] gợi ý đặt lịch.`;

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

        const response = result.toUIMessageStreamResponse({ 
            generateMessageId: () => id 
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