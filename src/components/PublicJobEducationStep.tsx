import React from 'react';
import { Applicant, Branch, JobPosition, FormFieldConfig } from '../types';
import { SharedInput, SharedSelect, YesNoField } from './ApplicantFormControls';
import { CustomFieldsInputs } from './CustomFieldsRenderer';

type FormDataUpdater = React.Dispatch<React.SetStateAction<Partial<Applicant>>>;

interface PublicJobEducationStepProps {
  formData: Partial<Applicant>;
  onFormDataChange: FormDataUpdater;
  branches: Branch[];
  positions: JobPosition[];
  config: FormFieldConfig[];
  customValues: Record<string, any>;
  show: (key: string) => boolean;
  req: (key: string) => boolean;
  lbl: (key: string, fallback?: string) => string;
  opts: (key: string) => string[];
  onCustomChange: (key: string, value: any) => void;
  showEducation: boolean;
}

const PublicJobEducationStep: React.FC<PublicJobEducationStepProps> = ({
  formData, onFormDataChange, branches, positions, config, customValues,
  show, req, lbl, opts, onCustomChange, showEducation,
}) => {
  const Req: React.FC<{ k: string }> = ({ k }) =>
    req(k) ? <span className="text-red-500">*</span> : null;
  return (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">2</span>
              الوظيفة المطلوبة والمؤهل الدراسي
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                {lbl('branch_name', 'الفرع المفضل للعمل به')} <span className="text-red-500">*</span>
              </label>
              <SharedSelect
                value={formData.branch_name || ''}
                onChange={e => {
                  const selBranch = branches.find(b => b.name === e.target.value);
                  onFormDataChange(prev => ({
                    ...prev,
                    branch_id: selBranch?.id || '',
                    branch_name: e.target.value,
                  }));
                }}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
              >
                <option value="" disabled>اختر الفرع من القائمة</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </SharedSelect>
            </div>

            {/* Position */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                {lbl('position_name')} <span className="text-red-500">*</span>
              </label>
              <SharedSelect
                value={formData.position_name || ''}
                onChange={e => {
                  const selPos = positions.find(p => p.title === e.target.value);
                  onFormDataChange(prev => ({
                    ...prev,
                    position_id: selPos?.id || '',
                    position_name: e.target.value,
                  }));
                }}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-bold text-[#9E1A24] bg-white"
              >
                <option value="" disabled>اختر الوظيفة من القائمة</option>
                {positions.map(p => (
                  <option key={p.id} value={p.title}>{p.title} - ({p.department})</option>
                ))}
              </SharedSelect>
            </div>

            {/* Restaurant experience checkbox */}
            {show('restaurant_experience') && (
            <div className="sm:col-span-2 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">{lbl('restaurant_experience', 'هل لديك خبرة سابقة في مجال المطاعم والأغذية؟')}</h4>
                <p className="text-xs text-stone-600">مطاعم الوجبات السريعة، الكافيهات، الفنادق، أو المطابخ</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                  <SharedInput
                    type="radio"
                    name="restaurant_experience"
                    checked={formData.restaurant_experience === true}
                    onChange={() => onFormDataChange(prev => ({ ...prev, restaurant_experience: true }))}
                    className="accent-[#9E1A24] w-4 h-4"
                  />
                  نعم
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                  <SharedInput
                    type="radio"
                    name="restaurant_experience"
                    checked={formData.restaurant_experience === false}
                    onChange={() => onFormDataChange(prev => ({ ...prev, restaurant_experience: false }))}
                    className="accent-[#9E1A24] w-4 h-4"
                  />
                  لا
                </label>
              </div>
            </div>
            )}

            {/* Total years */}
            {show('experience_years') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">{lbl('experience_years')} <Req k="experience_years" /></label>
              <SharedInput
                type="number"
                min={0}
                max={30}
                value={formData.experience_years ?? 0}
                onChange={e => onFormDataChange(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
              />
            </div>
            )}

            {/* Current salary */}
            {show('current_salary') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">{lbl('current_salary')} (ج.م) <Req k="current_salary" /></label>
              <SharedInput
                type="number"
                min={0}
                inputMode="numeric"
                value={formData.current_salary ?? ''}
                onChange={e => onFormDataChange(prev => ({ ...prev, current_salary: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
              />
            </div>
            )}

            {/* Expected salary */}
            {show('expected_salary') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">{lbl('expected_salary')} (ج.م) <Req k="expected_salary" /></label>
              <SharedInput
                type="number"
                min={0}
                inputMode="numeric"
                value={formData.expected_salary ?? ''}
                onChange={e => onFormDataChange(prev => ({ ...prev, expected_salary: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
              />
            </div>
            )}

            {/* Last job */}
            {show('last_job') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">{lbl('last_job')} <Req k="last_job" /></label>
              <SharedInput
                type="text"
                placeholder="مثال: كاشير في مطعم كذا"
                value={formData.last_job || ''}
                onChange={e => onFormDataChange(prev => ({ ...prev, last_job: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
              />
            </div>
            )}

            {/* Leaving reason */}
            {show('leaving_reason') && (
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-stone-700">{lbl('leaving_reason')} <Req k="leaving_reason" /></label>
              <SharedInput
                type="text"
                placeholder="مثال: البحث عن فرصة أفضل للتطوير، بعد المسافة..."
                value={formData.leaving_reason || ''}
                onChange={e => onFormDataChange(prev => ({ ...prev, leaving_reason: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
              />
            </div>
            )}
          </div>

          {/* الحقول الإضافية التي أضافها مدير النظام — قسم job */}
          <CustomFieldsInputs
            config={config}
            section="job"
            values={customValues}
            onChange={onCustomChange}
            columns={2}
          />
          {/* Education Sub-section */}
          {showEducation && (
          <div className="pt-4 border-t border-stone-200">
            <h3 className="text-md font-black text-stone-900 mb-3">المؤهل والتعليم:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {show('qualification') && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">{lbl('qualification')} <Req k="qualification" /></label>
                <SharedSelect
                  value={formData.qualification || ''}
                  onChange={e => onFormDataChange(prev => ({ ...prev, qualification: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
                >
                  <option value="" disabled>اختر من القائمة</option>
                  {opts('qualification').map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </SharedSelect>
              </div>
              )}

              {show('specialization') && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">{lbl('specialization', 'التخصص / الكلية')} <Req k="specialization" /></label>
                <SharedInput
                  type="text"
                  placeholder="مثال: تجارة / سياحة وفنادق / دبلوم صنايع"
                  value={formData.specialization || ''}
                  onChange={e => onFormDataChange(prev => ({ ...prev, specialization: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>
              )}

              {show('still_studying') && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">{lbl('still_studying', 'هل ما زلت تدرس؟')}</label>
                <YesNoField name="still_studying" value={formData.still_studying} onChange={answer => onFormDataChange(prev => ({ ...prev, still_studying: answer, graduation_year: prev.still_studying === answer ? prev.graduation_year : '' }))} />
              </div>
              )}

              {show('graduation_year') && (!show('still_studying') || formData.still_studying !== undefined) && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">{formData.still_studying ? 'السنة الدراسية الحالية' : 'سنة التخرج'} <Req k="graduation_year" /></label>
                <SharedInput
                  type="text"
                  placeholder={formData.still_studying ? 'مثال: الفرقة الثالثة' : 'مثال: 2023'}
                  value={formData.graduation_year || ''}
                  onChange={e => onFormDataChange(prev => ({ ...prev, graduation_year: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-mono"
                />
              </div>
              )}
            </div>
          </div>
          )}
          {/* الحقول الإضافية التي أضافها مدير النظام — قسم education */}
          <CustomFieldsInputs
            config={config}
            section="education"
            values={customValues}
            onChange={onCustomChange}
            columns={2}
          />
        </div>
  );
};

export default PublicJobEducationStep;
