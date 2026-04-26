'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Save, User, Phone, Mail, Calendar, Smartphone, Loader2, CheckCircle2 } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

interface Profile {
    full_name: string
    age: string
    phone: string
    email: string
    avatar_url: string
}

import { updatePatientBasicInfo } from '@/lib/actions/patient'

export default function UserProfilePage() {
    const router = useRouter()
    const [supaUser, setSupaUser] = useState<SupaUser | null>(null)
    const [form, setForm] = useState<Profile>({ full_name: '', age: '', phone: '', email: '', avatar_url: '' })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { router.push('/chat'); return }

            const u = session.user
            setSupaUser(u)

            // Load existing profile
            const { data } = await supabase
                .from('profiles')
                .select('full_name, age, phone, avatar_url')
                .eq('id', u.id)
                .single()

            setForm({
                full_name: data?.full_name || u.user_metadata?.full_name || '',
                age: data?.age?.toString() || '',
                phone: data?.phone || '',
                email: u.email || '',
                avatar_url: data?.avatar_url || u.user_metadata?.avatar_url || '',
            })
            setLoading(false)
        }
        init()
    }, [router])

    const handleSave = async () => {
        if (!supaUser) return
        setSaving(true)

        const res = await updatePatientBasicInfo(supaUser.id, {
            fullName: form.full_name,
            phone: form.phone,
            age: form.age ? parseInt(form.age) : undefined
        })

        setSaving(false)
        if (res.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } else {
            alert('Lỗi khi lưu: ' + res.error)
        }
    }

    const field = (
        icon: React.ReactNode,
        label: string,
        key: keyof Profile,
        type = 'text',
        readOnly = false,
        hint?: string
    ) => (
        <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
            <div className="flex items-center gap-3 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-3">
                <span className="text-gray-600">{icon}</span>
                <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => !readOnly && setForm((p) => ({ ...p, [key]: e.target.value }))}
                    readOnly={readOnly}
                    className={`flex-1 bg-transparent text-sm outline-none ${readOnly ? 'text-gray-500 cursor-not-allowed' : 'text-white'}`}
                    placeholder={hint}
                />
            </div>
        </div>
    )

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-[#1DA1F2] border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center justify-between">
                <h1 className="text-white text-sm font-bold tracking-tight">Thông tin cá nhân</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-[#1DA1F2] text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving
                        ? <Loader2 size={13} className="animate-spin" />
                        : saved
                            ? <CheckCircle2 size={13} />
                            : <Save size={13} />}
                    {saved ? 'Đã lưu' : 'Lưu'}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#1DA1F2] shadow-xl shadow-sky-500/10">
                        {form.avatar_url
                            ? <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                            : <div className="h-full w-full bg-gradient-to-br from-[#1DA1F2] to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                                {form.full_name?.[0]?.toUpperCase() || 'U'}
                              </div>}
                    </div>
                    <p className="text-gray-500 text-xs">Ảnh đại diện từ Google</p>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                    {field(<User size={16} />, 'Họ tên', 'full_name', 'text', false, 'Nguyễn Văn A')}
                    {field(<Calendar size={16} />, 'Tuổi', 'age', 'number', false, '30')}
                    {field(<Phone size={16} />, 'Số điện thoại (Zalo/WhatsApp)', 'phone', 'tel', false, '0901 234 567')}
                    {field(<Mail size={16} />, 'Email (Google)', 'email', 'email', true)}
                </div>

                {/* Connect DeeTwin App */}
                <div className="mt-6 p-4 bg-gradient-to-br from-[#0d1a2a] to-[#0a1520] border border-[#1DA1F2]/30 rounded-2xl">
                    <p className="text-[#1DA1F2] text-sm font-semibold mb-1.5 flex items-center gap-2">
                        <Smartphone size={16} /> Kết nối DeeTwin App
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed mb-3">
                        Đồng bộ dữ liệu chỉ số MSI, MGC từ ứng dụng DeeTwin để nhận tư vấn chính xác hơn.
                    </p>
                    <button className="w-full bg-[#1DA1F2] hover:bg-sky-400 text-white font-bold text-sm rounded-xl py-3 transition-all active:scale-95">
                        Mở DeeTwin App
                    </button>
                </div>

                {/* Sign out */}
                <div className="pb-6">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full border border-red-900/50 text-red-500 text-sm font-medium rounded-xl py-3 hover:bg-red-900/10 transition-all active:scale-95"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    )
}
