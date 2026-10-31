import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';

export interface PdfReportColumn<T> {
  label: string;
  value: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface PdfReportButtonProps<T> {
  title: string;
  subtitle?: string;
  columns: PdfReportColumn<T>[];
  rows: T[];
  disabled?: boolean;
  buttonLabel?: string;
  buttonClassName?: string;
}

const printStyles = `
@page { size: A4 landscape; margin: 11mm; }
@media print {
  html, body { background: #fff !important; }
  body.pdf-report-printing * { visibility: hidden !important; }
  body.pdf-report-printing #pdf-report-root,
  body.pdf-report-printing #pdf-report-root * { visibility: visible !important; }
  body.pdf-report-printing .pdf-report-overlay {
    position: static !important; inset: auto !important; display: block !important;
    overflow: visible !important; width: auto !important; height: auto !important;
    padding: 0 !important; background: #fff !important;
  }
  body.pdf-report-printing #pdf-report-root {
    position: absolute !important; inset: 0 auto auto 0 !important;
    width: 100% !important; max-width: none !important; margin: 0 !important;
    overflow: visible !important; border: 0 !important; box-shadow: none !important;
    border-radius: 0 !important; background: #fff !important;
  }
  body.pdf-report-printing .pdf-report-actions { display: none !important; }
  body.pdf-report-printing .pdf-report-table { font-size: 8.5pt !important; }
  body.pdf-report-printing .pdf-report-table thead { display: table-header-group; }
  body.pdf-report-printing .pdf-report-table tr { break-inside: avoid; page-break-inside: avoid; }
  body.pdf-report-printing .pdf-report-table th,
  body.pdf-report-printing .pdf-report-table td { padding: 5px 7px !important; }
}
`;

/** A filtered report preview that can be printed or saved as PDF from the browser dialog. */
export function PdfReportButton<T>({
  title,
  subtitle,
  columns,
  rows,
  disabled = false,
  buttonLabel = 'تقرير PDF',
  buttonClassName = '',
}: PdfReportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const safeRows = Array.isArray(rows) ? rows : [];

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousTitle = document.title;
    document.title = `${title} - BOB WICH`;
    document.body.classList.add('pdf-report-printing');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.classList.remove('pdf-report-printing');
      document.title = previousTitle;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, title]);

  const print = () => {
    window.print();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled || safeRows.length === 0}
        aria-label={`${buttonLabel}: ${title} (${safeRows.length} سجل)`}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#9E1A24] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#85151e] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>{buttonLabel}{safeRows.length ? ` (${safeRows.length})` : ''}</span>
      </button>

      {isOpen && (
        <div className="pdf-report-overlay fixed inset-0 z-[100] overflow-auto bg-stone-900/60 p-2 sm:p-5 print:static print:overflow-visible print:bg-white print:p-0">
          <style>{printStyles}</style>
          <section
            id="pdf-report-root"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-report-title"
            dir="rtl"
            className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
          >
            <header className="border-b-4 border-[#9E1A24] px-5 py-5 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black tracking-[0.16em] text-[#9E1A24]">BOB WICH · الموارد البشرية</div>
                  <h1 id="pdf-report-title" className="mt-1 text-2xl font-black text-stone-900">{title}</h1>
                  {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
                </div>
                <div className="text-left text-xs leading-6 text-stone-500">
                  <div>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</div>
                  <div>عدد السجلات: {safeRows.length.toLocaleString('ar-EG')}</div>
                </div>
              </div>
            </header>

            <div className="pdf-report-actions flex flex-wrap items-center justify-end gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
              <button ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100">
                <X className="h-4 w-4" aria-hidden="true" /> إغلاق
              </button>
              <button type="button" onClick={print} className="inline-flex items-center gap-2 rounded-lg bg-[#9E1A24] px-4 py-2 text-sm font-bold text-white hover:bg-[#85151e]">
                <Printer className="h-4 w-4" aria-hidden="true" /> طباعة / حفظ PDF
              </button>
            </div>

            <div className="p-4 sm:p-6 print:p-0">
              {safeRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-stone-500">لا توجد سجلات مطابقة للطباعة.</div>
              ) : (
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="pdf-report-table w-full border-collapse text-right text-xs text-stone-800">
                    <thead>
                      <tr className="bg-stone-100 text-stone-900">
                        <th className="border border-stone-300 px-2 py-2 text-center">م</th>
                        {columns.map((column, index) => (
                          <th key={`${column.label}-${index}`} className={`border border-stone-300 px-2 py-2 font-black ${column.className || ''}`}>
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {safeRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 1 ? 'bg-stone-50' : 'bg-white'}>
                          <td className="border border-stone-200 px-2 py-2 text-center font-mono text-stone-500">{(rowIndex + 1).toLocaleString('ar-EG')}</td>
                          {columns.map((column, columnIndex) => (
                            <td key={`${column.label}-${columnIndex}`} className={`border border-stone-200 px-2 py-2 align-top ${column.className || ''}`}>
                              {column.value(row, rowIndex) ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <footer className="mt-4 border-t border-stone-200 pt-2 text-[10px] text-stone-500">
                تقرير مولّد من نظام BOB WICH لإدارة الموارد البشرية.
              </footer>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
