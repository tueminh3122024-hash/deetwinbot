'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ToolStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error'

export interface ClinicConfig {
    colors: {
        primary: string
        secondary: string
        accent: string
    }
    defaultGreeting: string
    clinicName: string
}

export interface AIState {
    // Token management
    tokensRemaining: number
    // Tool status
    activeTool: string | null
    toolStatus: ToolStatus
    // Voice status
    isSpeaking: boolean
    // Clinic-specific configuration
    clinicConfig: ClinicConfig | null
    availableClinics: Array<{ id: string, name: string }>
    currentClinicId: string | null
    // Methods
    setTokensRemaining: React.Dispatch<React.SetStateAction<number>>
    setActiveTool: (tool: string | null) => void
    setToolStatus: (status: ToolStatus) => void
    setClinicConfig: (config: ClinicConfig) => void
    setAvailableClinics: (clinics: Array<{ id: string, name: string }>) => void
    setCurrentClinicId: (id: string | null) => void
    playVoice: (text: string) => Promise<void>
}

const defaultClinicConfig: ClinicConfig = {
    colors: {
        primary: '#000000',
        secondary: '#1f2937',
        accent: '#3b82f6',
    },
    defaultGreeting: 'Welcome to DEETWIN Bot. How can I assist you today?',
    clinicName: 'Default Clinic',
}

const AIContext = createContext<AIState | undefined>(undefined)

export function AIProvider({ children }: { children: ReactNode }) {
    const [tokensRemaining, setTokensRemaining] = useState(999999) // Example initial tokens (disabled for testing)
    const [activeTool, setActiveTool] = useState<string | null>(null)
    const [toolStatus, setToolStatus] = useState<ToolStatus>('idle')
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(defaultClinicConfig)
    const [availableClinics, setAvailableClinics] = useState<Array<{ id: string, name: string }>>([])
    const [currentClinicId, setCurrentClinicId] = useState<string | null>(null)

    const playVoice = async (text: string) => {
        if (!text) return
        
        try {
            setIsSpeaking(true)
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })

            if (!response.ok) throw new Error('TTS request failed')

            const audioBlob = await response.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            
            audio.onended = () => {
                setIsSpeaking(false)
                URL.revokeObjectURL(audioUrl)
            }
            
            await audio.play()
        } catch (error) {
            console.error('Failed to play voice:', error)
            setIsSpeaking(false)
        }
    }

    const value: AIState = {
        tokensRemaining,
        activeTool,
        toolStatus,
        isSpeaking,
        clinicConfig,
        setTokensRemaining,
        setActiveTool,
        setToolStatus,
        setClinicConfig,
        availableClinics,
        currentClinicId,
        setAvailableClinics,
        setCurrentClinicId,
        playVoice,
    }

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAI() {
    const context = useContext(AIContext)
    if (context === undefined) {
        throw new Error('useAI must be used within an AIProvider')
    }
    return context
}