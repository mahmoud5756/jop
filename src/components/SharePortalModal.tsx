import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { SvgIcons, BobWichHeaderLogo } from './BobWichLogo';

interface SharePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharePortalModal: React.FC<SharePortalModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Compute public link
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=apply`
    : '';

  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#9E1A24',
          light: '#FFFFFF',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [publicUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'BOB_WICH_Job_Application_QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintFlyer = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>بوستر التقديم للوظائف - مطاعم BOB WICH</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; color: #1c1917; margin: 0; padding: 20px; }
            .box { border: 4px solid #9E1A24; border-radius: 24px; padding: 40px 30px; }
            .brand { color: #9E1A24; font-size: 38px; font-weight: 900; margin-bottom: 5px; }
            .tagline { font-size: 20px; color: #78716c; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 800; background: #9E1A24; color: white; padding: 12px 24px; border-radius: 16px; display: inline-block; margin-bottom: 25px; }
            .qr-img { width: 280px; height: 280px; border: 2px solid #e7e5e4; border-radius: 16px; padding: 10px; margin: 0 auto 20px; }
            .scan-text { font-size: 22px; font-weight: 700; color: #9E1A24; margin-bottom: 10px; }
            .sub-text { font-size: 16px; color: #57534e; line-height: 1.6; max-width: 500px; margin: 0 auto 25px; }
            .url-box { font-size: 14px; font-family: monospace; background: #f5f5f4; padding: 10px; border-radius: 8px; direction: ltr; word-break: break-all; }
            .footer { margin-top: 30px; font-size: 14px; color: #a8a29e; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="brand">BOB WICH</div>
            <div class="tagline">مطاعم بوب ويتش - قسم الموارد البشرية والتوظيف</div>
            <div class="title">انضم إلى فريق عمل بوب ويتش</div>
            <div>
              <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="scan-text">امسح الكود بكاميرا هاتفك للتقديم فوراً</div>
            <div class="sub-text">
              نبحث عن كفاءات متميزة في فروعنا (كاشير، شيفات، تجهيز طعام، خدمة عملاء، إشراف).<br>
              املأ الاستمارة الإلكترونية وسنقوم بالتواصل معك لتحديد موعد المقابلة.
            </div>
            <div class="url-box">${publicUrl}</div>
            <div class="footer">BOB WICH Restaurants • Human Resources Department</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs font-sans dir-rtl" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="bg-[#9E1A24] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <SvgIcons.Share className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-black">رابط التقديم والـ QR Code للجمهور</h3>
              <p className="text-xs text-amber-200">شارك هذا الرابط أو الكود في الفروع ومواقع التواصل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Printable Preview Section */}
          <div ref={printRef} className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            {qrDataUrl ? (
              <div className="bg-white p-2 rounded-2xl border-2 border-[#9E1A24]/30 shadow-xs flex-shrink-0">
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-xl" />
              </div>
            ) : (
              <div className="w-40 h-40 bg-stone-200 rounded-2xl animate-pulse flex items-center justify-center text-xs text-stone-500">
                جاري التوليد...
              </div>
            )}

            <div className="space-y-2 text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                رمز استجابة سريعة فوري (QR Code)
              </span>
              <h4 className="font-bold text-stone-900 text-sm">
                امسح الكود بكاميرا الموبايل للتقديم
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                أي متقدم يمسح الكود بكاميرا هاتفه سيتم تحويله فوراً لاستمارة التقديم الرسمية دون الوصول للوحة تحكم الإدارة.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <SvgIcons.Download className="w-3.5 h-3.5" />
                  <span>تحميل الـ QR كصورة</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintFlyer}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#9E1A24] text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <SvgIcons.Printer className="w-3.5 h-3.5" />
                  <span>طباعة بوستر للفروع</span>
                </button>
              </div>
            </div>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700">رابط استمارة التقديم العامة المباشر:</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono text-stone-700 select-all"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#9E1A24] hover:bg-[#80141D] text-white shadow-xs'
                }`}
              >
                <span>{copied ? '✓ تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>

          {/* Direct Test in New Window */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800">
              تريد تجربة استمارة التقديم كمرشح جديد؟
            </span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-stone-900 font-bold flex items-center gap-1 transition-all"
            >
              <span>فتح البوابة في نافذة جديدة</span>
              <span>↗</span>
            </a>
          </div>

          {/* Close button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
