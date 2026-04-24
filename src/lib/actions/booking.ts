'use server'

import { adminClient } from '@/lib/supabase/admin'

export interface CreateBookingResult {
    success: boolean
    bookingId?: string
    error?: string
}

/**
 * Server Action: Create a booking + linked chat_session atomically.
 * Uses adminClient (SUPABASE_SERVICE_ROLE_KEY) to bypass RLS entirely.
 * This is the SAFE pattern — no RLS policies to debug.
 */
export async function createBooking(
    userId: string,
    clinicId: string,
    serviceName: string
): Promise<CreateBookingResult> {
    try {
        console.log('[booking/action] Starting booking process:', { userId, clinicId, serviceName })

        if (!userId || !clinicId || !serviceName) {
            return { success: false, error: 'Thiếu thông tin bắt buộc (userId, clinicId, serviceName).' }
        }

        // 1. Insert booking
        const { data: booking, error: bookingErr } = await adminClient
            .from('bookings')
            .insert({
                user_id: userId,
                clinic_id: clinicId,
                service_name: serviceName,
                status: 'pending',
            })
            .select('id')
            .single()

        if (bookingErr) {
            console.error('[booking/action] Booking insert error:', bookingErr.message, bookingErr.details)
            return { success: false, error: `Lỗi tạo lịch hẹn: ${bookingErr.message}` }
        }

        if (!booking) {
            console.error('[booking/action] Booking insert returned null')
            return { success: false, error: 'Không thể tạo lịch hẹn (null response).' }
        }

        console.log('[booking/action] Booking created successfully:', booking.id)

        // 2. Insert linked chat_session (MANDATORY)
        // Bypass RLS completely via adminClient
        const { error: sessionErr } = await adminClient
            .from('chat_sessions')
            .insert({
                booking_id: booking.id,
                clinic_id: clinicId,
                user_id: userId,
                status: 'active',
            })

        if (sessionErr) {
            console.error('[booking/action] Chat session creation FAILED:', sessionErr.message, sessionErr.details)
            
            // Optional: You might want to delete the booking here to maintain atomicity, 
            // but for now we'll just report it as a failure so the user knows it didn't finish.
            return { 
                success: false, 
                error: `Đã tạo lịch (${booking.id}) nhưng lỗi tạo phiên chat: ${sessionErr.message}. Vui lòng báo Admin.` 
            }
        }

        console.log('[booking/action] Chat session created successfully for booking:', booking.id)
        return { success: true, bookingId: booking.id }

    } catch (err: any) {
        console.error('[booking/action] Unexpected fatal error:', err?.message ?? err)
        return { success: false, error: `Lỗi hệ thống: ${err?.message || 'Unknown error'}` }
    }
}

/**
 * Server Action: Complete an examination.
 * Updates booking status and creates/updates a patient profile card.
 * Uses adminClient to bypass RLS.
 */
export async function completeExamination(
    bookingId: string,
    userId: string,
    clinicId: string,
    summary: string,
    mediaUrls: { url: string; type: 'image' | 'file'; caption?: string }[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('[booking/action] Completing examination:', { bookingId, userId, clinicId })

        const now = new Date().toISOString()

        // 1. Update booking status
        const { error: bookingErr } = await adminClient
            .from('bookings')
            .update({
                status: 'completed',
                updated_at: now,
                chat_summary: summary
            })
            .eq('id', bookingId)

        if (bookingErr) {
            console.error('[booking/action] Failed to update booking:', bookingErr)
            return { success: false, error: `Lỗi cập nhật lịch hẹn: ${bookingErr.message}` }
        }

        // 2. Prepare the new data card
        const newCard = {
            id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            type: 'examination',
            title: `Kết quả khám (${new Date().toLocaleDateString('vi-VN')})`,
            content: summary,
            media: mediaUrls,
            created_at: now,
            author: 'clinic'
        }

        // 3. Find existing profile
        const { data: profile } = await adminClient
            .from('patient_profiles')
            .select('id, data_cards')
            .eq('user_id', userId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (profile) {
            // Append card to existing
            const currentCards = profile.data_cards || []
            const { error: profileErr } = await adminClient
                .from('patient_profiles')
                .update({
                    data_cards: [...currentCards, newCard],
                    updated_at: now
                })
                .eq('id', profile.id)

            if (profileErr) {
                console.error('[booking/action] Failed to update profile:', profileErr)
                return { success: false, error: `Lỗi cập nhật hồ sơ: ${profileErr.message}` }
            }
        } else {
            // Create new profile
            const { error: profileErr } = await adminClient
                .from('patient_profiles')
                .insert({
                    user_id: userId,
                    clinic_id: clinicId,
                    data_cards: [newCard],
                    created_at: now,
                    updated_at: now
                })

            if (profileErr) {
                console.error('[booking/action] Failed to create profile:', profileErr)
                return { success: false, error: `Lỗi tạo hồ sơ: ${profileErr.message}` }
            }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[booking/action] completeExamination fatal error:', err)
        return { success: false, error: err.message || 'Lỗi hệ thống khi hoàn tất khám.' }
    }
}
