'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAI } from '@/components/providers/AIProvider'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PatientProfile from '@/components/chat/PatientProfile'
import {
    CalendarDays, Clock, CheckCircle2, Loader2, User, Stethoscope,
    XCircle, MessageSquare, ChevronDown, ChevronUp, FileText
} from 'lucide-react'
import CompleteExamModal from '@/components/chat/CompleteExamModal'

/* ─── Types ─── */
interface Booking {
    id: string
    user_id: string
    service_name: string
    status: 'pending' | 'accepted' | 'completed'
    created_at: string
    updated_at: string | null
    chat_summary: string | null
}

const STATUS_CONFIG = {
    pending: { label: 'Chờ xác nhận', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', icon: Clock },
    accepted: { label: 'Đã chấp nhận', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle2 },
    completed: { label: 'Đã khám xong', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30', icon: XCircle },
} as const

export default function ClinicAppointmentsPage() {
    const router = useRouter()
    const { currentClinicId } = useAI()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [expandedBooking, setExpandedBooking] = useState<string | null>(null)

    const load = useCallback(async () => {
        // Use currentClinicId from AIProvider, fallback to query param or first clinic
        let clinicId = currentClinicId

        if (!clinicId) {
            // Fallback: try to get first available clinic via RPC or direct fetch
            const { data: session } = await supabase.auth.getSession()
            if (session?.session?.user) {
                const { data: clinics } = await supabase
                    .from('clinics')
                    .select('id')
                    .limit(1)
                if (clinics && clinics.length > 0) {
                    clinicId = clinics[0].id
                }
            }
        }

        if (!clinicId) {
            setLoading(false)
            return
        }

        setLoading(true)
        const { data, error } = await supabase
            .from('bookings')
            .select('id, user_id, service_name, status, created_at, updated_at, chat_summary')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('[ClinicAppointments] Load error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
        }
        if (data) {
            console.log('[ClinicAppointments] Loaded', data.length, 'bookings for clinic:', clinicId)
            setBookings(data as Booking[])
        } else {
            console.log('[ClinicAppointments] No data returned for clinic:', clinicId)
        }
        setLoading(false)
    }, [currentClinicId])

    useEffect(() => {
        console.log('[ClinicAppointments] currentClinicId:', currentClinicId)
        load()
    }, [load])

    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

    const toggleExpand = (id: string) => {
        setExpandedBooking((prev) => (prev === id ? null : id))
    }

    /* ── Accept ── */
    const handleAccept = async (id: string) => {
        setUpdating(id)
        await supabase
            .from('bookings')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', id)
        setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: 'accepted', updated_at: new Date().toISOString() } : b))
        )
        setUpdating(null)
    }

    /* ── Trigger Complete Modal ── */
    const triggerComplete = (booking: Booking) => {
        setActiveBooking(booking)
        setShowCompleteModal(true)
    }

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
                <h1 className="text-white text-sm font-bold">Lịch hẹn</h1>
                <span className="ml-auto text-[11px] text-gray-500">{bookings.length} lịch</span>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading && (
                    <div className="flex justify-center pt-20">
                        <Loader2 size={24} className="text-[#1DA1F2] animate-spin" />
                    </div>
                )}

                {!loading && bookings.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
                        <div className="h-16 w-16 rounded-full bg-gray-900 flex items-center justify-center">
                            <CalendarDays size={28} className="text-gray-700" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Chưa có lịch hẹn nào</p>
                        <p className="text-gray-700 text-xs max-w-xs">
                            Lịch hẹn từ bệnh nhân sẽ hiển thị ở đây khi họ đăng ký qua nút Bama.
                        </p>
                    </div>
                )}

                {!loading && bookings.length > 0 && (
                    <div className="space-y-3">
                        {bookings.map((b) => {
                            const cfg = STATUS_CONFIG[b.status]
                            const Icon = cfg.icon
                            const isPending = b.status === 'pending'
                            const isAccepted = b.status === 'accepted'
                            const isExpanded = expandedBooking === b.id

                            return (
                                <div key={b.id} className="bg-[#111] border border-[#1f2937] rounded-2xl overflow-hidden">
                                    {/* Main card */}
                                    <div className="p-4">
                                        {/* Status badge */}
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mb-3 ${cfg.bg} ${cfg.color}`}>
                                            <Icon size={11} />
                                            {cfg.label}
                                        </div>

                                        {/* Service name */}
                                        <p className="text-white text-sm font-semibold leading-tight flex items-center gap-2">
                                            <Stethoscope size={13} className="text-gray-600" />
                                            {b.service_name}
                                        </p>

                                        {/* User info */}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <User size={11} className="text-gray-600" />
                                            <span className="text-gray-500 text-xs">ID: {b.user_id.slice(0, 8)}</span>
                                        </div>

                                        {/* Timestamp */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Clock size={11} className="text-gray-600" />
                                            <span className="text-gray-500 text-xs">
                                                Đặt lúc: {formatDateTime(b.created_at)}
                                            </span>
                                        </div>

                                        {/* Actions row */}
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1f2937]">
                                            {isPending && (
                                                <button
                                                    onClick={() => handleAccept(b.id)}
                                                    disabled={updating === b.id}
                                                    className="flex items-center gap-1.5 bg-emerald-500 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {updating === b.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                    Chấp nhận
                                                </button>
                                            )}
                                            {isAccepted && (
                                                <button
                                                    onClick={() => triggerComplete(b)}
                                                    className="flex items-center gap-1.5 bg-[#1DA1F2] text-white text-[11px] font-bold px-3.5 py-2 rounded-xl hover:bg-sky-400 transition-all active:scale-95 shadow-lg shadow-sky-500/10"
                                                >
                                                    <XCircle size={12} />
                                                    Khám xong
                                                </button>
                                            )}
                                            {/* Chat button — always visible */}
                                            <button
                                                onClick={() => router.push(`/?chat_user_id=${b.user_id}&booking_id=${b.id}`)}
                                                className="flex items-center gap-1.5 text-[#1DA1F2] text-[11px] font-semibold px-3 py-2 rounded-xl hover:bg-[#1DA1F2]/10 transition-all active:scale-95"
                                            >
                                                <MessageSquare size={12} />
                                                Chat
                                            </button>
                                            {/* Expand profile */}
                                            <button
                                                onClick={() => toggleExpand(b.id)}
                                                className="flex items-center gap-1.5 text-gray-500 text-[11px] font-medium px-3 py-2 rounded-xl hover:text-gray-300 hover:bg-[#1f2937] transition-all active:scale-95 ml-auto"
                                            >
                                                <FileText size={12} />
                                                Hồ sơ
                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded: PatientProfile */}
                                    {isExpanded && (
                                        <div className="border-t border-[#1f2937] px-4 py-4">
                                            <PatientProfile
                                                userId={b.user_id}
                                                clinicId={currentClinicId!}
                                                role="clinic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Complete Exam Modal */}
            {activeBooking && (
                <CompleteExamModal
                    open={showCompleteModal}
                    onClose={() => setShowCompleteModal(false)}
                    booking={{
                        id: activeBooking.id,
                        user_id: activeBooking.user_id,
                        clinic_id: currentClinicId!,
                        service_name: activeBooking.service_name
                    }}
                    onSuccess={() => {
                        load() // Refresh list
                        setExpandedBooking(activeBooking.id) // Auto-expand to show new card
                    }}
                />
            )}
        </div>
    )
}
