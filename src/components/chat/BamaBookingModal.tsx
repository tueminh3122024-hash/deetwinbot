'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createBooking } from '@/lib/actions/booking'
import {
    X, Search, Building2, Stethoscope, MapPin, CheckCircle2,
    Loader2, ArrowLeft, ChevronRight, CalendarCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Types ─── */
interface ClinicItem {
    id: string
    name: string
    specialty: string | null
    address: string | null
}

interface ServiceItem {
    id: string
    clinic_id: string
    name: string
    description: string
}

type Step = 'select-clinic' | 'select-service' | 'confirm'

/* ─── Overlay animation variants ─── */
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
}

const panelVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 24 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring' as const, stiffness: 400, damping: 32 },
    },
    exit: { opacity: 0, scale: 0.92, y: 24, transition: { duration: 0.12 } },
}

/* ─── Props ─── */
interface BamaBookingModalProps {
    open: boolean
    onClose: () => void
    userId: string
    onSuccess?: () => void
}

export default function BamaBookingModal({ open, onClose, userId, onSuccess }: BamaBookingModalProps) {
    /* ── State ── */
    const [step, setStep] = useState<Step>('select-clinic')
    const [clinics, setClinics] = useState<ClinicItem[]>([])
    const [services, setServices] = useState<ServiceItem[]>([])
    const [search, setSearch] = useState('')
    const [selectedClinic, setSelectedClinic] = useState<ClinicItem | null>(null)
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
    const [loadingClinics, setLoadingClinics] = useState(true)
    const [loadingServices, setLoadingServices] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)

    /* ── Reset on open ── */
    useEffect(() => {
        if (open) {
            setStep('select-clinic')
            setSelectedClinic(null)
            setSelectedService(null)
            setSearch('')
            setDone(false)
            loadClinics()
        }
    }, [open])

    /* ── Load clinics ── */
    const loadClinics = async () => {
        setLoadingClinics(true)
        const { data } = await supabase
            .from('clinics')
            .select('id, name, specialty, address')
            .order('name')
        if (data) setClinics(data as ClinicItem[])
        setLoadingClinics(false)
    }

    /* ── Load services for a clinic ── */
    const loadServices = async (clinicId: string) => {
        setLoadingServices(true)
        const { data } = await supabase
            .from('clinic_services')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name')
        if (data) setServices(data as ServiceItem[])
        setLoadingServices(false)
    }

    /* ── Select clinic → go to service step ── */
    const handleSelectClinic = (clinic: ClinicItem) => {
        setSelectedClinic(clinic)
        setSelectedService(null)
        setServices([])
        setStep('select-service')
        loadServices(clinic.id)
    }

    /* ── Submit booking + create chat_session via Server Action ── */
    const handleSubmit = useCallback(async () => {
        if (!selectedClinic || !selectedService) return

        if (!userId) {
            console.error('[BamaModal] Cannot submit: userId is missing')
            alert('❌ Bạn cần đăng nhập để đặt lịch.')
            return
        }

        setSubmitting(true)

        console.log('[BamaModal] Initiating booking flow:', {
            userId,
            clinicId: selectedClinic.id,
            serviceName: selectedService.name,
        })

        try {
            const result = await createBooking(
                userId,
                selectedClinic.id,
                selectedService.name
            )

            if (!result.success) {
                console.error('[BamaModal] Booking failed:', result.error)
                setSubmitting(false)
                alert('❌ ' + (result.error || 'Lỗi không xác định khi đặt lịch.'))
                return
            }

            console.log('[BamaModal] Booking & Chat Session created successfully:', result.bookingId)
            setSubmitting(false)
            setDone(true)
            onSuccess?.()
        } catch (err: any) {
            console.error('[BamaModal] Unexpected error in handleSubmit:', err)
            setSubmitting(false)
            alert('❌ Có lỗi xảy ra. Vui lòng thử lại sau.')
        }
    }, [selectedClinic, selectedService, userId, onSuccess])

    /* ── Filtered clinics ── */
    const filteredClinics = clinics.filter((c) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            c.name.toLowerCase().includes(q) ||
            (c.specialty ?? '').toLowerCase().includes(q) ||
            (c.address ?? '').toLowerCase().includes(q)
        )
    })

    /* ── Render ── */
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full sm:max-w-md max-h-[85dvh] sm:rounded-2xl rounded-t-2xl bg-[#0d0d0d] border border-[#1f2937] shadow-2xl flex flex-col overflow-hidden"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937] flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {step !== 'select-clinic' && !done && (
                                    <button
                                        onClick={() => { setStep('select-clinic'); setSelectedService(null) }}
                                        className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                )}
                                <CalendarCheck size={18} className="text-[#1DA1F2]" />
                                <span className="text-white text-sm font-bold tracking-tight">
                                    {done
                                        ? 'Đặt lịch thành công'
                                        : step === 'select-clinic'
                                            ? 'Chọn phòng mạch'
                                            : 'Chọn dịch vụ'}
                                </span>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#1f2937] transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                            {done ? (
                                /* ─── SUCCESS ─── */
                                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                                    <div className="h-16 w-16 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                                        <CheckCircle2 size={28} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-base font-bold">Đã gửi yêu cầu!</p>
                                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                                            Phòng mạch sẽ xác nhận lịch hẹn sớm nhất.
                                            Bạn có thể kiểm tra ở mục Lịch hẹn.
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="mt-2 bg-[#1DA1F2] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-sky-400 transition-all active:scale-95"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            ) : step === 'select-clinic' ? (
                                /* ─── STEP 1: SELECT CLINIC ─── */
                                <>
                                    {/* Search */}
                                    <div className="flex items-center gap-2 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-2.5 mb-4">
                                        <Search size={15} className="text-gray-600 flex-shrink-0" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Tìm phòng mạch..."
                                            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
                                            autoFocus
                                        />
                                    </div>

                                    {loadingClinics ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 size={20} className="text-[#1DA1F2] animate-spin" />
                                        </div>
                                    ) : filteredClinics.length === 0 ? (
                                        <p className="text-gray-600 text-sm text-center py-12">Không tìm thấy phòng mạch nào.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredClinics.map((clinic) => (
                                                <button
                                                    key={clinic.id}
                                                    onClick={() => handleSelectClinic(clinic)}
                                                    className="w-full text-left flex items-start gap-3 bg-[#111] border border-[#1f2937] rounded-xl px-3.5 py-3 hover:border-[#1DA1F2]/40 transition-all active:scale-[0.98]"
                                                >
                                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1DA1F2]/20 to-teal-500/20 border border-[#1f2937] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <Building2 size={15} className="text-[#1DA1F2]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-semibold truncate">{clinic.name}</p>
                                                        {clinic.specialty && (
                                                            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                                                                <Stethoscope size={11} />
                                                                {clinic.specialty}
                                                            </p>
                                                        )}
                                                        {clinic.address && (
                                                            <p className="text-gray-600 text-[11px] mt-0.5 flex items-center gap-1">
                                                                <MapPin size={10} />
                                                                {clinic.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={15} className="text-gray-700 mt-1.5 flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* ─── STEP 2: SELECT SERVICE ─── */
                                <>
                                    {/* Selected clinic info */}
                                    {selectedClinic && (
                                        <div className="bg-[#111] border border-[#1f2937] rounded-xl px-3.5 py-2.5 mb-4">
                                            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Phòng mạch</p>
                                            <p className="text-white text-sm font-semibold mt-0.5">{selectedClinic.name}</p>
                                        </div>
                                    )}

                                    {loadingServices ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 size={20} className="text-[#1DA1F2] animate-spin" />
                                        </div>
                                    ) : services.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-600 text-sm">Phòng mạch chưa có dịch vụ nào.</p>
                                            <button
                                                onClick={() => setStep('select-clinic')}
                                                className="text-[#1DA1F2] text-xs font-semibold mt-2 hover:underline"
                                            >
                                                Quay lại chọn phòng mạch khác
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {services.map((svc) => {
                                                const isSelected = selectedService?.id === svc.id
                                                return (
                                                    <button
                                                        key={svc.id}
                                                        onClick={() => setSelectedService(svc)}
                                                        className={`w-full text-left flex items-start gap-3 border rounded-xl px-3.5 py-3 transition-all active:scale-[0.98]
                                                            ${isSelected
                                                                ? 'border-[#1DA1F2] bg-[#1DA1F2]/10'
                                                                : 'border-[#1f2937] bg-[#111] hover:border-gray-600'}`}
                                                    >
                                                        <div className={`h-8 w-8 rounded-lg border flex items-center justify-center flex-shrink-0
                                                            ${isSelected ? 'border-[#1DA1F2] bg-[#1DA1F2]/20' : 'border-[#1f2937] bg-black'}`}>
                                                            <Stethoscope size={14} className={isSelected ? 'text-[#1DA1F2]' : 'text-gray-600'} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                                {svc.name}
                                                            </p>
                                                            {svc.description && (
                                                                <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{svc.description}</p>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <CheckCircle2 size={16} className="text-[#1DA1F2] mt-1 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Submit button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!selectedService || submitting}
                                        className={`mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-95
                                            ${selectedService && !submitting
                                                ? 'bg-[#1DA1F2] text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                                                : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
                                    >
                                        {submitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CalendarCheck size={16} />
                                        )}
                                        {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
