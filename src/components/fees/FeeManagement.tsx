import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { FeePayment, Student } from '../../types/school';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Eye,
  Trash2,
  Phone,
  DollarSign,
  Calendar,
  MessageSquare,
  Send,
  FileText,
  Ban,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldAlert,
  Sparkles,
  Edit3,
  Sliders,
  CheckSquare,
  Square,
  MinusSquare,
  ShieldCheck,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  Smartphone,
  Copy,
  Check,
  Zap,
  Filter,
  Lock,
  KeyRound,
} from 'lucide-react';
import {
  cleanPhoneNumber,
  generateGroupSmsUrl,
  dispatchSafeMessage,
  formatFeeReceiptWhatsAppMessage,
  generateFeeReceiptWhatsAppUrl,
} from '../../services/whatsappService';
import { CollectFeeModal } from './CollectFeeModal';
import { SetFeePasswordModal } from './SetFeePasswordModal';
import {
  WhatsAppFeeReminderModal,
  DUE_RANGE_PRESETS,
  formatDueRangeLabel,
} from './WhatsAppFeeReminderModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { DeleteWrongReceiptModal } from './DeleteWrongReceiptModal';
import { StudentFeeEditModal } from './StudentFeeEditModal';
import { BulkFeeOperationsModal } from './BulkFeeOperationsModal';
import { DueExcelUploadModal } from './DueExcelUploadModal';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { FeeReceiptPdf } from '../reports/templates/FeeReceiptPdf';
import { FeeCollectionReportPdf } from '../reports/templates/FeeCollectionReportPdf';
import { FeeDuesReportPdf } from '../reports/templates/FeeDuesReportPdf';
import { exportTableToCsv } from '../../services/pdfService';

interface FeeManagementProps {
  onNavigate?: (module: string) => void;
  onLockFees?: () => void;
  onOpenSetPassword?: () => void;
}

export const FeeManagement: React.FC<FeeManagementProps> = ({
  onNavigate,
  onLockFees,
  onOpenSetPassword,
}) => {
  const {
    feePayments,
    students,
    classes,
    deleteFeePayment,
    cancelFeePayment,
    restoreFeePayment,
    getStudentDueAmount,
    getStudentFeeBreakdown,
    updateStudentFee,
    bulkSetStudentsFeeZero,
    resetStudentsFeeToStandard,
    settings,
  } = useSchool();

  const [activeTab, setActiveTab] = useState<'receipts' | 'dues' | 'structure'>('receipts');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<'active' | 'cancelled' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Dues Tab: Dedicated Class & Due Range Engine State
  const [duesClassFilter, setDuesClassFilter] = useState<string>('');
  const [duesDueRangePreset, setDuesDueRangePreset] = useState<string>('all');
  const [duesMinFilter, setDuesMinFilter] = useState<number>(0);
  const [duesMaxFilter, setDuesMaxFilter] = useState<number | ''>('');

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [studentForFee, setStudentForFee] = useState<Student | null>(null);

  // Bulk Fee & Zero Fee Operations Modals
  const [isDueExcelModalOpen, setIsDueExcelModalOpen] = useState(false);
  const [isBulkFeeModalOpen, setIsBulkFeeModalOpen] = useState(false);
  const [bulkModalStudentIds, setBulkModalStudentIds] = useState<string[]>([]);
  const [bulkModalClassId, setBulkModalClassId] = useState<string>('');
  const [studentForFeeEdit, setStudentForFeeEdit] = useState<Student | null>(null);
  const [isStudentFeeEditModalOpen, setIsStudentFeeEditModalOpen] = useState(false);
  const [selectedStructureStudentIds, setSelectedStructureStudentIds] = useState<string[]>([]);

  // Structure Tab: Alphabetical Sorting & Section Heads State (Default: Alphabetical A-Z)
  const [structureSortBy, setStructureSortBy] = useState<
    | 'name-asc'
    | 'name-desc'
    | 'admission-asc'
    | 'admission-desc'
    | 'class-asc'
    | 'class-desc'
    | 'roll-asc'
    | 'roll-desc'
    | 'due-asc'
    | 'due-desc'
    | 'status-asc'
    | 'status-desc'
  >('name-asc');
  const [structureAlphabetFilter, setStructureAlphabetFilter] = useState<string>('ALL');
  const [structureShowAlphabetHeads, setStructureShowAlphabetHeads] = useState<boolean>(true);

  // Wrong Receipt Deletion & Cancellation State
  const [receiptToDelete, setReceiptToDelete] = useState<FeePayment | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // WhatsApp & SMS Fee Reminder State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [studentForWhatsApp, setStudentForWhatsApp] = useState<Student | null>(null);
  const [reminderInitialChannel, setReminderInitialChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [selectedDuesStudentIds, setSelectedDuesStudentIds] = useState<string[]>([]);
  const [hasCopiedUpi, setHasCopiedUpi] = useState<boolean>(false);

  // Modals for printing (A4 and Thermal POS)
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<FeePayment | null>(null);
  const [receiptPrintLayout, setReceiptPrintLayout] = useState<'2-copy' | 'half-page' | 'single' | '3-copy'>('half-page');
  const [selectedReceiptForThermal, setSelectedReceiptForThermal] = useState<FeePayment | null>(null);
  const [autoPrintThermal, setAutoPrintThermal] = useState(false);
  const [isCollectionReportOpen, setIsCollectionReportOpen] = useState(false);
  const [isDuesReportOpen, setIsDuesReportOpen] = useState(false);
  const [isLocalSetPasswordOpen, setIsLocalSetPasswordOpen] = useState(false);

  // Financial Stats (calculated only on Active non-cancelled receipts)
  const activeReceipts = feePayments.filter((p) => p.status !== 'Cancelled');
  const cancelledReceipts = feePayments.filter((p) => p.status === 'Cancelled');

  const totalCollected = activeReceipts.reduce((s, p) => s + p.amountPaid, 0);
  const totalDiscountsGiven = activeReceipts.reduce((s, p) => s + (p.discount || 0), 0);
  const totalTuition = activeReceipts.reduce((s, p) => {
    const tuitionHead = p.feeHeadBreakdown?.find((h) => h.head.toLowerCase().includes('tuition'));
    return s + (tuitionHead ? tuitionHead.amount : p.amountPaid);
  }, 0);

  // Calculate total pending dues across all active students
  const totalOutstandingDues = students
    .filter((s) => s.status === 'Active')
    .reduce((sum, st) => sum + getStudentDueAmount(st.id), 0);

  // Filter receipts based on status and search query
  const filteredReceipts = feePayments
    .filter((p) => {
      if (receiptStatusFilter === 'active') return p.status !== 'Cancelled';
      if (receiptStatusFilter === 'cancelled') return p.status === 'Cancelled';
      return true; // 'all'
    })
    .filter((p) => {
      const matchesSearch =
        p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cancellationReason && p.cancellationReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMethod = methodFilter ? p.paymentMethod === methodFilter : true;
      const matchesClass = classFilter ? p.classId === classFilter : true;

      return matchesSearch && matchesMethod && matchesClass;
    });

  // Handlers for Deleting / Cancelling / Restoring Wrong Receipts
  const handleConfirmCancel = (receiptId: string, reason: string, remarks: string) => {
    const target = feePayments.find((f) => f.id === receiptId);
    const restoredTotal = (target?.amountPaid || 0) + (target?.discount || 0);
    cancelFeePayment(receiptId, reason, remarks);
    setNotificationMessage(
      `Receipt ${target?.receiptNo || receiptId} cancelled: "${reason}". Dues of ₹${restoredTotal.toLocaleString('en-IN')} restored to student.`
    );
    setTimeout(() => setNotificationMessage(null), 6000);
  };

  const handleConfirmPermanentDelete = (receiptId: string) => {
    const target = feePayments.find((f) => f.id === receiptId);
    deleteFeePayment(receiptId);
    setNotificationMessage(
      `Receipt ${target?.receiptNo || receiptId} permanently deleted. Student pending dues recalculated.`
    );
    setTimeout(() => setNotificationMessage(null), 6000);
  };

  const handleRestoreReceipt = (receiptId: string) => {
    const target = feePayments.find((f) => f.id === receiptId);
    restoreFeePayment(receiptId);
    setNotificationMessage(
      `Receipt ${target?.receiptNo || receiptId} restored back to Active receipts.`
    );
    setTimeout(() => setNotificationMessage(null), 6000);
  };

  // Filter dues list with both search and dedicated Class & Due Range filters
  const studentsWithDues = useMemo(() => {
    return students
      .filter((s) => s.status === 'Active')
      .map((s) => {
        const dueAmount = getStudentDueAmount(s.id);
        const cls = classes.find((c) => c.id === s.classId);
        return {
          student: s,
          classObj: cls,
          dueAmount,
        };
      })
      .filter((item) => item.dueAmount > 0)
      .filter((item) => {
        const s = item.student;
        // 1. Search term match
        const q = (searchTerm || '').trim().toLowerCase();
        const fullName = (s?.fullName || '').toLowerCase();
        const admNo = (s?.admissionNo || '').toLowerCase();
        const phone = s?.guardianPhone || s?.emergencyContact || '';
        const father = (s?.fatherName || '').toLowerCase();

        const matchesSearch =
          !q ||
          fullName.includes(q) ||
          admNo.includes(q) ||
          phone.includes(q) ||
          father.includes(q);

        // 2. Class filter (either from general classFilter or dedicated duesClassFilter)
        const targetClass = duesClassFilter || classFilter;
        const matchesClass = targetClass ? s?.classId === targetClass : true;

        // 3. Due range filter
        if (duesMinFilter > 0 && item.dueAmount < duesMinFilter) {
          return false;
        }
        if (duesMaxFilter !== '' && item.dueAmount > Number(duesMaxFilter)) {
          return false;
        }

        return matchesSearch && matchesClass;
      })
      .sort((a, b) =>
        (a.student?.fullName || '').localeCompare(b.student?.fullName || '', undefined, { sensitivity: 'base' })
      );
  }, [
    students,
    classes,
    feePayments,
    getStudentDueAmount,
    searchTerm,
    classFilter,
    duesClassFilter,
    duesMinFilter,
    duesMaxFilter,
  ]);

  const handleSelectDuesPreset = (presetId: string) => {
    setDuesDueRangePreset(presetId);
    const preset = DUE_RANGE_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setDuesMinFilter(preset.min);
      setDuesMaxFilter(preset.max);
    }
  };

  // Selected Dues Calculations & Handlers for Multi-Select WhatsApp & SMS
  const isAllDuesSelected =
    studentsWithDues.length > 0 &&
    studentsWithDues.every((item) => selectedDuesStudentIds.includes(item.student.id));

  const totalSelectedDuesAmount = useMemo(() => {
    return studentsWithDues
      .filter((item) => selectedDuesStudentIds.includes(item.student.id))
      .reduce((sum, item) => sum + item.dueAmount, 0);
  }, [studentsWithDues, selectedDuesStudentIds]);

  const handleToggleSelectAllDues = () => {
    if (isAllDuesSelected) {
      setSelectedDuesStudentIds([]);
    } else {
      setSelectedDuesStudentIds(studentsWithDues.map((item) => item.student.id));
    }
  };

  const handleToggleSelectStudentDue = (studentId: string) => {
    setSelectedDuesStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  /**
   * One-click SMS dispatch to all selected students' guardians
   */
  const handleQuickOneClickSmsToSelected = () => {
    if (selectedDuesStudentIds.length === 0) return;
    const selectedList = studentsWithDues.filter((item) =>
      selectedDuesStudentIds.includes(item.student.id)
    );
    const rawPhones = selectedList.map((item) => item.student.guardianPhone || item.student.emergencyContact);
    const validPhones: string[] = Array.from(
      new Set(rawPhones.map((p) => cleanPhoneNumber(p)).filter((p): p is string => Boolean(p)))
    );
    if (validPhones.length === 0) {
      alert('None of the selected students have valid guardian phone numbers.');
      return;
    }

    const schoolName = settings.name || settings.schoolName || 'SBSC Public School';
    const schoolPhone = settings.phone || settings.contactNumber || '9876543210';
    const schoolUpi = settings.upiId || 'anilsingh636-2@oksbi';

    const firstStudentName = selectedList[0]?.student.fullName;
    const count = selectedList.length;
    const totalDue = selectedList.reduce((sum, item) => sum + item.dueAmount, 0);

    let msg = `Dear Parent, fee dues reminder from ${schoolName}: Pending fee is Rs ${totalDue.toLocaleString('en-IN')}`;
    if (count === 1) {
      msg = `Dear Parent, reminder from ${schoolName}: Fee due of Rs ${totalDue.toLocaleString('en-IN')} is pending for ${firstStudentName}.`;
    } else {
      msg += ` for ${count} selected students.`;
    }
    if (schoolUpi) {
      msg += ` Pay via UPI: ${schoolUpi}`;
    }
    msg += ` or at school counter. Helpline: ${schoolPhone}.`;

    const url = generateGroupSmsUrl(validPhones, msg);
    dispatchSafeMessage(url, 'sms', msg);
    setNotificationMessage(
      `⚡ 1-Click SMS opened for all ${validPhones.length} selected parents!`
    );
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  // Structure Tab: Filtered & Alphabetically Sorted Students
  const structureFilteredStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'Active')
      .filter((s) => (classFilter ? s.classId === classFilter : true))
      .filter((s) => {
        if (structureAlphabetFilter !== 'ALL') {
          return s.fullName.trim().toUpperCase().startsWith(structureAlphabetFilter);
        }
        return true;
      })
      .filter((s) => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(t) ||
          s.admissionNo.toLowerCase().includes(t) ||
          s.rollNo.toLowerCase().includes(t) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(t)) ||
          (s.scholarshipStatus && s.scholarshipStatus.toLowerCase().includes(t))
        );
      })
      .sort((a, b) => {
        switch (structureSortBy) {
          case 'name-asc':
            return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
          case 'name-desc':
            return b.fullName.localeCompare(a.fullName, undefined, { sensitivity: 'base' });
          case 'admission-asc':
            return a.admissionNo.localeCompare(b.admissionNo, undefined, { numeric: true });
          case 'admission-desc':
            return b.admissionNo.localeCompare(a.admissionNo, undefined, { numeric: true });
          case 'class-asc': {
            const classA = classes.find((c) => c.id === a.classId)?.name || a.classId;
            const classB = classes.find((c) => c.id === b.classId)?.name || b.classId;
            const cmp = classA.localeCompare(classB, undefined, { numeric: true });
            return cmp !== 0 ? cmp : a.fullName.localeCompare(b.fullName);
          }
          case 'class-desc': {
            const classA = classes.find((c) => c.id === a.classId)?.name || a.classId;
            const classB = classes.find((c) => c.id === b.classId)?.name || b.classId;
            const cmp = classB.localeCompare(classA, undefined, { numeric: true });
            return cmp !== 0 ? cmp : a.fullName.localeCompare(b.fullName);
          }
          case 'roll-asc': {
            const rollA = parseInt(a.rollNo, 10) || 0;
            const rollB = parseInt(b.rollNo, 10) || 0;
            return rollA - rollB || a.fullName.localeCompare(b.fullName);
          }
          case 'roll-desc': {
            const rollA = parseInt(a.rollNo, 10) || 0;
            const rollB = parseInt(b.rollNo, 10) || 0;
            return rollB - rollA || a.fullName.localeCompare(b.fullName);
          }
          case 'due-asc': {
            const dueA = getStudentDueAmount(a.id);
            const dueB = getStudentDueAmount(b.id);
            return dueA - dueB || a.fullName.localeCompare(b.fullName);
          }
          case 'due-desc': {
            const dueA = getStudentDueAmount(a.id);
            const dueB = getStudentDueAmount(b.id);
            return dueB - dueA || a.fullName.localeCompare(b.fullName);
          }
          case 'status-asc': {
            const isZeroA = getStudentFeeBreakdown(a.id).totalYearlyDue === 0 ? 'Zero' : 'Standard';
            const isZeroB = getStudentFeeBreakdown(b.id).totalYearlyDue === 0 ? 'Zero' : 'Standard';
            return isZeroA.localeCompare(isZeroB) || a.fullName.localeCompare(b.fullName);
          }
          case 'status-desc': {
            const isZeroA = getStudentFeeBreakdown(a.id).totalYearlyDue === 0 ? 'Zero' : 'Standard';
            const isZeroB = getStudentFeeBreakdown(b.id).totalYearlyDue === 0 ? 'Zero' : 'Standard';
            return isZeroB.localeCompare(isZeroA) || a.fullName.localeCompare(b.fullName);
          }
          default:
            return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
        }
      });
  }, [
    students,
    classFilter,
    feePayments,
    structureAlphabetFilter,
    searchTerm,
    structureSortBy,
    classes,
    getStudentDueAmount,
    getStudentFeeBreakdown,
  ]);

  // Structure Tab: Letter Stats for quick chips
  const structureLetterStats = useMemo(() => {
    const activeInFilter = students
      .filter((s) => s.status === 'Active')
      .filter((s) => (classFilter ? s.classId === classFilter : true))
      .filter((s) => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(t) ||
          s.admissionNo.toLowerCase().includes(t) ||
          s.rollNo.toLowerCase().includes(t) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(t)) ||
          (s.scholarshipStatus && s.scholarshipStatus.toLowerCase().includes(t))
        );
      });

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const counts: Record<string, number> = {};
    letters.forEach((l) => (counts[l] = 0));

    activeInFilter.forEach((s) => {
      const first = s.fullName.trim().charAt(0).toUpperCase();
      if (counts[first] !== undefined) {
        counts[first]++;
      }
    });

    return { letters, counts, total: activeInFilter.length };
  }, [students, classFilter, searchTerm]);

  // Structure Tab: Counts of students currently visible per letter
  const structureLetterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    structureFilteredStudents.forEach((s) => {
      const char = s.fullName.trim().charAt(0).toUpperCase() || '#';
      counts[char] = (counts[char] || 0) + 1;
    });
    return counts;
  }, [structureFilteredStudents]);

  // Toggle selection of all students under an alphabetical head
  const handleToggleStructureLetterSelection = (letter: string) => {
    const letterStudents = structureFilteredStudents.filter(
      (s) => (s.fullName.trim().charAt(0).toUpperCase() || '#') === letter
    );
    const letterIds = letterStudents.map((s) => s.id);
    const allSelected =
      letterIds.length > 0 && letterIds.every((id) => selectedStructureStudentIds.includes(id));

    if (allSelected) {
      setSelectedStructureStudentIds((prev) => prev.filter((id) => !letterIds.includes(id)));
    } else {
      setSelectedStructureStudentIds((prev) => Array.from(new Set([...prev, ...letterIds])));
    }
  };

  const handleDelete = (id: string, receiptNo: string) => {
    if (window.confirm(`Are you sure you want to cancel and delete receipt "${receiptNo}"?`)) {
      deleteFeePayment(id);
    }
  };

  const handleSendWhatsAppReceipt = (payment: FeePayment, e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const student = students.find((s) => s.id === payment.studentId);
    const classObj = classes.find((c) => c.id === payment.classId);
    const targetPhone = student?.guardianPhone || student?.emergencyContact || '';
    if (!targetPhone) {
      alert(`No phone number found for student ${payment.studentName}. Please add parent phone in student profile.`);
      return;
    }
    const params = {
      receiptNo: payment.receiptNo,
      studentName: payment.studentName,
      admissionNo: payment.admissionNo,
      rollNo: student?.rollNo,
      className: classObj?.name || payment.classId,
      section: payment.section,
      fatherName: student?.fatherName,
      guardianPhone: targetPhone,
      amountPaid: payment.amountPaid,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef,
      date: payment.date,
      monthsPaid: payment.monthsPaid,
      discount: payment.discount,
      fine: payment.fine,
      totalDueBefore: payment.totalDueBefore,
      balanceRemaining: payment.balanceRemaining,
      feeHeadBreakdown: payment.feeHeadBreakdown,
      schoolName: settings.schoolName,
      schoolPhone: settings.phone,
      schoolUpi: settings.schoolUpi,
    };
    const url = generateFeeReceiptWhatsAppUrl(targetPhone, params);
    const msg = formatFeeReceiptWhatsAppMessage(params);

    // Pre-emptively copy message text to clipboard for convenience
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg).catch(() => {});
      }
    } catch {}

    // Open WhatsApp in a new tab without refreshing or navigating the current page
    try {
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open WhatsApp window with _blank:', err);
    }

    dispatchSafeMessage(url, 'whatsapp', msg);
    setNotificationMessage(`📲 WhatsApp receipt opened in new tab for ${student?.fullName || payment.studentName}'s parent (${targetPhone})! Text copied to clipboard.`);
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  const handleExportCsv = () => {
    if (activeTab === 'receipts') {
      const headers = ['Receipt No', 'Date', 'Student Name', 'Admission No', 'Months Paid', 'Fine', 'Discount / Concession', 'Total Paid', 'Mode', 'Ref'];
      const rows = filteredReceipts.map((p) => [
        p.receiptNo,
        p.date,
        p.studentName,
        p.admissionNo,
        p.monthsPaid ? p.monthsPaid.join('; ') : 'N/A',
        p.fine,
        p.discount || 0,
        p.amountPaid,
        p.paymentMethod,
        p.transactionRef || 'N/A',
      ]);
      exportTableToCsv(`SBSC-Fee-Receipts-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    } else {
      const headers = ['Admission No', 'Roll No', 'Student Name', 'Class', 'Section', 'Father Name', 'Phone', 'Outstanding Dues'];
      const rows = studentsWithDues.map((item) => [
        item.student.admissionNo,
        item.student.rollNo,
        item.student.fullName,
        item.classObj?.name || item.student.classId,
        item.student.section,
        item.student.fatherName,
        item.student.guardianPhone,
        item.dueAmount,
      ]);
      exportTableToCsv(`SBSC-Pending-Dues-Report-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Accounts & Revenue Collection Portal</span>
            <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-blue-950 text-amber-300 text-[10px] font-black uppercase shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Admin Only</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Fees Collection & Dues Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Collect school fees, track dues, print 3-copy receipts, and manage student accounting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Password & Lock Buttons */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSetPassword) onOpenSetPassword();
              else setIsLocalSetPasswordOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
            title="Set or change password for fees options (केवल एडमिन पासवर्ड सेट करें)"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-950" />
            <span>Set Password (पासवर्ड बदलें)</span>
          </button>

          {onLockFees && (
            <button
              type="button"
              onClick={onLockFees}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              title="Lock fees screen immediately (फीस तुरंत लॉक करें)"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Lock Fees (लॉक करें)</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Sheet</span>
            </button>
          )}

          <button
            onClick={() => setIsDueExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-extrabold transition shadow-md active:scale-95 cursor-pointer"
            title="Upload Due Excel list with Name, Class, Father matching and head-wise fees"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Upload Fee Excel (Head-Wise / नाम व पिता मिलान)</span>
          </button>

          <button
            onClick={() => {
              setStudentForWhatsApp(null);
              setIsWhatsAppModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold transition shadow-xs active:scale-95"
            title="Send WhatsApp Due Reminders to Defaulters"
          >
            <MessageSquare className="w-4 h-4 fill-current text-emerald-200" />
            <span>WhatsApp Due Reminders ({studentsWithDues.length})</span>
          </button>

          <button
            onClick={() => {
              setBulkModalStudentIds([]);
              setBulkModalClassId(classFilter || '');
              setIsBulkFeeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
            title="Set all students fee to zero or configure editable fees in bulk"
          >
            <Sparkles className="w-4 h-4 fill-current text-slate-950" />
            <span>Zero Fee & Bulk Options</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsCollectionReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <TrendingUp className="w-4 h-4 text-emerald-800" />
            <span>Revenue Report</span>
          </button>

          <button
            onClick={() => setIsDuesReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Open Class-Wise Outstanding Dues PDF for printing and download"
          >
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            <span>Class-Wise Due List PDF</span>
          </button>

          {feePayments.length > 0 && (
            <button
              onClick={() => setSelectedReceiptForPrint(feePayments[0])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Open latest fee receipt in official A4 format"
            >
              <FileText className="w-4 h-4 text-blue-700" />
              <span>A4 Receipt</span>
            </button>
          )}

          <button
            onClick={() => {
              setStudentForFee(null);
              setIsCollectModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Collect New Fee</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase block">TOTAL FEE COLLECTED</span>
          <span className="text-2xl font-black text-emerald-950">
            {settings.currencySymbol} {totalCollected.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-emerald-700 mt-1">
            {activeReceipts.length} Active Receipts
            {totalDiscountsGiven > 0 && ` • ₹${totalDiscountsGiven.toLocaleString('en-IN')} Concessions`}
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase block">OUTSTANDING PENDING DUES</span>
          <span className="text-2xl font-black text-rose-950">
            {settings.currencySymbol} {totalOutstandingDues.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-rose-700 mt-1">{studentsWithDues.length} Students with Dues</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">TUITION REVENUE</span>
          <span className="text-xl font-extrabold text-blue-950">
            {settings.currencySymbol} {totalTuition.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-slate-500 mt-1">Core Academic Collections</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">COLLECTION EFFICIENCY</span>
          <span className="text-xl font-extrabold text-indigo-900">
            {Math.round((totalCollected / (totalCollected + totalOutstandingDues || 1)) * 100)}%
          </span>
          <p className="text-[10px] text-slate-500 mt-1">Institutional Clearance Ratio</p>
        </div>
      </div>

      {/* Flash Feedback Notification */}
      {notificationMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{notificationMessage}</span>
          </div>
          <button
            onClick={() => setNotificationMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs Switcher & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Main Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipts & Transactions ({activeReceipts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dues')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'dues'
                  ? 'bg-rose-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Defaulters & Pending Dues ({studentsWithDues.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'structure'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Editable Fee Roster & Zero Fee ({students.filter((s) => s.status === 'Active').length})</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipt, student, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-emerald-800"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-emerald-800"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {activeTab === 'receipts' && (
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-emerald-800"
              >
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            )}
          </div>
        </div>

        {/* Sub-Filters for Receipts Status (Active vs Cancelled/Wrong Receipts) */}
        {activeTab === 'receipts' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
              <button
                id="tab-active-receipts"
                type="button"
                onClick={() => setReceiptStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  receiptStatusFilter === 'active'
                    ? 'bg-white text-emerald-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Receipts ({activeReceipts.length})
              </button>
              <button
                id="tab-cancelled-receipts"
                type="button"
                onClick={() => setReceiptStatusFilter('cancelled')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 cursor-pointer ${
                  receiptStatusFilter === 'cancelled'
                    ? 'bg-white text-rose-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancelled / Wrong Receipts ({cancelledReceipts.length})</span>
              </button>
              <button
                id="tab-all-receipts"
                type="button"
                onClick={() => setReceiptStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  receiptStatusFilter === 'all'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Records ({feePayments.length})
              </button>
            </div>

            {cancelledReceipts.length > 0 && receiptStatusFilter === 'active' && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>{cancelledReceipts.length} wrong/void receipt(s) archived with cancellation reasons.</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'receipts' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Student & Admission</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3">Status / Audit</th>
                  <th className="py-3 px-3 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No receipts found matching criteria</p>
                        <p className="text-[11px] text-slate-400">
                          Try adjusting the search query, class, or status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((payment) => {
                    const cls = classes.find((c) => c.id === payment.classId);
                    const isCancelled = payment.status === 'Cancelled';

                    return (
                      <tr
                        key={payment.id}
                        className={`transition ${
                          isCancelled ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-emerald-50/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={isCancelled ? 'text-rose-950 line-through' : 'text-emerald-950'}>
                              {payment.receiptNo}
                            </span>
                            {isCancelled && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider">
                                VOID
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{payment.date}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 uppercase block">{payment.studentName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{payment.admissionNo}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {cls?.name || payment.classId}-{payment.section}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-900">
                          {payment.monthsPaid && payment.monthsPaid.length > 0
                            ? payment.monthsPaid.join(', ')
                            : 'Current'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {payment.paymentMethod}
                          </span>
                        </td>

                        {/* Status / Cancellation Audit Column */}
                        <td className="py-3 px-3">
                          {isCancelled ? (
                            <div className="space-y-0.5 max-w-[170px]">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                                <Ban className="w-3 h-3 text-rose-600" />
                                Cancelled / Void
                              </span>
                              {payment.cancellationReason && (
                                <p
                                  className="text-[10px] text-rose-900 font-medium truncate"
                                  title={`Reason: ${payment.cancellationReason}`}
                                >
                                  {payment.cancellationReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active Paid
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-xs">
                          <span className={isCancelled ? 'text-slate-400 line-through' : 'text-emerald-900'}>
                            {settings.currencySymbol} {payment.amountPaid.toLocaleString('en-IN')}
                          </span>
                          {payment.discount > 0 && !isCancelled && (
                            <div className="text-[10px] font-bold text-emerald-700">
                              (-{settings.currencySymbol}{payment.discount.toLocaleString('en-IN')} छूट)
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCancelled ? (
                              <>
                                {/* WhatsApp Direct Receipt & Due Dispatch */}
                                <button
                                  type="button"
                                  onClick={(e) => handleSendWhatsAppReceipt(payment, e)}
                                  title={`Send Official Fee Receipt & Remaining Due Balance to ${payment.studentName}'s Parent via WhatsApp`}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs transition active:scale-95 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>

                                {/* A4 Official Receipt Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptPrintLayout('half-page');
                                    setSelectedReceiptForPrint(payment);
                                  }}
                                  title="Print Official A4 Fee Receipt (Half-Page / Full A4 Sheet)"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-[11px] shadow-xs transition active:scale-95 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-200" />
                                  <span>Print A4</span>
                                </button>

                                {/* Optional POS Thermal Slip */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptForThermal(payment)}
                                  title="Print Mini Thermal POS Slip (58mm/80mm)"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Active Delete / Cancel Wrong Receipt Option */}
                                <button
                                  id={`btn-delete-receipt-${payment.id}`}
                                  type="button"
                                  onClick={() => setReceiptToDelete(payment)}
                                  title="Cancel or Delete Wrong Receipt"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-2xs transition active:scale-95 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Option to restore cancelled receipt */}
                                <button
                                  type="button"
                                  onClick={() => handleRestoreReceipt(payment.id)}
                                  title="Restore Receipt back to Active"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3 text-emerald-700" />
                                  <span>Restore</span>
                                </button>

                                {/* Option to permanently purge wrong receipt */}
                                <button
                                  type="button"
                                  onClick={() => handleConfirmPermanentDelete(payment.id)}
                                  title="Permanently Delete Record from Database"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'dues' ? (
        /* Dues Tab: WhatsApp & SMS Fee Due Engine with Multi-Select */
        <div className="space-y-4">
          {/* WhatsApp & SMS Campaign Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-2xl p-4 sm:p-5 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-sm border border-emerald-800/60">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base tracking-tight">
                    WhatsApp & SMS Due Fee Dispatch Engine
                  </h4>
                  <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    UPI: {settings.upiId || 'anilsingh636-2@oksbi'}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  Select multiple students below to send automated WhatsApp reminders or SMS text alerts with pre-filled fee breakdown and direct UPI payment links (<span className="font-mono font-bold text-amber-300">{settings.upiId || 'anilsingh636-2@oksbi'}</span>).
                </p>
              </div>
            </div>

            {/* Quick Banner Controls */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
              {/* Copy UPI Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(settings.upiId || 'anilsingh636-2@oksbi');
                    setHasCopiedUpi(true);
                    setTimeout(() => setHasCopiedUpi(false), 2500);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 border border-emerald-400/30 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Copy School UPI ID"
              >
                {hasCopiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopiedUpi ? 'UPI Copied!' : 'Copy UPI ID'}</span>
              </button>

              <button
                onClick={() => setIsDueExcelModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Upload Excel list to match students (Name, Class, Father) and update head-wise fee dues"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span>Upload Fee Excel (Head-Wise / नाम व पिता मिलान)</span>
              </button>

              <button
                onClick={() => {
                  setBulkModalStudentIds(
                    selectedDuesStudentIds.length > 0
                      ? selectedDuesStudentIds
                      : studentsWithDues.map((s) => s.student.id)
                  );
                  setBulkModalClassId(classFilter || '');
                  setIsBulkFeeModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="Set fees to ₹0 for selected students with dues"
              >
                <Sparkles className="w-4 h-4 fill-current text-slate-950" />
                <span>
                  {selectedDuesStudentIds.length > 0
                    ? `Set (${selectedDuesStudentIds.length}) to ₹0`
                    : 'Set Dues to ₹0 (Zero Fee)'}
                </span>
              </button>

              {/* WhatsApp Launch Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStudentForWhatsApp(null);
                  setReminderInitialChannel('whatsapp');
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current text-slate-950" />
                <span>
                  {selectedDuesStudentIds.length > 0
                    ? `WhatsApp (${selectedDuesStudentIds.length})`
                    : 'WhatsApp Reminders'}
                </span>
              </button>

              {/* SMS Launch Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStudentForWhatsApp(null);
                  setReminderInitialChannel('sms');
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-blue-200" />
                <span>
                  {selectedDuesStudentIds.length > 0
                    ? `SMS Alert (${selectedDuesStudentIds.length})`
                    : 'SMS Alerts'}
                </span>
              </button>

              {/* Class-Wise Due List PDF Button */}
              <button
                type="button"
                onClick={() => setIsDuesReportOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="Open Class-Wise Outstanding Dues PDF for printing and download"
              >
                <FileText className="w-4 h-4 text-rose-200" />
                <span>Class Due List PDF</span>
              </button>
            </div>
          </div>

          {/* Class & Due Range Filter Engine for Dues & Reminders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Due Reminders: Select Class & Due Range (कक्षा व बकाया सीमा फ़िल्टर)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Filter by class and exact fee due range to send targeted WhatsApp & SMS alerts to parents.
                  </p>
                </div>
              </div>

              {(duesClassFilter || duesMinFilter > 0 || duesMaxFilter !== '' || duesDueRangePreset !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setDuesClassFilter('');
                    setDuesDueRangePreset('all');
                    setDuesMinFilter(0);
                    setDuesMaxFilter('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Reset Filters (फ़िल्टर साफ़ करें)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              {/* Select Class */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">
                    Select Class (कक्षा चुनें)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDuesReportOpen(true)}
                    className="text-[10px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer underline"
                    title="Open PDF Due List for currently filtered class"
                  >
                    <FileText className="w-3 h-3 text-rose-600" />
                    <span>Print Due List PDF</span>
                  </button>
                </div>
                <select
                  value={duesClassFilter}
                  onChange={(e) => setDuesClassFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-800"
                >
                  <option value="">All Classes (सभी कक्षाएं)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Due Range Preset */}
              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase">
                  Select Due Range (बकाया सीमा चुनें)
                </label>
                <select
                  value={duesDueRangePreset}
                  onChange={(e) => handleSelectDuesPreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-800"
                >
                  {DUE_RANGE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.hindiLabel ? `(${p.hindiLabel})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Filter */}
              <div className="sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase">
                  Search Student / Father / Mobile
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Name, Adm, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-emerald-800"
                  />
                </div>
              </div>
            </div>

            {/* Custom exact min and max input fields if preset is custom */}
            {duesDueRangePreset === 'custom' && (
              <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Exact Range (रुपये):</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold">Min ₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={duesMinFilter || ''}
                    onChange={(e) => setDuesMinFilter(e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-blue-800"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold">Max ₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="No upper limit"
                    value={duesMaxFilter}
                    onChange={(e) => setDuesMaxFilter(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                    className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-blue-800"
                  />
                </div>
                <span className="text-[11px] text-blue-900 font-medium">
                  (Showing dues from ₹{duesMinFilter.toLocaleString('en-IN')} {duesMaxFilter !== '' ? `to ₹${Number(duesMaxFilter).toLocaleString('en-IN')}` : 'and higher'})
                </span>
              </div>
            )}

            {/* Range chips & match indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Range:</span>
                {DUE_RANGE_PRESETS.map((p) => {
                  const isSelected = duesDueRangePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectDuesPreset(p.id)}
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] transition cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  Showing <span className="text-emerald-700 font-black">{studentsWithDues.length}</span> students
                </span>
                <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                  Total Dues: {settings.currencySymbol} {studentsWithDues.reduce((sum, s) => sum + s.dueAmount, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky / Active Multi-Select Action Bar when students are selected */}
          {selectedDuesStudentIds.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500/40 rounded-2xl p-3 sm:p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {selectedDuesStudentIds.length} Student{selectedDuesStudentIds.length > 1 ? 's' : ''} Selected
                    </span>
                    <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2 py-0.5 rounded-md border border-rose-200">
                      Total Dues: {settings.currencySymbol} {totalSelectedDuesAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Dispatch reminders via WhatsApp or cellular SMS to all selected parents with school UPI (<span className="font-mono font-bold text-emerald-800">{settings.upiId || 'anilsingh636-2@oksbi'}</span>).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStudentForWhatsApp(null);
                    setReminderInitialChannel('whatsapp');
                    setIsWhatsAppModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>Send WhatsApp ({selectedDuesStudentIds.length})</span>
                </button>

                {/* One-Click SMS Button */}
                <button
                  type="button"
                  onClick={handleQuickOneClickSmsToSelected}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 text-amber-300 font-black text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer border border-blue-400/40"
                  title="Open SMS app with all selected parents' phone numbers and fee reminder in 1 click"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>⚡ 1-Click SMS ({selectedDuesStudentIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStudentForWhatsApp(null);
                    setReminderInitialChannel('sms');
                    setIsWhatsAppModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Open SMS reminder panel"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-300" />
                  <span>SMS Panel ({selectedDuesStudentIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkModalStudentIds(selectedDuesStudentIds);
                    setBulkModalClassId(classFilter || '');
                    setIsBulkFeeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Set to ₹0</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDuesStudentIds([])}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Dues Register Table with Multiple Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-rose-50 text-rose-950 font-bold border-b border-rose-200 text-[11px] uppercase tracking-wider">
                    {/* Header Checkbox */}
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllDuesSelected}
                        onChange={handleToggleSelectAllDues}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title={isAllDuesSelected ? 'Deselect all' : 'Select all students with dues'}
                      />
                    </th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Admission No</th>
                    <th className="py-3 px-3">Class & Sec</th>
                    <th className="py-3 px-3">Father's Name</th>
                    <th className="py-3 px-3">Contact Phone</th>
                    <th className="py-3 px-3 text-right">Outstanding Dues</th>
                    <th className="py-3 px-4 text-right">Dispatch & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsWithDues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No outstanding student fee dues found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    studentsWithDues.map((item) => {
                      const isSelected = selectedDuesStudentIds.includes(item.student.id);

                      return (
                        <tr
                          key={item.student.id}
                          className={`transition ${
                            isSelected
                              ? 'bg-emerald-50/70 hover:bg-emerald-50 border-l-4 border-l-emerald-600'
                              : 'hover:bg-rose-50/30'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudentDue(item.student.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 uppercase block">{item.student.fullName}</span>
                            <span className="text-[10px] text-slate-500">Roll #{item.student.rollNo}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{item.student.admissionNo}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {item.classObj?.name || item.student.classId} - {item.student.section}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">{item.student.fatherName}</td>
                          <td className="py-3 px-3 font-mono text-blue-900 font-bold">{item.student.guardianPhone}</td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-extrabold text-rose-700 text-sm block">
                              {settings.currencySymbol} {item.dueAmount.toLocaleString('en-IN')}
                            </span>
                            {(() => {
                              const b = getStudentFeeBreakdown(item.student.id);
                              const parts: string[] = [];
                              if (b.totalPaid > 0) parts.push(`Paid: ₹${b.totalPaid.toLocaleString('en-IN')}`);
                              if (b.previousDue > 0) parts.push(`Prev: ₹${b.previousDue.toLocaleString('en-IN')}`);
                              if (b.tuitionFee > 0) parts.push(`Tuit: ₹${b.tuitionFee.toLocaleString('en-IN')}`);
                              if (b.admissionFee > 0) parts.push(`Adm: ₹${b.admissionFee.toLocaleString('en-IN')}`);
                              if (b.registrationFee > 0) parts.push(`Reg: ₹${b.registrationFee.toLocaleString('en-IN')}`);
                              if (b.examFee > 0) parts.push(`Exam: ₹${b.examFee.toLocaleString('en-IN')}`);
                              if (b.conveyFee > 0) parts.push(`Transport: ₹${b.conveyFee.toLocaleString('en-IN')}`);
                              if (b.lateFine > 0) parts.push(`Fine: ₹${b.lateFine.toLocaleString('en-IN')}`);
                              if (parts.length === 0) return null;
                              return (
                                <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[190px] ml-auto">
                                  {parts.slice(0, 2).join(' • ')}{parts.length > 2 ? ` +${parts.length - 2}` : ''}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Reminder Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setStudentForWhatsApp(item.student);
                                  setReminderInitialChannel('whatsapp');
                                  setIsWhatsAppModalOpen(true);
                                }}
                                title="Send WhatsApp Fee Reminder"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 fill-current text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>

                              {/* SMS Text Reminder Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setStudentForWhatsApp(item.student);
                                  setReminderInitialChannel('sms');
                                  setIsWhatsAppModalOpen(true);
                                }}
                                title="Send SMS Text Due Alert"
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-blue-700" />
                                <span>SMS</span>
                              </button>

                              {/* Edit Fee / Set to ₹0 */}
                              <button
                                onClick={() => {
                                  setStudentForFeeEdit(item.student);
                                  setIsStudentFeeEditModalOpen(true);
                                }}
                                title="Edit Student Fees / Set to ₹0"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-slate-700" />
                                <span>Fee / ₹0</span>
                              </button>

                              {/* Collect Fee Button */}
                              <button
                                onClick={() => {
                                  setStudentForFee(item.student);
                                  setIsCollectModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                              >
                                Collect
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Structure Tab: Student Fee Structure & Zero Fee Options */
        <div className="space-y-4">
          {/* Action Bar & Summary Header */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <span>Student Fee Structure & Zero-Fee Configuration</span>
                  <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                    Editable
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  Set fees to ₹0 for full concessions/scholarships, customize rates per student, or reset to standard class schedules.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDueExcelModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                title="Excel शीट अपलोड करके छात्रों (नाम, कक्षा, पिता) का मिलान करें व हेड-वाइज फीस अपडेट करें"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span>Upload Fee Excel (Head-Wise / नाम व पिता मिलान)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBulkModalStudentIds([]);
                  setBulkModalClassId(classFilter || '');
                  setIsBulkFeeModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-current text-slate-950" />
                <span>Bulk Fee Actions / Zero Fee</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const count = bulkSetStudentsFeeZero({
                    classId: classFilter || undefined,
                    reason: '100% Fee Concession / Zero Fee',
                  });
                  setNotificationMessage(`Applied ₹0 (Zero Fee) to ${count} students in current view.`);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Quick 1-click zero fee for current filter"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Set Current View to ₹0</span>
              </button>
            </div>
          </div>

          {/* Alphabetical Quick-Index Bar (A - Z) & Sort Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <ArrowDownAZ className="w-4 h-4 text-blue-900" />
                  <span>ALPHABETICAL ROSTER INDEX:</span>
                </div>
                {structureAlphabetFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                    <span>Letter: "{structureAlphabetFilter}" ({structureFilteredStudents.length} students)</span>
                    <button
                      type="button"
                      onClick={() => setStructureAlphabetFilter('ALL')}
                      className="hover:text-red-700 ml-1 cursor-pointer font-black"
                      title="Clear letter filter and show all A-Z"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Toggle Alphabetical Section Headings */}
                <button
                  type="button"
                  onClick={() => setStructureShowAlphabetHeads((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    structureShowAlphabetHeads
                      ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Toggle alphabetical letter head dividers (A, B, C...) in student fee list"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${structureShowAlphabetHeads ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Letter Heads (A–Z): {structureShowAlphabetHeads ? 'ON' : 'OFF'}</span>
                </button>

                {/* Sort Order Selector */}
                <div className="relative">
                  <select
                    value={structureSortBy}
                    onChange={(e) => setStructureSortBy(e.target.value as any)}
                    className="py-1 pl-7 pr-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-bold text-blue-950 focus:outline-blue-900 cursor-pointer"
                    title="Sort students alphabetically or by fee attributes"
                  >
                    <optgroup label="Student Name Alphabetical">
                      <option value="name-asc">Student Name (A → Z)</option>
                      <option value="name-desc">Student Name (Z → A)</option>
                    </optgroup>
                    <optgroup label="Academic & Admission">
                      <option value="admission-asc">Admission No (A → Z / Asc)</option>
                      <option value="admission-desc">Admission No (Z → A / Desc)</option>
                      <option value="class-asc">Class & Section (A → Z)</option>
                      <option value="class-desc">Class & Section (Z → A)</option>
                      <option value="roll-asc">Roll No (1 → 99)</option>
                      <option value="roll-desc">Roll No (99 → 1)</option>
                    </optgroup>
                    <optgroup label="Fee & Concession">
                      <option value="due-desc">Net Due (Highest First)</option>
                      <option value="due-asc">Net Due (Lowest First)</option>
                      <option value="status-asc">Zero Fee First</option>
                      <option value="status-desc">Standard Fee First</option>
                    </optgroup>
                  </select>
                  <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900 absolute left-2 top-2 pointer-events-none" />
                </div>

                {structureSortBy !== 'name-asc' && (
                  <button
                    type="button"
                    onClick={() => setStructureSortBy('name-asc')}
                    className="text-[11px] text-blue-900 hover:underline font-bold cursor-pointer"
                    title="Reset to Student Name Alphabetical (A-Z)"
                  >
                    Reset A-Z
                  </button>
                )}
              </div>
            </div>

            {/* Quick-Click Letter Chips */}
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStructureAlphabetFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  structureAlphabetFilter === 'ALL'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ALL (A-Z)
              </button>
              {structureLetterStats.letters.map((letter) => {
                const count = structureLetterStats.counts[letter] || 0;
                const isCurrent = structureAlphabetFilter === letter;
                const hasStudents = count > 0;
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={!hasStudents}
                    onClick={() => setStructureAlphabetFilter(letter)}
                    className={`min-w-[28px] h-7 px-1 text-xs font-black rounded-md flex items-center justify-center transition cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-900 text-white shadow-xs scale-105'
                        : hasStudents
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200/80 font-bold'
                        : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                    }`}
                    title={
                      hasStudents
                        ? `Filter by Letter ${letter} (${count} student${count > 1 ? 's' : ''})`
                        : `No active students starting with ${letter}`
                    }
                  >
                    {letter}
                    {hasStudents && (
                      <span
                        className={`ml-0.5 text-[9px] ${
                          isCurrent ? 'text-amber-300' : 'text-blue-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Bulk Selection Ribbon if students selected */}
            {selectedStructureStudentIds.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-950">
                    {selectedStructureStudentIds.length} students selected
                  </span>
                  <button
                    onClick={() => setSelectedStructureStudentIds([])}
                    className="text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkModalStudentIds(selectedStructureStudentIds);
                      setIsBulkFeeModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Set Selected to ₹0 / Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const count = resetStudentsFeeToStandard({
                        studentIds: selectedStructureStudentIds,
                      });
                      setSelectedStructureStudentIds([]);
                      setNotificationMessage(`Reset ${count} students to standard class fee schedule.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Reset to Standard</span>
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStructureStudentIds.length === structureFilteredStudents.length) {
                            setSelectedStructureStudentIds([]);
                          } else {
                            setSelectedStructureStudentIds(structureFilteredStudents.map((s) => s.id));
                          }
                        }}
                        className="cursor-pointer text-slate-600 hover:text-blue-900 transition"
                        title={
                          selectedStructureStudentIds.length === structureFilteredStudents.length
                            ? 'Deselect All'
                            : `Select All (${structureFilteredStudents.length})`
                        }
                      >
                        {structureFilteredStudents.length > 0 &&
                        selectedStructureStudentIds.length === structureFilteredStudents.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-900" />
                        ) : selectedStructureStudentIds.length > 0 ? (
                          <MinusSquare className="w-4 h-4 text-blue-900" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>

                    {/* Student Name Sortable Header */}
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setStructureSortBy((prev) =>
                            prev === 'name-asc' ? 'name-desc' : 'name-asc'
                          )
                        }
                        className="flex items-center gap-1.5 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                        title="Sort by Student Name Alphabetical (A-Z / Z-A)"
                      >
                        <span>Student Name</span>
                        {structureSortBy === 'name-asc' ? (
                          <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                            <ArrowDownAZ className="w-3.5 h-3.5 text-blue-900" />
                            <span>A-Z</span>
                          </span>
                        ) : structureSortBy === 'name-desc' ? (
                          <span className="flex items-center gap-0.5 text-blue-950 bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                            <ArrowUpZA className="w-3.5 h-3.5 text-blue-900" />
                            <span>Z-A</span>
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                        )}
                      </button>
                    </th>

                    {/* Admission No Sortable Header */}
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setStructureSortBy((prev) =>
                            prev === 'admission-asc' ? 'admission-desc' : 'admission-asc'
                          )
                        }
                        className="flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                        title="Sort by Admission No Alphabetical/Ascending"
                      >
                        <span>Admission No</span>
                        {structureSortBy === 'admission-asc' ? (
                          <span className="text-blue-900 font-black">▲ A-Z</span>
                        ) : structureSortBy === 'admission-desc' ? (
                          <span className="text-blue-900 font-black">▼ Z-A</span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                        )}
                      </button>
                    </th>

                    {/* Class & Sec Sortable Header */}
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setStructureSortBy((prev) =>
                            prev === 'class-asc' ? 'class-desc' : 'class-asc'
                          )
                        }
                        className="flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                        title="Sort by Class & Section"
                      >
                        <span>Class & Sec</span>
                        {structureSortBy === 'class-asc' ? (
                          <span className="text-blue-900 font-black">▲ A-Z</span>
                        ) : structureSortBy === 'class-desc' ? (
                          <span className="text-blue-900 font-black">▼ Z-A</span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                        )}
                      </button>
                    </th>

                    <th className="py-3 px-3 text-right">Tuition Fee</th>
                    <th className="py-3 px-3 text-right text-amber-900 bg-amber-50/50">Previous Due</th>
                    <th className="py-3 px-3 text-right">Other Heads</th>
                    <th className="py-3 px-3 text-right">Total Assessed</th>
                    <th className="py-3 px-3 text-right">Paid</th>

                    {/* Net Due Sortable Header */}
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setStructureSortBy((prev) =>
                            prev === 'due-desc' ? 'due-asc' : 'due-desc'
                          )
                        }
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group ml-auto"
                        title="Sort by Net Due Amount"
                      >
                        <span>Net Due</span>
                        {structureSortBy === 'due-desc' ? (
                          <span className="text-rose-700 font-black">▼ High</span>
                        ) : structureSortBy === 'due-asc' ? (
                          <span className="text-emerald-700 font-black">▲ Low</span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                        )}
                      </button>
                    </th>

                    {/* Fee Status Sortable Header */}
                    <th className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setStructureSortBy((prev) =>
                            prev === 'status-asc' ? 'status-desc' : 'status-asc'
                          )
                        }
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer select-none group"
                        title="Sort by Fee Status (Zero Fee first)"
                      >
                        <span>Fee Status</span>
                        {structureSortBy === 'status-asc' ? (
                          <span className="text-amber-700 font-black">▲ ₹0 First</span>
                        ) : structureSortBy === 'status-desc' ? (
                          <span className="text-blue-900 font-black">▼ Standard</span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-blue-900" />
                        )}
                      </button>
                    </th>

                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {structureFilteredStudents.length > 0 ? (
                    structureFilteredStudents.map((student, idx) => {
                      const classObj = classes.find((c) => c.id === student.classId);
                      const breakdown = getStudentFeeBreakdown(student.id);
                      const isSelected = selectedStructureStudentIds.includes(student.id);
                      const isZeroFee = breakdown.totalYearlyDue === 0;
                      const otherExtraHeads =
                        breakdown.admissionFee +
                        breakdown.registrationFee +
                        breakdown.examFee +
                        breakdown.conveyFee +
                        breakdown.lateFine;

                      // Alphabetical section letter head logic
                      const currentLetter =
                        student.fullName.trim().charAt(0).toUpperCase() || '#';
                      const prevLetter =
                        idx > 0
                          ? structureFilteredStudents[idx - 1].fullName.trim().charAt(0).toUpperCase() || '#'
                          : null;
                      const isNewLetterHead = currentLetter !== prevLetter;
                      const letterCount = structureLetterCounts[currentLetter] || 0;
                      const studentsInLetter = structureFilteredStudents.filter(
                        (s) => (s.fullName.trim().charAt(0).toUpperCase() || '#') === currentLetter
                      );
                      const isLetterFullySelected =
                        studentsInLetter.length > 0 &&
                        studentsInLetter.every((s) => selectedStructureStudentIds.includes(s.id));

                      return (
                        <React.Fragment key={student.id}>
                          {/* Alphabetical Section Letter Head */}
                          {structureShowAlphabetHeads &&
                            (structureSortBy === 'name-asc' || structureSortBy === 'name-desc') &&
                            isNewLetterHead && (
                              <tr className="bg-slate-900 text-white font-bold select-none sticky top-0 z-10 shadow-xs">
                                <td
                                  colSpan={12}
                                  className="py-2.5 px-3.5 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border-y border-slate-700"
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
                                        onClick={() => handleToggleStructureLetterSelection(currentLetter)}
                                        className="text-[11px] text-amber-300 hover:text-white font-semibold underline cursor-pointer transition"
                                      >
                                        {isLetterFullySelected
                                          ? `Deselect "${currentLetter}"`
                                          : `Select All "${currentLetter}" (${letterCount})`}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const count = bulkSetStudentsFeeZero({
                                            studentIds: studentsInLetter.map((s) => s.id),
                                            reason: `100% Fee Concession - Alphabetical Head "${currentLetter}"`,
                                          });
                                          setNotificationMessage(
                                            `Applied ₹0 (Zero Fee) to all ${count} students under Head "${currentLetter}".`
                                          );
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black transition cursor-pointer shadow-2xs"
                                        title={`Set all students starting with ${currentLetter} to ₹0`}
                                      >
                                        Set Head "{currentLetter}" to ₹0
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                          <tr
                            className={`hover:bg-slate-50/80 transition ${
                              isSelected ? 'bg-blue-50/60' : isZeroFee ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStructureStudentIds((prev) => [...prev, student.id]);
                                  } else {
                                    setSelectedStructureStudentIds((prev) =>
                                      prev.filter((id) => id !== student.id)
                                    );
                                  }
                                }}
                                className="rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center shrink-0 border border-blue-200">
                                  {student.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 uppercase block">
                                    {student.fullName}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Roll #{student.rollNo} • {student.fatherName}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              {student.admissionNo}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {classObj?.name || student.classId} - {student.section}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-800">
                              {settings.currencySymbol} {breakdown.tuitionFee.toLocaleString('en-IN')}
                              <span className="text-[10px] text-slate-400 block">
                                ~{settings.currencySymbol}{Math.round(breakdown.tuitionFee / 12)}/mo
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-amber-900 bg-amber-50/40">
                              {(breakdown.previousDue || 0) > 0 ? (
                                <div>
                                  <span className="font-bold text-amber-950">
                                    {settings.currencySymbol} {breakdown.previousDue.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[9px] text-amber-700 block uppercase font-medium">
                                    Old Dues
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">₹0</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700">
                              {otherExtraHeads > 0 ? (
                                <div>
                                  <span>{settings.currencySymbol} {otherExtraHeads.toLocaleString('en-IN')}</span>
                                  <span className="text-[10px] text-slate-400 block">
                                    Adm/Reg/Exam/Fine
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">₹0</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-slate-900 text-sm">
                              {settings.currencySymbol} {breakdown.totalYearlyDue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700">
                              {settings.currencySymbol} {breakdown.totalPaid.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-sm">
                              <span
                                className={
                                  breakdown.netDue === 0 ? 'text-emerald-700' : 'text-rose-700'
                                }
                              >
                                {settings.currencySymbol} {breakdown.netDue.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isZeroFee ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600 fill-current" />
                                  <span>ZERO FEE (₹0)</span>
                                </span>
                              ) : student.scholarshipStatus ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  {student.scholarshipStatus}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                  Standard Rate
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* 1-Click Zero Fee Button */}
                                {!isZeroFee ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStudentFee(student.id, {
                                        tuitionFee: 0,
                                        admissionFee: 0,
                                        registrationFee: 0,
                                        examFee: 0,
                                        conveyFee: 0,
                                        lateFine: 0,
                                        totalYearlyDue: 0,
                                        scholarshipStatus: '100% Fee Concession / Zero Fee',
                                      });
                                      setNotificationMessage(
                                        `Fee for ${student.fullName} set to ₹0 (Zero Fee Waiver).`
                                      );
                                    }}
                                    title="Set Fee to ₹0 (Zero Fee Concession)"
                                    className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                                  >
                                    Set ₹0
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetStudentsFeeToStandard({ studentIds: [student.id] });
                                      setNotificationMessage(
                                        `Restored standard class fee for ${student.fullName}.`
                                      );
                                    }}
                                    title="Restore Standard Class Fee"
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-semibold transition active:scale-95 cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                )}

                                {/* Edit Modal Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentForFeeEdit(student);
                                    setIsStudentFeeEditModalOpen(true);
                                  }}
                                  title="Edit Fee Breakdown & Amounts"
                                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-800" />
                                  <span>Edit</span>
                                </button>

                                {/* Collect Fee */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentForFee(student);
                                    setIsCollectModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                                >
                                  Collect
                                </button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-500">
                        No matching student records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span>
                  Showing <b>{structureFilteredStudents.length}</b> of{' '}
                  <b>{students.filter((s) => s.status === 'Active').length}</b> active students
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-amber-700">
                  {
                    structureFilteredStudents.filter(
                      (s) => getStudentFeeBreakdown(s.id).totalYearlyDue === 0
                    ).length
                  }{' '}
                  with Zero Fee (₹0)
                </span>
                {selectedStructureStudentIds.length > 0 && (
                  <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                    {selectedStructureStudentIds.length} Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">Sort:</span>
                <span className="font-bold text-slate-700">
                  {structureSortBy === 'name-asc' && 'Alphabetical (A → Z)'}
                  {structureSortBy === 'name-desc' && 'Alphabetical (Z → A)'}
                  {structureSortBy === 'admission-asc' && 'Admission No (Asc)'}
                  {structureSortBy === 'admission-desc' && 'Admission No (Desc)'}
                  {structureSortBy === 'class-asc' && 'Class (Asc)'}
                  {structureSortBy === 'class-desc' && 'Class (Desc)'}
                  {structureSortBy === 'roll-asc' && 'Roll No (1 → 99)'}
                  {structureSortBy === 'roll-desc' && 'Roll No (99 → 1)'}
                  {structureSortBy === 'due-desc' && 'Net Due (High → Low)'}
                  {structureSortBy === 'due-asc' && 'Net Due (Low → High)'}
                  {structureSortBy === 'status-asc' && 'Zero Fee First'}
                  {structureSortBy === 'status-desc' && 'Standard First'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Fee Modal */}
      <CollectFeeModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false);
          setStudentForFee(null);
        }}
        initialStudent={studentForFee}
        onPaymentSuccess={(p, format, shouldAutoPrint = true) => {
          if (format === 'thermal') {
            setAutoPrintThermal(shouldAutoPrint);
            setSelectedReceiptForThermal(p);
          } else {
            setReceiptPrintLayout(format === 'a4-half' ? 'half-page' : '2-copy');
            setSelectedReceiptForPrint(p);
          }
          const updatedDue = getStudentDueAmount(p.studentId);
          setNotificationMessage(
            `Fee payment recorded: ${p.receiptNo} for ${p.studentName} (₹${Number(p.amountPaid).toLocaleString('en-IN')}). Updated remaining dues: ₹${updatedDue.toLocaleString('en-IN')}.`
          );
          setTimeout(() => setNotificationMessage(null), 6000);
        }}
      />

      {/* WhatsApp & SMS Fee Due Reminder Modal */}
      <WhatsAppFeeReminderModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setStudentForWhatsApp(null);
        }}
        initialStudent={studentForWhatsApp}
        initialDefaultersList={studentsWithDues}
        initialSelectedStudentIds={selectedDuesStudentIds.length > 0 ? selectedDuesStudentIds : undefined}
        initialChannel={reminderInitialChannel}
        initialClassId={duesClassFilter || classFilter || undefined}
        initialMinDue={duesMinFilter || undefined}
        initialMaxDue={duesMaxFilter !== '' ? Number(duesMaxFilter) : undefined}
        initialDueRangePreset={duesDueRangePreset}
      />

      {/* Fee Receipt Print Modal (A4) */}
      {selectedReceiptForPrint && (
        <PrintPreviewModal
          isOpen={!!selectedReceiptForPrint}
          onClose={() => setSelectedReceiptForPrint(null)}
          title={`Official Fee Receipt - ${selectedReceiptForPrint.receiptNo}`}
          fileName={`SBSC-Receipt-${selectedReceiptForPrint.receiptNo}.pdf`}
          onSwitchToThermal={() => {
            const p = selectedReceiptForPrint;
            setSelectedReceiptForPrint(null);
            setAutoPrintThermal(false);
            setSelectedReceiptForThermal(p);
          }}
        >
          <FeeReceiptPdf
            payment={selectedReceiptForPrint}
            initialLayout={receiptPrintLayout}
          />
        </PrintPreviewModal>
      )}

      {/* POS Thermal Receipt Print Modal */}
      {selectedReceiptForThermal && (
        <ThermalReceiptModal
          isOpen={!!selectedReceiptForThermal}
          onClose={() => {
            setSelectedReceiptForThermal(null);
            setAutoPrintThermal(false);
          }}
          payment={selectedReceiptForThermal}
          onSwitchToA4={(p) => setSelectedReceiptForPrint(p)}
          autoPrint={autoPrintThermal}
        />
      )}

      {/* Fee Collection Revenue Report Print Modal */}
      <PrintPreviewModal
        isOpen={isCollectionReportOpen}
        onClose={() => setIsCollectionReportOpen(false)}
        title="Fee Collection & Accounting Revenue Report"
        fileName={`SBSC-Fee-Revenue-Audit-${new Date().toISOString().slice(0, 10)}.pdf`}
      >
        <FeeCollectionReportPdf />
      </PrintPreviewModal>

      {/* Pending Dues Report Print Modal */}
      <PrintPreviewModal
        isOpen={isDuesReportOpen}
        onClose={() => setIsDuesReportOpen(false)}
        title={
          duesClassFilter
            ? `Class ${classes.find((c) => c.id === duesClassFilter)?.name || duesClassFilter} - Outstanding Due List PDF`
            : 'Class-Wise Outstanding Fee & Dues Deficiency Register'
        }
        fileName={`SBSC-ClassWise-Due-List-${
          duesClassFilter
            ? `Class-${classes.find((c) => c.id === duesClassFilter)?.name.replace(/\s+/g, '-') || duesClassFilter}-`
            : ''
        }${new Date().toISOString().slice(0, 10)}.pdf`}
      >
        <FeeDuesReportPdf initialClassId={duesClassFilter || classFilter || undefined} />
      </PrintPreviewModal>

      {/* Delete / Void Wrong Fee Receipt Modal with Active Opinions */}
      <DeleteWrongReceiptModal
        isOpen={!!receiptToDelete}
        receipt={receiptToDelete}
        onClose={() => setReceiptToDelete(null)}
        onConfirmCancel={handleConfirmCancel}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
      />

      {/* Individual Student Fee Edit Modal */}
      <StudentFeeEditModal
        isOpen={isStudentFeeEditModalOpen}
        onClose={() => {
          setIsStudentFeeEditModalOpen(false);
          setStudentForFeeEdit(null);
        }}
        student={studentForFeeEdit}
        onSuccess={(msg) => setNotificationMessage(msg)}
      />

      {/* Bulk Fee Operations & Zero-Fee Modal */}
      <BulkFeeOperationsModal
        isOpen={isBulkFeeModalOpen}
        onClose={() => {
          setIsBulkFeeModalOpen(false);
          setBulkModalStudentIds([]);
          setBulkModalClassId('');
        }}
        preSelectedStudentIds={bulkModalStudentIds}
        preSelectedClassId={bulkModalClassId}
        onSuccess={(msg) => setNotificationMessage(msg)}
      />

      {/* Due Excel List Upload Modal with Name, Class, Father Matching & Head-wise Dues */}
      <DueExcelUploadModal
        isOpen={isDueExcelModalOpen}
        onClose={() => setIsDueExcelModalOpen(false)}
        onSuccess={(msg) => setNotificationMessage(msg)}
      />

      {/* Set Fees Option Password Modal */}
      {isLocalSetPasswordOpen && (
        <SetFeePasswordModal
          isOpen={isLocalSetPasswordOpen}
          onClose={() => setIsLocalSetPasswordOpen(false)}
          requireOldPassword={true}
          onSuccess={() => {
            setNotificationMessage('Fees password updated successfully (फीस पासवर्ड अपडेट हो गया)!');
          }}
        />
      )}
    </div>
  );
};
