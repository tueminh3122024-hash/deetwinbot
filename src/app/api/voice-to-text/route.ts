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
                            text: 'Transcribe this audio to Vietnamese text. Return ONLY the transcribed text, nothing else. If the audio is unclear or empty, return an empty string.',
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
