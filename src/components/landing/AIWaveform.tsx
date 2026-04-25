'use client'

import { motion } from 'framer-motion'

interface AIWaveformProps {
    isLive?: boolean;
    volume?: number;
}

export default function AIWaveform({ isLive = false, volume = 0 }: AIWaveformProps) {
    const bars = 20
    
    return (
        <div className="flex items-center justify-center gap-1.5 h-16">
            {[...Array(bars)].map((_, i) => {
                // Calculate height based on volume and some random jitter
                const baseHeight = isLive ? 8 : 12
                const reactiveHeight = isLive ? (volume * 150 * (Math.random() * 0.5 + 0.5)) : 0
                const finalHeight = Math.max(baseHeight, Math.min(60, baseHeight + reactiveHeight))
                
                return (
                    <motion.div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-[#00D1FF] to-[#39FF14] rounded-full shadow-[0_0_10px_rgba(57,255,20,0.3)]"
                        animate={{
                            height: isLive ? finalHeight : [12, 32, 16, 24, 12],
                        }}
                        transition={{
                            duration: isLive ? 0.1 : 1.5,
                            repeat: isLive ? 0 : Infinity,
                            delay: isLive ? 0 : i * 0.08,
                            ease: "easeInOut"
                        }}
                    />
                )
            })}
        </div>
    )
}
