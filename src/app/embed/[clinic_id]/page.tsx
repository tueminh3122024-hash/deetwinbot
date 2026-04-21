import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send } from 'lucide-react'

interface EmbedPageProps {
    params: Promise<{ clinic_id: string }>
}

export default async function EmbedPage({ params }: EmbedPageProps) {
    const { clinic_id } = await params

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            DEETWIN Bot — Clinic {clinic_id}
                        </h1>
                        <p className="text-gray-400">Embedded chat interface</p>
                    </div>
                    <div className="rounded-lg bg-gray-900 px-4 py-2">
                        <span className="text-sm text-gray-300">Clinic ID: </span>
                        <span className="font-mono text-white">{clinic_id}</span>
                    </div>
                </div>

                {/* Chat area */}
                <Card className="border-gray-800 bg-black">
                    <div className="h-[60vh] overflow-y-auto p-6">
                        {/* Example messages */}
                        <div className="mb-4 flex items-start space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                            <div>
                                <div className="rounded-2xl rounded-tl-none bg-gray-900 px-4 py-3">
                                    <p className="text-white">
                                        Hello! Welcome to DEETWIN Bot. How can I assist you today?
                                    </p>
                                </div>
                                <span className="mt-1 text-xs text-gray-500">Just now</span>
                            </div>
                        </div>
                        <div className="mb-4 flex items-start justify-end space-x-3">
                            <div className="text-right">
                                <div className="rounded-2xl rounded-tr-none bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3">
                                    <p className="text-white">I'd like to schedule an appointment.</p>
                                </div>
                                <span className="mt-1 text-xs text-gray-500">Just now</span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-cyan-500" />
                        </div>
                        {/* Placeholder for more messages */}
                        <div className="text-center text-gray-500">
                            <MessageSquare className="mx-auto h-12 w-12 opacity-30" />
                            <p className="mt-2">Continue the conversation...</p>
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="border-t border-gray-800 p-4">
                        <div className="flex items-center space-x-3">
                            <Input
                                placeholder="Type your message..."
                                className="flex-1 border-gray-700 bg-gray-900 text-white placeholder-gray-500"
                            />
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-3 flex justify-center space-x-4 text-sm text-gray-500">
                            <span>Embedded mode • No sidebar • Clinic-specific</span>
                        </div>
                    </div>
                </Card>

                <div className="mt-6 text-center text-xs text-gray-600">
                    DEETWIN Bot Embed v1.0 • This interface is designed for clinic websites.
                </div>
            </div>
        </div>
    )
}