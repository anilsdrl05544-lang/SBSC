import React from 'react';
import { ClassInfo, AttendanceStatus } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { AllClassesMonthlyAttendanceReportPdf } from './AllClassesMonthlyAttendanceReportPdf';

interface StudentMonthlyAttendanceReportPdfProps {
  year: number;
  month: number; // 1 - 12
  selectedClass?: ClassInfo;
  section?: string;
}

export const StudentMonthlyAttendanceReportPdf: React.FC<StudentMonthlyAttendanceReportPdfProps> = ({
  year,
  month,
  selectedClass,
  section = 'A',
}) => {
  const { students, attendance, settings } = useSchool();

  // If no specific class or 'all' is selected, render the master all-classes monthly report!
  if (!selectedClass || selectedClass.id === 'all') {
    return <AllClassesMonthlyAttendanceReportPdf year={year} month={month} />;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[month - 1] || 'September';

  // Total days in the selected month
  const totalDays = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Filter students by class and section (sorted alphabetically A-Z)
  const filteredStudents = students
    .filter((s) => {
      if (selectedClass && s.classId !== selectedClass.id) return false;
      if (section && s.section !== section) return false;
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));

  // Calculate day info (Day of week, isSunday)
  const dayDetails = daysArray.map((day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun
    const dayChar = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];
    const isSunday = dayOfWeek === 0;
    return { day, dateStr, dayOfWeek, dayChar, isSunday };
  });

  // Map attendance for quick lookup: map[studentId_dateStr] = AttendanceRecord
  const attendanceMap = new Map<string, AttendanceStatus>();
  const remarksMap = new Map<string, string>();

  attendance.forEach((rec) => {
    if (rec.type === 'student') {
      attendanceMap.set(`${rec.targetId}_${rec.date}`, rec.status);
      if (rec.remarks) {
        remarksMap.set(`${rec.targetId}_${rec.date}`, rec.remarks);
      }
    }
  });

  // Aggregate monthly stats for each student
  const studentStats = filteredStudents.map((student) => {
    let p = 0; // Present
    let a = 0; // Absent
    let l = 0; // Leave
    let s = 0; // Sunday
    let h = 0; // Holiday
    let hd = 0; // Half Day
    let lt = 0; // Late

    dayDetails.forEach(({ dateStr, isSunday }) => {
      const explicitStatus = attendanceMap.get(`${student.id}_${dateStr}`);
      const status: AttendanceStatus = explicitStatus || (isSunday ? 'Sunday' : 'Present');

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
    const percentage = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 100;

    return {
      student,
      p,
      a,
      l,
      s,
      h,
      hd,
      lt,
      workingDays,
      effectivePresent,
      percentage,
    };
  });

  // Calculate Overall Class Monthly Metrics
  const totalStudents = filteredStudents.length;
  const totalSundays = dayDetails.filter((d) => d.isSunday).length;
  const totalWorkingDays = totalDays - totalSundays;
  const avgClassAttendance =
    studentStats.length > 0
      ? Math.round(studentStats.reduce((acc, curr) => acc + curr.percentage, 0) / studentStats.length)
      : 100;

  return (
    <div className="bg-white p-5 max-w-[1120px] mx-auto border-2 border-slate-400 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      {/* Official School Header */}
      <ReportHeader
        title="STUDENTS MONTHLY ATTENDANCE REGISTER (CBSE MATRIX)"
        subTitle={`ACADEMIC MONTH: ${monthName.toUpperCase()} ${year} | CLASS: ${selectedClass?.name || 'All'} (SECTION: ${section || 'A'})`}
        badge={`MONTH: ${monthName.slice(0, 3).toUpperCase()}-${year}`}
      />

      {/* Class & Month Information Strip */}
      <div className="bg-slate-100 border border-slate-300 rounded-md p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 font-bold uppercase">Class & Section:</span>{' '}
            <span className="font-extrabold text-blue-950 font-mono">
              {selectedClass?.name || 'Class 10'} - {section}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Class Teacher:</span>{' '}
            <span className="font-bold text-slate-800">
              {selectedClass?.classTeacherId ? 'Mr. Anand Verma (PGT Math)' : 'Faculty Assigned'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Total Enrolled:</span>{' '}
            <span className="font-extrabold text-blue-900">{totalStudents} Students</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 font-bold uppercase">Month Days:</span>{' '}
            <span className="font-bold text-slate-900">{totalDays}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Working Days:</span>{' '}
            <span className="font-bold text-emerald-800">{totalWorkingDays}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold uppercase">Class Avg Attendance:</span>{' '}
            <span className="font-extrabold text-blue-950">{avgClassAttendance}%</span>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Matrix Table */}
      <div className="overflow-x-auto border border-slate-400 mb-3">
        <table className="w-full border-collapse text-left text-[9.5px]">
          <thead>
            {/* Day Numbers Row */}
            <tr className="bg-blue-950 text-white font-bold text-center">
              <th rowSpan={2} className="border border-slate-400 p-1 w-7 text-center">#</th>
              <th rowSpan={2} className="border border-slate-400 p-1 w-14 text-center">Adm No</th>
              <th rowSpan={2} className="border border-slate-400 p-1 w-8 text-center">Roll</th>
              <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[120px]">Student Name</th>
              
              {/* Day Headers (1 .. 30/31) */}
              {dayDetails.map(({ day, isSunday }) => (
                <th
                  key={day}
                  className={`border border-slate-400 p-0.5 text-center min-w-[20px] max-w-[24px] ${
                    isSunday ? 'bg-purple-900 text-amber-300' : 'bg-blue-900 text-white'
                  }`}
                >
                  {day}
                </th>
              ))}

              {/* Monthly Summary Headers */}
              <th colSpan={7} className="border border-slate-400 p-1 bg-slate-900 text-amber-300 uppercase tracking-wider">
                Monthly Totals
              </th>
            </tr>

            {/* Weekday Initials Row */}
            <tr className="bg-slate-200 text-slate-800 font-bold text-center text-[8.5px]">
              {dayDetails.map(({ day, dayChar, isSunday }) => (
                <th
                  key={day}
                  className={`border border-slate-400 p-0.5 ${
                    isSunday ? 'bg-purple-100 text-purple-900 font-black' : 'text-slate-700'
                  }`}
                >
                  {dayChar}
                </th>
              ))}

              <th className="border border-slate-400 p-1 w-6 bg-emerald-100 text-emerald-950 font-bold" title="Present (P)">P</th>
              <th className="border border-slate-400 p-1 w-6 bg-rose-100 text-rose-950 font-bold" title="Absent (A)">A</th>
              <th className="border border-slate-400 p-1 w-6 bg-amber-100 text-amber-950 font-bold" title="Leave (L)">L</th>
              <th className="border border-slate-400 p-1 w-6 bg-purple-100 text-purple-950 font-bold" title="Sunday (S)">S</th>
              <th className="border border-slate-400 p-1 w-6 bg-sky-100 text-sky-950 font-bold" title="Holiday (H)">H</th>
              <th className="border border-slate-400 p-1 w-6 bg-indigo-100 text-indigo-950 font-bold" title="Half Day (HD)">HD</th>
              <th className="border border-slate-400 p-1 w-10 bg-blue-100 text-blue-950 font-black text-center" title="Attendance Percentage">% Att</th>
            </tr>
          </thead>

          <tbody>
            {studentStats.map(({ student, p, a, l, s, h, hd, percentage }, idx) => (
              <tr
                key={student.id}
                className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100'}
              >
                <td className="border border-slate-300 p-1 text-center font-medium text-slate-500">{idx + 1}</td>
                <td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-700">{student.admissionNo.replace('SBSC/', '')}</td>
                <td className="border border-slate-300 p-1 text-center font-extrabold text-blue-950">{student.rollNo}</td>
                <td className="border border-slate-300 p-1 font-bold text-slate-900 uppercase truncate max-w-[130px]" title={student.fullName}>
                  {student.fullName}
                </td>

                {/* Day Matrix Cells */}
                {dayDetails.map(({ day, dateStr, isSunday }) => {
                  const explicit = attendanceMap.get(`${student.id}_${dateStr}`);
                  const status: AttendanceStatus = explicit || (isSunday ? 'Sunday' : 'Present');

                  let text = 'P';
                  let cellStyle = 'text-emerald-700 font-bold';

                  if (status === 'Absent') {
                    text = 'A';
                    cellStyle = 'bg-rose-100 text-rose-800 font-extrabold';
                  } else if (status === 'Leave') {
                    text = 'L';
                    cellStyle = 'bg-amber-100 text-amber-800 font-bold';
                  } else if (status === 'Sunday') {
                    text = 'S';
                    cellStyle = 'bg-purple-50 text-purple-700 font-medium';
                  } else if (status === 'Holiday') {
                    text = 'H';
                    cellStyle = 'bg-sky-100 text-sky-800 font-bold';
                  } else if (status === 'Half-Day') {
                    text = '½';
                    cellStyle = 'bg-indigo-100 text-indigo-800 font-bold';
                  } else if (status === 'Late') {
                    text = 'Lt';
                    cellStyle = 'bg-yellow-100 text-yellow-800 font-bold';
                  }

                  return (
                    <td
                      key={day}
                      className={`border border-slate-300 p-0.5 text-center text-[9px] ${cellStyle}`}
                      title={`${student.fullName} on ${dateStr}: ${status}`}
                    >
                      {text}
                    </td>
                  );
                })}

                {/* Monthly Aggregates */}
                <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800 bg-emerald-50/50">{p}</td>
                <td className="border border-slate-300 p-1 text-center font-bold text-rose-800 bg-rose-50/50">{a > 0 ? a : '-'}</td>
                <td className="border border-slate-300 p-1 text-center font-bold text-amber-800 bg-amber-50/50">{l > 0 ? l : '-'}</td>
                <td className="border border-slate-300 p-1 text-center font-medium text-purple-800 bg-purple-50/50">{s}</td>
                <td className="border border-slate-300 p-1 text-center font-medium text-sky-800 bg-sky-50/50">{h > 0 ? h : '-'}</td>
                <td className="border border-slate-300 p-1 text-center font-medium text-indigo-800 bg-indigo-50/50">{hd > 0 ? hd : '-'}</td>
                <td className="border border-slate-300 p-1 text-center font-extrabold text-blue-950 bg-blue-50">
                  <span className={`px-1 py-0.5 rounded text-[9px] ${percentage >= 75 ? 'text-emerald-800 font-extrabold' : 'text-rose-800 font-extrabold bg-rose-100'}`}>
                    {percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer: Daily Attendance Totals */}
          <tfoot>
            <tr className="bg-slate-200 text-slate-900 font-extrabold border-t-2 border-slate-400 text-center">
              <td colSpan={4} className="border border-slate-400 p-1 text-right pr-2 uppercase">
                Daily Present Total:
              </td>
              {dayDetails.map(({ day, dateStr, isSunday }) => {
                if (isSunday) {
                  return (
                    <td key={day} className="border border-slate-400 p-0.5 text-purple-900 bg-purple-100 text-[8px] font-bold">
                      Sun
                    </td>
                  );
                }
                const dayPresent = filteredStudents.filter((s) => {
                  const st = attendanceMap.get(`${s.id}_${dateStr}`) || 'Present';
                  return st === 'Present' || st === 'Late' || st === 'Half-Day';
                }).length;

                return (
                  <td key={day} className="border border-slate-400 p-0.5 text-emerald-900 bg-emerald-50 text-[9px] font-bold">
                    {dayPresent}
                  </td>
                );
              })}
              <td colSpan={7} className="border border-slate-400 p-1 text-center bg-blue-950 text-white font-bold">
                Class Avg: {avgClassAttendance}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend & Summary Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-[10px]">
        {/* Legend */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2 flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 uppercase">Status Legend:</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-800">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 text-center inline-block leading-3 text-[8px]">P</span> Present
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-800">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 text-center inline-block leading-3 text-[8px]">A</span> Absent
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-800">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 text-center inline-block leading-3 text-[8px]">L</span> Leave
          </span>
          <span className="flex items-center gap-1 font-semibold text-purple-800">
            <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 text-center inline-block leading-3 text-[8px]">S</span> Sunday
          </span>
          <span className="flex items-center gap-1 font-semibold text-sky-800">
            <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 text-center inline-block leading-3 text-[8px]">H</span> Holiday
          </span>
          <span className="flex items-center gap-1 font-semibold text-indigo-800">
            <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 text-center inline-block leading-3 text-[8px]">½</span> Half Day
          </span>
        </div>

        {/* Regulatory note */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
          <p className="font-semibold text-slate-800">CBSE Attendance Regulation Rule 14.1:</p>
          <p className="text-[9px] mt-0.5">
            A minimum of 75% aggregate attendance is mandatory for appearing in the annual/board examinations. Students falling below 75% are subject to detention unless supported by medical certificates.
          </p>
        </div>
      </div>

      {/* Official Signatures & Seal */}
      <ReportFooter />
    </div>
  );
};
