import ChatLayout from '@/components/layout/ChatLayout'
import { AIProvider } from '@/components/providers/AIProvider'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AIProvider>
            <ChatLayout>{children}</ChatLayout>
        </AIProvider>
    )
}