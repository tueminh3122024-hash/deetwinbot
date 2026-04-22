'use client'

import { DesktopSidebar, BottomTabBar } from '@/components/Navigation/BottomTabBar'

type Role = 'clinic' | 'user'

interface AppShellProps {
    children: React.ReactNode
    role?: Role
}

/**
 * AppShell — Responsive layout wrapper for DeeTwin.
 *
 * Desktop (md+):  Full-width, left sidebar nav, content fills remaining space.
 * Mobile (<md):   Full-screen, bottom tab bar, content fills 100dvh minus tabs.
 */
export default function AppShell({ children, role = 'clinic' }: AppShellProps) {
    return (
        <div className="flex h-[100dvh] bg-black overflow-hidden">

            {/* ── Desktop: Left Sidebar (hidden on mobile) ── */}
            <DesktopSidebar role={role} />

            {/* ── Main content ── */}
            <main
                className="flex-1 flex flex-col overflow-hidden"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* On mobile: leave space for the fixed bottom tab bar */}
                <div className="flex-1 flex flex-col overflow-hidden md:pb-0 pb-[58px]">
                    {children}
                </div>
            </main>

            {/* ── Mobile: Bottom Tab Bar (hidden on desktop) ── */}
            <BottomTabBar role={role} />
        </div>
    )
}
