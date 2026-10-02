import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Student, AttendanceStatus, ExamMark } from '../../types/school';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Receipt,
  Award,
  BookMarked,
  BellRing,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Phone,
  MessageSquare,
  Plus,
  Save,
  Check,
  Eye,
  FileSpreadsheet,
  Filter,
  UserCheck,
  X,
  Zap,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Palmtree,
  Sun,
  ArrowDownAZ,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  EyeOff,
  Lock,
} from 'lucide-react';
import { TeacherPasswordModal } from './TeacherPasswordModal';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { MarksheetReportCardPdf } from '../reports/templates/MarksheetReportCardPdf';
import { Consolidated3TermReportCardPdf } from '../reports/templates/Consolidated3TermReportCardPdf';
import { ExamResultLedgerPdf } from '../reports/templates/ExamResultLedgerPdf';
import { FeeDuesReportPdf } from '../reports/templates/FeeDuesReportPdf';
import { StudentMonthlyAttendanceReportPdf } from '../reports/templates/StudentMonthlyAttendanceReportPdf';
import { StudentProfilePdf } from '../reports/templates/StudentProfilePdf';
import { exportTableToCsv } from '../../services/pdfService';
import { WhatsAppAttendanceModal } from '../attendance/WhatsAppAttendanceModal';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface ClassTeacherPortalProps {
  onNavigate?: (module: string) => void;
  initialTab?: 'students' | 'attendance' | 'fees' | 'exams' | 'homework' | 'notices' | 'security';
  initialClassId?: string;
  lockedClassId?: string;
}

export const ClassTeacherPortal: React.FC<ClassTeacherPortalProps> = ({
  onNavigate,
  initialTab = 'students',
  initialClassId,
  lockedClassId,
}) => {
  const {
    currentUser,
    currentTeacher,
    assignedClassForCurrentTeacher,
    teacherRelativeClasses,
    getTeacherRelativeClasses,
    classes,
    students,
    teachers,
    attendance,
    markAttendance,
    bulkMarkAttendance,
    getAttendanceStatsForDate,
    feePayments,
    getStudentDueAmount,
    getStudentFeeBreakdown,
    exams,
    examMarks,
    saveStudentMarks,
    homeworks,
    addHomework,
    deleteHomework,
    notices,
    addNotice,
    settings,
    holidays,
    getHolidayForDate,
    teacherCreateNewPassword,
  } = useSchool();

  // Selected class state (strictly locked to lockedClassId or assigned class if in restricted mode)
  const isTeacherUser = currentUser.role === 'teacher';
  const effectiveLockedClassId = lockedClassId || (isTeacherUser ? (currentUser.assignedClassId || assignedClassForCurrentTeacher?.id) : undefined);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (effectiveLockedClassId && classes.some((c) => c.id === effectiveLockedClassId)) {
      return effectiveLockedClassId;
    }
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    return assignedClassForCurrentTeacher?.id || classes[0]?.id || 'c-10';
  });

  useEffect(() => {
    if (effectiveLockedClassId && classes.some((c) => c.id === effectiveLockedClassId)) {
      setSelectedClassId(effectiveLockedClassId);
    } else if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
    }
  }, [effectiveLockedClassId, initialClassId, classes]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'students' | 'attendance' | 'fees' | 'exams' | 'homework' | 'notices' | 'security'
  >(initialTab);

  // Self-service password creation state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordSec, setCurrentPasswordSec] = useState('');
  const [newPasswordSec, setNewPasswordSec] = useState('');
  const [confirmPasswordSec, setConfirmPasswordSec] = useState('');
  const [showCurrentSec, setShowCurrentSec] = useState(false);
  const [showNewSec, setShowNewSec] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const selectedClass = useMemo(() => {
    const found = classes.find((c) => c.id === selectedClassId);
    if (found) return found;
    if (assignedClassForCurrentTeacher) return assignedClassForCurrentTeacher;
    return classes[0];
  }, [classes, selectedClassId, assignedClassForCurrentTeacher]);

  // Relative classes for current logged-in teacher
  const currentRelativeClasses = useMemo(() => {
    if (currentTeacher) {
      return getTeacherRelativeClasses(currentTeacher.id);
    }
    return [];
  }, [currentTeacher, getTeacherRelativeClasses]);

  const currentClassRoleInfo = useMemo(() => {
    if (!currentTeacher || !selectedClass) return null;
    const rel = currentRelativeClasses.find((r) => r.classInfo.id === selectedClass.id);
    if (rel) return rel;
    if (selectedClass.classTeacherId === currentTeacher.id) {
      return {
        classInfo: selectedClass,
        roleType: 'class-teacher' as const,
        roleLabel: `Class In-Charge (${selectedClass.name})`,
        subjectsTaught: currentTeacher.subjects || [],
      };
    }
    return null;
  }, [currentTeacher, currentRelativeClasses, selectedClass]);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState<'all' | 'defaulters' | 'cleared'>('all');

  // Today Date for Attendance
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [teacherAttendanceMode, setTeacherAttendanceMode] = useState<'simple' | 'detailed'>('simple');
  const [attendanceSavedToast, setAttendanceSavedToast] = useState(false);
  const [lastSavedAttendanceTime, setLastSavedAttendanceTime] = useState<string | null>(null);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');

  // WhatsApp Attendance Modal State
  const [isAttendanceWhatsAppModalOpen, setIsAttendanceWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | null>(null);

  // Exam Selection for Marks Entry & Report Cards
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    return exams[0]?.id || 'ex-quarterly';
  });
  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const [examMarksDraft, setExamMarksDraft] = useState<Record<string, Record<string, number>>>({});
  const [marksSavedToast, setMarksSavedToast] = useState(false);

  // Homework creation
  const [isHwModalOpen, setIsHwModalOpen] = useState(false);
  const [hwFormData, setHwFormData] = useState({
    subject: 'Mathematics',
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });

  // Notice creation
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeFormData, setNoticeFormData] = useState({
    title: '',
    content: '',
    category: 'Academic' as const,
    priority: 'Normal' as const,
  });

  // Print Modals State
  const [selectedStudentForMarksheet, setSelectedStudentForMarksheet] = useState<Student | null>(null);
  const [selectedStudentForConsolidated, setSelectedStudentForConsolidated] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isClassGazetteOpen, setIsClassGazetteOpen] = useState(false);
  const [isFeeDuesReportOpen, setIsFeeDuesReportOpen] = useState(false);
  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [studentSortMode, setStudentSortMode] = useState<'alpha' | 'roll'>('alpha');

  // Students in selected class (Alphabetical A-Z by default)
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter((s) => s.classId === selectedClass.id)
      .sort((a, b) => {
        if (studentSortMode === 'alpha') {
          return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
        }
        const rollA = parseInt(a.rollNo) || 0;
        const rollB = parseInt(b.rollNo) || 0;
        return rollA - rollB || a.fullName.localeCompare(b.fullName);
      });
  }, [selectedClass, students, studentSortMode]);

  // Filtered students by search
  const filteredClassStudents = useMemo(() => {
    return classStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.guardianPhone.includes(searchTerm)
    );
  }, [classStudents, searchTerm]);

  // Attendance Holiday & Sunday Check
  const currentHoliday = useMemo(() => {
    return getHolidayForDate(attendanceDate);
  }, [getHolidayForDate, attendanceDate]);
  const isAttendanceDateHoliday = !!currentHoliday;

  const isAttendanceDateSunday = useMemo(() => {
    if (!attendanceDate) return false;
    const parts = attendanceDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.getDay() === 0;
  }, [attendanceDate]);

  const isDateNonWorking = isAttendanceDateHoliday || isAttendanceDateSunday;

  // Today's attendance state map
  const todayAttendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    classStudents.forEach((student) => {
      const rec = attendance.find(
        (a) => a.date === attendanceDate && a.targetId === student.id && a.type === 'student'
      );
      map[student.id] = rec
        ? rec.status
        : isAttendanceDateHoliday
        ? 'Holiday'
        : isAttendanceDateSunday
        ? 'Sunday'
        : 'Present';
    });
    return map;
  }, [classStudents, attendance, attendanceDate, isAttendanceDateHoliday, isAttendanceDateSunday]);

  // Initialize draft when date or class changes
  React.useEffect(() => {
    setAttendanceDraft(todayAttendanceMap);
  }, [todayAttendanceMap, attendanceDate, selectedClassId]);

  // Class KPI Metrics
  const classStrength = classStudents.length;
  const todayStats = useMemo(() => {
    if (isAttendanceDateHoliday || isAttendanceDateSunday) {
      return {
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        holiday: isAttendanceDateHoliday ? classStrength : 0,
        sunday: isAttendanceDateSunday ? classStrength : 0,
        total: classStrength,
        rate: 0,
      };
    }
    let present = 0;
    let absent = 0;
    let leave = 0;
    let holiday = 0;
    let sunday = 0;
    classStudents.forEach((st) => {
      const stStatus = attendanceDraft[st.id] || todayAttendanceMap[st.id] || 'Present';
      if (stStatus === 'Present') present++;
      else if (stStatus === 'Absent') absent++;
      else if (stStatus === 'Leave') leave++;
      else if (stStatus === 'Holiday') holiday++;
      else if (stStatus === 'Sunday') sunday++;
    });
    const total = classStrength || 1;
    const rate = Math.round((present / total) * 100);
    return { present, absent, leave, late: 0, holiday, sunday, total: classStrength, rate };
  }, [classStudents, attendanceDraft, todayAttendanceMap, classStrength, isAttendanceDateHoliday, isAttendanceDateSunday]);

  const classTotalDue = useMemo(() => {
    return classStudents.reduce((acc, st) => acc + getStudentDueAmount(st.id), 0);
  }, [classStudents, getStudentDueAmount]);

  const classDefaultersCount = useMemo(() => {
    return classStudents.filter((st) => getStudentDueAmount(st.id) > 0).length;
  }, [classStudents, getStudentDueAmount]);

  // Attendance Handlers
  const handleToggleAttendance = (studentId: string, status: AttendanceStatus) => {
    if (isDateNonWorking) return; // Locked on Sundays and holidays
    setAttendanceDraft((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    // Immediately persist single status change to local storage and cloud
    markAttendance({
      date: attendanceDate,
      type: 'student',
      targetId: studentId,
      classId: selectedClass.id,
      section: classStudents.find((s) => s.id === studentId)?.section || 'A',
      status,
    });
  };

  const handleMarkAllPresent = () => {
    if (isDateNonWorking) return; // Locked on Sundays and holidays
    const allP: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      allP[st.id] = 'Present';
    });
    setAttendanceDraft(allP);
  };

  const handleMarkAllAbsent = () => {
    if (isDateNonWorking) return; // Locked on Sundays and holidays
    const allA: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      allA[st.id] = 'Absent';
    });
    setAttendanceDraft(allA);
  };

  const handleMarkAllLeave = () => {
    if (isDateNonWorking) return; // Locked on Sundays and holidays
    const allL: Record<string, AttendanceStatus> = {};
    classStudents.forEach((st) => {
      allL[st.id] = 'Leave';
    });
    setAttendanceDraft(allL);
  };

  const handleSaveAttendance = () => {
    const records = classStudents.map((st) => ({
      date: attendanceDate,
      type: 'student' as const,
      targetId: st.id,
      classId: selectedClass.id,
      section: st.section || 'A',
      status: isAttendanceDateHoliday
        ? ('Holiday' as const)
        : isAttendanceDateSunday
        ? ('Sunday' as const)
        : (attendanceDraft[st.id] || 'Present'),
      remarks: isAttendanceDateHoliday ? currentHoliday?.name : isAttendanceDateSunday ? 'Sunday Weekly Off' : undefined,
    }));
    bulkMarkAttendance(records);
    const now = new Date();
    setLastSavedAttendanceTime(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    setAttendanceSavedToast(true);
    setTimeout(() => setAttendanceSavedToast(false), 3500);
  };

  // Filtered attendance list
  const filteredAttendanceStudents = useMemo(() => {
    return classStudents.filter((st) => {
      const status = isAttendanceDateHoliday
        ? 'Holiday'
        : (attendanceDraft[st.id] || todayAttendanceMap[st.id] || 'Present');
      if (attendanceStatusFilter !== 'all' && status !== attendanceStatusFilter) {
        return false;
      }
      if (attendanceSearchTerm.trim()) {
        const q = attendanceSearchTerm.toLowerCase();
        return (
          st.fullName.toLowerCase().includes(q) ||
          st.rollNo.toLowerCase().includes(q) ||
          st.admissionNo.toLowerCase().includes(q) ||
          st.fatherName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [classStudents, attendanceDraft, todayAttendanceMap, attendanceStatusFilter, attendanceSearchTerm, isAttendanceDateHoliday]);

  // WhatsApp Attendance Alert for Absent Students
  const handleSendAttendanceWhatsApp = (student: Student) => {
    setWhatsAppTargetStudent(student);
    setIsAttendanceWhatsAppModalOpen(true);
  };

  // WhatsApp Fee Reminder from Class Teacher
  const handleSendFeeDueWhatsApp = (student: Student, dueAmount: number) => {
    const b = getStudentFeeBreakdown(student.id);
    const message = `🏫 *${settings.schoolName}*
*CLASS TEACHER FEE DUE REMINDER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आदरणीय अभिभावक / Respected Parent,
Ward: *${student.fullName}* (Roll: ${student.rollNo}, Class: ${selectedClass.name})
Father: *${student.fatherName}*

📋 *Head-Wise Due Breakdown (मद-वार देय विवरण):*
• Tuition Fee (शिक्षण शुल्क): ₹${(b.tuitionFee || 0).toLocaleString('en-IN')}
• Admission Fee (प्रवेश शुल्क): ₹${(b.admissionFee || 0).toLocaleString('en-IN')}
• Registration Fee (पंजीकरण शुल्क): ₹${(b.registrationFee || 0).toLocaleString('en-IN')}
• Exam Fee (परीक्षा शुल्क): ₹${(b.examFee || 0).toLocaleString('en-IN')}
• Conveyance (वाहन शुल्क): ₹${(b.conveyFee || 0).toLocaleString('en-IN')}
• Previous Due (पिछला बकाया): ₹${(b.previousDue || 0).toLocaleString('en-IN')}
• Late Fine (विलंब शुल्क): ₹${(b.lateFine || 0).toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Total Net Due Payable:* *₹${dueAmount.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आपसे विनम्र अनुरोध है कि आगामी परीक्षा एवं सत्र से पूर्व बकाया शुल्क विद्यालय कार्यालय अथवा UPI द्वारा जमा करें।

Class Teacher: *${currentTeacher?.name || currentUser.name}*
School Office: *${settings.phone}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const rawPhone = student.guardianPhone || student.emergencyContact || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = cleanPhone
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    dispatchSafeMessage(url, 'whatsapp', message);
  };

  // Standard subjects in selected class
  const classSubjects = selectedClass.subjects || [
    { id: 'sub-1', name: 'हिंदी', code: 'HIN', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-2', name: 'English', code: 'ENG', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-3', name: 'Math', code: 'MATH', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-4', name: 'Social', code: 'SOC', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-5', name: 'Science', code: 'SCI', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-6', name: 'Computer', code: 'CMP', maxMarks: 50, passingMarks: 17 },
    { id: 'sub-7', name: 'Art', code: 'ART', maxMarks: 50, passingMarks: 17 },
  ];

  // Initialize Marks Draft for Selected Exam
  const existingMarksMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (!selectedExam) return map;

    classStudents.forEach((st) => {
      map[st.id] = {};
      classSubjects.forEach((sub) => {
        const markRec = examMarks.find(
          (m) => m.examId === selectedExam.id && m.studentId === st.id && m.subjectId === sub.id
        );
        map[st.id][sub.id] = markRec ? markRec.marksObtained : 35; // reasonable default if not set
      });
    });
    return map;
  }, [selectedExam, classStudents, classSubjects, examMarks]);

  React.useEffect(() => {
    setExamMarksDraft(existingMarksMap);
  }, [existingMarksMap, selectedExamId, selectedClassId]);

  const handleMarkChange = (studentId: string, subjectId: string, value: number) => {
    const validVal = Math.max(0, Math.min(50, value));
    setExamMarksDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: validVal,
      },
    }));
  };

  const handleSaveAllMarks = () => {
    if (!selectedExam) return;
    let savedCount = 0;
    classStudents.forEach((st) => {
      classSubjects.forEach((sub) => {
        const marksObtained = examMarksDraft[st.id]?.[sub.id] ?? 35;
        saveStudentMarks({
          examId: selectedExam.id,
          studentId: st.id,
          classId: selectedClass.id,
          subjectId: sub.id,
          marksObtained,
          maxMarks: sub.maxMarks || 50,
          passingMarks: sub.passingMarks || 17,
        });
        savedCount++;
      });
    });
    setMarksSavedToast(true);
    setTimeout(() => setMarksSavedToast(false), 3000);
  };

  // Homework Submit
  const handleAddHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwFormData.title.trim()) return;
    addHomework({
      classId: selectedClass.id,
      section: 'A',
      subject: hwFormData.subject,
      title: hwFormData.title,
      description: hwFormData.description,
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: hwFormData.dueDate,
      teacherName: currentTeacher?.name || currentUser.name,
    });
    setHwFormData({
      subject: 'Mathematics',
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    });
    setIsHwModalOpen(false);
  };

  // Notice Submit
  const handleAddNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeFormData.title.trim()) return;
    addNotice({
      title: noticeFormData.title,
      content: noticeFormData.content,
      category: noticeFormData.category,
      targetAudience: 'Specific Class',
      targetClassId: selectedClass.id,
      priority: noticeFormData.priority,
      publishDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      postedBy: currentTeacher?.name || currentUser.name,
      isActive: true,
    });
    setNoticeFormData({
      title: '',
      content: '',
      category: 'Academic',
      priority: 'Normal',
    });
    setIsNoticeModalOpen(false);
  };

  // Active faculty for password self-service
  const activeTeacher = useMemo(() => {
    if (currentTeacher) return currentTeacher;
    const byClass = teachers.find(
      (t) =>
        t.id === selectedClass?.classTeacherId ||
        t.assignedClassId === selectedClass?.id ||
        (t.assignedClass && selectedClass && t.assignedClass.toLowerCase() === selectedClass.name.toLowerCase())
    );
    if (byClass) return byClass;
    return teachers[0];
  }, [currentTeacher, selectedClass, teachers]);

  const handleAutoGeneratePassword = () => {
    const prefixes = ['Teach', 'Vidya', 'Faculty', 'Edu', 'Guru'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(1000 + Math.random() * 9000);
    const pass = `${prefix}@${digits}`;
    setNewPasswordSec(pass);
    setConfirmPasswordSec(pass);
    setShowNewSec(true);
    setSecurityError('');
  };

  const handleSelfPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!currentPasswordSec.trim()) {
      setSecurityError('कृपया अपना वर्तमान पासवर्ड (Current Password) दर्ज करें।');
      return;
    }
    if (!newPasswordSec.trim() || newPasswordSec.trim().length < 4) {
      setSecurityError('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए (Minimum 4 characters).');
      return;
    }
    if (newPasswordSec.trim() !== confirmPasswordSec.trim()) {
      setSecurityError('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं।');
      return;
    }

    if (!activeTeacher) {
      setSecurityError('शिक्षक रिकॉर्ड नहीं मिला।');
      return;
    }

    const res = teacherCreateNewPassword(activeTeacher.id, currentPasswordSec.trim(), newPasswordSec.trim());
    if (res.success) {
      setSecuritySuccess(res.message);
      setCurrentPasswordSec('');
      setNewPasswordSec('');
      setConfirmPasswordSec('');
    } else {
      setSecurityError(res.message);
    }
  };

  const handleRequestAdminResetWhatsApp = () => {
    const adminName = settings.adminName || 'Anil Singh';
    const adminPhone = settings.adminPhone || settings.phone || '9452305199';
    const text = `🏫 *${settings.schoolName || 'SBSC Public School'}*
*TEACHER PASSWORD RESET REQUEST*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Admin Sir *${adminName}*,
Namaste. I am faculty member:
👤 *Teacher Name:* ${activeTeacher?.name || currentUser.name}
🆔 *Employee ID:* ${activeTeacher?.empId || currentUser.username}
🏫 *Assigned Class:* ${selectedClass?.name || 'Class In-Charge'}
📞 *Phone:* ${activeTeacher?.phone || currentUser.phone || ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kindly reset my portal password as only Admin is authorized to reset passwords.
Thank you.`;

    const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(url, 'whatsapp', text);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner: Class Teacher Dossier */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-blue-900">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Class Teacher Portal • कक्षा अध्यापक पैनल</span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {selectedClass.name} Dashboard
            </h1>
            <span className="bg-blue-800 text-amber-300 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-blue-700">
              Room: {selectedClass.roomNumber || 'Room 204'}
            </span>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm">
            In-Charge: <strong className="text-amber-300">{currentTeacher?.name || currentUser.name}</strong> •{' '}
            {currentTeacher?.designation || 'Class Teacher'} • Academic Session: {settings.academicSession}
          </p>
        </div>

        {/* Right Switcher, Quick Attendance & Quick Print */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {effectiveLockedClassId ? (
            <div className="flex items-center gap-2.5 bg-emerald-950/80 px-3.5 py-2 rounded-2xl border border-emerald-500/60 shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-emerald-300 uppercase font-bold tracking-wider">
                  Locked Class Access:
                </span>
                <span className="text-xs font-black text-amber-300">
                  {selectedClass?.name} ({selectedClass?.roomNumber || 'Room 204'})
                </span>
              </div>
            </div>
          ) : currentUser.role === 'admin' ? (
            <div className="flex items-center gap-2 bg-blue-900/70 px-3 py-1.5 rounded-2xl border border-blue-700/80 shadow-inner">
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Admin Class View:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-blue-950 text-amber-300 border border-amber-400/30 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({teachers.find((t) => t.id === c.classTeacherId)?.name || 'Class Teacher'})
                  </option>
                ))}
              </select>
            </div>
          ) : currentRelativeClasses.length > 1 ? (
            <div className="flex items-center gap-2 bg-blue-900/80 px-3 py-1.5 rounded-2xl border border-blue-700/80 shadow-inner">
              <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-blue-200 uppercase font-bold tracking-wider">Your Assigned Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-blue-950 text-amber-300 border border-amber-400/30 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
                >
                  {currentRelativeClasses.map((rc) => (
                    <option key={rc.classInfo.id} value={rc.classInfo.id}>
                      {rc.roleType === 'class-teacher'
                        ? '⭐ Class Teacher: '
                        : rc.roleType === 'primary-incharge'
                        ? '👑 Primary In-Charge: '
                        : '📘 Subject: '}
                      {rc.classInfo.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-blue-900/80 px-3.5 py-2 rounded-2xl border border-blue-700/80 shadow-inner">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-blue-200 uppercase font-bold tracking-wider">
                  {currentClassRoleInfo?.roleLabel || 'Assigned Class'}
                </span>
                <span className="text-xs font-black text-amber-300">
                  {selectedClass?.name} (Sec {selectedClass?.section || 'A'})
                </span>
              </div>
            </div>
          )}

          {/* Direct Take Class Attendance Button */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-white/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Open attendance register for this class"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => setIsClassGazetteOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Class Gazette PDF</span>
          </button>

          {/* Create New Password Button */}
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition active:scale-95 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-400 text-blue-950 ring-2 ring-white/50'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
            title="Create or update your personal teacher password"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>Create Password</span>
          </button>
        </div>
      </div>

      {/* Relative Classes Quick Switch Bar for Multi-Class In-Charges & Teachers */}
      {currentRelativeClasses.length > 1 && (
        <div className="bg-white border border-blue-200/80 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-900 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              Your Relative Classes ({currentRelativeClasses.length}):
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentRelativeClasses.map((rc) => {
              const isSelected = selectedClass.id === rc.classInfo.id;
              return (
                <button
                  key={rc.classInfo.id}
                  onClick={() => setSelectedClassId(rc.classInfo.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950 text-amber-300 shadow-sm ring-2 ring-blue-950/20 font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{rc.classInfo.name}</span>
                  {rc.roleType === 'class-teacher' && <span className="text-xs">⭐</span>}
                  {rc.roleType === 'primary-incharge' && (
                    <span className="text-[9px] bg-amber-200 text-slate-900 px-1 py-0.5 rounded font-black">
                      PRT
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Class Strength</span>
            <Users className="w-4 h-4 text-blue-900" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{classStrength}</span>
            <span className="text-xs text-slate-500 font-medium">Students Enrolled</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Today Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{todayStats.rate}%</span>
            <span className="text-xs text-slate-500 font-semibold">
              {todayStats.present} Present / {todayStats.absent} Absent
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Class Fee Dues</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">₹{classTotalDue.toLocaleString('en-IN')}</span>
            <span className="text-xs text-slate-500 font-semibold">
              {classDefaultersCount} Defaulters
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Curriculum & Exams</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-900">7 Subjects</span>
            <span className="text-xs text-slate-500 font-semibold">Max 50 Marks / 3-Terms</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'students'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Class Students Roster ({classStrength})</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'attendance'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Daily Attendance Register</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'fees'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Class Due Fees & Reminders</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'exams'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Exam Marks & Report Cards</span>
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'homework'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          <span>Class Homework</span>
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'notices'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Notices & Circulars</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'security'
              ? 'bg-blue-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Create New Password</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDENTS ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Roll No, Name, Father's Name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-blue-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Sort Order Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setStudentSortMode('alpha')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    studentSortMode === 'alpha'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List students in Alphabetical Order (A-Z)"
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                  <span>Alphabetical (A-Z)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentSortMode('roll')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    studentSortMode === 'roll'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List students by Roll Number"
                >
                  <span>By Roll No</span>
                </button>
              </div>

              <button
                onClick={() => setIsAttendanceReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <Printer className="w-4 h-4 text-blue-900" />
                <span>Monthly Sheet PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-950 transition select-none"
                      onClick={() => setStudentSortMode('roll')}
                      title="Sort by Roll No"
                    >
                      <div className="flex items-center gap-1">
                        <span>Roll No</span>
                        {studentSortMode === 'roll' && <span className="text-blue-900 font-black">▲</span>}
                      </div>
                    </th>
                    <th className="py-3 px-4">Adm No</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-950 transition select-none"
                      onClick={() => setStudentSortMode('alpha')}
                      title="Sort in Alphabetical order (A-Z)"
                    >
                      <div className="flex items-center gap-1 text-blue-900">
                        <span>Student Name</span>
                        {studentSortMode === 'alpha' && (
                          <span className="bg-blue-100 text-blue-950 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5">
                            <ArrowDownAZ className="w-3 h-3" /> A-Z
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Due Fee</th>
                    <th className="py-3 px-4 text-right">Report Cards & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassStudents.map((st) => {
                    const dueAmt = getStudentDueAmount(st.id);
                    return (
                      <tr key={st.id} className="hover:bg-blue-50/40 transition">
                        <td className="py-3 px-4 font-mono font-black text-blue-950">
                          #{st.rollNo}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 font-semibold">
                          {st.admissionNo}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {st.fullName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {st.fatherName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <div className="flex items-center gap-2">
                            <span>{st.guardianPhone}</span>
                            <a
                              href={`tel:${st.guardianPhone}`}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Call Parent"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {dueAmt > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ₹{dueAmt.toLocaleString('en-IN')} Due
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                              Cleared ✓
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedStudentForConsolidated(st)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-[11px] border border-indigo-200 transition"
                              title="3-Term Consolidated Annual Marksheet"
                            >
                              3-Term Report
                            </button>
                            <button
                              onClick={() => setSelectedStudentForMarksheet(st)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-[11px] border border-blue-200 transition"
                              title="Term Marksheet Report Card"
                            >
                              Marksheet
                            </button>
                            <button
                              onClick={() => setSelectedStudentForProfile(st)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition"
                              title="Student Profile Dossier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY ATTENDANCE REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Official Holiday Notice Banner if Selected Date is Holiday */}
          {isAttendanceDateHoliday && currentHoliday && (
            <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border-2 border-sky-300 rounded-2xl p-4 shadow-sm animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Palmtree className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-900 font-black text-[10px] uppercase tracking-wider border border-sky-300">
                      Official School Holiday
                    </span>
                    <span className="text-xs font-bold text-sky-900 font-mono">
                      📅 {attendanceDate}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-sky-950 mt-1">
                    {currentHoliday.name}
                  </h3>
                  <p className="text-xs text-sky-800 mt-0.5 font-medium">
                    {currentHoliday.description || 'School Closed on this occasion.'}
                    <span className="text-sky-700 ml-2 font-bold block sm:inline">
                      • Attendance is marked as HOLIDAY for all students. No Present, Absent, or Leave option is available for this date.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Daily Roll-Call Register
                  </span>
                  <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {selectedClass.name} • Sec {selectedClass.section || 'A'}
                  </span>
                  {currentClassRoleInfo && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                      {currentClassRoleInfo.roleLabel}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <span>Class Attendance Register</span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    ({new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })})
                  </span>
                </h3>
              </div>

              {/* Quick Date Picker Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {isAttendanceDateHoliday && currentHoliday && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 text-sky-950 border border-sky-300 font-extrabold text-xs">
                    <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                    <span>Holiday: {currentHoliday.name}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setAttendanceDate(new Date().toISOString().slice(0, 10))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    attendanceDate === new Date().toISOString().slice(0, 10)
                      ? 'bg-blue-950 text-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                    setAttendanceDate(yesterday);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    attendanceDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                      ? 'bg-blue-950 text-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-blue-950 focus:outline-blue-900"
                />
              </div>
            </div>

            {/* Attendance KPI metric tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4">
              <div
                onClick={() => setAttendanceStatusFilter('all')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  attendanceStatusFilter === 'all'
                    ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Enrolled</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-900">{classStrength}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Students</span>
                </div>
              </div>

              {isAttendanceDateHoliday ? (
                <div className="p-3 rounded-xl border border-sky-300 bg-sky-50 shadow-xs col-span-3 sm:col-span-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-sky-800 tracking-wide block">
                      Official Holiday Attendance
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Palmtree className="w-4 h-4 text-sky-700" />
                      <span className="text-lg font-black text-sky-950">
                        {currentHoliday?.name}
                      </span>
                      <span className="text-xs font-bold text-sky-700">
                        ({classStrength} students marked as Holiday)
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-sky-200 text-sky-900 rounded-lg text-xs font-black uppercase">
                    School Closed
                  </span>
                </div>
              ) : isAttendanceDateSunday ? (
                <div className="p-3 rounded-xl border border-purple-300 bg-purple-50 shadow-xs col-span-3 sm:col-span-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-800 tracking-wide block">
                      Sunday Weekly Off (Automatic)
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Sun className="w-4 h-4 text-purple-700" />
                      <span className="text-lg font-black text-purple-950">
                        Sunday
                      </span>
                      <span className="text-xs font-bold text-purple-700">
                        ({classStrength} students marked as Sunday - No Attendance Required)
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-purple-200 text-purple-900 rounded-lg text-xs font-black uppercase">
                    Weekly Off
                  </span>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => setAttendanceStatusFilter('Present')}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      attendanceStatusFilter === 'Present'
                        ? 'border-emerald-600 bg-emerald-50 shadow-xs'
                        : 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Present</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xl font-black text-emerald-700">{todayStats.present}</span>
                      <span className="text-[11px] font-extrabold text-emerald-600">({todayStats.rate}%)</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setAttendanceStatusFilter('Absent')}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      attendanceStatusFilter === 'Absent'
                        ? 'border-rose-600 bg-rose-50 shadow-xs'
                        : 'border-rose-100 bg-rose-50/30 hover:bg-rose-50/60'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-rose-700 block">Absent</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xl font-black text-rose-700">{todayStats.absent}</span>
                      <span className="text-[10px] text-rose-600 font-semibold">Unexcused</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setAttendanceStatusFilter('Leave')}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      attendanceStatusFilter === 'Leave'
                        ? 'border-amber-500 bg-amber-50 shadow-xs'
                        : 'border-amber-100 bg-amber-50/30 hover:bg-amber-50/60'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">On Leave</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-amber-700">{todayStats.leave}</span>
                      <span className="text-[10px] text-amber-600 font-semibold">Approved</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {isAttendanceDateHoliday ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-100 border border-sky-300 text-sky-950 font-black text-xs">
                  <Palmtree className="w-4 h-4 text-sky-700" />
                  <span>Holiday: {currentHoliday?.name} (Locked - No Present/Absent/Leave)</span>
                </div>
              ) : isAttendanceDateSunday ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 font-black text-xs">
                  <Sun className="w-4 h-4 text-purple-700" />
                  <span>Sunday: Weekly Off (Locked - Automatically Sunday)</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllAbsent}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Mark All Absent</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllLeave}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark All Leave</span>
                  </button>

                  {/* Mode Toggle: Simple (Name • Present/Absent/Leave) vs Detailed */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTeacherAttendanceMode('simple')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        teacherAttendanceMode === 'simple'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Name • Present / Absent / Leave</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherAttendanceMode('detailed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        teacherAttendanceMode === 'detailed'
                          ? 'bg-blue-950 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Detailed</span>
                    </button>
                  </div>
                </>
              )}

              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={attendanceSearchTerm}
                  onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                  placeholder="Filter student or roll no..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {attendanceSavedToast && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Register Saved!
                </span>
              )}

              {lastSavedAttendanceTime && !attendanceSavedToast && (
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
                  Saved at {lastSavedAttendanceTime}
                </span>
              )}

              {!isAttendanceDateHoliday && (
                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTargetStudent(null);
                    setIsAttendanceWhatsAppModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
                  title="Send WhatsApp Absent Alert to parents"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span className="hidden sm:inline">WhatsApp Absent</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save Attendance Register</span>
              </button>
            </div>
          </div>

          {/* Attendance Students Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                    <th className="py-3 px-4 w-20">Roll No</th>
                    <th className="py-3 px-4">Student Name & Parent</th>
                    <th className="py-3 px-4 text-center">Attendance Status Selection</th>
                    <th className="py-3 px-4 text-right">Parent Notification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendanceStudents.map((st) => {
                    const currentStatus = attendanceDraft[st.id] || todayAttendanceMap[st.id] || 'Present';
                    return (
                      <tr
                        key={st.id}
                        className={`transition ${
                          currentStatus === 'Absent' ? 'bg-rose-50/50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-xs text-blue-950 bg-slate-100 px-2 py-1 rounded-lg">
                            #{st.rollNo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`flex items-center gap-3 ${
                              !isDateNonWorking ? 'cursor-pointer select-none group' : ''
                            }`}
                            onClick={() => {
                              if (!isDateNonWorking && teacherAttendanceMode === 'simple') {
                                handleToggleAttendance(
                                  st.id,
                                  currentStatus === 'Present' ? 'Absent' : currentStatus === 'Absent' ? 'Leave' : 'Present'
                                );
                              }
                            }}
                            title={teacherAttendanceMode === 'simple' ? 'Click to cycle Present / Absent / Leave' : undefined}
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:ring-2 group-hover:ring-blue-400 transition">
                              {st.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 group-hover:text-blue-950 transition">
                                <span>{st.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({st.admissionNo})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                S/o: {st.fatherName || 'Guardian'} {st.mobileNumber ? `• 📞 ${st.mobileNumber}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isAttendanceDateHoliday ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100 border border-sky-300 text-sky-950 font-black text-xs shadow-2xs">
                                <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                                <span>HOLIDAY</span>
                              </span>
                              <span className="text-[10px] font-bold text-sky-800 mt-1 max-w-[200px] truncate text-center">
                                {currentHoliday?.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                Locked: No Present/Absent/Leave
                              </span>
                            </div>
                          ) : isAttendanceDateSunday ? (
                            <div className="flex flex-col items-center justify-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 font-black text-xs shadow-2xs">
                                <Sun className="w-3.5 h-3.5 text-purple-700" />
                                <span>SUNDAY</span>
                              </span>
                              <span className="text-[10px] font-bold text-purple-800 mt-1 max-w-[200px] truncate text-center">
                                Weekly Off (Auto)
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                Locked: Automatic Sunday
                              </span>
                            </div>
                          ) : teacherAttendanceMode === 'simple' ? (
                            /* Simple Three-Button Mode: Present / Absent / Leave */
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(st.id, 'Present')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  currentStatus === 'Present'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-300'
                                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>PRESENT</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(st.id, 'Absent')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  currentStatus === 'Absent'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md ring-2 ring-rose-300'
                                    : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>ABSENT</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(st.id, 'Leave')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  currentStatus === 'Leave'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md ring-2 ring-amber-300'
                                    : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>LEAVE</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {(['Present', 'Absent', 'Leave'] as AttendanceStatus[]).map((status) => {
                                const isSelected = currentStatus === status;
                                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                                if (isSelected) {
                                  if (status === 'Present') btnStyle = 'bg-emerald-600 text-white font-black shadow-sm ring-2 ring-emerald-300';
                                  else if (status === 'Absent') btnStyle = 'bg-rose-600 text-white font-black shadow-sm ring-2 ring-rose-300';
                                  else if (status === 'Leave') btnStyle = 'bg-amber-500 text-slate-950 font-black shadow-sm ring-2 ring-amber-300';
                                }

                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleToggleAttendance(st.id, status)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${btnStyle}`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendAttendanceWhatsApp(st)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition cursor-pointer active:scale-95 ${
                              currentStatus === 'Absent'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                            title={currentStatus === 'Absent' ? 'Send WhatsApp Absent Notice to parent' : 'Send WhatsApp Status'}
                          >
                            <Send className={`w-3.5 h-3.5 ${currentStatus === 'Absent' ? 'text-rose-600 fill-rose-600' : 'text-emerald-600'}`} />
                            <span>{currentStatus === 'Absent' ? 'WhatsApp Absent' : 'WhatsApp Status'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAttendanceStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-500">
                        <div className="max-w-sm mx-auto space-y-2">
                          <p className="font-bold text-xs text-slate-700">No students match current filter</p>
                          <p className="text-[11px] text-slate-400">
                            Try clearing your search term or switching the status filter to "Enrolled (All)".
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceSearchTerm('');
                              setAttendanceStatusFilter('all');
                            }}
                            className="px-3 py-1 text-xs font-bold text-blue-900 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                          >
                            Reset Attendance Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CLASS DUE FEES & REMINDERS */}
      {/* ========================================================================= */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Dues:</span>
              <button
                onClick={() => setFeeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  feeFilter === 'all'
                    ? 'bg-blue-950 text-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Students ({classStrength})
              </button>
              <button
                onClick={() => setFeeFilter('defaulters')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  feeFilter === 'defaulters'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Defaulters Only ({classDefaultersCount})
              </button>
              <button
                onClick={() => setFeeFilter('cleared')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  feeFilter === 'cleared'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cleared ({classStrength - classDefaultersCount})
              </button>
            </div>

            <button
              onClick={() => setIsFeeDuesReportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <Printer className="w-4 h-4 text-blue-900" />
              <span>Class Dues Report PDF</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Father Name</th>
                    <th className="py-3 px-4">Parent Mobile</th>
                    <th className="py-3 px-4">Outstanding Due Balance</th>
                    <th className="py-3 px-4 text-right">Class Teacher Due Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents
                    .filter((st) => {
                      const due = getStudentDueAmount(st.id);
                      if (feeFilter === 'defaulters') return due > 0;
                      if (feeFilter === 'cleared') return due === 0;
                      return true;
                    })
                    .map((st) => {
                      const dueAmt = getStudentDueAmount(st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-black text-blue-950">
                            #{st.rollNo}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {st.fullName}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {st.fatherName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {st.guardianPhone}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            {dueAmt > 0 ? (
                              <span className="text-amber-800 font-black text-sm bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300">
                                ₹{dueAmt.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                Nil (Paid) ✓
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {dueAmt > 0 ? (
                              <button
                                onClick={() => handleSendFeeDueWhatsApp(st, dueAmt)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition"
                              >
                                <Send className="w-3.5 h-3.5 text-white" />
                                <span>WhatsApp Reminder</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No dues</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXAM MARKS & REPORT CARDS */}
      {/* ========================================================================= */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Select Exam Term (Standard 3-Terms)
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-950 focus:outline-blue-900"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} (Max {ex.totalMarks || 350} Marks)
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-500 mt-4 sm:mt-5 font-medium">
                Standard 7 Subjects: हिंदी, Eng, Math, Soc, Sci, Comp, Art (Max 50 Each)
              </div>
            </div>

            <div className="flex items-center gap-2">
              {marksSavedToast && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in flex items-center gap-1">
                  <Check className="w-4 h-4" /> Exam Marks Saved!
                </span>
              )}

              <button
                onClick={handleSaveAllMarks}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-black text-xs shadow-md transition active:scale-95"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save All Marks</span>
              </button>
            </div>
          </div>

          {/* Marks Entry Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                    <th className="py-3 px-3">Roll</th>
                    <th className="py-3 px-3">Student Name</th>
                    {classSubjects.map((sub) => (
                      <th key={sub.id} className="py-3 px-2 text-center">
                        <div>{sub.name}</div>
                        <div className="text-[9px] text-slate-400 font-normal">Max 50</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center">Total (350)</th>
                    <th className="py-3 px-3 text-center">% & Grade</th>
                    <th className="py-3 px-3 text-right">Official Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    let totalObtained = 0;
                    classSubjects.forEach((sub) => {
                      totalObtained += examMarksDraft[st.id]?.[sub.id] ?? 35;
                    });
                    const maxPossible = classSubjects.length * 50;
                    const percent = Math.round((totalObtained / maxPossible) * 100);
                    let grade = 'B1';
                    if (percent >= 91) grade = 'A1';
                    else if (percent >= 81) grade = 'A2';
                    else if (percent >= 71) grade = 'B1';
                    else if (percent >= 61) grade = 'B2';
                    else if (percent >= 51) grade = 'C1';
                    else if (percent >= 41) grade = 'C2';
                    else if (percent >= 33) grade = 'D';
                    else grade = 'E';

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-black text-blue-950">
                          #{st.rollNo}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[120px]">
                          {st.fullName}
                        </td>
                        {classSubjects.map((sub) => {
                          const val = examMarksDraft[st.id]?.[sub.id] ?? 35;
                          return (
                            <td key={sub.id} className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={50}
                                value={val}
                                onChange={(e) => handleMarkChange(st.id, sub.id, Number(e.target.value))}
                                className="w-12 text-center py-1 bg-slate-50 border border-slate-300 rounded font-bold text-blue-950 focus:outline-blue-900 focus:bg-white text-xs"
                              />
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center font-black text-blue-950 font-mono">
                          {totalObtained} / {maxPossible}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-extrabold text-slate-900">{percent}%</span>{' '}
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                              grade.startsWith('A')
                                ? 'bg-emerald-100 text-emerald-900'
                                : grade.startsWith('B')
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedStudentForConsolidated(st)}
                              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-[10px] border border-indigo-200 transition"
                            >
                              3-Term Annual Card
                            </button>
                            <button
                              onClick={() => setSelectedStudentForMarksheet(st)}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-[10px] border border-blue-200 transition"
                            >
                              Term Marksheet
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CLASS HOMEWORK */}
      {/* ========================================================================= */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Class Daily Homework & Diary</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Assign daily exercises and topics for {selectedClass.name} students.
              </p>
            </div>

            <button
              onClick={() => setIsHwModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Assign New Homework</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {homeworks
              .filter((hw) => hw.classId === selectedClass.id)
              .map((hw) => (
                <div key={hw.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-950 px-2 py-0.5 rounded">
                        {hw.subject}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-1">{hw.title}</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {hw.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Teacher: {hw.teacherName}</span>
                    <button
                      onClick={() => deleteHomework(hw.id)}
                      className="text-red-600 hover:underline font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTICES */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Class Notices & Circulars</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Publish important announcements for {selectedClass.name} parents and students.
              </p>
            </div>

            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Create Class Notice</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices
              .filter((n) => n.targetClassId === selectedClass.id || n.targetAudience === 'All')
              .map((n) => (
                <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {n.category}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-1">{n.title}</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(n.publishDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {n.content}
                  </p>

                  <div className="text-[11px] text-slate-400 pt-1">
                    Posted By: <strong className="text-slate-600">{n.postedBy}</strong>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: ADD HOMEWORK */}
      {/* ========================================================================= */}
      {isHwModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Assign Homework for {selectedClass.name}</h3>
              <button onClick={() => setIsHwModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddHomeworkSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  value={hwFormData.subject}
                  onChange={(e) => setHwFormData({ ...hwFormData, subject: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold"
                >
                  {classSubjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Homework Title / Chapter *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Exercise 4.2 Questions 1-8"
                  value={hwFormData.title}
                  onChange={(e) => setHwFormData({ ...hwFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Complete in homework notebook and submit tomorrow..."
                  value={hwFormData.description}
                  onChange={(e) => setHwFormData({ ...hwFormData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Submission Due Date *</label>
                <input
                  type="date"
                  required
                  value={hwFormData.dueDate}
                  onChange={(e) => setHwFormData({ ...hwFormData, dueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHwModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-950 text-white rounded-xl font-extrabold shadow-md"
                >
                  Assign Homework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: ADD NOTICE */}
      {/* ========================================================================= */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Create Class Notice ({selectedClass.name})</h3>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNoticeSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit Test 2 Schedule & PTM Notice"
                  value={noticeFormData.title}
                  onChange={(e) => setNoticeFormData({ ...noticeFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Dear Parents, please be informed that..."
                  value={noticeFormData.content}
                  onChange={(e) => setNoticeFormData({ ...noticeFormData, content: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-950 text-white rounded-xl font-extrabold shadow-md"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: TEACHER PASSWORD & SECURITY (CREATE NEW PASSWORD) */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-blue-900 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Teacher Self-Service Password Management</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Create New Teacher Password
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                सभी शिक्षक अपना नया पासवर्ड स्वयं बना सकते हैं। यदि आप वर्तमान पासवर्ड जानते हैं, तो नीचे तुरंत नया पासवर्ड दर्ज करें।
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15 text-xs space-y-1.5 min-w-[240px]">
              <div className="text-amber-300 font-bold uppercase text-[10px]">Your Credentials Profile</div>
              <div className="font-extrabold text-white text-sm">{activeTeacher?.name || currentUser.name}</div>
              <div className="text-slate-300 font-mono">Emp ID: {activeTeacher?.empId || currentUser.username}</div>
              <div className="text-slate-300">Class: {selectedClass?.name || 'Class Teacher'}</div>
            </div>
          </div>

          {/* Form & Policy Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Create Password Box */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                    <KeyRound className="w-5 h-5 text-blue-950" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Create / Change Password</h3>
                    <p className="text-xs text-slate-500">कम से कम 4 अक्षरों का सुरक्षित पासवर्ड बनाएं</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoGeneratePassword}
                  className="text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Auto-Generate</span>
                </button>
              </div>

              {securityError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <form onSubmit={handleSelfPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Current Password (वर्तमान पासवर्ड) *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentSec ? 'text' : 'password'}
                      required
                      value={currentPasswordSec}
                      onChange={(e) => setCurrentPasswordSec(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentSec(!showCurrentSec)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentSec ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. New Password (नया पासवर्ड) *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewSec ? 'text' : 'password'}
                      required
                      value={newPasswordSec}
                      onChange={(e) => setNewPasswordSec(e.target.value)}
                      placeholder="Enter new password (e.g. Teach@4821)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-950 focus:bg-white focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewSec(!showNewSec)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewSec ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Confirm New Password (नया पासवर्ड दोबारा दर्ज करें) *
                  </label>
                  <input
                    type={showNewSec ? 'text' : 'password'}
                    required
                    value={confirmPasswordSec}
                    onChange={(e) => setConfirmPasswordSec(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-950 focus:bg-white focus:border-blue-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-black text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer pt-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Update & Save My Password (नया पासवर्ड सुरक्षित करें)</span>
                </button>
              </form>
            </div>

            {/* STRICT ADMIN RESET ONLY POLICY CALLOUT */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-amber-50/90 border-2 border-amber-400/80 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Lock className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                      Security Policy
                    </span>
                    <h3 className="text-base font-black text-amber-950">
                      Reset Password: ONLY ADMIN
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-amber-900 leading-relaxed">
                  विद्यालय सुरक्षा प्रोटोकॉल के अनुसार:
                  <br />
                  1. शिक्षक अपना नया पासवर्ड <b>स्वयं बना सकते हैं</b>।
                  <br />
                  2. लेकिन यदि कोई शिक्षक पासवर्ड <b>भूल जाते हैं</b>, तो पासवर्ड रीसेट करने का अधिकार <b>केवल स्कूल एडमिन {settings.adminName || 'Anil Singh'}</b> के पास है।
                </p>

                <div className="bg-white rounded-2xl p-4 border border-amber-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">Official Admin Authority:</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-blue-950 text-sm">
                        Admin {settings.adminName || 'Anil Singh'}
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Mob: {settings.adminPhone || settings.phone || '9452305199'}
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Authorized
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-amber-950">
                    Need Password Reset from Admin?
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestAdminResetWhatsApp}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Admin for Reset</span>
                  </button>

                  <a
                    href={`tel:${settings.adminPhone || settings.phone || '9452305199'}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-bold text-xs transition cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Admin Directly ({settings.adminPhone || settings.phone || '9452305199'})</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPORT CARD MODALS */}
      {/* ========================================================================= */}
      {selectedStudentForMarksheet && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setSelectedStudentForMarksheet(null)}
          title={`Term Marksheet - ${selectedStudentForMarksheet.fullName}`}
          fileName={`Marksheet-${selectedStudentForMarksheet.fullName.replace(/\s+/g, '_')}.pdf`}
        >
          <MarksheetReportCardPdf
            student={selectedStudentForMarksheet}
            exam={selectedExam}
            targetClass={selectedClass}
            examMark={examMarks.find(
              (m) =>
                m.studentId === selectedStudentForMarksheet.id &&
                (!selectedExam || m.examId === selectedExam.id)
            )}
          />
        </PrintPreviewModal>
      )}

      {selectedStudentForConsolidated && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setSelectedStudentForConsolidated(null)}
          title={`Consolidated 3-Term Annual Report Card - ${selectedStudentForConsolidated.fullName}`}
          fileName={`AnnualReportCard-${selectedStudentForConsolidated.fullName.replace(/\s+/g, '_')}.pdf`}
        >
          <Consolidated3TermReportCardPdf
            student={selectedStudentForConsolidated}
            targetClass={selectedClass}
          />
        </PrintPreviewModal>
      )}

      {selectedStudentForProfile && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setSelectedStudentForProfile(null)}
          title={`Student Dossier - ${selectedStudentForProfile.fullName}`}
          fileName={`StudentDossier-${selectedStudentForProfile.fullName.replace(/\s+/g, '_')}.pdf`}
        >
          <StudentProfilePdf
            student={selectedStudentForProfile}
            classInfo={selectedClass}
          />
        </PrintPreviewModal>
      )}

      {isClassGazetteOpen && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setIsClassGazetteOpen(false)}
          title={`Class Result Gazette - ${selectedClass.name}`}
          fileName={`ResultGazette-${selectedClass.name.replace(/\s+/g, '_')}.pdf`}
          orientation="landscape"
        >
          <ExamResultLedgerPdf
            exam={selectedExam}
            targetClass={selectedClass}
          />
        </PrintPreviewModal>
      )}

      {isFeeDuesReportOpen && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setIsFeeDuesReportOpen(false)}
          title={`Class Fee Dues Register - ${selectedClass.name}`}
          fileName={`FeeDues-${selectedClass.name.replace(/\s+/g, '_')}.pdf`}
        >
          <FeeDuesReportPdf
            selectedClassId={selectedClass.id}
          />
        </PrintPreviewModal>
      )}

      {isAttendanceReportOpen && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setIsAttendanceReportOpen(false)}
          title={`Class Monthly Attendance Sheet - ${selectedClass.name}`}
          fileName={`AttendanceSheet-${selectedClass.name.replace(/\s+/g, '_')}.pdf`}
          orientation="landscape"
        >
          <StudentMonthlyAttendanceReportPdf
            selectedClassId={selectedClass.id}
            month={new Date().toLocaleString('en-US', { month: 'long' })}
            year={2026}
          />
        </PrintPreviewModal>
      )}

      {/* WhatsApp Attendance Modal */}
      {isAttendanceWhatsAppModalOpen && (
        <WhatsAppAttendanceModal
          isOpen={true}
          onClose={() => {
            setIsAttendanceWhatsAppModalOpen(false);
            setWhatsAppTargetStudent(null);
          }}
          initialMode="student"
          initialStudent={whatsAppTargetStudent}
          date={attendanceDate}
          classId={selectedClass?.id}
          currentAttendanceMap={attendanceDraft}
        />
      )}
      {/* Teacher Password Self-Service Modal */}
      {isPasswordModalOpen && activeTeacher && (
        <TeacherPasswordModal
          teacher={activeTeacher}
          isOpen={true}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}
    </div>
  );
};
