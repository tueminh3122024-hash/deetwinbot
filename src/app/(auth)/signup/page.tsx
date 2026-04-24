'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { registerClinic } from '@/lib/actions/auth'
import { Phone, Stethoscope, MapPin, UserRound } from 'lucide-react'

const VIETNAMESE_PHONE_REGEX = /(84|0[3|5|7|8|9])+([0-9]{8})\b/

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [clinicName, setClinicName] = useState('')
    const [phone, setPhone] = useState('')
    const [doctorName, setDoctorName] = useState('')
    const [specialty, setSpecialty] = useState('')
    const [address, setAddress] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const router = useRouter()

    const validatePhone = (value: string) => {
        if (!value) {
            setPhoneError('Vui lòng nhập số điện thoại')
            return false
        }
        if (!VIETNAMESE_PHONE_REGEX.test(value)) {
            setPhoneError('Số điện thoại không hợp lệ (VD: 0912345678)')
            return false
        }
        setPhoneError(null)
        return true
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setPhone(value)
        if (value) validatePhone(value)
        else setPhoneError(null)
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Mật khẩu không khớp')
            setLoading(false)
            return
        }

        // Validate phone
        if (!validatePhone(phone)) {
            setLoading(false)
            return
        }

        const result = await registerClinic({
            email,
            password,
            clinic_name: clinicName,
            phone,
            doctor_name: doctorName || undefined,
            specialty: specialty || undefined,
            address: address || undefined,
        })

        if (result.success) {
            router.push('/login?registered=true')
        } else {
            setError(result.error || 'Đăng ký thất bại')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-gray-800 bg-black p-8">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600">
                        <UserRound size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Đăng ký phòng mạch</h1>
                    <p className="text-gray-400">Đăng ký tài khoản DEETWIN Bot cho phòng mạch của bạn</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                    {/* Clinic Name */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Tên phòng mạch <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="text"
                            placeholder="Phòng mạch của bạn"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <Input
                                type="tel"
                                placeholder="0912345678"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                                className="border-gray-700 bg-gray-900 pl-10 text-white"
                            />
                        </div>
                        {phoneError && (
                            <p className="mt-1 text-sm text-red-400">{phoneError}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="email"
                            placeholder="admin@clinic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            Xác nhận mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="border-gray-700 bg-gray-900 text-white"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-800 pt-2">
                        <p className="mb-3 text-xs text-gray-500">Thông tin bổ sung (không bắt buộc)</p>

                        {/* Doctor Name */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-300">Tên bác sĩ</label>
                            <div className="relative">
                                <Stethoscope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <Input
                                    type="text"
                                    placeholder="BS. Nguyễn Văn A"
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    className="border-gray-700 bg-gray-900 pl-10 text-white"
                                />
                            </div>
                        </div>

                        {/* Specialty */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-300">Chuyên khoa</label>
                            <div className="relative">
                                <Stethoscope size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <Input
                                    type="text"
                                    placeholder="Da liễu, Nha khoa, ..."
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="border-gray-700 bg-gray-900 pl-10 text-white"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">Địa chỉ</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <Input
                                    type="text"
                                    placeholder="Số nhà, đường, quận/huyện, thành phố"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="border-gray-700 bg-gray-900 pl-10 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        disabled={loading}
                    >
                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </Button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    Đã có tài khoản?{' '}
                    <a href="/login" className="text-blue-500 hover:underline">
                        Đăng nhập
                    </a>
                </div>

                <div className="mt-6 border-t border-gray-800 pt-6 text-xs text-gray-600">
                    <p>Bằng cách đăng ký, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.</p>
                </div>
            </Card>
        </div>
    )
}