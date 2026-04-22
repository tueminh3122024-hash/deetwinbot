'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import { type UIMessage, isToolUIPart, DefaultChatTransport } from 'ai'
import { Send, Paperclip, Image as ImageIcon, ArrowRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { uploadMedicalImage } from '@/lib/supabase/storage'
import { TikTokPlayer, MedicalLeadForm, MSIDashboard, BookingWidget, VideoWidget } from '@/components/chat/widgets'
import VoiceMic from '@/components/chat/VoiceMic'
import VisionOCR from '@/components/chat/VisionOCR'
import MetricsInputForm from '@/components/chat/MetricsInputForm'
import { useChatStorage } from '@/hooks/useChatStorage'
import { CreditCard } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Attachment {
    id: string
    file: File
    previewUrl: string
    supabaseUrl?: string
    type: 'image' | 'document'
    isUploading?: boolean
}

interface ChatBoxProps {
    clinicId?: string | null
    userId?: string | null
    /** Called after each AI response with token usage */
    onTokensUsed?: (tokens: number) => void
    /** Optional placeholder override */
    placeholder?: string
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function getMessageText(message: any): string {
    if (!message?.parts) return ''
    return message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('\n')
}

// ─────────────────────────────────────────────
// ParsedContent — renders text + inline widgets
// ─────────────────────────────────────────────
function ParsedContent({ text }: { text: string }) {
    if (!text) return null

    const videoRegex = /\[VIDEO:\s*(https?:\/\/[^\]]+)\]/g
    const widgetRegex = /\[WIDGET:\s*(\w+)(?::([^\s\]]+))?\]/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const allMatches: any[] = []
    let keyCounter = 0
    const nextKey = (prefix: string) => `${prefix}-${keyCounter++}`

    videoRegex.lastIndex = 0
    let vMatch
    while ((vMatch = videoRegex.exec(text)) !== null) {
        allMatches.push({ index: vMatch.index, length: vMatch[0].length, type: 'video', value: vMatch[1] })
    }

    widgetRegex.lastIndex = 0
    let wMatch
    while ((wMatch = widgetRegex.exec(text)) !== null) {
        allMatches.push({ index: wMatch.index, length: wMatch[0].length, type: 'widget', name: wMatch[1], url: wMatch[2] })
    }

    allMatches.sort((a, b) => a.index - b.index)

    allMatches.forEach((m) => {
        if (m.index > lastIndex) {
            parts.push(<p key={nextKey('text')} className="whitespace-pre-wrap mb-2 leading-relaxed">{text.substring(lastIndex, m.index)}</p>)
        }
        if (m.type === 'video' && m.value) {
            parts.push(
                <div key={nextKey('video')} className="my-3">
                    <VideoWidget url={m.value} />
                </div>
            )
        } else if (m.type === 'widget' && m.name) {
            const type = m.name.toUpperCase()
            if (type === 'PAY') {
                parts.push(
                    <div key={nextKey('pay')} className="my-3 p-4 rounded-2xl bg-blue-900/20 border border-blue-800">
                        <div className="flex items-center text-blue-300 mb-2 text-sm font-semibold">
                            <CreditCard className="mr-2 h-4 w-4" /> Yêu Cầu Nạp Tokens
                        </div>
                        <p className="text-xs text-blue-300/70 mb-3">Số dư tokens thấp. Vui lòng nạp thêm để duy trì dịch vụ.</p>
                        <button className="w-full bg-[#1DA1F2] hover:bg-sky-400 text-white text-sm font-bold rounded-xl py-2 transition-all active:scale-95">
                            Nạp Tokens
                        </button>
                    </div>
                )
            } else if (type === 'BOOKING') {
                const formUrl = m.url || 'https://tally.so/embed/w7vX8m'
                parts.push(
                    <div key={nextKey('booking')} className="my-3">
                        <BookingWidget formUrl={formUrl} />
                    </div>
                )
            }
        }
        lastIndex = m.index + m.length
    })

    if (lastIndex < text.length) {
        parts.push(<p key={nextKey('text-final')} className="whitespace-pre-wrap leading-relaxed">{text.substring(lastIndex)}</p>)
    }

    return <div className="text-sm">{parts.length > 0 ? parts : <p className="whitespace-pre-wrap leading-relaxed text-sm">{text}</p>}</div>
}

// ─────────────────────────────────────────────
// ChatBox — Main exported component
// ─────────────────────────────────────────────
export default function ChatBox({ clinicId, userId, onTokensUsed, placeholder }: ChatBoxProps) {
    const [inputValue, setInputValue] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const [sessionId] = useState(() => Math.random().toString(36).slice(2))
    const { saveMessagesLocally } = useChatStorage(sessionId)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [inputValue])

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    const { messages, sendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({
            body: { id: clinicId },
        }),
        onFinish: async ({ message }) => {
            const responseText = getMessageText(message)

            // Token deduction
            const usage = (message as any).usage
            const used = usage?.totalTokens ?? 0
            if (used && clinicId) {
                onTokensUsed?.(used)
                await supabase.rpc('decrement_clinic_tokens', { clinic_id: clinicId, amount: used })
            }

            // Save to chat_history
            const lastUserMsg = messages.findLast?.((m) => m.role === 'user')
            const userText = getMessageText(lastUserMsg)
            if (userText && responseText) {
                await supabase.from('chat_history').insert({
                    user_id: userId ?? null,
                    clinic_id: clinicId ?? null,
                    message: userText,
                    response: responseText,
                    tokens_used: used,
                })
            }

            // Local save
            saveMessagesLocally([...messages, message])
        },
        onError: (err) => console.error('[ChatBox] error:', err),
    })

    // Load history from Supabase when clinicId changes
    useEffect(() => {
        if (!clinicId) return
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('role, content, created_at')
                .eq('clinic_id', clinicId)
                .order('created_at', { ascending: true })
                .limit(20)

            if (!error && data) {
                const uiMessages: UIMessage[] = data.map((msg, idx) => ({
                    id: `hist-${idx}`,
                    role: msg.role as 'user' | 'assistant',
                    parts: [{ type: 'text', text: msg.content }],
                }))
                setMessages(uiMessages)
            }
        }
        fetchHistory()
    }, [clinicId, setMessages])

    // ── Submit ──
    const handleSend = () => {
        const text = inputValue.trim()
        if (!text) return
        sendMessage({ text })
        setInputValue('')
        setAttachments([])
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // ── Voice transcript ──
    const handleTranscript = (text: string) => {
        setInputValue((prev) => prev ? `${prev} ${text}` : text)
    }

    // ── VisionOCR scan trigger ──
    const handleOCRScan = (imageUrl: string, mimeType: string) => {
        sendMessage({
            text: 'Hãy trích xuất các chỉ số sức khỏe (huyết áp, nhịp tim, đường huyết, MSI, MGC) trong ảnh này và phân tích.',
            files: [{ type: 'file', url: imageUrl, mediaType: mimeType }],
        })
    }

    // ── File attachment (document) ──
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return

        for (const file of files) {
            const id = Math.random().toString(36).slice(2)
            const previewUrl = URL.createObjectURL(file)
            const att: Attachment = { id, file, previewUrl, type: 'document', isUploading: false }
            setAttachments((prev) => [...prev, att])
        }
        e.target.value = ''
    }

    const removeAttachment = (id: string) => {
        setAttachments((prev) => {
            const att = prev.find((a) => a.id === id)
            if (att) URL.revokeObjectURL(att.previewUrl)
            return prev.filter((a) => a.id !== id)
        })
    }

    const isBusy = status === 'streaming' || status === 'submitted'

    return (
        <div className="flex flex-col h-full">

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="px-2 pt-6 space-y-4">
                        {/* Welcome greeting */}
                        <div className="flex flex-col items-center gap-3 text-center pb-2">
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#1DA1F2] to-teal-500 flex items-center justify-center shadow-xl shadow-sky-500/10">
                                <span className="text-xl">🧬</span>
                            </div>
                            <div>
                                <p className="text-white text-base font-semibold">Xin chào! Tôi là DeeTwin</p>
                                <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                                    Nhập chỉ số sức khỏe bên dưới để nhận phân tích ngay,
                                    hoặc chụp ảnh phiếu xét nghiệm để AI tự điền.
                                </p>
                            </div>
                        </div>

                        {/* Inline Metrics Form */}
                        <MetricsInputForm
                            onSubmit={(message) => {
                                sendMessage({ text: message })
                            }}
                        />
                    </div>
                )}

                {messages.map((message, msgIdx) => (
                    <motion.div
                        key={`msg-${msgIdx}-${message.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                                ? 'rounded-tr-sm bg-[#1DA1F2] text-white'
                                : 'rounded-tl-sm bg-[#111] border border-[#1f2937] text-gray-200'
                        }`}>
                            {message.parts && message.parts.length > 0
                                ? message.parts.map((part, idx) => {
                                    if (part.type === 'text') {
                                        return <ParsedContent key={idx} text={part.text} />
                                    }
                                    if (isToolUIPart(part)) {
                                        const toolName = part.type.startsWith('tool-')
                                            ? part.type.substring(5)
                                            : (part as any).toolName
                                        const payload = (part as any).args || (part as any).result
                                        if (!payload) return null

                                        if (toolName === 'show_tiktok_video') {
                                            return <div key={idx} className="mt-3"><TikTokPlayer videoId={payload.videoId} caption={payload.caption} /></div>
                                        }
                                        if (toolName === 'show_medical_lead_form') {
                                            return <div key={idx} className="mt-3"><MedicalLeadForm clinicId={payload.clinicId} defaultName={payload.defaultName} /></div>
                                        }
                                        if (toolName === 'show_msi_dashboard') {
                                            return <div key={idx} className="mt-3"><MSIDashboard clinicId={payload.clinicId} timeframe={payload.timeframe} /></div>
                                        }
                                        return <div key={idx} className="mt-2 rounded bg-gray-800 p-2 text-xs italic text-gray-400">Công cụ: {toolName}</div>
                                    }
                                    return null
                                })
                                : <ParsedContent text={getMessageText(message) || '...'} />
                            }

                            {/* Streaming indicator */}
                            {isBusy && msgIdx === messages.length - 1 && message.role === 'assistant' && (
                                <span className="inline-flex gap-1 ml-1 mt-1">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </span>
                            )}

                            <div className={`mt-1 text-[10px] ${message.role === 'user' ? 'text-sky-200' : 'text-gray-600'}`}>
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </motion.div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Attachment strip ── */}
            {attachments.length > 0 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap border-t border-[#1f2937]">
                    {attachments.map((att) => (
                        <div key={att.id} className="relative mt-2">
                            <div className="h-14 w-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
                                {att.type === 'image'
                                    ? <img src={att.previewUrl} alt="" className="h-full w-full object-cover" />
                                    : <Paperclip size={18} className="text-gray-400" />}
                            </div>
                            <button
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center shadow"
                            >
                                <X size={9} className="text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Input Bar ── */}
            <div className="px-4 pb-3 pt-2">
                <div className="bg-[#0d0d0d] border border-[#1f2937] rounded-[22px] px-3 pt-2 pb-1 shadow-xl">
                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder ?? 'Hỏi DeeTwin về chỉ số sức khỏe...'}
                        rows={1}
                        className="w-full bg-transparent text-white text-[14px] placeholder-gray-600 border-none focus:ring-0 outline-none resize-none min-h-[40px] max-h-36 overflow-y-auto py-1 leading-relaxed"
                    />

                    {/* Action bar */}
                    <div className="flex items-center justify-between mt-1">
                        {/* Left: VisionOCR + File attach */}
                        <div className="flex items-center gap-0.5">
                            <VisionOCR onScanReady={handleOCRScan} />

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                multiple
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center h-10 w-10 rounded-full text-[#9ca3af] hover:text-white transition-all active:scale-90"
                                aria-label="Đính kèm file"
                            >
                                <Paperclip size={18} />
                            </button>
                        </div>

                        {/* Right: Voice + Send */}
                        <div className="flex items-center gap-1.5">
                            <VoiceMic
                                onTranscript={handleTranscript}
                                disabled={isBusy}
                            />

                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={isBusy || !inputValue.trim()}
                                aria-label="Gửi tin nhắn"
                                className={`
                                    flex items-center justify-center h-9 w-9 rounded-full transition-all active:scale-90
                                    ${isBusy || !inputValue.trim()
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-[#1DA1F2] text-white hover:bg-sky-400 shadow-lg shadow-sky-500/20'}
                                `}
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[10px] text-gray-700 mt-2 tracking-widest uppercase">
                    DeeTwin Digital Twin · HIPAA Secured
                </p>
            </div>
        </div>
    )
}
