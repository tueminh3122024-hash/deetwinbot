'use client'

import { Coins } from 'lucide-react'
import { useAI } from '@/components/providers/AIProvider'
import { UserDropdown } from '@/components/auth/UserDropdown'
import { Badge } from '@/components/ui/badge'
import ChatBox from '@/components/chat/ChatBox'

export default function ClinicChatPage() {
    const { tokensRemaining, setTokensRemaining, currentClinicId } = useAI()

    const handleTokensUsed = (used: number) => {
        setTokensRemaining((prev) => Math.max(0, prev - used))
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937]">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1DA1F2] to-teal-500 shadow-md" />
                    <div>
                        <p className="text-white text-sm font-bold tracking-tight leading-none">DeeTwin</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-gray-500">Trợ lý đang trực tuyến</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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
                    clinicId={currentClinicId}
                    onTokensUsed={handleTokensUsed}
                    placeholder="Hỏi DeeTwin về chỉ số MSI, MGC..."
                />
            </div>
        </div>
    )
}
