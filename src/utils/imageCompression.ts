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
