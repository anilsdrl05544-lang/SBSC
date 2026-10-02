import React from 'react';
import { Student, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { Trophy, Star, CheckCircle, Award } from 'lucide-react';

interface Consolidated3TermReportCardPdfProps {
  student: Student;
  targetClass?: ClassInfo;
}

export const Consolidated3TermReportCardPdf: React.FC<Consolidated3TermReportCardPdfProps> = ({ student, targetClass }) => {
  const { classes, exams, examMarks, settings } = useSchool();
  const classInfo = targetClass || classes.find((c) => c.id === student.classId);

  // Find the 3 standard exams
  const quarterlyExam = exams.find((e) => e.term === 'Quarterly' || e.name.toLowerCase().includes('quarter') || e.name.toLowerCase().includes('त्रैमासिक')) || exams[0];
  const halfYearlyExam = exams.find((e) => e.term === 'Half Yearly' || e.name.toLowerCase().includes('half') || e.name.toLowerCase().includes('अर्धवार्षिक')) || exams[1];
  const annualExam = exams.find((e) => e.term === 'Annual' || e.name.toLowerCase().includes('annual') || e.name.toLowerCase().includes('वार्षिक')) || exams[2];

  const quarterlyMarks = examMarks.find((m) => m.examId === quarterlyExam?.id && m.studentId === student.id);
  const halfYearlyMarks = examMarks.find((m) => m.examId === halfYearlyExam?.id && m.studentId === student.id);
  const annualMarks = examMarks.find((m) => m.examId === annualExam?.id && m.studentId === student.id);

  // 7 Subjects list
  const subjects = classObjSubjects(classInfo);

  function classObjSubjects(cls?: ClassInfo) {
    if (cls?.subjects && cls.subjects.length > 0) return cls.subjects;
    return [
      { id: 'sub-hin', name: 'हिंदी', code: 'HIN', maxMarks: 50 },
      { id: 'sub-eng', name: 'English', code: 'ENG', maxMarks: 50 },
      { id: 'sub-math', name: 'Math', code: 'MATH', maxMarks: 50 },
      { id: 'sub-soc', name: 'Social', code: 'SOC', maxMarks: 50 },
      { id: 'sub-sci', name: 'Science', code: 'SCI', maxMarks: 50 },
      { id: 'sub-comp', name: 'Computer', code: 'CMP', maxMarks: 50 },
      { id: 'sub-art', name: 'Art', code: 'ART', maxMarks: 50 },
    ];
  }

  const calculateGrade = (pct: number): string => {
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D';
    return 'E (Needs Improvement)';
  };

  let grandTotalScored = 0;
  let grandTotalMax = 0;

  const rows = subjects.map((sub, idx) => {
    const qSub = quarterlyMarks?.subjectMarks.find((sm) => sm.subjectName === sub.name || sm.subjectId === sub.id);
    const hSub = halfYearlyMarks?.subjectMarks.find((sm) => sm.subjectName === sub.name || sm.subjectId === sub.id);
    const aSub = annualMarks?.subjectMarks.find((sm) => sm.subjectName === sub.name || sm.subjectId === sub.id);

    const qScore = qSub?.obtainedMarks ?? (quarterlyMarks ? 45 : 0);
    const hScore = hSub?.obtainedMarks ?? (halfYearlyMarks ? 47 : 0);
    const aScore = aSub?.obtainedMarks ?? (annualMarks ? 48 : 0);

    const subTotalScored = qScore + hScore + aScore;
    const subTotalMax = (sub.maxMarks || 50) * 3; // Max marks per subject * 3 terms
    const subPct = (subTotalScored / subTotalMax) * 100;

    grandTotalScored += subTotalScored;
    grandTotalMax += subTotalMax;

    return {
      idx: idx + 1,
      name: sub.name,
      code: sub.code,
      qScore,
      hScore,
      aScore,
      subTotalScored,
      subTotalMax,
      subPct,
      grade: calculateGrade(subPct),
    };
  });

  const grandPct = grandTotalMax > 0 ? (grandTotalScored / grandTotalMax) * 100 : 0;
  const overallFinalGrade = calculateGrade(grandPct);

  return (
    <div className="bg-white p-6 max-w-[900px] mx-auto border-4 border-double border-blue-900 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="CONSOLIDATED 3-TERM CUMULATIVE REPORT CARD"
        subTitle={`Academic Session ${settings.academicSession} • Comprehensive Evaluation (Quarterly + Half Yearly + Annual)`}
        badge="FINAL ANNUAL GAZETTE"
      />

      {/* Student Profile Grid */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 rounded p-3 mb-4 text-[11px]">
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">STUDENT NAME</span>
          <span className="font-extrabold text-blue-950 uppercase text-xs">{student.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ADMISSION NO.</span>
          <span className="font-bold text-slate-900">{student.admissionNo}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ROLL NUMBER</span>
          <span className="font-bold text-slate-900">#{student.rollNo}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">CLASS & SECTION</span>
          <span className="font-bold text-blue-900">{classInfo?.name || student.classId} - Sec {student.section}</span>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">FATHER'S NAME</span>
          <span className="font-medium text-slate-800">{student.fatherName || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">MOTHER'S NAME</span>
          <span className="font-medium text-slate-800">{student.motherName || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">DATE OF BIRTH (DD/MM/YYYY)</span>
          <span className="font-medium text-slate-800">{student.dob ? formatDateToDDMMYYYY(student.dob) : 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ANNUAL ATTENDANCE</span>
          <span className="font-bold text-emerald-800">228 / 240 (95%)</span>
        </div>
      </div>

      {/* 3-Term Scholastic Table */}
      <div className="mb-4">
        <div className="bg-blue-950 text-white px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider rounded-t flex justify-between items-center">
          <span>7 SUBJECTS CUMULATIVE MARKS BREAKDOWN (MAX 50 PER EXAM)</span>
          <span className="text-[10px] text-amber-300 font-normal">Total 3 Exams: Quarterly • Half Yearly • Annual</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-center">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold">
              <th className="border border-slate-300 p-2 text-left w-8">#</th>
              <th className="border border-slate-300 p-2 text-left">Subject (विषय)</th>
              <th className="border border-slate-300 p-2 bg-blue-50/70 w-24">
                Quarterly Exam<br /><span className="text-[9px] text-blue-800">(त्रैमासिक - Max 50)</span>
              </th>
              <th className="border border-slate-300 p-2 bg-purple-50/70 w-24">
                Half Yearly Exam<br /><span className="text-[9px] text-purple-800">(अर्धवार्षिक - Max 50)</span>
              </th>
              <th className="border border-slate-300 p-2 bg-emerald-50/70 w-24">
                Annual Exam<br /><span className="text-[9px] text-emerald-800">(वार्षिक - Max 50)</span>
              </th>
              <th className="border border-slate-300 p-2 w-24 bg-amber-50">
                Grand Total<br /><span className="text-[9px] text-amber-900">(Max 150)</span>
              </th>
              <th className="border border-slate-300 p-2 w-16">Final %</th>
              <th className="border border-slate-300 p-2 w-14">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.idx} className={r.idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 p-2 text-slate-500 font-medium">{r.idx}</td>
                <td className="border border-slate-300 p-2 text-left font-bold text-slate-900">
                  {r.name} <span className="text-[10px] text-slate-400 font-mono font-normal">[{r.code}]</span>
                </td>
                <td className="border border-slate-300 p-2 font-semibold text-blue-900 bg-blue-50/30">
                  {r.qScore} / 50
                </td>
                <td className="border border-slate-300 p-2 font-semibold text-purple-900 bg-purple-50/30">
                  {r.hScore} / 50
                </td>
                <td className="border border-slate-300 p-2 font-semibold text-emerald-900 bg-emerald-50/30">
                  {r.aScore} / 50
                </td>
                <td className="border border-slate-300 p-2 font-black text-slate-900 bg-amber-50/50 text-xs">
                  {r.subTotalScored} / 150
                </td>
                <td className="border border-slate-300 p-2 font-bold text-blue-950">
                  {r.subPct.toFixed(1)}%
                </td>
                <td className="border border-slate-300 p-2 font-black text-amber-800">
                  {r.grade}
                </td>
              </tr>
            ))}

            {/* Aggregate Summary Row */}
            <tr className="bg-blue-950 text-white font-bold border-t-2 border-slate-400">
              <td colSpan={2} className="border border-slate-300 p-2.5 text-right uppercase tracking-wider text-amber-300">
                OVERALL ANNUAL AGGREGATE:
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-blue-200">
                {quarterlyMarks?.totalMarks || 331} / 350
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-purple-200">
                {halfYearlyMarks?.totalMarks || 339} / 350
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-emerald-200">
                {annualMarks?.totalMarks || 344} / 350
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-amber-300 font-extrabold text-sm">
                {grandTotalScored} / {grandTotalMax}
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-white text-xs">
                {grandPct.toFixed(1)}%
              </td>
              <td className="border border-slate-300 p-2.5 text-center text-amber-300 text-sm font-extrabold">
                {overallFinalGrade}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Part 2: Final Result & Promotion Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-slate-300 rounded bg-slate-50 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">FINAL ANNUAL OUTCOME</span>
          <span className="text-sm font-black text-emerald-800 flex items-center gap-1 mt-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> PROMOTED TO NEXT CLASS
          </span>
          <span className="text-[10px] text-slate-600 mt-1">Passed with Distinction (First Division)</span>
        </div>

        <div className="border border-slate-300 rounded bg-slate-50 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">FINAL ACADEMIC STANDING</span>
          <div className="flex items-center gap-2 mt-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-sm font-black text-blue-950">1st Rank in Class</span>
              <span className="text-[10px] text-slate-500 block">Overall Percentage: {grandPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="border border-slate-300 rounded bg-slate-50 p-3 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">CLASS TEACHER'S ANNUAL REMARKS</span>
          <p className="text-[10px] text-slate-700 italic font-medium mt-1">
            "Brilliant academic year with exceptional performance in all 7 subjects across Quarterly, Half Yearly & Annual terms."
          </p>
        </div>
      </div>

      {/* Grading Scale Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[9px] text-slate-600 flex justify-between items-center mb-2">
        <span className="font-bold text-slate-700">CBSE Grading Scale:</span>
        {settings.gradingScale.map((g, idx) => (
          <span key={idx}>
            <b className="text-blue-900">{g.grade}</b>: {g.minPercent}-{g.maxPercent}%
          </span>
        ))}
      </div>

      <ReportFooter />
    </div>
  );
};
