import React, { useState, useMemo, useCallback } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Student, FeePayment, ExamMark, Exam, Homework, ClassInfo, Holiday, AdmitCardRecord } from '../../types/school';
import {
  GraduationCap,
  Calendar,
  Receipt,
  FileText,
  BookOpen,
  Bell,
  LogOut,
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Bus,
  Award,
  AlertCircle,
  Eye,
  KeyRound,
  Download,
  CalendarDays,
  Lock,
  Search,
  ArrowLeft,
  BookMarked,
  Sparkles,
  Info,
  Check,
  TrendingUp,
  CreditCard,
  Building,
  Share2,
  MessageSquare,
  Pin,
  ChevronRight,
  Filter,
  Palmtree,
} from 'lucide-react';
import { FeeReceiptPdf } from '../reports/templates/FeeReceiptPdf';
import { MarksheetReportCardPdf } from '../reports/templates/MarksheetReportCardPdf';
import { ExamAdmitCardPdf } from '../reports/templates/ExamAdmitCardPdf';
import { ExamTimetablePdf } from '../reports/templates/ExamTimetablePdf';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { StudentShareModal, StudentShareTemplateId } from './StudentShareModal';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';
import { StudentPortalLockScreen } from './StudentPortalLockScreen';
import { generateDefault2MeetingTimetable } from '../../utils/timetableUtils';

interface StudentPortalProps {
  onLogout: () => void;
  onNavigate?: (module: string) => void;
  initialTab?: 'overview' | 'attendance' | 'fees' | 'exams' | 'timetable' | 'admit-card' | 'homework' | 'holidays';
  onBackToDashboard?: () => void;
  onOpenAdminLogin?: () => void;
}

interface StudentPortalViewProps {
  currentStudent: Student;
  onLogout: () => void;
  onNavigate?: (module: string) => void;
  initialTab?: 'overview' | 'attendance' | 'fees' | 'exams' | 'timetable' | 'admit-card' | 'homework' | 'holidays';
  onBackToDashboard?: () => void;
}

interface NormalizedSubjectScore {
  subjectId: string;
  subjectName: string;
  theoryMarks?: number;
  practicalMarks?: number;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  remarks?: string;
}

const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  currentStudent,
  onLogout,
  onNavigate,
  initialTab = 'overview',
  onBackToDashboard,
}) => {
  const {
    classes,
    attendance,
    feePayments,
    getStudentFeeBreakdown,
    getStudentDueAmount,
    exams,
    examMarks,
    admitCards,
    homeworks,
    settings,
    holidays,
  } = useSchool();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'fees' | 'exams' | 'timetable' | 'admit-card' | 'homework' | 'holidays'>(
    initialTab === ('notices' as any) ? 'overview' : (initialTab || 'overview')
  );

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === ('notices' as any) ? 'overview' : initialTab);
    }
  }, [initialTab]);

  // User explicitly selected exam in dropdown (defaults to null for intelligent auto-detection)
  const [userSelectedExamId, setUserSelectedExamId] = useState<string | null>(null);
  const [isAdmitCardPrintOpen, setIsAdmitCardPrintOpen] = useState(false);
  const [isTimeTablePrintOpen, setIsTimeTablePrintOpen] = useState(false);

  // Modals for official print preview
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<FeePayment | null>(null);
  const [selectedMarkForReportCard, setSelectedMarkForReportCard] = useState<ExamMark | null>(null);
  const [holidayTypeFilter, setHolidayTypeFilter] = useState<string>('all');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTemplate, setShareTemplate] = useState<StudentShareTemplateId>('dossier');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenShare = (template: StudentShareTemplateId = 'dossier') => {
    setShareTemplate(template);
    setIsShareModalOpen(true);
  };

  const studentClass = classes.find((c) => c.id === currentStudent.classId);
  const rawFeeBreakdown = getStudentFeeBreakdown(currentStudent.id);
  const feeBreakdown = useMemo(() => {
    const totalFee = Number(
      (rawFeeBreakdown as any)?.totalYearlyDue ??
      (rawFeeBreakdown as any)?.totalFee ??
      (rawFeeBreakdown as any)?.totalAnnualFee ??
      0
    );
    const paidAmount = Number(
      (rawFeeBreakdown as any)?.totalPaid ??
      (rawFeeBreakdown as any)?.paidAmount ??
      0
    );
    const dueAmount = Number(
      (rawFeeBreakdown as any)?.netDue ??
      (rawFeeBreakdown as any)?.dueAmount ??
      Math.max(0, totalFee - paidAmount)
    );
    return {
      ...rawFeeBreakdown,
      totalFee: isNaN(totalFee) ? 0 : totalFee,
      totalAnnualFee: isNaN(totalFee) ? 0 : totalFee,
      totalYearlyDue: isNaN(totalFee) ? 0 : totalFee,
      paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
      totalPaid: isNaN(paidAmount) ? 0 : paidAmount,
      dueAmount: isNaN(dueAmount) ? 0 : dueAmount,
      netDue: isNaN(dueAmount) ? 0 : dueAmount,
      tuitionFee: Number(rawFeeBreakdown.tuitionFee || 0),
      admissionFee: Number(rawFeeBreakdown.admissionFee || 0),
      previousDue: Number(rawFeeBreakdown.previousDue || 0),
      lateFine: Number(rawFeeBreakdown.lateFine || 0),
    };
  }, [rawFeeBreakdown]);

  // Helper function to check if an admit card belongs to the current logged in student
  const isCardForCurrentStudent = useCallback(
    (cardStudentId?: string, cardRollNo?: string, cardId?: string) => {
      if (!cardStudentId && !cardRollNo && !cardId) return false;
      const cId = String(cardStudentId || '').trim().toLowerCase();
      const sId = String(currentStudent.id || '').trim().toLowerCase();
      const sAdm = String(currentStudent.admissionNo || '').trim().toLowerCase();
      const sRoll = String(currentStudent.rollNo || '').trim().toLowerCase();

      // 1. Direct student ID match (e.g. "s-1" === "s-1")
      if (cId && sId && cId === sId) return true;

      // 2. Admission Number match (e.g. "SBSC/2023/1042")
      if (cId && sAdm && (cId === sAdm || cId.replace(/[^a-z0-9]/g, '') === sAdm.replace(/[^a-z0-9]/g, ''))) return true;

      // 3. Exact card ID match (e.g. "ac-exam-1-s-1" or ending with "-s-1")
      if (cardId) {
        const idLower = cardId.toLowerCase();
        if (sId && (idLower === `ac-${sId}` || idLower.endsWith(`-${sId}`) || idLower.includes(`-${sId}-`))) return true;
        if (sAdm && (idLower.includes(sAdm) || idLower.includes(sAdm.replace(/[^a-z0-9]/g, '')))) return true;
      }

      return false;
    },
    [currentStudent]
  );

  // Compute student dues and transport status
  const studentDue = typeof getStudentDueAmount === 'function' ? getStudentDueAmount(currentStudent.id) : (feeBreakdown?.dueAmount || 0);

  // Detect whether the student uses school transport/conveyance
  const rawConveyFee = currentStudent.conveyFee || 0;
  const hasConveyance = Boolean(
    (rawConveyFee > 0 && rawConveyFee !== 600) ||
    currentStudent.conveyVehicle ||
    currentStudent.conveyRoute ||
    currentStudent.transportRoute ||
    (currentStudent as any).busService
  );

  // Maximum allowed fee due policy:
  // - Non-conveyance students ("जो बच्चे साधन वाले न हो"): कुल ₹2,500 बाकी हो उनका भी admit card show on students portal
  // - Conveyance students ("साधन वाले बच्चे"): कुल ₹3,900 बाकी हो (Tuition 1800 + Exam 300 + Convey 1800)
  const maxAllowableDue = hasConveyance ? 3900 : 2500;
  const isFeePermittedForAdmitCard = studentDue <= maxAllowableDue;

  // Helper to determine if a specific card record is unlocked for current student
  const isCardRecordUnlocked = useCallback(
    (card?: AdmitCardRecord) => {
      if (card && card.isReleased === true) return true;
      // If student is fee-permitted under the threshold (non-transport <= 2500, transport <= 3900):
      if (isFeePermittedForAdmitCard) {
        const isDisciplinaryHold = Boolean(
          card?.lockReason &&
          (card.lockReason.toLowerCase().includes('discipline') ||
           card.lockReason.toLowerCase().includes('administrative hold') ||
           card.lockReason.includes('अनुशासन') ||
           card.lockReason.includes('निर्देशानुसार रोक'))
        );
        if (!isDisciplinaryHold) return true;
      }
      return false;
    },
    [isFeePermittedForAdmitCard]
  );

  // 1. All exams applicable to this student, prioritizing exams with unlocked admit cards
  const studentApplicableExams = useMemo(() => {
    const list = exams.filter((e) => {
      if (!e) return false;
      if (!e.classes || e.classes.length === 0) return true;
      return e.classes.includes(currentStudent.classId);
    });
    const candidateList = list.length > 0 ? list : exams;
    return [...candidateList].sort((a, b) => {
      // Prioritize exams where student has an unlocked/authorized admit card
      const aCard = admitCards.find((ac) => ac.examId === a.id && isCardForCurrentStudent(ac.studentId, ac.rollNo, ac.id));
      const bCard = admitCards.find((ac) => ac.examId === b.id && isCardForCurrentStudent(ac.studentId, ac.rollNo, ac.id));
      const aUnlocked = isCardRecordUnlocked(aCard);
      const bUnlocked = isCardRecordUnlocked(bCard);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;

      // Prioritize Quarterly Examination
      const aQuarterly = a.term === 'Quarterly' || a.id === 'exam-1' || a.name.toLowerCase().includes('quarter') || a.name.includes('त्रैमासिक');
      const bQuarterly = b.term === 'Quarterly' || b.id === 'exam-1' || b.name.toLowerCase().includes('quarter') || b.name.includes('त्रैमासिक');
      if (aQuarterly && !bQuarterly) return -1;
      if (!aQuarterly && bQuarterly) return 1;

      const timeA = new Date(a.startDate || 0).getTime();
      const timeB = new Date(b.startDate || 0).getTime();
      return timeA - timeB;
    });
  }, [exams, currentStudent.classId, admitCards, isCardForCurrentStudent, isCardRecordUnlocked]);

  const candidateExams = useMemo(() => {
    return studentApplicableExams.length > 0 ? studentApplicableExams : exams;
  }, [studentApplicableExams, exams]);

  // Active Exam for Time Table & Admit Card view (auto-selects exam with authorized admit card first)
  const activeSelectedExam = useMemo(() => {
    if (userSelectedExamId) {
      const match = candidateExams.find((e) => e.id === userSelectedExamId) || exams.find((e) => e.id === userSelectedExamId);
      if (match) return match;
    }
    // If student has an unlocked admit card in any exam, automatically select that exam!
    const examWithUnlockedCard = candidateExams.find((ex) => {
      const card = admitCards.find((a) => a.examId === ex.id && isCardForCurrentStudent(a.studentId, a.rollNo, a.id));
      return isCardRecordUnlocked(card);
    });
    if (examWithUnlockedCard) return examWithUnlockedCard;

    return candidateExams[0] || exams[0];
  }, [candidateExams, exams, userSelectedExamId, admitCards, isCardForCurrentStudent, isCardRecordUnlocked]);

  const activeTimetableExam = activeSelectedExam;
  const activeAdmitCardExam = activeSelectedExam;

  // Timetable slots for display with automatic fallback generation
  const timetableSlotsForDisplay = useMemo(() => {
    if (!activeTimetableExam) return [];
    if (Array.isArray(activeTimetableExam.timetable) && activeTimetableExam.timetable.length > 0) {
      return activeTimetableExam.timetable;
    }
    return generateDefault2MeetingTimetable(
      activeTimetableExam.startDate,
      activeTimetableExam.endDate,
      activeTimetableExam.meeting1Time,
      activeTimetableExam.meeting2Time
    );
  }, [activeTimetableExam]);

  // Admit Card for Active Selected Exam
  const studentAdmitCard = useMemo(() => {
    if (!activeAdmitCardExam) return undefined;
    const matching = admitCards.filter(
      (a) => a.examId === activeAdmitCardExam.id && isCardForCurrentStudent(a.studentId, a.rollNo, a.id)
    );
    if (matching.length === 0) return undefined;
    // Sort strictly by most recently updated record so Admin's latest action (lock or unlock) takes precedence
    const sorted = [...matching].sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return sorted[0];
  }, [admitCards, activeAdmitCardExam, isCardForCurrentStudent]);

  // Auto-resolve effective admit card with fallback details
  const effectiveAdmitCard: AdmitCardRecord | undefined = useMemo(() => {
    if (!activeAdmitCardExam) return undefined;
    const targetExam = activeAdmitCardExam;
    const defCenter = `${settings.schoolName} Campus, ${settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}`;
    const defTiming = targetExam?.meeting1Time || '09:30 AM – 11:30 AM';
    const defInstructions =
      '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है。\n2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।\n3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।\n4. अनुशासन का पूर्ण पालन करें।';

    const isFullyPaid = studentDue <= 0 || (studentAdmitCard?.totalDueAmount !== undefined && studentAdmitCard.totalDueAmount <= 0);
    const defTuitionDue = isFullyPaid ? 0 : (hasConveyance ? 1800 : 2200);
    const defExamDue = isFullyPaid ? 0 : 300;
    const defConveyDue = isFullyPaid ? 0 : (hasConveyance ? 1800 : 0);
    const defTotalDue = isFullyPaid ? 0 : (hasConveyance ? 3900 : 2500);

    if (studentAdmitCard) {
      const isCardUnlocked = isCardRecordUnlocked(studentAdmitCard);
      return {
        ...studentAdmitCard,
        rollNo: (currentStudent.rollNo?.trim() || studentAdmitCard.rollNo?.trim() || '').replace(/^(NUR|LKG|UKG)-/, ''),
        isReleased: isCardUnlocked,
        lockReason: isCardUnlocked ? undefined : studentAdmitCard.lockReason,
        examCenter: studentAdmitCard.examCenter || defCenter,
        reportingTime: studentAdmitCard.reportingTime || '09:00 AM',
        examTiming: studentAdmitCard.examTiming || defTiming,
        instructions: studentAdmitCard.instructions || defInstructions,
        dueTuitionFee: isFullyPaid ? 0 : (studentAdmitCard.dueTuitionFee !== undefined ? studentAdmitCard.dueTuitionFee : defTuitionDue),
        dueExamFee: isFullyPaid ? 0 : (studentAdmitCard.dueExamFee !== undefined ? studentAdmitCard.dueExamFee : defExamDue),
        dueConveyFee: isFullyPaid ? 0 : (studentAdmitCard.dueConveyFee !== undefined ? studentAdmitCard.dueConveyFee : defConveyDue),
        totalDueAmount: isFullyPaid ? 0 : (studentAdmitCard.totalDueAmount !== undefined ? studentAdmitCard.totalDueAmount : defTotalDue),
        otherFeesStatus: isFullyPaid ? 'FULLY PAID (पूर्णतः चुकता • ₹0)' : (studentAdmitCard.otherFeesStatus || 'ALL PAID (पूर्णतः चुकता)'),
      };
    }

    // When admin has not yet explicitly created a record for this exam,
    // automatically grant release if student's dues are permitted under the policy!
    const isReleased = isFeePermittedForAdmitCard;
    const lockReason = isReleased
      ? undefined
      : `बकाया शुल्क देय सीमा से अधिक है (₹${studentDue.toLocaleString('en-IN')} > ₹${maxAllowableDue.toLocaleString('en-IN')}) - कृपया विद्यालय कार्यालय में शुल्क जमा करवाएं`;

    return {
      id: `ac-${targetExam.id}-${currentStudent.id}`,
      examId: targetExam.id,
      studentId: currentStudent.id,
      rollNo: currentStudent.rollNo || '',
      isReleased,
      lockReason,
      examCenter: defCenter,
      reportingTime: '09:00 AM',
      examTiming: defTiming,
      instructions: defInstructions,
      dueTuitionFee: defTuitionDue,
      dueExamFee: defExamDue,
      dueConveyFee: defConveyDue,
      totalDueAmount: defTotalDue,
      otherFeesStatus: isFullyPaid ? 'FULLY PAID (पूर्णतः चुकता • ₹0)' : 'ALL PAID (पूर्णतः चुकता)',
      updatedAt: new Date().toISOString(),
    };
  }, [studentAdmitCard, activeAdmitCardExam, settings, currentStudent, studentDue, hasConveyance, maxAllowableDue, isFeePermittedForAdmitCard, isCardRecordUnlocked]);

  // Admit card is unlocked/downloadable if admin granted permission OR student's dues meet allowable threshold
  const isAdmitCardUnlocked = Boolean(
    effectiveAdmitCard?.isReleased === true || isCardRecordUnlocked(studentAdmitCard)
  );
  const isAdmitCardLocked = !isAdmitCardUnlocked;
  // Explicitly expose isLocked boolean state for the student: false when admit card is authorized/generated
  const isLocked = isAdmitCardLocked;

  // Find any exams where the student has an unlocked admit card
  const examsWithUnlockedAdmitCard = useMemo(() => {
    return exams.filter((ex) => {
      const card = admitCards.find(
        (a) => a.examId === ex.id && isCardForCurrentStudent(a.studentId, a.rollNo, a.id)
      );
      return isCardRecordUnlocked(card);
    });
  }, [exams, admitCards, isCardForCurrentStudent, isCardRecordUnlocked]);
  const effectiveExamRollNo = (currentStudent.rollNo?.trim() || effectiveAdmitCard?.rollNo?.trim() || 'N/A').replace(/^(NUR|LKG|UKG)-/, '');
  const examCenterText = effectiveAdmitCard?.examCenter || `${settings.schoolName} Campus, ${settings.schoolAddress || settings.address || ''}`;
  const examReportingTimeText = effectiveAdmitCard?.reportingTime || '09:00 AM';
  const examTimingText = effectiveAdmitCard?.examTiming || '09:30 AM – 11:30 AM';

  // Student-specific verified attendance records (Read-Only)
  const studentAttendance = useMemo(() => {
    return attendance
      .filter((rec) => (rec.targetId === currentStudent.id || (rec as any).studentId === currentStudent.id) && (rec.type === 'student' || !rec.type))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, currentStudent.id]);

  const attendanceStats = useMemo(() => {
    const total = studentAttendance.length;
    const present = studentAttendance.filter((r) => r.status === 'Present').length;
    const absent = studentAttendance.filter((r) => r.status === 'Absent').length;
    const leave = studentAttendance.filter(
      (r) => r.status === 'Leave' || r.status === 'Late' || r.status === 'HalfDay'
    ).length;
    const holiday = studentAttendance.filter((r) => r.status === 'Holiday').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent, leave, holiday, percentage };
  }, [studentAttendance]);

  // Absent Fine statistics for this student
  const fineStats = useMemo(() => {
    const absents = studentAttendance.filter((r) => r.status === 'Absent');
    const rate = settings.absentFinePerDay ?? 5;
    let paid = 0;
    let due = 0;
    let waived = 0;

    absents.forEach((r) => {
      const amount = r.fineAmount ?? rate;
      if (r.fineStatus === 'Paid') {
        paid += amount;
      } else if (r.fineStatus === 'Waived') {
        waived += amount;
      } else {
        due += amount;
      }
    });

    return {
      totalAbsents: absents.length,
      paidAmount: paid,
      dueAmount: due,
      waivedAmount: waived,
      totalAmount: absents.length * rate,
    };
  }, [studentAttendance, settings.absentFinePerDay]);

  // Student-specific verified fee receipts (Read-Only)
  const studentReceipts = useMemo(() => {
    return feePayments
      .filter(
        (p) =>
          (p.studentId === currentStudent.id ||
            (currentStudent.admissionNo &&
              p.admissionNo &&
              p.admissionNo.trim().toLowerCase() === currentStudent.admissionNo.trim().toLowerCase())) &&
          p.status !== 'Cancelled'
      )
      .sort((a, b) => {
        const timeA = new Date(a.date || (a as any).paymentDate || '').getTime();
        const timeB = new Date(b.date || (b as any).paymentDate || '').getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
          return timeB - timeA;
        }
        return (b.receiptNo || b.id || '').localeCompare(a.receiptNo || a.id || '');
      });
  }, [feePayments, currentStudent.id, currentStudent.admissionNo]);

  // STRICT FILTER: ONLY OFFICIALLY RELEASED / PUBLISHED EXAM MARKS
  // If exam mark status is 'Draft' or 'Submitted', or if parent exam is not 'Published'/'Completed', DO NOT SHOW
  const releasedMarks = useMemo(() => {
    return examMarks.filter((m) => {
      if (m.studentId !== currentStudent.id) return false;
      // Mark must not be a draft or pending submission
      if (m.status === 'Draft' || m.status === 'Submitted') return false;
      // Parent exam verification
      const parentExam = exams.find((e) => e.id === m.examId);
      if (parentExam) {
        if (parentExam.status !== 'Published' && parentExam.status !== 'Completed') {
          return false;
        }
      }
      return true;
    });
  }, [examMarks, currentStudent.id, exams]);

  // Unreleased / In-evaluation exams for this student's class
  const unreleasedExams = useMemo(() => {
    return exams.filter((e) => {
      const isForClass =
        !e.classIds || e.classIds.length === 0 || e.classIds.includes(currentStudent.classId);
      const isAlreadyReleased = releasedMarks.some((m) => m.examId === e.id);
      return isForClass && !isAlreadyReleased;
    });
  }, [exams, currentStudent.classId, releasedMarks]);

  // Class-specific homework (Read-Only)
  const classHomework = useMemo(() => {
    return homeworks
      .filter((hw) => hw.classId === currentStudent.classId)
      .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
  }, [homeworks, currentStudent.classId]);

  // Holidays & Academic Calendar Calculations
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const sortedHolidays = useMemo(() => {
    return [...(holidays || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays]);

  const upcomingHolidays = useMemo(() => {
    return sortedHolidays.filter((h) => {
      const end = h.endDate || h.date;
      return end >= todayDateStr;
    });
  }, [sortedHolidays, todayDateStr]);

  const nextUpcomingHoliday = upcomingHolidays[0] || null;

  const filteredHolidays = useMemo(() => {
    return sortedHolidays
      .filter((h) => {
        if (holidayTypeFilter === 'all') return true;
        if (holidayTypeFilter === 'upcoming') {
          const end = h.endDate || h.date;
          return end >= todayDateStr;
        }
        return h.type === holidayTypeFilter;
      })
      .filter((h) => {
        if (!holidaySearchQuery.trim()) return true;
        const q = holidaySearchQuery.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          (h.description && h.description.toLowerCase().includes(q)) ||
          h.type.toLowerCase().includes(q) ||
          h.date.includes(q)
        );
      });
  }, [sortedHolidays, holidayTypeFilter, holidaySearchQuery, todayDateStr]);

  // Helper to normalize subject marks from either array or object format
  const getNormalizedSubjects = (mark: ExamMark): NormalizedSubjectScore[] => {
    if (Array.isArray(mark.subjectMarks)) {
      return mark.subjectMarks.map((sm) => ({
        subjectId: sm.subjectId,
        subjectName: sm.subjectName || sm.subjectId,
        theoryMarks: sm.theoryMarks,
        practicalMarks: sm.practicalMarks,
        maxMarks: sm.maxMarks || 50,
        obtainedMarks: sm.obtainedMarks !== undefined ? sm.obtainedMarks : sm.theoryMarks || 0,
        grade: sm.grade || 'A',
        remarks: sm.remarks || '',
      }));
    } else if (mark.subjectMarks && typeof mark.subjectMarks === 'object') {
      const classSubjects = studentClass?.subjects || [];
      return Object.entries(mark.subjectMarks).map(([subId, score]) => {
        const subInfo = classSubjects.find((s) => s.id === subId);
        const max = subInfo?.maxMarks || 50;
        const numScore = Number(score) || 0;
        const pct = (numScore / max) * 100;
        const grade =
          pct >= 90 ? 'A1' : pct >= 80 ? 'A2' : pct >= 70 ? 'B1' : pct >= 60 ? 'B2' : pct >= 50 ? 'C1' : pct >= 33 ? 'D' : 'E';
        return {
          subjectId: subId,
          subjectName: subInfo?.name || subId,
          maxMarks: max,
          obtainedMarks: numScore,
          grade,
        };
      });
    }
    return [];
  };

  // Safe WhatsApp Message Sending Handler: explicitly uses window.open with target '_blank'
  // and prevents any form submission, navigation, or page refresh from returning to home screen.
  const handleSendWhatsAppMessage = (
    template: StudentShareTemplateId = 'dossier',
    e?: React.MouseEvent | React.SyntheticEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentStudent) return;

    const guardianPhone = (currentStudent.guardianPhone || currentStudent.emergencyContact || '').replace(/\D/g, '');
    const cleanPhone = guardianPhone.length >= 10 ? `91${guardianPhone.slice(-10)}` : '';
    const schoolName = settings?.schoolName || 'SBSC Senior Secondary School';
    const upiId = settings?.upiId || 'anilsingh636-2@oksbi';
    const phone = settings?.phone || settings?.contactNumber || '';
    const className = studentClass?.name || currentStudent.classId;

    let messageText = '';
    if (template === 'due_fee') {
      messageText = `Namaste ${currentStudent.fatherName ? currentStudent.fatherName + ' ji' : 'Respected Parent'},

Greetings from *${schoolName}*!
Fee Due Notice for:
👤 Student: *${currentStudent.fullName}*
🏫 Class: *${className}-${currentStudent.section}* | Adm No: *${currentStudent.admissionNo}* | Roll: #${currentStudent.rollNo}

⚠️ *Pending Fee Balance:* *₹${(feeBreakdown?.dueAmount ?? 0).toLocaleString('en-IN')}*
${(feeBreakdown?.tuitionFee ?? 0) > 0 ? `• Tuition Fee: ₹${(feeBreakdown?.tuitionFee ?? 0).toLocaleString('en-IN')}\n` : ''}${(feeBreakdown?.admissionFee ?? 0) > 0 ? `• Admission Fee: ₹${(feeBreakdown?.admissionFee ?? 0).toLocaleString('en-IN')}\n` : ''}${(feeBreakdown?.previousDue ?? 0) > 0 ? `• Previous Due: ₹${(feeBreakdown?.previousDue ?? 0).toLocaleString('en-IN')}\n` : ''}${(feeBreakdown?.lateFine ?? 0) > 0 ? `• Late Fine: ₹${(feeBreakdown?.lateFine ?? 0).toLocaleString('en-IN')}\n` : ''}
💳 *Online UPI Payment:* \`${upiId}\`
📍 *Counter Payment:* School Fee Office

Kindly deposit the pending balance at your earliest convenience.
Thank you,
*${schoolName}*
📞 Helpline: ${phone}`;
    } else if (template === 'paid_fee') {
      messageText = `Namaste ${currentStudent.fatherName ? currentStudent.fatherName + ' ji' : 'Respected Parent'},

Official Fee Payment Confirmation from *${schoolName}*:
👤 Student: *${currentStudent.fullName}*
🏫 Class: *${className}-${currentStudent.section}* | Adm No: *${currentStudent.admissionNo}*

✅ *Total Amount Deposited:* *₹${(feeBreakdown?.paidAmount ?? 0).toLocaleString('en-IN')}*
📌 *Remaining Dues:* *₹${(feeBreakdown?.dueAmount ?? 0).toLocaleString('en-IN')}*

Thank you for your timely payment!
*Accounts Dept, ${schoolName}*
📞 Helpline: ${phone}`;
    } else if (template === 'attendance') {
      messageText = `Namaste ${currentStudent.fatherName ? currentStudent.fatherName + ' ji' : 'Respected Parent'},

Student Attendance Report from *${schoolName}*:
👤 Student: *${currentStudent.fullName}*
🏫 Class: *${className}-${currentStudent.section}* | Roll: #${currentStudent.rollNo}

📊 *Cumulative Attendance:* *${attendanceStats?.percentage ?? 100}%*
• Total Working Days: ${attendanceStats?.total ?? 0}
• Days Present: ${attendanceStats?.present ?? 0}
• Days Absent: ${attendanceStats?.absent ?? 0}

Thank you,
*${schoolName}*
📞 Contact: ${phone}`;
    } else {
      // dossier / portal share
      messageText = `Namaste ${currentStudent.fatherName ? currentStudent.fatherName + ' ji' : 'Respected Parent'},

Greetings from *${schoolName}*!
Official Student Portal Summary:
👤 Student: *${currentStudent.fullName}*
🏫 Class: *${className}-${currentStudent.section}* | Roll: #${currentStudent.rollNo} | Adm No: *${currentStudent.admissionNo}*
Father's Name: ${currentStudent.fatherName || 'N/A'}
📊 Attendance: ${attendanceStats?.percentage ?? 100}% (${attendanceStats?.present ?? 0}/${attendanceStats?.total ?? 0} Days)
💰 Fee Status: Paid ₹${(feeBreakdown?.paidAmount ?? 0).toLocaleString('en-IN')} | Pending Dues: ₹${(feeBreakdown?.dueAmount ?? 0).toLocaleString('en-IN')}

Thank you,
*${schoolName}*
📞 Contact: ${phone}`;
    }

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

    // Pre-emptively copy to clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(messageText).catch(() => {});
      }
    } catch {}

    dispatchSafeMessage(waUrl, 'whatsapp', messageText);
    setToastMessage(`📲 WhatsApp opened in a new tab for ${currentStudent.fullName}! Message copied to clipboard.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Safe WhatsApp Fee Receipt Sender: explicitly uses window.open with target '_blank'
  const handleSendWhatsAppReceipt = (
    payment: FeePayment,
    e?: React.MouseEvent | React.SyntheticEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentStudent) return;
    const guardianPhone = (currentStudent.guardianPhone || currentStudent.emergencyContact || '').replace(/\D/g, '');
    const cleanPhone = guardianPhone.length >= 10 ? `91${guardianPhone.slice(-10)}` : '';
    const schoolName = settings?.schoolName || 'SBSC Senior Secondary School';
    const phone = settings?.phone || settings?.contactNumber || '';
    const className = studentClass?.name || currentStudent.classId;

    const receiptMsg = `Namaste ${currentStudent.fatherName ? currentStudent.fatherName + ' ji' : 'Respected Parent'},

Official Fee Receipt from *${schoolName}*:
🧾 *Receipt No:* *${payment.receiptNo}*
👤 *Student:* *${currentStudent.fullName}*
🏫 *Class:* *${className}-${currentStudent.section}* | Adm No: *${currentStudent.admissionNo}*
📅 *Date:* ${payment.date || (payment as any).paymentDate || new Date().toISOString().slice(0, 10)}
💳 *Payment Mode:* ${payment.paymentMethod || (payment as any).paymentMode || 'Cash'}
💰 *Amount Paid:* *₹${(Number(payment.amountPaid) || 0).toLocaleString('en-IN')}*
${payment.balanceRemaining !== undefined ? `📌 *Remaining Due:* ₹${(Number(payment.balanceRemaining) || 0).toLocaleString('en-IN')}\n` : ''}
Thank you,
*Accounts Dept, ${schoolName}*
📞 Helpline: ${phone}`;

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(receiptMsg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptMsg)}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(receiptMsg).catch(() => {});
      }
    } catch {}

    dispatchSafeMessage(waUrl, 'whatsapp', receiptMsg);
    setToastMessage(`📲 WhatsApp receipt #${payment.receiptNo} opened in a new tab! Message copied to clipboard.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-950 text-white px-4 py-3 rounded-2xl shadow-lg border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="text-xs font-semibold text-emerald-100">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold text-emerald-400 hover:text-white px-2 py-0.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Institutional Read-Only Compliance Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Personal Student Portal (व्यक्तिगत छात्र पोर्टल)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Password Protected & Confidential (गोपनीय)</span>
              </span>
            </div>
            <p className="text-xs text-teal-200/90 mt-1">
              Official institutional record copy for <strong>{currentStudent.fullName}</strong> • Class{' '}
              {studentClass?.name || currentStudent.classId}-{currentStudent.section} • Roll #{currentStudent.rollNo} • Admission #{currentStudent.admissionNo}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          {/* Prominent Share Button for Student Portal */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleSendWhatsAppMessage('dossier', e)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer active:scale-95"
              title="Open WhatsApp with Student Details in a new tab"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp / Share Portal</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenShare('dossier');
              }}
              className="p-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-sm cursor-pointer active:scale-95"
              title="QR Code & Portal Share Options"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition shadow-sm cursor-pointer active:scale-95 border border-white/20"
              title="Return to School Admin Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer active:scale-95"
            title="Logout of Student Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout (बाहर निकलें)</span>
          </button>
        </div>
      </div>

      {/* Student Identity Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-950 to-indigo-900 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md border-2 border-white ring-2 ring-blue-100">
              {currentStudent.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentStudent.fullName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    currentStudent.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  ✓ {currentStudent.status}
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {currentStudent.gender}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5 font-medium">
                <span>
                  Class: <strong className="text-slate-900">{studentClass?.name || currentStudent.classId} - {currentStudent.section}</strong>
                </span>
                <span>•</span>
                <span>
                  Roll No: <strong className="text-slate-900">#{currentStudent.rollNo}</strong>
                </span>
                <span>•</span>
                <span>
                  Admission No: <strong className="text-slate-900 font-mono">{currentStudent.admissionNo}</strong>
                </span>
                <span>•</span>
                <span>
                  Father: <strong className="text-slate-900">{currentStudent.fatherName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto shrink-0">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Attendance</span>
              <span
                className={`text-base font-black ${
                  attendanceStats.percentage >= 75 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {attendanceStats.percentage}%
              </span>
              <span className="text-[9px] text-slate-500 block">
                {attendanceStats.present}/{attendanceStats.total} Days
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Fee Balance</span>
              <span
                className={`text-base font-black ${
                  feeBreakdown.dueAmount <= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {settings.currencySymbol}
                {feeBreakdown.dueAmount}
              </span>
              <span className="text-[9px] text-slate-500 block">
                {feeBreakdown.dueAmount <= 0 ? 'Cleared ✓' : 'Due Balance'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Released Results</span>
              <span className="text-base font-black text-blue-900">
                {releasedMarks.length}
              </span>
              <span className="text-[9px] text-slate-500 block">
                {unreleasedExams.length > 0 ? `${unreleasedExams.length} Pending` : 'Up-to-date'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Board</span>
              <span className="text-base font-black text-slate-900">{currentStudent.board || settings.board || 'UP BOARD'}</span>
              <span className="text-[9px] text-slate-500 block">Session {settings.academicYear}</span>
            </div>
          </div>
        </div>

        {/* Read-Only Notice Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified Read-Only Panel:</strong> All data is synchronized directly from the school server. Modifications can only be performed by authorized school administration.
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] font-mono text-slate-400">
            Institutional Seal • SBSC School
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Student Dossier (छात्र विवरण)</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'timetable'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-purple-600" />
          <span>Exam Time Table (समय-सारणी)</span>
          {exams.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'timetable' ? 'bg-amber-400 text-slate-950' : 'bg-purple-100 text-purple-900'
              }`}
            >
              {exams.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('admit-card')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'admit-card'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-500" />
          <span>Exam Admit Card (प्रवेश पत्र)</span>
          {isAdmitCardUnlocked ? (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'admit-card' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              ✓ Ready
            </span>
          ) : (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black flex items-center gap-0.5 ${
                activeTab === 'admit-card' ? 'bg-amber-400 text-slate-950' : 'bg-rose-100 text-rose-800'
              }`}
            >
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Results & Marksheets (परीक्षा परिणाम)</span>
          {releasedMarks.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'exams' ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-blue-900'
              }`}
            >
              {releasedMarks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance Register (उपस्थिति पंजिका)</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'fees'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Fee Ledger & Receipts (शुल्क एवं रसीदें)</span>
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'homework'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Class Homework (दैनिक गृहकार्य)</span>
          {classHomework.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'homework' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {classHomework.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'holidays'
              ? 'bg-blue-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Palmtree className="w-4 h-4 text-emerald-600" />
          <span>Holidays & Vacations (अवकाश तालिका)</span>
          {upcomingHolidays.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'holidays' ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {upcomingHolidays.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDENT PROFILE DOSSIER (READ-ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic & Admission Details */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-900" />
                <span>Academic & Admission Record</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                Locked
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Admission Number</dt>
                <dd className="font-mono font-bold text-slate-900 mt-0.5">{currentStudent.admissionNo}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Admission Date</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {formatDateToDDMMYYYY(currentStudent.admissionDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Class & Section</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {studentClass?.name || currentStudent.classId} - Section {currentStudent.section}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Roll Number</dt>
                <dd className="font-bold text-blue-950 mt-0.5">#{currentStudent.rollNo}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Academic Session</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{settings.academicYear}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Board (शिक्षा बोर्ड)</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{currentStudent.board || settings.board || 'UP BOARD'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Enrollment Status</dt>
                <dd className="font-bold text-emerald-700 mt-0.5">✓ {currentStudent.status}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Conveyance / Transport</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {currentStudent.conveyRoute || currentStudent.conveyVehicle
                    ? `${currentStudent.conveyVehicle || 'Transport'} • ${currentStudent.conveyRoute || currentStudent.conveyStop || 'Active'}`
                    : 'Self / Walker'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Personal & Family Details */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-900" />
                <span>Personal & Family Record</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                Verified
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Date of Birth</dt>
                <dd className="font-bold text-slate-900 mt-0.5 font-mono">
                  {formatDateToDDMMYYYY(currentStudent.dob)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Gender</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{currentStudent.gender}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Father's Name</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{currentStudent.fatherName}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Mother's Name</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{currentStudent.motherName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Guardian Contact</dt>
                <dd className="font-mono font-bold text-blue-900 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{currentStudent.guardianPhone}</span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Blood Group</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {currentStudent.bloodGroup || 'O+'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400 font-bold uppercase text-[10px]">Residential Address</dt>
                <dd className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                  {currentStudent.address || 'Village & Post, District Ballia, Uttar Pradesh'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Upcoming School Holidays Card on Student Overview */}
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 rounded-2xl p-5 sm:p-6 border border-emerald-300/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-800 flex items-center justify-center border border-emerald-400/30">
                  <Palmtree className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>School Holiday Calendar (अवकाश तालिका)</span>
                    <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                      {upcomingHolidays.length} Upcoming
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Officially declared festival holidays, national breaks & vacations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('holidays')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Full Holiday Schedule ({sortedHolidays.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Next upcoming holiday callout */}
            {nextUpcomingHoliday ? (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex flex-col items-center justify-center font-mono shrink-0 shadow-xs">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                        {new Date(nextUpcomingHoliday.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                      <span className="text-base font-black leading-none">
                        {new Date(nextUpcomingHoliday.date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2 py-0.2 rounded border border-emerald-200 uppercase">
                          Next Holiday
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.2 rounded border border-slate-200">
                          {nextUpcomingHoliday.type}
                        </span>
                      </div>
                      <h5 className="font-extrabold text-sm sm:text-base text-slate-900">
                        {nextUpcomingHoliday.name}
                      </h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {nextUpcomingHoliday.endDate
                          ? `${formatDateToDDMMYYYY(nextUpcomingHoliday.date)} to ${formatDateToDDMMYYYY(nextUpcomingHoliday.endDate)} (${nextUpcomingHoliday.description || 'Vacation'})`
                          : `${formatDateToDDMMYYYY(nextUpcomingHoliday.date)} • ${nextUpcomingHoliday.description || 'School Closed'}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('holidays')}
                    className="self-start sm:self-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold transition border border-emerald-200 shrink-0 cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>

                {/* Next 3 upcoming holiday chips */}
                {upcomingHolidays.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {upcomingHolidays.slice(1, 4).map((h) => (
                      <div
                        key={h.id}
                        onClick={() => setActiveTab('holidays')}
                        className="p-3 bg-white/90 hover:bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 transition cursor-pointer text-xs"
                      >
                        <span className="text-[10px] font-bold text-slate-400 font-mono block">
                          {formatDateToDDMMYYYY(h.date)}
                        </span>
                        <p className="font-bold text-slate-900 truncate mt-0.5">{h.name}</p>
                        <span className="text-[10px] text-emerald-800 font-semibold">{h.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                All scheduled holidays for this academic term have concluded.
              </div>
            )}
          </div>

          {/* Quick Exam Time Table Action Banner */}
          {activeTimetableExam && (
            <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-purple-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                    2 Meetings Exam Schedule
                  </span>
                  <span className="text-xs text-purple-200 font-mono">
                    Session {activeTimetableExam.session || settings.academicYear}
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {timetableSlotsForDisplay.length} Examination Days
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-300" />
                    <span>{activeTimetableExam.name} — Examination Time Table (समय-सारणी)</span>
                  </h4>
                </div>

                <p className="text-xs text-purple-200/90 leading-relaxed">
                  प्रथम पाली (Ist Shift): <strong className="text-white font-mono">{activeTimetableExam.meeting1Time || '08:30 AM – 11:30 AM'}</strong> • द्वितीय पाली (IInd Shift): <strong className="text-white font-mono">{activeTimetableExam.meeting2Time || '12:30 PM – 03:30 PM'}</strong>. विस्तृत परीक्षा तिथियां व विषय देखने हेतु समय-सारणी खोलें।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('timetable')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                  title="View Full 2-Meeting Exam Date Sheet"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Time Table (समय-सारणी)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTimeTablePrintOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
                  title="Print Official Time Table PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-300" />
                  <span>Print Date Sheet</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Exam Admit Card Action Banner */}
          <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                  Examination Board
                </span>
                {isAdmitCardUnlocked ? (
                  <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Admit Card Released (अनुमति प्राप्त • जारी)</span>
                  </span>
                ) : (
                  <span className="bg-rose-500/30 text-rose-300 border border-rose-400/40 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-300" />
                    <span>Admit Card Locked (प्रवेश पत्र रोका गया)</span>
                  </span>
                )}
                <span className="text-xs text-blue-200 font-mono">
                  Roll No: <b className="text-amber-300 font-bold">#{effectiveExamRollNo}</b>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h4 className="text-base sm:text-lg font-black text-white">
                  {activeAdmitCardExam?.name || 'Annual Examination'} - Candidate Admit Card
                </h4>
                {candidateExams.length > 1 && (
                  <select
                    value={activeAdmitCardExam?.id || ''}
                    onChange={(e) => setUserSelectedExamId(e.target.value)}
                    className="bg-blue-900/60 text-amber-300 border border-blue-700/60 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
                  >
                    {candidateExams.map((ex) => {
                      const card = admitCards.find(
                        (a) =>
                          a.examId === ex.id &&
                          isCardForCurrentStudent(a.studentId, a.rollNo, a.id)
                      );
                      const released = isCardRecordUnlocked(card);
                      return (
                        <option key={ex.id} value={ex.id} className="bg-slate-900 text-white">
                          {ex.name} {released ? '✓ [Ready / जारी]' : '🔒 [Locked / रोक]'}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {isAdmitCardUnlocked ? (
                <p className="text-xs text-blue-200/90 leading-relaxed">
                  आपका आधिकारिक परीक्षा प्रवेश पत्र विद्यालय द्वारा जारी कर दिया गया है। रोल नंबर <strong>#{effectiveExamRollNo}</strong> आवंटित है। नीचे दिए गए बटन पर क्लिक करके A4 PDF प्रवेश पत्र डाउनलोड करें।
                </p>
              ) : (
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {studentAdmitCard?.lockReason || 'यह प्रवेश पत्र विद्यालय प्रशासन द्वारा रोका गया है। कृपया कार्यालय से संपर्क करें अथवा बकाया विद्यालय शुल्क जमा करवाएं।'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
              {isAdmitCardUnlocked ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAdmitCardPrintOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    title="Print Official Admit Card (A4 Print)"
                  >
                    <Printer className="w-4 h-4 text-slate-950" />
                    <span>Print Admit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdmitCardPrintOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Download Official Admit Card PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admit-card')}
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
                    title="View Full Document & Center Details"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-300" />
                    <span>View Details</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('admit-card')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>View Lock Details</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RELEASED EXAMINATIONS & MARKSHEETS (ONLY RELEASED DATA) */}
      {/* ========================================================================= */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Header & Verification Callout */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-900" />
                  <span>Officially Released Examination Marksheets (बोर्ड घोषित परिणाम)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Only exam results officially published and released by the school examination committee are shown here.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{releasedMarks.length} Officially Released</span>
                </span>
              </div>
            </div>

            {/* Zero State if no exam has been released yet */}
            {releasedMarks.length === 0 && (
              <div className="py-12 px-4 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <Clock className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Examination Results Pending Official Release
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No examination marks have been officially published for this student yet. Marks will automatically appear here once approved and released by the examination board.
                </p>
              </div>
            )}

            {/* List of Released Exam Marksheets */}
            {releasedMarks.length > 0 && (
              <div className="space-y-6 mt-4">
                {releasedMarks.map((mark) => {
                  const examObj = exams.find((e) => e.id === mark.examId);
                  const subjects = getNormalizedSubjects(mark);
                  const totalMax = mark.maxTotalMarks || subjects.reduce((sum, s) => sum + s.maxMarks, 0) || 350;
                  const totalObt = mark.totalMarks || subjects.reduce((sum, s) => sum + s.obtainedMarks, 0);
                  const percentage =
                    mark.percentage || (totalMax > 0 ? Number(((totalObt / totalMax) * 100).toFixed(2)) : 0);

                  return (
                    <div
                      key={mark.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 shadow-2xs"
                    >
                      {/* Exam Header Banner */}
                      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                              ✓ Officially Released
                            </span>
                            <span className="text-xs text-slate-300 font-mono">
                              Session {settings.academicYear}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white">
                            {examObj?.name || 'Annual Examination'}
                          </h4>
                          <p className="text-xs text-blue-200/90 mt-0.5">
                            Exam Period: {formatDateToDDMMYYYY(examObj?.startDate)} to {formatDateToDDMMYYYY(examObj?.endDate)}
                          </p>
                        </div>

                        {/* Overall Score Badges & Print Marksheet CTA */}
                        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
                          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Marks</span>
                            <span className="text-sm font-black text-white font-mono">
                              {totalObt} / {totalMax}
                            </span>
                          </div>

                          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-300 block">Percentage</span>
                            <span className="text-sm font-black text-amber-300 font-mono">
                              {percentage}%
                            </span>
                          </div>

                          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center">
                            <span className="text-[10px] uppercase font-bold text-slate-300 block">Grade</span>
                            <span className="text-sm font-black text-emerald-300 font-mono">
                              {mark.grade || 'A1'}
                            </span>
                          </div>

                          {mark.rank && (
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-300 block">Class Rank</span>
                              <span className="text-sm font-black text-amber-300">
                                #{mark.rank}
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedMarkForReportCard(mark)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>Print Marksheet (A4 PDF)</span>
                          </button>
                        </div>
                      </div>

                      {/* Subject Marks Table (Read-Only) */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                              <th className="py-2.5 px-4">Subject Name (विषय)</th>
                              <th className="py-2.5 px-3 text-center">Max Marks</th>
                              <th className="py-2.5 px-3 text-center">Theory Scored</th>
                              <th className="py-2.5 px-3 text-center">Practical / Internal</th>
                              <th className="py-2.5 px-3 text-center font-black text-slate-900">Total Scored</th>
                              <th className="py-2.5 px-3 text-center">Subject Grade</th>
                              <th className="py-2.5 px-4">Teacher Remark</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {subjects.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-4 font-bold text-slate-900">
                                  {sub.subjectName}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                                  {sub.maxMarks}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-700 font-mono">
                                  {sub.theoryMarks !== undefined ? sub.theoryMarks : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-700 font-mono">
                                  {sub.practicalMarks !== undefined ? sub.practicalMarks : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-black text-blue-950 font-mono text-sm">
                                  {sub.obtainedMarks}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                      sub.grade.startsWith('A')
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sub.grade.startsWith('B')
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {sub.grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-600 text-[11px] italic">
                                  {sub.remarks || 'Satisfactory academic progress'}
                                </td>
                              </tr>
                            ))}

                            {/* Consolidated Grand Total Row */}
                            <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                              <td className="py-3 px-4">Grand Consolidated Total</td>
                              <td className="py-3 px-3 text-center font-mono">{totalMax}</td>
                              <td className="py-3 px-3 text-center">—</td>
                              <td className="py-3 px-3 text-center">—</td>
                              <td className="py-3 px-3 text-center font-mono text-sm text-blue-950">
                                {totalObt} / {totalMax}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded text-[11px]">
                                  {mark.grade || 'A1'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-emerald-800 font-bold">
                                {percentage}% • Rank #{mark.rank || 1}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Remarks & Signatures Footer */}
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Info className="w-4 h-4 text-blue-900 shrink-0" />
                          <span>
                            <strong>Class Teacher Remark:</strong>{' '}
                            {mark.remarks || 'Outstanding performance in examination! Promoted with distinction.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span>Verified by: Principal {settings.principalName || 'Vijendra Pal'}</span>
                          <span>•</span>
                          <span>Tamper-proof Digital Record</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unreleased / In-Evaluation Examinations Callout */}
          {unreleasedExams.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Upcoming / In-Evaluation Examinations ({unreleasedExams.length})
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    The following examinations are scheduled or currently under paper evaluation. Results are not yet released and will appear in the panel once finalized by the school:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                    {unreleasedExams.map((ue) => (
                      <div
                        key={ue.id}
                        className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">{ue.name}</h5>
                          <span className="text-[10px] text-slate-500">
                            {formatDateToDDMMYYYY(ue.startDate)} to {formatDateToDDMMYYYY(ue.endDate)}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          {ue.status === 'Upcoming' ? 'Upcoming' : 'Under Evaluation'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 2-MEETING EXAMINATION TIME TABLE / DATE SHEET (परीक्षा समय-सारणी) */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Header & Exam Selection Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200">
                  Official 2-Meeting Exam Date Sheet
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Session {activeTimetableExam?.session || settings.academicYear}
                </span>
              </div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-900" />
                <span>Examination Time Table & Date Sheet (परीक्षा समय-सारणी)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                विद्यालय प्रशासन द्वारा निर्धारित प्रथम एवं द्वितीय पाली की परीक्षा समय-सारणी व तिथियां
              </p>
            </div>

            {/* Exam Selector & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {candidateExams.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Select Exam:</label>
                  <select
                    value={activeTimetableExam?.id || ''}
                    onChange={(e) => setUserSelectedExamId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-xs text-slate-900 focus:outline-blue-900 cursor-pointer shadow-xs"
                  >
                    {candidateExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.session})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTimetableExam && (
                <button
                  type="button"
                  onClick={() => setIsTimeTablePrintOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shadow-md cursor-pointer active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Date Sheet (समय-सारणी PDF)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('admit-card')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs transition shadow-md cursor-pointer active:scale-95"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Admit Card (प्रवेश पत्र) →</span>
              </button>
            </div>
          </div>

          {/* Exam Schedule Card */}
          {activeTimetableExam && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      2 Meetings Schedule
                    </span>
                    <span className="text-xs text-purple-200 font-mono">
                      {activeTimetableExam.session}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-300" />
                    <span>{activeTimetableExam.name} — Full Date Sheet (समय-सारणी)</span>
                  </h4>
                  <p className="text-xs text-purple-200/90 mt-0.5">
                    कक्षा: {studentClass?.name || currentStudent.classId} • रोल नंबर: #{effectiveExamRollNo}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTimeTablePrintOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shadow-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Time Table</span>
                  </button>
                </div>
              </div>

              {/* Shift Timing Badges */}
              <div className="p-4 bg-purple-50/50 border-b border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-purple-200">
                  <div className="w-7 h-7 rounded-lg bg-purple-950 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                    Ist
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-950 block">
                      Ist Meeting (प्रथम पाली - First Shift)
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono">
                      {activeTimetableExam.meeting1Time || '08:30 AM – 11:30 AM'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-indigo-200">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                    IInd
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-950 block">
                      IInd Meeting (द्वितीय पाली - Second Shift)
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono">
                      {activeTimetableExam.meeting2Time || '12:30 PM – 03:30 PM'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Slots List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-32">Date & Day</th>
                      <th className="py-2.5 px-3">
                        <span className="text-purple-950 font-black">Ist Meeting (प्रथम पाली)</span>
                        <span className="block text-[10px] text-purple-700 font-mono font-medium">
                          {activeTimetableExam.meeting1Time || '08:30 AM – 11:30 AM'}
                        </span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="text-indigo-950 font-black">IInd Meeting (द्वितीय पाली)</span>
                        <span className="block text-[10px] text-indigo-700 font-mono font-medium">
                          {activeTimetableExam.meeting2Time || '12:30 PM – 03:30 PM'}
                        </span>
                      </th>
                      <th className="py-2.5 px-3 w-24 text-center">Room / Hall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetableSlotsForDisplay.map((slot, sIdx) => {
                      const m1None =
                        !slot.meeting1?.subjectName ||
                        slot.meeting1.subjectName.toLowerCase().includes('no exam') ||
                        slot.meeting1.subjectName.includes('खाली') ||
                        slot.meeting1.subjectName.includes('अवकाश');
                      const m2None =
                        !slot.meeting2?.subjectName ||
                        slot.meeting2.subjectName.toLowerCase().includes('no exam') ||
                        slot.meeting2.subjectName.includes('खाली') ||
                        slot.meeting2.subjectName.includes('अवकाश');

                      return (
                        <tr key={slot.id || sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500 font-mono">
                            {sIdx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-slate-900 block font-mono">
                              {formatDateToDDMMYYYY(slot.date)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{slot.day}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {m1None && (!slot.meeting1?.subject2Name || slot.meeting1.subject2Name.toLowerCase().includes('no exam') || slot.meeting1.subject2Name.includes('खाली')) ? (
                              <span className="text-slate-400 italic text-[11px]">-- No Exam (अवकाश) --</span>
                            ) : (
                              <div className="space-y-1">
                                {!m1None && (
                                  <div>
                                    <span className="font-extrabold text-purple-950 block text-xs">
                                      {slot.meeting1.subjectName}
                                    </span>
                                    {slot.meeting1.subjectCode && (
                                      <span className="text-[10px] font-mono text-purple-700 font-bold">
                                        Code: {slot.meeting1.subjectCode}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {slot.meeting1?.subject2Name &&
                                  !slot.meeting1.subject2Name.toLowerCase().includes('no exam') &&
                                  !slot.meeting1.subject2Name.includes('खाली') &&
                                  !slot.meeting1.subject2Name.includes('None') && (
                                    <div className="pt-1 border-t border-purple-100">
                                      <span className="font-bold text-purple-900 block text-xs">
                                        {slot.meeting1.subject2Name}
                                      </span>
                                      {slot.meeting1.subject2Code && (
                                        <span className="text-[9.5px] font-mono text-purple-600 font-bold">
                                          Code: {slot.meeting1.subject2Code}
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {m2None && (!slot.meeting2?.subject2Name || slot.meeting2.subject2Name.toLowerCase().includes('no exam') || slot.meeting2.subject2Name.includes('खाली')) ? (
                              <span className="text-slate-400 italic text-[11px]">-- No Exam (अवकाश) --</span>
                            ) : (
                              <div className="space-y-1">
                                {!m2None && (
                                  <div>
                                    <span className="font-extrabold text-indigo-950 block text-xs">
                                      {slot.meeting2?.subjectName}
                                    </span>
                                    {slot.meeting2?.subjectCode && (
                                      <span className="text-[10px] font-mono text-indigo-700 font-bold">
                                        Code: {slot.meeting2.subjectCode}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {slot.meeting2?.subject2Name &&
                                  !slot.meeting2.subject2Name.toLowerCase().includes('no exam') &&
                                  !slot.meeting2.subject2Name.includes('खाली') &&
                                  !slot.meeting2.subject2Name.includes('None') && (
                                    <div className="pt-1 border-t border-indigo-100">
                                      <span className="font-bold text-indigo-900 block text-xs">
                                        {slot.meeting2.subject2Name}
                                      </span>
                                      {slot.meeting2.subject2Code && (
                                        <span className="text-[9.5px] font-mono text-indigo-600 font-bold">
                                          Code: {slot.meeting2.subject2Code}
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-medium">
                            {slot.meeting1?.roomNo || slot.meeting2?.roomNo || 'Main Hall'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Exam Rules & Guidelines Banner */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-950 text-amber-300 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-extrabold text-slate-900">परीक्षा निर्देश (Examination Guidelines):</h5>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  सभी परीक्षार्थी परीक्षा प्रारंभ होने के 30 मिनट पूर्व विद्यालय पहुंचें। प्रवेश पत्र (Admit Card) साथ लाना अनिवार्य है।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('admit-card')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition"
            >
              प्रवेश पत्र जांचें (Check Admit Card) →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: EXAM ADMIT CARD (प्रवेश पत्र) - LOCKED VS UNLOCKED */}
      {/* ========================================================================= */}
      {activeTab === 'admit-card' && (
        <div className="space-y-6">
          {/* Header & Exam Selection Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                  Candidate Hall Ticket
                </span>
                <span className="text-xs text-slate-400 font-mono">Session {settings.academicYear}</span>
              </div>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-900" />
                <span>Examination Admit Card (परीक्षा प्रवेश पत्र)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                आधिकारिक परीक्षा प्रवेश पत्र डाउनलोड करें अथवा समय सारणी व परीक्षा केंद्र की जानकारी देखें।
              </p>
            </div>

            {/* Exam Selector */}
            {candidateExams.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Select Exam:</label>
                <select
                  value={activeAdmitCardExam?.id || ''}
                  onChange={(e) => setUserSelectedExamId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-xs text-slate-900 focus:outline-blue-900 cursor-pointer shadow-xs"
                >
                  {candidateExams.map((ex) => {
                    const card = admitCards.find(
                      (a) =>
                        a.examId === ex.id &&
                        isCardForCurrentStudent(a.studentId, a.rollNo, a.id)
                    );
                    const released = Boolean(card && card.isReleased === true);
                    return (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} {released ? '✓ [Allowed / जारी]' : '🔒 [Locked / रोक]'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Quick Exam Schedule Summary Strip */}
          {activeAdmitCardExam && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-950 text-amber-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-purple-950 text-xs">
                      {activeAdmitCardExam.name} — 2-Meeting Exam Schedule (समय-सारणी)
                    </span>
                    <span className="text-[10px] font-mono bg-purple-200/70 text-purple-900 px-2 py-0.2 rounded font-bold">
                      {activeAdmitCardExam.session}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800 mt-0.5 font-medium">
                    Ist Meeting: <strong className="font-mono">{activeAdmitCardExam.meeting1Time || '08:30 AM – 11:30 AM'}</strong> • IInd Meeting: <strong className="font-mono">{activeAdmitCardExam.meeting2Time || '12:30 PM – 03:30 PM'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('timetable')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>View Full Date Sheet (समय-सारणी)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTimeTablePrintOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Date Sheet</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STATE A: ADMIT CARD IS LOCKED (प्रवेश पत्र लॉक है) */}
          {/* =================================================================== */}
          {isAdmitCardLocked && (
            <div className="space-y-4">
              {examsWithUnlockedAdmitCard.length > 0 && activeAdmitCardExam && !examsWithUnlockedAdmitCard.some((e) => e.id === activeAdmitCardExam.id) && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 animate-in fade-in shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                        {examsWithUnlockedAdmitCard[0].name} का प्रवेश पत्र विद्यालय द्वारा जारी (Allowed) है!
                      </h5>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        आप अभी दूसरी परीक्षा देख रहे हैं। अपना अनुमत प्रवेश पत्र देखने व डाउनलोड करने हेतु नीचे बटन दबाएं।
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserSelectedExamId(examsWithUnlockedAdmitCard[0].id)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>जारी प्रवेश पत्र खोलें (Open Released Card)</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Lock className="w-8 h-8 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      अनुमति प्रतीक्षित (Permission Required)
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white">
                    Admit Card Access Pending School Admin Permission
                  </h4>
                  <p className="text-xs text-rose-100/90 mt-1 max-w-2xl leading-relaxed">
                    आपके इस परीक्षा ({activeAdmitCardExam?.name || 'परीक्षा'}) के प्रवेश पत्र को अभी विद्यालय प्रशासन द्वारा डाउनलोड की अनुमति नहीं दी गई है।
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Reason Callout */}
                <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                      स्थिति एवं विवरण (Permission Status):
                    </h5>
                    <p className="text-xs text-amber-900 font-semibold">
                      {studentAdmitCard?.lockReason ||
                        (studentDue > 0
                          ? `बकाया शुल्क लंबित है (₹${studentDue.toLocaleString('en-IN')}) - कृपया शुल्क जमा करवाएं`
                          : 'विद्यालय प्रशासन द्वारा प्रवेश पत्र जारी करने की अनुमति अभी प्रतीक्षित है (Pending Admin Approval)')}
                    </p>
                    <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                      जैसे ही विद्यालय प्रशासन द्वारा आपके रोल नंबर व प्रवेश पत्र को पोर्टल पर अनुमति (Allow) दी जाएगी, यह प्रवेश पत्र यहाँ तुरंत उपलब्ध हो जाएगा तथा आप इसे डाउनलोड व प्रिंट कर सकेंगे।
                    </p>
                  </div>
                </div>

                {/* Candidate & Fee Dues Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Student Name</span>
                    <span className="font-extrabold text-slate-900 uppercase block">{currentStudent.fullName}</span>
                    <span className="text-slate-500 font-mono text-[10px]">Adm No: {currentStudent.admissionNo}</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Class & Roll No</span>
                    <span className="font-extrabold text-slate-900 block">
                      {studentClass?.name || currentStudent.classId} - Section {currentStudent.section}
                    </span>
                    <span className="text-blue-900 font-bold font-mono text-[11px]">Roll: #{effectiveExamRollNo}</span>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase text-amber-800 block">Admit Card Fee Status</span>
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                          All Paid (₹0 Other)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700 space-y-0.5 font-medium">
                        <p className="text-emerald-700 font-bold">✓ Admission, Reg & Others: All Paid</p>
                        <p className={studentDue <= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-semibold"}>
                          {studentDue <= 0 ? (
                            `Tuition Fee ₹0 • Exam Fee ₹0 • All Dues Cleared (पूर्णतः चुकता)`
                          ) : hasConveyance ? (
                            `Due Only: Tuition ₹1,800 • Exam ₹300 • Convey ₹1,800`
                          ) : (
                            `Due Only: Tuition ₹2,200 • Exam ₹300 • Convey ₹0 (साधन नहीं)`
                          )}
                        </p>
                      </div>
                      <span className={`text-base font-black font-mono mt-1 block ${studentDue <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        Total Due: ₹{studentDue <= 0 ? '0 (Fully Paid)' : (hasConveyance ? '3,900' : '2,500')}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('fees')}
                      className="mt-2 text-[10px] font-extrabold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Fee Breakdown</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* School Contact Box */}
                <div className="p-4 bg-slate-100 rounded-xl text-xs space-y-2 text-slate-700">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-900" />
                    <span>School Office Contact Details (कार्यालय संपर्क सूत्र):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 font-medium">Institution: </span>
                      <span className="font-bold">{settings.schoolName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Phone: </span>
                      <span className="font-bold text-blue-900">{settings.phone || settings.contactNumber || '+91 94151 88990'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Address: </span>
                      <span>{settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Office Timings: </span>
                      <span>08:30 AM – 02:00 PM (Monday – Saturday)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* =================================================================== */}
          {/* STATE B: ADMIT CARD IS UNLOCKED & DOWNLOADABLE (डाउनलोड की अनुमति) */}
          {/* =================================================================== */}
          {isAdmitCardUnlocked && (
            <div className="space-y-6">
              {/* Official Verification Strip */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Authorized & Officially Released</span>
                    </span>
                    <span className="text-xs text-slate-300 font-mono">Roll: #{effectiveExamRollNo}</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white">
                    {activeAdmitCardExam?.name || 'Annual Examination 2026'} - Candidate Hall Ticket
                  </h4>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    यह प्रवेश पत्र विद्यालय परीक्षा बोर्ड द्वारा प्रमाणित व जारी किया गया है। परीक्षा में सम्मिलित होने हेतु इस प्रवेश पत्र को A4 पेपर पर प्रिंट कर साथ लाएं।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAdmitCardPrintOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-950" />
                    <span>Print Admit Card (प्रवेश पत्र प्रिंट करें)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdmitCardPrintOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Candidate Roll No
                  </span>
                  <span className="text-lg font-extrabold text-blue-950 font-mono">#{effectiveExamRollNo}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Reporting Time
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">{examReportingTimeText}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Exam Timing
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">{examTimingText}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Examination Center
                  </span>
                  <span className="text-xs font-bold text-slate-800 line-clamp-2">{examCenterText}</span>
                </div>
              </div>

              {/* Admit Card Official Fee Clearance & Account Status Strip */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h5 className="font-extrabold text-sm text-slate-900">
                      Admit Card Fee Clearance Status (प्रवेश पत्र शुल्क अनापत्ति विवरण)
                    </h5>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {studentDue <= 0 ? '✓ All Fees Paid (समस्त शुल्क चुकता • शून्य अवशेष)' : '✓ All Other Fees Paid (समस्त अन्य शुल्क चुकता)'}
                    </span>
                  </div>
                  <div className={`text-xs font-mono font-black px-3 py-1 rounded-xl border self-start sm:self-center ${studentDue <= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'text-rose-800 bg-rose-50 border-rose-200'}`}>
                    Total Due Amount: ₹{studentDue <= 0 ? '0 (Fully Paid)' : (effectiveAdmitCard?.totalDueAmount !== undefined ? effectiveAdmitCard.totalDueAmount.toLocaleString('en-IN') : (hasConveyance ? '3,900' : '2,500'))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Tuition Fee Due</span>
                    <span className={`text-base font-black font-mono ${studentDue <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{studentDue <= 0 ? '0' : (effectiveAdmitCard?.dueTuitionFee !== undefined ? effectiveAdmitCard.dueTuitionFee.toLocaleString('en-IN') : (hasConveyance ? '1,800' : '2,200'))}
                    </span>
                    <span className={`text-[10px] block font-medium mt-0.5 ${studentDue <= 0 ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                      {studentDue <= 0 ? 'शिक्षण शुल्क चुकता (₹0)' : 'शिक्षण शुल्क अवशेष'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Exam Fee Due</span>
                    <span className={`text-base font-black font-mono ${studentDue <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{studentDue <= 0 ? '0' : (effectiveAdmitCard?.dueExamFee !== undefined ? effectiveAdmitCard.dueExamFee.toLocaleString('en-IN') : '300')}
                    </span>
                    <span className={`text-[10px] block font-medium mt-0.5 ${studentDue <= 0 ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                      {studentDue <= 0 ? 'परीक्षा शुल्क चुकता (₹0)' : 'परीक्षा शुल्क अवशेष'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Convey Fee Due</span>
                    {studentDue <= 0 ? (
                      <>
                        <span className="text-base font-black text-emerald-700 font-mono">₹0</span>
                        <span className="text-[10px] text-emerald-700 block font-bold mt-0.5">वाहन शुल्क चुकता (₹0)</span>
                      </>
                    ) : hasConveyance && (effectiveAdmitCard?.dueConveyFee || 0) > 0 ? (
                      <>
                        <span className="text-base font-black text-rose-700 font-mono">
                          ₹{(effectiveAdmitCard?.dueConveyFee || 1800).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-600 block font-medium mt-0.5">वाहन शुल्क अवशेष</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-black text-slate-700 font-mono">₹0 (N/A)</span>
                        <span className="text-[10px] text-slate-500 block font-medium mt-0.5">साधन सुविधा नहीं</span>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">Admission & Others</span>
                    <span className="text-base font-black text-emerald-700 font-mono">ALL PAID</span>
                    <span className="text-[10px] text-emerald-700 block font-medium mt-0.5">प्रवेश व अन्य चुकता (₹0)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  {studentDue <= 0 ? (
                    '* विद्यार्थी का समस्त विद्यालय शुल्क (शिक्षण ₹0, परीक्षा ₹0, वाहन व पंजीकरण ₹0) पूर्णतः चुकता सत्यापित है। कोई देय अवशेष शेष नहीं है।'
                  ) : hasConveyance ? (
                    '* प्रवेश पत्र पर विद्यालय नियमानुसार केवल शिक्षण (₹1,800), परीक्षा (₹300) एवं वाहन (₹1,800) शुल्क देय अवशेष (कुल ₹3,900) अंकित हैं। शेष सभी प्रवेश व पंजीकरण शुल्क चुकता सत्यापित हैं।'
                  ) : (
                    '* गैर-साधन छात्र (No Transport): विद्यालय नियमानुसार केवल शिक्षण (₹2,200) एवं परीक्षा (₹300) शुल्क कुल ₹2,500 देय अवशेष अंकित हैं (वाहन शुल्क शून्य)। शेष सभी प्रवेश व पंजीकरण शुल्क चुकता सत्यापित हैं।'
                  )}
                </p>
              </div>

              {/* Live In-Page Embed of Full Admit Card Document */}
              <div className="bg-slate-100 rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-900" />
                    <span>Live Document Preview (आधिकारिक प्रवेश पत्र का प्रारूप)</span>
                  </h5>
                  <button
                    onClick={() => setIsAdmitCardPrintOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>Print Document</span>
                  </button>
                </div>

                {activeAdmitCardExam && (
                  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-300 p-2 sm:p-4">
                    <ExamAdmitCardPdf
                      exam={activeAdmitCardExam}
                      student={currentStudent}
                      admitCard={effectiveAdmitCard}
                      targetClass={studentClass}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE REGISTER (READ-ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="border-b border-slate-100 pb-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Verified Attendance Summary (उपस्थिति विवरण)</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => handleSendWhatsAppMessage('attendance', e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                  title="Send Attendance details via WhatsApp in a new tab"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenShare('attendance');
                  }}
                  className="p-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-2xs cursor-pointer active:scale-95"
                  title="More attendance share options"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Official Register • Read-Only
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Working Days</span>
                <span className="text-lg font-black text-slate-900 font-mono">{attendanceStats.total}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Days Present</span>
                <span className="text-lg font-black text-emerald-900 font-mono">{attendanceStats.present}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">Days Absent</span>
                <span className="text-lg font-black text-rose-900 font-mono">{attendanceStats.absent}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Leave / Late</span>
                <span className="text-lg font-black text-amber-900 font-mono">{attendanceStats.leave}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Attendance Rate</span>
                <span className="text-lg font-black text-blue-900 font-mono">
                  {attendanceStats.percentage}%
                </span>
              </div>
            </div>

            {/* Absent Fine Summary Banner */}
            {fineStats.totalAbsents > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800">Absent Fine Status:</span>
                  <span className="text-slate-500 font-medium">Rate: ₹{settings.absentFinePerDay ?? 5}/absent day</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Paid: ₹{fineStats.paidAmount}
                  </span>
                  {fineStats.dueAmount > 0 && (
                    <span className="text-rose-700 font-extrabold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 animate-pulse">
                      Pending Due: ₹{fineStats.dueAmount}
                    </span>
                  )}
                  {fineStats.waivedAmount > 0 && (
                    <span className="text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      Waived: ₹{fineStats.waivedAmount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date-wise Attendance Ledger */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Recent Attendance History ({studentAttendance.length} Entries Recorded)
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Marked daily by Class Teacher
              </span>
            </div>

            {studentAttendance.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No attendance sessions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3 text-center">Attendance Status</th>
                      <th className="py-2.5 px-3 text-center">Absent Fine</th>
                      <th className="py-2.5 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentAttendance.slice(0, 30).map((record) => {
                      const dateObj = new Date(record.date);
                      const dayName = isNaN(dateObj.getTime())
                        ? ''
                        : dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                      const isAbsent = record.status === 'Absent';
                      const fineAmt = record.fineAmount || settings.absentFinePerDay || 5;

                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            {formatDateToDDMMYYYY(record.date)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{dayName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                record.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : record.status === 'Absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : record.status === 'Leave'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAbsent ? (
                              record.fineStatus === 'Paid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  Paid (₹{fineAmt}) ✓
                                </span>
                              ) : record.fineStatus === 'Waived' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                                  Waived
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  Due ₹{fineAmt}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-300 text-xs font-mono">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            {record.remarks || 'Regular Attendance'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FEE LEDGER & OFFICIAL RECEIPTS (READ-ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Fee Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Annual Agreed Fee
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {settings.currencySymbol}
                {feeBreakdown.totalAnnualFee}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Tuition + Term + Conveyance
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Paid to Date
              </span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {settings.currencySymbol}
                {feeBreakdown.paidAmount}
              </span>
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified in Bank / Cash Counter</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Outstanding Balance Due
              </span>
              <span
                className={`text-2xl font-black font-mono ${
                  feeBreakdown.dueAmount <= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {settings.currencySymbol}
                {feeBreakdown.dueAmount}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                {feeBreakdown.dueAmount <= 0 ? 'All Dues Cleared' : 'Kindly submit at fee counter'}
              </p>
            </div>
          </div>

          {/* Quick WhatsApp Fee Actions */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>WhatsApp Fee Summary & Direct Receipts (व्हाट्सएप फीस विवरण)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Send live fee balance, breakdown, and receipt links directly to WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleSendWhatsAppMessage('due_fee', e)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Send Due Fee Notice via WhatsApp in a new tab"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Due Fee ({settings.currencySymbol}{feeBreakdown.dueAmount})</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSendWhatsAppMessage('paid_fee', e)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Send Paid Receipts via WhatsApp in a new tab"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>WhatsApp Paid Fees ({settings.currencySymbol}{feeBreakdown.paidAmount})</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenShare('due_fee');
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition shadow-xs cursor-pointer active:scale-95"
                title="More Fee Share Options & QR Code"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Official Issued Receipts Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>Official Issued Fee Receipts ({studentReceipts.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Click to preview & print official school receipt voucher
              </span>
            </div>

            {studentReceipts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No fee payment receipts issued yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600 font-bold">
                      <th className="py-2.5 px-4">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentReceipts.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-900">
                          {payment.receiptNo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {formatDateToDDMMYYYY(payment.paymentDate)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {payment.paymentMode || 'Cash'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                          {settings.currencySymbol}
                          {payment.amountPaid}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            Verified ✓
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleSendWhatsAppReceipt(payment, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition cursor-pointer active:scale-95"
                              title="Send this receipt via WhatsApp in a new tab"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptForPrint(payment)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>View Voucher</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CLASS HOMEWORK (READ-ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'homework' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-900" />
              <span>Assigned Class Homework & Diary (कक्षा गृहकार्य)</span>
            </h3>
            <span className="text-xs text-slate-500">{classHomework.length} Assignments</span>
          </div>

          {classHomework.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No pending homework assigned for this class.
            </div>
          ) : (
            <div className="space-y-3">
              {classHomework.map((hw) => (
                <div
                  key={hw.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                        {hw.subject}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{hw.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Assigned: {formatDateToDDMMYYYY(hw.assignedDate)}</span>
                      <span>•</span>
                      <span className="font-semibold text-rose-700">
                        Due: {formatDateToDDMMYYYY(hw.dueDate)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {hw.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: HOLIDAYS & ACADEMIC VACATIONS (READ-ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-emerald-600 fill-current" />
                <span>School Holiday Calendar (वार्षिक अवकाश तालिका)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official calendar of festivals, national holidays, and seasonal vacations • Session {settings.academicYear}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
                {sortedHolidays.length} Total Holidays ({upcomingHolidays.length} Upcoming)
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Print Official Holiday Calendar"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Schedule</span>
              </button>
            </div>
          </div>

          {/* Next Upcoming Holiday Banner */}
          {nextUpcomingHoliday && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/30 flex flex-col items-center justify-center font-mono shrink-0 shadow-inner">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                    {new Date(nextUpcomingHoliday.date).toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="text-xl font-black leading-none">
                    {new Date(nextUpcomingHoliday.date).getDate()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white text-emerald-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs">
                      Next Upcoming Holiday
                    </span>
                    <span className="bg-emerald-800/60 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {nextUpcomingHoliday.type}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black tracking-tight">
                    {nextUpcomingHoliday.name}
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {nextUpcomingHoliday.endDate
                      ? `From ${formatDateToDDMMYYYY(nextUpcomingHoliday.date)} to ${formatDateToDDMMYYYY(nextUpcomingHoliday.endDate)}`
                      : formatDateToDDMMYYYY(nextUpcomingHoliday.date)}
                    {nextUpcomingHoliday.description ? ` • ${nextUpcomingHoliday.description}` : ''}
                  </p>
                </div>
              </div>

              <div className="self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const text = `🏖️ *${settings.schoolName || 'SBSC PUBLIC SCHOOL'} - अवकाश सूचना*\n\n` +
                      `📌 *पर्व/अवकाश:* ${nextUpcomingHoliday.name}\n` +
                      `📅 *तिथि:* ${formatDateToDDMMYYYY(nextUpcomingHoliday.date)}${nextUpcomingHoliday.endDate ? ` से ${formatDateToDDMMYYYY(nextUpcomingHoliday.endDate)}` : ''}\n` +
                      `🏷️ *प्रकार:* ${nextUpcomingHoliday.type}\n` +
                      `${nextUpcomingHoliday.description ? `📝 *विवरण:* ${nextUpcomingHoliday.description}\n` : ''}\n` +
                      `— विद्यालय प्रशासन (${settings.adminName || 'Anil Singh'})`;
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    dispatchSafeMessage(url, 'whatsapp', text);
                  }}
                  className="px-3.5 py-2 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Holidays (सभी)' },
                { id: 'upcoming', label: 'Upcoming Only (आगामी)' },
                { id: 'Festival', label: 'Festival (त्यौहार)' },
                { id: 'National', label: 'National (राष्ट्रीय)' },
                { id: 'Vacation', label: 'Vacation (दीर्घ अवकाश)' },
                { id: 'Gazetted', label: 'Gazetted (शासकीय)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHolidayTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    holidayTypeFilter === f.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative shrink-0 w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={holidaySearchQuery}
                onChange={(e) => setHolidaySearchQuery(e.target.value)}
                placeholder="Search holiday name or date..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 transition font-medium"
              />
              {holidaySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHolidaySearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Holiday Cards Grid */}
          {filteredHolidays.length === 0 ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <Palmtree className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-60" />
              <h4 className="font-bold text-slate-900 text-sm mb-1">No matching holidays found</h4>
              <p className="text-xs text-slate-500">
                Try selecting "All Holidays" or changing search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setHolidayTypeFilter('all');
                  setHolidaySearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredHolidays.map((h) => {
                const dateObj = new Date(h.date + 'T00:00:00');
                const isPast = (h.endDate || h.date) < todayDateStr;
                const isUpcoming = (h.endDate || h.date) >= todayDateStr;
                const dayOfWeek = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
                const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short' });
                const dayNum = dateObj.getDate();

                const typeColors: Record<string, { bg: string; text: string; border: string }> = {
                  National: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
                  Festival: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
                  Vacation: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
                  Gazetted: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
                  Institutional: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
                  Emergency: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
                };
                const tStyle = typeColors[h.type] || typeColors.Festival;

                return (
                  <div
                    key={h.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                      isPast
                        ? 'bg-slate-50/60 border-slate-200 opacity-75'
                        : 'bg-white border-emerald-200 hover:border-emerald-400 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Date & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 border ${
                              isPast
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            <span className="text-[9px] uppercase font-bold tracking-wider leading-none">
                              {monthName}
                            </span>
                            <span className="text-lg font-black leading-tight">{dayNum}</span>
                          </div>

                          <div>
                            <span className="text-[11px] font-bold text-slate-500 block">
                              {dayOfWeek}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {formatDateToDDMMYYYY(h.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${tStyle.bg} ${tStyle.text} ${tStyle.border}`}
                          >
                            {h.type}
                          </span>
                          {isUpcoming && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Upcoming
                            </span>
                          )}
                          {isPast && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-200 text-slate-600">
                              Passed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Holiday Name */}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {h.name}
                      </h4>

                      {/* Multi-day duration banner */}
                      {h.endDate && (
                        <div className="mt-1.5 p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 font-semibold flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>
                            Until {formatDateToDDMMYYYY(h.endDate)} (Multi-day Vacation)
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {h.description && (
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                          {h.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Share Row */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 font-medium">
                        School Closed • SBSC
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = `🏖️ *${settings.schoolName || 'SBSC PUBLIC SCHOOL'} - अवकाश सूचना*\n\n` +
                            `📌 *पर्व/अवकाश:* ${h.name}\n` +
                            `📅 *तिथि:* ${formatDateToDDMMYYYY(h.date)}${h.endDate ? ` से ${formatDateToDDMMYYYY(h.endDate)}` : ''} (${dayOfWeek})\n` +
                            `🏷️ *प्रकार:* ${h.type}\n` +
                            `${h.description ? `📝 *विवरण:* ${h.description}\n` : ''}\n` +
                            `— विद्यालय प्रशासन (${settings.adminName || 'Anil Singh'})`;
                          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                          dispatchSafeMessage(url, 'whatsapp', text);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer border border-emerald-200"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {selectedMarkForReportCard && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setSelectedMarkForReportCard(null)}
          title={`Official Marksheet Report Card • ${currentStudent.fullName}`}
          fileName={`Marksheet-${currentStudent.admissionNo}.pdf`}
        >
          <MarksheetReportCardPdf
            examMark={selectedMarkForReportCard}
            student={currentStudent}
            targetClass={studentClass}
          />
        </PrintPreviewModal>
      )}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW MODAL: OFFICIAL FEE RECEIPT VOUCHER */}
      {/* ========================================================================= */}
      {selectedReceiptForPrint && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setSelectedReceiptForPrint(null)}
          title={`Fee Receipt Voucher • ${selectedReceiptForPrint.receiptNo}`}
          fileName={`Receipt-${selectedReceiptForPrint.receiptNo}.pdf`}
        >
          <FeeReceiptPdf payment={selectedReceiptForPrint} initialLayout="2-copy" />
        </PrintPreviewModal>
      )}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW MODAL: OFFICIAL EXAM ADMIT CARD */}
      {/* ========================================================================= */}
      {isAdmitCardPrintOpen && activeAdmitCardExam && isAdmitCardUnlocked && (
        <PrintPreviewModal
          isOpen={isAdmitCardPrintOpen}
          onClose={() => setIsAdmitCardPrintOpen(false)}
          title={`Exam Admit Card • ${currentStudent.fullName} (${activeAdmitCardExam.name})`}
          fileName={`SBSC-AdmitCard-${currentStudent.rollNo || currentStudent.admissionNo}-${currentStudent.fullName.replace(/\s+/g, '_')}.pdf`}
        >
          <div id="printable-document-content">
            <ExamAdmitCardPdf
              exam={activeAdmitCardExam}
              student={currentStudent}
              admitCard={effectiveAdmitCard}
              targetClass={studentClass}
            />
          </div>
        </PrintPreviewModal>
      )}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW MODAL: OFFICIAL EXAM TIME TABLE (2 MEETINGS) */}
      {/* ========================================================================= */}
      {isTimeTablePrintOpen && activeTimetableExam && (
        <PrintPreviewModal
          isOpen={isTimeTablePrintOpen}
          onClose={() => setIsTimeTablePrintOpen(false)}
          title={`Exam Time Table (2 Meetings) • ${activeTimetableExam.name}`}
          fileName={`SBSC-TimeTable-${activeTimetableExam.name.replace(/\s+/g, '_')}.pdf`}
        >
          <div id="printable-document-content">
            <ExamTimetablePdf
              exam={activeTimetableExam}
              selectedClass={studentClass}
            />
          </div>
        </PrintPreviewModal>
      )}

      {/* ========================================================================= */}
      {/* SHARE STUDENT PORTAL MODAL (WHATSAPP, SECURE LINK, QR CODE) */}
      {/* ========================================================================= */}
      <StudentShareModal
        student={currentStudent}
        studentClass={studentClass}
        attendanceStats={attendanceStats}
        feeBreakdown={feeBreakdown}
        releasedMarksCount={releasedMarks.length}
        schoolName={settings.schoolName}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialTemplate={shareTemplate}
        onPrintMarksheet={
          releasedMarks.length > 0
            ? () => setSelectedMarkForReportCard(releasedMarks[0])
            : undefined
        }
        onPrintFeeReceipt={
          studentReceipts.length > 0
            ? () => setSelectedReceiptForPrint(studentReceipts[0])
            : undefined
        }
      />
    </div>
  );
};

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onLogout,
  onNavigate,
  initialTab = 'overview',
  onBackToDashboard,
  onOpenAdminLogin,
}) => {
  const { currentStudent: contextStudent, currentUser } = useSchool();
  const isDirectStudentSession = currentUser.role === 'student' || currentUser.role === 'parent';

  // Strictly gate the Student Portal:
  // Only an authenticated student or parent session with a valid student record is permitted.
  // Unauthenticated users or users without verified student credentials will see the secure password lock screen.
  if (!isDirectStudentSession || !contextStudent) {
    return (
      <StudentPortalLockScreen
        onBackToDashboard={onBackToDashboard || (onNavigate ? () => onNavigate('dashboard') : undefined)}
        onOpenAdminLogin={onOpenAdminLogin}
      />
    );
  }

  return (
    <StudentPortalView
      currentStudent={contextStudent}
      onLogout={onLogout}
      onNavigate={onNavigate}
      initialTab={initialTab}
      onBackToDashboard={onBackToDashboard}
    />
  );
};
