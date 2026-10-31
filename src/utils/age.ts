/** يحسب السن بالسنوات من تاريخ الميلاد (YYYY-MM-DD). بيرجع null لو التاريخ ناقص أو غلط. */
export function calcAge(birthDate?: string | null, today: Date = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  const b = new Date(y, m - 1, d);
  if (isNaN(b.getTime()) || b > today) return null;
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() - (m - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

export function formatAge(birthDate?: string | null): string {
  const a = calcAge(birthDate);
  if (a === null) return '';
  return a === 1 ? 'سنة' : a === 2 ? 'سنتان' : a >= 3 && a <= 10 ? `${a} سنوات` : `${a} سنة`;
}

/** يعرض مدة الخبرة: "3 سنوات و 4 شهور" — ولو السجل قديم (من/إلى) يعرضهم زي ما هم */
export function formatDuration(exp: {
  duration_years?: number | string | null;
  duration_months?: number | string | null;
  date_from?: string;
  date_to?: string;
}): string {
  const y = Number(exp.duration_years) || 0;
  const m = Number(exp.duration_months) || 0;
  if (y || m) {
    const parts: string[] = [];
    if (y) parts.push(y === 1 ? 'سنة' : y === 2 ? 'سنتان' : y <= 10 ? `${y} سنوات` : `${y} سنة`);
    if (m) parts.push(m === 1 ? 'شهر' : m === 2 ? 'شهران' : m <= 10 ? `${m} شهور` : `${m} شهرًا`);
    return parts.join(' و ');
  }
  if (exp.date_from || exp.date_to) return `${exp.date_from || ''}${exp.date_to ? ' إلى ' + exp.date_to : ''}`;
  return '';
}

/** مجموع مدد الخبرات بالسنوات (بيتقرب لأقرب سنة بنص) */
export function totalExperienceYears(exps: { duration_years?: number | string; duration_months?: number | string }[]): number {
  const months = exps.reduce((s, e) => s + (Number(e.duration_years) || 0) * 12 + (Number(e.duration_months) || 0), 0);
  return Math.round((months / 12) * 10) / 10;
}
