import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { AttendanceRecord, AttendanceStatus, ClassInfo } from '../../types/school';
import {
  CalendarCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Users,
  UserCheck,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  FileSpreadsheet,
  Sun,
  Palmtree,
  Check,
  Info,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { StudentMonthlyAttendanceReportPdf } from '../reports/templates/StudentMonthlyAttendanceReportPdf';
import { StaffMonthlyAttendanceReportPdf } from '../reports/templates/StaffMonthlyAttendanceReportPdf';
import { AllClassesMonthlyAttendanceReportPdf } from '../reports/templates/AllClassesMonthlyAttendanceReportPdf';
import { exportTableToCsv } from '../../services/pdfService';

interface MonthlyAttendanceMatrixViewProps {
  onNavigate?: (module: string) => void;
}

export const MonthlyAttendanceMatrixView: React.FC<MonthlyAttendanceMatrixViewProps> = ({ onNavigate }) => {
  const { students, teachers, classes, attendance, bulkMarkAttendance, markAttendance, settings, getHolidayForDate, isHolidayDate } = useSchool();

  const [mode, setMode] = useState<'teacher' | 'student'>('student');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 1 - 12 (September)
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'c-10');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMonthlyType, setPrintMonthlyType] = useState<'all_classes' | 'single_class'>('all_classes');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Calculate days in the selected month
  const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const dayDetails = daysArray.map((day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon ...
    const dayChar = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
    const isSunday = dayOfWeek === 0;
    const holidayInfo = getHolidayForDate ? getHolidayForDate(dateStr) : undefined;
    const isHoliday = !!holidayInfo;
    const isToday = new Date().toISOString().slice(0, 10) === dateStr;
    return { day, dateStr, dayOfWeek, dayChar, dayName, isSunday, isHoliday, holidayInfo, isToday };
  });

  // Filter roster
  const studentRoster = students
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

  const teacherRoster = teachers.filter((t) => {
    if (
      searchTerm &&
      !t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.empId.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.designation.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const activeRoster = mode === 'teacher' ? teacherRoster : studentRoster;

  // Build attendance hashmap for fast access
  const attendanceMap = new Map<string, AttendanceStatus>();
  attendance.forEach((rec) => {
    if (rec.type === mode) {
      attendanceMap.set(`${rec.targetId}_${rec.date}`, rec.status);
    }
  });

  // Cycle status on cell click
  const handleCellClick = (targetId: string, dateStr: string, currentStatus: AttendanceStatus) => {
    const dateParts = dateStr.split('-').map(Number);
    const dObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const isSun = dObj.getDay() === 0;
    const isHol = isHolidayDate ? isHolidayDate(dateStr) : false;

    if (isSun || isHol) {
      // Sundays and declared holidays are automated and locked
      return;
    }

    const cycleOrder: AttendanceStatus[] =
      mode === 'student'
        ? ['Present', 'Absent', 'Leave']
        : ['Present', 'Absent', 'Leave', 'Half-Day'];

    const currentIdx = cycleOrder.indexOf(currentStatus);
    const nextStatus = currentIdx === -1 ? cycleOrder[0] : cycleOrder[(currentIdx + 1) % cycleOrder.length];

    markAttendance({
      date: dateStr,
      type: mode,
      targetId,
      classId: mode === 'student' ? selectedClassId : undefined,
      section: mode === 'student' ? selectedSection : undefined,
      status: nextStatus,
    });
  };

  // Bulk mark all Sundays in this month
  const handleBulkMarkSundays = () => {
    const sundayDays = dayDetails.filter((d) => d.isSunday);
    const recordsToMark: Omit<AttendanceRecord, 'id'>[] = [];

    activeRoster.forEach((member) => {
      sundayDays.forEach((sun) => {
        recordsToMark.push({
          date: sun.dateStr,
          type: mode,
          targetId: member.id,
          classId: mode === 'student' ? selectedClassId : undefined,
          section: mode === 'student' ? selectedSection : undefined,
          status: 'Sunday',
          remarks: 'Sunday Weekly Off',
        });
      });
    });

    bulkMarkAttendance(recordsToMark);
    setFeedbackMessage(`✓ Successfully marked ${sundayDays.length} Sundays for all ${activeRoster.length} ${mode === 'teacher' ? 'staff members' : 'students'}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Bulk mark all Weekdays as Present
  const handleBulkMarkPresentWorkingDays = () => {
    const workingDays = dayDetails.filter((d) => !d.isSunday);
    const recordsToMark: Omit<AttendanceRecord, 'id'>[] = [];

    activeRoster.forEach((member) => {
      workingDays.forEach((wd) => {
        const existing = attendanceMap.get(`${member.id}_${wd.dateStr}`);
        // Only mark if not already absent or on leave
        if (!existing || existing === 'Sunday') {
          recordsToMark.push({
            date: wd.dateStr,
            type: mode,
            targetId: member.id,
            classId: mode === 'student' ? selectedClassId : undefined,
            section: mode === 'student' ? selectedSection : undefined,
            status: 'Present',
          });
        }
      });
    });

    bulkMarkAttendance(recordsToMark);
    setFeedbackMessage(`✓ Synchronized present status for ${workingDays.length} working days.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Calculate monthly stats per member
  const memberMonthlyStats = activeRoster.map((member) => {
    let p = 0;
    let a = 0;
    let l = 0;
    let s = 0;
    let h = 0;
    let hd = 0;
    let lt = 0;

    dayDetails.forEach(({ dateStr, isSunday, isHoliday }) => {
      const explicit = attendanceMap.get(`${member.id}_${dateStr}`);
      const status: AttendanceStatus = isHoliday ? 'Holiday' : isSunday ? 'Sunday' : (explicit || 'Present');

      if (status === 'Present') p++;
      else if (status === 'Absent') a++;
      else if (status === 'Leave') l++;
      else if (status === 'Sunday') s++;
      else if (status === 'Holiday') h++;
      else if (status === 'Half-Day') hd++;
      else if (status === 'Late') lt++;
    });

    const workingDays = totalDays - s - h;
    const effectivePresent = p + lt + (hd * 0.5);
    const payableDays = p + lt + l + s + h + (hd * 0.5);
    const percentage = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 100;

    return {
      member,
      p,
      a,
      l,
      s,
      h,
      hd,
      payableDays,
      percentage,
    };
  });

  // Export Monthly CSV
  const handleExportMonthlyCsv = () => {
    const isStudent = mode === 'student';
    const headerRow1 = [
      'S.No',
      isStudent ? 'Admission No' : 'Emp ID',
      isStudent ? 'Roll No' : 'Designation',
      'Name',
      ...dayDetails.map((d) => `Day ${d.day} (${d.dayChar})`),
      'Present (P)',
      'Absent (A)',
      'Leave (L)',
      'Sunday (S)',
      'Holiday (H)',
      'Half-Day (HD)',
      isStudent ? 'Attendance %' : 'Payable Days',
    ];

    const dataRows = memberMonthlyStats.map(({ member, p, a, l, s, h, hd, payableDays, percentage }, idx) => {
      const isSt = 'fullName' in member;
      const dayStatuses = dayDetails.map(({ dateStr, isSunday, isHoliday }) => {
        const explicit = attendanceMap.get(`${member.id}_${dateStr}`);
        return isHoliday ? 'Holiday' : isSunday ? 'Sunday' : (explicit || 'Present');
      });

      return [
        idx + 1,
        isSt ? member.admissionNo : member.empId,
        isSt ? member.rollNo : member.designation,
        isSt ? member.fullName : member.name,
        ...dayStatuses,
        p,
        a,
        l,
        s,
        h,
        hd,
        isSt ? `${percentage}%` : `${payableDays} / ${totalDays}`,
      ];
    });

    exportTableToCsv(
      `SBSC-${mode.toUpperCase()}-Monthly-Register-${monthNames[selectedMonth - 1]}-${selectedYear}.csv`,
      [headerRow1, ...dataRows]
    );
  };

  const totalSundays = dayDetails.filter((d) => d.isSunday).length;
  const totalWorkingDays = totalDays - totalSundays;
  const avgMonthlyAttendance =
    memberMonthlyStats.length > 0
      ? Math.round(memberMonthlyStats.reduce((acc, curr) => acc + curr.percentage, 0) / memberMonthlyStats.length)
      : 100;

  return (
    <div className="space-y-5">
      {/* Month & Year Navigation Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Left: Mode & Month Picker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setMode('student')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'student' ? 'bg-blue-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Students</span>
            </button>
            <button
              onClick={() => setMode('teacher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'teacher' ? 'bg-blue-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Teachers & Staff</span>
            </button>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-blue-950 hover:bg-slate-200 rounded-lg transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-extrabold text-blue-950 min-w-32 text-center uppercase tracking-wide">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-blue-950 hover:bg-slate-200 rounded-lg transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-900"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-900"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Right: Quick Bulk Operations & PDF Generation */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={handleBulkMarkSundays}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition shadow-2xs"
            title="Automatically mark all Sundays of this month"
          >
            <Sun className="w-3.5 h-3.5 text-purple-700" />
            <span>Mark Sundays ({totalSundays})</span>
          </button>

          <button
            onClick={handleBulkMarkPresentWorkingDays}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition shadow-2xs"
            title="Mark all weekdays as Present"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sync Working Days</span>
          </button>

          <button
            onClick={handleExportMonthlyCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition shadow-2xs"
            title="Export Monthly Register Matrix to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {/* All Classes Monthly PDF (One PDF) */}
          {mode === 'student' && (
            <button
              id="btn-all-classes-monthly-pdf"
              onClick={() => {
                setPrintMonthlyType('all_classes');
                setIsPrintModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-extrabold shadow-md transition active:scale-95 border border-amber-400/40 cursor-pointer"
              title="Print Consolidated Monthly Attendance Report for All Classes in One PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>⚡ All Classes Monthly PDF (One PDF)</span>
            </button>
          )}

          <button
            id="btn-current-class-monthly-pdf"
            onClick={() => {
              setPrintMonthlyType('single_class');
              setIsPrintModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-950 to-blue-900 hover:from-blue-900 hover:to-blue-800 text-white text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{mode === 'teacher' ? 'Staff Monthly PDF' : `Print ${selectedClass?.name || 'Class'} Monthly PDF`}</span>
          </button>
        </div>
      </div>

      {/* Success Feedback Alert */}
      {feedbackMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter Bar for Class/Section & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {mode === 'student' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-950 focus:outline-blue-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Section:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-950 focus:outline-blue-900"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </>
          )}

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${mode === 'student' ? 'student name, roll, adm no...' : 'faculty name, emp id...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-blue-900"
            />
          </div>
        </div>

        {/* Legend strip */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-600">
          <span className="text-slate-400 text-xs">Status:</span>
          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <strong>P</strong> Present
          </span>
          <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <strong>A</strong> Absent
          </span>
          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <strong>L</strong> Leave
          </span>
          <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <strong>S</strong> Sunday (Auto)
          </span>
          <span className="inline-flex items-center gap-1 text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            <strong>H</strong> Holiday (Auto)
          </span>
          {mode === 'teacher' && (
            <span className="inline-flex items-center gap-1 text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              <strong>½</strong> Half-Day
            </span>
          )}
          <span className="text-[10px] text-slate-400 italic">(Working days toggle P → A → L; Sundays & Holidays are automatic)</span>
        </div>
      </div>

      {/* Monthly Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Strength</span>
          <div className="text-xl font-extrabold text-blue-950 mt-1">{activeRoster.length}</div>
          <span className="text-[10px] text-slate-500">{mode === 'student' ? 'Enrolled' : 'Staff on Roll'}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Calendar Days</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalDays} Days</div>
          <span className="text-[10px] text-purple-700 font-semibold">{totalSundays} Sundays Off</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Working Days</span>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{totalWorkingDays} Days</div>
          <span className="text-[10px] text-slate-500">Scheduled duty days</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Attendance</span>
          <div className="text-xl font-extrabold text-blue-900 mt-1">{avgMonthlyAttendance}%</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Monthly Aggregate</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Leaves</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1">
            {memberMonthlyStats.reduce((acc, curr) => acc + curr.l, 0)}
          </div>
          <span className="text-[10px] text-slate-500">Sanctioned leaves</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Absences</span>
          <div className="text-xl font-extrabold text-rose-700 mt-1">
            {memberMonthlyStats.reduce((acc, curr) => acc + curr.a, 0)}
          </div>
          <span className="text-[10px] text-slate-500">Unexcused / LWP</span>
        </div>
      </div>

      {/* Interactive High-Density Monthly Attendance Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              {/* Row 1: Day Numbers */}
              <tr className="bg-blue-950 text-white font-bold text-center">
                <th rowSpan={2} className="border-r border-b border-blue-900 p-2 w-8 text-center text-[10px]">#</th>
                <th rowSpan={2} className="border-r border-b border-blue-900 p-2 w-20 text-center text-[10px]">
                  {mode === 'student' ? 'Adm No' : 'Emp ID'}
                </th>
                <th rowSpan={2} className="border-r border-b border-blue-900 p-2 w-12 text-center text-[10px]">
                  {mode === 'student' ? 'Roll' : 'Designation'}
                </th>
                <th rowSpan={2} className="border-r border-b border-blue-900 p-2 text-left min-w-[130px] text-[11px]">
                  {mode === 'student' ? 'Student Name' : 'Faculty Name'}
                </th>

                {/* Day 1..31 Columns */}
                {dayDetails.map(({ day, isSunday, isToday }) => (
                  <th
                    key={day}
                    className={`border-r border-b border-blue-900 p-1 text-center min-w-[24px] max-w-[28px] text-[10px] ${
                      isSunday
                        ? 'bg-purple-900 text-amber-300'
                        : isToday
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-blue-900 text-white'
                    }`}
                    title={`Day ${day}`}
                  >
                    {day}
                  </th>
                ))}

                {/* Monthly Totals Header */}
                <th colSpan={7} className="border-b border-blue-900 p-1 bg-slate-900 text-amber-300 uppercase text-[10px] tracking-wider">
                  Monthly Stats
                </th>
              </tr>

              {/* Row 2: Weekday Initial */}
              <tr className="bg-slate-100 text-slate-800 font-bold text-center text-[9px]">
                {dayDetails.map(({ day, dayChar, isSunday, isToday }) => (
                  <th
                    key={day}
                    className={`border-r border-b border-slate-300 p-0.5 ${
                      isSunday
                        ? 'bg-purple-100 text-purple-900 font-black'
                        : isToday
                        ? 'bg-amber-100 text-amber-950 font-black'
                        : 'text-slate-600'
                    }`}
                  >
                    {dayChar}
                  </th>
                ))}

                <th className="border-r border-b border-slate-300 p-1 w-7 bg-emerald-100 text-emerald-950 font-bold" title="Present (P)">P</th>
                <th className="border-r border-b border-slate-300 p-1 w-7 bg-rose-100 text-rose-950 font-bold" title="Absent (A)">A</th>
                <th className="border-r border-b border-slate-300 p-1 w-7 bg-amber-100 text-amber-950 font-bold" title="Leave (L)">L</th>
                <th className="border-r border-b border-slate-300 p-1 w-7 bg-purple-100 text-purple-950 font-bold" title="Sunday (S)">S</th>
                <th className="border-r border-b border-slate-300 p-1 w-7 bg-sky-100 text-sky-950 font-bold" title="Holiday (H)">H</th>
                <th className="border-r border-b border-slate-300 p-1 w-7 bg-indigo-100 text-indigo-950 font-bold" title="Half-Day (HD)">HD</th>
                <th className="border-b border-slate-300 p-1 w-12 bg-blue-100 text-blue-950 font-black text-center">
                  {mode === 'student' ? '% Att' : 'Pay Days'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {memberMonthlyStats.length === 0 ? (
                <tr>
                  <td colSpan={totalDays + 11} className="py-12 text-center text-slate-400 text-sm">
                    No members found matching the selected class and filters.
                  </td>
                </tr>
              ) : (
                memberMonthlyStats.map(({ member, p, a, l, s, h, hd, payableDays, percentage }, idx) => {
                  const isSt = 'fullName' in member;

                  return (
                    <tr
                      key={member.id}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/40 transition' : 'bg-slate-50/60 hover:bg-blue-50/40 transition'}
                    >
                      <td className="border-r border-slate-200 p-1.5 text-center font-medium text-slate-500 text-[10px]">{idx + 1}</td>
                      <td className="border-r border-slate-200 p-1.5 text-center font-mono text-[10px] font-bold text-slate-700">
                        {isSt ? member.admissionNo.replace('SBSC/', '') : member.empId}
                      </td>
                      <td className="border-r border-slate-200 p-1.5 text-center font-bold text-blue-950 text-[10px]">
                        {isSt ? member.rollNo : member.designation.slice(0, 10)}
                      </td>
                      <td className="border-r border-slate-200 p-1.5 font-bold text-slate-900 uppercase truncate max-w-[140px] text-[11px]" title={isSt ? member.fullName : member.name}>
                        {isSt ? member.fullName : member.name}
                      </td>

                      {/* Day Matrix Cells */}
                      {dayDetails.map(({ day, dateStr, isSunday, isHoliday, holidayInfo, isToday }) => {
                        const explicit = attendanceMap.get(`${member.id}_${dateStr}`);
                        const status: AttendanceStatus = isHoliday ? 'Holiday' : isSunday ? 'Sunday' : (explicit || 'Present');

                        let text = 'P';
                        let cellBg = 'hover:bg-emerald-100 text-emerald-800 font-bold';

                        if (status === 'Absent') {
                          text = 'A';
                          cellBg = 'bg-rose-100 text-rose-900 font-extrabold hover:bg-rose-200';
                        } else if (status === 'Leave') {
                          text = 'L';
                          cellBg = 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200';
                        } else if (status === 'Sunday') {
                          text = 'S';
                          cellBg = 'bg-purple-50 text-purple-700 font-medium hover:bg-purple-100';
                        } else if (status === 'Holiday') {
                          text = 'H';
                          cellBg = 'bg-sky-100 text-sky-900 font-bold hover:bg-sky-200';
                        } else if (status === 'Half-Day') {
                          text = '½';
                          cellBg = 'bg-indigo-100 text-indigo-900 font-bold hover:bg-indigo-200';
                        } else if (status === 'Late') {
                          text = 'Lt';
                          cellBg = 'bg-yellow-100 text-yellow-900 font-bold hover:bg-yellow-200';
                        }

                        return (
                          <td
                            key={day}
                            onClick={() => handleCellClick(member.id, dateStr, status)}
                            className={`border-r border-slate-200 p-0.5 text-center text-[10px] cursor-pointer transition select-none ${cellBg} ${
                              isToday ? 'ring-1 ring-inset ring-amber-400' : ''
                            }`}
                            title={
                              isHoliday
                                ? `Declared Holiday: ${holidayInfo?.name || 'School Holiday'} (Auto/Locked)`
                                : isSunday
                                ? 'Sunday (Weekly Off - Auto/Locked)'
                                : `Click to cycle status: ${isSt ? member.fullName : member.name} on ${dateStr} (${status})`
                            }
                          >
                            {text}
                          </td>
                        );
                      })}

                      {/* Aggregates */}
                      <td className="border-r border-slate-200 p-1 text-center font-bold text-emerald-800 bg-emerald-50/40 text-[10px]">{p}</td>
                      <td className="border-r border-slate-200 p-1 text-center font-bold text-rose-800 bg-rose-50/40 text-[10px]">{a > 0 ? a : '-'}</td>
                      <td className="border-r border-slate-200 p-1 text-center font-bold text-amber-800 bg-amber-50/40 text-[10px]">{l > 0 ? l : '-'}</td>
                      <td className="border-r border-slate-200 p-1 text-center font-medium text-purple-800 bg-purple-50/40 text-[10px]">{s}</td>
                      <td className="border-r border-slate-200 p-1 text-center font-medium text-sky-800 bg-sky-50/40 text-[10px]">{h > 0 ? h : '-'}</td>
                      <td className="border-r border-slate-200 p-1 text-center font-medium text-indigo-800 bg-indigo-50/40 text-[10px]">{hd > 0 ? hd : '-'}</td>
                      <td className="p-1 text-center font-extrabold text-blue-950 bg-blue-50/70 text-[10px]">
                        {isSt ? (
                          <span className={`px-1 py-0.5 rounded ${percentage >= 75 ? 'text-emerald-800' : 'text-rose-800 bg-rose-100'}`}>
                            {percentage}%
                          </span>
                        ) : (
                          <span className="font-mono text-blue-950">
                            {payableDays}/{totalDays}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer */}
            <tfoot>
              <tr className="bg-slate-200 text-slate-900 font-extrabold border-t-2 border-slate-300 text-center text-[10px]">
                <td colSpan={4} className="border-r border-slate-300 p-2 text-right pr-3 uppercase">
                  Daily Presence Total:
                </td>
                {dayDetails.map(({ day, dateStr, isSunday }) => {
                  if (isSunday) {
                    return (
                      <td key={day} className="border-r border-slate-300 p-1 text-purple-900 bg-purple-100 text-[9px] font-bold">
                        Sun
                      </td>
                    );
                  }
                  const dayPresent = activeRoster.filter((m) => {
                    const st = attendanceMap.get(`${m.id}_${dateStr}`) || 'Present';
                    return st === 'Present' || st === 'Late' || st === 'Half-Day';
                  }).length;

                  return (
                    <td key={day} className="border-r border-slate-300 p-1 text-emerald-950 bg-emerald-50 text-[10px] font-bold">
                      {dayPresent}
                    </td>
                  );
                })}
                <td colSpan={7} className="p-2 text-center bg-blue-950 text-white font-extrabold text-xs">
                  Monthly Avg: {avgMonthlyAttendance}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* A4 Landscape Printable Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={
          mode === 'teacher'
            ? `Staff Monthly Attendance Register Sheet - ${monthNames[selectedMonth - 1]} ${selectedYear}`
            : printMonthlyType === 'all_classes'
            ? `All Classes Monthly Attendance Register (One PDF) - ${monthNames[selectedMonth - 1]} ${selectedYear}`
            : `${selectedClass?.name || 'Class'} Student Monthly Attendance Register Sheet - ${monthNames[selectedMonth - 1]} ${selectedYear}`
        }
        fileName={
          mode === 'teacher'
            ? `SBSC-Staff-Monthly-Register-${monthNames[selectedMonth - 1]}-${selectedYear}.pdf`
            : printMonthlyType === 'all_classes'
            ? `SBSC-All-Classes-Monthly-Register-${monthNames[selectedMonth - 1]}-${selectedYear}.pdf`
            : `SBSC-${selectedClass?.name || 'Class'}-Monthly-Register-${monthNames[selectedMonth - 1]}-${selectedYear}.pdf`
        }
        orientation="landscape"
      >
        {mode === 'teacher' ? (
          <StaffMonthlyAttendanceReportPdf
            year={selectedYear}
            month={selectedMonth}
          />
        ) : (
          <div className="space-y-4">
            {/* Quick Scope Switcher inside Modal */}
            <div className="no-print bg-slate-100 p-2 rounded-xl border border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <span>Report Scope:</span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPrintMonthlyType('all_classes')}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                      printMonthlyType === 'all_classes'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ All Classes (One PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMonthlyType('single_class')}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer ${
                      printMonthlyType === 'single_class'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Current Class ({selectedClass?.name || 'Class'})
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {printMonthlyType === 'all_classes'
                  ? 'Generates institutional monthly master performance matrix + 31-day CBSE ledgers for all classes in 1 PDF'
                  : `Generates 31-day CBSE ledger for ${selectedClass?.name || 'Class'} section ${selectedSection}`}
              </span>
            </div>

            {printMonthlyType === 'all_classes' ? (
              <AllClassesMonthlyAttendanceReportPdf
                year={selectedYear}
                month={selectedMonth}
              />
            ) : (
              <StudentMonthlyAttendanceReportPdf
                year={selectedYear}
                month={selectedMonth}
                selectedClass={selectedClass}
                section={selectedSection}
              />
            )}
          </div>
        )}
      </PrintPreviewModal>
    </div>
  );
};
