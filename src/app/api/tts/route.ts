import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { text } = await req.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
        const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgmq9G978nPB' // Default voice if not set

        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5,
                    },
                }),
            }
        )

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json({ error: error.detail?.message || 'ElevenLabs API error' }, { status: response.status })
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        })
    } catch (error) {
        console.error('TTS error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
