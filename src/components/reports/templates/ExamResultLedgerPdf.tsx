import React from 'react';
import { Exam, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { Trophy } from 'lucide-react';

interface ExamResultLedgerPdfProps {
  exam: Exam;
  selectedClass?: ClassInfo;
}

export const ExamResultLedgerPdf: React.FC<ExamResultLedgerPdfProps> = ({ exam, selectedClass }) => {
  const { examMarks, classes } = useSchool();

  const filteredMarks = examMarks.filter((m) => {
    if (m.examId !== exam.id) return false;
    if (selectedClass && m.classId !== selectedClass.id) return false;
    return true;
  });

  // Sort by rank or percentage
  const sortedMarks = [...filteredMarks].sort((a, b) => b.totalMarks - a.totalMarks);

  return (
    <div className="bg-white p-6 max-w-[900px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="EXAMINATION RESULT GAZETTE & CONSOLIDATED LEDGER"
        subTitle={`Exam: ${exam.name} ${selectedClass ? `| Class: ${selectedClass.name}` : ''} (Session: ${exam.session})`}
        badge={`EVALUATED: ${sortedMarks.length}`}
      />

      <table className="w-full border-collapse border border-slate-400 text-left mb-4">
        <thead>
          <tr className="bg-blue-950 text-white text-[10px] font-bold text-center">
            <th className="border border-slate-400 p-2 w-10">Rank</th>
            <th className="border border-slate-400 p-2 w-12">Roll</th>
            <th className="border border-slate-400 p-2 text-left">Student Name</th>
            <th className="border border-slate-400 p-2 w-16">Class</th>
            <th className="border border-slate-400 p-2 w-24">Max Marks</th>
            <th className="border border-slate-400 p-2 w-24">Marks Scored</th>
            <th className="border border-slate-400 p-2 w-20">Percentage</th>
            <th className="border border-slate-400 p-2 w-16">Grade</th>
            <th className="border border-slate-400 p-2 w-24">Result</th>
          </tr>
        </thead>
        <tbody>
          {sortedMarks.map((mark, idx) => {
            const classObj = classes.find((c) => c.id === mark.classId);
            const rank = idx + 1;

            return (
              <tr key={mark.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 p-1.5 text-center font-extrabold">
                  {rank <= 3 ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                      <Trophy className="w-3 h-3 text-amber-600" /> #{rank}
                    </span>
                  ) : (
                    <span className="text-slate-600">#{rank}</span>
                  )}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">{mark.rollNo}</td>
                <td className="border border-slate-300 p-1.5 font-bold text-blue-950 uppercase">{mark.studentName}</td>
                <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-700">
                  {classObj?.name || mark.classId}-{mark.section}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-600">{mark.maxTotalMarks}</td>
                <td className="border border-slate-300 p-1.5 text-center font-extrabold text-blue-950">{mark.totalMarks}</td>
                <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">{mark.percentage.toFixed(1)}%</td>
                <td className="border border-slate-300 p-1.5 text-center font-extrabold text-amber-700">{mark.grade}</td>
                <td className="border border-slate-300 p-1.5 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                      mark.percentage >= 33 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {mark.percentage >= 33 ? 'PASSED' : 'REAPPEAR'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Class Statistics Analysis */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 rounded p-3 text-center mb-4">
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">TOTAL STUDENTS</span>
          <span className="font-extrabold text-slate-900 text-sm">{sortedMarks.length}</span>
        </div>
        <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
          <span className="text-[10px] text-emerald-700 font-bold block">CLASS PASS %</span>
          <span className="font-extrabold text-emerald-800 text-sm">
            {sortedMarks.length > 0
              ? Math.round((sortedMarks.filter((m) => m.percentage >= 33).length / sortedMarks.length) * 100)
              : 0}
            %
          </span>
        </div>
        <div className="bg-amber-50 p-2 rounded border border-amber-200">
          <span className="text-[10px] text-amber-800 font-bold block">TOP SCORE</span>
          <span className="font-extrabold text-amber-900 text-sm">
            {sortedMarks[0] ? `${sortedMarks[0].percentage.toFixed(1)}%` : '-'}
          </span>
        </div>
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <span className="text-[10px] text-blue-700 font-bold block">CLASS AVERAGE</span>
          <span className="font-extrabold text-blue-900 text-sm">
            {sortedMarks.length > 0
              ? (sortedMarks.reduce((s, m) => s + m.percentage, 0) / sortedMarks.length).toFixed(1)
              : 0}
            %
          </span>
        </div>
      </div>

      <ReportFooter />
    </div>
  );
};
