'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Shield, Lock, Mail, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: loginErr } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (loginErr) throw loginErr

            // Check if user has admin role in JWT
            const { data: { session } } = await supabase.auth.getSession()
            const role = session?.user?.app_metadata?.role || (session?.user as any)?.role

            // For now, let's just redirect to /admin. 
            // The AdminDashboard component itself should handle role validation.
            router.push('/admin')
        } catch (err: any) {
            setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(29,161,242,0.05),transparent_50%)] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo Area */}
                <div className="text-center mb-10">
                    <div className="inline-flex h-20 w-20 rounded-3xl bg-gradient-to-br from-[#1DA1F2] to-teal-500 items-center justify-center shadow-2xl shadow-sky-500/20 mb-6">
                        <Shield size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Master</h1>
                    <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-medium">DeeTwin Clinical Platform</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#0d0d0d] border border-[#1f2937] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#1DA1F2]/50 to-transparent" />
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm"
                            >
                                <AlertCircle size={18} className="flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Quản Trị</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-600 group-focus-within:text-[#1DA1F2] transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full bg-[#111] border border-[#1f2937] rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-700 outline-none focus:border-[#1DA1F2]/50 focus:ring-4 focus:ring-[#1DA1F2]/5 transition-all text-sm"
                                    placeholder="admin@deetwin.vn"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-2 ml-1">Mật Mã</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-600 group-focus-within:text-[#1DA1F2] transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full bg-[#111] border border-[#1f2937] rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-700 outline-none focus:border-[#1DA1F2]/50 focus:ring-4 focus:ring-[#1DA1F2]/5 transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#1DA1F2] to-teal-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <span>Đăng Nhập Hệ Thống</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-600 text-xs mt-10">
                    Bản quyền thuộc về &copy; 2026 DeeTwin mBOS Engine.<br />
                    Truy cập bị giới hạn cho quản trị viên cấp cao.
                </p>
            </motion.div>
        </div>
    )
}
