
'use server'

import { createClient } from '@/lib/supabase/server'
import { Clinic, Analytics } from '@/lib/types/admin'
import { revalidatePath } from 'next/cache'

export async function fetchClinics(): Promise<Clinic[]> {
    const supabase = await createClient()

    // Fetch clinics with token balance and lead count
    const { data: clinics, error } = await supabase
        .from('clinics')
        .select('id, name, token_balance, status')
        .order('id', { ascending: false })

    if (error) {
        console.error('Error fetching clinics:', error)
        return []
    }

    // For each clinic, fetch total leads
    const clinicsWithLeads = await Promise.all(
        clinics.map(async (clinic) => {
            let leadsCount = 0
            try {
                const { count, error } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('clinic_id', clinic.id)
                if (!error) leadsCount = count || 0
            } catch (err) {
                console.error('Error fetching leads for clinic', clinic.id, err)
            }
            return {
                ...clinic,
                total_leads: leadsCount,
                revenue: leadsCount * 0.1, // 10% commission from leads count (e.g. 10 leads = 1.0 revenue)
            } as Clinic
        })
    )

    return clinicsWithLeads
}

export async function fetchAnalytics(): Promise<Analytics> {
    const supabase = await createClient()

    // Total active clinics
    const { count: activeClinicsCount } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

    // Total tokens sold (sum of token_balance across all clinics)
    const { data: clinics } = await supabase
        .from('clinics')
        .select('token_balance')

    const totalTokensSold = clinics?.reduce((sum, clinic) => sum + (clinic.token_balance || 0), 0) || 0

    // Projected commission (10% of total tokens sold)
    const projectedCommission = totalTokensSold * 0.1

    return {
        totalActiveClinics: activeClinicsCount || 0,
        totalTokensSold,
        projectedCommission,
    }
}

export async function topUpTokens(clinicId: string, amount: number) {
    const supabase = await createClient()

    // 1. Check if Organization/Clinic exists before transaction
    const { data: clinic, error: clinicCheckError } = await supabase
        .from('clinics')
        .select('id')
        .eq('id', clinicId)
        .single()

    if (clinicCheckError || !clinic) {
        console.error('Organization check failed:', clinicCheckError)
        return { success: false, error: 'Phòng mạch không tồn tại (Organization check failed)' }
    }

    // 2. Insert a TOPUP record
    const { data, error } = await supabase
        .from('token_transactions')
        .insert({
            clinic_id: clinicId,
            amount,
            type: 'TOPUP',
        })

    if (error) {
        console.error('Lỗi thực sự đây nè bro:', error.message)
        return { success: false, error: error.message }
    }

    // Update clinic's token balance
    console.log('Final clinic_id used:', clinicId)
    const { data: clinicData, error: fetchError } = await supabase
        .from('clinics')
        .select('token_balance')
        .eq('id', clinicId)
        .single()

    if (fetchError || !clinicData) {
        console.error('Error fetching clinic for token update:', fetchError)
        return { success: false, error: fetchError?.message || 'Clinic not found' }
    }

    const newTokenBalance = clinicData.token_balance + amount

    // 3. Update clinic's token balance
    const { error: updateError } = await supabase
        .from('clinics')
        .update({ token_balance: newTokenBalance })
        .eq('id', clinicId)

    if (updateError) {
        console.error('Error updating clinic balance:', updateError)
    }

    // 4. Update subscriptions table (Stage 3 requirement)
    // We'll upsert to ensure the record exists for this clinic
    const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
            clinic_id: clinicId,
            token_balance: newTokenBalance,
            last_topup_at: new Date().toISOString()
        }, { onConflict: 'clinic_id' })

    if (subError) {
        console.error('Error updating subscriptions:', subError)
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function ensureAdminProfile(userId: string) {
    const supabase = await createClient()
    // Check if profile exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()
    if (existing) {
        return { success: true, message: 'Profile already exists' }
    }
    // Insert profile with admin role
    const { error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            role: 'admin',
        })
    if (error) {
        console.error('Error creating admin profile:', error)
        return { success: false, error: error.message }
    }
    return { success: true, message: 'Admin profile created' }
}
