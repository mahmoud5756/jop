import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Applicant, ApplicantDocument } from '../types';
import { SvgIcons } from './BobWichLogo';

interface DocumentsPrintViewProps {
  applicant: Applicant;
  onBack: () => void;
}

/**
 * طباعة مستندات المتقدم / الموظف:
 *   - بطاقة الرقم القومي: الوش والظهر على نفس الورقة (زي تصوير البطاقة) بمقاس
 *     الكارنية الحقيقي 85.6 × 54 مم (أو مكبّر).
 *   - الشهادة الصحية: على صفحة A4 مستقلة (أو مدمجة تحت البطاقة).
 *   - أي مستندات مرفقة تانية (اختياري).
 *
 * الصور بتتقرأ من المرفقات المحفوظة (نفس اللي بيرفعها المتقدم أو الأدمن)،
 * ومفيش أي رفع جديد هنا.
 */

// ── مقاسات الورقة (A4 بهامش 10 مم من كل ناحية) ─────────────────────────────
const PAGE_W = 190; // مم
const PAGE_H = 276; // مم (277 المتاحة − 1 مم أمان عشان ما تطلعش صفحة فاضية زيادة)
const CARD_W = 85.6; // مم — مقاس كارت CR80 (نفس البطاقة القومية)
const CARD_H = 54; // مم
const CARD_GAP = 8; // مم بين الوش والظهر
const HEADER_H = 9; // مم — العنوان الصغير أعلى الورقة
const ID_TOP_PAD = 8; // مم

const FRONT_TYPE = 'صورة بطاقة الرقم القومي - الوجه';
const BACK_TYPE = 'صورة بطاقة الرقم القومي - الظهر';
const LEGACY_ID_TYPE = 'صورة بطاقة الرقم القومي';
const HEALTH_TYPE = 'شهادة صحية';

const docKey = (d: ApplicantDocument, i: number) => d.id || d.file_url || `doc_${i}`;

const uploadedTime = (d: ApplicantDocument) => {
  const t = new Date(d.uploaded_at || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const isPdfDoc = (d: ApplicantDocument) => {
  const url = (d.file_url || '').split('?')[0].toLowerCase();
  return (
    url.endsWith('.pdf') ||
    (d.file_name || '').toLowerCase().endsWith('.pdf') ||
    (d.file_url || '').startsWith('data:application/pdf')
  );
};

const lastOf = <T,>(list: T[]): T | undefined => (list.length ? list[list.length - 1] : undefined);

// ── صورة داخل إطار بمقاس ثابت بالمللي، مع تدوير + تكبير + تحريك (سحب) ─────────
interface ImageView {
  /** التكبير (1 = زي ما اختار: كاملة أو ملء الإطار) */
  z: number;
  /** الإزاحة الأفقية بالمللي (موجب = الصورة تتحرك يمين) */
  tx: number;
  /** الإزاحة الرأسية بالمللي (موجب = الصورة تنزل لتحت) */
  ty: number;
}

const DEFAULT_VIEW: ImageView = { z: 1, tx: 0, ty: 0 };
const MAX_ZOOM = 4;
const PX_TO_MM = 25.4 / 96;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface DocImageProps {
  src: string;
  w: number;
  h: number;
  rotation: number;
  fit: 'contain' | 'cover';
  radius?: number;
  alt: string;
  view: ImageView;
  onViewChange: (v: ImageView) => void;
}

const DocImage: React.FC<DocImageProps> = ({
  src,
  w,
  h,
  rotation,
  fit,
  radius = 0,
  alt,
  view,
  onViewChange,
}) => {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  // آخر قيمة للـ view — عشان السحب السريع ما يشتغلش على قيمة قديمة
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    setNatural(null);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth) {
      setNatural({ w: el.naturalWidth, h: el.naturalHeight });
    }
  }, [src]);

  const swapped = rotation % 180 !== 0;

  // أبعاد الصورة بعد التكبير، وحدود الإزاحة المسموحة (عشان الصورة ما تسيبش فراغ جوه الإطار)
  let imgW = w;
  let imgH = h;
  let limitX = 0;
  let limitY = 0;
  if (natural) {
    const visW0 = swapped ? natural.h : natural.w;
    const visH0 = swapped ? natural.w : natural.h;
    const base = fit === 'cover' ? Math.max(w / visW0, h / visH0) : Math.min(w / visW0, h / visH0);
    const scale = base * view.z;
    imgW = natural.w * scale; // أبعاد العنصر قبل التدوير
    imgH = natural.h * scale;
    limitX = Math.max(0, (visW0 * scale - w) / 2);
    limitY = Math.max(0, (visH0 * scale - h) / 2);
  }
  const tx = clamp(view.tx, -limitX, limitX);
  const ty = clamp(view.ty, -limitY, limitY);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const last = dragRef.current;
    if (!last) return;
    const dx = (e.clientX - last.x) * PX_TO_MM;
    const dy = (e.clientY - last.y) * PX_TO_MM;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const cur = viewRef.current;
    const next = {
      ...cur,
      tx: clamp(cur.tx + dx, -limitX, limitX),
      ty: clamp(cur.ty + dy, -limitY, limitY),
    };
    viewRef.current = next;
    onViewChange(next);
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      title="اسحب الصورة لتحريكها"
      style={{
        position: 'relative',
        width: `${w}mm`,
        height: `${h}mm`,
        overflow: 'hidden',
        borderRadius: radius ? `${radius}mm` : 0,
        background: '#fff',
        cursor: natural ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        referrerPolicy="no-referrer"
        onLoad={e => {
          const el = e.currentTarget;
          if (el.naturalWidth) setNatural({ w: el.naturalWidth, h: el.naturalHeight });
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          // قبل ما تتحمّل الصورة (ملهاش أبعاد لسه) بنعرضها بالملء العادي
          width: natural ? `${imgW}mm` : `${swapped ? h : w}mm`,
          height: natural ? `${imgH}mm` : `${swapped ? w : h}mm`,
          // Tailwind preflight بيحط max-width:100% على الصور، وده بيبوّظ التدوير والتكبير
          maxWidth: 'none',
          maxHeight: 'none',
          objectFit: natural ? 'fill' : fit,
          pointerEvents: 'none',
          userSelect: 'none',
          // الإزاحة في مساحة الشاشة (قبل التدوير) فالاتجاهات دايمًا بديهية
          transform: `translate(-50%, -50%) translate(${tx}mm, ${ty}mm) rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
};

// ── ورقة A4 (على الشاشة بتظهر كورقة بيضاء، وفي الطباعة بتتحول لصفحة) ─────────
const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="docs-page-wrap bg-white shadow-2xl mx-auto"
    style={{ padding: '10mm', boxSizing: 'content-box' }}
  >
    <div
      className="docs-page relative"
      style={{ width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, overflow: 'hidden' }}
    >
      {children}
    </div>
  </div>
);

export const DocumentsPrintView: React.FC<DocumentsPrintViewProps> = ({ applicant, onBack }) => {
  // ── تصنيف المرفقات ────────────────────────────────────────────────────────
  const docs = useMemo(
    () =>
      (applicant.documents || [])
        .filter(d => d && d.file_url)
        .slice()
        .sort((a, b) => uploadedTime(a) - uploadedTime(b)),
    [applicant.documents],
  );

  const {
    frontDoc,
    backDoc,
    healthImgs,
    otherImgs,
    pdfDocs,
  } = useMemo(() => {
    const images = docs.filter(d => !isPdfDoc(d));
    // لو اترفع أكتر من مرفق من نفس النوع بناخد آخر واحد (الأحدث)
    const front =
      lastOf(images.filter(d => d.document_type === FRONT_TYPE)) ||
      lastOf(images.filter(d => d.document_type === LEGACY_ID_TYPE));
    const back = lastOf(images.filter(d => d.document_type === BACK_TYPE));
    const health = images.filter(d => d.document_type === HEALTH_TYPE);
    const idTypes = [FRONT_TYPE, BACK_TYPE, LEGACY_ID_TYPE, HEALTH_TYPE];
    const others = images.filter(d => !idTypes.includes(d.document_type));
    const pdfs = docs.filter(isPdfDoc);
    return { frontDoc: front, backDoc: back, healthImgs: health, otherImgs: others, pdfDocs: pdfs };
  }, [docs]);

  // ── خيارات الطباعة ────────────────────────────────────────────────────────
  const [includeId, setIncludeId] = useState<boolean>(Boolean(frontDoc || backDoc));
  const [includeHealth, setIncludeHealth] = useState<boolean>(healthImgs.length > 0);
  const [otherSel, setOtherSel] = useState<Record<string, boolean>>({});
  const [idScale, setIdScale] = useState<1 | 1.5 | 2>(1);
  const [idFit, setIdFit] = useState<'contain' | 'cover'>('contain');
  const [healthPct, setHealthPct] = useState<100 | 75 | 50>(100);
  const [merge, setMerge] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [swapFaces, setSwapFaces] = useState(false);
  const [rot, setRot] = useState<Record<string, number>>({});
  // تكبير وتحريك كل صورة لوحدها (بالسحب) عشان تملا المربع زي ما تحب
  const [views, setViews] = useState<Record<string, ImageView>>({});

  // الدمج في ورقة واحدة مناسب بس مع الحجم الحقيقي للبطاقة (المساحة المتبقية كافية)
  const canMerge = idScale === 1;
  const mergeActive = merge && canMerge && includeId && includeHealth && healthImgs.length > 0;

  // إغلاق بمفتاح Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const viewOf = (key: string): ImageView => views[key] || DEFAULT_VIEW;
  const setView = (key: string, v: ImageView) => setViews(prev => ({ ...prev, [key]: v }));

  const rotate = (key: string, delta: number) => {
    setRot(prev => ({ ...prev, [key]: (((prev[key] || 0) + delta) % 360 + 360) % 360 }));
    // بعد التدوير بنصفّر التحريك (التكبير بيفضل)
    setViews(prev => ({ ...prev, [key]: { ...(prev[key] || DEFAULT_VIEW), tx: 0, ty: 0 } }));
  };

  const zoom = (key: string, delta: number) => {
    const cur = viewOf(key);
    setView(key, { ...cur, z: clamp(Math.round((cur.z + delta) * 100) / 100, 1, MAX_ZOOM) });
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 50);
  };

  // ── عناصر مشتركة ─────────────────────────────────────────────────────────
  const headerH = showHeader ? HEADER_H : 0;

  const renderHeader = (title: string) =>
    showHeader ? (
      <div
        className="flex items-center justify-between border-b border-stone-300 text-stone-500"
        style={{ height: `${HEADER_H}mm`, fontSize: '8pt' }}
      >
        <span className="font-black tracking-wider text-stone-700">BOB WICH</span>
        <span>
          {applicant.full_name}
          {applicant.application_code ? ` — ${applicant.application_code}` : ''}
        </span>
        <span>{title}</span>
      </div>
    ) : null;

  const ctrlBtn =
    'bg-stone-900/70 hover:bg-stone-900 text-white w-6 h-6 rounded-md text-sm leading-none flex items-center justify-center';

  // أدوات كل صورة (بتظهر على الشاشة بس ومش بتتطبع): تدوير + تكبير/تصغير + رجوع للوضع الأصلي
  const renderRotateControls = (key: string, outside = false) => (
    <div
      className={`print:hidden absolute z-10 flex gap-1 ${outside ? '-top-7 left-0' : 'top-1 left-1'}`}
    >
      <button type="button" onClick={() => rotate(key, -90)} className={ctrlBtn} title="تدوير 90° لليسار">
        ↺
      </button>
      <button type="button" onClick={() => rotate(key, 90)} className={ctrlBtn} title="تدوير 90° لليمين">
        ↻
      </button>
      <button type="button" onClick={() => zoom(key, 0.15)} className={ctrlBtn} title="تكبير الصورة">
        +
      </button>
      <button type="button" onClick={() => zoom(key, -0.15)} className={ctrlBtn} title="تصغير الصورة">
        −
      </button>
      <button
        type="button"
        onClick={() => setView(key, DEFAULT_VIEW)}
        className={ctrlBtn}
        title="رجوع للوضع الأصلي (بدون تكبير أو تحريك)"
      >
        ⟲
      </button>
    </div>
  );

  // كارت واحد (وش أو ظهر) بمقاس الكارنية
  const renderCard = (label: string, doc: ApplicantDocument | undefined) => {
    const cw = CARD_W * idScale;
    const ch = CARD_H * idScale;
    const key = doc ? docKey(doc, docs.indexOf(doc)) : '';
    return (
      <div className="relative" style={{ width: `${cw}mm`, height: `${ch}mm` }}>
        {doc ? (
          <DocImage
            src={doc.file_url}
            w={cw}
            h={ch}
            rotation={rot[key] || 0}
            fit={idFit}
            radius={3.2}
            alt={label}
            view={viewOf(key)}
            onViewChange={v => setView(key, v)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[11px] font-bold text-stone-400"
            style={{ borderRadius: '3.2mm' }}
          >
            <span className="print:hidden">{label} — غير مرفوع</span>
          </div>
        )}
        {/* إطار رفيع كعلامة قص (فوق الصورة عشان ما يتأثرش بالتدوير) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: `0.3mm ${doc ? 'solid' : 'dashed'} #a8a29e`,
            borderRadius: '3.2mm',
          }}
        />
        {doc && renderRotateControls(key, true)}
        <span className="print:hidden absolute -top-4 right-0 text-[10px] font-bold text-stone-400">
          {label}
        </span>
      </div>
    );
  };

  // مستند بحجم الصفحة (شهادة صحية / مستند تاني)
  const renderFullDoc = (doc: ApplicantDocument, boxW: number, boxH: number) => {
    const key = docKey(doc, docs.indexOf(doc));
    return (
      <div className="relative mx-auto" style={{ width: `${boxW}mm`, height: `${boxH}mm` }}>
        <DocImage
          src={doc.file_url}
          w={boxW}
          h={boxH}
          rotation={rot[key] || 0}
          fit="contain"
          alt={doc.document_type}
          view={viewOf(key)}
          onViewChange={v => setView(key, v)}
        />
        {renderRotateControls(key)}
      </div>
    );
  };

  const fullBoxW = (pct: number) => (PAGE_W * pct) / 100;
  const fullBoxH = (pct: number) => ((PAGE_H - headerH - 3) * pct) / 100;

  // ── بناء الصفحات ─────────────────────────────────────────────────────────
  const pages: React.ReactNode[] = [];

  if (includeId) {
    const topDoc = swapFaces ? backDoc : frontDoc;
    const bottomDoc = swapFaces ? frontDoc : backDoc;
    const idBlockH = CARD_H * idScale * 2 + CARD_GAP;
    const mergedHealth = mergeActive ? healthImgs[0] : undefined;
    // المساحة المتبقية تحت البطاقة للشهادة الصحية لو الدمج مفعّل
    const mergedBoxH = PAGE_H - headerH - ID_TOP_PAD - idBlockH - 8 - 3;

    pages.push(
      <PageShell key="id-page">
        {renderHeader('صورة بطاقة الرقم القومي')}
        <div
          className="flex flex-col items-center"
          style={{ paddingTop: `${ID_TOP_PAD}mm`, gap: `${CARD_GAP}mm` }}
        >
          {renderCard('وش البطاقة', topDoc)}
          {renderCard('ظهر البطاقة', bottomDoc)}
        </div>
        {mergedHealth && (
          <div style={{ marginTop: '8mm' }}>{renderFullDoc(mergedHealth, PAGE_W, mergedBoxH)}</div>
        )}
      </PageShell>,
    );
  }

  if (includeHealth) {
    const list = mergeActive ? healthImgs.slice(1) : healthImgs;
    list.forEach((doc, i) => {
      pages.push(
        <PageShell key={`health-${docKey(doc, i)}`}>
          {renderHeader('الشهادة الصحية')}
          <div style={{ paddingTop: showHeader ? '3mm' : 0 }}>
            {renderFullDoc(doc, fullBoxW(healthPct), fullBoxH(healthPct))}
          </div>
        </PageShell>,
      );
    });
  }

  otherImgs.forEach((doc, i) => {
    const key = docKey(doc, docs.indexOf(doc));
    if (!otherSel[key]) return;
    pages.push(
      <PageShell key={`other-${key}-${i}`}>
        {renderHeader(doc.document_type || 'مستند')}
        <div style={{ paddingTop: showHeader ? '3mm' : 0 }}>
          {renderFullDoc(doc, fullBoxW(100), fullBoxH(100))}
        </div>
      </PageShell>,
    );
  });

  // ── واجهة الاختيارات ─────────────────────────────────────────────────────
  const chip = (ok: boolean, text: string) => (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
        ok
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-stone-100 text-stone-400 border-stone-200'
      }`}
    >
      {text}
    </span>
  );

  const selectCls =
    'bg-stone-50 rounded-lg px-2.5 py-1.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  return (
    <div
      className="print-root fixed inset-0 z-70 overflow-auto bg-stone-900/85 backdrop-blur-xs p-3 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible"
      dir="rtl"
    >
      {/* قواعد الطباعة الخاصة بالمستندات — A4 بهامش 10 مم */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .docs-sheet {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }
          .docs-page-wrap {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
          .docs-page-wrap:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* ============ شريط الأدوات + الاختيارات (لا يُطبع) ============ */}
      <div className="print:hidden max-w-4xl mx-auto space-y-3 mb-6">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-black text-stone-900 text-sm truncate">
              طباعة مستندات: {applicant.full_name}
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              {applicant.application_code} · {pages.length} {pages.length === 1 ? 'ورقة' : 'أوراق'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={pages.length === 0}
              className="bg-[#9E1A24] hover:bg-[#85151e] disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all"
            >
              <SvgIcons.Print className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onBack}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
            >
              <SvgIcons.XMark className="w-4 h-4" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4 space-y-4 text-xs">
          {/* اختيار المستندات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                includeId ? 'border-[#9E1A24] bg-red-50/40' : 'border-stone-200 bg-stone-50'
              }`}
            >
              <input
                type="checkbox"
                checked={includeId}
                onChange={e => setIncludeId(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#9E1A24]"
              />
              <div className="space-y-1.5">
                <div className="font-black text-stone-900">بطاقة الرقم القومي (وش وضهر)</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {chip(Boolean(frontDoc), frontDoc ? 'الوش مرفوع' : 'الوش غير مرفوع')}
                  {chip(Boolean(backDoc), backDoc ? 'الظهر مرفوع' : 'الظهر غير مرفوع')}
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                includeHealth ? 'border-[#9E1A24] bg-red-50/40' : 'border-stone-200 bg-stone-50'
              }`}
            >
              <input
                type="checkbox"
                checked={includeHealth}
                onChange={e => setIncludeHealth(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#9E1A24]"
              />
              <div className="space-y-1.5">
                <div className="font-black text-stone-900">الشهادة الصحية</div>
                <div>
                  {chip(
                    healthImgs.length > 0,
                    healthImgs.length > 0
                      ? `${healthImgs.length} ${healthImgs.length === 1 ? 'صورة مرفوعة' : 'صور مرفوعة'}`
                      : 'غير مرفوعة',
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* مستندات أخرى */}
          {otherImgs.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-stone-600">مستندات أخرى (اختياري — كل مستند في ورقة):</div>
              <div className="flex flex-wrap gap-2">
                {otherImgs.map((doc, i) => {
                  const key = docKey(doc, docs.indexOf(doc));
                  return (
                    <label
                      key={`${key}-${i}`}
                      className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(otherSel[key])}
                        onChange={e => setOtherSel(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-3.5 h-3.5 accent-[#9E1A24]"
                      />
                      <span className="font-semibold text-stone-700">
                        {doc.document_type || 'مستند'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ملفات PDF: مش بتتطبع من هنا */}
          {pdfDocs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
              <div className="font-bold text-amber-900">
                فيه ملفات PDF مرفوعة — دي بتتفتح وتتطبع من تبويب لوحدها:
              </div>
              <div className="flex flex-wrap gap-2">
                {pdfDocs.map((doc, i) => (
                  <a
                    key={`${doc.id || doc.file_url}-${i}`}
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-bold"
                  >
                    {doc.document_type || 'PDF'} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* الإعدادات */}
          <div className="border-t border-stone-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-600">حجم البطاقة</span>
              <select
                value={idScale}
                onChange={e => {
                  const v = Number(e.target.value) as 1 | 1.5 | 2;
                  setIdScale(v);
                  if (v !== 1) setMerge(false);
                }}
                className={selectCls}
              >
                <option value={1}>الحجم الحقيقي (85.6 × 54 مم)</option>
                <option value={1.5}>مكبّر 150%</option>
                <option value={2}>مكبّر 200%</option>
              </select>
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-600">شكل الصورة داخل الإطار</span>
              <select
                value={idFit}
                onChange={e => setIdFit(e.target.value as 'contain' | 'cover')}
                className={selectCls}
              >
                <option value="contain">الصورة كاملة (بدون قص)</option>
                <option value="cover">ملء إطار البطاقة (قص الزوائد)</option>
              </select>
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-600">حجم الشهادة الصحية</span>
              <select
                value={healthPct}
                onChange={e => setHealthPct(Number(e.target.value) as 100 | 75 | 50)}
                className={selectCls}
              >
                <option value={100}>عرض الصفحة كاملة</option>
                <option value={75}>75%</option>
                <option value={50}>50%</option>
              </select>
            </label>

            <div className="flex items-center gap-4 flex-wrap">
              <label
                className={`flex items-center gap-1.5 ${canMerge ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                title={canMerge ? '' : 'الدمج متاح مع الحجم الحقيقي للبطاقة فقط'}
              >
                <input
                  type="checkbox"
                  checked={merge && canMerge}
                  disabled={!canMerge}
                  onChange={e => setMerge(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#9E1A24]"
                />
                <span className="font-bold text-stone-600">البطاقة والشهادة في ورقة واحدة</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeader}
                  onChange={e => setShowHeader(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#9E1A24]"
                />
                <span className="font-bold text-stone-600">اسم المتقدم أعلى كل ورقة</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={() => setSwapFaces(v => !v)}
              disabled={!includeId}
              className="bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 px-3 py-1.5 rounded-lg font-bold"
              title="لو الوش والظهر اترفعوا بالعكس"
            >
              ⇅ تبديل الوش والظهر
            </button>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              في نافذة الطباعة اختر ورق <strong>A4</strong> وتأكد إن <strong>Scale = 100%</strong>{' '}
              (مش «Fit to page») عشان مقاس البطاقة يطلع حقيقي. على كل صورة: <strong>اسحبها</strong> بالماوس أو صباعك لتحريكها لفوق/تحت/جنب، و<strong>+ −</strong> للتكبير، و↻ للتدوير، و⟲ للرجوع للوضع الأصلي.
            </p>
          </div>
        </div>
      </div>

      {/* ============ الأوراق ============ */}
      {pages.length === 0 ? (
        <div className="print:hidden max-w-md mx-auto bg-white rounded-2xl p-8 text-center text-sm text-stone-600 shadow-xl">
          مفيش مستندات مختارة للطباعة. اختار بطاقة الرقم القومي أو الشهادة الصحية من فوق
          {docs.length === 0 && ' — ولسه مفيش أي مرفقات مرفوعة للمتقدم ده.'}
        </div>
      ) : (
        <div className="docs-sheet flex flex-col gap-6">{pages}</div>
      )}
    </div>
  );
};
