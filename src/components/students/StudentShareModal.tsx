import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Send,
  Lock,
  Printer,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Calendar,
  CreditCard,
  Award,
  AlertCircle,
  Receipt,
  FileText,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Student, ClassInfo } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import { dispatchSafeMessage } from '../../services/whatsappService';
import { getStudentPasswordBreakdown, formatUniversalWhatsAppGroupMessage } from '../../utils/studentAuthUtils';

export type StudentShareTemplateId = 'universal_group' | 'dossier' | 'attendance' | 'due_fee' | 'paid_fee';

interface StudentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
  studentClass?: ClassInfo;
  attendanceStats?: {
    total: number;
    present: number;
    percentage: number;
  };
  feeBreakdown?: any;
  releasedMarksCount?: number;
  schoolName?: string;
  initialTemplate?: StudentShareTemplateId;
  onPrintMarksheet?: () => void;
  onPrintFeeReceipt?: () => void;
}

export const StudentShareModal: React.FC<StudentShareModalProps> = ({
  isOpen,
  onClose,
  student,
  studentClass,
  attendanceStats,
  feeBreakdown,
  releasedMarksCount,
  schoolName,
  initialTemplate = 'dossier',
  onPrintMarksheet,
  onPrintFeeReceipt,
}) => {
  const {
    settings,
    classes,
    attendance,
    feePayments,
    examMarks,
    exams,
    getStudentFeeBreakdown,
  } = useSchool();

  const [activeTemplate, setActiveTemplate] = useState<StudentShareTemplateId>(initialTemplate);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin.trim().replace(/\/+$/, '');
      return origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
    }
    return 'https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app';
  });
  const [isNativeShareSupported, setIsNativeShareSupported] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setActiveTemplate(initialTemplate);
    }
  }, [initialTemplate, isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin.trim().replace(/\/+$/, '');
      let baseOrigin = origin;
      if (origin.includes('ais-dev-')) {
        baseOrigin = origin.replace('ais-dev-', 'ais-pre-');
      }
      setPublicUrl(baseOrigin);
      setIsNativeShareSupported(Boolean(navigator && 'share' in navigator));
    }
  }, [isOpen]);

  // Safe computed fallbacks if props are not explicitly provided
  const safeClass = useMemo(() => {
    if (studentClass) return studentClass;
    if (!student) return undefined;
    return classes.find((c) => c.id === student.classId);
  }, [studentClass, student, classes]);

  const safeAttendance = useMemo(() => {
    if (attendanceStats && typeof attendanceStats.percentage === 'number') {
      return attendanceStats;
    }
    if (!student) return { total: 0, present: 0, percentage: 100 };
    const stAttendance = attendance.filter(
      (r) => (r.targetId === student.id || (r as any).studentId === student.id) && (r.type === 'student' || !r.type)
    );
    const total = stAttendance.length;
    const present = stAttendance.filter((r) => r.status === 'Present').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, percentage };
  }, [attendanceStats, student, attendance]);

  const safeFeeBreakdown = useMemo(() => {
    const raw = feeBreakdown || (student ? getStudentFeeBreakdown(student.id) : null);
    const totalFee = Number(
      (raw as any)?.totalFee ??
      (raw as any)?.totalYearlyDue ??
      (raw as any)?.totalAnnualFee ??
      0
    );
    const paidAmount = Number(
      (raw as any)?.paidAmount ??
      (raw as any)?.totalPaid ??
      0
    );
    const dueAmount = Number(
      (raw as any)?.dueAmount ??
      (raw as any)?.netDue ??
      Math.max(0, totalFee - paidAmount)
    );
    return {
      totalFee: isNaN(totalFee) ? 0 : totalFee,
      paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
      dueAmount: isNaN(dueAmount) ? 0 : dueAmount,
      tuitionFee: Number((raw as any)?.tuitionFee || 0),
      admissionFee: Number((raw as any)?.admissionFee || 0),
      lateFine: Number((raw as any)?.lateFine || 0),
      examFee: Number((raw as any)?.examFee || 0),
      conveyFee: Number((raw as any)?.conveyFee || 0),
      previousDue: Number((raw as any)?.previousDue || 0),
    };
  }, [feeBreakdown, student, getStudentFeeBreakdown]);

  const safeMarksCount = useMemo(() => {
    if (typeof releasedMarksCount === 'number') {
      return releasedMarksCount;
    }
    if (!student) return 0;
    return examMarks.filter((m) => {
      if (m.studentId !== student.id) return false;
      if (m.status === 'Draft' || m.status === 'Submitted') return false;
      const parentExam = exams.find((e) => e.id === m.examId);
      return !parentExam || parentExam.status === 'Published' || parentExam.status === 'Completed';
    }).length;
  }, [releasedMarksCount, student, examMarks, exams]);

  const studentReceipts = useMemo(() => {
    if (!student) return [];
    return feePayments.filter(
      (p) =>
        (p.studentId === student.id ||
          (student.admissionNo &&
            p.admissionNo &&
            p.admissionNo.trim().toLowerCase() === student.admissionNo.trim().toLowerCase())) &&
        p.status !== 'Cancelled'
    );
  }, [student, feePayments]);

  const lastReceipt = studentReceipts[studentReceipts.length - 1];
  const safeSchoolName = schoolName || settings?.schoolName || 'SBSC Senior Secondary School';
  const schoolPhone = settings?.phone || settings?.contactNumber || '9876543210';
  const schoolUpi = settings?.upiId || 'anilsingh636-2@oksbi';

  if (!isOpen || !student) return null;

  const passwordBreakdown = getStudentPasswordBreakdown(
    student.fullName,
    student.guardianPhone || student.emergencyContact || ''
  );

  // Link for the active template
  const getShareUrlForTemplate = (tpl: StudentShareTemplateId) => {
    const cleanBase = (publicUrl || '').trim().replace(/\/+$/, '');
    if (tpl === 'universal_group') {
      return `${cleanBase}/?portal=student#student-portal`;
    }
    const studentPass = passwordBreakdown.password;
    const base = `${cleanBase}/?student=${encodeURIComponent(student.admissionNo)}&auth=${encodeURIComponent(studentPass)}`;
    if (tpl === 'attendance') return `${base}&tab=attendance#student-portal`;
    if (tpl === 'due_fee' || tpl === 'paid_fee') return `${base}&tab=fees#student-portal`;
    return `${base}#student-portal`;
  };

  const activeShareUrl = getShareUrlForTemplate(activeTemplate);
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    activeShareUrl
  )}`;

  // Formatted WhatsApp message depending on active template
  let shareMessageText = '';
  if (activeTemplate === 'universal_group') {
    shareMessageText = formatUniversalWhatsAppGroupMessage(safeSchoolName, activeShareUrl);
  } else if (activeTemplate === 'attendance') {
    const absentDays = Math.max(0, (safeAttendance?.total ?? 0) - (safeAttendance?.present ?? 0));
    shareMessageText = `🏫 *${safeSchoolName}*
📅 *STUDENT ATTENDANCE REPORT (छात्र उपस्थिति रिपोर्ट)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${student.fullName}*
📚 *Class:* *${safeClass?.name || student.classId} - Section ${student.section}*
🔢 *Roll No:* #${student.rollNo}  |  *Admission No:* ${student.admissionNo}
👨‍👦 *Father's Name:* ${student.fatherName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Overall Attendance:* *${safeAttendance?.percentage ?? 100}%*
✅ *Present Days:* ${safeAttendance?.present ?? 0} days
❌ *Absent Days:* ${absentDays} days
📌 *Total Working Days:* ${safeAttendance?.total ?? 0} days
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *View Monthly Attendance Calendar & Records:*
${activeShareUrl}

_कृपया छात्र की नियमित उपस्थिति बनाए रखें। सहायता संपर्क: ${schoolPhone}_`;
  } else if (activeTemplate === 'due_fee') {
    shareMessageText = `🏫 *${safeSchoolName}*
⚠️ *FEE DUE REMINDER NOTICE (फीस बकाया सूचना)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${student.fullName}*
📚 *Class:* *${safeClass?.name || student.classId} - Section ${student.section}*
🔢 *Roll No:* #${student.rollNo}  |  *Admission No:* ${student.admissionNo}
👨‍👦 *Father's Name:* ${student.fatherName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *Total Annual Fee:* ₹${(safeFeeBreakdown.totalFee ?? 0).toLocaleString('en-IN')}
✅ *Total Fees Deposited:* ₹${(safeFeeBreakdown.paidAmount ?? 0).toLocaleString('en-IN')}
🚨 *Outstanding Net Due:* *₹${(safeFeeBreakdown.dueAmount ?? 0).toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${schoolUpi ? `📲 *Pay Online via School UPI:* \`${schoolUpi}\`\n` : ''}🔗 *Check Detailed Fee Breakdown & Payment Ledger:*
${activeShareUrl}

_कृपया बकाया शुल्क समय पर जमा करें ताकि अध्ययन निर्बाध रहे।_`;
  } else if (activeTemplate === 'paid_fee') {
    shareMessageText = `🏫 *${safeSchoolName}*
🧾 *FEE PAYMENT & RECEIPT SUMMARY (जमा फीस रसीद विवरण)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${student.fullName}*
📚 *Class:* *${safeClass?.name || student.classId} - Section ${student.section}*
🔢 *Roll No:* #${student.rollNo}  |  *Admission No:* ${student.admissionNo}
👨‍👦 *Father's Name:* ${student.fatherName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *Total Fee Deposited:* *₹${(safeFeeBreakdown.paidAmount ?? 0).toLocaleString('en-IN')}*
${
  lastReceipt
    ? `📄 *Latest Receipt No:* ${lastReceipt.receiptNo || 'N/A'}
📅 *Payment Date:* ${lastReceipt.date || (lastReceipt as any).paymentDate || ''}
💳 *Paid Amount:* ₹${(Number(lastReceipt.amountPaid) || 0).toLocaleString('en-IN')} (${lastReceipt.paymentMethod || (lastReceipt as any).paymentMode || 'Cash'})
`
    : ''
}💰 *Remaining Due Balance:* ₹${(safeFeeBreakdown.dueAmount ?? 0).toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Download Official Fee Receipts (रसीद देखें व डाउनलोड करें):*
${activeShareUrl}

_शुल्क भुगतान के लिए धन्यवाद। - ${safeSchoolName}_`;
  } else {
    // Complete Dossier
    shareMessageText = `🏫 *${safeSchoolName}*
📋 *OFFICIAL STUDENT ACADEMIC DOSSIER (छात्र विवरण)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${student.fullName}*
📚 *Class:* *${safeClass?.name || student.classId} - Section ${student.section}*
🏛️ *Board:* *${student.board || settings?.board || 'UP BOARD'}*
🔢 *Roll No:* #${student.rollNo}  |  *Admission No:* ${student.admissionNo}
👨‍👦 *Father's Name:* ${student.fatherName}
📞 *Guardian Phone:* ${student.guardianPhone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Attendance:* ${safeAttendance?.percentage ?? 100}% (${safeAttendance?.present ?? 0}/${safeAttendance?.total ?? 0} Days)
💰 *Fee Balance:* ${
      safeFeeBreakdown.dueAmount <= 0
        ? 'Fully Cleared ✓ (Total Paid ₹' + (safeFeeBreakdown.paidAmount ?? 0).toLocaleString('en-IN') + ')'
        : 'Due: ₹' + (safeFeeBreakdown.dueAmount ?? 0).toLocaleString('en-IN') + ' (Paid ₹' + (safeFeeBreakdown.paidAmount ?? 0).toLocaleString('en-IN') + ' of ₹' + (safeFeeBreakdown.totalFee ?? 0).toLocaleString('en-IN') + ')'
    }
🏆 *Exam Results:* ${safeMarksCount} Exam Marksheet(s) Released
🔑 *Portal Login:* ID: ${student.admissionNo} | Pass: ${passwordBreakdown.password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Official Student Portal (पासवर्ड सुरक्षित छात्र पोर्टल):*
${activeShareUrl}

_(नोट: सुरक्षा कारणों से पोर्टल केवल उपरोक्त पासवर्ड डालने पर ही खुलेगा जिससे छात्र का विवरण पूरी तरह सुरक्षित रहे।)_`;
  }

  const cleanPhone = (student.guardianPhone || student.emergencyContact || '').replace(/\D/g, '');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeShareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        window.prompt('Copy Student Read-Only URL:', activeShareUrl);
      }
    } catch {
      window.prompt('Copy Student Read-Only URL:', activeShareUrl);
    }
  };

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareMessageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        window.prompt('Copy Message:', shareMessageText);
      }
    } catch {
      window.prompt('Copy Message:', shareMessageText);
    }
  };

  const handleShareWhatsAppToGuardian = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const waUrl = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodeURIComponent(shareMessageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageText)}`;

    // Copy to clipboard first
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareMessageText).catch(() => {});
      }
    } catch {}

    dispatchSafeMessage(waUrl, 'whatsapp', shareMessageText);
  };

  const handleShareWhatsAppGeneral = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageText)}`;

    // Copy to clipboard first
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareMessageText).catch(() => {});
      }
    } catch {}

    dispatchSafeMessage(waUrl, 'whatsapp', shareMessageText);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${student.fullName} - ${safeSchoolName}`,
          text: shareMessageText,
          url: activeShareUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-blue-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  {safeSchoolName}
                </span>
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-400/40">
                  WhatsApp & Portal Link
                </span>
              </div>
              <h3 className="text-base font-extrabold tracking-tight">
                Student WhatsApp Details & Link (छात्र विवरण साझा करें)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Template Selector Chips */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Select WhatsApp Message Type (संदेश प्रकार चुनें):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveTemplate('universal_group')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer col-span-2 sm:col-span-1 ${
                  activeTemplate === 'universal_group'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Group Link (कॉमन)</span>
                <span className="text-[10px] font-normal text-emerald-700">
                  सभी बच्चों हेतु 1 लिंक
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplate('attendance')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  activeTemplate === 'attendance'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Attendance (हाजिरी)</span>
                <span className="text-[10px] font-normal text-emerald-700">
                  {safeAttendance?.percentage ?? 100}% Present
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplate('due_fee')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  activeTemplate === 'due_fee'
                    ? 'bg-rose-50 border-rose-600 text-rose-900 shadow-xs ring-1 ring-rose-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-rose-600" />
                <span>Due Fees (बकाया)</span>
                <span className="text-[10px] font-normal text-rose-700">
                  ₹{(safeFeeBreakdown.dueAmount ?? 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplate('paid_fee')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  activeTemplate === 'paid_fee'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Paid Fees (जमा)</span>
                <span className="text-[10px] font-normal text-blue-700">
                  ₹{(safeFeeBreakdown.paidAmount ?? 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTemplate('dossier')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  activeTemplate === 'dossier'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Share2 className="w-4 h-4 text-teal-600" />
                <span>All Dossier (सम्पूर्ण)</span>
                <span className="text-[10px] font-normal text-teal-700">
                  Individual Link
                </span>
              </button>
            </div>
          </div>

          {/* Student Profile Snapshot Card */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-950 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                {student.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm truncate">
                    {student.fullName}
                  </h4>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md shrink-0">
                    {safeClass?.name || student.classId}-{student.section}
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  Roll #{student.rollNo} • Adm: <strong className="font-mono text-slate-800">{student.admissionNo}</strong> • Father: {student.fatherName}
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  📱 Guardian: {student.guardianPhone || 'Not recorded'}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400">Attendance</span>
              <span className="text-sm font-black text-emerald-700">{safeAttendance?.percentage ?? 100}%</span>
              <span className="text-[10px] text-rose-700 font-bold mt-1">
                Net Due: ₹{(safeFeeBreakdown.dueAmount ?? 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Formatted WhatsApp Message Preview:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-200 max-h-44 overflow-y-auto leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
              {shareMessageText}
            </pre>
          </div>

          {/* Direct Link Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-900" />
                <span>Direct Read-Only Portal Link (बिना पासवर्ड सीधा लिंक):</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Read-Only
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 truncate select-all">
                {activeShareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-950 hover:bg-blue-900 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp & Native Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShareWhatsAppToGuardian}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send to Parent ({student.guardianPhone || 'WhatsApp'})</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsAppGeneral}
              className="py-3 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share to Other WhatsApp</span>
            </button>
          </div>

          {/* QR Code Card */}
          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/60 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-xs shrink-0 flex items-center justify-center">
              <img
                src={qrCodeApiUrl}
                alt={`QR code for ${student.fullName}`}
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 font-extrabold text-slate-900 text-xs">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Instant Phone Camera QR Scan</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Parents can scan this QR code directly from their phone camera to view {student.fullName}'s reports without logging in.
              </p>
            </div>
          </div>

          {/* Quick PDF Print Actions */}
          {(onPrintMarksheet || onPrintFeeReceipt) && (
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-600">Quick Document Actions:</span>
              <div className="flex items-center gap-2">
                {onPrintMarksheet && safeMarksCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onPrintMarksheet();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs border border-blue-200 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-900" />
                    <span>Print Marksheet</span>
                  </button>
                )}
                {onPrintFeeReceipt && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onPrintFeeReceipt();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-200 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Print Fee Receipt</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Non-Editable Institutional Copy
          </span>
          <button
            onClick={onClose}
            className="font-bold text-blue-950 hover:underline cursor-pointer"
          >
            Done (बंद करें)
          </button>
        </div>
      </div>
    </div>
  );
};
