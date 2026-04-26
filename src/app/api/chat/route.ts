import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

// ── Google Gemini client ──
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

// ── Helper: extract text from a message (handles parts array or content string) ──
function getMessageText(msg: any): string {
    if (typeof msg.content === 'string' && msg.content) return msg.content
    if (msg.parts && Array.isArray(msg.parts)) {
        return msg.parts
            .map((p: any) => (p.type === 'text' ? p.text : ''))
            .filter(Boolean)
            .join(' ')
    }
    return ''
}

// ── Helper: convert UI message to model message ──
function toModelMessage(msg: any) {
    // If the message has a `content` string, use it directly
    if (msg.content && typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content }
    }

    // Otherwise, extract text from `parts` array
    if (msg.parts && Array.isArray(msg.parts)) {
        const text = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n')
        return { role: msg.role, content: text || '' }
    }

    // Fallback
    return { role: msg.role, content: '' }
}

import { searchKnowledge } from '@/lib/actions/rag'
import { MASTER_PROMPT_ASOP } from '@/lib/bot/prompts'

// ── POST /api/chat ──
export async function POST(request: NextRequest) {
    try {
        // Parse request body from useChat + DefaultChatTransport
        const body = await request.json()
        const { messages, clinicId, userId, bookingId } = body

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }
        console.log('[API Chat] Received payload:', { clinicId, userId, bookingId, msgCount: messages.length });

        // 1. Fetch System & Clinic Prompts
        const { data: masterSetting } = await adminClient
            .from('system_settings')
            .select('value')
            .eq('key', 'master_prompt')
            .maybeSingle()
        
        let clinicPrompt = ''
        let currentBalance = 0
        if (clinicId) {
            const { data: clinic } = await adminClient
                .from('clinics')
                .select('custom_system_prompt, token_balance')
                .eq('id', clinicId)
                .maybeSingle()
            clinicPrompt = clinic?.custom_system_prompt || ''
            currentBalance = clinic?.token_balance || 0
        }

        // 2. Token Check (Chốt chặn âm tiền)
        if (clinicId && currentBalance <= 0) {
            return new Response(
                JSON.stringify({ error: 'INSUFFICIENT_TOKENS', message: 'Tài khoản đã hết Token. Vui lòng nạp thêm.' }),
                { status: 402, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Convert UI messages → model messages FIRST so we can extract the true content string (SDK v6 uses parts array)
        const modelMessages = messages.map(toModelMessage)

        // 3. RAG: Search Knowledge Base
        const lastUserMessage = modelMessages[modelMessages.length - 1]?.content || ''
        const relevantContext = await searchKnowledge(lastUserMessage, clinicId)
        const contextText = relevantContext.length > 0 
            ? `\n\nKIẾN THỨC CHUYÊN MÔN TRA CỨU ĐƯỢC:\n${relevantContext.map(c => `[Từ ${c.source_name}]: ${c.content}`).join('\n')}`
            : ''

        const baseSystemPrompt = masterSetting?.value || MASTER_PROMPT_ASOP
        const fullSystemPrompt = `${baseSystemPrompt}\n\n${clinicPrompt}${contextText}\n\nTHÔNG TIN HỆ THỐNG (KHÔNG PHẢN HỒI TRỰC TIẾP): \n- Số dư Token hiện tại: ${Number(currentBalance).toLocaleString('vi-VN')} tokens.\n\nLưu ý: Luôn dùng [WIDGET:BOOKING] nếu khách có nhu cầu đặt lịch.`

        // Call Gemini via streamText (Use Gemini 3 Flash Preview as requested)
        const result = streamText({
            model: google('gemini-3-flash-preview'),
            system: fullSystemPrompt,
            messages: modelMessages,
            onFinish: async (event) => {
                const responseText = event.text
                const totalTokens = event.usage?.totalTokens ?? 0
                
                console.log(`[Chat] Stream finished. Tokens used: ${totalTokens}`)

                // IMPORTANT: We now rely on a DB Trigger on 'chat_history' 
                // to automatically handle 'token_balance' deduction.
                // We just need to ensure the record is saved.
                try {
                    const lastUserMessage = modelMessages[modelMessages.length - 1]?.content || ''
                    
                    const { error: histError } = await adminClient
                        .from('chat_history')
                        .insert({
                            user_id: userId || null,
                            clinic_id: clinicId || null,
                            message: lastUserMessage,
                            response: responseText,
                            tokens_used: totalTokens,
                            created_at: new Date().toISOString()
                        })

                    if (histError) console.error('[History] Save failed:', histError)
                    else console.log('[History] Saved successfully. Trigger should handle tokens.')

                } catch (err) {
                    console.error('[History] Critical save error:', err)
                }
            },
        })

        // Return UI message stream response (compatible with DefaultChatTransport)
        return result.toUIMessageStreamResponse({
            originalMessages: messages,
        })
    } catch (err: any) {
        console.error('[chat/route] Error:', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
