import { describe, expect, it } from 'vitest';
import { birthDateFromEgyptianNationalId, isValidEgyptianMobile, isValidEgyptianNationalId, normalizeDigits } from './egyptianValidation';

describe('Egyptian identity validation', () => {
  it('normalizes Arabic-Indic and Persian digits', () => {
    expect(normalizeDigits('٢٩٩٠١٠١١٢٣٤٥٦٧')).toBe('29901011234567');
    expect(normalizeDigits('۲۹۹۰۱۰۱۱۲۳۴۵۶۷')).toBe('29901011234567');
  });

  it('accepts valid Egyptian national IDs and derives the date of birth', () => {
    expect(isValidEgyptianNationalId('29901011234567')).toBe(true);
    expect(isValidEgyptianNationalId('٢٩٩٠١٠١١٢٣٤٥٦٧')).toBe(true);
    expect(birthDateFromEgyptianNationalId('29901011234567')).toBe('1999-01-01');
  });

  it('rejects malformed, impossible, and future national-ID dates', () => {
    expect(isValidEgyptianNationalId('29902301234567')).toBe(false);
    expect(isValidEgyptianNationalId('19901011234567')).toBe(false);
    expect(isValidEgyptianNationalId('32701011234567')).toBe(false);
    expect(birthDateFromEgyptianNationalId('29902301234567')).toBeNull();
  });

  it('accepts Egyptian mobile prefixes and rejects invalid numbers', () => {
    for (const phone of ['01012345678', '01112345678', '01212345678', '01512345678', '٠١٠١٢٣٤٥٦٧٨']) {
      expect(isValidEgyptianMobile(phone)).toBe(true);
    }
    for (const phone of ['0101234567', '01312345678', '+201012345678', 'abcdefghijk']) {
      expect(isValidEgyptianMobile(phone)).toBe(false);
    }
  });
});
