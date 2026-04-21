'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/')
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-gray-800 bg-black p-8">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600">
                        <LogIn size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to your DEETWIN Bot account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">Email</label>
                        <Input
                            type="email"
                            placeholder="you@clinic.com"
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

                    {error && (
                        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <a href="/signup" className="text-blue-500 hover:underline">
                        Sign up
                    </a>
                </div>

                <div className="mt-6 border-t border-gray-800 pt-6 text-xs text-gray-600">
                    <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
                </div>
            </Card>
        </div>
    )
}