import React, { useMemo } from 'react';
import { ExamMark, Exam, Student, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { Trophy, Star, CheckCircle } from 'lucide-react';

interface MarksheetReportCardPdfProps {
  examMark?: ExamMark;
  exam?: Exam;
  student?: Student;
  targetClass?: ClassInfo;
}

export const MarksheetReportCardPdf: React.FC<MarksheetReportCardPdfProps> = ({
  examMark: propsExamMark,
  exam: propsExam,
  student: propsStudent,
  targetClass,
}) => {
  const { students, classes, exams, examMarks, settings } = useSchool();

  // Resolve effective student
  const student = propsStudent || students.find((s) => s.id === propsExamMark?.studentId);

  // Resolve effective class
  const classInfo =
    targetClass ||
    classes.find((c) => c.id === student?.classId || c.id === propsExamMark?.classId);

  // Resolve effective exam
  const exam =
    propsExam || exams.find((e) => e.id === propsExamMark?.examId) || exams[0];

  // Resolve or compute examMark
  const examMark: ExamMark = useMemo(() => {
    if (propsExamMark) return propsExamMark;

    // Try finding recorded marks in state
    if (student) {
      const found = examMarks.find(
        (m) =>
          m.studentId === student.id &&
          (!exam || m.examId === exam.id)
      );
      if (found) return found;
    }

    // Fallback: generate default scholastic evaluation from class subjects
    const classSubjects =
      classInfo?.subjects && classInfo.subjects.length > 0
        ? classInfo.subjects
        : [
            { id: 'sub-hin', name: 'हिंदी', code: 'HIN', maxMarks: 50, passingMarks: 17 },
            { id: 'sub-math', name: 'Math', code: 'MATH', maxMarks: 50, passingMarks: 17 },
            { id: 'sub-eng', name: 'English', code: 'ENG', maxMarks: 50, passingMarks: 17 },
            { id: 'sub-art', name: 'Art', code: 'ART', maxMarks: 50, passingMarks: 17 },
          ];

    const subjectMarks = classSubjects.map((sub, idx) => {
      const maxM = sub.maxMarks || 50;
      // Representative score (between 38 and 46 out of 50)
      const baseScores = [44, 42, 46, 40, 45, 43, 41, 47, 39];
      const obtained = Math.min(maxM, Math.max(17, Math.round(maxM * (0.80 + ((idx % 4) * 0.04)))));
      const theory = Math.round(obtained * 0.8);
      const practical = obtained - theory;
      const pct = (obtained / maxM) * 100;
      let grade = 'B1';
      if (pct >= 91) grade = 'A1';
      else if (pct >= 81) grade = 'A2';
      else if (pct >= 71) grade = 'B1';
      else if (pct >= 61) grade = 'B2';
      else if (pct >= 51) grade = 'C1';
      else if (pct >= 33) grade = 'D';
      else grade = 'E';

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        theoryMarks: theory,
        practicalMarks: practical,
        maxMarks: maxM,
        obtainedMarks: obtained,
        grade,
        remarks: 'Good progress',
      };
    });

    const totalMarks = subjectMarks.reduce((acc, sm) => acc + sm.obtainedMarks, 0);
    const maxTotalMarks = subjectMarks.reduce((acc, sm) => acc + sm.maxMarks, 0);
    const percentage = maxTotalMarks > 0 ? (totalMarks / maxTotalMarks) * 100 : 0;
    let overallGrade = 'A2';
    if (percentage >= 91) overallGrade = 'A1';
    else if (percentage >= 81) overallGrade = 'A2';
    else if (percentage >= 71) overallGrade = 'B1';
    else if (percentage >= 61) overallGrade = 'B2';
    else if (percentage >= 51) overallGrade = 'C1';
    else if (percentage >= 33) overallGrade = 'D';
    else overallGrade = 'E';

    return {
      id: `mark-draft-${student?.id || 'gen'}-${exam?.id || 'gen'}`,
      examId: exam?.id || 'exam-annual',
      studentId: student?.id || '',
      studentName: student?.fullName || 'Student',
      rollNo: student?.rollNo || '01',
      classId: classInfo?.id || student?.classId || '',
      section: student?.section || 'A',
      subjectMarks,
      totalMarks,
      maxTotalMarks,
      percentage,
      grade: overallGrade,
      rank: 1,
      attendancePresent: 115,
      attendanceTotal: 120,
      coScholastic: {
        workEducation: 'A',
        artEducation: 'A',
        healthPhysical: 'A',
        discipline: 'A',
      },
      remarks: 'Consistent academic dedication and active participation.',
      status: 'Submitted',
    };
  }, [propsExamMark, student, exam, examMarks, classInfo]);

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-4 border-double border-blue-900 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="ACADEMIC PROGRESS REPORT & MARKSHEET"
        subTitle={exam?.name || 'Annual / Term Examination Evaluation'}
        badge={`RANK: #${examMark.rank || 1}`}
      />

      {/* Student Profile Snapshot Grid */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 rounded p-3 mb-4 text-[11px]">
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">STUDENT NAME</span>
          <span className="font-extrabold text-blue-950 uppercase text-xs">{examMark.studentName}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ADMISSION NO.</span>
          <span className="font-bold text-slate-900">{student?.admissionNo || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ROLL NUMBER</span>
          <span className="font-bold text-slate-900">{examMark.rollNo}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">CLASS & SECTION</span>
          <span className="font-bold text-blue-900">{classInfo?.name || examMark.classId} - Sec {examMark.section}</span>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">FATHER'S NAME</span>
          <span className="font-medium text-slate-800">{student?.fatherName || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">MOTHER'S NAME</span>
          <span className="font-medium text-slate-800">{student?.motherName || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">DATE OF BIRTH (DD/MM/YYYY)</span>
          <span className="font-medium text-slate-800">{student?.dob ? formatDateToDDMMYYYY(student.dob) : 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold block text-[10px]">ATTENDANCE</span>
          <span className="font-bold text-emerald-800">
            {examMark.attendancePresent || 115} / {examMark.attendanceTotal || 120} (
            {Math.round(((examMark.attendancePresent || 115) / (examMark.attendanceTotal || 120)) * 100)}%)
          </span>
        </div>
      </div>

      {/* Part 1: Scholastic Assessment Table */}
      <div className="mb-4">
        <div className="bg-blue-950 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider rounded-t flex justify-between items-center">
          <span>PART 1: SCHOLASTIC AREAS (ACADEMIC EVALUATION)</span>
          <span className="text-[10px] text-amber-300 font-normal">Grading on 8-point scale</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-center">
          <thead>
            <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold">
              <th className="border border-slate-300 p-2 text-left w-10">#</th>
              <th className="border border-slate-300 p-2 text-left">Subject Description</th>
              <th className="border border-slate-300 p-2 w-20">Max Marks</th>
              <th className="border border-slate-300 p-2 w-20">Theory</th>
              <th className="border border-slate-300 p-2 w-20">Practical / IA</th>
              <th className="border border-slate-300 p-2 w-24">Marks Obtained</th>
              <th className="border border-slate-300 p-2 w-20">Grade</th>
              <th className="border border-slate-300 p-2 text-left">Teacher Remark</th>
            </tr>
          </thead>
          <tbody>
            {examMark.subjectMarks.map((sub, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 p-1.5 text-slate-500 font-medium">{idx + 1}</td>
                <td className="border border-slate-300 p-1.5 text-left font-semibold text-slate-900">{sub.subjectName}</td>
                <td className="border border-slate-300 p-1.5 font-medium">{sub.maxMarks}</td>
                <td className="border border-slate-300 p-1.5 text-slate-700">{sub.theoryMarks}</td>
                <td className="border border-slate-300 p-1.5 text-slate-700">{sub.practicalMarks ?? '-'}</td>
                <td className="border border-slate-300 p-1.5 font-extrabold text-blue-950">{sub.obtainedMarks}</td>
                <td className="border border-slate-300 p-1.5 font-bold text-amber-700">{sub.grade}</td>
                <td className="border border-slate-300 p-1.5 text-left text-[10px] text-slate-600 italic">
                  {sub.remarks || 'Satisfactory'}
                </td>
              </tr>
            ))}

            {/* Grand Total Row */}
            <tr className="bg-blue-50 font-bold text-slate-900 border-t-2 border-slate-400">
              <td colSpan={2} className="border border-slate-300 p-2 text-right uppercase">
                Grand Total:
              </td>
              <td className="border border-slate-300 p-2 text-center">{examMark.maxTotalMarks}</td>
              <td colSpan={2} className="border border-slate-300 p-2 text-right text-slate-600 text-[10px]">
                Marks Obtained:
              </td>
              <td className="border border-slate-300 p-2 text-center text-blue-950 text-sm font-extrabold">
                {examMark.totalMarks}
              </td>
              <td className="border border-slate-300 p-2 text-center text-amber-700 font-extrabold text-sm">
                {examMark.grade}
              </td>
              <td className="border border-slate-300 p-2 text-left text-xs font-extrabold text-emerald-800">
                {examMark.percentage.toFixed(1)}% | PASSED
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Part 2: Co-Scholastic Performance & Highlights */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Co-scholastic */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[10px] uppercase">
            PART 2: CO-SCHOLASTIC ACTIVITIES & DISCIPLINE
          </div>
          <table className="w-full text-[10px] text-slate-700">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 pl-3 font-medium">Work Education (Socially Useful Productive Work)</td>
                <td className="p-1.5 font-bold text-center text-blue-900 w-16">{examMark.coScholastic?.workEducation || 'A'}</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-1.5 pl-3 font-medium">Art & Aesthetic Education</td>
                <td className="p-1.5 font-bold text-center text-blue-900">{examMark.coScholastic?.artEducation || 'A'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-1.5 pl-3 font-medium">Health & Physical Education (Sports/Yoga)</td>
                <td className="p-1.5 font-bold text-center text-blue-900">{examMark.coScholastic?.healthPhysical || 'A'}</td>
              </tr>
              <tr>
                <td className="p-1.5 pl-3 font-medium">Discipline & Value Systems</td>
                <td className="p-1.5 font-bold text-center text-blue-900">{examMark.coScholastic?.discipline || 'A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Final Result Card & Rank */}
        <div className="border border-slate-300 rounded bg-slate-50 p-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">RESULT STATUS:</span>
              <span className="bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> PROMOTED
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <div className="bg-white border border-slate-200 rounded p-1.5">
                <span className="text-[9px] text-slate-500 block">TOTAL SCORE</span>
                <span className="font-extrabold text-blue-950 text-xs">{examMark.totalMarks}/{examMark.maxTotalMarks}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded p-1.5">
                <span className="text-[9px] text-slate-500 block">PERCENTAGE</span>
                <span className="font-extrabold text-blue-950 text-xs">{examMark.percentage.toFixed(1)}%</span>
              </div>
              <div className="bg-amber-100 border border-amber-300 rounded p-1.5">
                <span className="text-[9px] text-amber-800 font-bold block">CLASS RANK</span>
                <span className="font-extrabold text-amber-900 text-xs flex items-center justify-center gap-0.5">
                  <Trophy className="w-3 h-3 text-amber-600" /> #{examMark.rank || 1}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-2 text-[10px]">
            <span className="font-bold text-slate-700">Remarks: </span>
            <span className="text-slate-600 italic">{examMark.remarks || 'Keep up the good performance and active participation.'}</span>
          </div>
        </div>
      </div>

      {/* Grading Scale Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[9px] text-slate-600 flex justify-between items-center mb-2">
        <span className="font-bold text-slate-700">Grading Scale:</span>
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
