'use client'

import React from 'react'

interface VideoWidgetProps {
    url: string
}

/**
 * VideoWidget component handles various video URLs, including YouTube Shorts.
 * It transforms Shorts URLs to embed format and applies the Grok-Black aesthetic.
 */
export const VideoWidget: React.FC<VideoWidgetProps> = ({ url }) => {
    // Transform YouTube Shorts URLs to Embed URLs
    // Example: https://www.youtube.com/shorts/VIDEO_ID -> https://www.youtube.com/embed/VIDEO_ID
    const getEmbedUrl = (originalUrl: string) => {
        const shortsRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
        const match = originalUrl.match(shortsRegex)
        
        if (match && match[1]) {
            return `https://www.youtube.com/embed/${match[1]}`
        }
        
        // Handle standard youtube links if needed for consistency
        const standardYoutubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
        const standardMatch = originalUrl.match(standardYoutubeRegex)
        if (standardMatch && standardMatch[1]) {
            return `https://www.youtube.com/embed/${standardMatch[1]}`
        }

        return originalUrl
    }

    const embedUrl = getEmbedUrl(url)
    const isEmbeddable = embedUrl.includes('youtube.com/embed/') || embedUrl.includes('player.vimeo.com')

    return (
        <div className="my-4 rounded-xl overflow-hidden border border-[#1f2937] bg-black aspect-video relative z-0 animate-in fade-in zoom-in duration-300">
            {isEmbeddable ? (
                <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video content"
                />
            ) : (
                <p className="flex items-center justify-center h-full text-gray-500 text-sm">
                    Đã xảy ra lỗi khi tải video. Thử mở trên trình duyệt.
                </p>
            )}
        </div>
    )
}

export default VideoWidget
