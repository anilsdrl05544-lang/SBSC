import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  GraduationCap,
  Percent,
  Zap,
} from 'lucide-react';
import { Student } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';

interface StudentFeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: (msg: string) => void;
}

export const StudentFeeEditModal: React.FC<StudentFeeEditModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const { classes, feePayments, getStudentFeeBreakdown, updateStudentFee, settings } = useSchool();

  const [tuitionFee, setTuitionFee] = useState<number>(0);
  const [admissionFee, setAdmissionFee] = useState<number>(0);
  const [registrationFee, setRegistrationFee] = useState<number>(0);
  const [examFee, setExamFee] = useState<number>(0);
  const [conveyFee, setConveyFee] = useState<number>(0);
  const [previousDue, setPreviousDue] = useState<number>(0);
  const [lateFine, setLateFine] = useState<number>(0);
  const [totalYearlyDue, setTotalYearlyDue] = useState<number>(0);
  const [autoSum, setAutoSum] = useState<boolean>(true);
  const [scholarshipStatus, setScholarshipStatus] = useState<string>('');

  useEffect(() => {
    if (student && isOpen) {
      const breakdown = getStudentFeeBreakdown(student.id);
      const initialConv = breakdown.conveyFee === 600 ? 0 : breakdown.conveyFee;
      const initialPrev = breakdown.previousDue || 0;
      const headsSum =
        breakdown.tuitionFee +
        breakdown.admissionFee +
        breakdown.registrationFee +
        breakdown.examFee +
        initialConv +
        initialPrev +
        breakdown.lateFine;

      const rawSavedTotal =
        breakdown.conveyFee === 600 && breakdown.totalYearlyDue >= 600
          ? breakdown.totalYearlyDue - 600
          : breakdown.totalYearlyDue;

      const isCustomOverride =
        typeof student.totalYearlyDue === 'number' &&
        rawSavedTotal !== headsSum;

      setTuitionFee(breakdown.tuitionFee);
      setAdmissionFee(breakdown.admissionFee);
      setRegistrationFee(breakdown.registrationFee);
      setExamFee(breakdown.examFee);
      setConveyFee(initialConv);
      setPreviousDue(initialPrev);
      setLateFine(breakdown.lateFine);
      setScholarshipStatus(student.scholarshipStatus || '');

      if (isCustomOverride) {
        setTotalYearlyDue(rawSavedTotal);
        setAutoSum(false);
      } else {
        setTotalYearlyDue(headsSum);
        setAutoSum(true);
      }
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const classObj = classes.find((c) => c.id === student.classId);

  const handleFieldChange = (field: string, val: number) => {
    const sanitized = Math.max(0, val);
    const nextTuition = field === 'tuition' ? sanitized : tuitionFee;
    const nextAdm = field === 'admission' ? sanitized : admissionFee;
    const nextReg = field === 'registration' ? sanitized : registrationFee;
    const nextExam = field === 'exam' ? sanitized : examFee;
    const rawConv = field === 'convey' ? sanitized : conveyFee;
    const nextConv = rawConv === 600 ? 0 : rawConv;
    const nextPrev = field === 'previousDue' ? sanitized : previousDue;
    const nextFine = field === 'fine' ? sanitized : lateFine;

    if (field === 'tuition') setTuitionFee(sanitized);
    if (field === 'admission') setAdmissionFee(sanitized);
    if (field === 'registration') setRegistrationFee(sanitized);
    if (field === 'exam') setExamFee(sanitized);
    if (field === 'convey') setConveyFee(nextConv);
    if (field === 'previousDue') setPreviousDue(sanitized);
    if (field === 'fine') setLateFine(sanitized);

    if (autoSum) {
      setTotalYearlyDue(nextTuition + nextAdm + nextReg + nextExam + nextConv + nextPrev + nextFine);
    }
  };

  // Preset 1: Set All Fees to Zero (₹0)
  const handleSetZeroFee = () => {
    setTuitionFee(0);
    setAdmissionFee(0);
    setRegistrationFee(0);
    setExamFee(0);
    setConveyFee(0);
    setPreviousDue(0);
    setLateFine(0);
    setTotalYearlyDue(0);
    setAutoSum(true);
    setScholarshipStatus('100% Fee Concession / Zero Fee');
  };

  // Preset 2: Class Standard
  const handleResetToClassStandard = () => {
    const defaultMonthly = classObj?.monthlyFee || 1500;
    const stdTuition = defaultMonthly * 12;
    const stdAdm = 2000;
    const stdReg = 1000;
    const stdExam = 1500;
    const stdConv = student.conveyFee && student.conveyFee > 0 && student.conveyFee !== 600 ? student.conveyFee : 0;
    const stdPrev = previousDue; // Retain student's existing previous session due
    const stdFine = 0;
    const stdTotal = stdTuition + stdAdm + stdReg + stdExam + stdConv + stdPrev + stdFine;

    setTuitionFee(stdTuition);
    setAdmissionFee(stdAdm);
    setRegistrationFee(stdReg);
    setExamFee(stdExam);
    setConveyFee(stdConv);
    setPreviousDue(stdPrev);
    setLateFine(stdFine);
    setTotalYearlyDue(stdTotal);
    setAutoSum(true);
    setScholarshipStatus('');
  };

  // Preset 3: Tuition Fee Only
  const handleTuitionOnly = () => {
    const defaultMonthly = classObj?.monthlyFee || 1500;
    const stdTuition = defaultMonthly * 12;
    setTuitionFee(stdTuition);
    setAdmissionFee(0);
    setRegistrationFee(0);
    setExamFee(0);
    setConveyFee(0);
    setPreviousDue(0);
    setLateFine(0);
    setTotalYearlyDue(stdTuition);
    setAutoSum(true);
  };

  const activeStudentPayments = feePayments.filter(
    (f) => f.studentId === student.id && f.status !== 'Cancelled'
  );
  const totalPaid = activeStudentPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalDiscount = activeStudentPayments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);

  const calculatedNetDue = Math.max(0, totalYearlyDue - (totalPaid + totalDiscount));

  // Auto-fill Previous Due
  const handleAutoFillPreviousDue = () => {
    if (!student) return;
    const breakdown = getStudentFeeBreakdown(student.id);
    const candidateAmount =
      typeof student.previousDue === 'number' && student.previousDue > 0
        ? student.previousDue
        : breakdown.previousDue > 0
        ? breakdown.previousDue
        : calculatedNetDue;
    handleFieldChange('previousDue', candidateAmount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentFee(student.id, {
      tuitionFee,
      admissionFee,
      registrationFee,
      examFee,
      conveyFee,
      previousDue,
      lateFine,
      totalYearlyDue,
      scholarshipStatus: scholarshipStatus.trim() || undefined,
    });

    const isZero = totalYearlyDue === 0;
    const msg = isZero
      ? `Fee for ${student.fullName} set to ₹0 (Zero Fee Waiver applied).`
      : `Fee structure for ${student.fullName} updated to ${settings.currencySymbol} ${totalYearlyDue.toLocaleString('en-IN')}.`;

    if (onSuccess) onSuccess(msg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wider block">
                Student Fee Assessment
              </span>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Editable Fees & Dues Setup</span>
                {totalYearlyDue === 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-emerald-950">
                    ZERO FEE APPLIED
                  </span>
                )}
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

        {/* Student Info Ribbon */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{student.fullName}</p>
              <p className="text-[11px] text-slate-600">
                Adm: <span className="font-mono font-bold text-slate-800">{student.admissionNo}</span> • Roll: #{student.rollNo} • Class: {classObj?.name || student.classId}-{student.section}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Father's Name</span>
            <span className="font-semibold text-slate-800">{student.fatherName}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Quick Presets Bar */}
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Quick Fee Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSetZeroFee}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                title="Zero out all fees for this student"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Set Fee to ₹0 (Zero Fee)</span>
              </button>

              <button
                type="button"
                onClick={handleResetToClassStandard}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
                title="Reset to class standard annual rate"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Class Standard Rate</span>
              </button>

              <button
                type="button"
                onClick={handleTuitionOnly}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
                title="Keep only tuition fee; zero out admission/exam"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                <span>Tuition Only</span>
              </button>
            </div>
          </div>

          {/* Editable 6 Fee Heads */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Fee Heads Breakdown (Editable - 7 Heads)
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSum}
                  onChange={(e) => {
                    setAutoSum(e.target.checked);
                    if (e.target.checked) {
                      setTotalYearlyDue(tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine);
                    }
                  }}
                  className="rounded text-emerald-800 focus:ring-emerald-800"
                />
                <span>Auto-sum Total</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Tuition */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tuition Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={tuitionFee}
                  onChange={(e) => handleFieldChange('tuition', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ~₹{Math.round(tuitionFee / 12)}/month
                </span>
              </div>

              {/* Admission */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Admission Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={admissionFee}
                  onChange={(e) => handleFieldChange('admission', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Annual / Admission</span>
              </div>

              {/* Registration */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registration (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={registrationFee}
                  onChange={(e) => handleFieldChange('registration', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Enrolment Fee</span>
              </div>

              {/* Exam */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Exam Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={examFee}
                  onChange={(e) => handleFieldChange('exam', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Annual Exams</span>
              </div>

              {/* Conveyance */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Conveyance / Bus (₹)
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={conveyFee}
                  onChange={(e) => handleFieldChange('convey', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block truncate">
                  {student.conveyRoute ? `🚌 ${student.conveyRoute}` : 'Transport charges (Optional)'}
                </span>
              </div>

              {/* Previous Due / Arrears Head */}
              <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-300 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold text-amber-950">
                    Previous Due (₹)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleAutoFillPreviousDue}
                      className="text-[9px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                      title="विद्यार्थी के पिछले बकाया को स्वतः भरें"
                    >
                      <Zap className="w-2.5 h-2.5 text-amber-800" />
                      <span>ऑटो भरें (Auto-Fill)</span>
                    </button>
                    <span className="text-[9px] font-black bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                      पिछला बकाया
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={previousDue}
                  onChange={(e) => handleFieldChange('previousDue', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-300 rounded-md p-1.5 text-xs font-extrabold text-amber-950 focus:outline-amber-700"
                />
                <span className="text-[10px] text-amber-800 mt-1 block font-medium">
                  Old session arrears / past dues
                </span>
              </div>

              {/* Late Fine */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Late Fine / Other (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={lateFine}
                  onChange={(e) => handleFieldChange('fine', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-800"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Penalty or miscellaneous</span>
              </div>
            </div>
          </div>

          {/* Total Yearly Due & Concession Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const liveHeadsSum =
                tuitionFee +
                admissionFee +
                registrationFee +
                examFee +
                (conveyFee === 600 ? 0 : conveyFee) +
                previousDue +
                lateFine;
              const hasDiff = totalYearlyDue !== liveHeadsSum;

              return (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase">
                      Total Annual Assessed Fee (₹)
                    </label>
                    {hasDiff ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAutoSum(true);
                          setTotalYearlyDue(liveHeadsSum);
                        }}
                        className="text-[10px] font-bold text-emerald-950 bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="मदों का योग लागू करें (Apply Sum of 7 Heads)"
                      >
                        <Zap className="w-3 h-3 text-amber-900" />
                        <span>Auto-sum (₹{liveHeadsSum.toLocaleString('en-IN')})</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                        ✓ Auto-sum Synchronized
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={totalYearlyDue}
                    onChange={(e) => {
                      setAutoSum(false);
                      setTotalYearlyDue(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-base font-black text-emerald-950 focus:outline-emerald-800"
                  />
                  <div className="text-[10px] text-emerald-800 mt-1 flex items-center justify-between">
                    <span>
                      Sum of Heads: <strong>₹{liveHeadsSum.toLocaleString('en-IN')}</strong>
                    </span>
                    {hasDiff && (
                      <span className="font-semibold text-amber-800">
                        Diff: ₹{Math.abs(totalYearlyDue - liveHeadsSum).toLocaleString('en-IN')} (Manual)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Concession / Scholarship Tag
              </label>
              <input
                type="text"
                value={scholarshipStatus}
                onChange={(e) => setScholarshipStatus(e.target.value)}
                placeholder="e.g. 100% Free / RTE / Staff Ward / Concession"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-emerald-800"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setScholarshipStatus('100% Fee Concession / Zero Fee')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer"
                >
                  Zero Fee
                </button>
                <button
                  type="button"
                  onClick={() => setScholarshipStatus('RTE 25% Free Seat')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 hover:bg-blue-200 cursor-pointer"
                >
                  RTE
                </button>
                <button
                  type="button"
                  onClick={() => setScholarshipStatus('Staff Ward Concession')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 hover:bg-purple-200 cursor-pointer"
                >
                  Staff Ward
                </button>
                <button
                  type="button"
                  onClick={() => setScholarshipStatus('')}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Financial Calculation Summary Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Assessed</span>
              <span className="text-base font-extrabold text-white">
                {settings.currencySymbol} {totalYearlyDue.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Paid to Date</span>
              <span className="text-base font-extrabold text-emerald-400">
                {settings.currencySymbol} {totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            {totalDiscount > 0 && (
              <div>
                <span className="text-[10px] text-amber-300 font-semibold block uppercase">Concessions / छूट</span>
                <span className="text-base font-extrabold text-amber-300">
                  {settings.currencySymbol} {totalDiscount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Calculated Net Due</span>
              <span className={`text-base font-black ${calculatedNetDue === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {settings.currencySymbol} {calculatedNetDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-black shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Save Fee Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
