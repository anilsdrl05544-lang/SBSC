import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Teacher, AttendanceRecord, AttendanceStatus } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Phone,
  Calendar,
  AlertTriangle,
  Users,
  User,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  Edit3,
  Share2,
  Smartphone,
  Laptop,
  ListOrdered,
  CheckCheck,
  Zap,
  Coins,
} from 'lucide-react';
import {
  cleanPhoneNumber,
  generateWhatsAppUrl,
  generateWhatsAppWebUrl,
  generateWhatsAppAppUrl,
  generateWhatsAppShortUrl,
  WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES,
  WHATSAPP_STAFF_ATTENDANCE_TEMPLATES,
  formatStudentAttendanceMessage,
  formatStaffAttendanceMessage,
  formatFriendlyDate,
  StudentAttendanceAlertParams,
  StaffAttendanceAlertParams,
  WhatsAppTemplate,
  dispatchSafeMessage,
  generateSmsUrl,
  safeEncodeURIComponent,
} from '../../services/whatsappService';

export interface WhatsAppAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'student' | 'teacher';
  initialStudent?: Student | null;
  initialTeacher?: Teacher | null;
  date?: string;
  classId?: string;
  section?: string;
  currentAttendanceMap?: Map<string, AttendanceRecord> | Record<string, AttendanceStatus>;
  selectedCandidateIds?: string[];
}

export const WhatsAppAttendanceModal: React.FC<WhatsAppAttendanceModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'student',
  initialStudent,
  initialTeacher,
  date,
  classId,
  section,
  currentAttendanceMap,
  selectedCandidateIds,
}) => {
  const { students, teachers, classes, attendance, settings, updateTeacher } = useSchool();

  const selectedDate = date || new Date().toISOString().slice(0, 10);
  const [activeMode, setActiveMode] = useState<'student' | 'teacher'>(() => {
    if (initialTeacher) return 'teacher';
    if (initialStudent) return 'student';
    return initialMode || 'student';
  });
  const [statusFilter, setStatusFilter] = useState<'Absent' | 'Leave' | 'All'>('Absent');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected candidate in list
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialTeacher) return initialTeacher.id;
    if (initialStudent) return initialStudent.id;
    return '';
  });

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  
  // Isolated phone overrides per candidate ID so one candidate's phone never leaks to another
  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});

  // Helper to reliably retrieve phone for any candidate
  const getCandidatePhone = useCallback(
    (item: Student | Teacher | null | undefined): string => {
      if (!item) return '';
      const override = phoneOverrides[item.id];
      if (override !== undefined && override.trim() !== '') {
        return override.trim();
      }
      if ('fullName' in item) {
        return (item.guardianPhone || item.emergencyContact || '').trim();
      }
      return (item.phone || '').trim();
    },
    [phoneOverrides]
  );

  // Track dispatched IDs
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  // View mode: single chat preview or batch table of all candidates
  const [viewMode, setViewMode] = useState<'single' | 'batch_table'>('single');

  // Copy & feedback states
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [hasCopiedAllPhones, setHasCopiedAllPhones] = useState(false);
  const [hasCopiedAllMessages, setHasCopiedAllMessages] = useState(false);
  const [lastDispatchedInfo, setLastDispatchedInfo] = useState<{
    name: string;
    phone: string;
    time: string;
  } | null>(null);
  const [popupBlockedNotice, setPopupBlockedNotice] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastNotice({ message, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Sync mode and initial item when opening modal
  useEffect(() => {
    if (!isOpen) return;

    // Reset editing states on modal open or target switch
    setPopupBlockedNotice(null);
    setIsEditingCustom(false);
    setCustomMessageText('');
    setSearchTerm('');

    if (initialTeacher) {
      setActiveMode('teacher');
      setSelectedId(initialTeacher.id);
      const rec = effectiveAttendanceMap.get(initialTeacher.id);
      const st = rec?.status || 'Absent';
      if (st === 'Leave') {
        setStatusFilter('Leave');
        setSelectedTemplateId('staff_leave_approved');
      } else if (st === 'Half-Day' || st === 'Late') {
        setStatusFilter('All');
        setSelectedTemplateId('staff_half_day');
      } else if (st === 'Present') {
        setStatusFilter('All');
        setSelectedTemplateId('staff_duty_summary');
      } else {
        setStatusFilter('Absent');
        setSelectedTemplateId('staff_absent_standard');
      }
    } else if (initialStudent) {
      setActiveMode('student');
      setSelectedId(initialStudent.id);
      const rec = effectiveAttendanceMap.get(initialStudent.id);
      const st = rec?.status || 'Absent';
      if (st === 'Leave') {
        setStatusFilter('Leave');
        setSelectedTemplateId('student_leave_ack');
      } else {
        setStatusFilter('Absent');
        setSelectedTemplateId('student_absent_detailed');
      }
    } else {
      const mode = initialMode || 'student';
      setActiveMode(mode);
      if (mode === 'teacher') {
        const hasAbsent = teachers.some((t) => effectiveAttendanceMap.get(t.id)?.status === 'Absent');
        setStatusFilter(hasAbsent ? 'Absent' : 'All');
        setSelectedTemplateId('staff_absent_standard');
      } else {
        setStatusFilter('Absent');
        setSelectedTemplateId('student_absent_detailed');
      }
    }
  }, [isOpen, initialStudent, initialTeacher, initialMode]);

  // Available templates based on mode
  const templates: WhatsAppTemplate[] = useMemo(() => {
    return activeMode === 'student'
      ? WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES
      : WHATSAPP_STAFF_ATTENDANCE_TEMPLATES;
  }, [activeMode]);

  // Merge context attendance with current draft attendance map from caller
  const effectiveAttendanceMap = useMemo(() => {
    const map = new Map<string, { status: AttendanceStatus; remarks?: string }>();

    // 1. Saved context records for this date
    attendance
      .filter((a) => a.date === selectedDate)
      .forEach((r) => {
        map.set(r.targetId, { status: r.status, remarks: r.remarks });
      });

    // 2. Overlay caller's current local state or draft (e.g. from ClassTeacherPortal or AttendanceManagement)
    if (currentAttendanceMap) {
      if (currentAttendanceMap instanceof Map) {
        currentAttendanceMap.forEach((val, key) => {
          map.set(key, { status: val.status, remarks: val.remarks });
        });
      } else if (typeof currentAttendanceMap === 'object') {
        Object.entries(currentAttendanceMap).forEach(([id, status]) => {
          map.set(id, { status: status as AttendanceStatus });
        });
      }
    }

    // 3. If an initialStudent was specifically passed, ensure they are marked Absent by default if not recorded
    if (initialStudent && !map.has(initialStudent.id)) {
      map.set(initialStudent.id, { status: 'Absent' });
    }
    if (initialTeacher && !map.has(initialTeacher.id)) {
      map.set(initialTeacher.id, { status: 'Absent' });
    }

    return map;
  }, [attendance, selectedDate, currentAttendanceMap, initialStudent, initialTeacher]);

  // Candidate roster
  const candidateList = useMemo(() => {
    if (activeMode === 'student') {
      return students.filter((s) => {
        // If initialStudent is this student, always include it so the user never sees empty state!
        if (initialStudent && s.id === initialStudent.id) {
          return true;
        }

        if (selectedCandidateIds && selectedCandidateIds.length > 0) {
          if (!selectedCandidateIds.includes(s.id)) {
            return false;
          }
        }

        if (classId && s.classId !== classId) return false;
        if (section && s.section !== section) return false;

        const rec = effectiveAttendanceMap.get(s.id);
        const status: AttendanceStatus = rec?.status || 'Present';

        if (statusFilter === 'Absent' && status !== 'Absent') return false;
        if (statusFilter === 'Leave' && status !== 'Leave') return false;

        if (searchTerm) {
          const sTerm = searchTerm.toLowerCase();
          const matchesName = (s.fullName || '').toLowerCase().includes(sTerm);
          const matchesRoll = String(s.rollNo || '').includes(searchTerm);
          const matchesAdm = (s.admissionNo || '').toLowerCase().includes(sTerm);
          const phoneVal = getCandidatePhone(s);
          const matchesPhone = phoneVal.includes(searchTerm);
          const matchesFather = (s.fatherName || '').toLowerCase().includes(sTerm);
          if (!matchesName && !matchesRoll && !matchesAdm && !matchesPhone && !matchesFather) {
            return false;
          }
        }
        return true;
      });
    } else {
      return teachers.filter((t) => {
        if (initialTeacher && t.id === initialTeacher.id) {
          return true;
        }

        if (selectedCandidateIds && selectedCandidateIds.length > 0) {
          if (!selectedCandidateIds.includes(t.id)) {
            return false;
          }
        }

        const rec = effectiveAttendanceMap.get(t.id);
        const status: AttendanceStatus = rec?.status || 'Present';

        if (statusFilter === 'Absent' && status !== 'Absent') return false;
        if (statusFilter === 'Leave' && status !== 'Leave') return false;

        if (searchTerm) {
          const sTerm = searchTerm.toLowerCase();
          const matchesName = (t.name || '').toLowerCase().includes(sTerm);
          const matchesEmp = (t.empId || '').toLowerCase().includes(sTerm);
          const phoneVal = getCandidatePhone(t);
          const matchesPhone = phoneVal.includes(searchTerm);
          const matchesDesig = (t.designation || '').toLowerCase().includes(sTerm);
          if (!matchesName && !matchesEmp && !matchesPhone && !matchesDesig) {
            return false;
          }
        }
        return true;
      });
    }
  }, [
    activeMode,
    students,
    teachers,
    classId,
    section,
    effectiveAttendanceMap,
    statusFilter,
    searchTerm,
    initialStudent,
    initialTeacher,
    selectedCandidateIds,
    getCandidatePhone,
  ]);

  // Ensure an item is selected without continuously overriding manual selection
  useEffect(() => {
    if (!isOpen) return;

    if (candidateList.length > 0) {
      if (!selectedId || !candidateList.some((c) => c.id === selectedId)) {
        setSelectedId(candidateList[0].id);
      }
    }
  }, [candidateList, selectedId, isOpen]);

  // Find currently selected candidate
  const currentStudent =
    activeMode === 'student'
      ? students.find((s) => s.id === selectedId) || (initialStudent?.id === selectedId ? initialStudent : null)
      : null;
  const currentTeacher =
    activeMode === 'teacher'
      ? teachers.find((t) => t.id === selectedId) || (initialTeacher?.id === selectedId ? initialTeacher : null)
      : null;
  const currentCandidate = currentStudent || currentTeacher;
  const currentClass = currentStudent ? classes.find((c) => c.id === currentStudent.classId) : null;

  const currentAttendanceRec = selectedId ? effectiveAttendanceMap.get(selectedId) : undefined;
  const effectiveStatus = currentAttendanceRec?.status || 'Absent';
  const effectiveRemarks = currentAttendanceRec?.remarks || '';

  // Current person's verified individual phone
  const currentCandidatePhone = getCandidatePhone(currentCandidate);
  const cleanPhone = cleanPhoneNumber(currentCandidatePhone);

  // Active template
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Helper to generate customized message for ANY candidate
  const getMessageForCandidate = (item: Student | Teacher) => {
    const isTeacher = !('fullName' in item);
    let templateToUse = customMessageText;
    if (!templateToUse) {
      if (isTeacher) {
        const isStaffTemplate = WHATSAPP_STAFF_ATTENDANCE_TEMPLATES.some((t) => t.id === selectedTemplateId);
        templateToUse = isStaffTemplate
          ? activeTemplate?.templateText || WHATSAPP_STAFF_ATTENDANCE_TEMPLATES[0].templateText
          : WHATSAPP_STAFF_ATTENDANCE_TEMPLATES[0].templateText;
      } else {
        const isStudentTemplate = WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES.some((t) => t.id === selectedTemplateId);
        templateToUse = isStudentTemplate
          ? activeTemplate?.templateText || WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES[0].templateText
          : WHATSAPP_STUDENT_ATTENDANCE_TEMPLATES[0].templateText;
      }
    }

    const rec = effectiveAttendanceMap.get(item.id);
    const itemStatus = rec?.status || 'Absent';
    const itemRemarks = rec?.remarks || '';
    const itemPhone = getCandidatePhone(item);

    if ('fullName' in item) {
      const cls = classes.find((c) => c.id === item.classId);

      // Absent fine calculations (Strictly 1 absent = ₹5 per day, only for Absent students)
      const isAbsentToday = itemStatus === 'Absent';
      const studentRecords = attendance.filter((a) => a.targetId === item.id && a.type === 'student');
      const [yearStr, monthStr] = selectedDate.split('-');
      const monthPrefix = `${yearStr}-${monthStr}`;
      const pastMonthAbsents = studentRecords.filter(
        (a) => a.date.startsWith(monthPrefix) && a.date !== selectedDate && a.status === 'Absent'
      ).length;

      const monthAbsentDays = isAbsentToday ? pastMonthAbsents + 1 : pastMonthAbsents;
      const finePerDay = settings.absentFinePerDay ?? 5;
      const todayAbsentFine = isAbsentToday ? finePerDay : 0;
      const totalAbsentFine = monthAbsentDays * finePerDay;

      const params: StudentAttendanceAlertParams = {
        studentName: item.fullName,
        admissionNo: item.admissionNo || 'N/A',
        rollNo: item.rollNo || 'N/A',
        className: cls?.name || 'Class',
        section: item.section || 'A',
        fatherName: item.fatherName || 'Parent',
        guardianPhone: itemPhone,
        status: itemStatus,
        date: selectedDate,
        remarks: itemRemarks,
        schoolName: settings.schoolName || 'SBSC Public School',
        schoolPhone: settings.phone || '+91 94150 00000',
        classTeacherName: 'Class Teacher',
        absentFinePerDay: finePerDay,
        todayAbsentFine: todayAbsentFine,
        monthAbsentDays: monthAbsentDays,
        totalAbsentFine: totalAbsentFine,
      };
      return formatStudentAttendanceMessage(templateToUse, params);
    } else {
      const params: StaffAttendanceAlertParams = {
        staffName: item.name,
        empId: item.empId || 'N/A',
        designation: item.designation || 'Faculty',
        phone: itemPhone,
        status: itemStatus,
        date: selectedDate,
        remarks: itemRemarks,
        schoolName: settings.schoolName || 'SBSC Public School',
        schoolPhone: settings.phone || '+91 94150 00000',
      };
      return formatStaffAttendanceMessage(templateToUse, params);
    }
  };

  // Generated message for selected candidate
  const generatedMessage = useMemo(() => {
    if (currentStudent) {
      return getMessageForCandidate(currentStudent);
    }
    if (currentTeacher) {
      return getMessageForCandidate(currentTeacher);
    }
    return activeTemplate?.templateText || '';
  }, [
    customMessageText,
    activeTemplate,
    selectedTemplateId,
    activeMode,
    currentStudent,
    currentTeacher,
    currentClass,
    effectiveStatus,
    effectiveRemarks,
    selectedDate,
    currentCandidatePhone,
    settings,
    attendance,
  ]);

  // URLs for direct WhatsApp interactions
  const whatsAppUrl = generateWhatsAppUrl(cleanPhone, generatedMessage);
  const whatsAppWebUrl = generateWhatsAppWebUrl(cleanPhone, generatedMessage);
  const whatsAppAppUrl = generateWhatsAppAppUrl(cleanPhone, generatedMessage);
  const whatsAppShortUrl = generateWhatsAppShortUrl(cleanPhone, generatedMessage);

  const handleSelectCandidate = (item: Student | Teacher) => {
    setSelectedId(item.id);
    setPopupBlockedNotice(null);

    // If not editing a custom message, adapt default template to status
    if (!isEditingCustom) {
      const rec = effectiveAttendanceMap.get(item.id);
      const st = rec?.status || 'Absent';
      if ('fullName' in item) {
        if (st === 'Leave') {
          setSelectedTemplateId('student_leave_ack');
        } else if (selectedTemplateId === 'student_leave_ack') {
          setSelectedTemplateId('student_absent_detailed');
        }
      } else {
        if (st === 'Leave') {
          setSelectedTemplateId('staff_leave_approved');
        } else if (st === 'Half-Day' || st === 'Late') {
          setSelectedTemplateId('staff_half_day');
        } else if (st === 'Present') {
          setSelectedTemplateId('staff_duty_summary');
        } else {
          if (
            selectedTemplateId === 'staff_leave_approved' ||
            selectedTemplateId === 'staff_leave_hindi' ||
            selectedTemplateId === 'staff_half_day' ||
            selectedTemplateId === 'staff_duty_summary'
          ) {
            setSelectedTemplateId('staff_absent_standard');
          }
        }
      }
    }
  };

  const handleMarkDispatchedAndNext = (candidateId?: string, candidateName?: string, phoneNum?: string) => {
    const targetId = candidateId || selectedId;
    if (targetId) {
      setDispatchedIds((prev) => new Set([...prev, targetId]));
    }
    const item = candidateList.find((c) => c.id === targetId) || currentCandidate;
    const name =
      candidateName ||
      (item ? ('fullName' in item ? item.fullName : item.name) : 'Staff/Student');
    const p = phoneNum || cleanPhone;
    setLastDispatchedInfo({
      name,
      phone: p,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Advance to next undispatched candidate in queue
    const currentIndex = candidateList.findIndex((c) => c.id === targetId);
    const nextUndispatched = candidateList.find((c, idx) => idx > currentIndex && !dispatchedIds.has(c.id));
    if (nextUndispatched) {
      setSelectedId(nextUndispatched.id);
    } else {
      const anyUndispatched = candidateList.find((c) => c.id !== targetId && !dispatchedIds.has(c.id));
      if (anyUndispatched) {
        setSelectedId(anyUndispatched.id);
      } else if (currentIndex >= 0 && currentIndex < candidateList.length - 1) {
        setSelectedId(candidateList[currentIndex + 1].id);
      }
    }
  };

  const handlePrevCandidate = () => {
    const currentIndex = candidateList.findIndex((c) => c.id === selectedId);
    if (currentIndex > 0) {
      setSelectedId(candidateList[currentIndex - 1].id);
    }
  };

  const handleNextCandidate = () => {
    const currentIndex = candidateList.findIndex((c) => c.id === selectedId);
    if (currentIndex >= 0 && currentIndex < candidateList.length - 1) {
      setSelectedId(candidateList[currentIndex + 1].id);
    }
  };

  const handleCopyAllPhoneNumbers = async () => {
    const validPhones = candidateList
      .map((c) => cleanPhoneNumber(getCandidatePhone(c)))
      .filter((p) => p && p.length >= 10);
    const uniquePhones = Array.from(new Set(validPhones));
    if (uniquePhones.length === 0) {
      showToast('No valid 10-digit mobile numbers found in current list.', 'error');
      return;
    }
    const text = uniquePhones.join(', ');
    try {
      await navigator.clipboard.writeText(text);
      setHasCopiedAllPhones(true);
      showToast(`✓ Copied ${uniquePhones.length} mobile numbers to clipboard!`, 'success');
      setTimeout(() => setHasCopiedAllPhones(false), 2500);
    } catch (err) {
      console.error(err);
      showToast('Failed to copy phone numbers to clipboard.', 'error');
    }
  };

  const handleCopyAllMessages = async () => {
    if (candidateList.length === 0) {
      showToast('No candidates found in current list.', 'error');
      return;
    }
    const formattedBlocks = candidateList.map((c, idx) => {
      const name = 'fullName' in c ? c.fullName : c.name;
      const rawP = getCandidatePhone(c);
      const isStudent = 'fullName' in c;
      const idLabel = isStudent ? `Roll #${c.rollNo}` : `${c.designation} (${c.empId})`;
      const msg = getMessageForCandidate(c);
      return `[${idx + 1}] ${name} [${idLabel}] - Mobile: ${rawP || 'Not recorded'}\n${msg}\n----------------------------------------`;
    });
    try {
      await navigator.clipboard.writeText(formattedBlocks.join('\n\n'));
      setHasCopiedAllMessages(true);
      showToast(`✓ Copied all messages for ${candidateList.length} candidates!`, 'success');
      setTimeout(() => setHasCopiedAllMessages(false), 2500);
    } catch (err) {
      console.error(err);
      showToast('Failed to copy messages to clipboard.', 'error');
    }
  };

  const handleSendWhatsAppProgrammatic = (targetPhone?: string, targetMsg?: string, candidate?: Student | Teacher) => {
    const item = candidate || currentCandidate;
    if (!item) return;
    const p = targetPhone || getCandidatePhone(item);
    const clean = cleanPhoneNumber(p);
    const name = 'fullName' in item ? item.fullName : item.name;
    if (!clean || clean.length < 10) {
      showToast(`Please enter a valid 10-digit mobile number for ${name}.`, 'error');
      return;
    }

    const msg = targetMsg || getMessageForCandidate(item);
    const url = generateWhatsAppUrl(clean, msg);

    // Try dispatching safely without navigating the current SPA window
    const result = dispatchSafeMessage(url, 'whatsapp', msg);

    if (result.popupBlocked) {
      setPopupBlockedNotice(url);
      showToast('Popup was blocked by browser. Click "Open WhatsApp Directly" button above.', 'info');
    } else {
      setPopupBlockedNotice(null);
      showToast(`✓ WhatsApp launched for ${name} (+${clean})!`, 'success');
    }

    handleMarkDispatchedAndNext(
      item.id,
      name,
      clean
    );
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppUrl);
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  if (!isOpen) return null;

  const totalCandidates = candidateList.length;
  const sentCount = candidateList.filter((c) => dispatchedIds.has(c.id)).length;
  const currentIndex = candidateList.findIndex((c) => c.id === selectedId);
  const formattedFriendlyDate = formatFriendlyDate(selectedDate);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  {activeMode === 'teacher' ? 'Faculty & Staff WhatsApp Dispatcher' : 'Direct WhatsApp Absent Dispatcher'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-400/30">
                  {formattedFriendlyDate}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {activeMode === 'teacher' ? 'Staff Attendance WhatsApp Intimation Hub' : 'Student Absent WhatsApp Notification Hub'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalCandidates > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dispatched: {sentCount} / {totalCandidates}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dispatch Notification Toast */}
        {lastDispatchedInfo && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{lastDispatchedInfo.name}</strong> marked as dispatched to <strong>+{lastDispatchedInfo.phone}</strong> at {lastDispatchedInfo.time}.
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold hidden sm:inline">
              Pre-filled in WhatsApp chat
            </span>
          </div>
        )}

        {/* App Status & Toast Banner */}
        {toastNotice && (
          <div
            className={`px-5 py-2.5 flex items-center justify-between gap-3 text-xs font-medium border-b shrink-0 animate-in fade-in ${
              toastNotice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toastNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastNotice.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : toastNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{toastNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastNotice(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Popup Blocked Fallback Notification Banner */}
        {popupBlockedNotice && (
          <div className="bg-amber-50 border-b-2 border-amber-400 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Browser Notice:</strong> Pop-up was blocked. Click the button to launch WhatsApp directly in a new tab:
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  window.open(popupBlockedNotice, '_blank', 'noopener,noreferrer');
                } catch {
                  // Fallback to safe navigation if window.open fails
                  dispatchSafeMessage(popupBlockedNotice, 'whatsapp');
                }
                setPopupBlockedNotice(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open WhatsApp Directly</span>
            </button>
          </div>
        )}

        {/* Main Split Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          {/* Left Column: Absent Students / Teachers Roster (5 cols) */}
          <div className="lg:col-span-5 border-r border-slate-200 bg-slate-50/50 flex flex-col min-h-0 overflow-hidden">
            {/* Top Toolbar: Mode & Status Filter */}
            <div className="p-3 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                {/* Target Audience Pill Toggle */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('student');
                      setSelectedId('');
                      setIsEditingCustom(false);
                      setCustomMessageText('');
                      setSelectedTemplateId('student_absent_detailed');
                      setStatusFilter('Absent');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeMode === 'student'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Students</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('teacher');
                      setSelectedId('');
                      setIsEditingCustom(false);
                      setCustomMessageText('');
                      setSelectedTemplateId('staff_absent_standard');
                      const hasAbsent = teachers.some((t) => effectiveAttendanceMap.get(t.id)?.status === 'Absent');
                      setStatusFilter(hasAbsent ? 'Absent' : 'All');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeMode === 'teacher'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Faculty & Staff</span>
                  </button>
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1">
                  {(['Absent', 'Leave', 'All'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                        statusFilter === st
                          ? st === 'Absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : st === 'Leave'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeMode === 'student'
                      ? 'Search student name, roll no, phone...'
                      : 'Search faculty name, emp ID, designation, phone...'
                  }
                  className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Queue Status Bar in Left Sidebar */}
            <div className="px-3 py-2 bg-emerald-50/70 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-950 shrink-0">
              <span className="font-bold">
                {sentCount} of {candidateList.length} Dispatched
              </span>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'batch_table' ? 'single' : 'batch_table')}
                className="text-[10px] font-extrabold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
              >
                <ListOrdered className="w-3 h-3" />
                <span>{viewMode === 'batch_table' ? 'Show Chat Mockup' : 'View All in Table'}</span>
              </button>
            </div>

            {/* Candidate List Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {candidateList.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-700 text-xs">No {statusFilter} records found</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    {activeMode === 'teacher'
                      ? 'Faculty members may be marked Present or you can switch filter to "All" to view and message any staff member.'
                      : 'Students might be marked Present or you can switch filter to "All" to view and message any student.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('All')}
                    className="mt-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Show All {activeMode === 'student' ? 'Students' : 'Faculty & Staff'}
                  </button>
                </div>
              ) : (
                candidateList.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isDispatched = dispatchedIds.has(item.id);
                  const rec = effectiveAttendanceMap.get(item.id);
                  const st: AttendanceStatus = rec?.status || 'Absent';
                  const isStudent = 'fullName' in item;

                  const displayName = isStudent ? item.fullName : item.name;
                  const displayId = isStudent ? `Roll #${item.rollNo}` : item.empId;
                  const rawPhone = getCandidatePhone(item);
                  const phoneNum = cleanPhoneNumber(rawPhone);
                  const displaySub = isStudent
                    ? `Adm: ${item.admissionNo} • ${item.fatherName}`
                    : `${item.designation} • ${rawPhone || 'No Phone'}`;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectCandidate(item)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200/80 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            st === 'Absent'
                              ? 'bg-rose-100 text-rose-700'
                              : st === 'Leave'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {displayName.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs truncate">
                              {displayName}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded shrink-0">
                              {displayId}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{displaySub}</div>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-mono mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{rawPhone ? rawPhone : <span className="text-rose-500 font-sans italic">No phone recorded</span>}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            st === 'Absent'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : st === 'Leave'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {st}
                        </span>

                        {isDispatched ? (
                          <div className="flex items-center gap-1">
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Sent ✓</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCandidate(item);
                                handleSendWhatsAppProgrammatic(phoneNum, getMessageForCandidate(item), item);
                              }}
                              className="text-[9px] font-bold text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                              title="Resend WhatsApp notice"
                            >
                              Resend
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCandidate(item);
                              handleSendWhatsAppProgrammatic(phoneNum, getMessageForCandidate(item), item);
                            }}
                            className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1 cursor-pointer transition active:scale-95"
                            title={`Directly send WhatsApp notice to ${displayName} (${rawPhone})`}
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Send</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Template Controls, Phone Override & Realistic Chat Mockup OR Batch Queue Table (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-3.5 bg-white overflow-y-auto">
            {viewMode === 'batch_table' ? (
              /* Batch Table View of All Absent Staff / Students */
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {/* Batch Table Header Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                        {activeMode === 'teacher' ? 'Staff Absent Batch Queue' : 'Student Absent Batch Queue'}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {candidateList.length} {activeMode === 'teacher' ? 'Faculty & Staff' : 'Students'}
                      </span>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        {sentCount} Dispatched • {candidateList.length - sentCount} Remaining
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mt-1">
                      Direct WhatsApp Dispatcher for Each {activeMode === 'teacher' ? 'Staff Member' : 'Student'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Each staff member has their specific mobile number linked. Click <strong>Send WhatsApp</strong> for each staff member to open their pre-filled absent advisory.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyAllPhoneNumbers}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Copy all candidate mobile numbers as comma-separated list"
                    >
                      {hasCopiedAllPhones ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                      <span>{hasCopiedAllPhones ? 'Copied!' : 'Copy Numbers'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAllMessages}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Copy all formatted absent messages"
                    >
                      {hasCopiedAllMessages ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-600" />}
                      <span>{hasCopiedAllMessages ? 'Copied!' : 'Copy Messages'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('single')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Single Chat Mockup</span>
                    </button>
                  </div>
                </div>

                {/* Batch Table Container */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3">{activeMode === 'teacher' ? 'Staff Member' : 'Student'}</th>
                          <th className="py-2.5 px-3">Mobile Number</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Dispatch</th>
                          <th className="py-2.5 px-3 text-right">WhatsApp Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {candidateList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No records found for current filter.
                            </td>
                          </tr>
                        ) : (
                          candidateList.map((item, idx) => {
                            const isDispatched = dispatchedIds.has(item.id);
                            const isStudent = 'fullName' in item;
                            const displayName = isStudent ? item.fullName : item.name;
                            const displayId = isStudent ? `Roll #${item.rollNo}` : item.empId;
                            const displaySub = isStudent
                              ? `Sec ${item.section} • Adm: ${item.admissionNo}`
                              : `${item.designation} (${item.department || 'Academics'})`;
                            const rawPhone = getCandidatePhone(item);
                            const phoneNum = cleanPhoneNumber(rawPhone);
                            const rec = effectiveAttendanceMap.get(item.id);
                            const st: AttendanceStatus = rec?.status || 'Absent';
                            const candidateMsg = getMessageForCandidate(item);
                            const candidateUrl =
                              phoneNum && phoneNum.length >= 10
                                ? generateWhatsAppUrl(phoneNum, candidateMsg)
                                : '#';

                            return (
                              <tr
                                key={item.id}
                                className={`hover:bg-slate-50 transition ${
                                  isDispatched ? 'bg-emerald-50/40' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                        isDispatched
                                          ? 'bg-emerald-600 text-white'
                                          : st === 'Absent'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {isDispatched ? (
                                        <Check className="w-3.5 h-3.5" />
                                      ) : (
                                        displayName.charAt(0)
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                        <span>{displayName}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          ({displayId})
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500">{displaySub}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative">
                                      <Phone className="w-3 h-3 text-emerald-600 absolute left-2 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        value={rawPhone}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setPhoneOverrides((prev) => ({
                                            ...prev,
                                            [item.id]: val,
                                          }));
                                        }}
                                        placeholder="+91..."
                                        className="w-32 sm:w-36 pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-400"
                                      />
                                    </div>
                                    {!isStudent &&
                                      phoneOverrides[item.id] &&
                                      phoneOverrides[item.id].trim() !== (item as Teacher).phone && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newPhone = phoneOverrides[item.id]?.trim();
                                            if (newPhone) {
                                              updateTeacher(item.id, { phone: newPhone });
                                              showToast(`✓ Updated phone number for ${displayName} to ${newPhone}.`, 'success');
                                            }
                                          }}
                                          className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold border border-emerald-300 cursor-pointer"
                                          title="Save permanently to teacher record"
                                        >
                                          Save
                                        </button>
                                      )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        st === 'Absent'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : st === 'Leave'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {st}
                                    </span>
                                    {isStudent && st === 'Absent' && (
                                      <span className="text-[10px] font-bold text-amber-800 flex items-center gap-0.5 mt-0.5">
                                        <Coins className="w-2.5 h-2.5 text-amber-600" />
                                        Fine: ₹{settings.absentFinePerDay ?? 5}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isDispatched ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                      <Check className="w-3 h-3" />
                                      <span>Sent ✓</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                      <Clock className="w-3 h-3 text-amber-500" />
                                      <span>Pending</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSendWhatsAppProgrammatic(phoneNum, candidateMsg, item)}
                                      className="px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                      title={`Send WhatsApp message to ${displayName} (${rawPhone})`}
                                    >
                                      <Send className="w-3 h-3 fill-current" />
                                      <span>{isDispatched ? 'Resend' : 'Send WhatsApp'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!phoneNum || phoneNum.length < 10) {
                                          showToast(`Please enter a valid 10-digit mobile number for ${displayName}.`, 'error');
                                          return;
                                        }
                                        const sUrl = generateSmsUrl(phoneNum, candidateMsg);
                                        dispatchSafeMessage(sUrl, 'sms', candidateMsg);
                                        showToast(`SMS app launched for ${displayName}`, 'info');
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-blue-600 transition cursor-pointer"
                                      title="SMS Fallback"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </button>

                                    <a
                                      href={`tel:+${phoneNum}`}
                                      className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-amber-700 transition cursor-pointer"
                                      title="Call Phone"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
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

                {/* Batch Table Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Showing all {candidateList.length} records. Click any row to send or switch to Single View.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('single')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Open Single Message Preview</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Candidate View with Sequential Stepper & WhatsApp Mockup */
              <>
                {/* Sequential Queue & Batch Actions Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-950">
                      {activeMode === 'teacher' ? 'Staff Absent Queue:' : 'Candidate Queue:'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {currentIndex >= 0 ? currentIndex + 1 : 1} of {candidateList.length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {sentCount} Dispatched • {candidateList.length - sentCount} Remaining
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevCandidate}
                      disabled={currentIndex <= 0}
                      className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="Previous staff member in queue"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextCandidate}
                      disabled={currentIndex >= candidateList.length - 1}
                      className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      title="Next staff member in queue"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('batch_table')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Switch to full table of all absent staff members"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>View All in Table ({candidateList.length})</span>
                    </button>
                  </div>
                </div>

                {/* Target Person Info Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {activeMode === 'teacher' ? 'Faculty Member Profile' : 'Recipient Profile'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-sm font-black text-slate-900">
                        {currentStudent?.fullName || currentTeacher?.name || 'Select a recipient'}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                        {activeMode === 'student'
                          ? `${currentClass?.name || 'Class'} - Sec ${currentStudent?.section || 'A'}`
                          : `${currentTeacher?.designation || 'Faculty'} (${currentTeacher?.empId || ''})`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          effectiveStatus === 'Absent'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : effectiveStatus === 'Leave'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {effectiveStatus}
                      </span>
                    </div>
                  </div>

                  {/* Phone number input / override with staff profile save option */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Phone className="w-3.5 h-3.5 text-emerald-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={currentCandidatePhone}
                        onChange={(e) => {
                          if (selectedId) {
                            const val = e.target.value;
                            setPhoneOverrides((prev) => ({
                              ...prev,
                              [selectedId]: val,
                            }));
                          }
                          setPopupBlockedNotice(null);
                        }}
                        placeholder={activeMode === 'teacher' ? 'Faculty Mobile (+91...)' : 'Parent Mobile (+91...)'}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-7.5 pr-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    {currentTeacher && phoneOverrides[currentTeacher.id] && phoneOverrides[currentTeacher.id].trim() !== currentTeacher.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPhone = phoneOverrides[currentTeacher.id]?.trim();
                          if (newPhone) {
                            updateTeacher(currentTeacher.id, { phone: newPhone });
                            showToast(`✓ Updated phone number in ${currentTeacher.name}'s official profile to ${newPhone}.`, 'success');
                          }
                        }}
                        className="shrink-0 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                        title="Save this number permanently to staff records"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Template Selector Pills */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-600">
                    Message Template Style:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setIsEditingCustom(false);
                          setCustomMessageText('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedTemplateId === tpl.id
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{tpl.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            selectedTemplateId === tpl.id
                              ? 'bg-emerald-950/40 text-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {tpl.tag}
                        </span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsEditingCustom(!isEditingCustom)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        isEditingCustom
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Customize Text</span>
                    </button>
                  </div>
                </div>

                {/* Custom Editable Textarea if enabled */}
                {isEditingCustom && (
                  <div className="space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold">Edit Message Template:</span>
                      <span className="text-[10px]">
                        {activeMode === 'teacher'
                          ? 'Variables: {staff_name}, {emp_id}, {designation}, {date}, {status}, {remarks}, {school_name}'
                          : 'Variables: {student_name}, {roll_no}, {admission_no}, {father_name}, {class_name}, {date}, {status}'}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={customMessageText || activeTemplate?.templateText}
                      onChange={(e) => setCustomMessageText(e.target.value)}
                      className="w-full bg-slate-50 border border-amber-300 rounded-xl p-2.5 text-xs text-slate-800 font-mono focus:outline-emerald-600"
                    />
                  </div>
                )}

                {/* Absent Fine Indicator (Strictly for Student Absent Messages) */}
                {activeMode === 'student' && effectiveStatus === 'Absent' && (
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4 text-amber-800" />
                      </div>
                      <div>
                        <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                          <span>अनुपस्थिति अर्थदंड (Absent Fine): ₹{settings.absentFinePerDay ?? 5}</span>
                          <span className="text-[10px] font-semibold text-amber-700">
                            (1 अनुपस्थिति = रु 5 प्रति दिन)
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800">
                          यह अर्थदंड केवल अनुपस्थित (Absent) छात्रों के WhatsApp / SMS संदेश में सम्मिलित है।
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-lg shrink-0 border border-amber-300">
                      ₹{settings.absentFinePerDay ?? 5} / दिन
                    </span>
                  </div>
                )}

                {activeMode === 'student' && effectiveStatus !== 'Absent' && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">
                      छात्र स्थिति: <strong className="text-slate-900 uppercase font-black">{effectiveStatus}</strong> — अनुपस्थिति अर्थदंड केवल Absent छात्रों के संदेश में ही प्रदर्शित होता है।
                    </span>
                  </div>
                )}

                {/* Realistic WhatsApp Chat Canvas Mockup */}
                <div className="rounded-2xl border border-emerald-800/30 overflow-hidden shadow-md flex flex-col bg-[#e5ddd5]">
                  {/* WhatsApp App Header */}
                  <div className="bg-[#075e54] text-white px-3.5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
                        {(currentStudent?.fullName || currentTeacher?.name || 'W').charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">
                          {currentStudent
                            ? `${currentStudent.fullName} (Parent)`
                            : currentTeacher
                            ? `${currentTeacher.name} (${currentTeacher.designation})`
                            : 'Recipient'}
                        </div>
                        <div className="text-[9px] text-emerald-200 font-mono">
                          {cleanPhone ? `+${cleanPhone}` : 'No mobile number'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">
                      WhatsApp Preview
                    </span>
                  </div>

                  {/* Chat Message Bubble */}
                  <div className="p-4 overflow-y-auto max-h-[220px] space-y-2">
                    <div className="bg-white rounded-2xl rounded-tl-none p-3.5 shadow-sm border border-slate-200/60 max-w-[95%] ml-1 text-slate-800 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedMessage}
                      <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-slate-400">
                        <span>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-emerald-600 font-black">✓✓</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Bottom Action Tray */}
                  <div className="bg-white px-3 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        {hasCopiedText ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>{hasCopiedText ? 'Copied Message!' : 'Copy Message'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        {hasCopiedLink ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>{hasCopiedLink ? 'Copied Link!' : 'Copy Direct Link'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {cleanPhone.length >= 10 ? (
                          <span className="text-emerald-700 font-bold">✓ Number verified (+{cleanPhone})</span>
                        ) : (
                          <span className="text-amber-700 font-bold">⚠️ Incomplete phone number</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Gateway Options Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    Alternative Gateways:
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!cleanPhone || cleanPhone.length < 10) {
                          showToast('Please enter a valid 10-digit mobile number.', 'error');
                          return;
                        }
                        const res = dispatchSafeMessage(whatsAppWebUrl, 'whatsapp', generatedMessage);
                        if (res.popupBlocked) {
                          setPopupBlockedNotice(whatsAppWebUrl);
                          showToast('Browser blocked popup. Click "Open WhatsApp Directly" button above.', 'info');
                        }
                        handleMarkDispatchedAndNext();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title="Open in WhatsApp Web browser tab"
                    >
                      <Laptop className="w-3.5 h-3.5 text-slate-600" />
                      <span>WhatsApp Web</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!cleanPhone || cleanPhone.length < 10) {
                          showToast('Please enter a valid 10-digit mobile number.', 'error');
                          return;
                        }
                        const res = dispatchSafeMessage(whatsAppAppUrl, 'whatsapp', generatedMessage);
                        if (res.popupBlocked) {
                          setPopupBlockedNotice(whatsAppAppUrl);
                          showToast('Browser blocked popup. Click "Open WhatsApp Directly" button above.', 'info');
                        }
                        handleMarkDispatchedAndNext();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title="Direct mobile app deep link"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Mobile App</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!cleanPhone || cleanPhone.length < 10) {
                          showToast('Please enter a valid 10-digit mobile number.', 'error');
                          return;
                        }
                        const sUrl = generateSmsUrl(cleanPhone, generatedMessage);
                        dispatchSafeMessage(sUrl, 'sms', generatedMessage);
                        showToast(`SMS app opened for +${cleanPhone}`, 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title="Standard SMS text backup"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>SMS Fallback</span>
                    </button>

                    <a
                      href={cleanPhone ? `tel:+${cleanPhone}` : undefined}
                      onClick={(e) => {
                        if (!cleanPhone) {
                          e.preventDefault();
                          showToast('No phone number recorded to call.', 'error');
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title={activeMode === 'teacher' ? 'Direct Phone Call to Faculty Member' : 'Direct Phone Call to Parent'}
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-700" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>

                {/* Main Primary Action Bar */}
                <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    {activeMode === 'teacher'
                      ? `Intimation notice for ${currentTeacher?.name || 'Staff'}. Advances queue automatically.`
                      : `Absent notice for ${currentStudent?.fullName || 'Student'}. Advances queue automatically.`}
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrevCandidate}
                      disabled={currentIndex <= 0}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                      title="Previous recipient"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Close
                    </button>

                    {/* Primary Safe Dispatch Button - Completely immune to SPA resets & launches direct app */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppProgrammatic()}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer border border-emerald-400/40"
                    >
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
                      <span>
                        ⚡ Direct WhatsApp ({currentStudent?.fullName || currentTeacher?.name || 'Staff'} • +{cleanPhone || '...'})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextCandidate}
                      disabled={currentIndex >= candidateList.length - 1}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                      title="Next recipient"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span>
            {settings.schoolName} Attendance ERP • Direct WhatsApp Web / Mobile API Integration
          </span>
          <span className="text-emerald-800 font-bold">
            Standard India Country Code (+91) applied automatically.
          </span>
        </div>
      </div>
    </div>
  );
};
