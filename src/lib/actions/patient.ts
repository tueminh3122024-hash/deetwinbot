'use server'

import { adminClient } from '@/lib/supabase/admin'

export async function getClinicPatients(clinicId: string) {
    try {
        if (!clinicId) return { success: false, error: 'Thiếu Clinic ID' }

        // Fetch patient profiles + join with profiles manually since adminClient bypasses RLS
        // and we can handle the lack of FK by doing it in two steps if needed, 
        // but adminClient might actually allow the join if we define it right.
        
        // Let's do it in two steps to be safe and avoid relationship errors
        const { data: pProfiles, error: pError } = await adminClient
            .from('patient_profiles')
            .select('id, user_id, created_at, updated_at')
            .eq('clinic_id', clinicId)
            .order('updated_at', { ascending: false })

        if (pError) throw pError
        if (!pProfiles || pProfiles.length === 0) return { success: true, data: [] }

        const userIds = pProfiles.map(p => p.user_id)
        const { data: profiles, error: uError } = await adminClient
            .from('profiles')
            .select('id, full_name, email, phone')
            .in('id', userIds)

        if (uError) console.error('[patient/action] Profiles fetch error:', uError)

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
        
        const formatted = pProfiles.map(p => {
            const up = profileMap.get(p.user_id)
            return {
                id: p.id,
                full_name: up?.full_name || 'Bệnh nhân chưa đặt tên',
                email: up?.email,
                phone: up?.phone,
                created_at: p.created_at,
                user_id: p.user_id
            }
        })

        return { success: true, data: formatted }
    } catch (err: any) {
        console.error('[patient/action] getClinicPatients error:', err)
        return { success: false, error: err.message }
    }
}

export async function getPatientProfile(userId: string, clinicId: string) {
    try {
        if (!userId || !clinicId) return { success: false, error: 'Thiếu thông tin' }

        const [pRes, uRes] = await Promise.all([
            adminClient
                .from('patient_profiles')
                .select('*')
                .eq('user_id', userId)
                .eq('clinic_id', clinicId)
                .maybeSingle(),
            adminClient
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', userId)
                .maybeSingle()
        ])

        if (pRes.error) throw pRes.error
        
        let email = uRes.data?.email || ''
        let phone = uRes.data?.phone || ''
        let fullName = uRes.data?.full_name || ''

        // Fallback to Auth API if email is missing in profile
        if (!email) {
            const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
            if (authUser?.user) {
                email = authUser.user.email || ''
                phone = authUser.user.phone || phone
                if (!fullName) fullName = authUser.user.user_metadata?.full_name || ''
            }
        }
        
        return { 
            success: true, 
            data: pRes.data,
            fullName,
            patientEmail: email,
            patientPhone: phone
        }
    } catch (err: any) {
        console.error('[patient/action] getPatientProfile error:', err)
        return { success: false, error: err.message }
    }
}


export async function updatePatientBasicInfo(userId: string, data: { fullName?: string, email?: string, phone?: string, age?: number }) {
    try {
        if (!userId) return { success: false, error: 'Thiếu User ID' }

        const updateData: any = {}
        if (data.fullName !== undefined) updateData.full_name = data.fullName
        if (data.email !== undefined) updateData.email = data.email
        if (data.phone !== undefined) updateData.phone = data.phone
        if (data.age !== undefined) updateData.age = data.age

        const { data: result, error } = await adminClient
            .from('profiles')
            .upsert({ 
                id: userId, 
                ...updateData
            }, { onConflict: 'id' })
            .select()
            .single()

        if (error) throw error
        console.log('[patient/action] Patient info updated successfully:', result)
        return { success: true }
    } catch (err: any) {
        console.error('[patient/action] updatePatientBasicInfo error:', err)
        return { success: false, error: err.message }
    }
}

export async function updatePatientProfileData(userId: string, clinicId: string, dataCards: any[]) {
    try {
        const { error } = await adminClient
            .from('patient_profiles')
            .upsert({
                user_id: userId,
                clinic_id: clinicId,
                data_cards: dataCards,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,clinic_id' })

        if (error) throw error
        return { success: true }
    } catch (err: any) {
        console.error('[patient/action] updatePatientProfileData error:', err)
        return { success: false, error: err.message }
    }
}


