'use client'

import { useState, useEffect } from 'react'
import { PanelLeftClose, PanelLeftOpen, MessageSquare, Home, Users, CreditCard, Settings, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { useAI } from '@/components/providers/AIProvider'
import { supabase } from '@/lib/supabase/client'
import ConsultationHistory from '@/components/clinic/ConsultationHistory'

interface ChatLayoutProps {
    children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
    const [activeMenu, setActiveMenu] = useState('Tổng quan')
    const { availableClinics, currentClinicId, setAvailableClinics, setCurrentClinicId } = useAI()

    useEffect(() => {
        const fetchAndSetClinics = async () => {
            const { data, error } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('status', 'active')
            
            if (!error && data) {
                setAvailableClinics(data)
                if (data.length > 0 && !currentClinicId) {
                    setCurrentClinicId(data[0].id)
                }
            }
        }
        fetchAndSetClinics()
    }, [])

    const currentClinic = availableClinics.find(c => c.id === currentClinicId) || { name: 'Chọn phòng mạch' }

    const menuItems = [
        { icon: Home, label: 'Tổng quan' },
        { icon: MessageSquare, label: 'Lịch sử Chat' },
        { icon: Users, label: 'Bệnh nhân' },
        { icon: CreditCard, label: 'Thanh toán' },
        { icon: Settings, label: 'Cài đặt' },
    ]

    const [tokenBalance, setTokenBalance] = useState<number>(0)

    useEffect(() => {
        if (currentClinicId) {
            const fetchBalance = async () => {
                const { data } = await supabase
                    .from('clinics')
                    .select('token_balance')
                    .eq('id', currentClinicId)
                    .maybeSingle()
                if (data) setTokenBalance(data.token_balance)
            }
            fetchBalance()

            // Subscribe to real-time updates for balance
            const channel = supabase
                .channel('balance-updates')
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'clinics',
                    filter: `id=eq.${currentClinicId}`
                }, (payload) => {
                    setTokenBalance(payload.new.token_balance)
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [currentClinicId])

    return (
        <div className="flex h-[100dvh] bg-black text-gray-200">
            {/* Sidebar */}
            <aside
                className={`${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-[#1f2937] transition-all duration-300`}
            >
                <div className="flex h-full flex-col">
                    {/* Header with Avatar Logo */}
                    <div className="flex items-center justify-between p-4">
                        {!sidebarCollapsed && (
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8 border border-white/20">
                                        <AvatarImage src="https://api.dicebear.com/7.x/shapes/svg?seed=DEETWIN" />
                                        <AvatarFallback>DT</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h1 className="text-lg font-bold text-white tracking-widest uppercase">DEETWIN</h1>
                                        <div className="text-[8px] bg-[#1DA1F2] text-white px-1 rounded inline-block font-bold">CLINIC MODE</div>
                                    </div>
                                </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="text-gray-400 hover:text-white"
                        >
                            {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </Button>
                    </div>

                    {/* Clinic switcher */}
                    {!sidebarCollapsed && (
                        <div className="mb-6 px-4 relative">
                            <div 
                                className="rounded-xl bg-gray-900 p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                            >
                                <div className="text-xs text-gray-400 uppercase tracking-tighter">Phòng mạch</div>
                                <div className="mt-1 flex items-center justify-between">
                                    <span className="font-semibold text-white truncate pr-2">
                                        {currentClinic.name}
                                    </span>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Switcher Dropdown */}
                            {isSwitcherOpen && (
                                <div className="absolute left-4 right-4 top-full mt-2 z-50 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-2 max-h-60 overflow-y-auto">
                                    {availableClinics.map((clinic) => (
                                        <div
                                            key={clinic.id}
                                            className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                                            onClick={() => {
                                                setCurrentClinicId(clinic.id)
                                                setIsSwitcherOpen(false)
                                            }}
                                        >
                                            <span className={`text-sm ${clinic.id === currentClinicId ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                                                {clinic.name}
                                            </span>
                                            {clinic.id === currentClinicId && <Check size={14} className="text-blue-400" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => (
                                <li key={item.label}>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setActiveMenu(item.label)}
                                        className={`w-full justify-start transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-0' : 'px-4'} ${
                                            activeMenu === item.label 
                                            ? 'bg-[#1DA1F2]/20 text-[#1DA1F2] border-r-2 border-[#1DA1F2] rounded-none' 
                                            : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                        }`}
                                    >
                                        <item.icon size={18} className={activeMenu === item.label ? 'text-[#1DA1F2]' : ''} />
                                        {!sidebarCollapsed && <span className="ml-3 font-bold text-[13px]">{item.label}</span>}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Tokens counter */}
                    <div className="border-t border-gray-900 p-4">
                        <div className="flex items-center justify-between">
                            {!sidebarCollapsed && (
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Số dư Tokens</div>
                                    <div className="text-2xl font-bold text-white tabular-nums">
                                        {tokenBalance.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </div>
                                </div>
                            )}
                            <div className={`rounded-xl bg-gray-900 border border-white/5 p-3 ${sidebarCollapsed ? 'mx-auto' : ''}`}>
                                <CreditCard size={sidebarCollapsed ? 18 : 20} className="text-blue-400" />
                            </div>
                        </div>
                    </div>

                    {/* User profile */}
                    <div className="border-t border-gray-900 p-4">
                        <div className="flex items-center space-x-3">
                            <Avatar className="border border-white/10 h-9 w-9">
                                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=MINH_TUE" />
                                <AvatarFallback>BS</AvatarFallback>
                            </Avatar>
                            {!sidebarCollapsed && (
                                <div className="flex-1 truncate">
                                    <div className="font-semibold text-sm text-white">BS. Minh Tuệ</div>
                                    <div className="text-[11px] text-gray-500 font-medium">Bác sĩ phụ trách</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-hidden">
                <div className="h-full p-6">
                    <div className="h-full rounded-2xl border border-gray-800 bg-black overflow-hidden">
                        {activeMenu === 'Lịch sử Chat' && currentClinicId ? (
                            <ConsultationHistory clinicId={currentClinicId} />
                        ) : (
                            children
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}