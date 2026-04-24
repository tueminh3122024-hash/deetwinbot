'use client'

import { motion } from 'framer-motion'

export default function AIWaveform() {
    return (
        <div className="flex items-center justify-center gap-1 h-12">
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-[#00D1FF] to-[#39FF14] rounded-full"
                    animate={{
                        height: [10, 40, 15, 30, 10],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    )
}
