'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useSupabase } from './SupabaseProvider'

interface Clinic {
    id: string
    name: string
    description?: string
}

interface OrgContextType {
    orgId: string | null
    clinics: Clinic[]
    switchOrg: (id: string) => void
    loading: boolean
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: { children: ReactNode }) {
    const [orgId, setOrgId] = useState<string | null>(null)
    const [clinics, setClinics] = useState<Clinic[]>([
        { id: 'clinic-1', name: 'General Hospital', description: 'Main clinic' },
        { id: 'clinic-2', name: 'Pediatric Center', description: 'Children care' },
        { id: 'clinic-3', name: 'Dental Clinic', description: 'Dental services' },
    ])
    const [loading, setLoading] = useState(true)
    const { session, supabase } = useSupabase()

    // In a real app, fetch clinics from Supabase based on user's profile
    useEffect(() => {
        const fetchClinics = async () => {
            if (!session) {
                setLoading(false)
                return
            }
            // Example: fetch clinics from a 'clinics' table or user's profiles
            // const { data, error } = await supabase.from('clinics').select('*')
            // if (!error) setClinics(data)
            // For now, we'll use mock data
            setLoading(false)
        }
        fetchClinics()
    }, [session, supabase])

    const switchOrg = (id: string) => {
        setOrgId(id)
        // In a real app, you might update the user's profile or set a cookie
        console.log('Switched to clinic:', id)
    }

    return (
        <OrgContext.Provider value={{ orgId, clinics, switchOrg, loading }}>
            {children}
        </OrgContext.Provider>
    )
}

export const useOrg = () => {
    const context = useContext(OrgContext)
    if (context === undefined) {
        throw new Error('useOrg must be used within an OrgProvider')
    }
    return context
}