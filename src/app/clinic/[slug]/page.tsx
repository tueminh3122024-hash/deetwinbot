import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LandingClient from '@/components/landing/LandingClient'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function ClinicLandingPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    // 1. Fetch Clinic by Slug
    const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .select('*')
        .eq('slug', slug)
        .single()

    if (clinicErr || !clinic) {
        console.error('[ClinicPage] Clinic not found:', slug, clinicErr)
        // Fallback: try fetching by ID if slug is a UUID (useful for testing)
        if (slug.length === 36) {
             const { data: clinicById } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', slug)
                .single()
            if (clinicById) return <ClinicLandingPageContent clinic={clinicById} supabase={supabase} />
        }
        return notFound()
    }

    return <ClinicLandingPageContent clinic={clinic} supabase={supabase} />
}

async function ClinicLandingPageContent({ clinic, supabase }: { clinic: any, supabase: any }) {
    // 2. Fetch Services for this clinic
    const { data: services } = await supabase
        .from('clinic_services')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('name')

    // 3. Get current user if any
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <LandingClient 
            clinic={clinic} 
            services={services || []} 
            userId={user?.id}
        />
    )
}
