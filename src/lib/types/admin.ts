export interface Clinic {
    id: string
    name: string
    token_balance: number
    total_leads: number
    revenue: number
    status: 'active' | 'inactive' | 'suspended'
    created_at?: string
}

export interface TokenTransaction {
    id: string
    clinic_id: string
    amount: number
    type: 'TOPUP' | 'CONSUMPTION'
    created_at: string
}

export interface Analytics {
    totalActiveClinics: number
    totalTokensSold: number
    projectedCommission: number
}