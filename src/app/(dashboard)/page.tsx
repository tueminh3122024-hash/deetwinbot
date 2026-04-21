'use client'

import { motion } from 'framer-motion'
import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { type UIMessage, type UIMessagePart, isToolUIPart, DefaultChatTransport } from 'ai'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Paperclip, Image, Video, Smile, X, Mic } from 'lucide-react'
import { useAI } from '@/components/providers/AIProvider'
import { TikTokPlayer, MedicalLeadForm, MSIDashboard, BookingWidget, VideoWidget } from '@/components/chat/widgets'
import ReactPlayer from 'react-player'
import { supabase } from '@/lib/supabase/client'
import { uploadMedicalImage } from '@/lib/supabase/storage'
import { Scan, Coins, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserDropdown } from '@/components/auth/UserDropdown'
import { useChatStorage } from '@/hooks/useChatStorage'

type Attachment = {
    id: string
    file: File
    previewUrl: string
    supabaseUrl?: string
    type: 'image' | 'video' | 'document'
    isUploading?: boolean
}

export default function DashboardPage() {
    const { tokensRemaining, setTokensRemaining, setActiveTool, setToolStatus, currentClinicId, playVoice } = useAI()
    const [inputValue, setInputValue] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [inputValue])

    const [sessionId] = useState(() => Math.random().toString(36).slice(2))
    const { saveMessagesLocally } = useChatStorage(sessionId)
    
    // Helper to extract text from UIMessage parts
    const getMessageText = (message: any): string => {
        if (!message.parts) return "";
        return message.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n');
    }

    const { messages, sendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({ 
            body: { id: currentClinicId } 
        }),
        onFinish: async ({ message }) => {
            console.log('Chat finished successfully:', message);
            
            // 1. Play voice
            const text = getMessageText(message);
            if (text) {
                playVoice(text);
            }

            // 2. Token Deduction (Admin/Clinic side)
            // Usage is often returned in the message object by Vercel AI SDK
            const usage = (message as any).usage
            if (usage && currentClinicId) {
                const used = usage.totalTokens
                setTokensRemaining(prev => Math.max(0, prev - used))
                
                // Sync with DB
                await supabase.rpc('decrement_clinic_tokens', { 
                    clinic_id: currentClinicId, 
                    amount: used 
                })
            }

            // 3. Save Local Transcript (Layer 1)
            saveMessagesLocally([...messages, message])

            // 4. Generate & Save Summary (Layer 2) - Periodic or on specific length
            if (messages.length > 5) {
                updateConversationSummary(messages, message)
            }
        },
        onError: (error) => {
            console.error('Chat encountered an error:', error);
        },
    })

    const updateConversationSummary = async (allMessages: any[], lastMsg: any) => {
        if (!currentClinicId) return
        
        try {
            // Simplified summary for demo, in production use an AI call
            const summary = {
                clinic_id: currentClinicId,
                session_id: sessionId,
                symptoms_summary: getMessageText(allMessages[0]).slice(0, 100) || "Consultation started",
                ai_conclusion: getMessageText(lastMsg).slice(0, 200) || "Ongoing...",
                total_tokens_used: tokensRemaining,
                updated_at: new Date().toISOString()
            }

            await supabase
                .from('conversation_summaries')
                .upsert(summary, { onConflict: 'session_id' })
        } catch (err) {
            console.error('Failed to save summary:', err)
        }
    }

    // Fetch history when clinic changes
    useEffect(() => {
        if (!currentClinicId) return

        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('role, content, created_at')
                .eq('clinic_id', currentClinicId)
                .order('created_at', { ascending: true })
                .limit(20)

            if (!error && data) {
                const uiMessages: UIMessage[] = data.map((msg, idx) => ({
                    id: `hist-${idx}`,
                    role: msg.role as 'user' | 'assistant',
                    parts: [{ type: 'text', text: msg.content }]
                }))
                setMessages(uiMessages)
            }
        }
        fetchHistory()
    }, [currentClinicId, setMessages])


    // Force update test: monitor messages array
    useEffect(() => {
        if (messages.length > 0) {
            console.log('Messages changed:');
            console.table(messages.map(m => ({ 
                id: m.id, 
                role: m.role, 
                text: getMessageText(m).substring(0, 50), 
                parts: m.parts?.length 
            })));
        }
    }, [messages])

    // Monitor messages for tool calls to update AIProvider
    useEffect(() => {
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'assistant') return
        
        // Parts check for AI response visibility
        if (lastMessage.parts && lastMessage.parts.length > 0) {
            const toolPart = lastMessage.parts.find(isToolUIPart)
            if (toolPart) {
                const toolName = toolPart.type.startsWith('tool-') ? toolPart.type.substring(5) : (toolPart as any).toolName
                setActiveTool(toolName)
                setToolStatus('completed')
            } else {
                setActiveTool(null)
                setToolStatus('idle')
            }
        }
    }, [messages, setActiveTool, setToolStatus])

    const handleFileSelect = (type: 'file' | 'image' | 'video') => {
        const ref = type === 'file' ? fileInputRef : type === 'image' ? imageInputRef : videoInputRef
        ref.current?.click()
    }

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
        const files = e.target.files
        if (!files) return

        const newFiles = Array.from(files)
        
        for (const file of newFiles) {
            const id = Math.random().toString(36).slice(2)
            const previewUrl = URL.createObjectURL(file)
            
            const newAttachment: Attachment = {
                id,
                file,
                previewUrl,
                type: type === 'document' ? 'document' : type,
                isUploading: true
            }
            
            setAttachments(prev => [...prev, newAttachment])

            try {
                if (type === 'image') {
                    const { url } = await uploadMedicalImage(file)
                    setAttachments(prev => prev.map(a => 
                        a.id === id ? { ...a, supabaseUrl: url, isUploading: false } : a
                    ))
                } else {
                    setAttachments(prev => prev.map(a => 
                        a.id === id ? { ...a, isUploading: false } : a
                    ))
                }
            } catch (error) {
                console.error('Upload failed:', error)
                setAttachments(prev => prev.map(a => 
                    a.id === id ? { ...a, isUploading: false } : a
                ))
            }
        }

        e.target.value = ''
    }

    const handleOCRScan = async (attachment: Attachment) => {
        if (!attachment.supabaseUrl) return
        
        // Use the chat to trigger OCR
        sendMessage({ 
            text: "Hãy trích xuất các chỉ số MSI, MGC trong ảnh này dưới dạng JSON",
            files: [
                {
                    type: 'file',
                    url: attachment.supabaseUrl!,
                    mediaType: attachment.file.type,
                }
            ]
        })
    }

    const removeAttachment = (id: string) => {
        setAttachments(prev => {
            const attachment = prev.find(a => a.id === id)
            if (attachment) URL.revokeObjectURL(attachment.previewUrl)
            return prev.filter(a => a.id !== id)
        })
    }

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (inputValue.trim()) {
            sendMessage({ text: inputValue })
            setInputValue('')
            // Clear attachments after send
            setAttachments([])
        }
    }

    return (
        <div className="flex h-full flex-col" style={{ display: 'flex !important', opacity: '1 !important' }}>
            {/* Chat header (Sticky & Blurred) */}
            <div className="sticky top-0 z-50 border-b border-[#1f2937] bg-black/60 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border border-[#1f2937]">
                            <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500" />
                        </Avatar>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="font-bold tracking-tight text-white uppercase text-sm sm:text-base">MINH TUỆ CLINIC</h2>
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-none rounded-full px-2 animate-pulse flex items-center space-x-1">
                                    <Coins size={10} />
                                    <span className="tabular-nums">{tokensRemaining.toLocaleString()}</span>
                                </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] sm:text-xs text-gray-400">Trợ lý DeeTwin Đang Trực Tuyến</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" size="sm" className="hidden sm:flex border-[#1f2937] rounded-full h-8 px-4 text-xs">
                            Lịch sử
                        </Button>
                        <UserDropdown />
                    </div>
                </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                    ? 'rounded-tr-none bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                                    : 'rounded-tl-none bg-gray-900 text-gray-200'
                                    }`}
                            >
                                {/* Render message parts */}
                                {message.parts && message.parts.length > 0 ? (
                                    message.parts.map((part, idx) => {
                                        if (part.type === 'text') {
                                            return <ParsedContent key={idx} text={part.text} />
                                        }
                                        if (isToolUIPart(part)) {
                                            const toolName = part.type.startsWith('tool-') ? part.type.substring(5) : (part as any).toolName
                                            // Robustly access tool data (args for calls, result for returns)
                                            const payload = (part as any).args || (part as any).result
                                            if (!payload) return null

                                            if (toolName === 'show_tiktok_video') {
                                                return (
                                                    <div key={idx} className="mt-4">
                                                        <TikTokPlayer videoId={payload.videoId} caption={payload.caption} />
                                                    </div>
                                                )
                                            } else if (toolName === 'show_medical_lead_form') {
                                                return (
                                                    <div key={idx} className="mt-4">
                                                        <MedicalLeadForm clinicId={payload.clinicId} defaultName={payload.defaultName} />
                                                    </div>
                                                )
                                            } else if (toolName === 'show_msi_dashboard') {
                                                return (
                                                    <div key={idx} className="mt-4">
                                                        <MSIDashboard clinicId={payload.clinicId} timeframe={payload.timeframe} />
                                                    </div>
                                                )
                                            }
                                            return <div key={idx} className="mt-2 rounded bg-gray-800 p-2 text-xs italic">Executed tool: {toolName}</div>
                                        }
                                        return null
                                    })
                                ) : (
                                    <ParsedContent text={getMessageText(message) || '...'} />
                                )}
                                {/* Timestamp */}
                                <div className={`mt-1 text-xs ${message.role === 'user' ? 'text-emerald-200' : 'text-gray-500'}`}>
                                    {new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Attachment preview */}
            {attachments.length > 0 && (
                <div className="border-t border-gray-800 p-4">
                    <div className="flex flex-wrap gap-2">
                        {attachments.map((att) => (
                            <div key={att.id} className="relative rounded-lg border border-gray-700 bg-gray-900 p-2">
                                {att.type === 'image' && (
                                    <img src={att.previewUrl} alt="Preview" className="h-20 w-20 rounded object-cover" />
                                )}
                                {att.type === 'video' && (
                                    <video src={att.previewUrl} className="h-20 w-20 rounded object-cover" controls={false} />
                                )}
                                {att.type === 'document' && (
                                    <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-800">
                                        <Paperclip className="h-8 w-8 text-gray-400" />
                                        <span className="ml-1 text-xs text-gray-300">{att.file.name.slice(0, 10)}...</span>
                                    </div>
                                )}
                                <div className="absolute -right-2 -top-2 flex flex-col space-y-1">
                                    <button
                                        onClick={() => removeAttachment(att.id)}
                                        className="rounded-full bg-red-600 p-1 hover:bg-red-700 shadow-lg"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>
                                    {att.type === 'image' && !att.isUploading && (
                                        <button
                                            onClick={() => handleOCRScan(att)}
                                            className="rounded-full bg-blue-600 p-1 hover:bg-blue-700 shadow-lg animate-pulse"
                                            title="Scan MSI/MGC"
                                        >
                                            <Scan size={12} className="text-white" />
                                        </button>
                                    )}
                                </div>
                                {att.isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input area - Grok Inspired Redesign */}
            <div className="p-4 sm:p-6 mb-2">
                <div className="mx-auto max-w-4xl">
                    <div className="bg-black border border-[#1f2937] rounded-[24px] p-3 shadow-2xl backdrop-blur-xl">
                        {/* Auto-resize Textarea */}
                        <div className="px-2">
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        onSubmit({ preventDefault: () => {} } as any);
                                    }
                                }}
                                placeholder="Hỏi DeeTwin về chỉ số MSI..."
                                className="w-full bg-transparent text-white placeholder-gray-500 border-none focus:ring-0 outline-none resize-none font-sans text-sm py-2 min-h-[44px] max-h-40 overflow-y-auto"
                                rows={1}
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-between mt-2 px-1">
                            <div className="flex items-center space-x-1">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'document')}
                                    multiple
                                />
                                <input
                                    type="file"
                                    ref={imageInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'image')}
                                    multiple
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-[#9ca3af] hover:text-white rounded-full h-10 w-10 transition-all active:scale-95"
                                    onClick={() => handleFileSelect('image')}
                                >
                                    <Image size={19} />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-[#9ca3af] hover:text-white rounded-full h-10 w-10 transition-all active:scale-95"
                                    onClick={() => handleFileSelect('file')}
                                >
                                    <Paperclip size={19} />
                                </Button>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-[#9ca3af] hover:text-white rounded-full h-10 w-10 transition-all active:scale-95"
                                >
                                    <Mic size={19} />
                                </Button>
                                <Button
                                    type="button"
                                    disabled={status !== 'ready' || !inputValue.trim()}
                                    onClick={() => onSubmit({ preventDefault: () => {} } as any)}
                                    className="bg-white text-black hover:bg-gray-200 rounded-full h-10 px-5 text-sm font-bold transition-all active:scale-95 flex items-center space-x-2 shadow-lg"
                                >
                                    <span>Gửi</span>
                                    <Send size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-center">
                         <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center justify-center space-x-2">
                            <span>Powered by DEETWIN Digital Twin</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span>HIPAA Secured</span>
                         </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
function ParsedContent({ text }: { text: string }) {
    if (!text) return null
    
    const videoRegex = /\[VIDEO:\s*(https?:\/\/[^\]]+)\]/g
    const widgetRegex = /\[WIDGET:\s*(\w+)(?::([^\s\]]+))?\]/g
    const parts = []
    let lastIndex = 0
    const allMatches = []
    
    videoRegex.lastIndex = 0
    let vMatch
    while ((vMatch = videoRegex.exec(text)) !== null) {
        allMatches.push({ index: vMatch.index, length: vMatch[0].length, type: 'video', value: vMatch[1] })
    }
    
    widgetRegex.lastIndex = 0
    let wMatch
    while ((wMatch = widgetRegex.exec(text)) !== null) {
        allMatches.push({ 
            index: wMatch.index, 
            length: wMatch[0].length, 
            type: 'widget', 
            name: wMatch[1],
            url: wMatch[2]
        })
    }

    allMatches.sort((a, b) => a.index - b.index)

    allMatches.forEach((m, idx) => {
        if (m.index > lastIndex) {
            parts.push(<p key={`text-${lastIndex}-${idx}`} className="whitespace-pre-wrap mb-2">{text.substring(lastIndex, m.index)}</p>)
        }
        if (m.type === 'video' && m.value) {
            parts.push(
                <div key={`video-${m.index}-${idx}`} className="my-4">
                    <VideoWidget url={m.value} />
                </div>
            )
        } else if (m.type === 'widget' && m.name) {
            const type = m.name.toUpperCase()
            if (type === 'PAY') {
                parts.push(
                    <div key={`widget-${m.index}-${idx}`} className="my-4 p-4 rounded-xl bg-blue-900/20 border border-blue-800 shadow-xl">
                        <div className="flex items-center text-blue-200 mb-3 font-semibold">
                            <CreditCard className="mr-2 h-5 w-5" /> Yêu Cầu Nạp Tokens
                        </div>
                        <p className="text-sm text-blue-300/80 mb-4 italic">Số dư tokens thấp. Vui lòng nạp thêm để duy trì dịch vụ.</p>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-tight">
                            Đi tới Thanh Toán
                        </Button>
                    </div>
                )
            } else if (type === 'BOOKING') {
                const formUrl = m.url || "https://tally.so/embed/w7vX8m"
                parts.push(
                    <div key={`widget-${m.index}-${idx}`} className="my-4">
                         <BookingWidget formUrl={formUrl} />
                    </div>
                )
            }
        }
        lastIndex = m.index + m.length
    })

    if (lastIndex < text.length) {
        parts.push(<p key={`text-final-${lastIndex}`} className="whitespace-pre-wrap">{text.substring(lastIndex)}</p>)
    }

    return <div>{parts.length > 0 ? parts : <p className="whitespace-pre-wrap">{text}</p>}</div>
}
