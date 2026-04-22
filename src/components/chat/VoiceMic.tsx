'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

interface VoiceMicProps {
    /** Called with the transcribed text once done */
    onTranscript: (text: string) => void
    disabled?: boolean
}

type RecordState = 'idle' | 'recording' | 'processing' | 'error'

export default function VoiceMic({ onTranscript, disabled = false }: VoiceMicProps) {
    const [state, setState] = useState<RecordState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop())
        }
    }, [])

    const startRecording = async () => {
        setErrorMsg('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'

            const recorder = new MediaRecorder(stream, { mimeType })
            chunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                setState('processing')

                const blob = new Blob(chunksRef.current, { type: mimeType })
                await sendAudioForTranscription(blob)
            }

            recorder.start(200) // collect chunks every 200ms
            mediaRecorderRef.current = recorder
            setState('recording')
        } catch (err: any) {
            console.error('Mic access failed:', err)
            setErrorMsg('Không thể truy cập microphone.')
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

            if (!res.ok) throw new Error('Transcription API failed')

            const { text } = await res.json()
            if (text) onTranscript(text)
        } catch (err) {
            console.error('Transcription error:', err)
            setErrorMsg('Nhận dạng giọng nói thất bại.')
            setState('error')
            return
        }
        setState('idle')
    }

    const handleToggle = () => {
        if (disabled) return
        if (state === 'idle' || state === 'error') {
            startRecording()
        } else if (state === 'recording') {
            stopRecording()
        }
    }

    const isRecording = state === 'recording'
    const isProcessing = state === 'processing'

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled || isProcessing}
                aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                className={`
                    flex items-center justify-center h-10 w-10 rounded-full transition-all active:scale-90
                    ${isRecording
                        ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50 animate-pulse'
                        : 'text-[#9ca3af] hover:text-white'}
                    ${disabled || isProcessing ? 'opacity-40 cursor-not-allowed' : ''}
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
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-900/80 text-red-200 text-[11px] rounded-lg px-3 py-1.5 shadow-lg">
                    {errorMsg}
                </div>
            )}
        </div>
    )
}
