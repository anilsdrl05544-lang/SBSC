import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Student } from '../../types/school';
import { formatDateToDDMMYYYY, normalizeGender } from '../../utils/dateUtils';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  Award,
  CreditCard,
  FileSpreadsheet,
  MessageSquare,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCircle2,
  X,
  AlertTriangle,
  UserMinus,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  Sparkles,
  DollarSign,
  Zap,
  User,
  KeyRound,
  EyeOff,
  Check,
  Copy,
} from 'lucide-react';
import { QuickStudentSmsModal } from './QuickStudentSmsModal';
import { StudentAdmissionModal } from './StudentAdmissionModal';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentShareModal, StudentShareTemplateId } from './StudentShareModal';
import { SetStudentPasswordModal } from './SetStudentPasswordModal';
import { QuickPhoneEditModal } from './QuickPhoneEditModal';
import { getStudentEffectivePassword } from '../../utils/studentAuthUtils';
import { WhatsAppFeeReminderModal } from '../fees/WhatsAppFeeReminderModal';
import { StudentFeeEditModal } from '../fees/StudentFeeEditModal';
import { BulkFeeOperationsModal } from '../fees/BulkFeeOperationsModal';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { StudentListPdf } from '../reports/templates/StudentListPdf';
import { exportTableToCsv } from '../../services/pdfService';
import { cleanPhoneNumber, formatPhoneForSms, generateGroupSmsUrl, dispatchSafeMessage } from '../../services/whatsappService';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { BulkDeleteStudentsModal } from './BulkDeleteStudentsModal';

interface StudentManagementProps {
  onNavigate?: (module: string) => void;
}

export type StudentSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'admission-asc'
  | 'admission-desc'
  | 'class-asc'
  | 'class-desc'
  | 'roll-asc'
  | 'roll-desc'
  | 'father-asc'
  | 'father-desc'
  | 'contact-asc'
  | 'contact-desc'
  | 'status-asc'
  | 'status-desc';

export const StudentManagement: React.FC<StudentManagementProps> = ({ onNavigate }) => {
  const {
    students,
    classes,
    deleteStudent,
    bulkDeleteStudents,
    getStudentDueAmount,
    getStudentFeeBreakdown,
    attendance,
    settings,
    loginAsStudent,
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Sorting and Alphabetical Index state (default: Alphabetical A-Z)
  const [sortBy, setSortBy] = useState<StudentSortOption>('name-asc');
  const [alphabetFilter, setAlphabetFilter] = useState<string>('ALL');
  const [showAlphabetHeads, setShowAlphabetHeads] = useState<boolean>(true);

  // Letters available in current class/section/status scope
  const alphabetLetterStats = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const counts: Record<string, number> = {};
    students
      .filter((s) => {
        const matchesClass = filterClass ? s.classId === filterClass : true;
        const matchesSection = filterSection ? s.section === filterSection : true;
        const matchesStatus = filterStatus ? s.status === filterStatus : true;
        return matchesClass && matchesSection && matchesStatus;
      })
      .forEach((s) => {
        const firstLetter = s.fullName.trim().charAt(0).toUpperCase();
        if (firstLetter >= 'A' && firstLetter <= 'Z') {
          counts[firstLetter] = (counts[firstLetter] || 0) + 1;
        }
      });
    return { letters, counts };
  }, [students, filterClass, filterSection, filterStatus]);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modals state
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [selectedStudentForView, setSelectedStudentForView] = useState<Student | null>(null);
  const [studentForQuickPhone, setStudentForQuickPhone] = useState<Student | null>(null);
  const [isListPrintOpen, setIsListPrintOpen] = useState(false);
  const [studentForWhatsApp, setStudentForWhatsApp] = useState<Student | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [studentForShare, setStudentForShare] = useState<Student | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalTemplate, setShareModalTemplate] = useState<StudentShareTemplateId>('dossier');
  const [isQuickSmsOpen, setIsQuickSmsOpen] = useState(false);

  // Always resolve latest student by ID to avoid stale state
  const currentStudentToEdit = useMemo(
    () => (studentToEdit ? students.find((s) => s.id === studentToEdit.id) || studentToEdit : null),
    [studentToEdit, students]
  );
  const currentSelectedStudentForView = useMemo(
    () => (selectedStudentForView ? students.find((s) => s.id === selectedStudentForView.id) || selectedStudentForView : null),
    [selectedStudentForView, students]
  );
  const currentStudentForQuickPhone = useMemo(
    () => (studentForQuickPhone ? students.find((s) => s.id === studentForQuickPhone.id) || studentForQuickPhone : null),
    [studentForQuickPhone, students]
  );
  const currentStudentForWhatsApp = useMemo(
    () => (studentForWhatsApp ? students.find((s) => s.id === studentForWhatsApp.id) || studentForWhatsApp : null),
    [studentForWhatsApp, students]
  );
  const currentStudentForShare = useMemo(
    () => (studentForShare ? students.find((s) => s.id === studentForShare.id) || studentForShare : null),
    [studentForShare, students]
  );

  // Delete modal state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Fee Edit & Bulk Zero Fee modal state
  const [studentForFeeEdit, setStudentForFeeEdit] = useState<Student | null>(null);
  const [isStudentFeeEditModalOpen, setIsStudentFeeEditModalOpen] = useState(false);
  const [isBulkFeeModalOpen, setIsBulkFeeModalOpen] = useState(false);
  const [bulkFeeStudentIds, setBulkFeeStudentIds] = useState<string[]>([]);
  const [bulkFeeClassId, setBulkFeeClassId] = useState<string>('');

  // Password setting & visibility state
  const [studentForPasswordSet, setStudentForPasswordSet] = useState<Student | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Fee totals across all enrolled students
  const feeTotals = useMemo(() => {
    let totalPaid = 0;
    let totalDiscount = 0;
    let totalDue = 0;
    students.forEach((s) => {
      const b = getStudentFeeBreakdown(s.id);
      totalPaid += b?.totalPaid || 0;
      totalDiscount += b?.totalDiscount || 0;
      totalDue += b?.netDue || 0;
    });
    return { totalPaid, totalDiscount, totalDue };
  }, [students, getStudentFeeBreakdown]);

  // Filter & Alphabetical Sorting logic across all heads
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.rollNo.includes(searchTerm) ||
          s.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.guardianPhone.includes(searchTerm);

        const matchesClass = filterClass ? s.classId === filterClass : true;
        const matchesSection = filterSection ? s.section === filterSection : true;
        const matchesStatus = filterStatus ? s.status === filterStatus : true;
        const matchesAlphabet =
          alphabetFilter === 'ALL'
            ? true
            : s.fullName.trim().toUpperCase().startsWith(alphabetFilter);

        return matchesSearch && matchesClass && matchesSection && matchesStatus && matchesAlphabet;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') {
          return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }) || a.rollNo.localeCompare(b.rollNo);
        }
        if (sortBy === 'name-desc') {
          return b.fullName.localeCompare(a.fullName, undefined, { sensitivity: 'base' }) || a.rollNo.localeCompare(b.rollNo);
        }
        if (sortBy === 'admission-asc') {
          return a.admissionNo.localeCompare(b.admissionNo, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'admission-desc') {
          return b.admissionNo.localeCompare(a.admissionNo, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'class-asc') {
          const classA = (classes.find((c) => c.id === a.classId)?.name || a.classId) + ' ' + a.section;
          const classB = (classes.find((c) => c.id === b.classId)?.name || b.classId) + ' ' + b.section;
          return classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'class-desc') {
          const classA = (classes.find((c) => c.id === a.classId)?.name || a.classId) + ' ' + a.section;
          const classB = (classes.find((c) => c.id === b.classId)?.name || b.classId) + ' ' + b.section;
          return classB.localeCompare(classA, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'roll-asc') {
          return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'roll-desc') {
          return b.rollNo.localeCompare(a.rollNo, undefined, { numeric: true, sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'father-asc') {
          return a.fatherName.localeCompare(b.fatherName, undefined, { sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'father-desc') {
          return b.fatherName.localeCompare(a.fatherName, undefined, { sensitivity: 'base' }) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'contact-asc') {
          return a.guardianPhone.localeCompare(b.guardianPhone) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'contact-desc') {
          return b.guardianPhone.localeCompare(a.guardianPhone) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'status-asc') {
          return a.status.localeCompare(b.status) || a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'status-desc') {
          return b.status.localeCompare(a.status) || a.fullName.localeCompare(b.fullName);
        }
        return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      });
  }, [students, searchTerm, filterClass, filterSection, filterStatus, alphabetFilter, sortBy, classes]);

  // Counts of students per letter head in currently filtered set
  const filteredLetterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach((s) => {
      const l = s.fullName.trim().charAt(0).toUpperCase();
      if (l >= 'A' && l <= 'Z') {
        counts[l] = (counts[l] || 0) + 1;
      }
    });
    return counts;
  }, [filteredStudents]);

  // Select / Deselect all students for a specific letter head
  const handleToggleLetterSelection = (letter: string) => {
    const studentsInLetter = filteredStudents.filter(
      (s) => s.fullName.trim().charAt(0).toUpperCase() === letter
    );
    const idsInLetter = studentsInLetter.map((s) => s.id);
    const allSelected = idsInLetter.length > 0 && idsInLetter.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !idsInLetter.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsInLetter])));
    }
  };

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleDirectOneClickSms = (templateType: 'notice' | 'holiday' | 'fee' | 'exam' | 'ptm' = 'notice') => {
    if (selectedIds.length === 0) return;
    const selectedList = students.filter((s) => selectedIds.includes(s.id));
    const rawPhones = selectedList.map((s) => s.guardianPhone || s.emergencyContact);
    const validPhones: string[] = Array.from(
      new Set(rawPhones.map((p) => formatPhoneForSms(p)).filter((p): p is string => Boolean(p)))
    );

    if (validPhones.length === 0) {
      showToast('⚠️ None of the selected students have a valid phone number on record.');
      return;
    }

    const schoolName = settings.name || settings.schoolName || 'SBSC Public School';
    const schoolPhone = settings.phone || settings.contactNumber || '9876543210';
    const schoolUpi = settings.upiId || 'anilsingh636-2@oksbi';

    let msg = `Dear Parent, this is an official announcement from ${schoolName}. Please check your ward's school diary for details. Helpline: ${schoolPhone}.`;

    if (templateType === 'holiday') {
      msg = `Dear Parent, please be informed that ${schoolName} will remain closed tomorrow due to official holiday. Regular classes will resume on the next working day. Principal.`;
    } else if (templateType === 'fee') {
      msg = `Dear Parent, gentle reminder from ${schoolName}: School fee dues are pending for your ward. Kindly clear dues via UPI: ${schoolUpi} or at the fee counter. Contact: ${schoolPhone}.`;
    } else if (templateType === 'exam') {
      msg = `Dear Parent, examination / periodic tests will commence shortly at ${schoolName}. Please ensure your ward arrives on time with complete admit card and stationery. Exam Dept.`;
    } else if (templateType === 'ptm') {
      msg = `Dear Parent, Parent-Teacher Meeting (PTM) is scheduled at ${schoolName}. You are cordially invited to discuss your ward's academic progress with teachers. Contact: ${schoolPhone}.`;
    }

    const url = generateGroupSmsUrl(validPhones, msg);
    dispatchSafeMessage(url, 'sms', msg);

    try {
      navigator.clipboard.writeText(validPhones.join(', '));
    } catch {}

    showToast(`⚡ 1-Click SMS launched! (${validPhones.length} numbers & message ready)`);
  };

  const handleExportCsv = () => {
    const headers = [
      'Admission No',
      'Roll No',
      'Student Name',
      'Class',
      'Section',
      'Gender',
      'DOB (DD/MM/YYYY)',
      'Father Name',
      'Mother Name',
      'Contact',
      'Status',
      'Category',
      'Address',
    ];

    const rows = filteredStudents.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
      return [
        s.admissionNo,
        s.rollNo,
        s.fullName,
        cls,
        s.section,
        s.gender,
        formatDateToDDMMYYYY(s.dob),
        s.fatherName,
        s.motherName,
        s.guardianPhone,
        s.status,
        s.category,
        s.address,
      ];
    });

    exportTableToCsv(`SBSC-Students-Master-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const handleExportSelectedCsv = () => {
    if (selectedIds.length === 0) return;
    const selectedList = students.filter((s) => selectedIds.includes(s.id));
    const headers = [
      'Admission No',
      'Roll No',
      'Student Name',
      'Class',
      'Section',
      'Gender',
      'DOB (DD/MM/YYYY)',
      'Father Name',
      'Mother Name',
      'Contact',
      'Status',
      'Category',
      'Address',
    ];

    const rows = selectedList.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
      return [
        s.admissionNo,
        s.rollNo,
        s.fullName,
        cls,
        s.section,
        s.gender,
        formatDateToDDMMYYYY(s.dob),
        s.fatherName,
        s.motherName,
        s.guardianPhone,
        s.status,
        s.category,
        s.address,
      ];
    });

    exportTableToCsv(`SBSC-Selected-Students-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const handleConfirmSingleDelete = () => {
    if (!studentToDelete) return;
    const name = studentToDelete.fullName;
    deleteStudent(studentToDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== studentToDelete.id));
    setStudentToDelete(null);
    showToast(`✓ Student record for "${name}" has been permanently removed.`);
  };

  const handleConfirmBulkDelete = () => {
    const count = selectedIds.length;
    bulkDeleteStudents(selectedIds);
    setSelectedIds([]);
    setIsBulkDeleteOpen(false);
    showToast(`✓ Successfully removed ${count} student records from school database.`);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="bg-emerald-900 text-emerald-100 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-lg border border-emerald-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Student Information System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Student Admission & Profiles</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage student admissions, verify documentation, generate ID cards and A4 student rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                id="btn-top-one-click-sms"
                onClick={() => handleDirectOneClickSms('notice')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-black transition cursor-pointer shadow-md active:scale-95 border border-blue-400/40"
                title="Send SMS to all selected students with 1 single click"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>⚡ 1-Click SMS ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                id="btn-top-sms-templates"
                onClick={() => setIsQuickSmsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 text-xs font-bold transition cursor-pointer"
                title="Choose SMS template or edit message"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                <span>SMS Templates</span>
              </button>

              <button
                onClick={() => setIsBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Sheet (.xlsx)</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-700" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsListPrintOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-900" />
            <span>Print A4 List</span>
          </button>

          <button
            onClick={() => {
              setBulkFeeStudentIds(selectedIds);
              setBulkFeeClassId(filterClass || '');
              setIsBulkFeeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
            title="Configure Zero Fee (₹0) or editable fee options for all or selected students"
          >
            <Sparkles className="w-4 h-4 fill-current text-slate-950" />
            <span>Zero Fee & Bulk Options</span>
          </button>

          <button
            onClick={() => {
              setStudentToEdit(null);
              setIsAdmissionOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>New Student Admission</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">TOTAL ENROLLED</span>
          <span className="text-lg font-extrabold text-blue-950">{students.length} Students</span>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
            {students.filter((s) => s.status === 'Active').length} Active
          </span>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs bg-emerald-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">TOTAL PAID (जमा)</span>
          <span className="text-lg font-black text-emerald-700">
            ₹{feeTotals.totalPaid.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Fee Deposited</span>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs bg-amber-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">DISCOUNT (छूट)</span>
          <span className="text-lg font-black text-amber-700">
            ₹{feeTotals.totalDiscount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">Total Concessions</span>
        </div>
        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs bg-rose-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">PENDING DUES (बकाया)</span>
          <span className="text-lg font-black text-rose-700">
            ₹{feeTotals.totalDue.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">Net Outstanding</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">BOYS / GIRLS RATIO</span>
          <span className="text-lg font-extrabold text-slate-800">
            {students.filter((s) => normalizeGender(s.gender) === 'Male').length}B /{' '}
            {students.filter((s) => normalizeGender(s.gender) === 'Female').length}G
          </span>
          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Gender Distribution</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">CLASSES OPERATIONAL</span>
          <span className="text-lg font-extrabold text-indigo-900">{classes.length} Classes</span>
          <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">{settings.board || 'UP BOARD'}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, roll no, admission no, father..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-blue-900"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-blue-900"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-blue-900"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-blue-900"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>

          {/* Sort Order Selector (All Heads Alphabetical) */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StudentSortOption)}
              className="w-full py-2 pl-8 pr-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-bold text-blue-950 focus:outline-blue-900 cursor-pointer"
              title="Sort by any table head alphabetically or numerically"
            >
              <optgroup label="Student Name">
                <option value="name-asc">Student Name (A → Z)</option>
                <option value="name-desc">Student Name (Z → A)</option>
              </optgroup>
              <optgroup label="Father's Name">
                <option value="father-asc">Father's Name (A → Z)</option>
                <option value="father-desc">Father's Name (Z → A)</option>
              </optgroup>
              <optgroup label="Class & Section">
                <option value="class-asc">Class & Section (A → Z)</option>
                <option value="class-desc">Class & Section (Z → A)</option>
              </optgroup>
              <optgroup label="Admission No">
                <option value="admission-asc">Admission No (A → Z / Asc)</option>
                <option value="admission-desc">Admission No (Z → A / Desc)</option>
              </optgroup>
              <optgroup label="Roll Number">
                <option value="roll-asc">Roll No (1 → 99)</option>
                <option value="roll-desc">Roll No (99 → 1)</option>
              </optgroup>
              <optgroup label="Contact Phone">
                <option value="contact-asc">Contact Phone (A → Z)</option>
                <option value="contact-desc">Contact Phone (Z → A)</option>
              </optgroup>
              <optgroup label="Enrollment Status">
                <option value="status-asc">Status (A → Z)</option>
                <option value="status-desc">Status (Z → A)</option>
              </optgroup>
            </select>
            <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Alphabetical Quick-Index Bar (A - Z) & Heads Control */}
        <div className="pt-2.5 pb-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                <span>ALPHABETICAL ROSTER INDEX:</span>
              </div>
              {alphabetFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  <span>Letter: "{alphabetFilter}" ({filteredStudents.length} students)</span>
                  <button
                    type="button"
                    onClick={() => setAlphabetFilter('ALL')}
                    className="hover:text-red-700 ml-1 cursor-pointer font-black"
                    title="Clear letter filter and show all A-Z"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {/* Toggle Alphabetical Section Headings */}
              <button
                type="button"
                onClick={() => setShowAlphabetHeads((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                  showAlphabetHeads
                    ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Toggle alphabetical letter headings (A, B, C...) in the student list"
              >
                <Sparkles className={`w-3 h-3 ${showAlphabetHeads ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Letter Heads (A–Z): {showAlphabetHeads ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="hidden sm:inline">Active Head:</span>
                <span className="inline-flex items-center gap-1 font-bold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/70 text-[11px]">
                  {sortBy === 'name-asc' && (
                    <>
                      <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                      <span>Name (A → Z)</span>
                    </>
                  )}
                  {sortBy === 'name-desc' && (
                    <>
                      <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                      <span>Name (Z → A)</span>
                    </>
                  )}
                  {sortBy === 'father-asc' && <span>Father (A → Z)</span>}
                  {sortBy === 'father-desc' && <span>Father (Z → A)</span>}
                  {sortBy === 'class-asc' && <span>Class (A → Z)</span>}
                  {sortBy === 'class-desc' && <span>Class (Z → A)</span>}
                  {sortBy === 'admission-asc' && <span>Adm No (A → Z)</span>}
                  {sortBy === 'admission-desc' && <span>Adm No (Z → A)</span>}
                  {sortBy === 'roll-asc' && <span>Roll (1 → 99)</span>}
                  {sortBy === 'roll-desc' && <span>Roll (99 → 1)</span>}
                  {sortBy === 'contact-asc' && <span>Phone (A → Z)</span>}
                  {sortBy === 'contact-desc' && <span>Phone (Z → A)</span>}
                  {sortBy === 'status-asc' && <span>Status (A → Z)</span>}
                  {sortBy === 'status-desc' && <span>Status (Z → A)</span>}
                </span>
                {sortBy !== 'name-asc' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('name-asc')}
                    className="text-[10px] text-blue-900 hover:underline font-bold cursor-pointer"
                    title="Reset to Student Name Alphabetical"
                  >
                    Reset A-Z
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick-Click Letter Chips */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setAlphabetFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                alphabetFilter === 'ALL'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ALL (A-Z)
            </button>
            {alphabetLetterStats.letters.map((letter) => {
              const count = alphabetLetterStats.counts[letter] || 0;
              const isCurrent = alphabetFilter === letter;
              const hasStudents = count > 0;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasStudents}
                  onClick={() => setAlphabetFilter(letter)}
                  className={`px-2 py-0.5 text-xs font-bold rounded-md transition cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-950 text-white shadow-xs scale-105 ring-2 ring-blue-300'
                      : hasStudents
                      ? 'bg-blue-50/90 hover:bg-blue-100 text-blue-950 border border-blue-200/80 hover:scale-105'
                      : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-40'
                  }`}
                  title={
                    hasStudents
                      ? `Show students with name starting with ${letter} (${count})`
                      : `No students starting with ${letter}`
                  }
                >
                  <span>{letter}</span>
                  {hasStudents && (
                    <span className={`ml-0.5 text-[9px] ${isCurrent ? 'text-blue-200' : 'text-blue-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Selection & Bulk Delete Options Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold transition cursor-pointer active:scale-95"
            >
              {filteredStudents.length > 0 && selectedIds.length === filteredStudents.length ? (
                <CheckSquare className="w-4 h-4 text-blue-900" />
              ) : selectedIds.length > 0 ? (
                <MinusSquare className="w-4 h-4 text-blue-900" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {filteredStudents.length > 0 && selectedIds.length === filteredStudents.length
                  ? 'Deselect All'
                  : `Select All (${filteredStudents.length})`}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium transition cursor-pointer"
              >
                Clear Selection
              </button>
            )}

            {selectedIds.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px]">
                {selectedIds.length} of {filteredStudents.length} selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-table-one-click-sms"
                onClick={() => handleDirectOneClickSms('notice')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white font-black shadow-xs transition cursor-pointer active:scale-95 border border-blue-400/40"
                title="Send SMS to all selected students with 1 single click"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>⚡ 1-Click SMS ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                id="btn-table-sms-templates"
                onClick={() => setIsQuickSmsOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs transition cursor-pointer"
                title="Choose SMS template or edit message"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                <span>Templates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBulkFeeStudentIds(selectedIds);
                  setBulkFeeClassId(filterClass || '');
                  setIsBulkFeeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs transition cursor-pointer active:scale-95"
                title="Set fees to ₹0 or edit fees for selected students"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Zero Fee / Edit ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleExportSelectedCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black shadow-xs transition cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prominent Multi-Action Selection Banner with 1-Click SMS Presets */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-2 border-blue-300/80 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 flex flex-wrap items-center gap-2">
                <span>{selectedIds.length} Student{selectedIds.length > 1 ? 's' : ''} Selected</span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                  ({filteredStudents.length} displayed in list)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Send 1-Click SMS broadcast to all selected parents, customize templates, edit fee structures, or export records.
              </p>

              {/* 1-Click SMS Presets Bar */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  1-Click Presets:
                </span>
                <button
                  type="button"
                  onClick={() => handleDirectOneClickSms('notice')}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Send Notice SMS in 1 click"
                >
                  <span>📢 Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectOneClickSms('holiday')}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Send Holiday Alert SMS in 1 click"
                >
                  <span>🌴 Holiday</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectOneClickSms('fee')}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Send Fee Due SMS in 1 click"
                >
                  <span>💰 Fee Due</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectOneClickSms('exam')}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Send Exam Alert SMS in 1 click"
                >
                  <span>📝 Exam</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectOneClickSms('ptm')}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Send PTM Meeting SMS in 1 click"
                >
                  <span>🤝 PTM</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold cursor-pointer transition text-xs"
            >
              Clear
            </button>
            <button
              type="button"
              id="btn-banner-one-click-sms"
              onClick={() => handleDirectOneClickSms('notice')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white font-black shadow-md cursor-pointer active:scale-95 transition border border-blue-400/40 text-xs sm:text-sm"
              title="1-Click SMS to all selected students"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>⚡ 1-Click Send SMS ({selectedIds.length})</span>
            </button>
            <button
              type="button"
              id="btn-banner-sms-templates"
              onClick={() => setIsQuickSmsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 font-bold cursor-pointer transition text-xs"
              title="Custom message & templates modal"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
              <span>Templates</span>
            </button>
            <button
              type="button"
              onClick={handleExportSelectedCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold cursor-pointer transition text-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md shadow-red-600/20 cursor-pointer active:scale-95 transition text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Bulk Actions Dock */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-black">
              {selectedIds.length}
            </span>
            <span className="hidden sm:inline">Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <button
            type="button"
            id="btn-dock-one-click-sms"
            onClick={() => handleDirectOneClickSms('notice')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition border border-blue-400/30"
            title="1-Click SMS to all selected students"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>⚡ 1-Click Send SMS ({selectedIds.length})</span>
          </button>

          <button
            type="button"
            id="btn-dock-sms-templates"
            onClick={() => setIsQuickSmsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-200 font-bold text-xs border border-slate-700 cursor-pointer transition"
            title="Choose SMS template or edit message"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            type="button"
            onClick={handleExportSelectedCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 cursor-pointer transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkDeleteOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-900/40 cursor-pointer active:scale-95 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Deselect All"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Students Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-500 hover:text-blue-900 transition cursor-pointer"
                    title={selectedIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                  >
                    {filteredStudents.length > 0 && selectedIds.length === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-900" />
                    ) : selectedIds.length > 0 ? (
                      <MinusSquare className="w-4 h-4 text-blue-900" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                {/* Student Name Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer group select-none"
                    title="Sort by Student Name Alphabetical (A-Z / Z-A)"
                  >
                    <span>Student Name</span>
                    {sortBy === 'name-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'name-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Admission No Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'admission-asc' ? 'admission-desc' : 'admission-asc'))}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Admission No Alphabetical/Ascending"
                  >
                    <span>Admission No</span>
                    {sortBy === 'admission-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'admission-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Class & Sec Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'class-asc' ? 'class-desc' : 'class-asc'))}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Class & Section Alphabetical"
                  >
                    <span>Class & Sec</span>
                    {sortBy === 'class-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'class-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Roll No Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'roll-asc' ? 'roll-desc' : 'roll-asc'))}
                    className="flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Roll No Numerical (1-99 / 99-1)"
                  >
                    <span>Roll No</span>
                    {sortBy === 'roll-asc' ? (
                      <span className="text-blue-900 font-mono font-black text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">▲ 1-9</span>
                    ) : sortBy === 'roll-desc' ? (
                      <span className="text-blue-900 font-mono font-black text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">▼ 9-1</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Father's Name Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'father-asc' ? 'father-desc' : 'father-asc'))}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Father's Name Alphabetical (A-Z / Z-A)"
                  >
                    <span>Father's Name</span>
                    {sortBy === 'father-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'father-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Contact Head */}
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'contact-asc' ? 'contact-desc' : 'contact-asc'))}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Contact Number Alphabetical/Ascending"
                  >
                    <span>Contact</span>
                    {sortBy === 'contact-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'contact-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Status Head */}
                <th className="py-3 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => setSortBy((prev) => (prev === 'status-asc' ? 'status-desc' : 'status-asc'))}
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                    title="Sort by Enrollment Status Alphabetical"
                  >
                    <span>Status</span>
                    {sortBy === 'status-asc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                        <span>A-Z</span>
                      </span>
                    ) : sortBy === 'status-desc' ? (
                      <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                        <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                        <span>Z-A</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                    )}
                  </button>
                </th>

                {/* Total Paid Head */}
                <th className="py-3 px-3">
                  <span className="text-slate-700 font-bold">Total Paid (जमा)</span>
                </th>

                {/* Discount Amount Head */}
                <th className="py-3 px-3">
                  <span className="text-slate-700 font-bold">Discount (छूट)</span>
                </th>

                {/* Due Balance Head */}
                <th className="py-3 px-3">
                  <span className="text-slate-700 font-bold">Due (बकाया)</span>
                </th>

                {/* Password Head */}
                <th className="py-3 px-3">
                  <span className="text-slate-700 font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Password (पासवर्ड)</span>
                  </span>
                </th>

                {/* Actions Head */}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => {
                  const classObj = classes.find((c) => c.id === student.classId);
                  const isSelected = selectedIds.includes(student.id);
                  const feeBreakdown = getStudentFeeBreakdown(student.id);
                  const effectivePassword = getStudentEffectivePassword(student);
                  const isCustomPassword = Boolean(student.password && student.password.trim().length > 0);
                  const isPasswordVisible = visiblePasswordIds[student.id];

                  // Alphabetical letter head calculation
                  const currentLetter = student.fullName.trim().charAt(0).toUpperCase() || '#';
                  const prevLetter =
                    idx > 0
                      ? filteredStudents[idx - 1].fullName.trim().charAt(0).toUpperCase() || '#'
                      : null;
                  const isNewLetterHead = currentLetter !== prevLetter;
                  const letterCount = filteredLetterCounts[currentLetter] || 0;
                  const studentsInLetter = filteredStudents.filter(
                    (s) => s.fullName.trim().charAt(0).toUpperCase() === currentLetter
                  );
                  const isLetterFullySelected =
                    studentsInLetter.length > 0 &&
                    studentsInLetter.every((s) => selectedIds.includes(s.id));

                  return (
                    <React.Fragment key={student.id}>
                      {/* Alphabetical Section Letter Head */}
                      {showAlphabetHeads &&
                        (sortBy === 'name-asc' || sortBy === 'name-desc') &&
                        isNewLetterHead && (
                          <tr className="bg-slate-900 text-white font-bold select-none sticky top-0 z-10 shadow-xs">
                            <td
                              colSpan={13}
                              className="py-2 px-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border-y border-slate-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                                    {currentLetter}
                                  </span>
                                  <span className="text-xs font-black tracking-wider text-white uppercase">
                                    Alphabetical Head &ldquo;{currentLetter}&rdquo;
                                  </span>
                                  <span className="text-[10px] text-amber-300 font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                                    {letterCount} Student{letterCount !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLetterSelection(currentLetter)}
                                    className="text-[11px] text-amber-300 hover:text-white font-semibold underline cursor-pointer transition"
                                  >
                                    {isLetterFullySelected
                                      ? `Deselect "${currentLetter}"`
                                      : `Select All "${currentLetter}" (${letterCount})`}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                      <tr
                        className={`transition ${
                          isSelected
                            ? 'bg-blue-50/80 border-l-4 border-l-blue-600 font-medium'
                            : 'hover:bg-blue-50/40 border-l-4 border-l-transparent'
                        }`}
                      >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStudent(student.id)}
                          className="text-slate-400 hover:text-blue-900 transition cursor-pointer p-0.5"
                          title={isSelected ? `Deselect ${student.fullName}` : `Select ${student.fullName}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-900" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center font-bold text-blue-900 text-xs shrink-0">
                            {student.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedStudentForView(student)}
                                className="font-bold text-slate-900 hover:text-blue-900 text-left transition uppercase cursor-pointer"
                                title="View Profile Dossier"
                              >
                                {student.fullName}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentToEdit(student);
                                  setIsAdmissionOpen(true);
                                }}
                                title="गलत विवरण सुधारें (संशोधन) / Edit Details"
                                className="text-slate-400 hover:text-amber-700 hover:bg-amber-100 p-0.5 rounded transition cursor-pointer shrink-0"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              <span className={normalizeGender(student.gender) === 'Female' ? 'text-rose-700 font-semibold' : 'text-blue-900 font-semibold'}>
                                {normalizeGender(student.gender) === 'Female' ? '👧 Female' : '👦 Male'}
                              </span>
                              {' • DOB: '}
                              <span className="font-mono">{formatDateToDDMMYYYY(student.dob)}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Admission No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">
                        {student.admissionNo}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                          {classObj?.name || student.classId} - {student.section}
                        </span>
                      </td>

                      {/* Roll No */}
                      <td className="py-3 px-3 font-bold text-slate-900">#{student.rollNo}</td>

                      {/* Father */}
                      <td className="py-3 px-3 font-medium text-slate-700">{student.fatherName}</td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 group/phone">
                          <span className="font-mono text-[11px] text-blue-900 font-bold">
                            {student.guardianPhone || '—'}
                          </span>
                          <button
                            type="button"
                            title="मोबाइल नंबर तुरंत बदलें (Quick Edit Phone)"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentForQuickPhone(student);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-100 rounded transition-all"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        {student.previousPhones && student.previousPhones.length > 0 && (
                          <span
                            className="text-[9px] text-slate-400 font-mono block truncate max-w-[130px]"
                            title={`Previous: ${student.previousPhones.join(', ')}`}
                          >
                            पुराना: {student.previousPhones[student.previousPhones.length - 1]}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.status === 'Transferred'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      {/* Total Paid Amount */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block w-fit">
                            ₹{(feeBreakdown.totalPaid ?? 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">Total Paid</span>
                        </div>
                      </td>

                      {/* Discount Amount */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border inline-block w-fit ${
                              (feeBreakdown.totalDiscount ?? 0) > 0
                                ? 'text-amber-800 bg-amber-50 border-amber-200'
                                : 'text-slate-500 bg-slate-50 border-slate-200'
                            }`}
                          >
                            ₹{(feeBreakdown.totalDiscount ?? 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">Concession</span>
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border inline-block w-fit ${
                              (feeBreakdown.netDue ?? 0) <= 0
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}
                          >
                            ₹{(feeBreakdown.netDue ?? 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {(feeBreakdown.netDue ?? 0) <= 0 ? 'Cleared ✓' : 'Balance Due'}
                          </span>
                        </div>
                      </td>

                      {/* Password Set & Credentials */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            <span className="font-mono text-xs font-black text-slate-900 tracking-wider select-all">
                              {isPasswordVisible ? effectivePassword : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePasswordIds((prev) => ({
                                  ...prev,
                                  [student.id]: !prev[student.id],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition cursor-pointer"
                              title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(effectivePassword);
                                  setCopiedPasswordId(student.id);
                                  setTimeout(() => setCopiedPasswordId(null), 2000);
                                } catch {}
                              }}
                              className="text-slate-400 hover:text-blue-900 p-0.5 rounded transition cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedPasswordId === student.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setStudentForPasswordSet(student);
                              setIsPasswordModalOpen(true);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                              isCustomPassword
                                ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                            }`}
                            title="Click to Set or Change Password"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>{isCustomPassword ? 'Custom' : 'Set Pass'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setStudentForShare(student);
                              setShareModalTemplate(getStudentDueAmount(student.id) > 0 ? 'due_fee' : 'dossier');
                              setIsShareModalOpen(true);
                            }}
                            title={`WhatsApp Student Updates (Attendance, Due Fees, Paid Fees, Portal Link) • ${student.guardianPhone || 'Mobile'}`}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition border border-emerald-200 cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 fill-current text-emerald-600" />
                          </button>
                          {onNavigate && (
                            <button
                              onClick={() => {
                                const pass = getStudentEffectivePassword(student);
                                loginAsStudent(student.admissionNo, pass);
                                onNavigate('student-portal');
                              }}
                              title="View Verified Student Panel (छात्र पोर्टल)"
                              className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer border border-indigo-200"
                            >
                              <User className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedStudentForView(student)}
                            title="View Full Profile Dossier"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setStudentForFeeEdit(student);
                              setIsStudentFeeEditModalOpen(true);
                            }}
                            title="Edit Student Fee Structure / Zero Fee"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4 text-emerald-700" />
                          </button>
                          <button
                            onClick={() => {
                              setStudentToEdit(student);
                              setIsAdmissionOpen(true);
                            }}
                            title="गलत विवरण सुधारें (संशोधन) / Edit Student Record"
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer flex items-center gap-1 font-bold text-[11px] shadow-2xs shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>संशोधन</span>
                          </button>
                          <button
                            onClick={() => setStudentToDelete(student)}
                            title="Delete Student Permanently"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
              ) : (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    No matching student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>
            Showing <b>{filteredStudents.length}</b> of <b>{students.length}</b> enrolled students
            {selectedIds.length > 0 && <span className="ml-2 font-bold text-red-700">({selectedIds.length} selected)</span>}
          </span>
          <span className="font-medium text-slate-700">{settings.schoolName}, Bairwa Nankar</span>
        </div>
      </div>

      {/* Admission Modal */}
      <StudentAdmissionModal
        isOpen={isAdmissionOpen}
        onClose={() => {
          setIsAdmissionOpen(false);
          setStudentToEdit(null);
        }}
        studentToEdit={currentStudentToEdit}
        onDelete={(st) => setStudentToDelete(st)}
      />

      {/* Profile Modal */}
      <StudentProfileModal
        isOpen={!!currentSelectedStudentForView}
        onClose={() => setSelectedStudentForView(null)}
        student={currentSelectedStudentForView}
        onEdit={(st) => {
          setStudentToEdit(st);
          setIsAdmissionOpen(true);
        }}
        onDelete={(st) => setStudentToDelete(st)}
      />

      {/* Quick Phone Edit Modal */}
      <QuickPhoneEditModal
        isOpen={!!currentStudentForQuickPhone}
        onClose={() => setStudentForQuickPhone(null)}
        student={currentStudentForQuickPhone}
        onSuccess={(msg) => {
          setFeedbackToast(msg);
          setTimeout(() => setFeedbackToast(null), 4000);
        }}
      />

      {/* Print Master List Modal */}
      <PrintPreviewModal
        isOpen={isListPrintOpen}
        onClose={() => setIsListPrintOpen(false)}
        title="Student Master Enrolled List"
        fileName={`SBSC-Students-Roster-${new Date().toISOString().slice(0, 10)}.pdf`}
      >
        <StudentListPdf
          students={filteredStudents}
          selectedClass={classes.find((c) => c.id === filterClass)}
          section={filterSection}
        />
      </PrintPreviewModal>

      {/* WhatsApp Fee Due Reminder Modal */}
      <WhatsAppFeeReminderModal
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setStudentForWhatsApp(null);
        }}
        initialStudent={currentStudentForWhatsApp}
      />

      {/* Single Student Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Student Record"
        itemName={studentToDelete?.fullName}
        itemSubText={studentToDelete ? `Admission No: ${studentToDelete.admissionNo} • Roll #${studentToDelete.rollNo}` : undefined}
        message="Are you sure you want to permanently delete this student record from the school register? All active marks and attendance associated with this record will be removed."
        confirmButtonText="Yes, Delete Student"
      />

      {/* Bulk Students Delete Review & Confirmation Modal */}
      <BulkDeleteStudentsModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        selectedStudents={students.filter((s) => selectedIds.includes(s.id))}
        classes={classes}
        onRemoveStudent={(id) => setSelectedIds((prev) => prev.filter((item) => item !== id))}
      />

      {/* Student Individual Fee Edit Modal */}
      <StudentFeeEditModal
        isOpen={isStudentFeeEditModalOpen}
        onClose={() => {
          setIsStudentFeeEditModalOpen(false);
          setStudentForFeeEdit(null);
        }}
        student={studentForFeeEdit}
        onSuccess={(msg) => setFeedbackToast(msg)}
      />

      {/* Bulk Fee Operations & Zero-Fee Modal */}
      <BulkFeeOperationsModal
        isOpen={isBulkFeeModalOpen}
        onClose={() => {
          setIsBulkFeeModalOpen(false);
          setBulkFeeStudentIds([]);
          setBulkFeeClassId('');
        }}
        preSelectedStudentIds={bulkFeeStudentIds}
        preSelectedClassId={bulkFeeClassId}
        onSuccess={(msg) => setFeedbackToast(msg)}
      />

      {/* 1-Click Quick SMS Modal for Selected Students */}
      <QuickStudentSmsModal
        isOpen={isQuickSmsOpen}
        onClose={() => setIsQuickSmsOpen(false)}
        selectedStudents={students.filter((s) => selectedIds.includes(s.id))}
      />

      {/* WhatsApp Student Details & Portal Link Modal */}
      {studentForShare && (
        <StudentShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setStudentForShare(null);
          }}
          student={studentForShare}
          studentClass={classes.find((c) => c.id === studentForShare.classId)}
          feeBreakdown={(() => {
            const breakdown = getStudentFeeBreakdown(studentForShare.id);
            return {
              totalFee: breakdown.totalYearlyDue,
              paidAmount: breakdown.totalPaid,
              dueAmount: breakdown.netDue,
            };
          })()}
          attendanceStats={(() => {
            const recs = attendance.filter(
              (r) =>
                (r.targetId === studentForShare.id || (r as any).studentId === studentForShare.id) &&
                (r.type === 'student' || !r.type)
            );
            const total = recs.length;
            const present = recs.filter((r) => r.status === 'Present').length;
            return {
              total,
              present,
              percentage: total > 0 ? Math.round((present / total) * 100) : 100,
            };
          })()}
          schoolName={settings.schoolName || settings.name}
          initialTemplate={shareModalTemplate}
        />
      )}

      {/* Set Student Password Modal */}
      <SetStudentPasswordModal
        student={studentForPasswordSet}
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setStudentForPasswordSet(null);
        }}
        onPasswordUpdated={(newPass) => {
          showToast(
            newPass
              ? `✓ Password updated for ${studentForPasswordSet?.fullName}: ${newPass}`
              : `✓ Password reset to formula for ${studentForPasswordSet?.fullName}`
          );
        }}
      />
    </div>
  );
};
