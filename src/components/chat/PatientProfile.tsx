'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
    Plus, Pencil, Trash2, Save, X, Loader2, FileText, Image,
    Stethoscope, FlaskConical, Pill, MessageSquare, CalendarDays,
    ChevronDown, ChevronUp, Mail, Phone
} from 'lucide-react'

/* ─── Types ─── */
import { getPatientProfile, updatePatientBasicInfo, updatePatientProfileData } from '@/lib/actions/patient'

/* ─── Types ─── */
interface MediaItem {
    url: string
    type: 'image' | 'file'
    caption?: string
}

interface DataCard {
    id: string
    type: 'examination' | 'note' | 'lab_result' | 'image' | 'prescription'
    title: string
    content: string
    media: MediaItem[]
    created_at: string
    updated_at?: string
    author: 'user' | 'clinic'
}

interface PatientProfileData {
    id: string
    user_id: string
    clinic_id: string
    data_cards: DataCard[]
    created_at: string
    updated_at: string
}

/* ─── Props ─── */
interface PatientProfileProps {
    userId: string
    clinicId: string
    role: 'user' | 'clinic'
}

/* ─── Config ─── */
const CARD_ICONS: Record<DataCard['type'], React.ComponentType<{ size?: number; className?: string }>> = {
    examination: Stethoscope,
    note: MessageSquare,
    lab_result: FlaskConical,
    image: Image,
    prescription: Pill,
}

const CARD_LABELS: Record<DataCard['type'], string> = {
    examination: 'Khám bệnh',
    note: 'Ghi chú',
    lab_result: 'Kết quả xét nghiệm',
    image: 'Hình ảnh',
    prescription: 'Đơn thuốc',
}

const CARD_COLORS: Record<DataCard['type'], string> = {
    examination: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
    note: 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400',
    lab_result: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    image: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    prescription: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
}

/* ─── Component ─── */
export default function PatientProfile({ userId, clinicId, role }: PatientProfileProps) {
    const [profile, setProfile] = useState<PatientProfileData | null>(null)
    const [patientName, setPatientName] = useState('')
    const [patientEmail, setPatientEmail] = useState('')
    const [patientPhone, setPatientPhone] = useState('')
    const [isEditingInfo, setIsEditingInfo] = useState(false)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<string | null>(null) // card id | 'new'
    const [editType, setEditType] = useState<DataCard['type']>('note')
    const [editTitle, setEditTitle] = useState('')
    const [editContent, setEditContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

    /* ── Load / create profile ── */
    const loadProfile = useCallback(async () => {
        setLoading(true)
        const res = await getPatientProfile(userId, clinicId)

        if (res.success) {
            if (res.data) setProfile(res.data as PatientProfileData)
            setPatientName((res as any).fullName || '')
            setPatientEmail((res as any).patientEmail || '')
            setPatientPhone((res as any).patientPhone || '')
        }
        setLoading(false)
    }, [userId, clinicId])

    useEffect(() => {
        loadProfile()
    }, [loadProfile])

    /* ── Save patient info ── */
    const handleSaveInfo = async () => {
        const res = await updatePatientBasicInfo(userId, {
            fullName: patientName.trim(),
            email: patientEmail.trim(),
            phone: patientPhone.trim()
        })
        if (res.success) {
            setIsEditingInfo(false)
        } else {
            alert('Lỗi khi cập nhật thông tin: ' + res.error)
        }
    }

    /* ── Save profile (upsert) ── */
    const saveProfile = async (cards: DataCard[]) => {
        const res = await updatePatientProfileData(userId, clinicId, cards)
        if (res.success) {
            // Reload local state
            setProfile(prev => prev ? { ...prev, data_cards: cards } : null)
        } else {
            alert('Lỗi khi lưu hồ sơ: ' + res.error)
        }
    }

    /* ── Start new card ── */
    const startNew = () => {
        setEditing('new')
        setEditType('note')
        setEditTitle('')
        setEditContent('')
    }

    /* ── Start edit ── */
    const startEdit = (card: DataCard) => {
        setEditing(card.id)
        setEditType(card.type)
        setEditTitle(card.title)
        setEditContent(card.content)
    }

    /* ── Cancel edit ── */
    const cancelEdit = () => {
        setEditing(null)
        setEditTitle('')
        setEditContent('')
    }

    /* ── Save card ── */
    const handleSaveCard = async () => {
        if (!editTitle.trim()) return
        setSaving(true)

        const now = new Date().toISOString()
        const currentCards = profile?.data_cards ?? []

        if (editing === 'new') {
            const newCard: DataCard = {
                id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
                type: editType,
                title: editTitle.trim(),
                content: editContent.trim(),
                media: [],
                created_at: now,
                author: role === 'clinic' ? 'clinic' : 'user',
            }
            await saveProfile([...currentCards, newCard])
        } else if (editing) {
            const updated = currentCards.map((c) =>
                c.id === editing
                    ? { ...c, type: editType, title: editTitle.trim(), content: editContent.trim(), updated_at: now }
                    : c
            )
            await saveProfile(updated)
        }

        setSaving(false)
        cancelEdit()
    }

    /* ── Delete card ── */
    const handleDelete = async (cardId: string) => {
        const currentCards = profile?.data_cards ?? []
        await saveProfile(currentCards.filter((c) => c.id !== cardId))
    }

    /* ── Toggle expand ── */
    const toggleExpand = (id: string) => {
        setExpandedCards((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const formatDate = (str: string) => {
        try {
            return new Date(str).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        } catch { return str }
    }

    /* ── Render ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="text-[#1DA1F2] animate-spin" />
            </div>
        )
    }

    const cards = profile?.data_cards ?? []
    const canEdit = role === 'clinic' || role === 'user' // both can edit

    return (
        <div className="space-y-3">
            {/* Patient Info Header */}
            <div className="bg-[#111] border border-[#1f2937] rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1DA1F2]/20 to-teal-500/20 border border-[#1DA1F2]/20 flex items-center justify-center">
                            <span className="text-[#1DA1F2] text-sm font-bold">
                                {patientName?.[0]?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div>
                            {isEditingInfo ? (
                                <div className="space-y-2">
                                    {/* Name input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={patientName}
                                            onChange={(e) => setPatientName(e.target.value)}
                                            placeholder="Tên bệnh nhân"
                                            className="bg-[#0d0d0d] border border-[#1DA1F2]/30 rounded-lg px-2 py-1 text-sm text-white outline-none w-full"
                                            autoFocus
                                        />
                                        <button 
                                            onClick={handleSaveInfo}
                                            className="p-1.5 rounded-lg bg-[#1DA1F2] text-white hover:bg-sky-400 transition-colors"
                                        >
                                            <Save size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingInfo(false)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-white"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {/* Contact inputs */}
                                    <div className="grid grid-cols-1 gap-1.5">
                                        <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gray-800 rounded-lg px-2 py-1">
                                            <Mail size={10} className="text-gray-600" />
                                            <input
                                                value={patientEmail}
                                                onChange={(e) => setPatientEmail(e.target.value)}
                                                placeholder="Email"
                                                className="bg-transparent border-none text-[11px] text-gray-300 outline-none w-full"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gray-800 rounded-lg px-2 py-1">
                                            <Phone size={10} className="text-gray-600" />
                                            <input
                                                value={patientPhone}
                                                onChange={(e) => setPatientPhone(e.target.value)}
                                                placeholder="Số điện thoại"
                                                className="bg-transparent border-none text-[11px] text-gray-300 outline-none w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h3 className="text-white font-bold">{patientName || 'Không rõ tên'}</h3>
                                    <button 
                                        onClick={() => setIsEditingInfo(true)}
                                        className="p-1 rounded-lg text-gray-600 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </div>
                            )}
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Mã: {userId.slice(0, 8)}</p>
                            {!isEditingInfo && (
                                <div className="flex flex-col gap-1 mt-2">
                                    {patientEmail && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail size={10} className="text-[#1DA1F2]/60" />
                                            <span className="text-gray-400 text-[11px]">{patientEmail}</span>
                                        </div>
                                    )}
                                    {patientPhone && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone size={10} className="text-[#1DA1F2]/60" />
                                            <span className="text-gray-400 text-[11px]">{patientPhone}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#1DA1F2]" />
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest">Hồ sơ bệnh án</span>
                </div>
                {canEdit && editing !== 'new' && (
                    <button
                        onClick={startNew}
                        className="flex items-center gap-1 text-[11px] text-[#1DA1F2] font-semibold hover:text-sky-300 transition-colors"
                    >
                        <Plus size={13} />
                        Thêm thẻ
                    </button>
                )}
            </div>

            {/* No cards */}
            {cards.length === 0 && editing !== 'new' && (
                <p className="text-gray-600 text-xs italic py-4 text-center">
                    Chưa có dữ liệu hồ sơ. {canEdit ? 'Nhấn "Thêm thẻ" để bắt đầu.' : ''}
                </p>
            )}

            {/* New / Edit form */}
            {editing && (
                <div className="bg-[#0d1a2a] border border-[#1DA1F2]/30 rounded-xl p-3.5 space-y-2.5">
                    {/* Card type selector */}
                    <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(CARD_LABELS) as DataCard['type'][]).map((t) => {
                            const isActive = editType === t
                            const Icon = CARD_ICONS[t]
                            return (
                                <button
                                    key={t}
                                    onClick={() => setEditType(t)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all
                                        ${isActive
                                            ? 'bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/30'
                                            : 'bg-[#111] text-gray-500 border border-[#1f2937] hover:text-gray-300'}`}
                                >
                                    <Icon size={10} />
                                    {CARD_LABELS[t]}
                                </button>
                            )
                        })}
                    </div>

                    <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Tiêu đề thẻ"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-600 border-b border-[#1f2937] pb-1.5"
                        autoFocus
                    />
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Nội dung (hỗ trợ Markdown)"
                        rows={4}
                        className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder-gray-600 resize-none leading-relaxed"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs text-gray-500 px-2.5 py-1.5 rounded-lg hover:text-gray-300 transition-colors"
                        >
                            <X size={13} />
                            Huỷ
                        </button>
                        <button
                            onClick={handleSaveCard}
                            disabled={!editTitle.trim() || saving}
                            className="flex items-center gap-1 text-xs font-semibold text-white bg-[#1DA1F2] px-3 py-1.5 rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-40"
                        >
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Lưu
                        </button>
                    </div>
                </div>
            )}

            {/* Card list - Timeline View */}
            <div className="relative space-y-6 pl-6 mt-4">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[#1DA1F2]/50 via-[#1f2937] to-transparent" />

                {cards
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((card) => {
                        const Icon = CARD_ICONS[card.type]
                        const isExpanded = expandedCards.has(card.id)
                        const isEditing = editing === card.id
                        const isLong = card.content.length > 120
                        const hasMSIWarning = card.content.includes('MSI') || card.content.includes('⚠️')

                        if (isEditing) return null

                        return (
                            <div
                                key={card.id}
                                className="relative"
                            >
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-[#111] z-10 
                                    ${card.author === 'clinic' ? 'bg-[#1DA1F2]' : 'bg-teal-400'}`} 
                                />

                                <div className={`bg-[#111] border rounded-xl overflow-hidden transition-all duration-300
                                    ${hasMSIWarning ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-[#1f2937]'}`}
                                >
                                    {/* Card header */}
                                    <div className="flex items-start gap-3 px-3.5 py-3">
                                        {/* Type icon */}
                                        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${CARD_COLORS[card.type]} border flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={14} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Title row */}
                                            <div className="flex items-center gap-2">
                                                <p className="text-white text-sm font-semibold truncate">{card.title}</p>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${CARD_COLORS[card.type]}`}>
                                                    {CARD_LABELS[card.type]}
                                                </span>
                                                {hasMSIWarning && (
                                                    <span className="animate-pulse bg-amber-500/20 text-amber-500 text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30 font-bold uppercase tracking-tighter">
                                                        Cảnh báo MSI
                                                    </span>
                                                )}
                                            </div>

                                            {/* Author + timestamp */}
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-[10px] font-medium ${card.author === 'clinic' ? 'text-[#1DA1F2]' : 'text-teal-400'}`}>
                                                    {card.author === 'clinic' ? 'Bác sĩ' : 'Bệnh nhân'}
                                                </span>
                                                <span className="text-gray-600 text-[10px] flex items-center gap-1">
                                                    <CalendarDays size={9} />
                                                    {formatDate(card.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {canEdit && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => startEdit(card)}
                                                    className="p-1.5 rounded-lg text-gray-600 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(card.id)}
                                                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                    title="Xoá"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card content */}
                                    {card.content && (
                                        <div className={`px-3.5 pb-3 ${hasMSIWarning ? 'bg-amber-500/[0.03]' : ''}`}>
                                            <div className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">
                                                {isLong && !isExpanded
                                                    ? card.content.slice(0, 120) + '...'
                                                    : card.content}
                                            </div>
                                            {isLong && (
                                                <button
                                                    onClick={() => toggleExpand(card.id)}
                                                    className="flex items-center gap-1 text-[10px] text-[#1DA1F2] mt-1 hover:underline"
                                                >
                                                    {isExpanded ? (
                                                        <>Thu gọn <ChevronUp size={10} /></>
                                                    ) : (
                                                        <>Xem thêm <ChevronDown size={10} /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Media */}
                                    {card.media.length > 0 && (
                                        <div className="px-3.5 pb-3 flex flex-wrap gap-2">
                                            {card.media.map((m, i) => (
                                                <a
                                                    key={i}
                                                    href={m.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#1f2937] rounded-lg px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                                                >
                                                    {m.type === 'image' ? <Image size={10} /> : <FileText size={10} />}
                                                    {m.caption || `Tệp ${i + 1}`}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
