import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  ShieldCheck,
  Percent,
  Calculator,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';

interface BulkFeeOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStudentIds?: string[];
  preSelectedClassId?: string;
  onSuccess?: (msg: string) => void;
}

export const BulkFeeOperationsModal: React.FC<BulkFeeOperationsModalProps> = ({
  isOpen,
  onClose,
  preSelectedStudentIds = [],
  preSelectedClassId = '',
  onSuccess,
}) => {
  const {
    students,
    classes,
    bulkSetStudentsFeeZero,
    bulkUpdateStudentsFee,
    resetStudentsFeeToStandard,
    settings,
  } = useSchool();

  // Target Scope: 'all' | 'class' | 'selected'
  const [scope, setScope] = useState<'all' | 'class' | 'selected'>(
    preSelectedStudentIds.length > 0 ? 'selected' : preSelectedClassId ? 'class' : 'all'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(preSelectedClassId || '');

  // Operation Mode: 'zero' | 'custom' | 'standard'
  const [operationMode, setOperationMode] = useState<'zero' | 'custom' | 'standard'>('zero');

  // Zero Fee Options
  const [zeroReason, setZeroReason] = useState<string>('100% Fee Concession / Zero Fee');

  // Custom Fee Inputs
  const [customTuition, setCustomTuition] = useState<number>(12000);
  const [customAdmission, setCustomAdmission] = useState<number>(0);
  const [customRegistration, setCustomRegistration] = useState<number>(0);
  const [customExam, setCustomExam] = useState<number>(0);
  const [customConvey, setCustomConvey] = useState<number>(0);
  const [customFine, setCustomFine] = useState<number>(0);
  const [customTotal, setCustomTotal] = useState<number>(12000);
  const [customAutoSum, setCustomAutoSum] = useState<boolean>(true);
  const [customScholarshipTag, setCustomScholarshipTag] = useState<string>('');

  // Confirmation step
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  if (!isOpen) return null;

  // Determine affected students
  const activeStudents = students.filter((s) => s.status === 'Active');
  let targetStudents = activeStudents;

  if (scope === 'selected' && preSelectedStudentIds.length > 0) {
    targetStudents = activeStudents.filter((s) => preSelectedStudentIds.includes(s.id));
  } else if (scope === 'class' && selectedClassId) {
    targetStudents = activeStudents.filter((s) => s.classId === selectedClassId);
  }

  const targetCount = targetStudents.length;
  const targetClassObj = classes.find((c) => c.id === selectedClassId);

  const handleCustomFieldChange = (field: string, val: number) => {
    const sanitized = Math.max(0, val);
    const t = field === 'tuition' ? sanitized : customTuition;
    const a = field === 'adm' ? sanitized : customAdmission;
    const r = field === 'reg' ? sanitized : customRegistration;
    const e = field === 'exam' ? sanitized : customExam;
    const rawC = field === 'conv' ? sanitized : customConvey;
    const c = rawC === 600 ? 0 : rawC;
    const f = field === 'fine' ? sanitized : customFine;

    if (field === 'tuition') setCustomTuition(sanitized);
    if (field === 'adm') setCustomAdmission(sanitized);
    if (field === 'reg') setCustomRegistration(sanitized);
    if (field === 'exam') setCustomExam(sanitized);
    if (field === 'conv') setCustomConvey(c);
    if (field === 'fine') setCustomFine(sanitized);

    if (customAutoSum) {
      setCustomTotal(t + a + r + e + c + f);
    }
  };

  const handleExecute = () => {
    const studentIds =
      scope === 'selected'
        ? preSelectedStudentIds
        : scope === 'class'
        ? targetStudents.map((s) => s.id)
        : undefined;

    const classIdFilter = scope === 'class' ? selectedClassId : undefined;

    if (operationMode === 'zero') {
      const affected = bulkSetStudentsFeeZero({
        studentIds,
        classId: classIdFilter,
        reason: zeroReason.trim() || '100% Fee Concession / Zero Fee',
      });
      const scopeDesc =
        scope === 'all'
          ? `All ${affected} active students`
          : scope === 'class'
          ? `${affected} students in ${targetClassObj?.name || 'class'}`
          : `${affected} selected students`;

      if (onSuccess) {
        onSuccess(`Success! Set fees to ₹0 (Zero Fee) for ${scopeDesc}. Outstanding dues updated to ₹0.`);
      }
    } else if (operationMode === 'custom') {
      const targetIds = targetStudents.map((s) => s.id);
      const effConv = customConvey === 600 ? 0 : customConvey;
      const affected = bulkUpdateStudentsFee(targetIds, {
        tuitionFee: customTuition,
        admissionFee: customAdmission,
        registrationFee: customRegistration,
        examFee: customExam,
        conveyFee: effConv,
        lateFine: customFine,
        totalYearlyDue: customAutoSum ? undefined : customTotal,
        scholarshipStatus: customScholarshipTag.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(
          `Updated fees for ${affected} students to ${settings.currencySymbol} ${customTotal.toLocaleString('en-IN')}/yr.`
        );
      }
    } else if (operationMode === 'standard') {
      const affected = resetStudentsFeeToStandard({
        studentIds,
        classId: classIdFilter,
      });

      if (onSuccess) {
        onSuccess(`Reset fees to standard class rates for ${affected} students.`);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wider block">
                Bulk Fee Management & Concessions
              </span>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>All Students Fee Zero & Editable Fee Options</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Step 1: Target Scope */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-800" />
              <span>1. Select Target Students:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                  scope === 'all'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">All Students</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono font-bold text-slate-700 border">
                    {activeStudents.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Entire active school roster</p>
              </button>

              <button
                type="button"
                onClick={() => setScope('class')}
                className={`px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                  scope === 'class'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Specific Class</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono font-bold text-slate-700 border">
                    {selectedClassId ? targetStudents.length : 'Select'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Choose a specific standard</p>
              </button>

              <button
                type="button"
                onClick={() => setScope('selected')}
                disabled={preSelectedStudentIds.length === 0}
                className={`px-3 py-2.5 rounded-xl border text-left transition ${
                  preSelectedStudentIds.length === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                    : scope === 'selected'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300 cursor-pointer'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Selected Students</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono font-bold text-slate-700 border">
                    {preSelectedStudentIds.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {preSelectedStudentIds.length > 0 ? 'From current table selection' : 'None checked in table'}
                </p>
              </button>
            </div>

            {scope === 'class' && (
              <div className="mt-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-950 whitespace-nowrap">Choose Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-white border border-emerald-300 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-900 focus:outline-emerald-800 flex-1"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => {
                    const count = activeStudents.filter((s) => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({count} active students)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Step 2: Choose Operation */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-800" />
              <span>2. Choose Fee Action / Option:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOperationMode('zero');
                  setIsConfirming(false);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  operationMode === 'zero'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-black text-xs">Set Fee to ₹0 (Zero)</span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal">
                  100% Free / Waiver. Zeros out all tuition, exam & dues.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOperationMode('custom');
                  setIsConfirming(false);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  operationMode === 'custom'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-2 ring-blue-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                  <Calculator className="w-4 h-4" />
                  <span className="font-black text-xs">Custom Editable Rate</span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal">
                  Specify custom amounts for tuition, admission & exams.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOperationMode('standard');
                  setIsConfirming(false);
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  operationMode === 'standard'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-black text-xs">Reset to Standard</span>
                </div>
                <p className="text-[11px] text-slate-600 font-normal">
                  Restore default class fee rates (monthly × 12 + standard heads).
                </p>
              </button>
            </div>
          </div>

          {/* Operation Details Config */}
          {operationMode === 'zero' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Zero Fee (100% Waiver) Mode</p>
                  <p className="text-[11px] text-amber-800">
                    All components (Tuition, Admission, Registration, Exam, Conveyance, Fine, Total Yearly Due) will be set to <strong className="font-bold">₹0</strong> for the {targetCount} target students. Their outstanding dues will immediately clear to ₹0.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tag / Reason for Zero Fee (Printed on records):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    '100% Fee Concession / Zero Fee',
                    'RTE 25% Free Seat Scheme',
                    'Merit Scholarship (Full Free)',
                    'Special Management Waiver',
                    'Staff Dependent (Free)',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setZeroReason(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        zeroReason === preset
                          ? 'bg-amber-800 text-white font-bold'
                          : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={zeroReason}
                  onChange={(e) => setZeroReason(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-amber-800"
                  placeholder="Reason / Scheme name..."
                />
              </div>
            </div>
          )}

          {operationMode === 'custom' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-800 text-[11px] uppercase">
                  Custom Structure per Student
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customAutoSum}
                    onChange={(e) => {
                      setCustomAutoSum(e.target.checked);
                      if (e.target.checked) {
                        const effConv = customConvey === 600 ? 0 : customConvey;
                        setCustomTotal(
                          customTuition +
                            customAdmission +
                            customRegistration +
                            customExam +
                            effConv +
                            customFine
                        );
                      }
                    }}
                    className="rounded text-blue-900"
                  />
                  <span>Auto-sum</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tuition Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customTuition}
                    onChange={(e) => handleCustomFieldChange('tuition', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Admission Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customAdmission}
                    onChange={(e) => handleCustomFieldChange('adm', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Registration (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customRegistration}
                    onChange={(e) => handleCustomFieldChange('reg', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Exam Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customExam}
                    onChange={(e) => handleCustomFieldChange('exam', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Conveyance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customConvey}
                    onChange={(e) => handleCustomFieldChange('conv', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Late Fine / Other (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={customFine}
                    onChange={(e) => handleCustomFieldChange('fine', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2">
                  <label className="block text-[10px] font-bold text-blue-950 uppercase mb-0.5">
                    Total Yearly Fee per Student (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customTotal}
                    onChange={(e) => {
                      setCustomAutoSum(false);
                      setCustomTotal(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full bg-white border border-blue-300 rounded p-1.5 text-sm font-black text-blue-950"
                  />
                  <span className="text-[9px] text-blue-800 mt-1 block">
                    {customAutoSum
                      ? '✓ Auto-sum: Preserves & adds each student’s existing Previous Due (गत बकाया).'
                      : 'Fixed override amount (Overrides sum of heads).'}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Concession Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={customScholarshipTag}
                    onChange={(e) => setCustomScholarshipTag(e.target.value)}
                    placeholder="e.g. Revised Academic Fee 2026-27"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {operationMode === 'standard' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-slate-700">
              <RotateCcw className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-slate-900">Restore Standard Class Fees</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  This will re-calculate each target student's annual fee based on their assigned class's standard monthly tuition fee (× 12 months) + standard Admission (₹2,000), Registration (₹1,000), and Exam fee (₹1,500).
                </p>
              </div>
            </div>
          )}

          {/* Action Impact Summary Ribbon */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-white">
                  Target Scope: <span className="text-amber-300">{targetCount} Students</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  {scope === 'all' && 'Entire school active roster'}
                  {scope === 'class' && `Class: ${targetClassObj?.name || 'Selected Class'}`}
                  {scope === 'selected' && `${preSelectedStudentIds.length} checked students`}
                  {' • '}Action:{' '}
                  {operationMode === 'zero'
                    ? 'Set to ₹0 Free'
                    : operationMode === 'custom'
                    ? `Set ₹${customTotal}/yr`
                    : 'Standard Rate'}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Warning if confirming */}
          {isConfirming && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 animate-in fade-in">
              <p className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Please confirm this bulk update:</span>
              </p>
              <p className="text-[11px] text-amber-900 mt-1">
                Are you sure you want to{' '}
                {operationMode === 'zero'
                  ? 'SET ALL FEES TO ₹0'
                  : operationMode === 'custom'
                  ? `APPLY ₹${customTotal} FEE`
                  : 'RESET FEES'}{' '}
                for <strong className="font-bold">{targetCount} students</strong>? This will update their fee structure immediately.
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            {!isConfirming ? (
              <button
                type="button"
                disabled={targetCount === 0}
                onClick={() => setIsConfirming(true)}
                className={`px-5 py-2 rounded-xl font-black text-white shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  targetCount === 0
                    ? 'bg-slate-400 cursor-not-allowed'
                    : operationMode === 'zero'
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                    : 'bg-emerald-800 hover:bg-emerald-700'
                }`}
              >
                {operationMode === 'zero' ? (
                  <>
                    <Sparkles className="w-4 h-4 fill-current text-slate-950" />
                    <span>Set {targetCount} Students Fee to ₹0</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Apply to {targetCount} Students</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecute}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-black shadow-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-400"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Yes, Confirm & Apply Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
