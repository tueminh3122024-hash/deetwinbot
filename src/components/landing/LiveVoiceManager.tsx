'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Loader2, Zap } from 'lucide-react'
import { useConversation } from '@elevenlabs/react'
import { getElevenLabsSignedUrl } from '@/lib/actions/elevenlabs'

interface LiveVoiceManagerProps {
  onStateChange?: (state: 'idle' | 'connecting' | 'active' | 'error') => void;
  onVolumeChange?: (volume: number) => void;
}

export default function LiveVoiceManager({ onStateChange, onVolumeChange }: LiveVoiceManagerProps) {
  const conversation = useConversation({
    onConnect: () => {
      console.log('[LiveVoice] Connected to ElevenLabs');
      onStateChange?.('active');
    },
    onDisconnect: () => {
      console.log('[LiveVoice] Disconnected from ElevenLabs');
      onStateChange?.('idle');
    },
    onError: (error) => {
      console.error('[LiveVoice] Error:', error);
      onStateChange?.('error');
    },
    onMessage: (message) => {
      // Optional: handle transcriptions or other messages
      // console.log('[LiveVoice] Message:', message);
    },
  });

  const { status, startSession, endSession } = conversation;

  // Track volume for the waveform
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (status === 'connected') {
      intervalId = setInterval(() => {
        // We can get the input volume (user) or output volume (AI)
        // For the landing page, output volume (AI speaking) usually looks cooler
        // but we'll try to combine them or just use output for "life"
        const volume = conversation.getOutputVolume();
        onVolumeChange?.(volume);
      }, 50);
    } else {
      onVolumeChange?.(0);
    }
    return () => clearInterval(intervalId);
  }, [status, conversation, onVolumeChange]);

  const handleToggleSession = async () => {
    if (status === 'connected') {
      await endSession();
    } else {
      try {
        onStateChange?.('connecting');
        console.log('[LiveVoice] Fetching signed URL...');
        
        // Fetch signed URL from server
        const signedUrl = await getElevenLabsSignedUrl();
        console.log('[LiveVoice] Signed URL fetched successfully');
        
        await startSession({
          signedUrl: signedUrl,
          // Force websocket as WebRTC seems to be failing in this environment
          connectionType: 'websocket', 
        });
        console.log('[LiveVoice] Session start called');
      } catch (err) {
        console.error("[LiveVoice] Failed to start session:", err);
        onStateChange?.('error');
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        {/* Decorative Outer Ring */}
        <div className={`absolute -inset-8 rounded-full border-2 border-dashed transition-all duration-1000 ${
          status === 'connected' ? 'border-[#39FF14]/50 animate-[spin_10s_linear_infinite] scale-110' : 'border-white/5 scale-100'
        }`} />

        {/* Main Orbit Button */}
        <button
          onClick={handleToggleSession}
          disabled={status === 'connecting'}
          className={`
            relative z-20 h-28 w-28 md:h-32 md:w-32 rounded-full flex items-center justify-center transition-all duration-500
            ${status === 'connected' 
              ? 'bg-[#39FF14] shadow-[0_0_60px_rgba(57,255,20,0.4)] scale-110' 
              : status === 'connecting'
              ? 'bg-sky-500 animate-pulse'
              : 'bg-white hover:bg-[#00D1FF] group shadow-[0_0_40px_rgba(255,255,255,0.1)]'
            }
          `}
        >
          {status === 'connected' ? (
            <MicOff className="text-black" size={32} />
          ) : status === 'connecting' ? (
            <Loader2 className="text-white animate-spin" size={32} />
          ) : (
            <Mic className="text-black group-hover:text-white transition-colors" size={32} />
          )}

          {/* Glowing Aura for Active State */}
          {status === 'connected' && (
            <div className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-20" />
          )}
        </button>

        {/* Floating Icons for Aesthetic */}
        {status === 'connected' && (
          <>
            <div className="absolute -top-4 -right-4 bg-black/80 p-2 rounded-lg border border-[#39FF14]/30 animate-bounce">
              <Zap size={16} className="text-[#39FF14]" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-black/80 p-2 rounded-lg border border-[#00D1FF]/30 animate-pulse">
              <Volume2 size={16} className="text-[#00D1FF]" />
            </div>
          </>
        )}
      </div>

      <div className="text-center space-y-2">
        <h3 className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${
          status === 'connected' ? 'text-[#39FF14]' : status === 'connecting' ? 'text-sky-400' : 'text-white'
        }`}>
          {status === 'connected' ? 'Đang lắng nghe...' : status === 'connecting' ? 'Đang kết nối AI...' : 'Bắt đầu trò chuyện'}
        </h3>
        <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
          {status === 'connected' 
            ? 'Trợ lý ảo DeeTwin đã sẵn sàng. Hãy bắt đầu nói!' 
            : status === 'connecting'
            ? 'Vui lòng đợi giây lát, hệ thống đang thiết lập đường truyền bảo mật...'
            : 'Trải nghiệm nói chuyện trực tiếp cùng DeeTwin Live 24/7.'}
        </p>
        {/* Error message if any */}
        {status === 'disconnected' && (
          <p className="text-xs text-red-500 mt-2 opacity-50">
            Nếu không kết nối được, hãy kiểm tra microphone và mạng của bạn.
          </p>
        )}
      </div>
    </div>
  )
}
