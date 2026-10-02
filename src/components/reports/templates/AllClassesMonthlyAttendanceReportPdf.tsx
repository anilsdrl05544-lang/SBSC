import React, { useMemo } from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { AttendanceStatus } from '../../../types/school';

interface AllClassesMonthlyAttendanceReportPdfProps {
  year: number;
  month: number; // 1 - 12
  viewMode?: 'all' | 'summary_only' | 'matrix_only';
}

export const AllClassesMonthlyAttendanceReportPdf: React.FC<AllClassesMonthlyAttendanceReportPdfProps> = ({
  year,
  month,
  viewMode = 'all',
}) => {
  const { classes, students, teachers, attendance, settings } = useSchool();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1] || 'September';

  // Total days in the selected month
  const totalDays = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const daysArray = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  // Day details (Day of week, isSunday)
  const dayDetails = useMemo(() => {
    return daysArray.map((day) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(`${dateStr}T00:00:00`);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun
      const dayChar = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];
      const isSunday = dayOfWeek === 0;
      return { day, dateStr, dayOfWeek, dayChar, isSunday };
    });
  }, [year, month, daysArray]);

  const totalSundays = useMemo(() => dayDetails.filter((d) => d.isSunday).length, [dayDetails]);
  const totalWorkingDays = totalDays - totalSundays;

  // Map attendance for quick O(1) lookup: map[`${studentId}_${dateStr}`] = { status, remarks }
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    attendance.forEach((rec) => {
      if (rec.type === 'student') {
        map.set(`${rec.targetId}_${rec.date}`, rec.status);
      }
    });
    return map;
  }, [attendance]);

  // Sort classes by academic sequence
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.gradeNumber - b.gradeNumber);
  }, [classes]);

  // Aggregate monthly data for all classes
  const classMonthlyData = useMemo(() => {
    return sortedClasses.map((cls) => {
      const teacher = teachers.find(
        (t) => t.id === cls.classTeacherId || t.assignedClassId === cls.id || t.assignedClass === cls.name
      );
      const teacherName = teacher ? teacher.name : 'Faculty Assigned';

      // Active students
      const classStudents = students
        .filter((s) => s.classId === cls.id && s.status !== 'Alumni' && s.status !== 'Transferred')
        .sort((a, b) => {
          const rollA = parseInt(a.rollNo) || 0;
          const rollB = parseInt(b.rollNo) || 0;
          if (rollA !== rollB && rollA > 0 && rollB > 0) return rollA - rollB;
          return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
        });

      let classTotalPresentDays = 0;
      let classTotalAbsentDays = 0;
      let classTotalLeaveDays = 0;
      let classTotalHalfDays = 0;
      let classTotalLateDays = 0;

      // Student level breakdown
      const studentMatrix = classStudents.map((st) => {
        let p = 0;
        let a = 0;
        let l = 0;
        let s = 0;
        let h = 0;
        let hd = 0;
        let lt = 0;

        const dailyStatus = dayDetails.map(({ dateStr, isSunday }) => {
          const explicitStatus = attendanceMap.get(`${st.id}_${dateStr}`);
          const status: AttendanceStatus = explicitStatus || (isSunday ? 'Sunday' : 'Present');

          if (status === 'Present') p++;
          else if (status === 'Absent') a++;
          else if (status === 'Leave') l++;
          else if (status === 'Sunday') s++;
          else if (status === 'Holiday') h++;
          else if (status === 'Half-Day') hd++;
          else if (status === 'Late') lt++;

          return { dateStr, status, isSunday };
        });

        const effectiveP = p + lt + hd * 0.5;
        const studentWorkingDays = totalDays - s - h;
        const pct = studentWorkingDays > 0 ? Math.round((effectiveP / studentWorkingDays) * 100) : 100;

        classTotalPresentDays += p;
        classTotalAbsentDays += a;
        classTotalLeaveDays += l;
        classTotalHalfDays += hd;
        classTotalLateDays += lt;

        return {
          student: st,
          dailyStatus,
          present: p,
          absent: a,
          leave: l,
          halfDay: hd,
          late: lt,
          effectivePresent: effectiveP,
          percentage: pct,
        };
      });

      const totalEnrolled = classStudents.length;
      const totalPossibleStudentDays = totalEnrolled * totalWorkingDays;
      const effectivePresentDays =
        classTotalPresentDays + classTotalLateDays + classTotalHalfDays * 0.5;
      const classAvgPct =
        totalPossibleStudentDays > 0
          ? Math.round((effectivePresentDays / totalPossibleStudentDays) * 100)
          : 100;

      return {
        cls,
        teacherName,
        totalEnrolled,
        workingDays: totalWorkingDays,
        totalPossibleStudentDays,
        classTotalPresentDays,
        classTotalAbsentDays,
        classTotalLeaveDays,
        classAvgPct,
        studentMatrix,
      };
    });
  }, [sortedClasses, teachers, students, dayDetails, attendanceMap, totalDays, totalWorkingDays]);

  // Overall School Metrics
  const schoolSummary = useMemo(() => {
    let totalEnrolled = 0;
    let totalStudentDays = 0;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalLeaveDays = 0;

    classMonthlyData.forEach((c) => {
      totalEnrolled += c.totalEnrolled;
      totalStudentDays += c.totalPossibleStudentDays;
      totalPresentDays += c.classTotalPresentDays;
      totalAbsentDays += c.classTotalAbsentDays;
      totalLeaveDays += c.classTotalLeaveDays;
    });

    const overallMonthlyPct =
      totalStudentDays > 0 ? Math.round((totalPresentDays / totalStudentDays) * 100) : 100;

    const bestClass = [...classMonthlyData].sort((a, b) => b.classAvgPct - a.classAvgPct)[0];

    return {
      totalEnrolled,
      totalStudentDays,
      totalPresentDays,
      totalAbsentDays,
      totalLeaveDays,
      overallMonthlyPct,
      bestClass: bestClass ? `${bestClass.cls.name} (${bestClass.classAvgPct}%)` : 'N/A',
      classesCount: classMonthlyData.length,
    };
  }, [classMonthlyData]);

  const getPerformanceBadge = (pct: number) => {
    if (pct >= 95) {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[10px]">
          A+ (Outstanding)
        </span>
      );
    }
    if (pct >= 85) {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300 font-bold text-[10px]">
          A (Commendable)
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-[10px]">
          B (Satisfactory)
        </span>
      );
    }
    return (
      <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 font-black text-[10px]">
        C (Needs Attention)
      </span>
    );
  };

  const getStatusInitial = (status: AttendanceStatus, isSunday: boolean) => {
    switch (status) {
      case 'Present':
        return <span className="font-bold text-emerald-800">P</span>;
      case 'Absent':
        return <span className="font-extrabold text-red-700 bg-red-100 px-1 rounded">A</span>;
      case 'Leave':
        return <span className="font-bold text-amber-800 bg-amber-100 px-1 rounded">L</span>;
      case 'Half-Day':
        return <span className="font-bold text-indigo-800">HD</span>;
      case 'Late':
        return <span className="font-bold text-yellow-800">LT</span>;
      case 'Holiday':
        return <span className="font-bold text-sky-800">H</span>;
      case 'Sunday':
        return <span className="font-bold text-purple-700">S</span>;
      default:
        return isSunday ? (
          <span className="font-bold text-purple-700">S</span>
        ) : (
          <span className="font-bold text-emerald-800">P</span>
        );
    }
  };

  return (
    <div className="bg-white p-5 max-w-[1240px] mx-auto border-2 border-slate-400 rounded-lg shadow-sm text-slate-800 font-sans text-xs print-container">
      {/* Official Institutional Report Header */}
      <ReportHeader
        title="ALL-CLASSES CONSOLIDATED MONTHLY ATTENDANCE REGISTER"
        subTitle={`OFFICIAL INSTITUTIONAL MONTHLY MUSTER ROLL • ACADEMIC MONTH: ${monthName.toUpperCase()} ${year}`}
        badge={`MONTH: ${monthName.slice(0, 3).toUpperCase()}-${year}`}
      />

      {/* School Executive Monthly KPI Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-xl p-3.5 mb-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-800/80 pb-2 mb-2 text-xs">
          <div>
            <span className="text-blue-300 font-bold uppercase tracking-wider text-[10px] block">
              SCHOOL-WIDE MONTHLY ATTENDANCE MUSTER ROLL
            </span>
            <span className="font-extrabold text-sm sm:text-base text-white">
              {settings.name || settings.schoolName} — Academic Year {settings.academicSession}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="bg-blue-800/80 text-blue-200 px-2.5 py-1 rounded-md font-bold">
              {schoolSummary.classesCount} Classes Reporting
            </span>
            <span className="bg-amber-400 text-blue-950 px-2.5 py-1 rounded-md font-extrabold">
              {monthName} {year}
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-white/10 rounded-lg p-2 border border-white/10">
            <span className="text-[10px] text-slate-300 uppercase block font-semibold">Working Days</span>
            <span className="text-base sm:text-lg font-black text-white">{totalWorkingDays}</span>
            <span className="text-[9px] text-slate-300 block">({totalSundays} Sundays)</span>
          </div>

          <div className="bg-white/10 rounded-lg p-2 border border-white/10">
            <span className="text-[10px] text-slate-300 uppercase block font-semibold">Total Students</span>
            <span className="text-base sm:text-lg font-black text-white">{schoolSummary.totalEnrolled}</span>
            <span className="text-[9px] text-slate-300 block">All Classes</span>
          </div>

          <div className="bg-emerald-500/20 rounded-lg p-2 border border-emerald-400/30">
            <span className="text-[10px] text-emerald-300 uppercase block font-semibold">Total Presents</span>
            <span className="text-base sm:text-lg font-black text-emerald-300">{schoolSummary.totalPresentDays}</span>
            <span className="text-[9px] text-emerald-200 block">Student Days</span>
          </div>

          <div className="bg-red-500/20 rounded-lg p-2 border border-red-400/30">
            <span className="text-[10px] text-red-300 uppercase block font-semibold">Total Absences</span>
            <span className="text-base sm:text-lg font-black text-red-300">{schoolSummary.totalAbsentDays}</span>
            <span className="text-[9px] text-red-200 block">Student Days</span>
          </div>

          <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-400/30">
            <span className="text-[10px] text-blue-200 uppercase block font-semibold">School Monthly Avg</span>
            <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
              {schoolSummary.overallMonthlyPct}%
            </span>
            <span className="text-[9px] text-blue-200 block">Attendance Rate</span>
          </div>

          <div className="bg-amber-500/20 rounded-lg p-2 border border-amber-400/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-amber-200 uppercase block font-semibold">Top Performing</span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate block mt-0.5">
              {schoolSummary.bestClass}
            </span>
            <span className="text-[9px] text-amber-200 block">Best Attendance</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: ALL-CLASSES MONTHLY COMPARATIVE PERFORMANCE MASTER TABLE */}
      {(viewMode === 'all' || viewMode === 'summary_only') && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
              <span>Section 1: All-Classes Monthly Comparative Master Performance Matrix</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              Institutional Evaluation Ledger
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-left mb-3">
            <thead>
              <tr className="bg-blue-950 text-white text-[10px] font-bold">
                <th className="border border-slate-400 p-2 text-center w-8">S.N.</th>
                <th className="border border-slate-400 p-2 w-32">Class &amp; Section</th>
                <th className="border border-slate-400 p-2">Class Teacher In-charge</th>
                <th className="border border-slate-400 p-2 text-center w-16">Enrolled</th>
                <th className="border border-slate-400 p-2 text-center w-16">Working Days</th>
                <th className="border border-slate-400 p-2 text-center w-24">Total Student Days</th>
                <th className="border border-slate-400 p-2 text-center w-20 bg-emerald-950 text-emerald-200">
                  Total Present
                </th>
                <th className="border border-slate-400 p-2 text-center w-18 bg-red-950 text-red-200">
                  Total Absent
                </th>
                <th className="border border-slate-400 p-2 text-center w-16 bg-amber-950 text-amber-200">
                  Leaves
                </th>
                <th className="border border-slate-400 p-2 text-center w-20 bg-blue-900 text-amber-300 font-black">
                  Monthly %
                </th>
                <th className="border border-slate-400 p-2 text-center w-28">Performance Rating</th>
              </tr>
            </thead>
            <tbody>
              {classMonthlyData.map((c, idx) => (
                <tr key={c.cls.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-500 font-medium">
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
                  <td className="border border-slate-300 p-1.5 text-center text-slate-700 font-mono">
                    {c.workingDays}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-600 font-mono text-[11px]">
                    {c.totalPossibleStudentDays}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-black text-emerald-800 bg-emerald-50/50 font-mono">
                    {c.classTotalPresentDays}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-red-700 bg-red-50/50 font-mono">
                    {c.classTotalAbsentDays}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-medium text-amber-800 bg-amber-50/50 font-mono">
                    {c.classTotalLeaveDays}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-black text-blue-950 bg-blue-50/60 font-mono text-xs">
                    {c.classAvgPct}%
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center">
                    {getPerformanceBadge(c.classAvgPct)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Grand Total Row */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-[11px]">
                <td colSpan={3} className="border border-slate-600 p-2 text-right uppercase tracking-wider">
                  School Grand Total ({schoolSummary.classesCount} Classes):
                </td>
                <td className="border border-slate-600 p-2 text-center text-white font-bold">
                  {schoolSummary.totalEnrolled}
                </td>
                <td className="border border-slate-600 p-2 text-center text-slate-300 font-mono">
                  {totalWorkingDays}
                </td>
                <td className="border border-slate-600 p-2 text-center text-slate-300 font-mono">
                  {schoolSummary.totalStudentDays}
                </td>
                <td className="border border-slate-600 p-2 text-center text-emerald-300 font-black font-mono">
                  {schoolSummary.totalPresentDays}
                </td>
                <td className="border border-slate-600 p-2 text-center text-red-300 font-black font-mono">
                  {schoolSummary.totalAbsentDays}
                </td>
                <td className="border border-slate-600 p-2 text-center text-amber-300 font-bold font-mono">
                  {schoolSummary.totalLeaveDays}
                </td>
                <td className="border border-slate-600 p-2 text-center text-amber-300 font-black text-xs font-mono">
                  {schoolSummary.overallMonthlyPct}%
                </td>
                <td className="border border-slate-600 p-2 text-center text-slate-300 text-[10px]">
                  Official Audit Record
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* SECTION 2: DETAILED CLASS-BY-CLASS MONTHLY ATTENDANCE REGISTERS (CBSE 31-DAY MATRIX) */}
      {(viewMode === 'all' || viewMode === 'matrix_only') && (
        <div className="space-y-6">
          <div className="border-t-2 border-dashed border-slate-400 pt-4 mb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-blue-950 text-xs sm:text-sm uppercase tracking-wide">
              Section 2: Class-by-Class Monthly Attendance Registers (CBSE 31-Day Ledger)
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Every class full month breakdown included in this single PDF document
            </span>
          </div>

          {classMonthlyData.map((c, classIdx) => (
            <div
              key={c.cls.id}
              className={`border border-slate-300 rounded-lg p-3 bg-white shadow-2xs ${
                classIdx < classMonthlyData.length - 1 ? 'page-break-after' : ''
              }`}
            >
              {/* Class Header Strip */}
              <div className="bg-slate-100 border border-slate-300 rounded-md p-2 mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-950 text-white font-black text-xs flex items-center justify-center font-mono">
                    {classIdx + 1}
                  </span>
                  <div>
                    <h4 className="font-black text-blue-950 text-xs sm:text-sm uppercase">
                      {c.cls.name} — Monthly Attendance Matrix
                    </h4>
                    <span className="text-[10px] text-slate-600">
                      Class Teacher: <strong className="text-slate-800">{c.teacherName}</strong> • Enrolled:{' '}
                      <strong>{c.totalEnrolled}</strong> • Room: {c.cls.roomNumber || 'A-1'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Class Average:</span>
                  <span className="px-2.5 py-1 rounded bg-blue-950 text-amber-300 font-black font-mono text-xs shadow-xs">
                    {c.classAvgPct}%
                  </span>
                  {getPerformanceBadge(c.classAvgPct)}
                </div>
              </div>

              {/* 31-Day Matrix Table */}
              {c.studentMatrix.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-xs">
                  No active students enrolled in this class.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-left text-[9px]">
                    <thead>
                      <tr className="bg-blue-950 text-white font-bold">
                        <th className="border border-slate-400 p-1 text-center w-6">#</th>
                        <th className="border border-slate-400 p-1 w-8 text-center">Roll</th>
                        <th className="border border-slate-400 p-1 min-w-28">Student Name</th>
                        {dayDetails.map((d) => (
                          <th
                            key={d.day}
                            className={`border border-slate-400 p-0.5 text-center w-5 ${
                              d.isSunday ? 'bg-purple-900 text-purple-200' : ''
                            }`}
                          >
                            <span className="block text-[8px] font-mono leading-tight">{d.day}</span>
                            <span className="block text-[7px] font-normal leading-tight opacity-80">
                              {d.dayChar}
                            </span>
                          </th>
                        ))}
                        <th className="border border-slate-400 p-1 text-center w-6 bg-emerald-900 text-emerald-200">
                          P
                        </th>
                        <th className="border border-slate-400 p-1 text-center w-6 bg-red-900 text-red-200">
                          A
                        </th>
                        <th className="border border-slate-400 p-1 text-center w-6 bg-amber-900 text-amber-200">
                          L
                        </th>
                        <th className="border border-slate-400 p-1 text-center w-8 bg-blue-900 text-amber-300 font-black">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.studentMatrix.map((item, sIdx) => {
                        const st = item.student;
                        return (
                          <tr
                            key={st.id}
                            className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                          >
                            <td className="border border-slate-300 p-0.5 text-center font-mono text-slate-500">
                              {sIdx + 1}
                            </td>
                            <td className="border border-slate-300 p-0.5 text-center font-bold text-slate-800">
                              {st.rollNo}
                            </td>
                            <td className="border border-slate-300 p-0.5 font-bold text-blue-950 uppercase truncate max-w-[120px]">
                              {st.fullName}
                            </td>
                            {item.dailyStatus.map((ds, dayIdx) => (
                              <td
                                key={dayIdx}
                                className={`border border-slate-300 p-0.5 text-center text-[8px] ${
                                  ds.isSunday ? 'bg-purple-50/60 font-semibold' : ''
                                }`}
                              >
                                {getStatusInitial(ds.status, ds.isSunday)}
                              </td>
                            ))}
                            <td className="border border-slate-300 p-0.5 text-center font-bold text-emerald-800 bg-emerald-50/50">
                              {item.present}
                            </td>
                            <td className="border border-slate-300 p-0.5 text-center font-bold text-red-700 bg-red-50/50">
                              {item.absent}
                            </td>
                            <td className="border border-slate-300 p-0.5 text-center font-medium text-amber-800 bg-amber-50/50">
                              {item.leave}
                            </td>
                            <td className="border border-slate-300 p-0.5 text-center font-black text-blue-950 bg-blue-50/60 font-mono">
                              {item.percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Class Daily Totals Footer */}
                    <tfoot>
                      <tr className="bg-slate-200 text-slate-900 font-bold text-[8px]">
                        <td colSpan={3} className="border border-slate-400 p-1 text-right uppercase">
                          Daily Present Count:
                        </td>
                        {dayDetails.map((d) => {
                          const countPresentOnDay = c.studentMatrix.filter((sm) => {
                            const ds = sm.dailyStatus.find((x) => x.dateStr === d.dateStr);
                            return ds?.status === 'Present' || ds?.status === 'Late';
                          }).length;

                          return (
                            <td
                              key={d.day}
                              className={`border border-slate-400 p-0.5 text-center ${
                                d.isSunday ? 'bg-purple-200 text-purple-900' : 'text-slate-800 font-bold'
                              }`}
                            >
                              {d.isSunday ? 'S' : countPresentOnDay}
                            </td>
                          );
                        })}
                        <td className="border border-slate-400 p-0.5 text-center font-black text-emerald-900">
                          {c.classTotalPresentDays}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-center font-black text-red-900">
                          {c.classTotalAbsentDays}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-center font-black text-amber-900">
                          {c.classTotalLeaveDays}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-center font-black text-blue-950 font-mono">
                          {c.classAvgPct}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Class Subtotal & Sign Note */}
              <div className="mt-2 text-[9px] text-slate-500 flex justify-between items-center px-1">
                <span>
                  {c.cls.name} Class Monthly Rate: <strong className="text-blue-950">{c.classAvgPct}%</strong> •{' '}
                  {c.totalEnrolled} Students Enrolled
                </span>
                <span className="italic">Class Teacher Sign: _____________________</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CBSE Mandatory Attendance Compliance Note */}
      <div className="mt-4 p-2.5 bg-blue-50/80 border border-blue-200 rounded-md text-[10px] text-blue-900">
        <p className="font-semibold text-slate-800">CBSE Attendance Regulation Rule 14.1:</p>
        <p className="text-slate-600 mt-0.5">
          "A minimum of 75% attendance is mandatory for candidates to appear in the Annual Board Examinations.
          Parents of students falling below 75% threshold must be served formal registered warning letters."
        </p>
      </div>

      {/* Official Signatures Block */}
      <ReportFooter
        notes="Official All-Classes Consolidated Monthly Attendance Register generated via SBSC Enterprise School ERP System. Approved for archival and institutional audit."
        showSignatures={true}
      />
    </div>
  );
};
