'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface VoiceMicProps {
    onTranscript: (text: string) => void
    disabled?: boolean
}

type RecordState = 'idle' | 'recording' | 'processing' | 'error'

// Animated sound wave bars
function SoundWave() {
    return (
        <div className="flex items-center gap-[2px] h-5">
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className="w-[3px] rounded-full bg-red-400"
                    style={{
                        animation: `soundWave 0.8s ease-in-out infinite`,
                        animationDelay: `${i * 0.12}s`,
                        height: '100%',
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes soundWave {
                    0%, 100% { transform: scaleY(0.2); }
                    50% { transform: scaleY(1); }
                }
            `}</style>
        </div>
    )
}

export default function VoiceMic({ onTranscript, disabled = false }: VoiceMicProps) {
    const [state, setState] = useState<RecordState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [permissionDenied, setPermissionDenied] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop())
        }
    }, [])

    const startRecording = async () => {
        setErrorMsg('')
        setPermissionDenied(false)

        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices?.getUserMedia) {
            setErrorMsg('Trình duyệt không hỗ trợ microphone.')
            setState('error')
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            })
            streamRef.current = stream

            // Pick best supported format
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
                .find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop())
                streamRef.current = null
                setState('processing')

                const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
                await sendAudioForTranscription(blob)
            }

            recorder.start(250)
            mediaRecorderRef.current = recorder
            setState('recording')
        } catch (err: any) {
            console.error('[VoiceMic] getUserMedia failed:', err)
            const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            if (isPermissionDenied) {
                setPermissionDenied(true)
                setErrorMsg('Quyền microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.')
            } else {
                setErrorMsg('Không thể truy cập microphone.')
            }
            setState('error')
        }
    }

    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
    }

    const sendAudioForTranscription = async (blob: Blob) => {
        try {
            const formData = new FormData()
            formData.append('audio', blob, 'recording.webm')

            const res = await fetch('/api/voice-to-text', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const data = await res.json()
            if (data.text) onTranscript(data.text)
            else if (data.error) throw new Error(data.error)
        } catch (err: any) {
            console.error('[VoiceMic] transcription error:', err)
            setErrorMsg('Nhận dạng thất bại. Thử lại nhé.')
            setState('error')
            return
        }
        setState('idle')
    }

    const handleToggle = () => {
        if (disabled) return
        if (state === 'idle' || state === 'error') startRecording()
        else if (state === 'recording') stopRecording()
    }

    const isRecording = state === 'recording'
    const isProcessing = state === 'processing'

    return (
        <div className="relative flex items-center">
            {/* Sound wave — shown next to button while recording */}
            {isRecording && (
                <div className="mr-2">
                    <SoundWave />
                </div>
            )}

            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled || isProcessing}
                aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                className={`
                    flex items-center justify-center h-10 w-10 rounded-full transition-all active:scale-90 select-none
                    ${isRecording
                        ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40'
                        : 'text-[#9ca3af] hover:text-white'}
                    ${disabled || isProcessing ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                {isProcessing
                    ? <Loader2 size={19} className="animate-spin text-[#1DA1F2]" />
                    : isRecording
                        ? <MicOff size={19} />
                        : <Mic size={19} />}
            </button>

            {/* Error tooltip */}
            {state === 'error' && errorMsg && (
                <div
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 text-red-200 text-[11px] rounded-xl px-3 py-2 shadow-xl border border-red-900/50 whitespace-nowrap"
                    role="alert"
                >
                    {errorMsg}
                    {permissionDenied && (
                        <p className="text-red-400 text-[10px] mt-1">
                            Cài đặt &rarr; Quyền trang web &rarr; Microphone
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
