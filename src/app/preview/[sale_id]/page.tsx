'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAI } from '@/components/providers/AIProvider'
import SoundWave from '@/components/chat/SoundWave'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Zap, Shield, Sparkles, ArrowRight, Play } from 'lucide-react'

import { use } from 'react'

export default function PreviewPage({ params }: { params: Promise<{ sale_id: string }> }) {
    const { sale_id } = use(params)
    const { playVoice, isSpeaking } = useAI()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const handleDemoVoice = () => {
        playVoice("Hello! I am your DEETWIN Digital Assistant. I'm designed to help your clinic streamline patient interactions, capture leads, and provide 24/7 expert support. How can I transform your practice today?")
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <header className="flex justify-between items-center mb-20">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center font-bold text-xl">D</div>
                        <span className="text-2xl font-bold tracking-tight">DEETWIN</span>
                    </div>
                    <Badge variant="outline" className="border-gray-800 bg-gray-900/50 text-gray-400 px-4 py-1 rounded-full">
                        Sales Preview ID: {sale_id}
                    </Badge>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Hero Section */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight mb-6">
                                Your Clinic, <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400">
                                    Digitally Cloned.
                                </span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                                DEETWIN Bot is more than just a chatbot. It's a high-fidelity digital twin of your medical expertise, available 24/7.
                            </p>
                        </motion.div>

                        <div className="flex flex-wrap gap-4">
                            <Button size="lg" className="bg-white text-black hover:bg-gray-200 rounded-2xl px-8 h-14 font-bold text-lg group">
                                Get Started <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button size="lg" variant="outline" className="border-gray-800 bg-gray-900/40 hover:bg-gray-800 rounded-2xl px-8 h-14 font-bold text-lg" onClick={handleDemoVoice}>
                                {isSpeaking ? 'Assistant Speaking...' : 'Hear the Voice'}
                                {isSpeaking ? <SoundWave isSpeaking={true} /> : <Play className="ml-2 w-5 h-5 fill-current" />}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-8">
                            <div className="flex items-start space-x-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold">Instant Setup</h3>
                                    <p className="text-sm text-gray-500">Go live in under 5 minutes</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold">HIPAA Ready</h3>
                                    <p className="text-sm text-gray-500">Enterprise-grade security</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Preview Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <Card className="bg-black border-gray-800 rounded-[2.5rem] p-1 shadow-[0_0_80px_rgba(37,99,235,0.1)] overflow-hidden">
                            <div className="bg-gray-950/50 rounded-[2.4rem] p-8 border border-white/5 h-[600px] flex flex-col items-center justify-center relative">
                                {/* Sound Wave/Avatar Area */}
                                <div className="mb-12 relative">
                                    <div className={`w-48 h-48 rounded-full bg-gradient-to-br from-blue-600/20 to-emerald-500/20 flex items-center justify-center p-4 relative z-10 transition-all duration-500 ${isSpeaking ? 'scale-110 shadow-[0_0_40px_rgba(52,211,153,0.2)]' : ''}`}>
                                        <div className="w-full h-full rounded-full bg-black border border-gray-800 flex items-center justify-center overflow-hidden">
                                            <img
                                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=DEETWIN&backgroundColor=000000"
                                                alt="Avatar"
                                                className="w-32 h-32"
                                            />
                                        </div>
                                    </div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/5 blur-3xl rounded-full" />
                                    
                                    {/* Visualizer Positioned below avatar */}
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40">
                                        <SoundWave isSpeaking={isSpeaking} />
                                    </div>
                                </div>

                                <div className="text-center space-y-4 max-w-sm">
                                    <Badge className="bg-blue-500/10 text-blue-400 border-none px-4 py-1 uppercase tracking-widest text-[10px] font-black">
                                        Live Voice Demo
                                    </Badge>
                                    <h2 className="text-3xl font-bold">Experience the Digital Twin</h2>
                                    <p className="text-gray-500">
                                        Click the button below to hear our premium ElevenLabs integration. Our AI doesn't just chat; it communicates with empathy and professional authority.
                                    </p>
                                    <Button
                                        onClick={handleDemoVoice}
                                        className={`w-full h-14 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 hover:opacity-90 transition-all ${isSpeaking ? 'grayscale animate-pulse' : ''}`}
                                    >
                                        {isSpeaking ? 'Streaming Audio...' : 'Start Voice Presentation'}
                                    </Button>
                                </div>

                                {/* Floating UI Elements */}
                                <div className="absolute top-10 right-10 p-3 bg-gray-900/80 border border-gray-800 rounded-2xl backdrop-blur-md flex items-center space-x-2 animate-bounce-slow">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-medium text-emerald-400">99.9% Uptime</span>
                                </div>
                                <div className="absolute bottom-10 left-10 p-3 bg-gray-900/80 border border-gray-800 rounded-2xl backdrop-blur-md flex items-center space-x-2 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                                    <Sparkles className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-medium text-blue-300">Custom Scoping</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Social Proof */}
                <div className="mt-32 pt-20 border-t border-gray-900 text-center">
                    <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-bold mb-12">Trusted by Modern Health Creators</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale group hover:grayscale-0 transition-all duration-700">
                        <div className="text-2xl font-black">CLINIC+</div>
                        <div className="text-2xl font-black">MEDPRO</div>
                        <div className="text-2xl font-black">TWINBIO</div>
                        <div className="text-2xl font-black">DOCSYNC</div>
                    </div>
                </div>
            </main>

            <footer className="max-w-7xl mx-auto px-6 py-20 text-center text-gray-600 text-sm">
                &copy; 2026 DEETWIN AI. Redefining medical communication for the agentic age.
            </footer>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
