import ChatLayoutComponent from '@/components/layout/ChatLayout'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <ChatLayoutComponent>
            {children}
        </ChatLayoutComponent>
    )
}
