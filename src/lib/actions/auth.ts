'use server'

import { adminClient } from '@/lib/supabase/admin'

const VIETNAMESE_PHONE_REGEX = /(84|0[3|5|7|8|9])+([0-9]{8})\b/

export interface RegisterClinicData {
    email: string
    password: string
    clinic_name: string
    phone: string
    doctor_name?: string
    specialty?: string
    address?: string
}

export async function registerClinic(data: RegisterClinicData) {
    try {
        // 1. Validate required fields
        if (!data.email || !data.password || !data.clinic_name || !data.phone) {
            return { success: false, error: 'Vui lòng điền đầy đủ các trường bắt buộc' }
        }

        // 2. Validate Vietnamese phone format
        if (!VIETNAMESE_PHONE_REGEX.test(data.phone)) {
            return { success: false, error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (VD: 0912345678)' }
        }

        // 3. Create auth user via Supabase Admin
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                clinic_name: data.clinic_name,
            },
        })

        if (authError) {
            console.error('Error creating auth user:', authError)
            if (authError.message.includes('already registered')) {
                return { success: false, error: 'Email này đã được đăng ký' }
            }
            return { success: false, error: authError.message }
        }

        if (!authUser.user) {
            return { success: false, error: 'Không thể tạo tài khoản người dùng' }
        }

        // 4. Create clinic record in clinics table (using admin client to bypass RLS)
        const { error: clinicError } = await adminClient
            .from('clinics')
            .insert({
                name: data.clinic_name,
                phone: data.phone,
                status: 'active',
                token_balance: 0,
                doctor_name: data.doctor_name || null,
                specialty: data.specialty || null,
                address: data.address || null,
            })

        if (clinicError) {
            console.error('Error creating clinic record:', clinicError)
            // Rollback: delete the auth user if clinic insert fails
            await adminClient.auth.admin.deleteUser(authUser.user.id)
            if (clinicError.message.includes('phone')) {
                return { success: false, error: 'Số điện thoại này đã được sử dụng' }
            }
            return { success: false, error: clinicError.message }
        }

        return { success: true }
    } catch (err) {
        console.error('Unexpected error in registerClinic:', err)
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.' }
    }
}

export async function checkClinicPhone(phone: string) {
    try {
        const { data, error } = await adminClient
            .from('clinics')
            .select('id')
            .eq('phone', phone)
            .maybeSingle()

        if (error) {
            console.error('Error checking clinic phone:', error)
            return { available: false }
        }

        return { available: !data }
    } catch (err) {
        console.error('Unexpected error in checkClinicPhone:', err)
        return { available: false }
    }
}
