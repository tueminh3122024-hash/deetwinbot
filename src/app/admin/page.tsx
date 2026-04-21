'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AdminDashboard from './AdminDashboard'
import { Clinic, Analytics } from '@/lib/types/admin'
import { ensureAdminProfile, fetchClinics, fetchAnalytics } from '@/lib/actions/admin'

export default function AdminPage() {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [clinics, setClinics] = useState<Clinic[]>([])
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [roleError, setRoleError] = useState<string | null>(null)
    const [creatingProfile, setCreatingProfile] = useState(false)
    const [createProfileError, setCreateProfileError] = useState<string | null>(null)

    const handleCreateProfile = async () => {
        if (!session) return
        setCreatingProfile(true)
        setCreateProfileError(null)
        try {
            const result = await ensureAdminProfile(session.user.id)
            if (result.success) {
                // Refetch profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                if (profileError) {
                    setCreateProfileError('Profile created but could not fetch')
                } else {
                    setProfile(profile)
                    setRoleError(null)
                    // Now fetch data
                    const clinics = await fetchClinics()
                    const analytics = await fetchAnalytics()
                    setClinics(clinics)
                    setAnalytics(analytics)
                }
            } else {
                setCreateProfileError(result.error || 'Failed to create profile')
            }
        } catch (err) {
            setCreateProfileError('Unexpected error')
            console.error(err)
        } finally {
            setCreatingProfile(false)
        }
    }

    useEffect(() => {
        const init = async () => {
            // Check session
            const { data: { session }, error } = await supabase.auth.getSession()
            console.log('Admin page session:', session, 'error:', error)
            if (!session) {
                console.log('No session, redirecting')
                router.push('/')
                return
            }
            setSession(session)

            // Fetch user profile to check role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()

            console.log('Profile:', profile, 'profileError:', profileError)

            if (profileError) {
                console.error('Error fetching profile:', profileError)
                setRoleError('Could not load user profile. Please ensure you have a profile record.')
            } else if (!profile || profile.role !== 'admin') {
                console.log('User role is not admin:', profile?.role)
                setRoleError('You do not have admin privileges. Only users with role "admin" can access this page.')
            } else {
                setProfile(profile)
                // Fetch data
                try {
                    const clinics = await fetchClinics()
                    const analytics = await fetchAnalytics()
                    setClinics(clinics)
                    setAnalytics(analytics)
                } catch (err) {
                    console.error('Error fetching admin data:', err)
                    setRoleError('Failed to fetch admin data')
                }
            }
            setLoading(false)
        }
        init()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-xl">Loading admin dashboard...</div>
            </div>
        )
    }

    if (roleError) {
        const isMissingProfile = roleError.includes('Could not load user profile')
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="max-w-md p-8 bg-gray-900 border border-gray-800 rounded-2xl">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
                    <p className="text-gray-300">{roleError}</p>

                    {createProfileError && (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                            {createProfileError}
                        </div>
                    )}

                    {isMissingProfile && session && (
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleCreateProfile}
                                disabled={creatingProfile}
                                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 rounded-lg font-medium"
                            >
                                {creatingProfile ? 'Creating...' : 'Create Admin Profile for This User'}
                            </button>
                            <p className="text-sm text-gray-400 text-center">
                                This will create a profile record with admin role.
                            </p>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
                        >
                            Go to Home
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2 bg-gray-900 hover:bg-gray-800 rounded-lg"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return <AdminDashboard clinics={clinics} analytics={analytics || { totalActiveClinics: 0, totalTokensSold: 0, projectedCommission: 0 }} />
}