'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAI } from '@/components/providers/AIProvider'
import { Bot, Save, Loader2, CheckCircle2, RefreshCw, Image as ImageIcon } from 'lucide-react'

interface BotConfig {
    bot_name: string
    bot_avatar_url: string
    custom_system_prompt: string
}

const EMPTY: BotConfig = { bot_name: '', bot_avatar_url: '', custom_system_prompt: '' }

const PRESET_PROMPTS = [
    {
        label: 'Phòng mạch Nội tiết',
        prompt: 'Tập trung tư vấn về bệnh tiểu đường, tuyến giáp và rối loạn nội tiết. Luôn khuyến nghị xét nghiệm HbA1c khi MGC bất thường.',
    },
    {
        label: 'Phòng khám Dinh dưỡng',
        prompt: 'Tập trung tư vấn về chế độ ăn uống, kiểm soát cân nặng và chỉ số BMI. Gợi ý thực phẩm lành mạnh phù hợp với chỉ số EIB người dùng.',
    },
    {
        label: 'Phòng khám Tim mạch',
        prompt: 'Tập trung theo dõi huyết áp, nhịp tim và chỉ số MFV. Cảnh báo ngay khi phát hiện dấu hiệu bất thường về tim mạch.',
    },
]

export default function BotSettings() {
    const { currentClinicId } = useAI()
    const [form, setForm] = useState<BotConfig>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!currentClinicId) return
        supabase
            .from('clinics')
            .select('bot_name, bot_avatar_url, custom_system_prompt')
            .eq('id', currentClinicId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setForm({
                        bot_name: data.bot_name ?? '',
                        bot_avatar_url: data.bot_avatar_url ?? '',
                        custom_system_prompt: data.custom_system_prompt ?? '',
                    })
                }
                setLoading(false)
            })
    }, [currentClinicId])

    const handleSave = async () => {
        if (!currentClinicId) return
        setSaving(true)
        await supabase
            .from('clinics')
            .update({
                bot_name: form.bot_name || null,
                bot_avatar_url: form.bot_avatar_url || null,
                custom_system_prompt: form.custom_system_prompt || null,
            })
            .eq('id', currentClinicId)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const applyPreset = (prompt: string) => {
        setForm((p) => ({ ...p, custom_system_prompt: prompt }))
    }

    if (loading) return (
        <div className="flex justify-center pt-16">
            <Loader2 size={24} className="text-[#1DA1F2] animate-spin" />
        </div>
    )

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-[#1DA1F2]" />
                    <h2 className="text-white text-sm font-bold">Cấu hình Bot AI</h2>
                </div>
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
            </div>

            {/* Bot identity */}
            <div className="space-y-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-widest">Danh tính Bot</p>

                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#1f2937] flex-shrink-0 bg-gradient-to-br from-[#1DA1F2] to-teal-500 flex items-center justify-center">
                        {form.bot_avatar_url
                            ? <img src={form.bot_avatar_url} alt="Bot avatar" className="h-full w-full object-cover" />
                            : <Bot size={22} className="text-white" />}
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] text-gray-500 mb-1">Hỗ trợ link .jpg, .png, .gif</p>
                        <div className="flex items-center gap-2 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-2.5">
                            <ImageIcon size={14} className="text-gray-600 flex-shrink-0" />
                            <input
                                value={form.bot_avatar_url}
                                onChange={(e) => setForm((p) => ({ ...p, bot_avatar_url: e.target.value }))}
                                placeholder="https://example.com/doctor.gif"
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Bot name */}
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f2937] rounded-xl px-3 py-2.5">
                    <Bot size={14} className="text-gray-600 flex-shrink-0" />
                    <input
                        value={form.bot_name}
                        onChange={(e) => setForm((p) => ({ ...p, bot_name: e.target.value }))}
                        placeholder="Tên bot (mặc định: DeeTwin)"
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-700"
                    />
                </div>
            </div>

            {/* Custom system prompt */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Hướng dẫn riêng cho Bot</p>
                    <button
                        onClick={() => setForm((p) => ({ ...p, custom_system_prompt: '' }))}
                        className="text-[11px] text-gray-600 hover:text-gray-400 flex items-center gap-1"
                    >
                        <RefreshCw size={11} /> Xóa
                    </button>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                    {PRESET_PROMPTS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => applyPreset(p.prompt)}
                            className="text-[11px] bg-[#111] border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-600 rounded-lg px-3 py-1.5 transition-all active:scale-95"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <textarea
                    value={form.custom_system_prompt}
                    onChange={(e) => setForm((p) => ({ ...p, custom_system_prompt: e.target.value }))}
                    rows={8}
                    placeholder={`Thêm hướng dẫn riêng cho phòng mạch của bạn.\nVí dụ: "Luôn hỏi về lịch sử gia đình khi MSI < 70." hoặc "Ưu tiên giới thiệu gói khám tổng quát hàng tháng."`}
                    className="w-full bg-[#111] border border-[#1f2937] rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-700 outline-none focus:border-[#1DA1F2]/50 leading-relaxed resize-none transition-all"
                />
                <p className="text-[11px] text-gray-700 leading-relaxed">
                    Hướng dẫn này sẽ được thêm vào sau prompt gốc của DeeTwin. Dùng để định hướng chuyên ngành, ngôn ngữ, hoặc các sản phẩm/dịch vụ riêng của phòng mạch.
                </p>
            </div>
        </div>
    )
}
