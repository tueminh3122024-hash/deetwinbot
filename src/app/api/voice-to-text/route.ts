import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest } from 'next/server'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export const maxDuration = 30

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const audioFile = formData.get('audio') as File | null

        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Convert audio blob to base64
        const arrayBuffer = await audioFile.arrayBuffer()
        const base64Audio = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = audioFile.type || 'audio/webm'

        const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'file',
                            data: Buffer.from(arrayBuffer),
                            mediaType: mimeType as any,
                        },
                        {
                            type: 'text',
                            text: `Bạn là AI chuyển file ghi âm thành văn bản tiếng Việt.
HÃY CHÚ Ý: Nếu file âm thanh là tiếng ồn, tĩnh, hoặc không có tiếng người nói RÕ RÀNG, bạn PHẢI trả về chuỗi rỗng "". 
TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT HOẶC ĐOÁN DỮ LIỆU.
Nếu có tiếng người, dịch chính xác những gì họ nói và trả ra văn bản. Bạn chỉ trả về nội dung người dùng nói, không kèm bất kỳ giải thích nào.`,
                        },

                    ],
                },
            ],
        })

        return new Response(JSON.stringify({ text: text.trim() }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        console.error('[voice-to-text]', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Transcription failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
