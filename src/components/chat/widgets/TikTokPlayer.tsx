import { Card, CardContent } from '@/components/ui/card'
import ReactPlayer from 'react-player'

export interface TikTokPlayerProps {
    videoId: string
    caption?: string
}

export default function TikTokPlayer({ videoId, caption }: TikTokPlayerProps) {
    // Construct TikTok embed URL
    const embedUrl = `https://www.tiktok.com/embed/${videoId}`
    const Player = ReactPlayer as any

    return (
        <Card className="border-gray-800 bg-black">
            <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                    <div>
                        <h3 className="font-semibold text-white">TikTok Video</h3>
                        <p className="text-sm text-gray-400">{caption || 'Embedded TikTok player'}</p>
                    </div>
                </div>
                <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-gray-900 to-gray-800">
                    <Player
                        url={embedUrl}
                        width="100%"
                        height="100%"
                        controls
                        playing={false}
                        light={false}
                        style={{ borderRadius: '0.5rem' }}
                    />
                </div>
                <div className="mt-3 text-xs text-gray-500">
                    Video ID: <code className="rounded bg-gray-900 px-1 py-0.5">{videoId}</code>
                </div>
            </CardContent>
        </Card>
    )
}