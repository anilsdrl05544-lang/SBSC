import React, { useState } from 'react';
import { Student } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import { formatDateToDDMMYYYY, normalizeGender } from '../../utils/dateUtils';
import {
  X,
  Printer,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Award,
  CreditCard,
  CheckCircle,
  Clock,
  Sparkles,
  MessageSquare,
  Trash2,
  Receipt,
  Edit3,
  Bus,
  KeyRound,
  Copy,
  Check,
  Send,
  Share2,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { StudentProfilePdf } from '../reports/templates/StudentProfilePdf';
import { WhatsAppFeeReminderModal } from '../fees/WhatsAppFeeReminderModal';
import { StudentShareModal, StudentShareTemplateId } from './StudentShareModal';
import { QuickPhoneEditModal } from './QuickPhoneEditModal';
import { getStudentPasswordBreakdown, formatStudentCredentialsMessage } from '../../utils/studentAuthUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEdit: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  onEdit,
  onDelete,
}) => {
  const { classes, feePayments, examMarks, getStudentDueAmount, getStudentFeeBreakdown, settings, attendance, students } = useSchool();
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQuickPhoneOpen, setIsQuickPhoneOpen] = useState(false);
  const [shareTemplate, setShareTemplate] = useState<StudentShareTemplateId>('dossier');
  const [copiedCreds, setCopiedCreds] = useState(false);

  if (!isOpen || !student) return null;

  // Resolve fresh student by ID to avoid stale props
  const activeStudent = (student ? students.find((s) => s.id === student.id) : null) || student;

  const classInfo = classes.find((c) => c.id === activeStudent.classId);
  const studentPayments = feePayments.filter((p) => p.studentId === activeStudent.id && p.status !== 'Cancelled');
  const studentMarks = examMarks.filter((m) => m.studentId === activeStudent.id);
  const feeBreakdown = getStudentFeeBreakdown(activeStudent.id);
  const dues = feeBreakdown.netDue;
  const passwordBreakdown = getStudentPasswordBreakdown(
    activeStudent.fullName,
    activeStudent.guardianPhone || activeStudent.emergencyContact || ''
  );

  // Compute attendance stats
  const studentAttendanceRecords = attendance.filter(
    (r) => (r.targetId === activeStudent.id || (r as any).studentId === activeStudent.id) && (r.type === 'student' || !r.type)
  );
  const attendanceTotal = studentAttendanceRecords.length;
  const attendancePresent = studentAttendanceRecords.filter((r) => r.status === 'Present').length;
  const attendancePercentage = attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 100;

  const handleOpenShare = (template: StudentShareTemplateId = 'dossier') => {
    setShareTemplate(template);
    setIsShareModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-800 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-300">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase">{student.fullName}</h3>
              <p className="text-xs text-blue-300">
                Admission No: {student.admissionNo} • Class {classInfo?.name || student.classId}-{student.section}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenShare('dossier')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Send Student Details, Attendance, and Fees Link via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Details</span>
            </button>
            <button
              onClick={() => setIsPdfPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>A4 Profile PDF</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition cursor-pointer"
              title="छात्र का गलत विवरण सुधारें / संशोधन करें"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>विवरण सुधारें (संशोधन)</span>
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(student);
                }}
                className="p-1.5 rounded-lg bg-red-900/60 hover:bg-red-700 text-red-200 hover:text-white transition cursor-pointer"
                title="Delete Student Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Identity & Status Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Student ID Badge Card */}
            <div className="bg-gradient-to-b from-blue-900 to-blue-950 text-white rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-md">
              <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-amber-400 flex items-center justify-center mb-2 overflow-hidden">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-blue-200" />
                )}
              </div>
              <h4 className="font-bold text-sm text-white uppercase">{student.fullName}</h4>
              <p className="text-[11px] text-amber-300 font-mono font-semibold">{student.admissionNo}</p>
              <span className="mt-2 text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-bold">
                {student.status}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-semibold block">CLASS & ROLL NUMBER</span>
                <span className="text-sm font-extrabold text-blue-950">
                  {classInfo?.name || student.classId} ({student.section})
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">Roll No: #{student.rollNo}</p>
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">BOARD:</span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-300">
                    {student.board || settings.board || 'UP BOARD'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">OUTSTANDING FEE DUES</span>
                  <span className={`text-base font-extrabold ${dues > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {settings.currencySymbol} {dues.toLocaleString('en-IN')}
                  </span>
                  <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                    <p>Yearly Total: ₹{feeBreakdown.totalYearlyDue.toLocaleString('en-IN')}</p>
                    <p>Paid: ₹{feeBreakdown.totalPaid.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {dues > 0 && (
                  <button
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 fill-current" />
                    <span>WhatsApp Fee Reminder</span>
                  </button>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-semibold block">EXAM PERFORMANCE</span>
                <span className="text-sm font-extrabold text-amber-800">
                  {studentMarks[0] ? `Rank #${studentMarks[0].rank || 1}` : 'Pending'}
                </span>
                <p className="text-[11px] text-slate-600 mt-1">
                  {studentMarks[0] ? `${studentMarks[0].percentage.toFixed(1)}% (Grade ${studentMarks[0].grade})` : 'Term 1 Upcoming'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Date of Birth (जन्म तिथि)</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{formatDateToDDMMYYYY(student.dob)}</span>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      normalizeGender(student.gender) === 'Female'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-blue-50 text-blue-900 border-blue-200'
                    }`}
                  >
                    {normalizeGender(student.gender) === 'Female' ? '👧 Female' : '👦 Male'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    {student.bloodGroup || 'B+'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Guardian Contact</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickPhoneOpen(true)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>नंबर बदलें</span>
                  </button>
                </div>
                <span className="font-bold text-blue-900 text-xs font-mono">{activeStudent.guardianPhone}</span>
                <p className="text-[11px] text-slate-600 mt-1 truncate">Father: {activeStudent.fatherName}</p>
                {activeStudent.previousPhones && activeStudent.previousPhones.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    पुराना: {activeStudent.previousPhones.join(', ')}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Registration & Board</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{formatDateToDDMMYYYY(student.admissionDate)}</span>
                <p className="text-[11px] text-slate-700 font-semibold mt-1">
                  Board: <span className="text-emerald-800 font-bold">{student.board || settings.board || 'UP BOARD'}</span>
                </p>
                <p className="text-[10px] text-slate-500">Category: {student.category || 'General'}</p>
              </div>
            </div>
          </div>

          {/* Student & Parent Portal Login Credentials Card */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-blue-950 text-white rounded-xl p-4 shadow-sm border border-emerald-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Student Portal Login Credentials (लॉगिन विवरण)</span>
                    <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-400/30">
                      Auto-Formula
                    </span>
                  </h4>
                  <p className="text-[11px] text-teal-200/90 mt-0.5">
                    First 4 letters of name in CAPITAL ({passwordBreakdown.namePart}) + Last 4 digits of mobile ({passwordBreakdown.phonePart})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = formatStudentCredentialsMessage(student, settings.schoolName);
                    const cleanPhone = (student.guardianPhone || '').replace(/\D/g, '');
                    const waUrl = cleanPhone.length >= 10
                      ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodeURIComponent(msg)}`
                      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                    dispatchSafeMessage(waUrl, 'whatsapp', msg);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                  title="Send login credentials to parent on WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp Details</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const text = `Student: ${student.fullName}\nLogin ID: ${student.admissionNo}\nPassword: ${passwordBreakdown.password}`;
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 2000);
                    } catch {
                      window.prompt('Student Login Credentials:', text);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/20 transition cursor-pointer"
                  title="Copy Login ID and Password"
                >
                  {copiedCreds ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID & Pass</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                <span className="text-[10px] text-teal-200 font-bold uppercase block">Login ID / Username:</span>
                <span className="text-xs font-black text-white font-mono block mt-0.5">
                  {student.admissionNo} <span className="text-[10px] text-teal-200 font-sans font-normal">(or {student.guardianPhone || 'Mobile'})</span>
                </span>
              </div>

              <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                <span className="text-[10px] text-teal-200 font-bold uppercase block">Created Password:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-amber-300 font-mono tracking-wider bg-black/30 px-2 py-0.5 rounded border border-amber-400/40">
                    {passwordBreakdown.password}
                  </span>
                  <span className="text-[10px] text-teal-200 font-mono">
                    ({passwordBreakdown.namePart}+{passwordBreakdown.phonePart})
                  </span>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-2.5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-200 font-bold uppercase block">Portal Access:</span>
                  <span className="text-xs font-bold text-emerald-300 block mt-0.5">
                    Strictly Read-Only
                  </span>
                </div>
                <span className="text-[10px] text-teal-200">
                  Marksheets • Attendance • Fees
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Reports & Student Links Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>WhatsApp Student Reports & Links (व्हाट्सएप छात्र विवरण लिंक)</span>
                    <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.2 rounded-full font-bold">
                      1-Click Send
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Send official attendance, due fees, paid receipts, and full portal dossier directly to parent ({student.guardianPhone || 'Mobile'}).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenShare('dossier')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Open WhatsApp Center</span>
              </button>
            </div>

            {/* 4 Quick 1-Click Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => handleOpenShare('attendance')}
                className="p-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold transition flex flex-col items-center justify-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer group"
                title="Send Attendance Record & Calendar link to WhatsApp"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="mt-0.5 font-bold">📅 Attendance Report</span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {attendancePercentage}% ({attendancePresent}/{attendanceTotal} Days)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenShare('due_fee')}
                className="p-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-950 text-xs font-bold transition flex flex-col items-center justify-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer group"
                title="Send Due Fee Reminder & Payment Link to WhatsApp"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 group-hover:bg-rose-200 text-rose-800 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="mt-0.5 font-bold">💰 Due Fees Alert</span>
                <span className="text-[10px] text-rose-700 font-semibold">
                  ₹{dues.toLocaleString('en-IN')} Outstanding
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenShare('paid_fee')}
                className="p-3 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-950 text-xs font-bold transition flex flex-col items-center justify-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer group"
                title="Send Paid Fee Summary & Receipt Download Link to WhatsApp"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 group-hover:bg-blue-200 text-blue-800 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="mt-0.5 font-bold">🧾 Paid Fees Receipt</span>
                <span className="text-[10px] text-blue-700 font-semibold">
                  ₹{feeBreakdown.totalPaid.toLocaleString('en-IN')} Deposited
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenShare('dossier')}
                className="p-3 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold transition flex flex-col items-center justify-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer group"
                title="Share Full Student Academic Dossier & Direct Portal Link"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="mt-0.5 font-bold">📋 Complete Dossier</span>
                <span className="text-[10px] text-emerald-200 font-semibold">
                  All-in-One Link
                </span>
              </button>
            </div>
          </div>

          {/* Yearly Fee Assessment & Due Breakdown Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-800" />
                  <span>Yearly Fee Assessment & Due Breakdown</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assessed annual fee components including Tuition, Admission, Registration, Exam, Conveyance, and Late Fine.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onEdit(student);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Due Fees</span>
              </button>
            </div>

            {/* 6 Fee Breakdown Components */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Tuition Fees</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ₹{feeBreakdown.tuitionFee.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  ~₹{Math.round(feeBreakdown.tuitionFee / 12)}/mo
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Admission</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ₹{feeBreakdown.admissionFee.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Annual / Admission</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Registration</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ₹{feeBreakdown.registrationFee.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Enrolment</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Exam Fees</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ₹{feeBreakdown.examFee.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Annual / Term</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Convey Fees</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ₹{feeBreakdown.conveyFee.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Transport / Bus</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Late Fine</span>
                <span className={`text-xs font-black block mt-0.5 ${feeBreakdown.lateFine > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  ₹{feeBreakdown.lateFine.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Arrears / Fine</span>
              </div>
            </div>

            {/* Total Due Summary Ribbon */}
            <div className="bg-slate-900 text-white rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Total Yearly Assessment:</span>
                <span className="text-sm font-black text-white">
                  ₹{feeBreakdown.totalYearlyDue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Total Collected:</span>
                <span className="text-sm font-black text-emerald-400">
                  ₹{feeBreakdown.totalPaid.toLocaleString('en-IN')}
                </span>
              </div>

              {(feeBreakdown.totalDiscount || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-medium">Concession / छूट:</span>
                  <span className="text-sm font-black text-amber-300">
                    ₹{(feeBreakdown.totalDiscount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-amber-300 font-medium">Outstanding Net Due:</span>
                <span className={`text-sm font-black px-2 py-0.5 rounded ${
                  feeBreakdown.netDue > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  ₹{feeBreakdown.netDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quick WhatsApp Fee Actions */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500">WhatsApp Fee Notices (व्हाट्सएप पर फीस विवरण भेजें):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenShare('due_fee')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  title="Send Due Fee Notice on WhatsApp"
                >
                  <Send className="w-3 h-3 text-rose-700" />
                  <span>Send Due Fees ({settings.currencySymbol}{feeBreakdown.netDue})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenShare('paid_fee')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                  title="Send Paid Fees & Receipt Summary on WhatsApp"
                >
                  <Receipt className="w-3 h-3 text-emerald-700" />
                  <span>Send Paid Receipts ({settings.currencySymbol}{feeBreakdown.totalPaid})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Academic & Parent Info Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parent & Bio Particulars */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-2">
                <User className="w-4 h-4 text-blue-900" />
                <span>Family & Guardian Record</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Father's Name:</span>
                  <span className="font-semibold text-slate-900">{student.fatherName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mother's Name:</span>
                  <span className="font-semibold text-slate-900">{student.motherName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Residential Address:</span>
                  <span className="font-medium text-slate-800 text-right max-w-xs">{student.address}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Aadhaar Card UID:</span>
                  <span className="font-mono text-slate-800">{student.aadhaarNo || '7845 9901 2341'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Emergency Phone:</span>
                  <span className="font-bold text-blue-900">{student.emergencyContact}</span>
                </div>
              </div>
            </div>

            {/* Fee Receipts History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-2">
                <CreditCard className="w-4 h-4 text-emerald-800" />
                <span>Recent Fee Payments ({studentPayments.length})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {studentPayments.length > 0 ? (
                  studentPayments.map((p) => (
                    <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-blue-950 block text-[11px]">{p.receiptNo}</span>
                        <span className="text-[10px] text-slate-500">{p.date} • {p.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-800 text-xs block">
                          {settings.currencySymbol} {p.amountPaid.toLocaleString('en-IN')}
                        </span>
                        {p.discount > 0 && (
                          <span className="text-[9.5px] font-bold text-emerald-700 block">
                            (-{settings.currencySymbol}{p.discount.toLocaleString('en-IN')} छूट)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-center py-4">No fee payments logged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* School Conveyance / Transport Record */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-amber-600" />
                <span>School Conveyance & Transport Details (वाहन विवरण)</span>
              </div>
              {student.conveyVehicle && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Enrolled
                </span>
              )}
            </h4>

            {student.conveyVehicle || (student.conveyFee && student.conveyFee > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Vehicle</span>
                  <span className="font-bold text-slate-900">{student.conveyVehicle || 'School Bus'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Route</span>
                  <span className="font-bold text-slate-900 truncate block">{student.conveyRoute || 'Local Route'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Pickup Stoppage</span>
                  <span className="font-bold text-slate-900 truncate block">{student.conveyStop || student.address || 'School Gate'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Driver Contact</span>
                  <span className="font-bold text-slate-900">{student.conveyDriverName || 'Driver'}</span>
                  <span className="text-[10px] text-blue-900 block font-mono">{student.conveyDriverPhone || settings.phone}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs py-2">
                This student is not currently availing school transport (Conveyance Fee: ₹0).
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center">
          <span className="text-slate-500 text-[11px]">SBSC Public School ERP • Bairwa Nankar, Siddharthnagar</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* A4 Printable Modal */}
      <PrintPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        title={`Student Profile - ${student.fullName}`}
        fileName={`SBSC-Profile-${student.rollNo}-${student.fullName.replace(/\s+/g, '_')}.pdf`}
      >
        <StudentProfilePdf student={student} />
      </PrintPreviewModal>

      {/* WhatsApp Fee Due Reminder Modal */}
      <WhatsAppFeeReminderModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        initialStudent={student}
      />

      {/* WhatsApp Student Details & Portal Link Modal */}
      <StudentShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        student={student}
        studentClass={classInfo}
        attendanceStats={{
          total: attendanceTotal,
          present: attendancePresent,
          percentage: attendancePercentage,
        }}
        feeBreakdown={{
          totalFee: feeBreakdown.totalYearlyDue,
          paidAmount: feeBreakdown.totalPaid,
          dueAmount: feeBreakdown.netDue,
        }}
        releasedMarksCount={studentMarks.length}
        schoolName={settings.schoolName || settings.name}
        initialTemplate={shareTemplate}
      />

      {/* Quick Phone Edit Modal */}
      <QuickPhoneEditModal
        isOpen={isQuickPhoneOpen}
        onClose={() => setIsQuickPhoneOpen(false)}
        student={activeStudent}
      />
    </div>
  );
};
