'use client'

import { useState, useEffect } from 'react'
import { Clinic, Analytics } from '@/lib/types/admin'
import { supabase } from '@/lib/supabase/client'
import { topUpTokens } from '@/lib/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AdminDashboardProps {
    clinics: Clinic[]
    analytics: Analytics
}

export default function AdminDashboard({ clinics, analytics }: AdminDashboardProps) {
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
    const [topUpAmount, setTopUpAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUserEmail(session?.user?.email ?? null)
        }
        fetchSession()
    }, [])

    const handleLogout = async () => {
        setIsLoggingOut(true)
        await supabase.auth.signOut()
        window.location.href = '/'
    }

    const openModal = (clinic: Clinic) => {
        setSelectedClinic(clinic)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setTopUpAmount('')
    }

    const handleTopUp = async () => {
        if (!selectedClinic || !topUpAmount || isNaN(Number(topUpAmount))) return
        setIsSubmitting(true)

        // Log the Clinic ID as requested for debugging
        console.log('Top-up for clinic ID:', selectedClinic.id)

        const result = await topUpTokens(selectedClinic.id, Number(topUpAmount))
        if (result.success) {
            alert('Nạp tokens thành công!')
            closeModal()
            window.location.reload() // refresh to update balances
        } else {
            alert('Lỗi nạp tokens: ' + (result.error || 'Lỗi không xác định'))
        }
        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Bảng Quản Trị Hệ Thống</h1>
                    <p className="text-gray-400">Quản lý phòng mạch, số dư tokens và phân tích dữ liệu</p>
                </div>
                <div className="flex items-center gap-4">
                    <a href="/" className="text-gray-300 hover:text-white underline">Về Trang Chủ</a>
                    {userEmail && (
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300">{userEmail}</span>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                            >
                                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className="bg-gray-900 border-gray-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-gray-300">Tổng Phòng Mạch Hoạt Động</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{analytics.totalActiveClinics}</p>
                        <p className="text-sm text-gray-500">Phòng mạch đang hoạt động</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-gray-300">Tổng Tokens Đã Bán</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{analytics.totalTokensSold.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Doanh số tokens trọn đời</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-gray-300">Hoa Hồng Dự Kiến</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">${analytics.projectedCommission.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">10% từ tổng doanh số tokens</p>
                    </CardContent>
                </Card>
            </div>

            {/* Clinic Management Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold">Quản Lý Phòng Mạch</h2>
                    <p className="text-gray-400">Xem và quản lý tất cả các phòng mạch thành viên</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-950">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-300">Tên Phòng Mạch</th>
                                <th className="text-left p-4 font-medium text-gray-300">Số Dư Tokens</th>
                                <th className="text-left p-4 font-medium text-gray-300">Tổng Leads</th>
                                <th className="text-left p-4 font-medium text-gray-300">Doanh Thu</th>
                                <th className="text-left p-4 font-medium text-gray-300">Trạng Thái</th>
                                <th className="text-left p-4 font-medium text-gray-300">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clinics.map((clinic) => (
                                <tr key={clinic.id} className="border-t border-gray-800 hover:bg-gray-850">
                                    <td className="p-4">{clinic.name}</td>
                                    <td className="p-4">
                                        <span className="font-mono">{clinic.token_balance.toLocaleString()} tokens</span>
                                    </td>
                                    <td className="p-4">{clinic.total_leads.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className="font-mono text-emerald-400">
                                            ${clinic.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${clinic.status === 'active' ? 'bg-green-900 text-green-300' : clinic.status === 'inactive' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
                                            {clinic.status === 'active' ? 'Hoạt động' : clinic.status === 'inactive' ? 'Tạm ngưng' : 'Khóa'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                            onClick={() => openModal(clinic)}
                                        >
                                            Nạp Tokens
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {clinics.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No clinics found.</div>
                )}
            </div>

            {/* Custom Modal */}
            {isModalOpen && selectedClinic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Nạp Tokens cho {selectedClinic.name}</h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="py-4">
                            <Label htmlFor="amount">Số lượng tokens</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Ví dụ: 1000"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                                className="bg-gray-800 border-gray-700 mt-2"
                            />
                            <p className="text-sm text-gray-400 mt-2">
                                Số dư hiện tại: {selectedClinic.token_balance.toLocaleString()} tokens
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={closeModal} className="border-gray-700">
                                Hủy
                            </Button>
                            <Button
                                onClick={handleTopUp}
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Nạp'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-10 text-sm text-gray-500 text-center">
                Master Admin Dashboard • DEETWIN Bot
            </div>
        </div>
    )
}