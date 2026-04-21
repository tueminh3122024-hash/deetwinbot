'use client'

import React, { useState, useEffect } from 'react'
import { LogOut, User, Settings, CreditCard } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

/**
 * UserDropdown component for authentication and profile management.
 */
export function UserDropdown() {
    const [user, setUser] = useState<any>(null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    if (!user) {
        return (
            <Button 
                variant="outline" 
                size="sm" 
                className="border-[#1f2937] text-white hover:bg-gray-800 rounded-full h-9 px-4 text-xs font-semibold"
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            >
                Đăng nhập
            </Button>
        )
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 focus:outline-none"
            >
                <Avatar className="h-9 w-9 border border-white/20 hover:border-white/40 transition-colors">
                    <AvatarImage src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-2 border-b border-gray-800 mb-2">
                            <p className="text-xs text-gray-500 font-medium">Đang đăng nhập với</p>
                            <p className="text-sm text-white font-semibold truncate">{user.email}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                                <User size={16} className="mr-3" />
                                Hồ sơ bác sĩ
                            </button>
                            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                                <CreditCard size={16} className="mr-3" />
                                Gói dịch vụ
                            </button>
                            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                                <Settings size={16} className="mr-3" />
                                Cài đặt Clinic
                            </button>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-800">
                            <button 
                                onClick={handleSignOut}
                                className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <LogOut size={16} className="mr-3" />
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default UserDropdown
