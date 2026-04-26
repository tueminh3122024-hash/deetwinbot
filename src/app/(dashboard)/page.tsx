'use client'

import { Suspense } from 'react'
import { Coins, ArrowLeft, User } from 'lucide-react'
import { useAI } from '@/components/providers/AIProvider'
import { UserDropdown } from '@/components/auth/UserDropdown'
import { Badge } from '@/components/ui/badge'
import ChatBox from '@/components/chat/ChatBox'
import { useSearchParams, useRouter } from 'next/navigation'

function ClinicChatInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const bookingId = searchParams.get('booking_id')
    const { tokensRemaining, setTokensRemaining, currentClinicId } = useAI()

    const handleTokensUsed = (used: number) => {
        setTokensRemaining((prev) => Math.max(0, prev - used))
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937]">
                <div className="flex items-center gap-2.5">
                    {bookingId ? (
                        <button
                            onClick={() => router.push('/appointments')}
                            className="h-8 w-8 rounded-xl bg-[#1f2937] flex items-center justify-center hover:bg-gray-700 transition-all active:scale-95"
                        >
                            <ArrowLeft size={15} className="text-gray-300" />
                        </button>
                    ) : (
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-[#1f2937] shadow-md bg-black">
                            <img 
                                src="https://deetwinapp.vercel.app/assets/public/avatar.995cc35baa763d8aaef9a5fe3954fe7d.gif" 
                                alt="DeeTwin Avatar"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}
                    <div>
                        <p className="text-white text-sm font-bold tracking-tight leading-none">
                            {bookingId ? 'Chat với bệnh nhân' : 'DeeTwin'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-gray-500">
                                {bookingId ? 'Đang trong phiên khám' : 'Trợ lý đang trực tuyến'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            if (!currentClinicId) return;
                            const { requestTopUp } = await import('@/lib/actions/admin');
                            const res = await requestTopUp(currentClinicId);
                            if (res.success) alert('Đã gửi yêu cầu nạp thêm Token tới Admin!');
                            else alert('Lỗi: ' + res.error);
                        }}
                        className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded-md hover:bg-yellow-500/20 transition-all"
                        title="Yêu cầu nạp Token"
                    >
                        NẠP THÊM
                    </button>
                    <Badge className="bg-[#1DA1F2]/10 text-[#1DA1F2] border-none rounded-full px-2.5 py-1 flex items-center gap-1 text-[11px]">
                        <Coins size={10} />
                        <span className="tabular-nums font-semibold">{tokensRemaining.toLocaleString()}</span>
                    </Badge>
                    <UserDropdown />
                </div>
            </header>

            {/* ── Chat ── */}
            <div className="flex-1 overflow-hidden">
                <ChatBox
                    key={currentClinicId || 'default'}
                    clinicId={currentClinicId}
                    onTokensUsed={handleTokensUsed}
                    bookingId={bookingId}
                    placeholder={bookingId ? 'Nhắn tin với bệnh nhân...' : 'Hỏi DeeTwin về chỉ số MSI, MGC...'}
                />
            </div>
        </div>
    )
}

export default function ClinicChatPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-[#1DA1F2] border-t-transparent animate-spin" />
            </div>
        }>
            <ClinicChatInner />
        </Suspense>
    )
}
