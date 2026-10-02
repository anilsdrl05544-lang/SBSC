import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Exam, Student, SubjectMark } from '../../types/school';
import { X, Save, Award, BookOpen, User, CheckCircle, Sparkles, Plus, Trash2, RotateCcw } from 'lucide-react';

interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  student: Student;
}

export const ALL_12_EXAM_SUBJECTS = [
  { id: 'sub-hin', name: 'हिंदी', code: 'HIN', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-vyak', name: 'व्याकरण', code: 'VYK', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-eng', name: 'English', code: 'ENG', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-soc', name: 'Social', code: 'SOC', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-sci', name: 'Science', code: 'SCI', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-math', name: 'Math', code: 'MATH', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-geo', name: 'Geography', code: 'GEO', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-his', name: 'History', code: 'HIS', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-skt', name: 'संस्कृत', code: 'SKT', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-comp', name: 'Computer', code: 'CMP', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-art', name: 'Art', code: 'ART', maxMarks: 50, passingMarks: 17 },
  { id: 'sub-hsc', name: 'Home science', code: 'HSC', maxMarks: 50, passingMarks: 17 },
];

export const MarksEntryModal: React.FC<MarksEntryModalProps> = ({
  isOpen,
  onClose,
  exam,
  student,
}) => {
  const { classes, examMarks, saveStudentMarks, settings } = useSchool();

  const classObj = classes.find((c) => c.id === student.classId);

  // Existing marks if any
  const existingMarkObj = examMarks.find(
    (m) => m.examId === exam.id && m.studentId === student.id
  );

  // Active subjects list: start with class subjects or 12 subjects
  const [activeSubjects, setActiveSubjects] = useState<
    { id: string; name: string; code: string; maxMarks: number; passingMarks?: number }[]
  >(() => {
    const base = classObj?.subjects && classObj.subjects.length > 0 ? [...classObj.subjects] : [...ALL_12_EXAM_SUBJECTS];
    if (existingMarkObj?.subjectMarks && existingMarkObj.subjectMarks.length > 0) {
      existingMarkObj.subjectMarks.forEach((sm) => {
        if (!base.some((s) => s.name === sm.subjectName || s.id === sm.subjectId)) {
          base.push({
            id: sm.subjectId || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: sm.subjectName,
            code: sm.subjectName.substring(0, 3).toUpperCase(),
            maxMarks: sm.maxMarks || 50,
            passingMarks: Math.round((sm.maxMarks || 50) * 0.33),
          });
        }
      });
    }
    return base;
  });

  const [marksState, setMarksState] = useState<{ [subjectName: string]: { theory: number; practical: number } }>(() => {
    const init: { [sub: string]: { theory: number; practical: number } } = {};
    const baseSubs = classObj?.subjects && classObj.subjects.length > 0 ? classObj.subjects : ALL_12_EXAM_SUBJECTS;
    baseSubs.forEach((sub) => {
      const found = existingMarkObj?.subjectMarks.find((sm) => sm.subjectName === sub.name || sm.subjectId === sub.id);
      const subMax = sub.maxMarks || 50;
      const defaultTheory = subMax === 50 ? 38 : Math.round(subMax * 0.75);
      const defaultPractical = subMax === 50 ? 9 : Math.round(subMax * 0.20);
      init[sub.name] = {
        theory: found?.theoryMarks ?? defaultTheory,
        practical: found?.practicalMarks ?? defaultPractical,
      };
    });
    return init;
  });

  const [teacherRemarks, setTeacherRemarks] = useState(
    existingMarkObj?.remarks || 'Consistently outstanding performance with exceptional conceptual grasp.'
  );

  if (!isOpen || !classObj) return null;

  const handleScoreChange = (subName: string, type: 'theory' | 'practical', val: number) => {
    setMarksState((prev) => ({
      ...prev,
      [subName]: {
        ...(prev[subName] || { theory: 0, practical: 0 }),
        [type]: Math.max(0, val),
      },
    }));
  };

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

  const applyPreset = (theory: number, practical: number) => {
    const updated: { [sub: string]: { theory: number; practical: number } } = {};
    activeSubjects.forEach((sub) => {
      updated[sub.name] = { theory, practical };
    });
    setMarksState(updated);
  };

  const handleLoadAll12Subjects = () => {
    setActiveSubjects(ALL_12_EXAM_SUBJECTS);
    setMarksState((prev) => {
      const next = { ...prev };
      ALL_12_EXAM_SUBJECTS.forEach((sub) => {
        if (!next[sub.name]) {
          next[sub.name] = { theory: 38, practical: 9 };
        }
      });
      return next;
    });
  };

  const handleAddSubject = (subjectName: string) => {
    if (!subjectName || activeSubjects.some((s) => s.name === subjectName)) return;
    const found = ALL_12_EXAM_SUBJECTS.find((s) => s.name === subjectName);
    const newSub = found || {
      id: `sub-${Date.now()}`,
      name: subjectName,
      code: subjectName.substring(0, 3).toUpperCase(),
      maxMarks: 50,
      passingMarks: 17,
    };
    setActiveSubjects([...activeSubjects, newSub]);
    setMarksState((prev) => ({
      ...prev,
      [newSub.name]: { theory: 38, practical: 9 },
    }));
  };

  const handleRemoveSubject = (subName: string) => {
    setActiveSubjects(activeSubjects.filter((s) => s.name !== subName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let totalMarks = 0;
    let maxTotalMarks = 0;

    const subjectMarksArray: SubjectMark[] = activeSubjects.map((sub) => {
      const score = marksState[sub.name] || { theory: 0, practical: 0 };
      const subTotal = (Number(score.theory) || 0) + (Number(score.practical) || 0);
      const subMax = sub.maxMarks || 50;
      const subPct = (subTotal / subMax) * 100;

      totalMarks += subTotal;
      maxTotalMarks += subMax;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        theoryMarks: Number(score.theory) || 0,
        practicalMarks: Number(score.practical) || 0,
        obtainedMarks: subTotal,
        maxMarks: subMax,
        grade: calculateGrade(subPct),
      };
    });

    const percentage = maxTotalMarks > 0 ? (totalMarks / maxTotalMarks) * 100 : 0;
    const finalGrade = calculateGrade(percentage);

    saveStudentMarks({
      examId: exam.id,
      studentId: student.id,
      studentName: student.fullName,
      rollNo: student.rollNo,
      classId: student.classId,
      section: student.section,
      subjectMarks: subjectMarksArray,
      totalMarks,
      maxTotalMarks,
      percentage,
      grade: finalGrade,
      rank: 1, // calculated in reports / ranking logic
      remarks: teacherRemarks,
      attendancePresent: 116,
      attendanceTotal: 120,
    });

    onClose();
  };

  // Preview live totals
  let liveTotal = 0;
  let liveMax = 0;
  activeSubjects.forEach((sub) => {
    const sc = marksState[sub.name] || { theory: 0, practical: 0 };
    liveTotal += (Number(sc.theory) || 0) + (Number(sc.practical) || 0);
    liveMax += sub.maxMarks || 50;
  });
  const livePct = liveMax > 0 ? (liveTotal / liveMax) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-purple-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-800 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{exam.name} ({exam.session})</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {activeSubjects.length} Subjects • Max {liveMax} Marks
                </span>
              </div>
              <h3 className="text-lg font-extrabold">Enter Marks: {student.fullName}</h3>
              <p className="text-xs text-purple-200">
                Class: {classObj.name}-{student.section} | Roll No: #{student.rollNo} | Adm: {student.admissionNo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subjects & Presets Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadAll12Subjects}
              className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold border border-purple-300 transition text-[11px] flex items-center gap-1 cursor-pointer"
              title="Load all 12 standard subjects: हिंदी, व्याकरण, English, Social, Science, Math, Geography, History, संस्कृत, Computer, Art, Home science"
            >
              <RotateCcw className="w-3 h-3 text-purple-800" />
              <span>Load 12 Subjects (12 विषय)</span>
            </button>

            {/* Add Subject Selector */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddSubject(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
            >
              <option value="">+ Add Subject (विषय जोड़ें)...</option>
              {ALL_12_EXAM_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name} disabled={activeSubjects.some((as) => as.name === s.name)}>
                  {s.name} {activeSubjects.some((as) => as.name === s.name) ? '(Already Added)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold text-[10px]">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset(39, 10)}
              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition text-[10px] cursor-pointer"
            >
              A1 (49)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(35, 9)}
              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 transition text-[10px] cursor-pointer"
            >
              A2 (44)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30, 8)}
              className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 transition text-[10px] cursor-pointer"
            >
              B1 (38)
            </button>
          </div>
        </div>

        {/* Marks Entry Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] uppercase">
                  <th className="p-3">Subject Name</th>
                  <th className="p-3 w-28 text-center">Theory (Max 40)</th>
                  <th className="p-3 w-28 text-center">Practical/Oral (Max 10)</th>
                  <th className="p-3 w-24 text-center">Total (Max 50)</th>
                  <th className="p-3 w-20 text-center">Grade</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeSubjects.map((sub) => {
                  const score = marksState[sub.name] || { theory: 0, practical: 0 };
                  const subTotal = (Number(score.theory) || 0) + (Number(score.practical) || 0);
                  const subMax = sub.maxMarks || 50;
                  const subPct = (subTotal / subMax) * 100;

                  const theoryMax = subMax === 50 ? 40 : Math.round(subMax * 0.8);
                  const practicalMax = subMax === 50 ? 10 : Math.round(subMax * 0.2);

                  return (
                    <tr key={sub.name} className="hover:bg-purple-50/30">
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-900" />
                        <span>{sub.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">({sub.code})</span>
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={theoryMax}
                          value={score.theory}
                          onChange={(e) => handleScoreChange(sub.name, 'theory', Number(e.target.value))}
                          className="w-20 text-center p-1.5 border border-slate-300 rounded font-bold text-slate-900 focus:outline-purple-900 text-xs"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={practicalMax}
                          value={score.practical}
                          onChange={(e) => handleScoreChange(sub.name, 'practical', Number(e.target.value))}
                          className="w-20 text-center p-1.5 border border-slate-300 rounded font-bold text-slate-900 focus:outline-purple-900 text-xs"
                        />
                      </td>

                      <td className="p-3 text-center font-extrabold text-purple-950 text-sm">
                        {subTotal} <span className="text-[11px] font-normal text-slate-400">/ {subMax}</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-extrabold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                          {calculateGrade(subPct)}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(sub.name)}
                          title="Remove this subject from student evaluation"
                          className="text-slate-300 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live Summary Bar */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-slate-500 font-bold uppercase text-[10px] block">Grand Total Marks</span>
              <span className="text-xl font-black text-purple-950">
                {liveTotal} <span className="text-sm font-normal text-slate-400">/ {liveMax}</span>
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold uppercase text-[10px] block">Calculated Percentage</span>
              <span className="text-xl font-black text-purple-900">{livePct.toFixed(2)}%</span>
            </div>

            <div>
              <span className="text-slate-500 font-bold uppercase text-[10px] block">CBSE 8-Point Grade</span>
              <span className="text-base font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded">
                {calculateGrade(livePct)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-bold uppercase text-[10px] block">Total Subjects</span>
              <span className="text-base font-black text-slate-800">{activeSubjects.length} Subjects</span>
            </div>
          </div>

          {/* Teacher / Invigilator Remarks */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Class Teacher & Invigilator Assessment Remarks (शिक्षक टिप्पणी)
            </label>
            <input
              type="text"
              value={teacherRemarks}
              onChange={(e) => setTeacherRemarks(e.target.value)}
              placeholder="e.g. Excellent conceptual clarity, consistent academic dedication."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-purple-900"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-white font-bold shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>Save & Publish Student Marks</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
