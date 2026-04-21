'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

type SupabaseContext = {
    supabase: SupabaseClient
    session: Session | null
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [session, setSession] = useState<Session | null>(null)
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)
            if (event === 'SIGNED_IN') {
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return (
        <Context.Provider value={{ supabase, session }}>
            {children}
        </Context.Provider>
    )
}

export const useSupabase = () => {
    const context = useContext(Context)
    if (context === undefined) {
        throw new Error('useSupabase must be used inside SupabaseProvider')
    }
    return context
}