'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Save, X, Loader2, Package } from 'lucide-react'

interface Service {
    id: string
    clinic_id: string
    name: string
    description: string
    created_at: string
}

export default function ClinicServices({ clinicId }: { clinicId: string | null }) {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<string | null>(null) // 'new' | service.id
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!clinicId) return
        supabase
            .from('clinic_services')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: true })
            .then(({ data }) => {
                if (data) setServices(data as Service[])
                setLoading(false)
            })
    }, [clinicId])

    const resetEdit = () => {
        setEditing(null)
        setEditName('')
        setEditDesc('')
    }

    const startNew = () => {
        setEditing('new')
        setEditName('')
        setEditDesc('')
    }

    const startEdit = (svc: Service) => {
        setEditing(svc.id)
        setEditName(svc.name)
        setEditDesc(svc.description)
    }

    const handleSave = async () => {
        if (!clinicId || !editName.trim()) return
        setSaving(true)

        if (editing === 'new') {
            const { data } = await supabase
                .from('clinic_services')
                .insert({ clinic_id: clinicId, name: editName.trim(), description: editDesc.trim() })
                .select()
                .single()
            if (data) setServices((prev) => [...prev, data as Service])
        } else if (editing) {
            const { data } = await supabase
                .from('clinic_services')
                .update({ name: editName.trim(), description: editDesc.trim(), updated_at: new Date().toISOString() })
                .eq('id', editing)
                .select()
                .single()
            if (data) {
                setServices((prev) => prev.map((s) => (s.id === editing ? (data as Service) : s)))
            }
        }

        setSaving(false)
        resetEdit()
    }

    const handleDelete = async (id: string) => {
        await supabase.from('clinic_services').delete().eq('id', id)
        setServices((prev) => prev.filter((s) => s.id !== id))
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-500 text-xs py-4">
                <Loader2 size={14} className="animate-spin" />
                Đang tải dịch vụ...
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#1DA1F2]" />
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest">Dịch vụ phòng mạch</span>
                </div>
                {editing !== 'new' && (
                    <button
                        onClick={startNew}
                        className="flex items-center gap-1 text-[11px] text-[#1DA1F2] font-semibold hover:text-sky-300 transition-colors"
                    >
                        <Plus size={13} />
                        Thêm dịch vụ
                    </button>
                )}
            </div>

            {/* New / Edit form */}
            {editing && (
                <div className="bg-[#0d1a2a] border border-[#1DA1F2]/30 rounded-xl p-3.5 space-y-2.5">
                    <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Tên dịch vụ (vd: Khám tổng quát)"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-600 border-b border-[#1f2937] pb-1.5"
                        autoFocus
                    />
                    <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Mô tả (không bắt buộc)"
                        rows={2}
                        className="w-full bg-transparent text-xs text-gray-400 outline-none placeholder-gray-600 resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={resetEdit}
                            className="flex items-center gap-1 text-xs text-gray-500 px-2.5 py-1.5 rounded-lg hover:text-gray-300 transition-colors"
                        >
                            <X size={13} />
                            Huỷ
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!editName.trim() || saving}
                            className="flex items-center gap-1 text-xs font-semibold text-white bg-[#1DA1F2] px-3 py-1.5 rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-40"
                        >
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Lưu
                        </button>
                    </div>
                </div>
            )}

            {/* Service list */}
            {services.length === 0 && !editing && (
                <p className="text-gray-600 text-xs italic">Chưa có dịch vụ nào. Nhấn "Thêm dịch vụ" để bắt đầu.</p>
            )}

            <div className="space-y-2">
                {services.map((svc) =>
                    editing === svc.id ? null : (
                        <div
                            key={svc.id}
                            className="flex items-start justify-between bg-[#111] border border-[#1f2937] rounded-xl px-3.5 py-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{svc.name}</p>
                                {svc.description && (
                                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{svc.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                                <button
                                    onClick={() => startEdit(svc)}
                                    className="p-1.5 rounded-lg text-gray-600 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-colors"
                                    title="Sửa"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    onClick={() => handleDelete(svc.id)}
                                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Xoá"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
