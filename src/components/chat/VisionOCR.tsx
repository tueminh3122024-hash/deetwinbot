'use client'

import { useState, useRef } from 'react'
import { Camera, X, ScanLine, Loader2 } from 'lucide-react'
import { uploadMedicalImage } from '@/lib/supabase/storage'

interface VisionOCRProps {
    /** Called with the Supabase public URL once upload succeeds */
    onScanReady: (imageUrl: string, mimeType: string) => void
}

interface UploadState {
    status: 'idle' | 'uploading' | 'ready' | 'error'
    previewUrl?: string
    supabaseUrl?: string
    mimeType?: string
    error?: string
}

export default function VisionOCR({ onScanReady }: VisionOCRProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [upload, setUpload] = useState<UploadState>({ status: 'idle' })

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const previewUrl = URL.createObjectURL(file)
        setUpload({ status: 'uploading', previewUrl, mimeType: file.type })

        try {
            const { url } = await uploadMedicalImage(file)
            setUpload({ status: 'ready', previewUrl, supabaseUrl: url, mimeType: file.type })
        } catch (err) {
            console.error('VisionOCR upload failed:', err)
            setUpload({ status: 'error', previewUrl, error: 'Upload thất bại. Thử lại nhé.' })
        }

        // Reset input so the same file can be re-selected
        e.target.value = ''
    }

    const handleScan = () => {
        if (upload.supabaseUrl && upload.mimeType) {
            onScanReady(upload.supabaseUrl, upload.mimeType)
            dismissPreview()
        }
    }

    const dismissPreview = () => {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl)
        setUpload({ status: 'idle' })
    }

    return (
        <div className="relative">
            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center h-10 w-10 rounded-full text-[#9ca3af] hover:text-white transition-all active:scale-90"
                aria-label="Chụp ảnh OCR"
            >
                <Camera size={19} />
            </button>

            {/* Preview overlay */}
            {upload.status !== 'idle' && upload.previewUrl && (
                <div className="absolute bottom-14 left-0 z-50 w-52 rounded-2xl bg-gray-900 border border-[#1f2937] overflow-hidden shadow-2xl">
                    {/* Image preview */}
                    <div className="relative">
                        <img
                            src={upload.previewUrl}
                            alt="Ảnh OCR"
                            className="w-full h-32 object-cover"
                        />
                        <button
                            onClick={dismissPreview}
                            className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                        >
                            <X size={14} className="text-white" />
                        </button>
                    </div>

                    {/* Status + action */}
                    <div className="p-3">
                        {upload.status === 'uploading' && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Loader2 size={13} className="animate-spin" />
                                Đang tải ảnh lên...
                            </div>
                        )}
                        {upload.status === 'error' && (
                            <p className="text-xs text-red-400">{upload.error}</p>
                        )}
                        {upload.status === 'ready' && (
                            <button
                                onClick={handleScan}
                                className="w-full flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-sky-400 text-white text-xs font-semibold rounded-xl py-2 transition-all active:scale-95"
                            >
                                <ScanLine size={14} />
                                Scan chỉ số
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
