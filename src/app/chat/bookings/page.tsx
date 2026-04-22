'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CalendarDays, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface Booking {
    id: string
    full_name: string | null
    service: string | null
    preferred_dt: string | null
    status: 'pending' | 'confirmed' | 'cancelled'
    created_at: string
    note: string | null
}

const STATUS_CONFIG = {
    pending:   { label: 'Chờ xác nhận', icon: Clock,         color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
    confirmed: { label: 'Đã xác nhận',  icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
    cancelled: { label: 'Đã huỷ',       icon: XCircle,       color: 'text-red-400',  bg: 'bg-red-400/10 border-red-400/30' },
} as const

export default function UserBookingsPage() {
    const router = useRouter()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { router.push('/chat'); return }

            const userEmail = session.user.email
            setEmail(userEmail ?? null)

            // Fetch bookings matching the user's Google email
            const { data, error } = await supabase
                .from('bookings')
                .select('id, full_name, service, preferred_dt, status, note, created_at')
                .eq('email', userEmail)
                .order('created_at', { ascending: false })
                .limit(30)

            if (!error && data) setBookings(data as Booking[])
            setLoading(false)
        }
        load()
    }, [router])

    const formatDate = (str: string | null) => {
        if (!str) return '-'
        try { return new Date(str).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
        catch { return str }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center gap-2">
                <CalendarDays size={18} className="text-[#1DA1F2]" />
                <h1 className="text-white text-sm font-bold tracking-tight">Lịch đã đặt</h1>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading && (
                    <div className="flex justify-center pt-20">
                        <Loader2 size={24} className="text-[#1DA1F2] animate-spin" />
                    </div>
                )}

                {!loading && bookings.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-24 gap-4 text-center px-6">
                        <div className="h-16 w-16 rounded-full bg-gray-900 flex items-center justify-center">
                            <AlertCircle size={28} className="text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Bạn chưa có lịch hẹn nào</p>
                        <p className="text-gray-600 text-xs leading-relaxed">
                            Khi bạn đặt lịch qua form của phòng mạch,
                            lịch hẹn sẽ hiện ở đây theo email: {email}
                        </p>
                    </div>
                )}

                {!loading && bookings.length > 0 && (
                    <div className="space-y-3">
                        {bookings.map((b) => {
                            const cfg = STATUS_CONFIG[b.status]
                            const Icon = cfg.icon
                            return (
                                <div key={b.id} className="bg-[#111] border border-[#1f2937] rounded-2xl p-4">
                                    {/* Status badge */}
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mb-3 ${cfg.bg} ${cfg.color}`}>
                                        <Icon size={11} />
                                        {cfg.label}
                                    </div>

                                    <p className="text-white text-sm font-semibold leading-tight">
                                        {b.service || 'Tư vấn sức khỏe'}
                                    </p>
                                    {b.full_name && (
                                        <p className="text-gray-500 text-xs mt-0.5">{b.full_name}</p>
                                    )}

                                    {b.preferred_dt && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Clock size={12} className="text-gray-600" />
                                            <span className="text-gray-400 text-xs">{b.preferred_dt}</span>
                                        </div>
                                    )}

                                    {b.note && (
                                        <p className="text-gray-600 text-xs mt-2 leading-relaxed">{b.note}</p>
                                    )}

                                    <p className="text-gray-700 text-[10px] mt-3">
                                        Đặt lúc: {formatDate(b.created_at)}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
