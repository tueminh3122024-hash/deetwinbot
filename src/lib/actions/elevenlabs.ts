'use server'

export async function getElevenLabsSignedUrl() {
    try {
        // Check both prefixed and non-prefixed env vars
        const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!agentId || !apiKey) {
            console.error('[ElevenLabsAction] Missing configuration:', { 
                hasAgentId: !!agentId, 
                hasApiKey: !!apiKey 
            });
            return { 
                success: false, 
                error: 'Cấu hình ElevenLabs chưa đầy đủ. Vui lòng kiểm tra ELEVENLABS_AGENT_ID và ELEVENLABS_API_KEY trên Vercel.' 
            };
        }

        const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabsAction] ElevenLabs API error:', response.status, errorText);
            return { 
                success: false, 
                error: `ElevenLabs API (${response.status}): ${errorText}` 
            };
        }

        const data = await response.json();
        return { success: true, signedUrl: data.signed_url };
    } catch (error: any) {
        console.error('[ElevenLabsAction] Exception:', error);
        return { 
            success: false, 
            error: error.message || 'Lỗi hệ thống khi kết nối ElevenLabs' 
        };
    }
}
