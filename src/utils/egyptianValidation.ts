/** Validation helpers for Egyptian national IDs and mobile numbers. */
export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(digit);
    if (arabic >= 0) return String(arabic);
    const persian = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
    return persian >= 0 ? String(persian) : digit;
  });
}

export function isValidEgyptianNationalId(value: string): boolean {
  const id = normalizeDigits(value.trim());
  if (!/^([23])\d{13}$/.test(id)) return false;
  const century = id[0] === '2' ? 1900 : 2000;
  const year = century + Number(id.slice(1, 3));
  const month = Number(id.slice(3, 5));
  const day = Number(id.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  return date.getTime() <= Date.now();
}

export function birthDateFromEgyptianNationalId(value: string): string | null {
  const id = normalizeDigits(value.trim());
  if (!isValidEgyptianNationalId(id)) return null;
  const year = (id[0] === '2' ? 1900 : 2000) + Number(id.slice(1, 3));
  return `${year}-${id.slice(3, 5)}-${id.slice(5, 7)}`;
}

export function isValidEgyptianMobile(value: string): boolean {
  return /^01[0125]\d{8}$/.test(normalizeDigits(value.trim()));
}
