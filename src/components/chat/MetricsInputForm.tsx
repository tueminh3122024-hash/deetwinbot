'use client'

import { useState, useRef } from 'react'
import { Camera, ScanLine, Loader2, Send, RefreshCw, Info } from 'lucide-react'
import { uploadMedicalImage } from '@/lib/supabase/storage'

interface Metrics {
    MSI: string
    EIB: string
    MFV: string
    MGC: string
}

interface MetricsInputFormProps {
    /** Called when user submits — passes a formatted message string */
    onSubmit: (message: string, metrics: Metrics) => void
}

const FIELDS: { key: keyof Metrics; label: string; unit: string; hint: string; range: string; color: string }[] = [
    {
        key: 'MSI', label: 'MSI', unit: '/100',
        hint: 'Chỉ số ổn định chuyển hóa',
        range: 'Bình thường: 70 - 90',
        color: '#1DA1F2',
    },
    {
        key: 'EIB', label: 'EIB', unit: '%',
        hint: 'Chỉ số cân bằng năng lượng',
        range: 'Bình thường: > 80%',
        color: '#10b981',
    },
    {
        key: 'MFV', label: 'MFV', unit: 'ml/min',
        hint: 'Tốc độ lọc cầu thận chuyển hóa',
        range: 'Bình thường: > 60',
        color: '#a855f7',
    },
    {
        key: 'MGC', label: 'MGC', unit: 'mg/dL',
        hint: 'Kiểm soát Glucose chuyển hóa',
        range: 'Mục tiêu: 90 mg/dL',
        color: '#f59e0b',
    },
]

export default function MetricsInputForm({ onSubmit }: MetricsInputFormProps) {
    const [metrics, setMetrics] = useState<Metrics>({ MSI: '', EIB: '', MFV: '', MGC: '' })
    const [scanning, setScanning] = useState(false)
    const [scanNote, setScanNote] = useState('')
    const [showHint, setShowHint] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        setScanning(true)
        setScanNote('')

        try {
            // 1. Upload to Supabase Storage
            const { url } = await uploadMedicalImage(file)

            // 2. Send to OCR Extract endpoint
            const res = await fetch('/api/ocr-extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url, mimeType: file.type }),
            })
            const json = await res.json()

            if (json.success && json.data) {
                const d = json.data
                setMetrics({
                    MSI: d.MSI != null ? String(d.MSI) : metrics.MSI,
                    EIB: d.EIB != null ? String(d.EIB) : metrics.EIB,
                    MFV: d.MFV != null ? String(d.MFV) : metrics.MFV,
                    MGC: d.MGC != null ? String(d.MGC) : metrics.MGC,
                })
                setScanNote(d.notes || 'Đã trích xuất chỉ số từ ảnh. Kiểm tra lại trước khi gửi.')
            } else {
                setScanNote('Không nhận ra chỉ số từ ảnh. Nhập tay nhé.')
            }
        } catch {
            setScanNote('Lỗi khi quét ảnh. Thử lại hoặc nhập tay.')
        }
        setScanning(false)
    }

    const handleSubmit = () => {
        const parts = FIELDS
            .filter((f) => metrics[f.key] !== '')
            .map((f) => `${f.label}: ${metrics[f.key]} ${f.unit}`)

        if (parts.length === 0) return

        const message = `Chỉ số sức khỏe của tôi hôm nay:\n${parts.join('\n')}\n\nPhân tích và tư vấn giúp tôi.`
        onSubmit(message, metrics)
    }

    const filled = FIELDS.filter((f) => metrics[f.key] !== '').length
    const allEmpty = filled === 0

    return (
        <div className="bg-[#0d0d0d] border border-[#1f2937] rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2937]">
                <div>
                    <p className="text-white text-sm font-semibold">Nhập chỉ số sức khỏe</p>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                        {filled}/4 chỉ số đã điền
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Hint toggle */}
                    <button
                        onClick={() => setShowHint(!showHint)}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-300 transition-all"
                        title="Hướng dẫn"
                    >
                        <Info size={16} />
                    </button>

                    {/* Camera OCR */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleScan}
                    />
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={scanning}
                        className="flex items-center gap-1.5 bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2] text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                        title="Chụp phiếu xét nghiệm"
                    >
                        {scanning
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Camera size={13} />}
                        {scanning ? 'Đang quét...' : 'Chụp phiếu'}
                    </button>
                </div>
            </div>

            {/* Hint panel */}
            {showHint && (
                <div className="px-4 py-3 bg-blue-950/30 border-b border-[#1f2937] text-xs text-blue-300 leading-relaxed space-y-1">
                    <p>- Bấm "Chụp phiếu" để chụp ảnh phiếu xét nghiệm hoặc phiếu khám.</p>
                    <p>- AI sẽ tự động đọc và điền các chỉ số MSI, EIB, MFV, MGC vào form.</p>
                    <p>- Bạn cũng có thể nhập tay từng ô bên dưới.</p>
                    <p>- Sau khi điền xong, bấm "Gửi phân tích" để nhận tư vấn.</p>
                </div>
            )}

            {/* Scan result note */}
            {scanNote && (
                <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-[#1f2937] flex items-start gap-2">
                    <ScanLine size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-emerald-300 text-xs leading-relaxed">{scanNote}</p>
                </div>
            )}

            {/* Input fields */}
            <div className="grid grid-cols-2 gap-3 p-4">
                {FIELDS.map((f) => (
                    <div key={f.key} className="relative">
                        <div
                            className="absolute left-3 top-2.5 text-[10px] font-bold tracking-widest"
                            style={{ color: f.color }}
                        >
                            {f.label}
                        </div>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={metrics[f.key]}
                            onChange={(e) => setMetrics((p) => ({ ...p, [f.key]: e.target.value }))}
                            placeholder="--"
                            className="w-full bg-[#111] border border-[#1f2937] rounded-xl pt-7 pb-2 px-3 text-white text-lg font-bold text-center outline-none focus:border-[#1DA1F2]/50 transition-all"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        />
                        <div className="flex justify-between px-1 mt-1">
                            <span className="text-gray-700 text-[10px]">{f.unit}</span>
                            <span className="text-gray-700 text-[10px]">{f.range}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Submit */}
            <div className="px-4 pb-4 flex gap-2">
                <button
                    onClick={() => setMetrics({ MSI: '', EIB: '', MFV: '', MGC: '' })}
                    className="h-10 w-10 rounded-xl flex items-center justify-center border border-[#1f2937] text-gray-600 hover:text-gray-300 transition-all active:scale-95 flex-shrink-0"
                    title="Xóa tất cả"
                >
                    <RefreshCw size={15} />
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={allEmpty}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl font-semibold text-sm transition-all active:scale-95
                        ${allEmpty
                            ? 'bg-gray-900 text-gray-700 cursor-not-allowed'
                            : 'bg-[#1DA1F2] text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'}`}
                >
                    <Send size={15} />
                    Gửi phân tích AI
                </button>
            </div>
        </div>
    )
}
