'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface MedicalLeadFormProps {
    clinicId: string
    defaultName?: string
    patientName?: string
    preferredDate?: string
    symptoms?: string
}

export default function MedicalLeadForm({
    clinicId,
    defaultName,
    patientName: initialPatientName = '',
    preferredDate: initialPreferredDate = '',
    symptoms: initialSymptoms = '',
}: MedicalLeadFormProps) {
    // Use defaultName if provided, otherwise fallback to patientName
    const effectivePatientName = defaultName || initialPatientName;
    const [patientName, setPatientName] = useState(effectivePatientName)
    const [preferredDate, setPreferredDate] = useState(initialPreferredDate)
    const [symptoms, setSymptoms] = useState(initialSymptoms)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async () => {
        if (!patientName.trim()) {
            setMessage('Vui lòng nhập họ tên bệnh nhân.')
            return
        }

        setLoading(true)
        setMessage('')
        try {
            const { error } = await supabase.from('clinic_leads').insert({
                clinic_id: clinicId,
                patient_name: patientName,
                preferred_date: preferredDate || null,
                symptoms: symptoms || null,
                created_at: new Date().toISOString(),
            })

            if (error) throw error

            setMessage('Gửi đăng ký thành công!')
            // Reset form
            setPatientName('')
            setPreferredDate('')
            setSymptoms('')
        } catch (error) {
            console.error('Error saving lead:', error)
            setMessage('Không thể gửi đăng ký. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-gray-800 bg-black">
            <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Đăng ký Khám bệnh</h3>
                <p className="mb-6 text-xs text-gray-500">
                    Mã Phòng khám: <code className="rounded bg-[#1DA1F2]/20 text-[#1DA1F2] px-2 py-1 ml-1">{clinicId}</code>
                </p>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="patientName" className="text-gray-300 text-sm">
                            Họ tên bệnh nhân *
                        </Label>
                        <Input
                            id="patientName"
                            placeholder="Nhập họ tên"
                            value={patientName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientName(e.target.value)}
                            className="mt-1.5 border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="preferredDate" className="text-gray-300 text-sm">
                            Ngày hẹn mong muốn (Tùy chọn)
                        </Label>
                        <Input
                            id="preferredDate"
                            type="date"
                            value={preferredDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreferredDate(e.target.value)}
                            className="mt-1.5 border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="symptoms" className="text-gray-300 text-sm">
                            Triệu chứng / Lý do khám
                        </Label>
                        <textarea
                            id="symptoms"
                            placeholder="Mô tả ngắn gọn triệu chứng..."
                            value={symptoms}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSymptoms(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-gray-700 bg-gray-900 p-3 text-sm text-white focus:border-[#1DA1F2] focus:outline-none transition-all resize-none"
                            rows={3}
                        />
                    </div>
                    {message && (
                        <div className={`rounded-md p-3 text-sm ${message.includes('thành công') ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                            {message}
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                            onClick={() => {
                                setPatientName('')
                                setPreferredDate('')
                                setSymptoms('')
                                setMessage('')
                            }}
                        >
                            Xóa form
                        </Button>
                        <Button
                            className="bg-[#1DA1F2] hover:bg-sky-400 text-white"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Đang gửi...' : 'Gửi đăng ký'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}