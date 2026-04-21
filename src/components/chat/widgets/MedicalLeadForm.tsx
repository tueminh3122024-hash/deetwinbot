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
            setMessage('Please enter patient name.')
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

            setMessage('Lead submitted successfully!')
            // Reset form
            setPatientName('')
            setPreferredDate('')
            setSymptoms('')
        } catch (error) {
            console.error('Error saving lead:', error)
            setMessage('Could not save lead. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-gray-800 bg-black">
            <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Medical Lead Capture</h3>
                <p className="mb-6 text-sm text-gray-400">
                    Clinic ID: <code className="rounded bg-gray-900 px-2 py-1">{clinicId}</code>
                </p>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="patientName" className="text-gray-300">
                            Patient Name *
                        </Label>
                        <Input
                            id="patientName"
                            placeholder="Enter patient name"
                            value={patientName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientName(e.target.value)}
                            className="mt-1 border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="preferredDate" className="text-gray-300">
                            Preferred Appointment Date
                        </Label>
                        <Input
                            id="preferredDate"
                            type="date"
                            value={preferredDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreferredDate(e.target.value)}
                            className="mt-1 border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="symptoms" className="text-gray-300">
                            Symptoms / Reason for Visit
                        </Label>
                        <textarea
                            id="symptoms"
                            placeholder="Brief description of symptoms"
                            value={symptoms}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSymptoms(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 p-2 text-white focus:border-emerald-500 focus:outline-none"
                            rows={3}
                        />
                    </div>
                    {message && (
                        <div className={`rounded-md p-3 text-sm ${message.includes('success') ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                            {message}
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300"
                            onClick={() => {
                                setPatientName('')
                                setPreferredDate('')
                                setSymptoms('')
                                setMessage('')
                            }}
                        >
                            Clear
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Lead'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}