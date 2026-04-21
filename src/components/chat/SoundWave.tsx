'use client'

import React from 'react'

interface SoundWaveProps {
    isSpeaking: boolean
}

export default function SoundWave({ isSpeaking }: SoundWaveProps) {
    return (
        <div className="flex items-center justify-center space-x-1 h-8">
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className={`w-1 bg-gradient-to-t from-blue-600 to-emerald-400 rounded-full transition-all duration-300 ${
                        isSpeaking ? 'animate-sound-wave' : 'h-1'
                    }`}
                    style={{
                        animationDelay: `${i * 0.1}s`,
                        height: isSpeaking ? '100%' : '4px'
                    }}
                />
            ))}
            <style jsx>{`
                .animate-sound-wave {
                    animation: wave 1s ease-in-out infinite;
                }
                @keyframes wave {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
            `}</style>
        </div>
    )
}
