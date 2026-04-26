'use client'

import { useEffect, useState } from 'react'
import { useAI } from '@/components/providers/AIProvider'
import { supabase } from '@/lib/supabase/client'
import { Users, Search, Phone, Mail, Loader2, UserCircle, CalendarDays } from 'lucide-react'

import { getClinicPatients } from '@/lib/actions/patient'
import PatientProfile from '@/components/chat/PatientProfile'

interface Patient {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    created_at: string
    user_id: string
}

export default function ClinicPatientsPage() {
    const { currentClinicId } = useAI()
    const [patients, setPatients] = useState<Patient[]>([])
    const [filtered, setFiltered] = useState<Patient[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    useEffect(() => {
        if (!currentClinicId) return
        
        const fetchPatients = async () => {
            setLoading(true)
            const res = await getClinicPatients(currentClinicId)
            
            if (res.success && res.data) {
                setPatients(res.data as any)
                setFiltered(res.data as any)
            } else if (res.error) {
                console.error('[patients/page] Fetch error:', res.error)
            }
            
            setLoading(false)
        }

        fetchPatients()
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

    if (selectedPatient) {
        return (
            <div className="flex flex-col h-full bg-black">
                <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center gap-3">
                    <button 
                        onClick={() => setSelectedPatient(null)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <UserCircle size={20} />
                    </button>
                    <div>
                        <h1 className="text-white text-sm font-bold truncate">{selectedPatient.full_name}</h1>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">{selectedPatient.email || 'Hồ sơ bệnh nhân'}</p>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 pb-20">
                    <PatientProfile 
                        userId={selectedPatient.user_id} 
                        clinicId={currentClinicId!} 
                        role="clinic" 
                    />
                </div>
            </div>
        )
    }

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
                        <p className="text-gray-700 text-xs">Bệnh nhân sẽ hiển thị sau khi bác sĩ hoàn tất quy trình khám</p>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="space-y-2.5">
                        {filtered.map((p) => (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedPatient(p)}
                                className="flex items-start gap-3 bg-[#111] border border-[#1f2937] rounded-2xl p-3.5 hover:bg-[#1a1a1a] transition-all cursor-pointer group"
                            >
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1DA1F2]/20 to-teal-500/20 border border-[#1DA1F2]/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[#1DA1F2] text-xs font-bold">
                                        {p.full_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold truncate group-hover:text-[#1DA1F2] transition-colors">{p.full_name || 'Không rõ tên'}</p>
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
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <div className="flex items-center gap-1 text-gray-700 text-[10px]">
                                        <CalendarDays size={10} />
                                        {new Date(p.created_at).toLocaleDateString('vi-VN')}
                                    </div>
                                    <span className="text-[9px] bg-[#1DA1F2]/10 text-[#1DA1F2] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                        Hồ sơ
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
