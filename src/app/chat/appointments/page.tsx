'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
    CalendarDays, Clock, CheckCircle2, Loader2, Building2,
    Stethoscope, AlertCircle, XCircle, MessageSquare, User
} from 'lucide-react'

/* ─── Types ─── */
interface ClinicBooking {
    id: string
    clinic_id: string
    service_name: string
    status: 'pending' | 'accepted' | 'completed'
    created_at: string
    chat_summary: string | null
    clinic_name?: string
}

const STATUS_CONFIG = {
    pending: { label: 'Chờ xác nhận', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
    accepted: { label: 'Đã chấp nhận', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
    completed: { label: 'Hoàn tất', icon: XCircle, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
} as const

export default function UserAppointmentsPage() {
    const router = useRouter()
    const [bookings, setBookings] = useState<ClinicBooking[]>([])
    const [loading, setLoading] = useState(true)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    const load = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/chat'); return }

        // Fetch bookings for this user, with clinic name
        const { data } = await supabase
            .from('bookings')
            .select('id, clinic_id, service_name, status, created_at, chat_summary')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(30)

        if (data) {
            // Enrich with clinic names
            const enriched = await Promise.all(
                (data as ClinicBooking[]).map(async (b) => {
                    const { data: clinic } = await supabase
                        .from('clinics')
                        .select('name')
                        .eq('id', b.clinic_id)
                        .single()
                    return { ...b, clinic_name: (clinic as any)?.name ?? 'Phòng mạch' }
                })
            )
            setBookings(enriched)
        }
        setLoading(false)
    }, [router])

    useEffect(() => {
        let isCancelled = false

        load()

        // ── Real-time subscription for status changes ──
        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session || isCancelled) return

            // Clean up any existing channels from previous mounts
            const existingChannels = supabase.getChannels()
                .filter(ch => ch.topic.startsWith('user-bookings-realtime-'))
            existingChannels.forEach(ch => supabase.removeChannel(ch))

            // Use a unique channel name per effect invocation to prevent
            // Strict Mode double-mount race conditions with Supabase Realtime
            const channelName = `user-bookings-realtime-${Date.now()}`
            const ch = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'bookings',
                        filter: `user_id=eq.${session.user.id}`,
                    },
                    () => { if (!isCancelled) load() }
                )
                .subscribe()

            // Track the channel for cleanup
            channelRef.current = ch
        }

        setupRealtime()

        // Cleanup: cancel any in-flight async setup and remove the channel
        return () => {
            isCancelled = true
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [load])

    const formatDateTime = (str: string) => {
        try {
            return new Date(str).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        } catch { return str }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center gap-2">
                <CalendarDays size={18} className="text-[#1DA1F2]" />
                <h1 className="text-white text-sm font-bold tracking-tight">Lịch hẹn</h1>
                <span className="ml-auto text-[11px] text-gray-500">{bookings.length} lịch</span>
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
                            Khi bạn đặt lịch qua DeeTwin, lịch hẹn sẽ hiển thị ở đây.
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

                                    {/* Clinic name */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#1DA1F2]/20 to-teal-500/20 border border-[#1f2937] flex items-center justify-center">
                                            <Building2 size={12} className="text-[#1DA1F2]" />
                                        </div>
                                        <p className="text-white text-sm font-semibold">{b.clinic_name}</p>
                                    </div>

                                    {/* Service */}
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <Stethoscope size={12} className="text-gray-600" />
                                        <span className="text-gray-300 text-sm">{b.service_name}</span>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-1.5 ml-1 mt-1">
                                        <Clock size={11} className="text-gray-600" />
                                        <span className="text-gray-500 text-xs">
                                            Đặt lúc: {formatDateTime(b.created_at)}
                                        </span>
                                    </div>

                                    {/* Chat summary (if completed) */}
                                    {b.chat_summary && (
                                        <div className="mt-3 pt-3 border-t border-[#1f2937]">
                                            <div className="flex items-start gap-1.5">
                                                <MessageSquare size={11} className="text-gray-600 mt-0.5" />
                                                <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2">
                                                    {b.chat_summary}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
