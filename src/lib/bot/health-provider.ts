/**
 * DeeTwin Bot System - Health Data Provider
 * Cầu nối lấy dữ liệu từ deetwinapp (Apple Watch, Health Connect, CGM)
 */

import { AppleWatchData, CGMData, PersonalBaseline } from './engine';
import { supabase } from '@/lib/supabase/client';

export class HealthProvider {
    /**
     * Lấy dữ liệu Apple Watch mới nhất của người dùng
     */
    static async getLatestAppleWatchData(userId: string): Promise<AppleWatchData | null> {
        // TODO: Thay 'user_health_metrics' bằng tên table thực tế của deetwinapp
        const { data, error } = await supabase
            .from('user_health_metrics') 
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;

        return {
            hrv: data.hrv || 50,
            restingHR: data.resting_hr || 70,
            sleepScore: data.sleep_score || 75,
            activityLoad: data.activity_load || 0
        };
    }

    /**
     * Lấy dữ liệu CGM từ Sinocare (thông qua deetwinapp)
     */
    static async getLatestCGMData(userId: string): Promise<CGMData | null> {
        // TODO: Thay 'cgm_readings' bằng tên table thực tế
        const { data, error } = await supabase
            .from('cgm_readings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;

        return {
            glucose: data.glucose_value,
            mfv: data.mfv || 0,
            mfvVar: data.mfv_var || 0,
            recoveryTime: data.recovery_time || 0
        };
    }

    /**
     * Lấy Baseline 30 ngày của người dùng để tính Z-Score
     */
    static async getPersonalBaseline(userId: string): Promise<PersonalBaseline> {
        // Trong thực tế, chúng ta sẽ tính AVG và STDDEV từ 30 ngày gần nhất
        // Tạm thời trả về giá trị mặc định nếu chưa có dữ liệu
        return {
            hrv: { mean: 55, sd: 12 },
            rhr: { mean: 68, sd: 5 },
            mfv: { mean: 1.2, sd: 0.4 }
        };
    }
}
