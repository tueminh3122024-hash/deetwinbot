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

        // 1. Fetch System & Clinic Prompts
        const { data: masterSetting } = await adminClient
            .from('system_settings')
            .select('value')
            .eq('key', 'master_prompt')
            .maybeSingle()
        
        let clinicPrompt = ''
        if (clinicId) {
            const { data: clinic } = await adminClient
                .from('clinics')
                .select('custom_system_prompt')
                .eq('id', clinicId)
                .maybeSingle()
            clinicPrompt = clinic?.custom_system_prompt || ''
        }

        const baseSystemPrompt = masterSetting?.value || 'Bạn là DeeTwin, trợ lý y tế kỹ thuật số chuyên nghiệp.'
        const fullSystemPrompt = `${baseSystemPrompt}\n\n${clinicPrompt}\n\nLưu ý: Nếu người dùng muốn đặt lịch khám, hãy sử dụng mã [WIDGET:BOOKING] để hiển thị form đặt lịch Tally. Nếu cần yêu cầu thanh toán, dùng [WIDGET:PAY].`

        // Convert UI messages → model messages
        const modelMessages = messages.map(toModelMessage)

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
                    const lastUserMessage = messages[messages.length - 1]?.content || ''
                    
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
