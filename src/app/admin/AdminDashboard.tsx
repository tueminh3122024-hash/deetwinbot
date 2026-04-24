'use client'

import { useState, useEffect } from 'react'
import { Clinic, Analytics } from '@/lib/types/admin'
import { supabase } from '@/lib/supabase/client'
import { topUpTokens, updateSystemSetting, createClinic, updateClinicAdmin } from '@/lib/actions/admin'
import { Activity, Sparkles, Plus, Edit2, ShieldCheck, Mail, Phone, Info, Trash2, Coins, FileText } from 'lucide-react'
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

    /* ── System Settings State ── */
    const [tokenRate, setTokenRate] = useState('5')
    const [masterPrompt, setMasterPrompt] = useState('')
    const [isSavingSettings, setIsSavingSettings] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            const { data: rateData } = await supabase.from('system_settings').select('value').eq('key', 'token_rate').maybeSingle()
            const { data: promptData } = await supabase.from('system_settings').select('value').eq('key', 'master_prompt').maybeSingle()
            if (rateData) setTokenRate(rateData.value.toString())
            if (promptData) setMasterPrompt(promptData.value.toString())
        }
        loadSettings()
    }, [])

    const handleSaveSettings = async () => {
        setIsSavingSettings(true)
        const rateResult = await updateSystemSetting('token_rate', Number(tokenRate))
        const promptResult = await updateSystemSetting('master_prompt', masterPrompt)
        
        if (rateResult.success && promptResult.success) {
            alert('Cập nhật cấu hình hệ thống thành công!')
        } else {
            alert('Lỗi khi cập nhật cấu hình: ' + (rateResult.error || promptResult.error))
        }
        setIsSavingSettings(false)
    }

    /* ── Clinic CRUD State ── */
    const [isClinicModalOpen, setIsClinicModalOpen] = useState(false)
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)
    const [clinicForm, setClinicForm] = useState({
        name: '',
        email: '',
        phone: '',
        description: '',
        legal_info: '',
        address: ''
    })

    const openClinicModal = (clinic?: Clinic) => {
        if (clinic) {
            setEditingClinic(clinic)
            setClinicForm({
                name: clinic.name,
                email: clinic.email || '',
                phone: clinic.phone || '',
                description: clinic.description || '',
                legal_info: clinic.legal_info || '',
                address: clinic.address || ''
            })
        } else {
            setEditingClinic(null)
            setClinicForm({ name: '', email: '', phone: '', description: '', legal_info: '', address: '' })
        }
        setIsClinicModalOpen(true)
    }

    const handleClinicSubmit = async () => {
        if (!clinicForm.name || !clinicForm.email || !clinicForm.phone) {
            alert('Vui lòng nhập đầy đủ Tên, Email và Số điện thoại')
            return
        }
        setIsSubmitting(true)
        
        const result = editingClinic 
            ? await updateClinicAdmin(editingClinic.id, clinicForm)
            : await createClinic(clinicForm)

        if (result.success) {
            alert(editingClinic ? 'Cập nhật thành công!' : 'Tạo mới thành công!')
            setIsClinicModalOpen(false)
            window.location.reload()
        } else {
            alert('Lỗi: ' + result.error)
        }
        setIsSubmitting(false)
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <img 
                            src="https://deetwinapp.vercel.app/assets/public/avatar.995cc35baa763d8aaef9a5fe3954fe7d.gif" 
                            alt="DeeTwin Logo" 
                            className="h-16 w-16 rounded-2xl shadow-lg shadow-[#1DA1F2]/20"
                        />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1DA1F2] to-emerald-400 bg-clip-text text-transparent">MODULE ADMIN MASTER (v2.0)</h1>
                    </div>
                    <p className="text-gray-400">Quản trị toàn diện: Clinic, Tokenomics & Bio-Guardian Master Prompt</p>
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
                        <p className="text-4xl font-bold">{analytics.totalTokensSold.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
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

            {/* System Settings & Global Control */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                {/* Token Engine Settings */}
                <Card className="bg-gray-900/50 border-[#1DA1F2]/20 text-white backdrop-blur-xl">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-sky-400 flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-sky-400/10"><Activity size={18} /></span>
                            Module Token Độc lập (Dynamic Engine)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="tokenRate" className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Editable Token Rate (Replies/Token)</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    id="tokenRate"
                                    type="number"
                                    value={tokenRate}
                                    onChange={(e) => setTokenRate(e.target.value)}
                                    className="bg-black border-gray-800 focus:border-sky-500 max-w-[120px] text-lg font-bold"
                                />
                                <span className="text-sm text-gray-500">tin nhắn = 1 Token</span>
                            </div>
                            <p className="text-[11px] text-gray-600 italic">Công thức: Actual_Token_Deduct = Total_Replies / {tokenRate}</p>
                        </div>
                        <Button 
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="w-full bg-[#1DA1F2] hover:bg-sky-400 text-white font-bold"
                        >
                            {isSavingSettings ? 'Đang cập nhật...' : 'Lưu cấu hình Tokenomics'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Master Prompt Control */}
                <Card className="bg-gray-900/50 border-emerald-500/20 text-white backdrop-blur-xl">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-emerald-400 flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-emerald-400/10"><Sparkles size={18} /></span>
                            Hệ thống Prompt Root (Global Control)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="masterPrompt" className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">DeeTwin Master Prompt (Bio-Guardian Core)</Label>
                            <textarea
                                id="masterPrompt"
                                value={masterPrompt}
                                onChange={(e) => setMasterPrompt(e.target.value)}
                                rows={4}
                                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-300 focus:border-emerald-500 outline-none resize-none leading-relaxed"
                                placeholder="Nhập Master Prompt định danh cho toàn hệ thống..."
                            />
                        </div>
                        <Button 
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                            {isSavingSettings ? 'Đang cập nhật...' : 'Cập nhật Master Prompt'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Quản Lý Phòng Mạch</h2>
                        <p className="text-gray-400">Xem và quản lý tất cả các phòng mạch thành viên</p>
                    </div>
                    <Button 
                        onClick={() => openClinicModal()}
                        className="bg-gradient-to-r from-[#1DA1F2] to-teal-500 text-white gap-2 font-bold"
                    >
                        <Plus size={16} />
                        Thêm Clinic Mới
                    </Button>
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
                                        <span className="font-mono">{clinic.token_balance.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tokens</span>
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
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 gap-1.5"
                                                onClick={() => openModal(clinic)}
                                            >
                                                <Coins size={12} />
                                                Nạp Tokens
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 gap-1.5"
                                                onClick={() => openClinicModal(clinic)}
                                            >
                                                <Edit2 size={12} />
                                                Sửa
                                            </Button>
                                        </div>
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
                                Số dư hiện tại: <span className="font-bold text-white">{selectedClinic.token_balance.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span> tokens
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

            {/* Clinic CRUD Modal */}
            {isClinicModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <ShieldCheck className="text-[#1DA1F2]" />
                                {editingClinic ? 'Chỉnh sửa Clinic' : 'Đăng ký Clinic Mới'}
                            </h3>
                            <button onClick={() => setIsClinicModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Tên Phòng Mạch *</Label>
                                    <Input 
                                        value={clinicForm.name}
                                        onChange={(e) => setClinicForm({...clinicForm, name: e.target.value})}
                                        className="bg-black border-gray-800"
                                        placeholder="Ví dụ: DeeTwin Center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        <Mail size={10} /> Email định danh *
                                    </Label>
                                    <Input 
                                        type="email"
                                        value={clinicForm.email}
                                        onChange={(e) => setClinicForm({...clinicForm, email: e.target.value})}
                                        className="bg-black border-gray-800"
                                        placeholder="email@clinic.vn"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        <Phone size={10} /> Số điện thoại *
                                    </Label>
                                    <Input 
                                        value={clinicForm.phone}
                                        onChange={(e) => setClinicForm({...clinicForm, phone: e.target.value})}
                                        className="bg-black border-gray-800"
                                        placeholder="09xxx..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        Địa chỉ
                                    </Label>
                                    <Input 
                                        value={clinicForm.address}
                                        onChange={(e) => setClinicForm({...clinicForm, address: e.target.value})}
                                        className="bg-black border-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        <Info size={10} /> Mô tả cơ sở vật chất
                                    </Label>
                                    <textarea 
                                        value={clinicForm.description}
                                        onChange={(e) => setClinicForm({...clinicForm, description: e.target.value})}
                                        className="w-full h-24 bg-black border border-gray-800 rounded-lg p-3 text-sm outline-none focus:border-[#1DA1F2]"
                                        placeholder="Trang thiết bị, quy mô..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        Chi tiết Pháp lý
                                    </Label>
                                    <textarea 
                                        value={clinicForm.legal_info}
                                        onChange={(e) => setClinicForm({...clinicForm, legal_info: e.target.value})}
                                        className="w-full h-24 bg-black border border-gray-800 rounded-lg p-3 text-sm outline-none focus:border-[#1DA1F2]"
                                        placeholder="Giấy phép kinh doanh, mã số thuế..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-800">
                            <Button variant="outline" onClick={() => setIsClinicModalOpen(false)} className="border-gray-700">Hủy</Button>
                            <Button 
                                onClick={handleClinicSubmit}
                                disabled={isSubmitting}
                                className="bg-[#1DA1F2] hover:bg-sky-400 text-white font-bold px-8"
                            >
                                {isSubmitting ? 'Đang lưu...' : 'Xác nhận & Lưu'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}