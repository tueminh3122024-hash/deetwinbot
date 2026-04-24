'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import ChatBox from '@/components/chat/ChatBox'
import BamaBookingModal from '@/components/chat/BamaBookingModal'
import { LogIn, Smartphone, CalendarCheck } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function UserChatPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showBama, setShowBama] = useState(false)

    useEffect(() => {
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)
        }
        initSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/chat` },
        })
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-[#1DA1F2] border-t-transparent animate-spin" />
            </div>
        )
    }

    // Not logged in — show minimal login prompt
    if (!user) {
        return (
            <div className="flex flex-col h-full items-center justify-center px-8 gap-6 text-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#1DA1F2] to-teal-500 flex items-center justify-center shadow-2xl shadow-sky-500/20">
                    <span className="text-3xl">🧬</span>
                </div>

                <div>
                    <h1 className="text-white text-xl font-bold tracking-tight">DeeTwin</h1>
                    <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                        Trợ lý sức khỏe kỹ thuật số của bạn.
                        Đăng nhập để bắt đầu theo dõi chỉ số MSI.
                    </p>
                </div>

                <div className="w-full space-y-3">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm rounded-2xl py-3.5 hover:bg-gray-100 transition-all active:scale-95 shadow-lg"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Đăng nhập với Google
                    </button>

                    <div className="flex items-center gap-3 text-gray-700">
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-xs">hoặc</span>
                        <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    <button
                        className="w-full flex items-center justify-center gap-3 bg-[#111] border border-[#1f2937] text-gray-300 font-medium text-sm rounded-2xl py-3.5 hover:border-gray-600 transition-all active:scale-95"
                    >
                        <Smartphone size={18} className="text-[#1DA1F2]" />
                        Kết nối DeeTwin App
                    </button>
                </div>

                <p className="text-[10px] text-gray-700 tracking-widest uppercase">
                    Bảo mật chuẩn HIPAA · DeeTwin mBOS
                </p>
            </div>
        )
    }

    // Logged in — show chat
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937]">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1DA1F2] to-teal-500" />
                    <div>
                        <p className="text-white text-sm font-bold leading-none">DeeTwin</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-gray-500">Trực tuyến</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bama button */}
                    <button
                        onClick={() => setShowBama(true)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-[#1DA1F2] to-teal-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
                    >
                        <CalendarCheck size={13} />
                        Bama
                    </button>

                    {/* User avatar */}
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="h-8 w-8 rounded-full overflow-hidden border border-[#1f2937]"
                        title="Đăng xuất"
                    >
                        {user.user_metadata?.avatar_url
                            ? <img src={user.user_metadata.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                            : <div className="h-full w-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                                {(user.email ?? 'U')[0].toUpperCase()}
                            </div>}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <ChatBox
                    clinicId={null}
                    userId={user.id}
                    placeholder="Hỏi về sức khỏe, chỉ số MSI, đặt lịch..."
                />
            </div>

            {/* Bama Booking Modal */}
            <BamaBookingModal
                open={showBama}
                onClose={() => setShowBama(false)}
                userId={user.id}
            />
        </div>
    )
}
