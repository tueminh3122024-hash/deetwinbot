'use client'

import { motion } from 'framer-motion'

interface MSICircleProps {
    score: number // 0 to 100
    size?: number
}

export default function MSICircle({ score, size = 200 }: MSICircleProps) {
    // Determine color based on score
    // 0-40: Red (#FF4B2B), 40-70: Orange (#FF8C00), 70-100: Bio-Green (#39FF14)
    const getColor = (s: number) => {
        if (s < 40) return '#FF4B2B'
        if (s < 70) return '#FF8C00'
        return '#39FF14'
    }

    const color = getColor(score)
    const strokeDasharray = 2 * Math.PI * (size / 2 - 10)
    const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Glow */}
            <motion.div
                className="absolute inset-0 rounded-full blur-2xl opacity-20"
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{ backgroundColor: color }}
            />

            {/* SVG Circle */}
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={size / 2 - 10}
                    fill="transparent"
                    stroke="#1a1a1a"
                    strokeWidth="8"
                />
                {/* Progress Bar */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={size / 2 - 10}
                    fill="transparent"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: strokeDasharray }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]"
                    style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
                />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                    className="text-4xl font-bold text-white tracking-tighter"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    {score}
                </motion.span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">MSI Index</span>
            </div>

            {/* Animated Rotating Ring */}
            <motion.div
                className="absolute inset-0 border-2 border-dashed rounded-full opacity-30"
                style={{ borderColor: color, margin: '-4px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
        </div>
    )
}
