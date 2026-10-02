import React, { useMemo } from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { AttendanceStatus } from '../../../types/school';

interface AllClassesDailyAttendanceReportPdfProps {
  date: string;
  viewMode?: 'all' | 'summary_only' | 'rosters_only';
}

export const AllClassesDailyAttendanceReportPdf: React.FC<AllClassesDailyAttendanceReportPdfProps> = ({
  date,
  viewMode = 'all',
}) => {
  const { classes, students, teachers, attendance, settings } = useSchool();

  // Sort classes in academic order (by gradeNumber)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.gradeNumber - b.gradeNumber);
  }, [classes]);

  // Date formatting
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(`${date}T00:00:00`);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  }, [date]);

  // Determine if day is Sunday
  const isSunday = useMemo(() => {
    try {
      return new Date(`${date}T00:00:00`).getDay() === 0;
    } catch {
      return false;
    }
  }, [date]);

  // Map attendance for instant O(1) lookup: `${studentId}_${date}`
  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: AttendanceStatus; remarks?: string }>();
    attendance.forEach((rec) => {
      if (rec.type === 'student' && rec.date === date) {
        map.set(rec.targetId, { status: rec.status, remarks: rec.remarks });
      }
    });
    return map;
  }, [attendance, date]);

  // Compute metrics for each class
  const classReports = useMemo(() => {
    return sortedClasses.map((cls) => {
      // Find class teacher name
      const teacher = teachers.find(
        (t) => t.id === cls.classTeacherId || t.assignedClassId === cls.id || t.assignedClass === cls.name
      );
      const teacherName = teacher ? teacher.name : 'Faculty Assigned';

      // Students in this class (active/enrolled)
      const classStudents = students
        .filter((s) => s.classId === cls.id && s.status !== 'Alumni' && s.status !== 'Transferred')
        .sort((a, b) => {
          const rollA = parseInt(a.rollNo) || 0;
          const rollB = parseInt(b.rollNo) || 0;
          if (rollA !== rollB && rollA > 0 && rollB > 0) return rollA - rollB;
          return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
        });

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let halfDayCount = 0;
      let lateCount = 0;
      let sundayCount = 0;
      let holidayCount = 0;

      const studentRoster = classStudents.map((st) => {
        const rec = attendanceMap.get(st.id);
        const status: AttendanceStatus = rec?.status || (isSunday ? 'Sunday' : 'Present');
        const remarks = rec?.remarks || '';

        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Leave') leaveCount++;
        else if (status === 'Half-Day') halfDayCount++;
        else if (status === 'Late') lateCount++;
        else if (status === 'Sunday') sundayCount++;
        else if (status === 'Holiday') holidayCount++;

        return {
          student: st,
          status,
          remarks,
        };
      });

      const totalEnrolled = classStudents.length;
      const effectivePresent = presentCount + lateCount + halfDayCount * 0.5;
      const nonHolidayTotal = totalEnrolled - sundayCount - holidayCount;
      const attendancePct =
        nonHolidayTotal > 0
          ? Math.round((effectivePresent / nonHolidayTotal) * 100)
          : isSunday || sundayCount > 0 || holidayCount > 0
          ? 100
          : 0;

      return {
        cls,
        teacherName,
        totalEnrolled,
        presentCount,
        absentCount,
        leaveCount,
        halfDayCount,
        lateCount,
        sundayCount,
        holidayCount,
        attendancePct,
        studentRoster,
      };
    });
  }, [sortedClasses, students, teachers, attendanceMap, isSunday]);

  // Overall School Totals
  const schoolTotals = useMemo(() => {
    let totalEnrolled = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalHalfDay = 0;
    let totalLate = 0;

    classReports.forEach((c) => {
      totalEnrolled += c.totalEnrolled;
      totalPresent += c.presentCount;
      totalAbsent += c.absentCount;
      totalLeave += c.leaveCount;
      totalHalfDay += c.halfDayCount;
      totalLate += c.lateCount;
    });

    const effectivePresent = totalPresent + totalLate + totalHalfDay * 0.5;
    const overallPct =
      totalEnrolled > 0 ? Math.round((effectivePresent / totalEnrolled) * 100) : 0;

    return {
      totalEnrolled,
      totalPresent,
      totalAbsent,
      totalLeave,
      totalHalfDay,
      totalLate,
      overallPct,
      classesCount: classReports.length,
    };
  }, [classReports]);

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-300';
      case 'Absent':
        return 'bg-red-100 text-red-900 border border-red-300';
      case 'Leave':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'Half-Day':
        return 'bg-indigo-100 text-indigo-900 border border-indigo-300';
      case 'Late':
        return 'bg-yellow-100 text-yellow-900 border border-yellow-300';
      case 'Sunday':
        return 'bg-purple-100 text-purple-900 border border-purple-300';
      case 'Holiday':
        return 'bg-sky-100 text-sky-900 border border-sky-300';
      default:
        return 'bg-slate-100 text-slate-900 border border-slate-300';
    }
  };

  return (
    <div className="bg-white p-6 max-w-[920px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs print-container">
      {/* Official Master School Header */}
      <ReportHeader
        title="ALL-CLASSES CONSOLIDATED DAILY ATTENDANCE REGISTER"
        subTitle={`COMPREHENSIVE INSTITUTIONAL DAILY ATTENDANCE LEDGER • ALL CLASSES (NURSERY TO CLASS 12)`}
        reportDate={formattedDate}
        badge={`DATE: ${date}`}
      />

      {/* School Executive KPI Summary Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-xl p-3.5 mb-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-800/80 pb-2.5 mb-2.5 text-xs">
          <div>
            <span className="text-blue-300 font-bold uppercase tracking-wider text-[10px] block">
              INSTITUTIONAL MASTER ATTENDANCE REPORT
            </span>
            <span className="font-extrabold text-sm sm:text-base text-white">
              {settings.name || settings.schoolName} — All Classes Daily Strength
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-800/80 text-blue-200 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold">
              {schoolTotals.classesCount} Classes Reporting
            </span>
            <span className="bg-amber-400 text-blue-950 px-2.5 py-1 rounded-md text-[11px] font-extrabold">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="bg-white/10 rounded-lg p-2 border border-white/10">
            <span className="text-[10px] text-slate-300 font-semibold uppercase block">Total Strength</span>
            <span className="text-lg font-black text-white">{schoolTotals.totalEnrolled}</span>
            <span className="text-[9px] text-slate-300 block">Enrolled Students</span>
          </div>

          <div className="bg-emerald-500/20 rounded-lg p-2 border border-emerald-400/30">
            <span className="text-[10px] text-emerald-300 font-semibold uppercase block">Present Today</span>
            <span className="text-lg font-black text-emerald-300">{schoolTotals.totalPresent}</span>
            <span className="text-[9px] text-emerald-200 block">Attending</span>
          </div>

          <div className="bg-red-500/20 rounded-lg p-2 border border-red-400/30">
            <span className="text-[10px] text-red-300 font-semibold uppercase block">Absent Today</span>
            <span className="text-lg font-black text-red-300">{schoolTotals.totalAbsent}</span>
            <span className="text-[9px] text-red-200 block">Unexcused</span>
          </div>

          <div className="bg-amber-500/20 rounded-lg p-2 border border-amber-400/30">
            <span className="text-[10px] text-amber-300 font-semibold uppercase block">Leave / Half-Day</span>
            <span className="text-lg font-black text-amber-300">
              {schoolTotals.totalLeave + schoolTotals.totalHalfDay}
            </span>
            <span className="text-[9px] text-amber-200 block">Sanctioned</span>
          </div>

          <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-400/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-blue-200 font-semibold uppercase block">School Avg %</span>
            <span className="text-lg font-black text-amber-300">{schoolTotals.overallPct}%</span>
            <span className="text-[9px] text-blue-200 block">Overall Attendance</span>
          </div>
        </div>
      </div>

      {/* PART 1: MASTER SUMMARY TABLE (ALL CLASSES COMPARATIVE MATRIX) */}
      {(viewMode === 'all' || viewMode === 'summary_only') && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <span>Section 1: All-Classes Master Daily Attendance Summary</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              Consolidated School Overview
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-left mb-3">
            <thead>
              <tr className="bg-blue-950 text-white text-[10px] font-bold">
                <th className="border border-slate-400 p-2 text-center w-8">S.N.</th>
                <th className="border border-slate-400 p-2 w-32">Class & Section</th>
                <th className="border border-slate-400 p-2">Class Teacher / In-charge</th>
                <th className="border border-slate-400 p-2 text-center w-16">Enrolled</th>
                <th className="border border-slate-400 p-2 text-center w-16 bg-emerald-950 text-emerald-200">
                  Present
                </th>
                <th className="border border-slate-400 p-2 text-center w-14 bg-red-950 text-red-200">
                  Absent
                </th>
                <th className="border border-slate-400 p-2 text-center w-14 bg-amber-950 text-amber-200">
                  Leave
                </th>
                <th className="border border-slate-400 p-2 text-center w-14">HD / Late</th>
                <th className="border border-slate-400 p-2 text-center w-18 bg-blue-900 text-amber-300 font-black">
                  % Att
                </th>
                <th className="border border-slate-400 p-2 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {classReports.map((c, idx) => {
                const isHigh = c.attendancePct >= 90;
                const isMedium = c.attendancePct >= 75 && c.attendancePct < 90;

                return (
                  <tr key={c.cls.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-bold text-blue-950">
                      {c.cls.name} <span className="text-slate-500 font-normal">({c.cls.sections.join(', ')})</span>
                    </td>
                    <td className="border border-slate-300 p-1.5 text-slate-700 font-medium">
                      {c.teacherName}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">
                      {c.totalEnrolled}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-extrabold text-emerald-800 bg-emerald-50/50">
                      {c.presentCount}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-red-700 bg-red-50/50">
                      {c.absentCount}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-semibold text-amber-800 bg-amber-50/50">
                      {c.leaveCount}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-600 text-[11px]">
                      {c.halfDayCount + c.lateCount}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-black text-blue-950 bg-blue-50/60 font-mono">
                      {c.attendancePct}%
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-[10px]">
                      {c.attendancePct === 100 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                          Full 100%
                        </span>
                      ) : isHigh ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold border border-teal-300">
                          Excellent
                        </span>
                      ) : isMedium ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                          Good
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold border border-red-200">
                          Low &lt;75%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Grand Total Row */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-[11px]">
                <td colSpan={3} className="border border-slate-600 p-2 text-right uppercase tracking-wider">
                  School Grand Total ({schoolTotals.classesCount} Classes):
                </td>
                <td className="border border-slate-600 p-2 text-center text-white font-bold">
                  {schoolTotals.totalEnrolled}
                </td>
                <td className="border border-slate-600 p-2 text-center text-emerald-300 font-black">
                  {schoolTotals.totalPresent}
                </td>
                <td className="border border-slate-600 p-2 text-center text-red-300 font-black">
                  {schoolTotals.totalAbsent}
                </td>
                <td className="border border-slate-600 p-2 text-center text-amber-300 font-bold">
                  {schoolTotals.totalLeave}
                </td>
                <td className="border border-slate-600 p-2 text-center text-slate-300 text-[10px]">
                  {schoolTotals.totalHalfDay + schoolTotals.totalLate}
                </td>
                <td className="border border-slate-600 p-2 text-center text-amber-300 font-black text-xs font-mono">
                  {schoolTotals.overallPct}%
                </td>
                <td className="border border-slate-600 p-2 text-center text-[10px] text-slate-300">
                  Official Record
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* PART 2: CLASS-BY-CLASS DETAILED STUDENT ROSTERS */}
      {(viewMode === 'all' || viewMode === 'rosters_only') && (
        <div className="space-y-6">
          <div className="border-t-2 border-dashed border-slate-400 pt-4 mb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm uppercase tracking-wide">
              Section 2: Class-Wise Student Attendance Rosters
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Individual Student Roll &amp; Attendance Records
            </span>
          </div>

          {classReports.map((c, classIdx) => (
            <div
              key={c.cls.id}
              className={`border border-slate-300 rounded-lg p-3 bg-white shadow-2xs ${
                classIdx < classReports.length - 1 ? 'page-break-after' : ''
              }`}
            >
              {/* Class Header Banner */}
              <div className="bg-slate-100 border border-slate-300 rounded-md p-2 mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-900 text-white font-black text-xs flex items-center justify-center font-mono">
                    {classIdx + 1}
                  </span>
                  <div>
                    <h4 className="font-black text-blue-950 text-xs sm:text-sm uppercase">
                      {c.cls.name} — Class Daily Register
                    </h4>
                    <span className="text-[10px] text-slate-600">
                      Class Teacher: <strong className="text-slate-800">{c.teacherName}</strong> • Room:{' '}
                      {c.cls.roomNumber || 'A-1'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-slate-700">
                    Total: <strong className="text-blue-950">{c.totalEnrolled}</strong>
                  </span>
                  <span className="text-emerald-700">
                    Present: <strong className="text-emerald-800">{c.presentCount}</strong>
                  </span>
                  <span className="text-red-700">
                    Absent: <strong className="text-red-800">{c.absentCount}</strong>
                  </span>
                  <span className="text-amber-700">
                    Leave: <strong className="text-amber-800">{c.leaveCount}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-amber-300 font-black font-mono text-[11px]">
                    {c.attendancePct}%
                  </span>
                </div>
              </div>

              {/* Students Attendance Table for this Class */}
              {c.studentRoster.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-xs">
                  No active students enrolled in this class.
                </div>
              ) : (
                <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[10px] font-bold">
                      <th className="border border-slate-300 p-1.5 text-center w-8">S.N.</th>
                      <th className="border border-slate-300 p-1.5 w-24">Adm No</th>
                      <th className="border border-slate-300 p-1.5 w-12 text-center">Roll</th>
                      <th className="border border-slate-300 p-1.5">Student Full Name</th>
                      <th className="border border-slate-300 p-1.5 w-44">Father / Guardian (Phone)</th>
                      <th className="border border-slate-300 p-1.5 w-24 text-center">Daily Status</th>
                      <th className="border border-slate-300 p-1.5">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.studentRoster.map((item, sIdx) => {
                      const st = item.student;
                      return (
                        <tr
                          key={st.id}
                          className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/50'}
                        >
                          <td className="border border-slate-200 p-1 text-center font-mono text-slate-500 text-[10px]">
                            {sIdx + 1}
                          </td>
                          <td className="border border-slate-200 p-1 font-mono text-[10px] text-slate-700">
                            {st.admissionNo}
                          </td>
                          <td className="border border-slate-200 p-1 text-center font-bold text-slate-900">
                            {st.rollNo}
                          </td>
                          <td className="border border-slate-200 p-1 font-bold text-blue-950 uppercase">
                            {st.fullName}
                          </td>
                          <td className="border border-slate-200 p-1 text-slate-600 text-[10px]">
                            <span>{st.fatherName || 'Guardian'}</span>
                            {st.guardianPhone && (
                              <span className="block font-mono text-[9px] text-slate-500">
                                📞 {st.guardianPhone}
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusBadge(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="border border-slate-200 p-1 text-slate-600 italic text-[10px]">
                            {item.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Class Subtotal Footer Note */}
              <div className="mt-2 text-[10px] text-slate-500 flex justify-between items-center px-1">
                <span>
                  {c.cls.name} Attendance Rate:{' '}
                  <strong className="text-blue-950">{c.attendancePct}%</strong> (
                  {c.presentCount} of {c.totalEnrolled} Present)
                </span>
                <span className="italic">Class In-charge Verification Sign: _____________________</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Signatures Block */}
      <ReportFooter
        notes="Official All-Classes Consolidated Register generated via SBSC Enterprise School ERP System. All student attendance statuses have been validated against digital daily logs."
        showSignatures={true}
      />
    </div>
  );
};
