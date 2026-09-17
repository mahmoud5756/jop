import { FormFieldConfig, FormFieldType, FormSectionKey } from './types';

/**
 * ============================================================================
 *  مصدر الحقيقة الوحيد لحقول نموذج التقديم (Single source of truth)
 * ============================================================================
 *
 * أي حقل يظهر للمتقدم في البوابة العامة لازم يكون معرّف هنا، وكل الشاشات
 * (البوابة العامة / شاشة الأدمن / صفحة الطباعة) بتقرأ من نفس المصدر ده،
 * علشان يستحيل يحصل اختلاف بين اللي المتقدم بيملاه واللي الأدمن بيشوفه
 * واللي بيتطبع في الورقة.
 *
 * مدير النظام يقدر من شاشة "إعدادات نموذج التقديم":
 *   - يخفي أي حقل غير أساسي  (visible)
 *   - يخلي أي حقل إلزامي أو اختياري (required)
 *   - يغيّر اسم أي حقل (label)
 *   - يضيف حقول جديدة بالكامل (+) من أي نوع، وتظهر تلقائيًا في الثلاث شاشات
 */

export const FORM_SECTIONS: { key: FormSectionKey; title: string; step: number }[] = [
  { key: 'personal', title: 'البيانات الشخصية', step: 1 },
  { key: 'job', title: 'الوظيفة المطلوبة', step: 2 },
  { key: 'education', title: 'المؤهل الدراسي', step: 2 },
  { key: 'experience', title: 'الخبرات والمهارات', step: 3 },
  { key: 'shifts', title: 'أوقات العمل والتوافر', step: 3 },
  { key: 'attachments', title: 'المرفقات والمستندات', step: 4 },
  { key: 'declaration', title: 'الإقرار والتوقيع', step: 5 },
];

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'نص قصير',
  textarea: 'نص طويل',
  number: 'رقم',
  date: 'تاريخ',
  select: 'قائمة اختيار',
  checkbox: 'نعم / لا',
  phone: 'رقم هاتف',
  declaration: 'إقرار / تعهد',
};

/**
 * الحقول الأساسية المدمجة في النظام.
 * `locked: true` يعني الحقل لا يمكن إخفاؤه (النظام نفسه مبني عليه:
 * الاسم، الرقم القومي، الهاتف، الفرع، الوظيفة، الإقرار).
 */
/**
 * قوائم الاختيارات الافتراضية للحقول الأساسية.
 * مدير النظام يقدر يعدّلها بالكامل (يضيف/يحذف/يعيد التسمية) من شاشة
 * "إعدادات نموذج التقديم"، وتتغيّر في البوابة العامة وشاشة الأدمن والطباعة معًا.
 */
export const DEFAULT_FIELD_OPTIONS: Record<string, string[]> = {
  marital_status: ['أعزب', 'متزوج', 'مطلق', 'أرمل'],
  military_status: ['أدى الخدمة', 'إعفاء نهائي', 'إعفاء مؤقت', 'تأجيل', 'غير مطلوب (إناث)'],
  qualification: ['مؤهل عالي', 'فوق متوسط', 'مؤهل متوسط', 'طالب جامعي', 'إعدادية', 'بدون مؤهل'],
  skills: [
    'خدمة العملاء',
    'العمل ضمن فريق',
    'الالتزام بالنظافة',
    'مهارات المطبخ والطهي',
    'تجهيز السندوتشات',
    'استخدام الكاشير ونقاط البيع',
    'إدارة المخزون والتوريدات',
    'تحمل ضغط العمل',
    'اللباقة وحسن المظهر',
    'استخدام الحاسب الآلي',
    'سرعة البديهة والتعلم السريع',
  ],
};

/**
 * نصوص الإقرارات الافتراضية.
 * مدير النظام يقدر يعدّل أي نص منها — أو يضيف إقرارات جديدة بالكامل —
 * من شاشة "إعدادات نموذج التقديم" › قسم "الإقرار والتوقيع"،
 * وتظهر فورًا للمتقدم في البوابة العامة وفي الورقة المطبوعة.
 */
export const DEFAULT_DECLARATION_TEXT =
  'أقر أنا الموقع أدناه بأن جميع البيانات والمستندات المدونة في هذا الطلب صحيحة ودقيقة تماماً ومطابقة للواقع، وأتحمل كامل المسؤولية القانونية والإدارية في حال ثبوت عدم صحة أي بيان منها، كما أوافق على الالتزام بلوائح وسياسات العمل المعتمدة بمطاعم BOB WICH وأن هذا الطلب لا يعد تعييناً نهائياً إلا بعد اجتياز المقابلة والفترة التجريبية وتوقيع عقد العمل الرسمي.';

export const DEFAULT_TRAINING_DECLARATION_TEXT =
  'أقر أنا الموقع أدناه، بأنني تقدمت للعمل لدى BOB WICH، وأوافق على قضاء فترة تدريب وتقييم مدتها ثلاثة أيام تدريبية، وذلك للتعرف على طبيعة العمل وإثبات مدى قدرتي على أداء المهام المطلوبة والالتزام بتعليمات العمل.\n' +
  'وأقر بأن استمراري في العمل بعد انتهاء فترة التدريب والتقييم يكون وفقًا لنتيجة التقييم واحتياجات العمل.\n' +
  'كما ألتزم بعد انتهاء فترة التدريب بالرجوع إلى مكتب الإدارة لاستكمال إجراءات العمل، وتسليم الشهادة الصحية والمستندات المطلوبة، ومعرفة الراتب المقرر وبيان المستحقات ونظام العمل.\n' +
  'وقد قرأت هذا الإقرار وفهمت مضمونه ووافقت عليه، وأوقع عليه بإرادتي الكاملة.';

export interface BuiltInFieldDef {
  key: string;
  label: string;
  section: FormSectionKey;
  type: FormFieldType;
  locked?: boolean;          // لا يمكن إخفاؤه
  requiredLocked?: boolean;  // لا يمكن جعله اختياريًا
  defaultRequired: boolean;
  hint?: string;
  /** الحقل له قائمة اختيارات يمكن لمدير النظام تعديلها */
  hasOptions?: boolean;
  /** اختيار متعدد (زي المهارات) */
  multi?: boolean;
  /** نص الإقرار الافتراضي (للحقول من نوع declaration) */
  defaultContent?: string;
}

export const BUILT_IN_FIELDS: BuiltInFieldDef[] = [
  // ---------------- البيانات الشخصية ----------------
  { key: 'photo_url', label: 'الصورة الشخصية', section: 'personal', type: 'text', defaultRequired: false, hint: 'صندوق رفع الصورة في أول النموذج' },
  { key: 'full_name', label: 'الاسم الرباعي كما هو مدون في البطاقة', section: 'personal', type: 'text', locked: true, requiredLocked: true, defaultRequired: true },
  { key: 'national_id', label: 'الرقم القومي (14 رقم)', section: 'personal', type: 'text', locked: true, requiredLocked: true, defaultRequired: true },
  { key: 'phone', label: 'رقم الهاتف الشخصي (متاح واتساب)', section: 'personal', type: 'phone', locked: true, requiredLocked: true, defaultRequired: true },
  { key: 'birth_date', label: 'تاريخ الميلاد', section: 'personal', type: 'date', defaultRequired: true },
  { key: 'address', label: 'محل الإقامة الحالي بالتفصيل', section: 'personal', type: 'text', defaultRequired: true },
  { key: 'emergency_contact_name', label: 'اسم صاحب هاتف الطوارئ وصلة القرابة', section: 'personal', type: 'text', defaultRequired: false },
  { key: 'emergency_phone', label: 'هاتف الطوارئ', section: 'personal', type: 'phone', defaultRequired: false },
  { key: 'marital_status', label: 'الحالة الاجتماعية', section: 'personal', type: 'select', defaultRequired: true, hasOptions: true },
  { key: 'military_status', label: 'الموقف من التجنيد', section: 'personal', type: 'select', defaultRequired: true, hasOptions: true },

  // ---------------- الوظيفة المطلوبة ----------------
  { key: 'branch_name', label: 'الفرع المطلوب التقديم عليه', section: 'job', type: 'select', locked: true, requiredLocked: true, defaultRequired: true },
  { key: 'position_name', label: 'الوظيفة المتقدم إليها', section: 'job', type: 'select', locked: true, requiredLocked: true, defaultRequired: true },
  { key: 'restaurant_experience', label: 'خبرة سابقة في مجال المطاعم', section: 'job', type: 'checkbox', defaultRequired: false },
  { key: 'experience_years', label: 'إجمالي سنوات الخبرة', section: 'job', type: 'number', defaultRequired: false },
  { key: 'last_job', label: 'آخر وظيفة / مكان عمل', section: 'job', type: 'text', defaultRequired: false },
  { key: 'leaving_reason', label: 'سبب ترك العمل السابق', section: 'job', type: 'text', defaultRequired: false },

  // ---------------- المؤهل الدراسي ----------------
  { key: 'qualification', label: 'المؤهل الدراسي', section: 'education', type: 'select', defaultRequired: true, hasOptions: true },
  { key: 'specialization', label: 'التخصص الدراسي', section: 'education', type: 'text', defaultRequired: true },
  { key: 'graduation_year', label: 'سنة التخرج / السنة الدراسية الحالية', section: 'education', type: 'text', defaultRequired: true },
  { key: 'still_studying', label: 'ما زال طالبًا / يدرس حاليًا', section: 'education', type: 'checkbox', defaultRequired: false },

  // ---------------- الخبرات والمهارات ----------------
  { key: 'experiences', label: 'جدول الخبرات السابقة', section: 'experience', type: 'text', defaultRequired: false, hint: 'جدول (مكان العمل / المسمى / من / إلى / سبب الترك)' },
  { key: 'skills', label: 'المهارات الشخصية والمهنية', section: 'experience', type: 'select', defaultRequired: true, hasOptions: true, multi: true, hint: 'قائمة المهارات المتعددة + خانة "مهارة أخرى"' },

  // ---------------- أوقات العمل ----------------
  { key: 'shifts_preference', label: 'الورديات المفضلة (صباحي / ليلي)', section: 'shifts', type: 'text', defaultRequired: true },
  { key: 'availability', label: 'الاستعداد للعمل (ورديات متغيرة / إضافي / إجازات)', section: 'shifts', type: 'text', defaultRequired: false },

  // ---------------- المرفقات ----------------
  { key: 'doc_id_front', label: 'صورة بطاقة الرقم القومي - الوجه', section: 'attachments', type: 'text', requiredLocked: true, defaultRequired: true },
  { key: 'doc_id_back', label: 'صورة بطاقة الرقم القومي - الظهر', section: 'attachments', type: 'text', defaultRequired: false },
  { key: 'doc_health', label: 'الشهادة الصحية', section: 'attachments', type: 'text', defaultRequired: false },

  // ---------------- الإقرارات ----------------
  {
    key: 'declaration',
    label: 'إقرار صحة البيانات والالتزام بلوائح العمل',
    section: 'declaration',
    type: 'declaration',
    locked: true,
    requiredLocked: true,
    defaultRequired: true,
    defaultContent: DEFAULT_DECLARATION_TEXT,
    hint: 'الإقرار الأساسي — يظهر دائمًا للمتقدم ويمكنك تعديل نصه',
  },
  {
    key: 'declaration_training',
    label: 'إقرار فترة تدريب وتقييم',
    section: 'declaration',
    type: 'declaration',
    defaultRequired: true,
    defaultContent: DEFAULT_TRAINING_DECLARATION_TEXT,
    hint: 'إقرار فترة التدريب والتقييم (3 أيام) — يمكنك تعديل نصه أو إخفاؤه',
  },
];

/** الإعداد الافتراضي الكامل (كل الحقول ظاهرة) */
export function defaultFieldConfig(): FormFieldConfig[] {
  return BUILT_IN_FIELDS.map((f, idx) => ({
    key: f.key,
    label: f.label,
    section: f.section,
    type: f.type,
    required: f.defaultRequired,
    visible: true,
    is_custom: false,
    order: idx,
    options: DEFAULT_FIELD_OPTIONS[f.key] ? [...DEFAULT_FIELD_OPTIONS[f.key]] : [],
    placeholder: '',
    show_in_print: true,
    content: f.defaultContent || '',
  }));
}

/**
 * يدمج الإعداد المحفوظ في قاعدة البيانات مع الحقول المدمجة:
 *  - أي حقل مدمج جديد أضفناه في نسخة أحدث من النظام يظهر تلقائيًا
 *  - أي حقل مخصص أضافه مدير النظام يتم الحفاظ عليه
 *  - الحقول المقفولة تُجبر على الظهور دائمًا مهما كان المحفوظ
 */
export function mergeFieldConfig(saved: FormFieldConfig[] | null | undefined): FormFieldConfig[] {
  const savedList = Array.isArray(saved) ? saved : [];
  const savedMap = new Map(savedList.map(f => [f.key, f]));

  const builtIns: FormFieldConfig[] = BUILT_IN_FIELDS.map((def, idx) => {
    const s = savedMap.get(def.key);
    return {
      key: def.key,
      label: (s?.label || '').trim() || def.label,
      section: def.section,
      type: def.type,
      required: def.requiredLocked ? true : (s?.required ?? def.defaultRequired),
      visible: def.locked ? true : (s?.visible ?? true),
      is_custom: false,
      order: s?.order ?? idx,
      options: def.hasOptions
        ? (Array.isArray(s?.options) && s!.options!.length > 0
            ? s!.options!.map(o => String(o))
            : [...(DEFAULT_FIELD_OPTIONS[def.key] || [])])
        : [],
      placeholder: s?.placeholder || '',
      show_in_print: s?.show_in_print ?? true,
      content:
        def.type === 'declaration'
          ? ((s?.content || '').trim() || def.defaultContent || '')
          : undefined,
    };
  });

  const customs: FormFieldConfig[] = savedList
    .filter(f => f.is_custom)
    .map((f, i) => ({
      key: f.key,
      label: f.label,
      section: f.section,
      type: f.type,
      required: !!f.required,
      visible: f.visible !== false,
      is_custom: true,
      order: f.order ?? 1000 + i,
      options: Array.isArray(f.options) ? f.options : [],
      placeholder: f.placeholder || '',
      show_in_print: f.show_in_print !== false,
      content: f.type === 'declaration' ? (f.content || '') : undefined,
    }));

  return [...builtIns, ...customs];
}

// ============================ Helpers ============================

export function findField(config: FormFieldConfig[], key: string): FormFieldConfig | undefined {
  return config.find(f => f.key === key);
}

/** هل الحقل ظاهر؟ (لو مفيش إعداد محمّل لسه، الافتراضي إنه ظاهر) */
export function isVisible(config: FormFieldConfig[], key: string): boolean {
  const f = findField(config, key);
  if (!f) return true;
  return f.visible !== false;
}

/** هل الحقل إلزامي؟ */
export function isRequired(config: FormFieldConfig[], key: string): boolean {
  const f = findField(config, key);
  if (!f) {
    const def = BUILT_IN_FIELDS.find(b => b.key === key);
    return def ? def.defaultRequired : false;
  }
  if (!isVisible(config, key)) return false; // حقل مخفي لا يُطلب أبدًا
  return !!f.required;
}

/** اسم الحقل المعروض (بعد أي تعديل من مدير النظام) */
export function fieldLabel(config: FormFieldConfig[], key: string, fallback?: string): string {
  const f = findField(config, key);
  if (f && f.label) return f.label;
  const def = BUILT_IN_FIELDS.find(b => b.key === key);
  return fallback || def?.label || key;
}

/**
 * قائمة اختيارات الحقل كما ضبطها مدير النظام (أو الافتراضية).
 * تُستخدم في البوابة العامة وشاشة الأدمن وصفحة الطباعة معًا.
 */
export function fieldOptions(config: FormFieldConfig[], key: string): string[] {
  const f = findField(config, key);
  if (f && Array.isArray(f.options) && f.options.length > 0) return f.options;
  return DEFAULT_FIELD_OPTIONS[key] || [];
}

/** الحقول المخصصة الظاهرة داخل قسم معيّن، مرتبة */
export function customFieldsOf(config: FormFieldConfig[], section: FormSectionKey): FormFieldConfig[] {
  return config
    .filter(f => f.is_custom && f.section === section && f.visible !== false && f.type !== 'declaration')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** كل الحقول المخصصة الظاهرة (للطباعة وشاشة التفاصيل) */
export function allVisibleCustomFields(config: FormFieldConfig[]): FormFieldConfig[] {
  return config
    .filter(f => f.is_custom && f.visible !== false && f.type !== 'declaration')
    .sort((a, b) => {
      const sa = FORM_SECTIONS.findIndex(s => s.key === a.section);
      const sb = FORM_SECTIONS.findIndex(s => s.key === b.section);
      if (sa !== sb) return sa - sb;
      return (a.order ?? 0) - (b.order ?? 0);
    });
}

/** تحويل قيمة حقل مخصص إلى نص للعرض / الطباعة */
export function formatCustomValue(field: FormFieldConfig, value: any): string {
  if (field.type === 'declaration') return value ? 'موافق ✓' : 'لم يوافق';
  if (field.type === 'checkbox') return value ? 'نعم' : 'لا';
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

/**
 * التحقق من الحقول المخصصة الإلزامية داخل قسم.
 * بترجع رسالة الخطأ أو null لو كله تمام.
 */
export function validateCustomFields(
  config: FormFieldConfig[],
  section: FormSectionKey,
  data: Record<string, any> | undefined
): string | null {
  const values = data || {};
  for (const f of customFieldsOf(config, section)) {
    if (!f.required) continue;
    const v = values[f.key];
    if (f.type === 'checkbox') {
      if (!v) return `يرجى الموافقة على: ${f.label}`;
      continue;
    }
    if (v === undefined || v === null || String(v).trim() === '') {
      return `يرجى إدخال: ${f.label}`;
    }
  }
  return null;
}

/** مفتاح فريد لحقل مخصص جديد */
export function generateCustomFieldKey(label: string): string {
  const slug = label
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0600-\u06FF_]/g, '')
    .slice(0, 24) || 'field';
  return `cf_${slug}_${Date.now().toString(36)}`;
}

// ============================ الإقرارات (Declarations) ============================

/** مفتاح الإقرار الأساسي المخزّن في عمود declaration_accepted */
export const PRIMARY_DECLARATION_KEY = 'declaration';

/**
 * كل الإقرارات الظاهرة (الأساسي + أي إقرار أضافه أو عدّله مدير النظام)،
 * مرتبة بنفس الترتيب في البوابة العامة وشاشة التفاصيل والورقة المطبوعة.
 */
export function declarationFields(config: FormFieldConfig[]): FormFieldConfig[] {
  return config
    .filter(f => f.type === 'declaration' && f.visible !== false)
    .sort((a, b) => {
      // الإقرار الأساسي دائمًا أولًا
      if (a.key === PRIMARY_DECLARATION_KEY) return -1;
      if (b.key === PRIMARY_DECLARATION_KEY) return 1;
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
}

/**
 * هل وافق المتقدم على إقرار معيّن؟
 * الإقرار الأساسي محفوظ في العمود declaration_accepted، وباقي الإقرارات
 * محفوظة داخل custom_data بمفتاح الإقرار.
 */
export function isDeclarationAccepted(
  field: FormFieldConfig,
  primaryAccepted: boolean | undefined,
  customData: Record<string, any> | undefined
): boolean {
  if (field.key === PRIMARY_DECLARATION_KEY) return !!primaryAccepted;
  return !!customData?.[field.key];
}

/** نص الإقرار كما ضبطه مدير النظام (أو الافتراضي) */
export function declarationText(field: FormFieldConfig): string {
  if (field.content && field.content.trim()) return field.content;
  const def = BUILT_IN_FIELDS.find(b => b.key === field.key);
  return def?.defaultContent || '';
}

/**
 * التحقق من الموافقة على كل الإقرارات الإلزامية الظاهرة.
 * ترجع رسالة الخطأ أو null.
 */
export function validateDeclarations(
  config: FormFieldConfig[],
  primaryAccepted: boolean | undefined,
  customData: Record<string, any> | undefined
): string | null {
  for (const f of declarationFields(config)) {
    if (!f.required) continue;
    if (!isDeclarationAccepted(f, primaryAccepted, customData)) {
      return `يجب قراءة والموافقة على: ${f.label}`;
    }
  }
  return null;
}

/** مفتاح فريد لإقرار جديد */
export function generateDeclarationKey(label: string): string {
  const slug = label
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0600-\u06FF_]/g, '')
    .slice(0, 24) || 'declaration';
  return `decl_${slug}_${Date.now().toString(36)}`;
}
