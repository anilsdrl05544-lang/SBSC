import React from 'react';
import { AttendanceRecord, Teacher } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';

interface StaffAttendanceReportPdfProps {
  date: string;
  departmentFilter?: string;
}

export const StaffAttendanceReportPdf: React.FC<StaffAttendanceReportPdfProps> = ({
  date,
  departmentFilter,
}) => {
  const { teachers, attendance } = useSchool();

  const filteredTeachers = teachers.filter((t) => {
    if (departmentFilter && departmentFilter !== 'All') {
      return t.designation.toLowerCase().includes(departmentFilter.toLowerCase()) ||
        t.subjects.some((s) => s.toLowerCase().includes(departmentFilter.toLowerCase()));
    }
    return true;
  });

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

  // Calculate statistics
  const totalStaff = filteredTeachers.length;
  const staffRecords = filteredTeachers.map((t) => {
    const rec = attendance.find(
      (a) => a.date === date && a.targetId === t.id && a.type === 'teacher'
    );
    return {
      teacher: t,
      status: rec?.status || 'Present',
      remarks: rec?.remarks || '',
    };
  });

  const countP = staffRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  const countA = staffRecords.filter((r) => r.status === 'Absent').length;
  const countL = staffRecords.filter((r) => r.status === 'Leave').length;
  const countSun = staffRecords.filter((r) => r.status === 'Sunday').length;
  const countHol = staffRecords.filter((r) => r.status === 'Holiday').length;
  const countHD = staffRecords.filter((r) => r.status === 'Half-Day').length;

  const workingDays = totalStaff - countSun - countHol;
  const staffAttPct =
    workingDays > 0
      ? Math.round(((countP + countHD * 0.5) / workingDays) * 100)
      : countSun > 0 || countHol > 0
      ? 100
      : 0;

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="TEACHERS & STAFF DAILY ATTENDANCE REGISTER"
        subTitle={`Official Staff Duty & Attendance Ledger • Date: ${date} ${
          departmentFilter && departmentFilter !== 'All' ? `| Filter: ${departmentFilter}` : '| All Faculty'
        }`}
        badge={`STAFF ATTENDANCE • ${date}`}
      />

      {/* Staff Attendance Table */}
      <table className="w-full border-collapse border border-slate-400 text-left mb-4">
        <thead>
          <tr className="bg-blue-950 text-white text-[10px] font-bold uppercase tracking-wider">
            <th className="border border-slate-400 p-2 text-center w-10">S.N.</th>
            <th className="border border-slate-400 p-2 w-24">Emp ID</th>
            <th className="border border-slate-400 p-2">Staff / Teacher Name</th>
            <th className="border border-slate-400 p-2 w-36">Designation & Subject</th>
            <th className="border border-slate-400 p-2 w-20 text-center">In-Time</th>
            <th className="border border-slate-400 p-2 w-24 text-center">Status</th>
            <th className="border border-slate-400 p-2">Remarks / Reason</th>
            <th className="border border-slate-400 p-2 w-24 text-center">Staff Sign</th>
          </tr>
        </thead>
        <tbody>
          {staffRecords.map(({ teacher, status, remarks }, idx) => (
            <tr key={teacher.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-slate-300 p-2 text-center font-medium text-slate-500">
                {idx + 1}
              </td>
              <td className="border border-slate-300 p-2 font-mono font-bold text-[10px] text-blue-950">
                {teacher.empId}
              </td>
              <td className="border border-slate-300 p-2">
                <div className="font-bold text-slate-900 uppercase">{teacher.name}</div>
                <div className="text-[10px] text-slate-500">{teacher.qualification} • {teacher.phone}</div>
              </td>
              <td className="border border-slate-300 p-2 font-medium text-slate-700">
                <div className="font-semibold text-slate-900">{teacher.designation}</div>
                <div className="text-[10px] text-slate-500">{teacher.subjects.join(', ')}</div>
              </td>
              <td className="border border-slate-300 p-2 text-center text-slate-600 font-mono text-[10px]">
                {status === 'Present' || status === 'Late' || status === 'Half-Day' ? '08:30 AM' : '-'}
              </td>
              <td className="border border-slate-300 p-2 text-center font-bold">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeClass(
                    status
                  )}`}
                >
                  {status === 'Half-Day' ? 'HALF DAY' : status.toUpperCase()}
                </span>
              </td>
              <td className="border border-slate-300 p-2 text-slate-600 italic text-[11px]">
                {remarks || (status === 'Sunday' ? 'Weekly Off' : status === 'Holiday' ? 'Holiday' : '-')}
              </td>
              <td className="border border-slate-300 p-2 text-center">
                <div className="h-6 border-b border-dashed border-slate-300"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Staff Attendance KPI Summary Bar */}
      <div className="grid grid-cols-7 gap-2 bg-slate-50 border border-slate-300 rounded p-2.5 text-center mb-4 text-xs">
        <div className="bg-white p-1.5 rounded border border-slate-200">
          <span className="text-[9px] text-slate-500 font-bold block uppercase">TOTAL STAFF</span>
          <span className="font-extrabold text-slate-900 text-sm">{totalStaff}</span>
        </div>
        <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
          <span className="text-[9px] text-emerald-700 font-bold block uppercase">PRESENT</span>
          <span className="font-extrabold text-emerald-800 text-sm">{countP}</span>
        </div>
        <div className="bg-red-50 p-1.5 rounded border border-red-200">
          <span className="text-[9px] text-red-700 font-bold block uppercase">ABSENT</span>
          <span className="font-extrabold text-red-800 text-sm">{countA}</span>
        </div>
        <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
          <span className="text-[9px] text-amber-700 font-bold block uppercase">LEAVE</span>
          <span className="font-extrabold text-amber-800 text-sm">{countL}</span>
        </div>
        <div className="bg-purple-50 p-1.5 rounded border border-purple-200">
          <span className="text-[9px] text-purple-700 font-bold block uppercase">SUNDAY</span>
          <span className="font-extrabold text-purple-800 text-sm">{countSun}</span>
        </div>
        <div className="bg-sky-50 p-1.5 rounded border border-sky-200">
          <span className="text-[9px] text-sky-700 font-bold block uppercase">HOLIDAY</span>
          <span className="font-extrabold text-sky-800 text-sm">{countHol}</span>
        </div>
        <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
          <span className="text-[9px] text-blue-700 font-bold block uppercase">STAFF ATT %</span>
          <span className="font-extrabold text-blue-900 text-sm">{staffAttPct}%</span>
        </div>
      </div>

      {/* Staff Signature Footer */}
      <ReportFooter />
    </div>
  );
};
