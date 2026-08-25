import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await ApiService.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      log.user_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes('إنشاء') || action.includes('create')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (action.includes('تعديل') || action.includes('update')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (action.includes('حذف') || action.includes('delete')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (action.includes('تحويل') || action.includes('convert')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
            <span>سجل العمليات والتدقيق (Audit Logs)</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            سجل إلكتروني دقيق لجميع التعديلات، إدخال الطلبات، القرارات، وعمليات التحويل للموظفين
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="ابحث في سجل العمليات باسم المستخدم، نوع العملية، أو التفاصيل..."
          className="w-full bg-stone-50 rounded-xl pr-10 pl-4 py-2.5 border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
        />
        <div className="absolute right-7 top-7 text-stone-400">
          <SvgIcons.Search className="w-4 h-4" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm">جاري تحميل سجل العمليات...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">لا توجد سجلات مسجلة حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">الدور الوظيفي</th>
                  <th className="py-3.5 px-4">نوع العملية</th>
                  <th className="py-3.5 px-4">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">{log.user_name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-mono text-[11px]">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
