'use server'

import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

/**
 * Server Action: Generate a medical summary based on chat history and clinic notes.
 */
export async function generateMedicalSummary(
    chatHistory: string,
    clinicNotes: string,
    ocrText: string = '',
    userInfo: string = ''
) {
    try {
        const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: `Bạn là một Bác sĩ chuyên khoa cao cấp tại Clinic DeeTwin. 
            Nhiệm vụ của bạn là tóm tắt hồ sơ bệnh án từ lịch sử trò chuyện, ghi chú lâm sàng và dữ liệu OCR.
            
            Yêu cầu chuyên môn:
            1. Sử dụng thuật ngữ y khoa chính xác, ngắn gọn nhưng đầy đủ.
            2. Nếu phát hiện chỉ số MSI (Metabolic Stability Index) có biến động đáng kể trong dữ liệu, hãy BÔI ĐẬM và dùng ký hiệu ⚠️ để bác sĩ lưu ý (Ví dụ: **⚠️ MSI: 75 -> 60 (Giảm mạnh)**).
            3. Cấu trúc nội dung theo Markdown sạch sẽ:
               - **Triệu chứng & Bệnh sử**
               - **Chẩn đoán chuyên môn**
               - **Phác đồ & Kế hoạch điều trị**
               - **Lời khuyên bác sĩ & Hẹn tái khám**
            
            Tông giọng: Chuyên nghiệp, khách quan, đi thẳng vào vấn đề.`,
            prompt: `
            THÔNG TIN BỆNH NHÂN:
            ${userInfo}

            DỮ LIỆU TRÒ CHUYỆN:
            ${chatHistory}
            
            GHI CHÚ LÂM SÀNG:
            ${clinicNotes}
            
            DỮ LIỆU OCR/KẾT QUẢ:
            ${ocrText}
            `,
        })

        return { success: true, summary: text }
    } catch (error: any) {
        console.error('[ai/action] generateMedicalSummary error:', error)
        return { success: false, error: error.message || 'Lỗi khi tạo tóm tắt y tế.' }
    }
}
