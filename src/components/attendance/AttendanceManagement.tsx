import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { AttendanceRecord, AttendanceStatus, Student, Teacher } from '../../types/school';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Users,
  Search,
  Filter,
  CheckCheck,
  UserX,
  Sun,
  Palmtree,
  Hourglass,
  Calendar,
  AlertCircle,
  MessageSquare,
  Check,
  X,
  Zap,
  Save,
  Download,
  ShieldCheck,
  Sparkles,
  FileText,
  UserCheck,
  TableProperties,
  Send,
  Phone,
  GraduationCap,
  Coins,
  IndianRupee,
  Shield,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { AttendanceReportPdf } from '../reports/templates/AttendanceReportPdf';
import { StaffAttendanceReportPdf } from '../reports/templates/StaffAttendanceReportPdf';
import { AllClassesDailyAttendanceReportPdf } from '../reports/templates/AllClassesDailyAttendanceReportPdf';
import { MonthlyAttendanceMatrixView } from './MonthlyAttendanceMatrixView';
import { HolidayManagement } from './HolidayManagement';
import { exportTableToCsv } from '../../services/pdfService';
import { WhatsAppAttendanceModal } from './WhatsAppAttendanceModal';
import { AttendanceFineModal } from './AttendanceFineModal';
import { AttendanceFineRegister } from './AttendanceFineRegister';

interface AttendanceManagementProps {
  onNavigate?: (module: string) => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onNavigate }) => {
  const {
    students,
    teachers,
    classes,
    attendance,
    markAttendance,
    bulkMarkAttendance,
    settings,
    currentUser,
    currentTeacher,
    assignedClassForCurrentTeacher,
    teacherRelativeClasses,
    getTeacherRelativeClasses,
    holidays,
    getHolidayForDate,
    markAttendanceFinePaid,
    waiveAttendanceFine,
    resetAttendanceFineToUnpaid,
  } = useSchool();

  const isTeacherUser = currentUser.role === 'teacher';

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'fines' | 'holidays'>('daily');
  const [attendanceMode, setAttendanceMode] = useState<'student' | 'teacher'>(
    isTeacherUser ? 'student' : 'teacher'
  );
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (assignedClassForCurrentTeacher) return assignedClassForCurrentTeacher.id;
    return classes[0]?.id || 'c-nursery';
  });
  const [selectedSection, setSelectedSection] = useState<string>('A');

  // Attendance Fine Modal State
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [fineModalStudent, setFineModalStudent] = useState<Student | null>(null);
  const [fineModalDate, setFineModalDate] = useState<string | undefined>(undefined);

  // Auto-sync class if teacher logs in or switches
  React.useEffect(() => {
    if (isTeacherUser && assignedClassForCurrentTeacher) {
      setSelectedClassId(assignedClassForCurrentTeacher.id);
      setAttendanceMode('student');
    }
  }, [isTeacherUser, assignedClassForCurrentTeacher?.id]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceStatus>('All');
  const [studentViewFormat, setStudentViewFormat] = useState<'simple' | 'detailed'>('simple');
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printDailyType, setPrintDailyType] = useState<'all_classes' | 'single_class'>('all_classes');
  const [printSimpleFormat, setPrintSimpleFormat] = useState(true);

  // WhatsApp Alert Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | null>(null);
  const [whatsAppTargetTeacher, setWhatsAppTargetTeacher] = useState<Teacher | null>(null);
  const [whatsAppTargetMode, setWhatsAppTargetMode] = useState<'student' | 'teacher'>('teacher');
  const [whatsAppCandidateFilterIds, setWhatsAppCandidateFilterIds] = useState<string[] | undefined>(undefined);

  // Save feedback state
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Multi-Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkInput, setRemarkInput] = useState('');

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const sortedClasses = React.useMemo(() => {
    return [...classes].sort((a, b) => {
      const getOrder = (c: typeof a) => {
        if (c.id === 'c-nursery') return 1;
        if (c.id === 'c-lkg') return 2;
        if (c.id === 'c-ukg') return 3;
        if (c.id === 'c-prt') return 25;
        return (c.gradeNumber ?? 0) + 10;
      };
      return getOrder(a) - getOrder(b);
    });
  }, [classes]);

  // Check if selected date is Holiday or Sunday
  const currentHoliday = getHolidayForDate(selectedDate);
  const isSelectedDateHoliday = !!currentHoliday;

  const isSelectedDateSunday = (() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      return d.getDay() === 0;
    } catch {
      return false;
    }
  })();

  // Filter students or teachers
  const studentList = students
    .filter((s) => {
      if (s.classId !== selectedClassId) return false;
      if (selectedSection && s.section !== selectedSection) return false;
      if (
        searchTerm &&
        !s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !s.rollNo.includes(searchTerm) &&
        !s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));

  const teacherList = teachers.filter((t) => {
    if (
      searchTerm &&
      !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.empId.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.designation.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.subjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  const activeRoster = attendanceMode === 'student' ? studentList : teacherList;

  // Lookup attendance map for current date & mode (indexed directly by targetId so no student records are missed)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach((r) => {
      if (r.date === selectedDate && r.type === attendanceMode) {
        map.set(r.targetId, r);
      }
    });
    return map;
  }, [attendance, selectedDate, attendanceMode]);

  // Filter roster by Status Filter tab
  const displayedList = activeRoster.filter((item) => {
    if (statusFilter === 'All') return true;
    const rec = attendanceMap.get(item.id);
    const effectiveStatus: AttendanceStatus = isSelectedDateHoliday
      ? 'Holiday'
      : isSelectedDateSunday
      ? 'Sunday'
      : (rec?.status || 'Present');
    return effectiveStatus === statusFilter;
  });

  // Handle single student/teacher status change
  const handleStatusChange = (
    targetId: string,
    status: AttendanceStatus,
    remarks?: string
  ) => {
    if (isSelectedDateHoliday || isSelectedDateSunday) return; // Locked on official holiday and Sunday
    const existingRec = attendanceMap.get(targetId);
    markAttendance({
      date: selectedDate,
      type: attendanceMode,
      targetId,
      classId: attendanceMode === 'student' ? selectedClassId : undefined,
      section: attendanceMode === 'student' ? selectedSection : undefined,
      status,
      remarks: remarks !== undefined ? remarks : existingRec?.remarks,
    });
  };

  // Handle explicit Save Attendance button
  const handleSaveAttendance = () => {
    setIsSaving(true);
    
    // Commit all items in current roster to ensure explicit state save
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = activeRoster.map((item) => {
      const existing = attendanceMap.get(item.id);
      const effectiveStatus: AttendanceStatus = isSelectedDateHoliday
        ? 'Holiday'
        : isSelectedDateSunday
        ? 'Sunday'
        : (existing?.status || 'Present');
      const effectiveRemarks = isSelectedDateHoliday
        ? `Holiday: ${currentHoliday?.name}${currentHoliday?.description ? ` (${currentHoliday.description})` : ''}`
        : isSelectedDateSunday
        ? 'Sunday Weekly Off'
        : existing?.remarks || '';

      return {
        date: selectedDate,
        type: attendanceMode,
        targetId: item.id,
        classId: attendanceMode === 'student' ? selectedClassId : undefined,
        section: attendanceMode === 'student' ? selectedSection : undefined,
        status: effectiveStatus,
        remarks: effectiveRemarks,
      };
    });

    bulkMarkAttendance(recordsToSave);

    setTimeout(() => {
      setIsSaving(false);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(now);
      setSaveSuccessMessage(
        isSelectedDateHoliday
          ? `✓ Official Holiday attendance locked & saved for ${recordsToSave.length} ${attendanceMode === 'teacher' ? 'Staff members' : 'Students'}: ${currentHoliday?.name}.`
          : isSelectedDateSunday
          ? `✓ Sunday Weekly Off attendance automatically saved for ${recordsToSave.length} ${attendanceMode === 'teacher' ? 'Staff members' : 'Students'}.`
          : `✓ ${attendanceMode === 'teacher' ? 'Staff' : 'Student'} Attendance for ${selectedDate} saved successfully! Total ${recordsToSave.length} records verified and updated.`
      );
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    }, 300);
  };

  // Handle Bulk Mark for ALL items in active roster
  const handleMarkAllRoster = (status: AttendanceStatus, customRemarks?: string) => {
    if (isSelectedDateHoliday || isSelectedDateSunday) return;
    const records: Omit<AttendanceRecord, 'id'>[] = activeRoster.map((item) => {
      const existing = attendanceMap.get(item.id);
      return {
        date: selectedDate,
        type: attendanceMode,
        targetId: item.id,
        classId: attendanceMode === 'student' ? selectedClassId : undefined,
        section: attendanceMode === 'student' ? selectedSection : undefined,
        status,
        remarks:
          customRemarks !== undefined
            ? customRemarks
            : status === 'Sunday'
            ? 'Sunday Weekly Off'
            : status === 'Holiday'
            ? 'School Holiday'
            : existing?.remarks,
      };
    });

    bulkMarkAttendance(records);
    setSelectedIds([]);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(now);
    setSaveSuccessMessage(
      `✓ Marked all ${records.length} ${attendanceMode === 'teacher' ? 'staff members' : 'students'} as ${status}.`
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Handle Bulk Mark for SELECTED checkboxes
  const handleMarkSelected = (status: AttendanceStatus) => {
    if (isSelectedDateHoliday || isSelectedDateSunday) return;
    if (selectedIds.length === 0) return;

    const records: Omit<AttendanceRecord, 'id'>[] = selectedIds.map((id) => {
      const existing = attendanceMap.get(id);
      return {
        date: selectedDate,
        type: attendanceMode,
        targetId: id,
        classId: attendanceMode === 'student' ? selectedClassId : undefined,
        section: attendanceMode === 'student' ? selectedSection : undefined,
        status,
        remarks:
          bulkRemarks.trim() ||
          (status === 'Sunday' ? 'Weekly Off' : status === 'Holiday' ? 'Holiday' : existing?.remarks),
      };
    });

    bulkMarkAttendance(records);
    const count = selectedIds.length;
    setSelectedIds([]);
    setBulkRemarks('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSavedTime(now);
    setSaveSuccessMessage(`✓ Updated ${count} selected records to ${status}.`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === displayedList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedList.map((item) => item.id));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Stats calculation
  const totalCount = activeRoster.length;
  const presentCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => (attendanceMap.get(item.id)?.status || (isSelectedDateSunday ? 'Sunday' : 'Present')) === 'Present'
      ).length;
  const absentCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => attendanceMap.get(item.id)?.status === 'Absent'
      ).length;
  const leaveCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => attendanceMap.get(item.id)?.status === 'Leave'
      ).length;
  const sundayCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => (attendanceMap.get(item.id)?.status || (isSelectedDateSunday ? 'Sunday' : 'Present')) === 'Sunday'
      ).length;
  const holidayCount = isSelectedDateHoliday
    ? totalCount
    : activeRoster.filter(
        (item) => attendanceMap.get(item.id)?.status === 'Holiday'
      ).length;
  const halfDayCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => attendanceMap.get(item.id)?.status === 'Half-Day'
      ).length;
  const lateCount = isSelectedDateHoliday
    ? 0
    : activeRoster.filter(
        (item) => attendanceMap.get(item.id)?.status === 'Late'
      ).length;

  const workingDaysRoster = isSelectedDateHoliday ? 0 : Math.max(0, totalCount - sundayCount - holidayCount);
  const effectiveAttendancePercentage = isSelectedDateHoliday
    ? 100
    : workingDaysRoster > 0
    ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / workingDaysRoster) * 100)
    : sundayCount > 0 || holidayCount > 0
    ? 100
    : 0;

  // Status Badge and Style Configuration
  const STATUS_CONFIG: Record<
    AttendanceStatus,
    { label: string; shortLabel: string; bg: string; text: string; border: string; activeBtn: string }
  > = {
    Present: {
      label: 'Present',
      shortLabel: 'P',
      bg: 'bg-emerald-50 text-emerald-800',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      activeBtn: 'bg-emerald-600 text-white shadow-xs',
    },
    Absent: {
      label: 'Absent',
      shortLabel: 'A',
      bg: 'bg-rose-50 text-rose-800',
      text: 'text-rose-800',
      border: 'border-rose-200',
      activeBtn: 'bg-rose-600 text-white shadow-xs',
    },
    Leave: {
      label: 'Leave',
      shortLabel: 'L',
      bg: 'bg-amber-50 text-amber-900',
      text: 'text-amber-900',
      border: 'border-amber-200',
      activeBtn: 'bg-amber-600 text-white shadow-xs',
    },
    Sunday: {
      label: 'Sunday',
      shortLabel: 'Sun',
      bg: 'bg-purple-50 text-purple-900',
      text: 'text-purple-900',
      border: 'border-purple-200',
      activeBtn: 'bg-purple-700 text-white shadow-xs',
    },
    Holiday: {
      label: 'Holiday',
      shortLabel: 'Hol',
      bg: 'bg-sky-50 text-sky-900',
      text: 'text-sky-900',
      border: 'border-sky-200',
      activeBtn: 'bg-sky-600 text-white shadow-xs',
    },
    'Half-Day': {
      label: 'Half Day',
      shortLabel: 'HD',
      bg: 'bg-indigo-50 text-indigo-900',
      text: 'text-indigo-900',
      border: 'border-indigo-200',
      activeBtn: 'bg-indigo-600 text-white shadow-xs',
    },
    Late: {
      label: 'Late',
      shortLabel: 'Late',
      bg: 'bg-yellow-50 text-yellow-900',
      text: 'text-yellow-900',
      border: 'border-yellow-200',
      activeBtn: 'bg-yellow-600 text-white shadow-xs',
    },
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Target Name',
      'Role',
      'Class/Department',
      'Roll No / Emp ID',
      'Attendance Status',
      'Remarks / Reason',
    ];
    const rows = activeRoster.map((item) => {
      const rec = attendanceMap.get(item.id);
      const isSt = 'fullName' in item;
      const effectiveStatus = isSelectedDateHoliday
        ? 'HOLIDAY'
        : rec?.status || (isSelectedDateSunday ? 'Sunday' : 'Present');
      const remarks = isSelectedDateHoliday
        ? `Holiday: ${currentHoliday?.name}${currentHoliday?.description ? ` (${currentHoliday.description})` : ''}`
        : rec?.remarks || (effectiveStatus === 'Sunday' ? 'Sunday Weekly Off' : effectiveStatus === 'Holiday' ? 'School Holiday' : '');

      return [
        selectedDate,
        isSt ? item.fullName : item.name,
        attendanceMode.toUpperCase(),
        isSt ? `${selectedClass?.name}-${selectedSection}` : item.designation,
        isSt ? item.rollNo : item.empId,
        effectiveStatus,
        remarks,
      ];
    });
    exportTableToCsv(
      `SBSC-${attendanceMode === 'teacher' ? 'Staff' : 'Student'}-Attendance-${selectedDate}.csv`,
      [headers, ...rows]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance & Daily / Monthly Register Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {activeTab === 'holidays'
              ? 'Annual School Holiday & Calendar Manager'
              : activeTab === 'monthly'
              ? 'Monthly Attendance Matrix & Muster Roll'
              : activeTab === 'fines'
              ? 'Attendance Fine & Paid Register (अनुपस्थिति जुर्माना)'
              : attendanceMode === 'teacher'
              ? 'Teachers & Staff Attendance Register'
              : 'Student Attendance Management'}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {activeTab === 'holidays'
              ? 'Define official school holidays. Holidays automatically lock staff and student attendance on designated dates.'
              : activeTab === 'fines'
              ? 'Track absent fines, mark fines as paid with receipts, waive fines, and view detailed absent fine records.'
              : 'Mark, save, and generate official A4 PDF reports for staff & student registers with multi-status support.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Daily vs Monthly vs Fines vs Holiday Tab Selector */}
          <div className="flex bg-blue-950 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Register</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'monthly'
                  ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Monthly Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('fines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'fines'
                  ? 'bg-emerald-400 text-slate-950 font-extrabold shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Absent Fines</span>
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'holidays'
                  ? 'bg-sky-400 text-slate-950 font-extrabold shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>Holidays ({holidays.length})</span>
            </button>
          </div>

          {activeTab === 'daily' && (
            <>
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => {
                    setAttendanceMode('teacher');
                    setSelectedIds([]);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    attendanceMode === 'teacher'
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Teachers & Staff</span>
                </button>
                <button
                  onClick={() => {
                    setAttendanceMode('student');
                    setSelectedIds([]);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    attendanceMode === 'student'
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Students</span>
                </button>
              </div>

              {/* Student View Format Toggle: Simple (Name • Present/Absent/Leave) vs Detailed */}
              {attendanceMode === 'student' && (
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setStudentViewFormat('simple')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      studentViewFormat === 'simple'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Student Roll Call: Student Name, Present, Absent, and Leave with automatic Holiday & Sunday"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Name • Present / Absent / Leave</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentViewFormat('detailed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      studentViewFormat === 'detailed'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Full Detailed Register with All Details & Notes"
                  >
                    <TableProperties className="w-3.5 h-3.5" />
                    <span>Detailed Register</span>
                  </button>
                </div>
              )}

              {/* Primary Save Attendance Button */}
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-50"
                title="Save and synchronize attendance register"
              >
                <Save className="w-4 h-4 text-emerald-200" />
                <span>{isSaving ? 'Saving...' : `Save ${attendanceMode === 'teacher' ? 'Staff' : 'Student'} Attendance`}</span>
              </button>

              {/* WhatsApp Absent Notification Button */}
              <button
                onClick={() => {
                  setWhatsAppTargetMode(attendanceMode);
                  setWhatsAppTargetStudent(null);
                  setWhatsAppTargetTeacher(null);
                  setWhatsAppCandidateFilterIds(undefined);
                  setIsWhatsAppModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer"
                title={`Send WhatsApp status alerts to ${attendanceMode === 'teacher' ? 'absent staff members' : 'absent students'}`}
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>
                  WhatsApp Absent {attendanceMode === 'teacher' ? 'Staff' : 'Students'}
                  {absentCount > 0 ? ` (${absentCount})` : ''}
                </span>
              </button>

              {/* All Classes Daily PDF (One PDF) */}
              {attendanceMode === 'student' && (
                <button
                  id="btn-all-classes-daily-pdf"
                  onClick={() => {
                    setPrintDailyType('all_classes');
                    setIsPrintOpen(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-extrabold shadow-md transition active:scale-95 border border-amber-400/40 cursor-pointer"
                  title="Print Consolidated Daily Attendance Report for All Classes in One PDF"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>⚡ All Classes Daily PDF (One PDF)</span>
                </button>
              )}

              {/* Generate PDF Report Button */}
              <button
                id="btn-current-class-daily-pdf"
                onClick={() => {
                  setPrintDailyType('single_class');
                  setIsPrintOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                title="Preview and generate downloadable A4 PDF report"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>{attendanceMode === 'teacher' ? 'Staff Daily PDF' : `Print ${selectedClass?.name || 'Class'} PDF`}</span>
              </button>
            </>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Sheet</span>
            </button>
          )}

          {activeTab === 'daily' && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'holidays' ? (
        <HolidayManagement
          onSelectDateForAttendance={(dateStr) => {
            setSelectedDate(dateStr);
            setActiveTab('daily');
          }}
        />
      ) : activeTab === 'monthly' ? (
        <MonthlyAttendanceMatrixView onNavigate={onNavigate} />
      ) : activeTab === 'fines' ? (
        <AttendanceFineRegister
          initialClassId={selectedClassId}
          initialSection={selectedSection}
        />
      ) : (
        <>

      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-950 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">{saveSuccessMessage}</p>
              {lastSavedTime && (
                <p className="text-[11px] text-emerald-700 mt-0.5">Last synchronized timestamp: {lastSavedTime}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sunday Notification Banner */}
      {isSelectedDateSunday && !isSelectedDateHoliday && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-4 rounded-2xl border border-purple-800/50 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-800/80 border border-purple-400/30 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-purple-100">Sunday Detected ({selectedDate})</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-800 text-[10px] font-bold text-amber-300">WEEKLY OFF</span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                The selected date falls on a Sunday. You can instantly mark all {attendanceMode === 'teacher' ? 'staff members' : 'students in this class'} as Sunday.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleMarkAllRoster('Sunday', 'Sunday Weekly Off')}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-lg transition active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-slate-950" />
            <span>Mark All as Sunday</span>
          </button>
        </div>
      )}

      {/* Logged-in Teacher Relative Class Banner */}
      {isTeacherUser && currentTeacher && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-blue-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-white">{currentTeacher.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-800 text-[10px] font-bold text-amber-300">
                  {currentTeacher.designation}
                </span>
                {assignedClassForCurrentTeacher && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-[10px] font-bold text-white">
                    ⭐ Class In-Charge: {assignedClassForCurrentTeacher.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Taking Student Attendance for <strong>{selectedClass?.name || 'Assigned Class'}</strong> • Academic Session: {settings.academicSession}
              </p>
            </div>
          </div>

          {/* Relative Classes Quick Switch Tabs */}
          {teacherRelativeClasses.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-blue-200 font-bold uppercase tracking-wider mr-1">
                Your Relative Classes:
              </span>
              {teacherRelativeClasses.map((rc) => {
                const isSelected = selectedClassId === rc.classInfo.id;
                return (
                  <button
                    key={rc.classInfo.id}
                    onClick={() => {
                      setSelectedClassId(rc.classInfo.id);
                      setAttendanceMode('student');
                      setSelectedIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-sm ring-2 ring-white/60 font-black'
                        : 'bg-blue-900/80 hover:bg-blue-800 text-blue-100 border border-blue-700/60'
                    }`}
                  >
                    <span>{rc.classInfo.name}</span>
                    {rc.roleType === 'class-teacher' && <span className="text-xs">⭐</span>}
                    {rc.roleType === 'primary-incharge' && (
                      <span className="text-[9px] bg-indigo-800/90 text-amber-300 px-1 py-0.5 rounded font-black">
                        PRT
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className={`grid gap-3 ${attendanceMode === 'student' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'}`}>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 block uppercase">
            {attendanceMode === 'teacher' ? 'Total Staff' : 'Total Students'}
          </span>
          <span className="text-lg font-extrabold text-slate-900">{totalCount}</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Present</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-extrabold text-emerald-950">{presentCount}</span>
            <span className="text-[10px] font-bold text-emerald-700">({effectiveAttendancePercentage}%)</span>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Absent</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-extrabold text-rose-950 block">{absentCount}</span>
            {absentCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWhatsAppTargetMode(attendanceMode);
                  setWhatsAppTargetStudent(null);
                  setWhatsAppTargetTeacher(null);
                  setWhatsAppCandidateFilterIds(undefined);
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title={`Send WhatsApp message to ${absentCount} absent records`}
              >
                <MessageSquare className="w-2.5 h-2.5 fill-current" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Leave</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-lg font-extrabold text-amber-950 block">{leaveCount}</span>
            {leaveCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWhatsAppTargetMode(attendanceMode);
                  setWhatsAppTargetStudent(null);
                  setWhatsAppTargetTeacher(null);
                  setWhatsAppCandidateFilterIds(undefined);
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
                title={`Send WhatsApp message to ${leaveCount} leave records`}
              >
                <MessageSquare className="w-2.5 h-2.5 fill-current" />
                <span>Notify</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-800 uppercase">Sunday</span>
            <Sun className="w-3 h-3 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-extrabold text-purple-950">{sundayCount}</span>
            {isSelectedDateSunday && (
              <span className="text-[10px] font-bold text-purple-700">(Auto)</span>
            )}
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-800 uppercase">Holiday</span>
            <Palmtree className="w-3 h-3 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-extrabold text-sky-950">{holidayCount}</span>
            {isSelectedDateHoliday && (
              <span className="text-[10px] font-bold text-sky-700">(Auto)</span>
            )}
          </div>
        </div>

        {attendanceMode === 'teacher' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">Half Day</span>
              <Hourglass className="w-3 h-3 text-indigo-600" />
            </div>
            <span className="text-lg font-extrabold text-indigo-950 mt-0.5 block">{halfDayCount}</span>
          </div>
        )}
      </div>

      {/* Official Holiday Notice Banner */}
      {isSelectedDateHoliday && currentHoliday && (
        <div className="bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border-2 border-sky-300 rounded-2xl p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Palmtree className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-black text-[10px] uppercase tracking-wider border border-sky-300">
                    Official School Holiday
                  </span>
                  <span className="text-xs font-bold text-sky-800 font-mono">
                    {selectedDate}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-sky-950 mt-0.5">
                  {currentHoliday.name}
                </h3>
                <p className="text-xs text-sky-800 mt-0.5 font-medium">
                  {currentHoliday.description || 'School Closed on this occasion.'}
                  <span className="text-sky-600 ml-1.5 font-bold">
                    • Attendance is locked to HOLIDAY for all students and staff.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('holidays')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-100 text-sky-950 border border-sky-300 font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Palmtree className="w-3.5 h-3.5 text-sky-600" />
                <span>Edit Holiday Calendar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Date, Class/Designation, Search & Bulk Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Date Picker */}
            <div>
              <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Date:</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedIds([]);
                  }}
                  className={`border rounded-lg px-2.5 py-1.5 font-bold focus:outline-blue-900 ${
                    isSelectedDateHoliday
                      ? 'bg-sky-50 border-sky-400 text-sky-950 font-black'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {isSelectedDateHoliday ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('holidays')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 text-xs font-black transition cursor-pointer"
                    title="Click to view or edit holiday in calendar"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                    <span>Holiday: {currentHoliday?.name}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('holidays')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    title="Declare this date as a holiday in the calendar"
                  >
                    <Palmtree className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mark Holiday</span>
                  </button>
                )}
              </div>
            </div>

            {/* Class (if students) */}
            {attendanceMode === 'student' && (
              <>
                <div>
                  <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Class:</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedIds([]);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-blue-900"
                  >
                    {sortedClasses.map((c) => {
                      const teacher = teachers.find((t) => t.id === c.classTeacherId);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {teacher ? `(${teacher.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Section:</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSelectedIds([]);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-blue-900"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </>
            )}

            {/* Search */}
            <div>
              <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Search:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    attendanceMode === 'teacher'
                      ? 'Search staff name, emp ID, designation...'
                      : 'Search student name, roll no, adm no...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-blue-900 min-w-[220px]"
                />
              </div>
            </div>
          </div>

          {/* Quick Bulk Actions for Entire List */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isSelectedDateHoliday ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-100 border border-sky-300 text-sky-950 text-xs font-extrabold shadow-2xs">
                <Palmtree className="w-4 h-4 text-sky-700" />
                <span>Declared Holiday: Attendance Automatically Marked as HOLIDAY ({currentHoliday?.name})</span>
              </div>
            ) : isSelectedDateSunday ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-100 border border-purple-300 text-purple-950 text-xs font-extrabold shadow-2xs">
                <Sun className="w-4 h-4 text-purple-700" />
                <span>Sunday: Attendance Automatically Marked as SUNDAY (Weekly Off)</span>
              </div>
            ) : attendanceMode === 'student' ? (
              /* Student Mode Bulk Actions: Present, Absent, Leave (Sunday & Holiday are automatic) */
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Roll Call:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAllRoster('Present')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  title="Mark all students in class as Present"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Present</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllRoster('Absent')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  title="Mark all students in class as Absent"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Mark All Absent</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllRoster('Leave')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  title="Mark all students in class as On Leave"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark All Leave</span>
                </button>
              </div>
            ) : (
              <>
                <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Staff Bulk Mark:</span>

                <button
                  onClick={() => handleMarkAllRoster('Present')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  title="Mark all staff as Present"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>All Present</span>
                </button>

                <button
                  onClick={() => handleMarkAllRoster('Absent')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  title="Mark all staff as Absent"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>All Absent</span>
                </button>

                <button
                  onClick={() => handleMarkAllRoster('Leave')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  title="Mark all staff as Leave"
                >
                  <span>All Leave</span>
                </button>

                <button
                  onClick={() => handleMarkAllRoster('Half-Day', 'Half Day Working')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  title="Mark all staff as Half Day"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>Half Day</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Pills for Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter By Status:
          </span>
          {(attendanceMode === 'student'
            ? (['All', 'Present', 'Absent', 'Leave', 'Sunday', 'Holiday'] as const)
            : (['All', 'Present', 'Absent', 'Leave', 'Sunday', 'Holiday', 'Half-Day'] as const)
          ).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === filterKey
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filterKey === 'Half-Day' ? 'Half Day' : filterKey}
              {filterKey === 'All' ? ` (${activeRoster.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Floating / Docked Multi-Selection Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-blue-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-blue-700/80 text-amber-300 font-extrabold text-xs">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {isSelectedDateHoliday
                ? 'Date is marked as a Holiday. Attendance is locked to HOLIDAY.'
                : isSelectedDateSunday
                ? 'Date is Sunday. Attendance is automatically SUNDAY (Weekly Off).'
                : `Choose status to bulk mark on selected ${attendanceMode === 'teacher' ? 'staff members' : 'students'}:`}
            </span>
          </div>

          {isSelectedDateHoliday ? (
            <div className="text-xs font-black text-sky-300 flex items-center gap-2 bg-sky-950/60 px-4 py-2 rounded-xl border border-sky-700">
              <Palmtree className="w-4 h-4 text-sky-400" />
              <span>Holiday: {currentHoliday?.name} (Status Locked)</span>
            </div>
          ) : isSelectedDateSunday ? (
            <div className="text-xs font-black text-purple-300 flex items-center gap-2 bg-purple-950/60 px-4 py-2 rounded-xl border border-purple-700">
              <Sun className="w-4 h-4 text-purple-400" />
              <span>Sunday (Weekly Off - Status Auto-Marked)</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Custom Remarks Input for Bulk Mark */}
              <input
                type="text"
                placeholder="Optional batch remark / reason..."
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                className="bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-blue-400 flex-1 md:w-56"
              />

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => handleMarkSelected('Present')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                >
                  Present
                </button>
                <button
                  onClick={() => handleMarkSelected('Absent')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition"
                >
                  Absent
                </button>
                <button
                  onClick={() => handleMarkSelected('Leave')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition"
                >
                  Leave
                </button>
                {attendanceMode === 'teacher' && (
                  <button
                    onClick={() => handleMarkSelected('Half-Day')}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    Half Day
                  </button>
                )}

              {/* Batch WhatsApp Button */}
              <button
                onClick={() => {
                  setWhatsAppTargetMode(attendanceMode);
                  const firstSelected = displayedList.find((d) => d.id === selectedIds[0]);
                  if (attendanceMode === 'student' && firstSelected) {
                    setWhatsAppTargetStudent(firstSelected as Student);
                    setWhatsAppTargetTeacher(null);
                  } else if (firstSelected) {
                    setWhatsAppTargetStudent(null);
                    setWhatsAppTargetTeacher(firstSelected as Teacher);
                  }
                  setWhatsAppCandidateFilterIds(selectedIds.length > 0 ? selectedIds : undefined);
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer ml-1"
                title="Send WhatsApp notice to selected records"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp ({selectedIds.length})</span>
              </button>

              {/* Batch Fine Paid / Waived Buttons */}
              {attendanceMode === 'student' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const absentRecIds = selectedIds
                        .map((id) => {
                          const r = attendance.find(
                            (a) => a.targetId === id && a.date === selectedDate && a.type === 'student' && a.status === 'Absent'
                          );
                          return r?.id;
                        })
                        .filter(Boolean) as string[];

                      if (absentRecIds.length === 0) {
                        alert('None of the selected students are currently marked as Absent with a saved attendance record for this date.');
                        return;
                      }

                      const receiptNo = `AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                      markAttendanceFinePaid(absentRecIds, {
                        paymentMode: 'Cash',
                        receiptNo,
                        paidDate: selectedDate,
                        fineAmount: settings.absentFinePerDay ?? 5,
                      });
                      alert(`Successfully marked Attendance Fine as Paid for ${absentRecIds.length} absent student(s). Receipt #${receiptNo}`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer ml-1 active:scale-95"
                    title="Mark attendance fine as Paid for selected absent students on this date"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Pay Fine</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const absentRecIds = selectedIds
                        .map((id) => {
                          const r = attendance.find(
                            (a) => a.targetId === id && a.date === selectedDate && a.type === 'student' && a.status === 'Absent'
                          );
                          return r?.id;
                        })
                        .filter(Boolean) as string[];

                      if (absentRecIds.length === 0) {
                        alert('None of the selected students are currently marked as Absent for this date.');
                        return;
                      }

                      waiveAttendanceFine(absentRecIds, 'Waived in bulk by Authority');
                      alert(`Attendance fine waived for ${absentRecIds.length} absent student(s).`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Waive attendance fine for selected absent students on this date"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Waive</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Clear
            </button>
          </div>
        )}
        </div>
      )}

      {/* Attendance Register Table */}
      {attendanceMode === 'student' && studentViewFormat === 'simple' ? (
        /* Simple Roll Call Mode: Student Name, Roll No, Present, Absent, Leave */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-2xs uppercase tracking-wide">
                  <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                  Quick Roll Call
                </span>
                <span className="text-xs font-black text-slate-800">
                  {selectedClass?.name} • Sec {selectedSection}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Student Name with quick Present, Absent, and Leave buttons. Sundays and declared Holidays are handled automatically.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                Total: <strong className="text-slate-950 font-black">{displayedList.length}</strong>
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                Present: <strong className="text-emerald-950 font-black">{presentCount}</strong>
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
                Absent: <strong className="text-rose-950 font-black">{absentCount}</strong>
              </span>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                Leave: <strong className="text-amber-950 font-black">{leaveCount}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-24 text-center">Roll No</th>
                  <th className="py-3.5 px-6">Student Name</th>
                  <th className="py-3.5 px-6 text-center w-96">Mark Attendance</th>
                  <th className="py-3.5 px-4 text-center w-32">Status</th>
                  <th className="py-3.5 px-4 text-right w-28">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No students found matching current filters.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try clearing the search query or status filter.</p>
                    </td>
                  </tr>
                ) : (
                  displayedList.map((item, idx) => {
                    const rec = attendanceMap.get(item.id);
                    const currentStatus: AttendanceStatus = isSelectedDateHoliday
                      ? 'Holiday'
                      : isSelectedDateSunday
                      ? 'Sunday'
                      : (rec?.status || 'Present');
                    const isPresent = currentStatus === 'Present';
                    const isAbsent = currentStatus === 'Absent';
                    const isLeave = currentStatus === 'Leave';
                    const st = item as Student;

                    return (
                      <tr
                        key={st.id}
                        className={`transition ${
                          isSelectedDateHoliday
                            ? 'bg-sky-50/40'
                            : isSelectedDateSunday
                            ? 'bg-purple-50/30'
                            : isAbsent
                            ? 'bg-rose-50/50 hover:bg-rose-50/80'
                            : isLeave
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Serial Number */}
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>

                        {/* Roll Number Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-xs text-blue-950 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                            #{st.rollNo || idx + 1}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="py-3.5 px-6">
                          <div
                            onClick={() => {
                              if (!isSelectedDateHoliday && !isSelectedDateSunday) {
                                // Cycle: Present -> Absent -> Leave -> Present
                                const nextStatus: AttendanceStatus =
                                  isPresent ? 'Absent' : isAbsent ? 'Leave' : 'Present';
                                handleStatusChange(st.id, nextStatus);
                              }
                            }}
                            className="cursor-pointer select-none group inline-block"
                            title="Click name to cycle between Present, Absent, and Leave"
                          >
                            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight uppercase group-hover:text-blue-900 transition block">
                              {st.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Adm No: <strong className="text-slate-700">{st.admissionNo}</strong>
                              {st.fatherName ? ` • Father: ${st.fatherName}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Attendance Selection: Present / Absent / Leave */}
                        <td className="py-3.5 px-6 text-center">
                          {isSelectedDateHoliday ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100 text-sky-950 font-black text-xs border border-sky-300">
                              <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                              <span>HOLIDAY ({currentHoliday?.name || 'School Closed'})</span>
                            </span>
                          ) : isSelectedDateSunday ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 text-purple-950 font-black text-xs border border-purple-300">
                              <Sun className="w-3.5 h-3.5 text-purple-700" />
                              <span>SUNDAY (Weekly Off)</span>
                            </span>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-2">
                              {/* PRESENT BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'Present')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  isPresent
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-300'
                                    : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>PRESENT</span>
                              </button>

                              {/* ABSENT BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'Absent')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  isAbsent
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md ring-2 ring-rose-300'
                                    : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>ABSENT</span>
                              </button>

                              {/* LEAVE BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'Leave')}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                  isLeave
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md ring-2 ring-amber-300'
                                    : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>LEAVE</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isSelectedDateHoliday ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-sky-100 text-sky-950 border border-sky-300">
                              HOLIDAY
                            </span>
                          ) : isSelectedDateSunday ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300">
                              SUNDAY
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider ${
                                  isAbsent
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : isLeave
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {isAbsent ? 'ABSENT' : isLeave ? 'ON LEAVE' : 'PRESENT'}
                              </span>

                              {isAbsent && (
                                <div className="mt-0.5">
                                  {rec?.fineStatus === 'Paid' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFineModalStudent(st);
                                        setFineModalDate(selectedDate);
                                        setIsFineModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition cursor-pointer"
                                      title={`Fine Paid ₹${rec.fineAmount || settings.absentFinePerDay || 5} (Receipt: ${rec.fineReceiptNo || 'N/A'}) - Click to View Slip`}
                                    >
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                      <span>Fine Paid (₹{rec.fineAmount || settings.absentFinePerDay || 5})</span>
                                    </button>
                                  ) : rec?.fineStatus === 'Waived' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFineModalStudent(st);
                                        setFineModalDate(selectedDate);
                                        setIsFineModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-800 border border-slate-300 hover:bg-slate-300 transition cursor-pointer"
                                      title="Fine Waived - Click to View / Edit"
                                    >
                                      <Shield className="w-2.5 h-2.5 text-slate-600" />
                                      <span>Fine Waived</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFineModalStudent(st);
                                        setFineModalDate(selectedDate);
                                        setIsFineModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition cursor-pointer active:scale-95 shadow-2xs"
                                      title="Click to Pay or Waive Absent Fine"
                                    >
                                      <IndianRupee className="w-2.5 h-2.5" />
                                      <span>Pay Fine (₹{settings.absentFinePerDay ?? 5})</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions for Absent / Leave Student */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAbsent && !isSelectedDateHoliday && !isSelectedDateSunday && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFineModalStudent(st);
                                  setFineModalDate(selectedDate);
                                  setIsFineModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] transition cursor-pointer active:scale-95"
                                title="Collect or view fine for this absent student"
                              >
                                <IndianRupee className="w-3 h-3 text-emerald-700" />
                                <span>Fine</span>
                              </button>
                            )}

                            {(isAbsent || isLeave) && !isSelectedDateHoliday && !isSelectedDateSunday ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setWhatsAppTargetMode('student');
                                  setWhatsAppTargetStudent(st);
                                  setWhatsAppTargetTeacher(null);
                                  setIsWhatsAppModalOpen(true);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-extrabold text-[11px] transition cursor-pointer active:scale-95 ${
                                  isAbsent
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                                title={`Send WhatsApp ${isAbsent ? 'Absent' : 'Leave'} notification to parents`}
                              >
                                <Send className="w-3 h-3 fill-current" />
                                <span>Notify</span>
                              </button>
                            ) : !isAbsent && (
                              <span className="text-slate-300 text-xs font-mono">—</span>
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={displayedList.length > 0 && selectedIds.length === displayedList.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
                    title="Select / Deselect all"
                  />
                </th>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4">
                  {attendanceMode === 'teacher' ? 'Emp ID & Faculty Details' : 'Roll No & Student Details'}
                </th>
                {attendanceMode === 'teacher' ? (
                  <th className="py-3 px-3">Designation & Subjects</th>
                ) : (
                  <th className="py-3 px-3">Class - Sec</th>
                )}
                <th className="py-3 px-3 text-center">Current Status</th>
                <th className="py-3 px-3">Remarks / Reason</th>
                <th className="py-3 px-3 text-center">WhatsApp Alert</th>
                <th className="py-3 px-4 text-right">Quick Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No records found matching current filters.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try changing search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                displayedList.map((item, idx) => {
                  const rec = attendanceMap.get(item.id);
                  const currentStatus: AttendanceStatus = isSelectedDateHoliday
                    ? 'Holiday'
                    : (rec?.status || (isSelectedDateSunday ? 'Sunday' : 'Present'));
                  const isSelected = selectedIds.includes(item.id);
                  const isStudent = 'fullName' in item;
                  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Present;

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        isSelectedDateHoliday
                          ? 'bg-sky-50/40 hover:bg-sky-50/60'
                          : isSelected
                          ? 'bg-blue-50/70'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(item.id)}
                          className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
                        />
                      </td>

                      {/* Serial Number */}
                      <td className="py-3 px-3 text-center font-medium text-slate-400">{idx + 1}</td>

                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                            {isStudent ? `#${item.rollNo}` : item.empId}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 uppercase block">
                              {isStudent ? item.fullName : item.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {isStudent
                                ? `Adm: ${item.admissionNo} • ${item.fatherName}`
                                : `${item.qualification} • Ph: ${item.phone}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class or Designation */}
                      {isStudent ? (
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {selectedClass?.name} - {item.section}
                        </td>
                      ) : (
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.designation}</div>
                          <div className="text-[10px] text-slate-500">{item.subjects.join(', ')}</div>
                        </td>
                      )}

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isSelectedDateHoliday ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border bg-sky-100 text-sky-950 border-sky-300">
                              <Palmtree className="w-3 h-3 text-sky-700" />
                              <span>HOLIDAY</span>
                            </span>
                            <span
                              className="text-[10px] font-bold text-sky-900 mt-0.5 max-w-[130px] truncate block"
                              title={currentHoliday?.name}
                            >
                              {currentHoliday?.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold border ${cfg.bg} ${cfg.border}`}
                            >
                              {currentStatus === 'Half-Day' ? 'HALF DAY' : currentStatus.toUpperCase()}
                            </span>
                            {isStudent && currentStatus === 'Absent' && (
                              <div>
                                {rec?.fineStatus === 'Paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFineModalStudent(item as Student);
                                      setFineModalDate(selectedDate);
                                      setIsFineModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition cursor-pointer"
                                    title={`Fine Paid: ₹${rec.fineAmount || settings.absentFinePerDay || 5}`}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                    <span>Paid (₹{rec.fineAmount || settings.absentFinePerDay || 5})</span>
                                  </button>
                                ) : rec?.fineStatus === 'Waived' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFineModalStudent(item as Student);
                                      setFineModalDate(selectedDate);
                                      setIsFineModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-800 border border-slate-300 hover:bg-slate-300 transition cursor-pointer"
                                    title="Fine Waived"
                                  >
                                    <Shield className="w-2.5 h-2.5 text-slate-600" />
                                    <span>Waived</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFineModalStudent(item as Student);
                                      setFineModalDate(selectedDate);
                                      setIsFineModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition cursor-pointer active:scale-95 shadow-2xs"
                                    title="Collect Absent Fine"
                                  >
                                    <IndianRupee className="w-2.5 h-2.5" />
                                    <span>Pay (₹{settings.absentFinePerDay ?? 5})</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-3">
                        {isSelectedDateHoliday ? (
                          <div className="text-xs">
                            <span className="font-bold text-sky-950 block">{currentHoliday?.name}</span>
                            {currentHoliday?.description ? (
                              <span className="text-[10px] text-slate-500 italic block">
                                {currentHoliday.description}
                              </span>
                            ) : (
                              <span className="text-[10px] text-sky-700 italic block">
                                Declared School Holiday
                              </span>
                            )}
                          </div>
                        ) : editingRemarkId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={remarkInput}
                              onChange={(e) => setRemarkInput(e.target.value)}
                              placeholder="Reason / Note..."
                              className="bg-white border border-blue-400 rounded px-2 py-0.5 text-xs text-slate-900 w-36 focus:outline-blue-900"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleStatusChange(item.id, currentStatus, remarkInput);
                                  setEditingRemarkId(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                handleStatusChange(item.id, currentStatus, remarkInput);
                                setEditingRemarkId(null);
                              }}
                              className="p-1 rounded bg-blue-900 text-white hover:bg-blue-800"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRemarkId(item.id);
                              setRemarkInput(rec?.remarks || '');
                            }}
                            className="group text-left flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-900"
                            title="Click to edit remark"
                          >
                            <span className="truncate max-w-[140px] italic">
                              {rec?.remarks || 'Add remark...'}
                            </span>
                            <MessageSquare className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-blue-700" />
                          </button>
                        )}
                      </td>

                      {/* WhatsApp Notification Column */}
                      <td className="py-3 px-3 text-center">
                        {isSelectedDateHoliday ? (
                          <span className="text-[10px] text-slate-400 font-semibold italic">—</span>
                        ) : currentStatus === 'Absent' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsAppTargetMode(attendanceMode);
                              if (isStudent) {
                                setWhatsAppTargetStudent(item as Student);
                                setWhatsAppTargetTeacher(null);
                              } else {
                                setWhatsAppTargetStudent(null);
                                setWhatsAppTargetTeacher(item as Teacher);
                              }
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] shadow-2xs transition active:scale-95 cursor-pointer"
                            title={`Send WhatsApp absent notice to ${isStudent ? (item as Student).fatherName : (item as Teacher).name}`}
                          >
                            <Send className="w-3 h-3 text-emerald-600 fill-current" />
                            <span>Notify Absent</span>
                          </button>
                        ) : currentStatus === 'Leave' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsAppTargetMode(attendanceMode);
                              if (isStudent) {
                                setWhatsAppTargetStudent(item as Student);
                                setWhatsAppTargetTeacher(null);
                              } else {
                                setWhatsAppTargetStudent(null);
                                setWhatsAppTargetTeacher(item as Teacher);
                              }
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold transition cursor-pointer"
                            title="Send leave acknowledgment on WhatsApp"
                          >
                            <MessageSquare className="w-2.5 h-2.5 text-amber-700" />
                            <span>Leave Note</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsAppTargetMode(attendanceMode);
                              if (isStudent) {
                                setWhatsAppTargetStudent(item as Student);
                                setWhatsAppTargetTeacher(null);
                              } else {
                                setWhatsAppTargetStudent(null);
                                setWhatsAppTargetTeacher(item as Teacher);
                              }
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Send WhatsApp message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>

                      {/* Quick Mark Actions */}
                      <td className="py-3 px-4 text-right">
                        {isSelectedDateHoliday ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-100/80 border border-sky-300 text-sky-950 font-black text-[11px] select-none shadow-2xs">
                            <Palmtree className="w-3.5 h-3.5 text-sky-700" />
                            <span>HOLIDAY (Locked)</span>
                          </div>
                        ) : isSelectedDateSunday ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100/80 border border-purple-300 text-purple-950 font-black text-[11px] select-none shadow-2xs">
                            <Sun className="w-3.5 h-3.5 text-purple-700" />
                            <span>SUNDAY (Auto)</span>
                          </div>
                        ) : (
                          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 gap-0.5 shadow-2xs">
                            {(attendanceMode === 'student'
                              ? (['Present', 'Absent', 'Leave'] as const)
                              : (['Present', 'Absent', 'Leave', 'Half-Day'] as const)
                            ).map((stKey) => {
                              const conf = STATUS_CONFIG[stKey];
                              const isCur = currentStatus === stKey;

                              return (
                                <button
                                  key={stKey}
                                  onClick={() => handleStatusChange(item.id, stKey)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                    isCur
                                      ? conf.activeBtn
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                  }`}
                                  title={`Mark as ${stKey === 'Half-Day' ? 'Half Day' : stKey}`}
                                >
                                  {conf.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

        {/* A4 Printable Register Modal (Dynamic Template Selection) */}
        <PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={
            attendanceMode === 'teacher'
              ? `Staff Attendance Register Sheet - ${selectedDate}`
              : printDailyType === 'all_classes'
              ? `All Classes Daily Attendance Register (One PDF) - ${selectedDate}`
              : `${selectedClass?.name || 'Class'} Student Attendance Register Sheet - ${selectedDate}`
          }
          fileName={
            attendanceMode === 'teacher'
              ? `SBSC-Staff-Attendance-${selectedDate}.pdf`
              : printDailyType === 'all_classes'
              ? `SBSC-All-Classes-Daily-Attendance-${selectedDate}.pdf`
              : `SBSC-${selectedClass?.name || 'Class'}-Attendance-${selectedDate}.pdf`
          }
        >
          {attendanceMode === 'teacher' ? (
            <StaffAttendanceReportPdf date={selectedDate} />
          ) : (
            <div className="space-y-4">
              {/* Quick Report Scope Switcher inside Modal */}
              <div className="no-print bg-slate-100 p-2 rounded-xl border border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3 font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>Scope:</span>
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPrintDailyType('all_classes')}
                        className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                          printDailyType === 'all_classes'
                            ? 'bg-blue-950 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚡ All Classes (One PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintDailyType('single_class')}
                        className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                          printDailyType === 'single_class'
                            ? 'bg-blue-950 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Current Class ({selectedClass?.name || 'Class'})
                      </button>
                    </div>
                  </div>

                  {printDailyType === 'single_class' && (
                    <div className="flex items-center gap-2">
                      <span>Format:</span>
                      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setPrintSimpleFormat(true)}
                          className={`px-2.5 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                            printSimpleFormat
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Name • Present / Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintSimpleFormat(false)}
                          className={`px-2.5 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                            !printSimpleFormat
                              ? 'bg-blue-950 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Full Register
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  {printDailyType === 'all_classes'
                    ? 'Master PDF with summary banner + all class student rosters'
                    : printSimpleFormat
                    ? 'Simplified Student Name, Roll No & Present/Absent register'
                    : `Full multi-status register with signature columns`}
                </span>
              </div>

              {printDailyType === 'all_classes' ? (
                <AllClassesDailyAttendanceReportPdf date={selectedDate} />
              ) : (
                <AttendanceReportPdf
                  date={selectedDate}
                  selectedClass={selectedClass}
                  section={selectedSection}
                  simpleMode={printSimpleFormat}
                />
              )}
            </div>
          )}
        </PrintPreviewModal>

        {/* WhatsApp Attendance Absent & Leave Notification Modal */}
        {isWhatsAppModalOpen && (
          <WhatsAppAttendanceModal
            isOpen={true}
            onClose={() => {
              setIsWhatsAppModalOpen(false);
              setWhatsAppTargetStudent(null);
              setWhatsAppTargetTeacher(null);
            }}
            initialMode={whatsAppTargetMode}
            initialStudent={whatsAppTargetStudent}
            initialTeacher={whatsAppTargetTeacher}
            date={selectedDate}
            classId={attendanceMode === 'student' ? selectedClassId : undefined}
            section={attendanceMode === 'student' ? selectedSection : undefined}
            currentAttendanceMap={attendanceMap}
            selectedCandidateIds={whatsAppCandidateFilterIds}
          />
        )}

        {/* Student Attendance Fine Paid & Waiver Modal */}
        {isFineModalOpen && fineModalStudent && (
          <AttendanceFineModal
            isOpen={isFineModalOpen}
            onClose={() => {
              setIsFineModalOpen(false);
              setFineModalStudent(null);
              setFineModalDate(undefined);
            }}
            student={fineModalStudent}
            initialSelectedDate={fineModalDate}
          />
        )}
        </>
      )}
    </div>
  );
};
