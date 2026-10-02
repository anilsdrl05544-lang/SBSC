import React from 'react';
import { Student, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';

interface StudentListPdfProps {
  students: Student[];
  selectedClass?: ClassInfo;
  section?: string;
}

export const StudentListPdf: React.FC<StudentListPdfProps> = ({ students, selectedClass, section }) => {
  const { classes } = useSchool();

  const sortedStudents = React.useMemo(() => {
    return [...students].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
    );
  }, [students]);

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="OFFICIAL ENROLLED STUDENT MASTER ROSTER"
        subTitle={
          selectedClass
            ? `Class: ${selectedClass.name} ${section ? `| Section: ${section}` : ''} (Total Students: ${sortedStudents.length} • Alphabetical A-Z)`
            : `Comprehensive School Roster (Total Enrolled: ${sortedStudents.length} • Alphabetical A-Z)`
        }
        badge={`TOTAL: ${sortedStudents.length}`}
      />

      <table className="w-full border-collapse border border-slate-400 text-left mb-4">
        <thead>
          <tr className="bg-blue-950 text-white text-[10px] font-bold">
            <th className="border border-slate-400 p-2 text-center w-10">S.N.</th>
            <th className="border border-slate-400 p-2 w-28">Admission No</th>
            <th className="border border-slate-400 p-2 w-14 text-center">Roll</th>
            <th className="border border-slate-400 p-2">Student Name (A-Z)</th>
            <th className="border border-slate-400 p-2 w-20">Class & Sec</th>
            <th className="border border-slate-400 p-2">Father's Name</th>
            <th className="border border-slate-400 p-2 w-24">Contact</th>
            <th className="border border-slate-400 p-2 w-14 text-center">Cat.</th>
            <th className="border border-slate-400 p-2 w-16 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student, idx) => {
            const classObj = classes.find((c) => c.id === student.classId);
            const currentLetter = student.fullName.trim().charAt(0).toUpperCase() || '#';
            const prevLetter =
              idx > 0 ? sortedStudents[idx - 1].fullName.trim().charAt(0).toUpperCase() || '#' : null;
            const isNewLetter = currentLetter !== prevLetter;
            const letterCount = sortedStudents.filter(
              (s) => (s.fullName.trim().charAt(0).toUpperCase() || '#') === currentLetter
            ).length;

            return (
              <React.Fragment key={student.id}>
                {isNewLetter && (
                  <tr className="bg-slate-800 text-white font-bold text-[10px]">
                    <td colSpan={9} className="border border-slate-600 px-2 py-1 bg-slate-800 text-amber-300">
                      <span className="inline-block bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded mr-2 text-[9px]">
                        {currentLetter}
                      </span>
                      ALPHABETICAL HEAD &ldquo;{currentLetter}&rdquo; &bull; {letterCount} Student{letterCount !== 1 ? 's' : ''}
                    </td>
                  </tr>
                )}
                <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-mono text-[10px] text-slate-800">{student.admissionNo}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">{student.rollNo}</td>
                  <td className="border border-slate-300 p-1.5 font-bold text-blue-950 uppercase">{student.fullName}</td>
                  <td className="border border-slate-300 p-1.5 font-semibold text-slate-700">
                    {classObj?.name || student.classId}-{student.section}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-medium text-slate-800">{student.fatherName}</td>
                  <td className="border border-slate-300 p-1.5 text-slate-700 font-mono text-[10px]">{student.guardianPhone}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600">{student.category}</td>
                  <td className="border border-slate-300 p-1.5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        student.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {student.status}
                    </span>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Summary Stat Footer */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-300 rounded p-2.5 text-xs text-slate-700 mb-4">
        <span>
          <b>Total Students:</b> {students.length}
        </span>
        <span>
          <b>Boys:</b> {students.filter((s) => s.gender === 'Male').length} | <b>Girls:</b>{' '}
          {students.filter((s) => s.gender === 'Female').length}
        </span>
        <span>
          <b>Active Enrolled:</b> {students.filter((s) => s.status === 'Active').length}
        </span>
      </div>

      <ReportFooter />
    </div>
  );
};
