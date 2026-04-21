import { AIProvider } from '@/components/providers/AIProvider'

export default function PreviewLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AIProvider>
            {children}
        </AIProvider>
    )
}
