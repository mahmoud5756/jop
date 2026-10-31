import React from 'react';
import { SharedInput, SharedSelect, YesNoField } from './ApplicantFormControls';

interface ApplicantEducationFieldsProps {
  qualification: string;
  specialization: string;
  stillStudying: boolean | undefined;
  graduationYear: string;
  qualificationLabel: string;
  specializationLabel: string;
  stillStudyingLabel: string;
  qualificationOptions: string[];
  required?: {
    qualification?: boolean;
    specialization?: boolean;
    stillStudying?: boolean;
    graduationYear?: boolean;
  };
  onQualificationChange: (value: string) => void;
  onSpecializationChange: (value: string) => void;
  onStillStudyingChange: (value: boolean) => void;
  onGraduationYearChange: (value: string) => void;
}

const labelClassName = 'block text-xs font-bold text-stone-700 mb-1.5';
const inputClassName = 'w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm';

export const ApplicantEducationFields: React.FC<ApplicantEducationFieldsProps> = ({
  qualification,
  specialization,
  stillStudying,
  graduationYear,
  qualificationLabel,
  specializationLabel,
  stillStudyingLabel,
  qualificationOptions,
  required = {} as NonNullable<ApplicantEducationFieldsProps['required']>,
  onQualificationChange,
  onSpecializationChange,
  onStillStudyingChange,
  onGraduationYearChange,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClassName}>{qualificationLabel}{required.qualification && ' *'}</label>
      <SharedSelect
        value={qualification || ''}
        onChange={e => onQualificationChange(e.target.value)}
        required={required.qualification}
        className={inputClassName}
      >
        <option value="">اختر من القائمة</option>
        {qualificationOptions.map(option => <option key={option} value={option}>{option}</option>)}
        {/* Preserve a saved qualification even when it is no longer in the configured options. */}
        {qualification && !qualificationOptions.includes(qualification) && (
          <option value={qualification}>{qualification}</option>
        )}
      </SharedSelect>
    </div>

    <div>
      <label className={labelClassName}>{specializationLabel}{required.specialization && ' *'}</label>
      <SharedInput
        type="text"
        value={specialization}
        onChange={e => onSpecializationChange(e.target.value)}
        placeholder="مجال التخصص الدراسي"
        required={required.specialization}
        className={inputClassName}
      />
    </div>

    <div>
      <label className={labelClassName}>{stillStudyingLabel}{required.stillStudying && ' *'}</label>
      <YesNoField name="still_studying" value={stillStudying} layout="cards" onChange={onStillStudyingChange} />
    </div>

    {stillStudying !== undefined && stillStudying !== null && (
      <div>
        <label className={labelClassName}>
          {stillStudying ? 'السنة الدراسية الحالية' : 'سنة التخرج'}{required.graduationYear && ' *'}
        </label>
        <SharedInput
          type="text"
          value={graduationYear}
          onChange={e => onGraduationYearChange(e.target.value)}
          placeholder={stillStudying ? 'مثال: الفرقة الثالثة' : 'مثال: 2024'}
          required={required.graduationYear}
          className={`${inputClassName} font-mono`}
        />
      </div>
    )}
  </div>
);
