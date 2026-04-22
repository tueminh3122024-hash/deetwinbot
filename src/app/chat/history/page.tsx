'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { History, MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChatSession {
    id: string
    created_at: string
    message: string
    response: string
}

export default function ChatHistoryPage() {
    const router = useRouter()
    const [history, setHistory] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/chat')
                return
            }

            const { data, error } = await supabase
                .from('chat_history')
                .select('id, created_at, message, response')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (!error && data) {
                setHistory(data)
            }
            setLoading(false)
        }
        fetchHistory()
    }, [router])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-[#1DA1F2] border-t-transparent animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-black">
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#1f2937] flex items-center gap-2">
                <History size={18} className="text-[#1DA1F2]" />
                <h1 className="text-white text-sm font-bold tracking-tight">Lịch sử tư vấn</h1>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
                {history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-sm">
                        Chưa có lịch sử tư vấn nào.
                    </div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="bg-[#111] border border-[#1f2937] rounded-xl p-4 transition-all hover:bg-[#1a1a1a]">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                    <Clock size={12} />
                                    {new Date(item.created_at).toLocaleString('vi-VN', {
                                        hour: '2-digit', minute: '2-digit',
                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                    })}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {/* User Message */}
                                <div className="flex items-start gap-2.5">
                                    <div className="h-6 w-6 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <MessageSquare size={10} className="text-[#1DA1F2]" />
                                    </div>
                                    <p className="text-sm text-gray-200 leading-relaxed line-clamp-2">
                                        {item.message}
                                    </p>
                                </div>
                                
                                {/* Assistant Response Preview */}
                                <div className="flex items-start gap-2.5">
                                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#1DA1F2] to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-[10px]">🧬</span>
                                    </div>
                                    <p className="text-sm text-gray-400 font-light leading-relaxed line-clamp-2">
                                        {item.response || '...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
