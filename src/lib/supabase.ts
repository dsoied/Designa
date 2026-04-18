import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Uploads a base64 image to Supabase Storage.
 * @param base64 The base64 string of the image (with or without data prefix).
 * @param fileName The name for the file in storage.
 * @param bucket The bucket name (default: 'images').
 * @returns The public URL of the uploaded image.
 */
export async function uploadToSupabase(base64: string, fileName: string, bucket: string = 'images'): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing.');
  }

  // Remove data prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Convert base64 to Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error('Supabase Upload Error:', error);
    throw error;
  }

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}
