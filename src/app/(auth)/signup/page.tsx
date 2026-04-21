'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { UserPlus } from 'lucide-react'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [clinicName, setClinicName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    clinic_name: clinicName,
                },
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // In a real app, you might redirect to a verification page
            router.push('/login?verified=false')
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-gray-800 bg-black p-8">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600">
                        <UserPlus size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Account</h1>
                    <p className="text-gray-400">Set up your DEETWIN Bot clinic account</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Clinic Name</label>
                        <Input
                            type="text"
                            placeholder="Your clinic name"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Email</label>
                        <Input
                            type="email"
                            placeholder="admin@clinic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Confirm Password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </Button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <a href="/login" className="text-blue-500 hover:underline">
                        Sign in
                    </a>
                </div>

                <div className="mt-6 border-t border-gray-800 pt-6 text-xs text-gray-600">
                    <p>By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
                </div>
            </Card>
        </div>
    )
}