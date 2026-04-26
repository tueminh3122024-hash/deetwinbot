/**
 * DeeTwin Clinic - Consultation History Page
 */

'use client'

import { useAI } from '@/components/providers/AIProvider'
import ConsultationHistory from '@/components/clinic/ConsultationHistory'
import AppShell from '@/components/Navigation/AppShell'

export default function ClinicHistoryPage() {
    const { currentClinicId } = useAI()

    return (
        <AppShell role="clinic">
            <div className="flex-1 flex flex-col h-full bg-black">
                <header className="p-4 border-b border-[#1f2937] flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">Lịch sử Chat & Tư vấn</h1>
                    <div className="text-[10px] bg-[#1DA1F2]/20 text-[#1DA1F2] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                        Clinic View
                    </div>
                </header>
                
                <div className="flex-1 overflow-hidden">
                    {currentClinicId ? (
                        <ConsultationHistory clinicId={currentClinicId} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Vui lòng chọn một phòng mạch để xem lịch sử.
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    )
}
