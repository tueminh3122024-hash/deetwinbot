export interface Clinic {
    id: string
    name: string
    token_balance: number
    total_leads: number
    revenue: number
    status: 'active' | 'inactive' | 'suspended'
    phone?: string          // Unique Vietnamese phone number
    email?: string          // Identifying email
    description?: string
    address?: string
    legal_info?: string
    slug?: string           // URL friendly name
    system_prompt_2?: string // Optional second custom AI system prompt
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