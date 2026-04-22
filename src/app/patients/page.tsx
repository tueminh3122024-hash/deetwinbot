'use client'

import { useEffect, useState } from 'react'
import { useAI } from '@/components/providers/AIProvider'
import { supabase } from '@/lib/supabase/client'
import { Users, Search, Phone, Mail, Loader2, UserCircle, CalendarDays } from 'lucide-react'

interface Patient {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    created_at: string
    age: number | null
}

export default function ClinicPatientsPage() {
    const { currentClinicId } = useAI()
    const [patients, setPatients] = useState<Patient[]>([])
    const [filtered, setFiltered] = useState<Patient[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!currentClinicId) return
        // Load patients who have bookings with this clinic
        supabase
            .from('bookings')
            .select('email, full_name, phone, created_at')
            .eq('clinic_id', currentClinicId)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (!data) { setLoading(false); return }
                // Deduplicate by email
                const seen = new Set<string>()
                const unique = data.reduce<Patient[]>((acc, b) => {
                    const key = b.email || b.full_name || b.created_at
                    if (!seen.has(key)) {
                        seen.add(key)
                        acc.push({
                            id: key,
                            full_name: b.full_name,
                            email: b.email,
                            phone: b.phone,
                            created_at: b.created_at,
                            age: null,
                        })
                    }
                    return acc
                }, [])
                setPatients(unique)
                setFiltered(unique)
                setLoading(false)
            })
    }, [currentClinicId])

    useEffect(() => {
        if (!search) { setFiltered(patients); return }
        const q = search.toLowerCase()
        setFiltered(patients.filter((p) =>
            p.full_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.phone?.includes(q)
        ))
    }, [search, patients])

    return (
        <div className="flex flex-col h-full">
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937]">
                <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-[#1DA1F2]" />
                    <h1 className="text-white text-sm font-bold">Bệnh nhân</h1>
                    <span className="ml-auto text-[11px] text-gray-500">{patients.length} người</span>
                </div>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-2">
                    <Search size={15} className="text-gray-600" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo tên, email, SĐT..."
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-700"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
                {loading && (
                    <div className="flex justify-center pt-20">
                        <Loader2 size={24} className="text-[#1DA1F2] animate-spin" />
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
                        <UserCircle size={40} className="text-gray-700" />
                        <p className="text-gray-500 text-sm">Chưa có bệnh nhân nào</p>
                        <p className="text-gray-700 text-xs">Bệnh nhân sẽ hiển thị khi họ đặt lịch qua form</p>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="space-y-2.5">
                        {filtered.map((p) => (
                            <div key={p.id} className="flex items-start gap-3 bg-[#111] border border-[#1f2937] rounded-2xl p-3.5">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1DA1F2]/20 to-teal-500/20 border border-[#1DA1F2]/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[#1DA1F2] text-xs font-bold">
                                        {p.full_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold truncate">{p.full_name || 'Không rõ tên'}</p>
                                    {p.email && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Mail size={11} className="text-gray-600 flex-shrink-0" />
                                            <span className="text-gray-500 text-xs truncate">{p.email}</span>
                                        </div>
                                    )}
                                    {p.phone && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Phone size={11} className="text-gray-600 flex-shrink-0" />
                                            <span className="text-gray-500 text-xs">{p.phone}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-gray-700 text-[10px] flex-shrink-0">
                                    <CalendarDays size={10} />
                                    {new Date(p.created_at).toLocaleDateString('vi-VN')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
