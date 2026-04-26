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
    needs_topup?: boolean    // Indicates if the clinic requested a top-up
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

export interface ChatSessionHistory {
    id: string
    clinic_name: string
    user_id: string
    message: string
    response: string
    tokens_used: number
    created_at: string
}

export interface KnowledgeItem {
    id: string
    source_name: string
    source_type: 'file' | 'web' | 'text'
    clinic_name?: string
    created_at: string
}