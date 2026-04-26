/**
 * DeeTwin Clinic - Consultation History View
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MessageSquare, Clock, User, ArrowRight, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ConsultationHistoryProps {
    clinicId: string
}

export default function ConsultationHistory({ clinicId }: ConsultationHistoryProps) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedChat, setSelectedChat] = useState<any | null>(null)

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true)
            const { data } = await supabase
                .from('chat_history')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('created_at', { ascending: false })
            
            if (data) setHistory(data)
            setLoading(false)
        }
        fetchHistory()
    }, [clinicId])

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải lịch sử tư vấn...</div>

    return (
        <div className="flex h-full gap-4 p-4">
            {/* List */}
            <div className="w-1/3 overflow-y-auto space-y-3">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-[#1DA1F2]" /> Phiên tư vấn gần đây
                </h3>
                {history.map((chat) => (
                    <div 
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedChat?.id === chat.id 
                            ? 'bg-[#1DA1F2]/10 border-[#1DA1F2]' 
                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-gray-500">{new Date(chat.created_at).toLocaleString('vi-VN')}</span>
                            <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{chat.tokens_used} tokens</span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{chat.message}</p>
                    </div>
                ))}
                {history.length === 0 && <p className="text-sm text-gray-500">Chưa có lịch sử tư vấn.</p>}
            </div>

            {/* Detail */}
            <div className="flex-1 bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-[#1DA1F2]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Chi tiết phiên tư vấn</p>
                                    <p className="text-[10px] text-gray-500">ID: {selectedChat.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Xóa vĩnh viễn đoạn hội thoại này?')) {
                                        const { deleteChatHistory } = await import('@/lib/actions/admin');
                                        const res = await deleteChatHistory(selectedChat.id);
                                        if (res.success) {
                                            setHistory(prev => prev.filter(h => h.id !== selectedChat.id));
                                            setSelectedChat(null);
                                        } else {
                                            alert('Lỗi: ' + res.error);
                                        }
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors"
                            >
                                <Trash2 size={14} /> Xóa hội thoại
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-sky-400 tracking-widest">Người bệnh hỏi:</p>
                                <div className="bg-[#1DA1F2] text-white p-4 rounded-2xl rounded-tr-sm text-sm">
                                    {selectedChat.message}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest">DeeTwin trả lời:</p>
                                <div className="bg-gray-900 text-gray-200 p-4 rounded-2xl rounded-tl-sm border border-gray-800 text-sm leading-relaxed">
                                    {selectedChat.response}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                        <MessageSquare size={48} className="opacity-20" />
                        <p>Chọn một phiên tư vấn bên trái để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    )
}
