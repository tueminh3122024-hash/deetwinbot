import { AIProvider } from '@/components/providers/AIProvider'
import AppShell from '@/components/Navigation/AppShell'

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
    return (
        <AIProvider>
            <AppShell role="clinic">{children}</AppShell>
        </AIProvider>
    )
}
