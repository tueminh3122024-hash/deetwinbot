'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Image as ImageIcon, FileText, Video, Activity, Paperclip,
    Loader2, CheckCircle2, Upload, Sparkles, AlertCircle
} from 'lucide-react'
import { uploadFile } from '@/lib/supabase/storage'
import { generateMedicalSummary } from '@/lib/actions/ai'
import { completeExamination } from '@/lib/actions/booking'
import { supabase } from '@/lib/supabase/client'

/* ─── Types ─── */
interface Attachment {
    id: string
    file: File
    type: 'image' | 'file' | 'video'
    name: string
    previewUrl?: string
    uploading: boolean
    uploadedUrl?: string
}

interface CompleteExamModalProps {
    open: boolean
    onClose: () => void
    booking: {
        id: string
        user_id: string
        clinic_id: string
        service_name: string
    }
    onSuccess: () => void
}

/* ─── Animation Variants ─── */
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
}

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
}

export default function CompleteExamModal({ open, onClose, booking, onSuccess }: CompleteExamModalProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [notes, setNotes] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [status, setStatus] = useState<'idle' | 'summarizing' | 'saving' | 'done' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    /* ─── Handlers ─── */
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const newAttachments: Attachment[] = files.map(file => ({
            id: Math.random().toString(36).slice(2),
            file,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
            uploading: false
        }))

        setAttachments(prev => [...prev, ...newAttachments])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeAttachment = (id: string) => {
        setAttachments(prev => {
            const item = prev.find(a => a.id === id)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter(a => a.id !== id)
        })
    }

    const handleSubmit = async () => {
        if (isProcessing) return
        setIsProcessing(true)
        setStatus('summarizing')
        setErrorMessage('')

        try {
            // 1. Upload all files
            const uploadedMedia: { url: string; type: 'image' | 'file'; caption?: string }[] = []
            
            for (const att of attachments) {
                setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploading: true } : a))
                
                const path = `clinic-${booking.clinic_id}/patient-${booking.user_id}`
                const { url } = await uploadFile(att.file, 'medical-uploads', path)
                
                uploadedMedia.push({
                    url,
                    type: att.type === 'image' ? 'image' : 'file',
                    caption: att.name
                })

                setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, uploading: false, uploadedUrl: url } : a))
            }

            // 2. Get chat history context and user info
            const [historyRes, profileRes] = await Promise.all([
                supabase
                    .from('chat_history')
                    .select('message, response')
                    .eq('user_id', booking.user_id)
                    .eq('clinic_id', booking.clinic_id)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', booking.user_id)
                    .single()
            ])

            const history = historyRes.data
            const patientProfile = profileRes.data
            
            const chatText = history?.map(h => `User: ${h.message}\nAI: ${h.response}`).join('\n') || ''
            const userInfo = patientProfile 
                ? `Tên: ${patientProfile.full_name}, Email: ${patientProfile.email}, SĐT: ${patientProfile.phone}, Địa chỉ: ${patientProfile.address}` 
                : 'Không có thông tin profile'

            // 3. AI Summarization
            const aiResult = await generateMedicalSummary(chatText, notes, '', userInfo)
            if (!aiResult.success) throw new Error(aiResult.error)

            setStatus('saving')

            // 4. Save to database
            const saveResult = await completeExamination(
                booking.id,
                booking.user_id,
                booking.clinic_id,
                aiResult.summary!,
                uploadedMedia
            )

            if (!saveResult.success) throw new Error(saveResult.error)

            setStatus('done')
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)

        } catch (err: any) {
            console.error('[CompleteExamModal] Error:', err)
            setStatus('error')
            setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình xử lý.')
        } finally {
            setIsProcessing(false)
        }
    }

    /* ─── Render ─── */
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full max-w-2xl bg-[#0d0d0d]/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-[#1DA1F2]/20 flex items-center justify-center border border-[#1DA1F2]/30 shadow-lg shadow-sky-500/10">
                                    <CheckCircle2 className="text-[#1DA1F2]" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-white text-lg font-bold">Hoàn tất quy trình khám</h2>
                                    <p className="text-gray-500 text-[11px] uppercase tracking-wider font-medium">Bệnh nhân: {booking.user_id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 max-h-[70dvh] overflow-y-auto custom-scrollbar">
                            {status === 'done' ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="h-20 w-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
                                    >
                                        <CheckCircle2 size={40} className="text-emerald-500" />
                                    </motion.div>
                                    <div className="space-y-1">
                                        <h3 className="text-white text-xl font-bold">Thành công!</h3>
                                        <p className="text-gray-400 text-sm">Hồ sơ bệnh án đã được lưu và cập nhật cho bệnh nhân.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center gap-2 text-sky-400">
                                            <Sparkles size={16} />
                                            <span className="text-xs font-bold uppercase tracking-wide">Tối ưu hóa dữ liệu</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            Bạn có muốn lưu trữ Hồ sơ bệnh án của bệnh nhân tại Clinic để tối ưu hóa việc theo dõi sức khỏe và tái khám sau này không?
                                        </p>
                                    </div>

                                    {/* Upload Grid */}
                                    <div className="space-y-3">
                                        <span className="text-[11px] text-gray-500 uppercase font-bold tracking-widest ml-1">Multimedia Hub</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <UploadButton icon={ImageIcon} label="Thêm Hình ảnh" onClick={() => fileInputRef.current?.click()} />
                                            <UploadButton icon={FileText} label="Phiếu khám" onClick={() => fileInputRef.current?.click()} />
                                            <UploadButton icon={Video} label="Video tư vấn" onClick={() => fileInputRef.current?.click()} />
                                            <UploadButton icon={Activity} label="Phác đồ" onClick={() => fileInputRef.current?.click()} />
                                            <UploadButton icon={Paperclip} label="Tài liệu khác" onClick={() => fileInputRef.current?.click()} />
                                            
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                multiple 
                                                onChange={handleFileSelect}
                                            />
                                        </div>
                                    </div>

                                    {/* Attachments List */}
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((att) => (
                                                <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-10 w-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                                                            {att.previewUrl ? (
                                                                <img src={att.previewUrl} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <FileText size={16} className="text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-white text-xs font-medium truncate">{att.name}</p>
                                                            <p className="text-gray-600 text-[10px] uppercase">{att.type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {att.uploading && <Loader2 size={14} className="animate-spin text-sky-500" />}
                                                        <button 
                                                            onClick={() => removeAttachment(att.id)}
                                                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div className="space-y-3">
                                        <span className="text-[11px] text-gray-500 uppercase font-bold tracking-widest ml-1">Ghi chú chuyên môn</span>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Nhập ghi chú nhanh về chẩn đoán hoặc dặn dò cho AI tổng hợp..."
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-600 outline-none focus:border-[#1DA1F2]/50 transition-all resize-none"
                                        />
                                    </div>

                                    {status === 'error' && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                            <AlertCircle size={14} />
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-all disabled:opacity-30"
                            >
                                Huỷ bỏ
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isProcessing || status === 'done'}
                                className={`
                                    relative flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-xl
                                    ${isProcessing 
                                        ? 'bg-sky-500/50 text-white cursor-wait' 
                                        : status === 'done'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#1DA1F2] text-white hover:bg-sky-400 hover:shadow-sky-500/20'
                                    }
                                `}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        {status === 'summarizing' ? 'AI đang tổng hợp...' : 'Đang lưu hồ sơ...'}
                                    </>
                                ) : status === 'done' ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Hoàn tất
                                    </>
                                ) : (
                                    'Xác nhận hoàn tất'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function UploadButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/[0.08] transition-all group"
        >
            <div className="h-10 w-10 rounded-xl bg-gray-900 border border-white/5 flex items-center justify-center group-hover:bg-[#1DA1F2]/10 group-hover:border-[#1DA1F2]/30 transition-all shadow-inner">
                <Icon size={18} className="text-gray-500 group-hover:text-[#1DA1F2]" />
            </div>
            <span className="text-[11px] text-gray-400 font-semibold">{label}</span>
        </button>
    )
}
