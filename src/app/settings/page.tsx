'use client'

import { useState, useEffect } from 'react'
import { useAI } from '@/components/providers/AIProvider'
import { supabase } from '@/lib/supabase/client'
import { Save, Building2, Clock, MapPin, User, Hash, Stethoscope, Loader2, CheckCircle2 } from 'lucide-react'
import BotSettings from '@/components/admin/BotSettings'
import ClinicServices from '@/components/settings/ClinicServices'

interface ClinicForm {
    name: string
    specialty: string
    description: string
    working_hours: string
    doctor_name: string
    tax_id: string
    address: string
    map_url: string
}

const EMPTY: ClinicForm = {
    name: '', specialty: '', description: '', working_hours: '',
    doctor_name: '', tax_id: '', address: '', map_url: '',
}

const LabeledInput = ({
    icon, label, value, onChange, placeholder, textarea = false
}: {
    icon: React.ReactNode
    label: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    placeholder?: string
    textarea?: boolean
}) => (
    <div>
        <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
        <div className={`flex items-start gap-3 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-3 ${textarea ? 'items-start' : 'items-center'}`}>
            <span className="text-gray-600 mt-0.5">{icon}</span>
            {textarea
                ? <textarea
                    value={value}
                    onChange={onChange}
                    rows={3}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm text-white outline-none resize-none placeholder-gray-700 leading-relaxed"
                />
                : <input
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-700"
                />}
        </div>
    </div>
)

export default function ClinicSettingsPage() {
    const { currentClinicId } = useAI()
    const [form, setForm] = useState<ClinicForm>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!currentClinicId) return
        supabase
            .from('clinics')
            .select('name,specialty,description,working_hours,doctor_name,tax_id,address,map_url')
            .eq('id', currentClinicId)
            .single()
            .then(({ data }) => {
                if (data) {
                    // Strip null values — React controlled inputs require strings, not null
                    const sanitized = Object.fromEntries(
                        Object.entries(data).map(([k, v]) => [k, v ?? ''])
                    )
                    setForm({ ...EMPTY, ...sanitized })
                }
                setLoading(false)
            })
    }, [currentClinicId])

    const set = (key: keyof ClinicForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }))

    const handleSave = async () => {
        if (!currentClinicId) return
        setSaving(true)
        await supabase.from('clinics').update({
            name: form.name,
            specialty: form.specialty,
            description: form.description,
            working_hours: form.working_hours,
            doctor_name: form.doctor_name,
            tax_id: form.tax_id,
            address: form.address,
            map_url: form.map_url,
        }).eq('id', currentClinicId)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="text-[#1DA1F2] animate-spin" />
        </div>
    )

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center justify-between">
                <h1 className="text-white text-sm font-bold">Cài đặt Phòng mạch</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-[#1DA1F2] text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={13} className="animate-spin" />
                        : saved ? <CheckCircle2 size={13} />
                            : <Save size={13} />}
                    {saved ? 'Đã lưu' : 'Lưu'}
                </button>
            </header>

            <div className="px-4 py-5 space-y-5 pb-12">
                {/* Section: Thông tin phòng mạch */}
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Thông tin phòng mạch</p>
                <LabeledInput icon={<Building2 size={16} />} label="Tên phòng mạch" value={form.name} onChange={set('name')} placeholder="Phòng khám Minh Tuệ" />
                <LabeledInput icon={<Stethoscope size={16} />} label="Chuyên về" value={form.specialty} onChange={set('specialty')} placeholder="Nội tiết, Chuyển hóa, Dinh dưỡng" />
                <LabeledInput icon={<Hash size={14} />} label="Mô tả" value={form.description} onChange={set('description')} placeholder="Phòng khám chuyên sâu về y học chuyển hóa..." textarea />
                <LabeledInput icon={<Clock size={16} />} label="Giờ hoạt động" value={form.working_hours} onChange={set('working_hours')} placeholder="Thứ 2 - Thứ 7: 8:00 - 17:30" />

                {/* Section: Kinh doanh */}
                <p className="text-[11px] text-gray-500 uppercase tracking-widest pt-2">Thông tin kinh doanh</p>
                <LabeledInput icon={<User size={16} />} label="Bác sĩ phụ trách" value={form.doctor_name} onChange={set('doctor_name')} placeholder="BS. Nguyễn Minh Tuệ" />
                <LabeledInput icon={<Hash size={14} />} label="Mã số thuế" value={form.tax_id} onChange={set('tax_id')} placeholder="0123456789" />

                {/* Section: Địa điểm */}
                <p className="text-[11px] text-gray-500 uppercase tracking-widest pt-2">Địa điểm</p>
                <LabeledInput icon={<MapPin size={16} />} label="Địa chỉ" value={form.address} onChange={set('address')} placeholder="123 Nguyễn Trãi, Quận 5, TP.HCM" />
                <LabeledInput icon={<MapPin size={16} />} label="Google Maps Embed URL" value={form.map_url} onChange={set('map_url')} placeholder="https://maps.google.com/maps?q=..." />

                {/* Google Maps preview */}
                {form.map_url && (
                    <div className="rounded-2xl overflow-hidden border border-[#1f2937] shadow-xl">
                        <iframe
                            src={form.map_url.includes('embed') ? form.map_url : `https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&output=embed`}
                            width="100%"
                            height="220"
                            style={{ border: 0 }}
                            allowFullScreen={false}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Vị trí phòng mạch"
                        />
                    </div>
                )}

                {!form.map_url && form.address && (
                    <div className="rounded-2xl overflow-hidden border border-[#1f2937] shadow-xl">
                        <iframe
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&output=embed`}
                            width="100%"
                            height="220"
                            style={{ border: 0 }}
                            allowFullScreen={false}
                            loading="lazy"
                            title="Vị trí phòng mạch"
                        />
                    </div>
                )}
                {/* Section: Dịch vụ */}
                <div className="pt-4 border-t border-[#1f2937]">
                    <ClinicServices clinicId={currentClinicId} />
                </div>

                {/* Section: Bot AI */}
                <div className="pt-4 border-t border-[#1f2937]">
                    <BotSettings />
                </div>
            </div>
        </div>
    )
}
