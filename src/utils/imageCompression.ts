/**
 * Client-side image resizing/compression.
 *
 * WHY THIS EXISTS:
 * The public application form (and the internal HR form) send the applicant's
 * photo and attached documents as base64 strings inside a single JSON request
 * body to a Vercel serverless function. Vercel enforces a hard ~4.5MB limit on
 * the request body for standard serverless functions — a limit that CANNOT be
 * raised via express/body-parser config, because it is rejected by the Vercel
 * platform before the request ever reaches our code.
 *
 * A raw phone-camera photo is often 3-8MB, and base64 encoding adds ~33%
 * overhead on top of that — so a single "reasonable" photo can already blow
 * past the limit, before any ID/health-certificate documents are even added.
 * When that happens, Vercel returns a plain-text error (e.g. "Request Entity
 * Too Large") instead of JSON, which is what produced the
 * `Unexpected token 'R' ... is not valid JSON` crash.
 *
 * This utility resizes + re-compresses images on the candidate's device
 * before they're turned into base64, so the payload stays comfortably under
 * the platform limit. It only applies to actual images (jpeg/png/webp) —
 * PDFs are passed through untouched (see MAX_DOCUMENT_FILE_SIZE_BYTES in the
 * calling components for the separate PDF size guard).
 */

import { ApiService } from '../services/api';
import { supabaseBrowserClient } from '../services/supabaseClient';

export interface CompressImageOptions {
  /** Max width/height in pixels; image is scaled down proportionally to fit. */
  maxDimension?: number;
  /** JPEG quality 0-1. */
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.75;

/**
 * Resizes and compresses an image File into a JPEG data URL (base64).
 * Falls back to the original file's data URL if anything goes wrong
 * (e.g. unsupported format) so uploads never hard-fail because of this step.
 */
export function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve('');

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onerror = () => resolve(dataUrl); // fall back to the uncompressed data URL

      img.onload = () => {
        try {
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Safety net: only use the compressed version if it's actually smaller.
          resolve(
            compressedDataUrl.length < dataUrl.length ? compressedDataUrl : dataUrl
          );
        } catch {
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/** Rough size in bytes of a base64 data URL (accounts for the ~33% base64 overhead). */
export function estimateDataUrlBytes(dataUrl: string | undefined | null): number {
  if (!dataUrl) return 0;
  const base64Part = dataUrl.split(',')[1] ?? '';
  return Math.round((base64Part.length * 3) / 4);
}

/** Converts a compressed image data URL into a Blob, for direct upload. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export interface DirectUploadOptions {
  /** Treated as an image (compressed before upload) vs. passed through as-is (e.g. PDFs). */
  isImage: boolean;
  maxDimension?: number;
  quality?: number;
}

/**
 * Uploads a file directly from the browser to Supabase Storage, bypassing
 * our own backend entirely for the file bytes themselves.
 *
 * WHY: sending files as base64 inside the JSON request body (the old
 * approach) runs into Vercel's hard ~4.5MB serverless request-body limit —
 * a photo + a couple of attached documents can blow past that easily. This
 * function instead:
 *   1. Compresses images on-device (skipped for PDFs).
 *   2. Asks our backend for a short-lived signed upload URL/token
 *      (`/api/uploads/signed-url`) — a tiny JSON request, no file bytes.
 *   3. PUTs the file directly to Supabase Storage using that token.
 * Only the resulting short public URL is ever included in the applicant
 * JSON payload sent afterwards.
 *
 * Returns the public URL to store as `photo_url` / a document's `file_url`.
 */
export async function uploadFileDirectToStorage(
  file: File,
  options: DirectUploadOptions
): Promise<string> {
  if (!supabaseBrowserClient) {
    throw new Error(
      'رفع الملفات غير مهيأ حاليًا على هذا الموقع (إعدادات Supabase غير مكتملة)، يرجى التواصل مع الدعم الفني'
    );
  }

  let blob: Blob;
  let contentType: string;
  let uploadFileName: string;

  if (options.isImage) {
    const dataUrl = await compressImageFile(file, {
      maxDimension: options.maxDimension,
      quality: options.quality,
    });
    blob = await dataUrlToBlob(dataUrl);
    contentType = 'image/jpeg';
    // Images are always re-encoded to JPEG above, so use a matching
    // filename instead of the original (which may have been .png/.webp).
    uploadFileName = 'photo.jpg';
  } else {
    blob = file;
    contentType = file.type || 'application/octet-stream';
    uploadFileName = file.name;
  }

  const signed = await ApiService.getUploadSignedUrl(uploadFileName, contentType);

  const { error } = await supabaseBrowserClient.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, blob, { contentType });

  if (error) {
    throw new Error('فشل رفع الملف إلى التخزين، يرجى المحاولة مرة أخرى');
  }

  if (signed.publicUrl) return signed.publicUrl;

  const { data } = supabaseBrowserClient.storage.from(signed.bucket).getPublicUrl(signed.path);
  return data.publicUrl;
}
