'use client'

import { useState, useEffect, useRef } from 'react'
import { useAI } from '@/components/providers/AIProvider'
import { Coins, Zap, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const PACKAGES = [
    { id: 'basic',  label: 'Gói Cơ bản',   tokens: 100_000,  price: 100_000 },
    { id: 'pro',    label: 'Gói Pro',       tokens: 500_000,  price: 450_000 },
    { id: 'ultra',  label: 'Gói Ultra',     tokens: 1_000_000, price: 800_000 },
] as const

type PackageId = typeof PACKAGES[number]['id']

function AnimatedNumber({ value }: { value: number }) {
    const prevRef = useRef(value)
    const [display, setDisplay] = useState(value)

    useEffect(() => {
        const prev = prevRef.current
        if (prev === value) return

        const diff = value - prev
        const steps = 30
        const interval = 600 / steps
        let step = 0

        const timer = setInterval(() => {
            step++
            const eased = 1 - Math.pow(1 - step / steps, 3) // ease-out cubic
            setDisplay(Math.round(prev + diff * eased))
            if (step >= steps) {
                setDisplay(value)
                prevRef.current = value
                clearInterval(timer)
            }
        }, interval)

        return () => clearInterval(timer)
    }, [value])

    return <>{display.toLocaleString('vi-VN')}</>
}

export default function ClinicTokensPage() {
    const { tokensRemaining, currentClinicId } = useAI()
    const [selected, setSelected] = useState<PackageId | null>(null)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        if (!currentClinicId) return
        supabase
            .from('topup_requests')
            .select('id, token_amount, status, created_at')
            .eq('clinic_id', currentClinicId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => data && setHistory(data))
    }, [currentClinicId, sent])

    const handleRequest = async () => {
        if (!selected || !currentClinicId) return
        setSending(true)
        const pkg = PACKAGES.find((p) => p.id === selected)!

        await supabase.from('topup_requests').insert({
            clinic_id: currentClinicId,
            token_amount: pkg.tokens,
            price_vnd: pkg.price,
            status: 'pending',
        })

        setSending(false)
        setSent(true)
        setSelected(null)
        setTimeout(() => setSent(false), 4000)
    }

    const pct = Math.min(100, Math.round((tokensRemaining / 1_000_000) * 100))
    const statusColors: Record<string, string> = {
        pending:  'text-amber-400',
        approved: 'text-emerald-400',
        rejected: 'text-red-400',
    }
    const statusLabels: Record<string, string> = {
        pending:  'Chờ duyệt',
        approved: 'Đã duyệt',
        rejected: 'Từ chối',
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <header className="sticky top-0 z-40 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-[#1f2937] flex items-center gap-2">
                <Coins size={18} className="text-[#1DA1F2]" />
                <h1 className="text-white text-sm font-bold">Quản lý Token</h1>
            </header>

            <div className="px-4 py-5 space-y-6">
                {/* Balance card */}
                <div className="bg-gradient-to-br from-[#0d1a2a] to-[#030d14] border border-[#1DA1F2]/20 rounded-2xl p-5 shadow-xl shadow-sky-500/5">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1">Số dư hiện tại</p>
                    <p className="text-4xl font-black text-white tabular-nums tracking-tighter">
                        <AnimatedNumber value={tokensRemaining} />
                    </p>
                    <p className="text-gray-600 text-xs mt-1">tokens còn lại</p>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#1DA1F2] to-teal-400 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-gray-600 text-[10px] mt-1 text-right">{pct}% của 1M</p>
                    </div>
                </div>

                {/* Packages */}
                <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3">Chọn gói nạp</p>
                    <div className="space-y-2.5">
                        {PACKAGES.map((pkg) => {
                            const isSelected = selected === pkg.id
                            return (
                                <button
                                    key={pkg.id}
                                    onClick={() => setSelected(pkg.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] text-left
                                        ${isSelected
                                            ? 'border-[#1DA1F2] bg-[#1DA1F2]/10'
                                            : 'border-[#1f2937] bg-[#0d0d0d] hover:border-gray-600'}`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className={isSelected ? 'text-[#1DA1F2]' : 'text-gray-600'} />
                                            <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                {pkg.label}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-xs mt-0.5 ml-5">
                                            {pkg.tokens.toLocaleString('vi-VN')} tokens
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${isSelected ? 'text-[#1DA1F2]' : 'text-gray-400'}`}>
                                            {pkg.price.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Submit */}
                <button
                    onClick={handleRequest}
                    disabled={!selected || sending || sent}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95
                        ${!selected || sent
                            ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                            : 'bg-[#1DA1F2] text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'}`}
                >
                    {sending
                        ? <Loader2 size={16} className="animate-spin" />
                        : sent
                            ? <CheckCircle2 size={16} />
                            : <ChevronRight size={16} />}
                    {sent ? 'Yêu cầu đã gửi! Admin sẽ liên hệ sớm.' : 'Gửi yêu cầu nạp token'}
                </button>

                {/* History */}
                {history.length > 0 && (
                    <div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-3">Lịch sử nạp</p>
                        <div className="space-y-2">
                            {history.map((h) => (
                                <div key={h.id} className="flex items-center justify-between bg-[#111] border border-[#1f2937] rounded-xl px-3.5 py-3">
                                    <div>
                                        <p className="text-white text-xs font-semibold">
                                            +{h.token_amount.toLocaleString('vi-VN')} tokens
                                        </p>
                                        <p className="text-gray-600 text-[10px] mt-0.5">
                                            {new Date(h.created_at).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-semibold ${statusColors[h.status] ?? 'text-gray-500'}`}>
                                        {statusLabels[h.status] ?? h.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
