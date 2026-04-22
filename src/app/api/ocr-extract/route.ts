import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest } from 'next/server'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export async function POST(request: NextRequest) {
    try {
        const { imageUrl, mimeType } = await request.json()
        if (!imageUrl) return new Response(JSON.stringify({ error: 'imageUrl required' }), { status: 400 })

        const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'file',
                            data: new URL(imageUrl),
                            mediaType: (mimeType || 'image/jpeg') as any,
                        },
                        {
                            type: 'text',
                            text: `Bạn là AI phân tích kết quả xét nghiệm y tế.
Hãy đọc ảnh này và trích xuất các chỉ số sau nếu có.
Trả về JSON thuần (không có markdown, không có backtick):
{
  "MSI": <số hoặc null>,
  "EIB": <số hoặc null>,
  "MFV": <số hoặc null>,
  "MGC": <số hoặc null>,
  "notes": "<ghi chú ngắn về kết quả nếu có>"
}
Nếu không tìm thấy chỉ số nào, trả về null cho trường đó.`,
                        },
                    ],
                },
            ],
        })

        // Parse JSON from Gemini response
        const cleaned = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return new Response(JSON.stringify({ success: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        console.error('[ocr-extract]', err)
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}
