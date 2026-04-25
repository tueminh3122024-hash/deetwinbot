'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import HeroSection from './HeroSection'
import ServiceCard from './ServiceCard'
import MSICircle from './MSICircle'
import AIWaveform from './AIWaveform'
import LiveVoiceManager from './LiveVoiceManager'
import BamaBookingModal from '@/components/chat/BamaBookingModal'
import { Activity, Shield, Zap, MessageSquare } from 'lucide-react'

interface LandingClientProps {
    clinic: any
    services: any[]
    userId?: string
}

export default function LandingClient({ clinic, services, userId }: LandingClientProps) {
    const [bookingOpen, setBookingOpen] = useState(false)
    const [liveState, setLiveState] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle')
    const [liveVolume, setLiveVolume] = useState(0)

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00D1FF]/30">
            {/* Header / Nav */}
            <nav className="fixed top-0 w-full z-[100] bg-black/50 backdrop-blur-md border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D1FF] to-[#39FF14] flex items-center justify-center">
                            <Shield size={18} className="text-black" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">{clinic?.name || 'DeeTwin Clinic'}</span>
                    </div>
                    <button 
                        onClick={() => setBookingOpen(true)}
                        className="text-sm font-semibold bg-white/5 hover:bg-white/10 px-5 py-2 rounded-full border border-white/10 transition-all"
                    >
                        Đặt lịch ngay
                    </button>
                </div>
            </nav>

            <HeroSection />

            {/* MSI Dashboard Preview */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-[#0a0a0a]">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                Chỉ số <span className="text-[#39FF14]">MSI Index</span> <br />
                                Trực quan & Chính xác
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                DeeTwin sử dụng thuật toán AI để tổng hợp hàng ngàn chỉ số sinh học, 
                                đưa ra con số MSI (Metabolic Stability Index) giúp bạn hiểu rõ 
                                trạng thái sức khỏe của mình chỉ trong 1 giây.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: Activity, label: 'Theo dõi nhịp tim 24/7', color: 'text-pink-500' },
                                    { icon: Zap, label: 'Phân tích mức độ căng thẳng', color: 'text-yellow-500' },
                                    { icon: Shield, label: 'Cảnh báo rủi ro sớm', color: 'text-[#00D1FF]' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                        <item.icon size={18} className={item.color} />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="flex justify-center"
                        >
                            <div className="relative p-8 rounded-3xl bg-[#111] border border-white/5 shadow-2xl overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/5 to-transparent" />
                                <MSICircle score={92} />
                                <div className="mt-8 text-center">
                                    <span className="inline-block px-3 py-1 rounded-full bg-[#39FF14]/10 text-[#39FF14] text-xs font-bold uppercase tracking-widest border border-[#39FF14]/20">
                                        Trạng thái: Ổn định
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Clinic Services Grid */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Dịch Vụ Tại Phòng Mạch</h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-[#00D1FF] to-[#39FF14] mx-auto" />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.length > 0 ? (
                            services.map((svc, i) => (
                                <ServiceCard key={svc.id} service={svc} index={i} />
                            ))
                        ) : (
                            <p className="col-span-full text-center text-gray-500">Đang cập nhật dịch vụ...</p>
                        )}
                    </div>
                </div>
            </section>

            {/* AI Live Mode Feature - Temporarily Hidden until API is stable */}
            {/* 
            <section className="py-20 px-6 bg-[#0a0a0a]">
                ... (code ẩn đi) ...
            </section>
            */}

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
                <p>&copy; 2026 DeeTwin Bio-Guardian. All rights reserved.</p>
                <div className="flex justify-center gap-6 mt-4">
                    <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
                    <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
                </div>
            </footer>

            {/* Booking Modal */}
            <BamaBookingModal 
                open={bookingOpen} 
                onClose={() => setBookingOpen(false)} 
                userId={userId || ''} 
            />
        </div>
    )
}
