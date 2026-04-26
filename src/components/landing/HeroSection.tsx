'use client'

import { motion } from 'framer-motion'
import BamaButton from './BamaButton'

export default function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00D1FF]/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#39FF14]/10 rounded-full blur-[120px]" />

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                {/* Left Content */}
                <div className="flex-1 text-center md:text-left z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-[#00D1FF] font-bold tracking-[0.2em] uppercase text-sm mb-4">
                            Tương lai của Y tế số
                        </h2>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
                            DeeTwin: <br />
                            <span className="bg-gradient-to-r from-[#00D1FF] to-[#39FF14] bg-clip-text text-transparent">
                                Bản Sao Số
                            </span> <br />
                            Bảo Vệ Sức Khỏe
                        </h1>
                        <p className="text-gray-400 text-lg mb-10 max-w-xl">
                            Trải nghiệm công nghệ theo dõi sức khỏe thời gian thực, 
                            phân tích MSI Index và nhận tư vấn từ trợ lý AI Gemini 3 Flash.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => document.getElementById('live-mode')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#00D1FF] to-[#008fb3] text-black font-bold shadow-[0_0_20px_rgba(0,209,255,0.3)]"
                            >
                                Bắt đầu Chat Live
                            </motion.button>
                            <BamaButton />
                        </div>
                    </motion.div>
                </div>

                {/* Right 3D-ish Element */}
                <div className="flex-1 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2 }}
                        className="relative w-72 h-72 md:w-96 md:h-96 mx-auto"
                    >
                        {/* Bio-Guardian Sphere */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF] via-[#00D1FF]/20 to-transparent rounded-full animate-pulse blur-[2px] border border-white/10" />
                        
                        {/* Inner Glowing Core */}
                        <motion.div 
                            className="absolute inset-10 bg-gradient-to-tr from-[#39FF14] to-[#00D1FF] rounded-full blur-xl opacity-40"
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: 360
                            }}
                            transition={{
                                scale: { duration: 4, repeat: Infinity },
                                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                            }}
                        />

                        {/* Orbiting Rings */}
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute inset-0 border border-white/5 rounded-full"
                                style={{ rotateX: 60, rotateY: i * 30 }}
                                animate={{ rotateZ: 360 }}
                                transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "linear" }}
                            />
                        ))}

                        {/* Center Visual */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1/2 h-1/2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-4 h-4 bg-[#00D1FF] rounded-full shadow-[0_0_15px_#00D1FF]" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
