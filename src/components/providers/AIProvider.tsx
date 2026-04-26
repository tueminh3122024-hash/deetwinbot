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
    refreshTokens: (overrideClinicId?: string) => void
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

    // Fetch clinics list from Supabase based on logged-in user
    useEffect(() => {
        const loadClinics = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            
            if (!user) {
                setAvailableClinics([])
                setCurrentClinicId(null)
                return
            }

            // Check role from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const role = profile?.role || 'user'
            setUserRole(role)

            if (role === 'user') {
                // Normal users don't manage clinics in dashboard
                setAvailableClinics([])
                setCurrentClinicId(null)
                return
            }

            let query = supabase
                .from('clinics')
                .select('id, name')
                .eq('status', 'active')
                .order('name')
            
            // If clinic, they only see their own clinic (clinic.id === user.id OR clinic.email === user.email)
            if (role === 'clinic') {
                if (user.email) {
                    query = query.or(`id.eq.${user.id},email.eq.${user.email}`)
                } else {
                    query = query.eq('id', user.id)
                }
            }
            // If admin, they see all active clinics

            const { data, error } = await query

            if (!error && data && data.length > 0) {
                setAvailableClinics(data)
                if (!currentClinicId || !data.find(c => c.id === currentClinicId)) {
                    setCurrentClinicId(data[0].id)
                }
            } else {
                setAvailableClinics([])
                setCurrentClinicId(null)
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

        // Use a unique channel name each time to avoid "after subscribe" errors in React
        const channelId = `tokens-${currentClinicId}-${Math.random().toString(36).substring(7)}`
        const channel = supabase.channel(channelId)
        
        channel.on(
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
        ).subscribe()

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
        refreshTokens: (overrideClinicId?: string) => {
            const idToFetch = overrideClinicId || currentClinicId;
            if (idToFetch) fetchTokenBalance(idToFetch);
        }
    }

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAI() {
    const ctx = useContext(AIContext)
    if (!ctx) throw new Error('useAI must be used within <AIProvider>')
    return ctx
}