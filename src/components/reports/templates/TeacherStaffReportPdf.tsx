import React from 'react';
import { Teacher } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';

interface TeacherStaffReportPdfProps {
  teachers: Teacher[];
}

export const TeacherStaffReportPdf: React.FC<TeacherStaffReportPdfProps> = ({ teachers }) => {
  const { settings } = useSchool();
  const totalSalaries = teachers.reduce((acc, t) => acc + t.salary, 0);

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="FACULTY & TEACHING STAFF DIRECTORY"
        subTitle={`Total Faculty Members: ${teachers.length} (Session: ${settings.academicSession})`}
        badge={`FACULTY: ${teachers.length}`}
      />

      <table className="w-full border-collapse border border-slate-400 text-left mb-4">
        <thead>
          <tr className="bg-blue-950 text-white text-[10px] font-bold">
            <th className="border border-slate-400 p-2 text-center w-8">#</th>
            <th className="border border-slate-400 p-2 w-20">Emp ID</th>
            <th className="border border-slate-400 p-2">Teacher Name</th>
            <th className="border border-slate-400 p-2">Designation & Role</th>
            <th className="border border-slate-400 p-2">Qualifications</th>
            <th className="border border-slate-400 p-2">Subjects Handled</th>
            <th className="border border-slate-400 p-2 w-24">Contact Phone</th>
            <th className="border border-slate-400 p-2 text-right w-24">Monthly Pay</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher, idx) => (
            <tr key={teacher.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-500">{idx + 1}</td>
              <td className="border border-slate-300 p-1.5 font-mono text-[10px] font-bold text-blue-900">{teacher.empId}</td>
              <td className="border border-slate-300 p-1.5 font-bold text-slate-900 uppercase">{teacher.name}</td>
              <td className="border border-slate-300 p-1.5 font-medium text-slate-700">{teacher.designation}</td>
              <td className="border border-slate-300 p-1.5 text-[11px] text-slate-600">{teacher.qualification}</td>
              <td className="border border-slate-300 p-1.5 text-slate-700 font-semibold">{teacher.subjects.join(', ')}</td>
              <td className="border border-slate-300 p-1.5 text-slate-700 font-mono text-[10px]">{teacher.phone}</td>
              <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">
                {settings.currencySymbol} {teacher.salary.toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold text-xs">
            <td colSpan={7} className="border border-slate-300 p-2 text-right uppercase">
              Total Monthly Payroll Commitment:
            </td>
            <td className="border border-slate-300 p-2 text-right text-blue-950 text-sm font-extrabold">
              {settings.currencySymbol} {totalSalaries.toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      <ReportFooter />
    </div>
  );
};
