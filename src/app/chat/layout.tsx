import { AIProvider } from '@/components/providers/AIProvider'
import AppShell from '@/components/Navigation/AppShell'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <AIProvider>
            <AppShell role="user">
                {children}
            </AppShell>
        </AIProvider>
    )
}
