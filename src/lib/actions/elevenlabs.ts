'use server'

export async function getElevenLabsSignedUrl() {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
        throw new Error('Missing ElevenLabs configuration');
    }

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('ElevenLabs API error:', errorData);
            throw new Error(errorData.detail?.message || 'Failed to get signed URL');
        }

        const data = await response.json();
        return data.signed_url;
    } catch (error) {
        console.error('Error fetching signed URL:', error);
        throw error;
    }
}
