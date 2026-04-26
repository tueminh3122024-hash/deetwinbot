'use server'

import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Ensures an admin user has a corresponding profile record with 'admin' role.
 */
export async function ensureAdminProfile(userId: string) {
    try {
        const { data: existing } = await adminClient
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

        if (!existing) {
            const { error } = await adminClient
                .from('profiles')
                .insert({
                    id: userId,
                    role: 'admin',
                    created_at: new Date().toISOString()
                })
            if (error) throw error
        } else {
            // Force update role to admin if it's not (for safety during development)
            await adminClient
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', userId)
        }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Fetch all clinics for management
 */
export async function fetchClinics() {
    const { data, error } = await adminClient
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching clinics:', error)
        return []
    }
    
    // Add some mock analytics per clinic for the dashboard
    return (data || []).map(clinic => ({
        ...clinic,
        total_leads: 0,
        revenue: (clinic.token_balance || 0) * 0.1 // Just a dummy calculation
    }))
}

/**
 * Fetch global analytics
 */
export async function fetchAnalytics() {
    try {
        const { data: clinics } = await adminClient.from('clinics').select('token_balance')
        const totalActiveClinics = clinics?.length || 0
        const totalTokensSold = clinics?.reduce((acc, c) => acc + Number(c.token_balance || 0), 0) || 0

        return {
            totalActiveClinics,
            totalTokensSold,
            projectedCommission: totalTokensSold * 0.1
        }
    } catch (err) {
        return { totalActiveClinics: 0, totalTokensSold: 0, projectedCommission: 0 }
    }
}

/**
 * Top up tokens for a clinic
 */
export async function topUpTokens(clinicId: string, amount: number) {
    try {
        const { error } = await adminClient.rpc('increment_clinic_tokens', {
            p_clinic_id: clinicId,
            p_amount: amount
        })

        if (error) throw error
        revalidatePath('/admin')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Fetch a system setting by key
 */
export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const { data, error } = await adminClient
            .from('system_settings')
            .select('value')
            .eq('key', key)
            .maybeSingle()

        if (error || !data) return defaultValue
        return data.value as T
    } catch (err) {
        console.error(`[admin/action] Error getting setting ${key}:`, err)
        return defaultValue
    }
}

/**
 * Update a system setting
 */
export async function updateSystemSetting(key: string, value: any) {
    try {
        const { error } = await adminClient
            .from('system_settings')
            .upsert({ 
                key, 
                value, 
                updated_at: new Date().toISOString() 
            }, { onConflict: 'key' })

        if (error) throw error
        
        revalidatePath('/admin')
        return { success: true }
    } catch (err: any) {
        console.error(`[admin/action] Error updating setting ${key}:`, err)
        return { success: false, error: err.message }
    }
}

/**
 * Update clinic details (Email/Phone) - Admin only
 */
export async function updateClinicAdmin(clinicId: string, updates: any) {
    try {
        const { error } = await adminClient
            .from('clinics')
            .update(updates)
            .eq('id', clinicId)

        if (error) throw error
        revalidatePath('/admin')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Create a new clinic - Admin only
 */
export async function createClinic(data: {
    name: string
    email: string
    phone: string
    description?: string
    legal_info?: string
    address?: string
}) {
    try {
        const { error } = await adminClient
            .from('clinics')
            .insert({
                ...data,
                status: 'active',
                token_balance: 0,
                created_at: new Date().toISOString(),
                slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 5)
            })

        if (error) throw error
        revalidatePath('/admin')
        return { success: true }
    } catch (err: any) {
        console.error('[admin/action] Error creating clinic:', err)
        return { success: false, error: err.message }
    }
}

export async function requestTopUp(clinicId: string) {
    const { error } = await adminClient
        .from('clinics')
        .update({ needs_topup: true })
        .eq('id', clinicId)

    if (error) {
        console.error('Error requesting topup:', error)
        return { success: false, error: error.message }
    }
    return { success: true }
}

export async function deleteChatHistory(historyId: string) {
    const { error } = await adminClient.from('chat_history').delete().eq('id', historyId)
    if (error) {
        console.error('Error deleting chat history:', error)
        return { success: false, error: error.message }
    }
    return { success: true }
}
