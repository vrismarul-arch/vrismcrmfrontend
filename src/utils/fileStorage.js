// src/utils/fileStorage.js
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'vrism'; // ✅ Your Supabase bucket name

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param {File} file The native File object to upload.
 * @returns {Promise<{url: string, filename: string} | null>}
 */
export async function uploadFile(file) {
  if (!file) return null;

  try {
    // ✅ Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed');
    }

    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // ✅ Folder path inside bucket
    const filePath = `chat/${uniqueFileName}`;

    // ==============================
    // 1️⃣ Upload to Supabase Storage
    // ==============================
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      throw new Error(error.message);
    }

    // ==============================
    // 2️⃣ Get Public URL
    // ==============================
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    // ==============================
    // 3️⃣ Return URL + filename
    // ==============================
    return {
      url: data.publicUrl,
      filename: file.name
    };

  } catch (error) {
    console.error('uploadFile error:', error.message);
    return null;
  }
}
