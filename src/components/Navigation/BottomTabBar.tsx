'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Users, Coins, Settings, CalendarDays, UserCircle, Zap, History } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAI } from '@/components/providers/AIProvider'

type Role = 'clinic' | 'user'

interface Tab {
    id: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    href: string
}

const clinicTabs: Tab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/' },
    { id: 'history', label: 'Lịch sử Chat', icon: History, href: '/clinic/history' },
    { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays, href: '/appointments' },
    { id: 'patients', label: 'Bệnh nhân', icon: Users, href: '/patients' },
    { id: 'tokens', label: 'Tokens', icon: Coins, href: '/tokens' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, href: '/settings' },
]



const userTabs: Tab[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/chat' },
    { id: 'history', label: 'Lịch sử', icon: History, href: '/chat/history' },
    { id: 'appointments', label: 'Lịch hẹn', icon: CalendarDays, href: '/chat/appointments' },
    { id: 'profile', label: 'Hồ sơ', icon: UserCircle, href: '/chat/profile' },
]

function NavItem({ tab, isActive, onClick, collapsed }: {
    tab: Tab
    isActive: boolean
    onClick: () => void
    collapsed: boolean
}) {
    const Icon = tab.icon
    return (
        <button
            onClick={onClick}
            className={`
                relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 active:scale-95 text-left
                ${isActive ? 'bg-[#1DA1F2]/10 text-[#1DA1F2]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
            `}
        >
            {isActive && (
                <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1DA1F2] rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
            )}
            <Icon size={18} className="flex-shrink-0 ml-1" />
            {!collapsed && (
                <span className="text-sm font-medium truncate">{tab.label}</span>
            )}
        </button>
    )
}

export function DesktopSidebar({ role }: { role: Role }) {
    const router = useRouter()
    const pathname = usePathname()
    const { tokensRemaining } = useAI()
    const tabs = role === 'clinic' ? clinicTabs : userTabs

    return (
        <aside className="hidden md:flex flex-col w-60 h-full border-r border-[#1f2937] bg-black flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-[#1f2937]">
                <img 
                    src="https://deetwinapp.vercel.app/assets/public/avatar.995cc35baa763d8aaef9a5fe3954fe7d.gif" 
                    alt="DeeTwin Logo" 
                    className="h-12 w-12 rounded-xl"
                />
                <span className="text-white font-bold tracking-tight text-xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">DeeTwin</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && tab.href !== '/chat' && pathname?.startsWith(tab.href))
                    return (
                        <NavItem
                            key={tab.id}
                            tab={tab}
                            isActive={isActive}
                            onClick={() => router.push(tab.href)}
                            collapsed={false}
                        />
                    )
                })}
            </nav>

            {/* Token badge — clinic only */}
            {role === 'clinic' && (
                <div className="px-4 py-4 border-t border-[#1f2937]">
                    <div className="bg-[#0d1a2a] border border-[#1DA1F2]/20 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tokens còn lại</p>
                        <p className="text-white font-bold text-lg tabular-nums">
                            {tokensRemaining.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-4">
                <p className="text-[10px] text-gray-700 uppercase tracking-widest">
                    DeeTwin mBOS · HIPAA
                </p>
            </div>
        </aside>
    )
}

export function BottomTabBar({ role = 'clinic' }: { role?: Role }) {
    const router = useRouter()
    const pathname = usePathname()
    const tabs = role === 'clinic' ? clinicTabs : userTabs

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-[#1f2937]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-stretch justify-around h-[58px]">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && tab.href !== '/chat' && pathname?.startsWith(tab.href))
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => router.push(tab.href)}
                            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-[#1DA1F2]"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <Icon size={20} className={`transition-colors ${isActive ? 'text-[#1DA1F2]' : 'text-gray-500'}`} />
                            <span className={`text-[10px] font-medium ${isActive ? 'text-[#1DA1F2]' : 'text-gray-500'}`}>
                                {tab.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
