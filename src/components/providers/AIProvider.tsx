'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export type ToolStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error'
export type UserRole = 'clinic' | 'user' | null

export interface AIState {
    // Token management
    tokensRemaining: number
    setTokensRemaining: React.Dispatch<React.SetStateAction<number>>
    // Tool status
    activeTool: string | null
    toolStatus: ToolStatus
    setActiveTool: (tool: string | null) => void
    setToolStatus: (status: ToolStatus) => void
    // Voice
    isSpeaking: boolean
    playVoice: (text: string) => Promise<void>
    // Role
    userRole: UserRole
    setUserRole: (role: UserRole) => void
    // Clinic
    availableClinics: Array<{ id: string; name: string }>
    currentClinicId: string | null
    setAvailableClinics: (clinics: Array<{ id: string; name: string }>) => void
    setCurrentClinicId: (id: string | null) => void
    refreshTokens: () => void
}

const AIContext = createContext<AIState | undefined>(undefined)

export function AIProvider({ children }: { children: ReactNode }) {
    const [tokensRemaining, setTokensRemaining] = useState(0)
    const [activeTool, setActiveTool] = useState<string | null>(null)
    const [toolStatus, setToolStatus] = useState<ToolStatus>('idle')
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [userRole, setUserRole] = useState<UserRole>(null)
    const [availableClinics, setAvailableClinics] = useState<Array<{ id: string; name: string }>>([])
    const [currentClinicId, setCurrentClinicId] = useState<string | null>(null)

    // ── Real token fetch ──
    const fetchTokenBalance = useCallback(async (clinicId: string) => {
        const { data, error } = await supabase
            .from('clinics')
            .select('token_balance')
            .eq('id', clinicId)
            .single()

        if (!error && data) {
            setTokensRemaining(data.token_balance ?? 0)
        }
    }, [])

    // Fetch clinics list from Supabase
    useEffect(() => {
        const loadClinics = async () => {
            const { data, error } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('status', 'active')
                .order('name')

            if (!error && data) {
                setAvailableClinics(data)
                if (data.length > 0 && !currentClinicId) {
                    setCurrentClinicId(data[0].id)
                }
            }
        }
        loadClinics()
    }, [])

    // Fetch token balance when clinic changes
    useEffect(() => {
        if (!currentClinicId) return
        fetchTokenBalance(currentClinicId)
    }, [currentClinicId, fetchTokenBalance])

    // Supabase Realtime — listen to token_balance changes for current clinic
    useEffect(() => {
        if (!currentClinicId) return

        const channel = supabase
            .channel(`clinic-tokens-${currentClinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${currentClinicId}`,
                },
                (payload) => {
                    const newBalance = payload.new?.token_balance
                    if (typeof newBalance === 'number') {
                        setTokensRemaining(newBalance)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentClinicId])

    // ── TTS Voice ──
    const playVoice = async (text: string) => {
        if (!text) return
        try {
            setIsSpeaking(true)
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })
            if (!res.ok) throw new Error('TTS failed')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
            await audio.play()
        } catch (err) {
            console.error('[AIProvider] playVoice error:', err)
            setIsSpeaking(false)
        }
    }

    const value: AIState = {
        tokensRemaining,
        setTokensRemaining,
        activeTool,
        toolStatus,
        setActiveTool,
        setToolStatus,
        isSpeaking,
        playVoice,
        userRole,
        setUserRole,
        availableClinics,
        currentClinicId,
        setAvailableClinics,
        setCurrentClinicId,
        refreshTokens: () => {
            if (currentClinicId) fetchTokenBalance(currentClinicId)
        }
    }

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAI() {
    const ctx = useContext(AIContext)
    if (!ctx) throw new Error('useAI must be used within <AIProvider>')
    return ctx
}