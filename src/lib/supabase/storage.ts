import { supabase } from './client'

/**
 * Uploads a file to a specific bucket in Supabase Storage.
 */
export async function uploadFile(
  file: File,
  bucket: string = 'medical-uploads',
  path?: string
) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = path ? `${path}/${fileName}` : fileName

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      path: data.path,
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('Error uploading file to Supabase:', error)
    throw error
  }
}

/**
 * Specialized function for medical uploads
 */
export async function uploadMedicalImage(file: File) {
  return uploadFile(file, 'medical-uploads', 'ocr-scans')
}
