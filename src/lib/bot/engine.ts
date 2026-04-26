/**
 * DeeTwin Bot System - Advanced Clinical Engine
 * Framework: EIB (Effective Integrated Bandwidth) & MSI (Metabolic Stability Index)
 */

export interface AppleWatchData {
    hrv: number;        // SDNN or RMSSD
    restingHR: number;
    sleepScore: number; // 0-100 calculated from duration, deep sleep, regularity
    activityLoad: number; // 0-100 or z-score
}

export interface CGMData {
    glucose: number;
    mfv: number;        // Metabolic Fluctuation Velocity (mg/dL/min)
    mfvVar: number;     // MFV Variability in 1-3h window
    recoveryTime: number; // minutes back to baseline
}

export interface PersonalBaseline {
    hrv: { mean: number; sd: number };
    rhr: { mean: number; sd: number };
    mfv: { mean: number; sd: number };
    // Thêm các baseline khác nếu cần
}

export class DeeTwinEngine {
    /**
     * Helper: Tính Z-Score để chuẩn hóa dữ liệu theo cá nhân
     */
    static calculateZScore(value: number, mean: number, sd: number): number {
        if (sd === 0) return 0;
        return (value - mean) / sd;
    }

    /**
     * TẦNG A: Tính Base Capacity Score (Năng lực nền) từ Apple Watch
     * Công thức: 50 + 15*HRV_z + 15*Sleep_z - 10*RHR_z - 10*LoadPenalty_z
     */
    static calculateBaseCapacity(data: AppleWatchData, baseline: PersonalBaseline): number {
        const hrv_z = this.calculateZScore(data.hrv, baseline.hrv.mean, baseline.hrv.sd);
        const rhr_z = this.calculateZScore(data.restingHR, baseline.rhr.mean, baseline.rhr.sd);
        
        // Giả sử sleepScore và activityLoad đã được xử lý thành thang điểm hoặc z-score tương đương
        const sleep_z = (data.sleepScore - 70) / 15; // Ví dụ chuẩn hóa đơn giản nếu chưa có baseline sleep
        const load_z = (data.activityLoad > 80) ? (data.activityLoad - 80) / 10 : 0; // Penalty nếu quá tải

        let score = 50 + (15 * hrv_z) + (15 * sleep_z) - (10 * rhr_z) - (10 * load_z);
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * TẦNG B: Tính Metabolic Penalty (Tải chuyển hóa) từ Sinocare CGM
     * Công thức: 10*MFV_z + 10*Recovery_z + 5*MFVvar_z
     */
    static calculateMetabolicPenalty(data: CGMData, baseline: PersonalBaseline): number {
        const mfv_z = this.calculateZScore(data.mfv, baseline.mfv.mean, baseline.mfv.sd);
        
        // Các biến điều chỉnh dựa trên độ lệch thực tế (demo logic)
        const recovery_penalty = (data.recoveryTime > 120) ? (data.recoveryTime - 120) / 10 : 0;
        const mfv_var_z = data.mfvVar * 5;

        let penalty = (10 * mfv_z) + (10 * recovery_penalty) + (5 * mfv_var_z);
        
        return Math.max(0, penalty);
    }

    /**
     * TỔNG HỢP: Tính EIB (Effective Integrated Bandwidth)
     * EIB(t) = BaseCapacity(t) - MetabolicPenalty(t)
     */
    static calculateEIB(
        awData: AppleWatchData, 
        cgmData: CGMData, 
        baseline: PersonalBaseline
    ): number {
        const base = this.calculateBaseCapacity(awData, baseline);
        const penalty = this.calculateMetabolicPenalty(cgmData, baseline);
        
        return Math.max(0, Math.min(100, Math.round(base - penalty)));
    }

    /**
     * Diễn giải chỉ số EIB/MSI
     */
    static interpretEIB(score: number): { 
        status: string; 
        color: string; 
        description: string;
        action: string;
    } {
        if (score >= 80) return {
            status: 'Excellent (Tối ưu)',
            color: '#39FF14',
            description: 'Bandwidth rất tốt. Cơ thể đang ở trạng thái hồi phục và chịu tải đỉnh cao.',
            action: 'Có thể thực hiện các bữa ăn lớn hoặc tập luyện cường độ cao.'
        };
        if (score >= 60) return {
            status: 'Good (Khá ổn)',
            color: '#00D1FF',
            description: 'Cơ thể ổn định, khả năng điều tiết chuyển hóa tốt.',
            action: 'Duy trì lối sống hiện tại.'
        };
        if (score >= 40) return {
            status: 'Unstable (Dễ mất ổn định)',
            color: '#FFD700',
            description: 'Bandwidth trung bình. Hệ thống bắt đầu nhạy cảm với các đợt spike glucose.',
            action: 'Nên ăn chậm, chọn thực phẩm GI thấp và thư giãn nhẹ nhàng.'
        };
        if (score >= 20) return {
            status: 'Low (Thấp)',
            color: '#FF4500',
            description: 'Bandwidth thấp. Cơ thể đang mệt mỏi hoặc quá tải chuyển hóa.',
            action: 'Tránh các bữa ăn nhiều tinh bột/đường. Ưu tiên nghỉ ngơi.'
        };
        return {
            status: 'Fragile (Rất thấp)',
            color: '#FF0000',
            description: 'Hệ thống đang cực kỳ mong manh. Bất kỳ stress nhỏ nào cũng có thể gây bất ổn.',
            action: 'Cảnh báo! Cần hồi phục ngay lập tức và theo dõi sát sao chỉ số CGM.'
        };
    }

    /**
     * MSI (Metabolic Stability Index) 
     * Trong hệ thống DeeTwin, MSI có thể coi là giá trị trung bình động của EIB trong 24h
     */
    static calculateMSI(eibHistory: number[]): number {
        if (eibHistory.length === 0) return 0;
        const sum = eibHistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / eibHistory.length);
    }
}
