'use client'

import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface BamaButtonProps {
    onClick?: () => void
    className?: string
    text?: string
}

export default function BamaButton({ onClick, className = '', text = 'Bama - Đặt lịch khám' }: BamaButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ 
                scale: 0.95,
                x: [0, -2, 2, -2, 2, 0], // Simulated haptic shake
                transition: { duration: 0.2 }
            }}
            onClick={onClick}
            className={`relative group px-8 py-3 rounded-full font-bold text-white overflow-hidden transition-all duration-300 ${className}`}
        >
            {/* Gradient Border Glow */}
            <div className="absolute inset-0 p-[2px] rounded-full bg-gradient-to-r from-[#00D1FF] to-[#39FF14] opacity-70 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-[#0d0d0d] rounded-full" />
            </div>

            {/* Breathing Background Glow */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#00D1FF]/20 to-[#39FF14]/20 blur-xl"
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center gap-2">
                <Calendar size={18} className="text-[#00D1FF]" />
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {text}
                </span>
            </span>

            {/* Particle Glow Effect on Hover */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </motion.button>
    )
}
