import { describe, expect, it } from 'vitest';
import { isHrStoragePublicUrl, MAX_IMAGE_UPLOAD_BYTES, MAX_PDF_UPLOAD_BYTES, validateSignedUpload } from './uploadValidation';

describe('signed upload validation', () => {
  it('accepts supported content types and derives a safe extension from MIME', () => {
    const valid = validateSignedUpload({ fileName: '../../bad.exe', contentType: 'image/jpeg', fileSize: 1200 });
    expect(valid).toEqual({ ok: true, value: { contentType: 'image/jpeg', extension: 'jpg', fileSize: 1200 } });
  });

  it('enforces declared image/PDF limits and rejects unsupported MIME types', () => {
    expect(validateSignedUpload({ fileName: 'p.jpg', contentType: 'image/png', fileSize: MAX_IMAGE_UPLOAD_BYTES }).ok).toBe(true);
    expect(validateSignedUpload({ fileName: 'd.pdf', contentType: 'application/pdf', fileSize: MAX_PDF_UPLOAD_BYTES }).ok).toBe(true);
    expect(validateSignedUpload({ fileName: 'large.jpg', contentType: 'image/jpeg', fileSize: MAX_IMAGE_UPLOAD_BYTES + 1 }).ok).toBe(false);
    expect(validateSignedUpload({ fileName: 'large.pdf', contentType: 'application/pdf', fileSize: MAX_PDF_UPLOAD_BYTES + 1 }).ok).toBe(false);
    expect(validateSignedUpload({ fileName: 'file.exe', contentType: 'application/x-msdownload', fileSize: 500 }).ok).toBe(false);
    expect(validateSignedUpload({ fileName: '', contentType: 'image/jpeg', fileSize: 500 }).ok).toBe(false);
  });

  it('recognizes only public object URLs under the configured HR bucket path', () => {
    const valid = 'https://demo.supabase.co/storage/v1/object/public/hr-documents/public-uploads/2026/id.pdf';
    expect(isHrStoragePublicUrl(valid, 'https://demo.supabase.co')).toBe(true);
    expect(isHrStoragePublicUrl('https://other.supabase.co/storage/v1/object/public/hr-documents/public-uploads/id.pdf', 'https://demo.supabase.co')).toBe(false);
    expect(isHrStoragePublicUrl('https://demo.supabase.co/storage/v1/object/public/other/id.pdf', 'https://demo.supabase.co')).toBe(false);
  });
});
