export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export interface SignedUploadRequest { fileName: unknown; contentType: unknown; fileSize: unknown }
export type ValidatedUpload = { contentType: string; extension: string; fileSize: number };

export function validateSignedUpload(input: SignedUploadRequest): { ok: true; value: ValidatedUpload } | { ok: false; error: string } {
  if (typeof input.contentType !== 'string' || !EXTENSION_BY_TYPE[input.contentType]) {
    return { ok: false, error: 'نوع الملف غير مسموح به. ارفع صورة JPEG أو PNG أو WEBP أو ملف PDF.' };
  }
  if (typeof input.fileName !== 'string' || !input.fileName.trim() || input.fileName.length > 255) {
    return { ok: false, error: 'اسم الملف غير صالح.' };
  }
  const maxBytes = input.contentType === 'application/pdf' ? MAX_PDF_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  if (!Number.isSafeInteger(input.fileSize) || Number(input.fileSize) <= 0 || Number(input.fileSize) > maxBytes) {
    return { ok: false, error: `حجم الملف غير صالح أو يتجاوز الحد المسموح (${Math.floor(maxBytes / 1024 / 1024)} ميجابايت).` };
  }
  return { ok: true, value: { contentType: input.contentType, extension: EXTENSION_BY_TYPE[input.contentType], fileSize: Number(input.fileSize) } };
}

/** Accept only public-object URLs from this project's HR document bucket. */
export function isHrStoragePublicUrl(value: unknown, supabaseUrl: string | undefined): value is string {
  if (typeof value !== 'string' || !supabaseUrl || value.length > 2048) return false;
  try {
    const candidate = new URL(value);
    const project = new URL(supabaseUrl);
    return candidate.origin === project.origin && candidate.pathname.startsWith('/storage/v1/object/public/hr-documents/public-uploads/');
  } catch { return false; }
}
