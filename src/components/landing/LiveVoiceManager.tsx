'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Loader2, Zap } from 'lucide-react'

interface LiveVoiceManagerProps {
  apiKey: string;
  onStateChange?: (state: 'idle' | 'connecting' | 'active' | 'error') => void;
  onVolumeChange?: (volume: number) => void;
}

export default function LiveVoiceManager({ apiKey, onStateChange, onVolumeChange }: LiveVoiceManagerProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // 1. Initialize Audio Context
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })
    }
  }

  // 2. Connect to Gemini Multimodal Live WebSocket
  const startLiveMode = async () => {
    if (status !== 'idle') return
    
    setStatus('connecting')
    onStateChange?.('connecting')

    try {
      await initAudio()
      
      // Request Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Detect if it's an API Key or Access Token
      const authParam = apiKey.startsWith('AQ.') ? `access_token=${apiKey}` : `key=${apiKey}`
      
      // Connect WebSocket (Gemini Multimodal Live endpoint - v1alpha is standard for Live)
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BiDiGenerateContent?${authParam}`
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        console.log('[LiveVoice] Connected to Gemini (Live API)')
        setStatus('active')
        onStateChange?.('active')

        // Send setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-3-flash-preview", 
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
              }
            }
          }
        }
        socket.send(JSON.stringify(setupMessage))
        
        // Start capturing audio
        captureAudio()
      }

      socket.onmessage = async (event) => {
        const response = JSON.parse(event.data)
        if (response.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          const base64Audio = response.serverContent.modelTurn.parts[0].inlineData.data
          playAudioResponse(base64Audio)
        }
      }

      socket.onerror = (err: any) => {
        console.error('[LiveVoice] WebSocket Error Details:', {
            message: err.message,
            readyState: socket.readyState,
            url: socket.url
        })
        setStatus('error')
        onStateChange?.('error')
      }

      socket.onclose = () => {
        console.log('[LiveVoice] Connection closed')
        if (status !== 'error') stopLiveMode('idle')
      }

    } catch (err) {
      console.error('[LiveVoice] Init failed:', err)
      stopLiveMode('error')
    }
  }

  // 3. Capture & Stream Audio to Gemini
  const captureAudio = () => {
    if (!audioContextRef.current || !streamRef.current) return

    const context = audioContextRef.current
    sourceRef.current = context.createMediaStreamSource(streamRef.current)
    
    // Legacy ScriptProcessor for simplicity in this demo, 
    // real apps should use AudioWorklet
    processorRef.current = context.createScriptProcessor(4096, 1, 1)

    processorRef.current.onaudioprocess = (e) => {
      if (isMuted || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

      const inputData = e.inputBuffer.getChannelData(0)
      
      // Convert Float32 to Int16 for Gemini
      const pcmData = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
      }

      // Detect volume for UI animation
      const volume = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length
      onVolumeChange?.(volume)

      // Send via WebSocket
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
      socketRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{
            data: base64Data,
            mime_type: "audio/pcm;rate=16000"
          }]
        }
      }))
    }

    sourceRef.current.connect(processorRef.current)
    processorRef.current.connect(context.destination)
  }

  // 4. Play Audio from AI
  const playAudioResponse = async (base64Audio: string) => {
    if (!audioContextRef.current) return
    const context = audioContextRef.current
    
    // Decode base64 to array buffer
    const binary = atob(base64Audio)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    
    try {
      // Gemini returns PCM 16kHz usually
      // We need to convert it or use a proper buffer
      const audioBuffer = await context.decodeAudioData(bytes.buffer)
      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      source.start()
    } catch (e) {
        // Fallback or error handling
    }
  }

  const stopLiveMode = (finalStatus: 'idle' | 'error' = 'idle') => {
    socketRef.current?.close()
    socketRef.current = null
    
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach(t => t.stop())
    
    setStatus(finalStatus)
    onStateChange?.(finalStatus)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Main Orbit Button */}
        <button
          onClick={status === 'active' ? () => stopLiveMode() : startLiveMode}
          className={`
            relative z-20 h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500
            ${status === 'active' 
              ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110' 
              : status === 'connecting'
              ? 'bg-sky-500 animate-pulse'
              : 'bg-white hover:bg-sky-400 group shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            }
          `}
        >
          {status === 'active' ? (
            <MicOff className="text-white" size={32} />
          ) : status === 'connecting' ? (
            <Loader2 className="text-white animate-spin" size={32} />
          ) : (
            <Mic className="text-black group-hover:text-white transition-colors" size={32} />
          )}
        </button>

        {/* Pulse Effects */}
        {status === 'active' && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping z-10" />
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse z-0 scale-150" />
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-white font-bold text-lg mb-1">
          {status === 'active' ? 'Đang lắng nghe...' : status === 'connecting' ? 'Đang kết nối...' : 'Bắt đầu cuộc gọi'}
        </p>
        <p className="text-gray-500 text-sm">
          {status === 'active' ? 'Hãy nói "Chào DeeTwin" để bắt đầu' : 'AI Gemini 2.0 Flash Multimodal Live'}
        </p>
      </div>
    </div>
  )
}
