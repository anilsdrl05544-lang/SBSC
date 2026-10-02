import React, { useMemo } from 'react';
import { AttendanceRecord, Student, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { AllClassesDailyAttendanceReportPdf } from './AllClassesDailyAttendanceReportPdf';

interface AttendanceReportPdfProps {
  date: string;
  selectedClass?: ClassInfo;
  section?: string;
  simpleMode?: boolean;
}

export const AttendanceReportPdf: React.FC<AttendanceReportPdfProps> = ({ date, selectedClass, section, simpleMode = false }) => {
  const { students, attendance } = useSchool();

  // If no specific class or 'all' is selected, render the master all-classes daily report!
  if (!selectedClass || selectedClass.id === 'all') {
    return <AllClassesDailyAttendanceReportPdf date={date} />;
  }

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClass && s.classId !== selectedClass.id) return false;
        if (section && s.section !== section) return false;
        return true;
      })
      .sort((a, b) => {
        const rollA = parseInt(a.rollNo) || 0;
        const rollB = parseInt(b.rollNo) || 0;
        if (rollA > 0 && rollB > 0 && rollA !== rollB) return rollA - rollB;
        return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      });
  }, [students, selectedClass, section]);

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title={simpleMode ? "DAILY ATTENDANCE ROLL CALL (PRESENT / ABSENT)" : "DAILY / MONTHLY ATTENDANCE REGISTER"}
        subTitle={`Date: ${date} ${selectedClass ? `| Class: ${selectedClass.name} (Sec: ${section || 'All'})` : ''}`}
        badge={`DATE: ${date}`}
      />

      {simpleMode ? (
        /* Simplified Table: Just S.N., Roll, Student Name, Status */
        <table className="w-full border-collapse border border-slate-400 text-left mb-4">
          <thead>
            <tr className="bg-blue-950 text-white text-[11px] font-bold">
              <th className="border border-slate-400 p-2.5 text-center w-12">S.N.</th>
              <th className="border border-slate-400 p-2.5 text-center w-16">Roll No</th>
              <th className="border border-slate-400 p-2.5">Student Name</th>
              <th className="border border-slate-400 p-2.5 w-32 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const att = attendance.find(
                (a) => a.date === date && a.targetId === student.id && a.type === 'student'
              );
              const status = att?.status || 'Present';
              const isAbsent = status === 'Absent';

              return (
                <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-900">
                    {student.rollNo || '-'}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold text-blue-950 uppercase text-xs">
                    {student.fullName}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    <span
                      className={`inline-block px-3 py-1 rounded text-[11px] font-black tracking-wider ${
                        isAbsent
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isAbsent ? 'ABSENT' : 'PRESENT'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* Detailed Table */
        <table className="w-full border-collapse border border-slate-400 text-left mb-4">
          <thead>
            <tr className="bg-blue-950 text-white text-[10px] font-bold">
              <th className="border border-slate-400 p-2 text-center w-10">S.N.</th>
              <th className="border border-slate-400 p-2 w-28">Admission No</th>
              <th className="border border-slate-400 p-2 w-14 text-center">Roll</th>
              <th className="border border-slate-400 p-2">Student Name</th>
              <th className="border border-slate-400 p-2 w-28">Class & Section</th>
              <th className="border border-slate-400 p-2 w-24 text-center">Status</th>
              <th className="border border-slate-400 p-2">Remarks / Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const att = attendance.find(
                (a) => a.date === date && a.targetId === student.id && a.type === 'student'
              );
              const status = att?.status || 'Present'; // Default present if unmarked

              const getBadgeClass = (st: string) => {
                switch (st) {
                  case 'Present':
                    return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
                  case 'Absent':
                    return 'bg-red-100 text-red-800 border border-red-300';
                  case 'Leave':
                    return 'bg-amber-100 text-amber-800 border border-amber-300';
                  case 'Sunday':
                    return 'bg-purple-100 text-purple-800 border border-purple-300';
                  case 'Holiday':
                    return 'bg-sky-100 text-sky-800 border border-sky-300';
                  case 'Half-Day':
                    return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
                  case 'Late':
                    return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
                  default:
                    return 'bg-slate-100 text-slate-800 border border-slate-300';
                }
              };

              return (
                <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-mono text-[10px] text-slate-700">{student.admissionNo}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">{student.rollNo}</td>
                  <td className="border border-slate-300 p-1.5 font-bold text-blue-950 uppercase">{student.fullName}</td>
                  <td className="border border-slate-300 p-1.5 font-medium text-slate-700">
                    {selectedClass?.name || student.classId} - {student.section}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeClass(status)}`}>
                      {status === 'Half-Day' ? 'HALF DAY' : status.toUpperCase()}
                    </span>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-slate-600 italic text-[11px]">{att?.remarks || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Attendance Stats Footer */}
      {(() => {
        const total = filteredStudents.length;
        const records = filteredStudents.map((s) => {
          const rec = attendance.find((a) => a.date === date && a.targetId === s.id && a.type === 'student');
          return rec?.status || 'Present';
        });

        const countP = records.filter((st) => st === 'Present' || st === 'Late').length;
        const countA = records.filter((st) => st === 'Absent').length;
        const countL = records.filter((st) => st === 'Leave').length;
        const countSun = records.filter((st) => st === 'Sunday').length;
        const countHol = records.filter((st) => st === 'Holiday').length;
        const countHD = records.filter((st) => st === 'Half-Day').length;

        const workingDaysTotal = total - countSun - countHol;
        const attPct = workingDaysTotal > 0 ? Math.round(((countP + countHD * 0.5) / workingDaysTotal) * 100) : countSun > 0 || countHol > 0 ? 100 : 0;

        return (
          <div className="grid grid-cols-6 gap-2 bg-slate-50 border border-slate-300 rounded p-2.5 text-center mb-4 text-xs">
            <div className="bg-white p-1.5 rounded border border-slate-200">
              <span className="text-[9px] text-slate-500 font-bold block">TOTAL</span>
              <span className="font-extrabold text-slate-900 text-sm">{total}</span>
            </div>
            <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
              <span className="text-[9px] text-emerald-700 font-bold block">PRESENT</span>
              <span className="font-extrabold text-emerald-800 text-sm">{countP}</span>
            </div>
            <div className="bg-red-50 p-1.5 rounded border border-red-200">
              <span className="text-[9px] text-red-700 font-bold block">ABSENT</span>
              <span className="font-extrabold text-red-800 text-sm">{countA}</span>
            </div>
            <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
              <span className="text-[9px] text-amber-700 font-bold block">LEAVE / HD</span>
              <span className="font-extrabold text-amber-800 text-sm">{countL + countHD}</span>
            </div>
            <div className="bg-purple-50 p-1.5 rounded border border-purple-200">
              <span className="text-[9px] text-purple-700 font-bold block">SUN / HOLIDAY</span>
              <span className="font-extrabold text-purple-800 text-sm">{countSun + countHol}</span>
            </div>
            <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
              <span className="text-[9px] text-blue-700 font-bold block">PERCENTAGE</span>
              <span className="font-extrabold text-blue-900 text-sm">{attPct}%</span>
            </div>
          </div>
        );
      })()}

      <ReportFooter />
    </div>
  );
};
