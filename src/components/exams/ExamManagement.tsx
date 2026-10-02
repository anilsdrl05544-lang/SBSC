import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Exam, Student, ExamMark } from '../../types/school';
import {
  Award,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  Trophy,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  BookOpen,
  X,
  Save,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { MarksEntryModal } from './MarksEntryModal';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { MarksheetReportCardPdf } from '../reports/templates/MarksheetReportCardPdf';
import { ExamResultLedgerPdf } from '../reports/templates/ExamResultLedgerPdf';
import { Consolidated3TermReportCardPdf } from '../reports/templates/Consolidated3TermReportCardPdf';
import { exportTableToCsv } from '../../services/pdfService';
import { AdmitCardManagement } from './AdmitCardManagement';
import { ExamTimetableEditor } from './ExamTimetableEditor';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { generateDefault2MeetingTimetable } from '../../utils/timetableUtils';

interface ExamManagementProps {
  onNavigate?: (module: string) => void;
}

export const ExamManagement: React.FC<ExamManagementProps> = ({ onNavigate }) => {
  const {
    exams,
    classes,
    students,
    examMarks,
    admitCards,
    addExam,
    updateExam,
    deleteExam,
    settings,
    syncStandardCurriculumAndExams,
  } = useSchool();

  const [mainTab, setMainTab] = useState<'marks' | 'admit-cards' | 'timetable'>('marks');
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isEditExamOpen, setIsEditExamOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [studentForMarksEntry, setStudentForMarksEntry] = useState<Student | null>(null);

  // Print modals
  const [selectedMarkForReportCard, setSelectedMarkForReportCard] = useState<ExamMark | null>(null);
  const [studentForConsolidatedCard, setStudentForConsolidatedCard] = useState<Student | null>(null);
  const [isGazetteOpen, setIsGazetteOpen] = useState(false);

  // Active exam resolution
  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const activeClass = classes.find((c) => c.id === selectedClassId);

  // New Exam Form state
  const [newExamForm, setNewExamForm] = useState({
    name: '',
    session: settings.academicSession || '2026-2027',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Scheduled' as const,
    term: 'Annual Term',
    meeting1Time: '09:30 AM – 11:30 AM',
    meeting2Time: '12:00 PM – 02:00 PM',
    maxMarksDefault: 350,
    maxMarksPerSubject: 50,
  });

  // Edit Exam Form state
  const [editExamForm, setEditExamForm] = useState<{
    id: string;
    name: string;
    session: string;
    startDate: string;
    endDate: string;
    status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Published' | 'Scheduled';
    term: string;
    meeting1Time: string;
    meeting2Time: string;
  } | null>(null);

  // Open Create Exam Modal with clean defaults
  const handleOpenAddModal = (presetName?: string, presetTerm?: string) => {
    setNewExamForm({
      name: presetName || 'Pre-Board Examination 2026',
      session: settings.academicSession || '2026-2027',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Scheduled',
      term: presetTerm || 'Term 2',
      meeting1Time: '09:30 AM – 11:30 AM',
      meeting2Time: '12:00 PM – 02:00 PM',
      maxMarksDefault: 350,
      maxMarksPerSubject: 50,
    });
    setIsAddExamOpen(true);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamForm.name.trim()) return;

    const initialTimetable = generateDefault2MeetingTimetable(
      newExamForm.startDate,
      newExamForm.endDate,
      newExamForm.meeting1Time,
      newExamForm.meeting2Time
    );

    const created = addExam({
      ...newExamForm,
      classes: classes.map((c) => c.id),
      timetable: initialTimetable,
    });

    setSelectedExamId(created.id);
    setIsAddExamOpen(false);
  };

  const handleOpenEditModal = (exam: Exam) => {
    setEditExamForm({
      id: exam.id,
      name: exam.name,
      session: exam.session || settings.academicSession,
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status,
      term: exam.term || 'Annual',
      meeting1Time: exam.meeting1Time || '09:30 AM – 11:30 AM',
      meeting2Time: exam.meeting2Time || '12:00 PM – 02:00 PM',
    });
    setIsEditExamOpen(true);
  };

  const handleSaveEditExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExamForm) return;

    updateExam(editExamForm.id, {
      name: editExamForm.name,
      session: editExamForm.session,
      startDate: editExamForm.startDate,
      endDate: editExamForm.endDate,
      status: editExamForm.status,
      term: editExamForm.term,
      meeting1Time: editExamForm.meeting1Time,
      meeting2Time: editExamForm.meeting2Time,
    });

    setIsEditExamOpen(false);
    setEditExamForm(null);
  };

  const handleConfirmDeleteExam = () => {
    if (!examToDelete) return;
    const deletedId = examToDelete.id;
    deleteExam(deletedId);

    // Switch selectedExamId to next available exam
    const remaining = exams.filter((e) => e.id !== deletedId);
    if (remaining.length > 0) {
      setSelectedExamId(remaining[0].id);
    } else {
      setSelectedExamId('');
    }

    setExamToDelete(null);
  };

  // Students in selected class (sorted alphabetically A-Z)
  const classStudents = students
    .filter((s) => {
      if (selectedClassId && s.classId !== selectedClassId) return false;
      if (searchTerm && !s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) && !s.rollNo.includes(searchTerm)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));

  const handleExportGazetteCsv = () => {
    const headers = ['Roll No', 'Admission No', 'Student Name', 'Class', 'Max Marks', 'Scored', 'Percentage', 'Grade', 'Remarks'];
    const rows = classStudents.map((st) => {
      const mark = examMarks.find((m) => m.examId === activeExam?.id && m.studentId === st.id);
      return [
        st.rollNo,
        st.admissionNo,
        st.fullName,
        `${activeClass?.name || st.classId}-${st.section}`,
        mark?.maxTotalMarks || 500,
        mark?.totalMarks || 0,
        mark ? `${mark.percentage.toFixed(1)}%` : 'N/A',
        mark?.grade || 'N/A',
        mark?.remarks || '',
      ];
    });

    exportTableToCsv(`SBSC-${activeExam?.name}-Results.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Academic Examinations & Grading Board</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Exams, Marks & Time Table</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Conduct exams, 2-meeting examination schedules (Ist & IInd Meeting), CBSE 8-point grading, and official report cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-700" />
              <span>Import Marks Sheet</span>
            </button>
          )}

          <button
            onClick={handleExportGazetteCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Gazette CSV</span>
          </button>

          <button
            onClick={() => setIsGazetteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-900" />
            <span>Result Gazette PDF</span>
          </button>

          {/* Create Exam Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Create Examination (परीक्षा बनाएं)</span>
          </button>
        </div>
      </div>

      {/* Module Sub-Navigation Switcher (3 Tabs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setMainTab('marks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            mainTab === 'marks'
              ? 'bg-purple-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Marks Entry & Report Cards (अंक व अंकपत्र)</span>
        </button>

        <button
          onClick={() => setMainTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            mainTab === 'timetable'
              ? 'bg-purple-900 text-white shadow-sm ring-1 ring-amber-400'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-300" />
          <span>Examination Time Table (2 Meetings: Ist & IInd) (समय-सारणी)</span>
          <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            2 Shifts
          </span>
        </button>

        <button
          onClick={() => setMainTab('admit-cards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
            mainTab === 'admit-cards'
              ? 'bg-blue-950 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Admit Cards & Roll Numbers (प्रवेश पत्र एवं रोल नंबर)</span>
        </button>
      </div>

      {/* RENDER TAB CONTENT */}
      {mainTab === 'admit-cards' ? (
        <AdmitCardManagement onNavigate={onNavigate} />
      ) : mainTab === 'timetable' ? (
        activeExam ? (
          <div className="space-y-4">
            {/* Active Exam Selector for Time Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Select Exam to Manage Time Table:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-purple-950 focus:outline-purple-900 text-xs cursor-pointer"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.session})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(activeExam)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Edit Exam Details</span>
                </button>
                <button
                  onClick={() => setExamToDelete(activeExam)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Exam (हटाएं)</span>
                </button>
              </div>
            </div>

            <ExamTimetableEditor exam={activeExam} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-slate-800 text-base">No Examinations Available</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Please create an examination first using the "Create Examination" button above to configure its 2-meeting timetable.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-950 text-white font-bold text-xs"
            >
              + Create Examination
            </button>
          </div>
        )
      ) : (
        <>
          {/* Curriculum & 12 Examination Subjects Structure Badge */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md border border-blue-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                  Standard Scheme
                </span>
                <span className="font-extrabold text-amber-300 text-sm">
                  12 Standard Examination Subjects (Max 50 Marks / Subject)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-200">
                <span className="font-semibold text-white">Examination Subjects:</span>
                {[
                  'हिंदी',
                  'व्याकरण',
                  'English',
                  'Social',
                  'Science',
                  'Math',
                  'Geography',
                  'History',
                  'संस्कृत',
                  'Computer',
                  'Art',
                  'Home science',
                ].map((sub) => (
                  <span key={sub} className="bg-white/10 px-2 py-0.5 rounded border border-white/15 font-bold">
                    {sub}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-blue-200">
                Total 3 Exams: <b>Quarterly (त्रैमासिक)</b> • <b>Half Yearly (अर्धवार्षिक)</b> • <b>Annual (वार्षिक)</b> | 2-Meeting Timetable & CBSE Grading
              </p>
            </div>

            <button
              onClick={() => syncStandardCurriculumAndExams()}
              className="self-end md:self-center px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition shrink-0 cursor-pointer"
            >
              Sync 12 Subjects to Classes
            </button>
          </div>

          {/* Exam Selector Strip with Edit & Delete Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {exams.map((ex) => {
              const isSelected = ex.id === selectedExamId;
              const evaluatedCount = examMarks.filter((m) => m.examId === ex.id).length;

              return (
                <div
                  key={ex.id}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-purple-900 bg-purple-50/60 shadow-md ring-2 ring-purple-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div onClick={() => setSelectedExamId(ex.id)} className="cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ex.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ex.status === 'Ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ex.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{ex.session}</span>
                    </div>

                    <h3 className={`font-extrabold text-xs sm:text-sm ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                      {ex.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ex.term}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {ex.startDate} – {ex.endDate}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-500">{evaluatedCount} Evaluated</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(ex);
                        }}
                        title="Edit Examination"
                        className="p-1 rounded text-slate-400 hover:text-blue-900 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExamToDelete(ex);
                        }}
                        title="Delete Examination (हटाएं)"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedExamId(ex.id)}
                        className={`font-bold ml-1 cursor-pointer ${isSelected ? 'text-purple-900' : 'text-slate-400'}`}
                      >
                        {isSelected ? '✓ Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick "+ New Exam" Card */}
            <button
              onClick={() => handleOpenAddModal()}
              className="p-4 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/30 hover:bg-purple-50/70 transition flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 group-hover:bg-purple-950 text-purple-950 group-hover:text-amber-300 flex items-center justify-center transition shadow-2xs">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-purple-950">
                + Create New Exam
              </span>
              <span className="text-[10px] text-slate-500">
                नई परीक्षा अनुसूची जोड़ें
              </span>
            </button>
          </div>

          {/* Active Exam Control Bar with Edit & Delete */}
          {activeExam && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Currently Managing:</span>
                <strong className="text-purple-950 font-extrabold text-sm">{activeExam.name}</strong>
                <span className="text-slate-400">({activeExam.session} • {activeExam.term})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMainTab('timetable')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold transition shadow-2xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-800" />
                  <span>Configure 2-Meeting Time Table</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(activeExam)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold transition shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Edit Details</span>
                </button>

                <button
                  onClick={() => setExamToDelete(activeExam)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Exam (हटाएं)</span>
                </button>
              </div>
            </div>
          )}

          {/* Class and Search Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
              <div>
                <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Filter Class:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-purple-900 text-xs"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Search Student:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student or roll no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-purple-900"
                  />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Showing results for <b className="text-purple-950">{activeExam?.name}</b>
            </div>
          </div>

          {/* Students Marks Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-purple-950 text-white font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Roll</th>
                    <th className="py-3 px-4">Student Full Name</th>
                    <th className="py-3 px-3">Class & Sec</th>
                    <th className="py-3 px-3 text-center">Marks Scored</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const mark = examMarks.find((m) => m.examId === activeExam?.id && m.studentId === st.id);
                    const cls = classes.find((c) => c.id === st.classId);

                    return (
                      <tr key={st.id} className="hover:bg-purple-50/40 transition">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                          #{st.rollNo}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 uppercase block">{st.fullName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{st.admissionNo}</span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {cls?.name || st.classId} - {st.section}
                        </td>

                        <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                          {mark ? (
                            <span>
                              {mark.totalMarks} <span className="text-slate-400 font-normal">/ {mark.maxTotalMarks}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Entered</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-purple-900">
                          {mark ? `${mark.percentage.toFixed(1)}%` : '-'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {mark ? (
                            <span className="inline-block px-2.5 py-0.5 rounded font-extrabold text-amber-800 bg-amber-100 border border-amber-300 text-[10px]">
                              {mark.grade}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {mark ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle className="w-3.5 h-3.5" /> Evaluated
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold text-[10px]">Pending Marks</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setStudentForMarksEntry(st)}
                              className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs transition cursor-pointer"
                            >
                              {mark ? 'Edit Marks' : 'Enter Marks'}
                            </button>

                            {mark && (
                              <button
                                onClick={() => setSelectedMarkForReportCard(mark)}
                                title="Print Term Report Card"
                                className="p-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setStudentForConsolidatedCard(st)}
                              title="Print 3-Term Annual Cumulative Report Card (Quarterly + Half Yearly + Annual)"
                              className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] border border-amber-300 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Award className="w-3 h-3 text-amber-700" />
                              <span>3-Term Card</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CREATE NEW EXAMINATION MODAL */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-purple-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">Schedule / Create New Examination</h3>
              </div>
              <button onClick={() => setIsAddExamOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Quick Select Exam Preset:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Quarterly Examination 2026', term: 'Quarterly' },
                    { name: 'Half Yearly Examination 2026', term: 'Half Yearly' },
                    { name: 'Annual Examination 2026', term: 'Annual' },
                    { name: 'Pre-Board Examination 2026', term: 'Pre-Board' },
                    { name: 'Unit Test 1', term: 'Unit Test' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setNewExamForm({ ...newExamForm, name: p.name, term: p.term })}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-purple-100 text-slate-800 hover:text-purple-950 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Examination 2026"
                  value={newExamForm.name}
                  onChange={(e) => setNewExamForm({ ...newExamForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-purple-950 text-xs focus:outline-purple-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Term / Phase</label>
                  <input
                    type="text"
                    placeholder="Annual / Term 2"
                    value={newExamForm.term}
                    onChange={(e) => setNewExamForm({ ...newExamForm, term: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={newExamForm.session}
                    onChange={(e) => setNewExamForm({ ...newExamForm, session: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newExamForm.startDate}
                    onChange={(e) => setNewExamForm({ ...newExamForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newExamForm.endDate}
                    onChange={(e) => setNewExamForm({ ...newExamForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* 2-Meeting Default Timing Settings */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-purple-950 tracking-wider block">
                  Examination Time Table Settings (2 Meetings / दो पारियां)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-purple-950 font-bold text-[10px] mb-0.5">
                      Ist Meeting (प्रथम पाली):
                    </label>
                    <input
                      type="text"
                      value={newExamForm.meeting1Time}
                      onChange={(e) => setNewExamForm({ ...newExamForm, meeting1Time: e.target.value })}
                      placeholder="09:30 AM – 11:30 AM"
                      className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-indigo-950 font-bold text-[10px] mb-0.5">
                      IInd Meeting (द्वितीय पाली):
                    </label>
                    <input
                      type="text"
                      value={newExamForm.meeting2Time}
                      onChange={(e) => setNewExamForm({ ...newExamForm, meeting2Time: e.target.value })}
                      placeholder="12:00 PM – 02:00 PM"
                      className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Exam Status</label>
                <select
                  value={newExamForm.status}
                  onChange={(e) => setNewExamForm({ ...newExamForm, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-xs"
                >
                  <option value="Scheduled">Scheduled (आगामी)</option>
                  <option value="Ongoing">Ongoing (प्रगति पर)</option>
                  <option value="Completed">Completed (संपन्न)</option>
                  <option value="Published">Published (परिणाम घोषित)</option>
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddExamOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-white font-bold shadow-md cursor-pointer"
                >
                  Create Exam & Schedule Time Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXAMINATION DETAILS MODAL */}
      {isEditExamOpen && editExamForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">Edit Examination Details</h3>
              </div>
              <button onClick={() => setIsEditExamOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExam} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  value={editExamForm.name}
                  onChange={(e) => setEditExamForm({ ...editExamForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-blue-950 text-xs focus:outline-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Term / Phase</label>
                  <input
                    type="text"
                    value={editExamForm.term}
                    onChange={(e) => setEditExamForm({ ...editExamForm, term: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={editExamForm.session}
                    onChange={(e) => setEditExamForm({ ...editExamForm, session: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editExamForm.startDate}
                    onChange={(e) => setEditExamForm({ ...editExamForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={editExamForm.endDate}
                    onChange={(e) => setEditExamForm({ ...editExamForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* 2-Meeting Default Timing Settings */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-blue-950 tracking-wider block">
                  Default Meeting Timings (2 Shifts)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-blue-950 font-bold text-[10px] mb-0.5">
                      Ist Meeting Time (प्रथम पाली):
                    </label>
                    <input
                      type="text"
                      value={editExamForm.meeting1Time}
                      onChange={(e) => setEditExamForm({ ...editExamForm, meeting1Time: e.target.value })}
                      className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-indigo-950 font-bold text-[10px] mb-0.5">
                      IInd Meeting Time (द्वितीय पाली):
                    </label>
                    <input
                      type="text"
                      value={editExamForm.meeting2Time}
                      onChange={(e) => setEditExamForm({ ...editExamForm, meeting2Time: e.target.value })}
                      className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Status</label>
                <select
                  value={editExamForm.status}
                  onChange={(e) => setEditExamForm({ ...editExamForm, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-xs"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditExamOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Exam Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EXAM MODAL */}
      {examToDelete && (
        <ConfirmDeleteModal
          isOpen={!!examToDelete}
          onClose={() => setExamToDelete(null)}
          onConfirm={handleConfirmDeleteExam}
          title="Delete Examination (परीक्षा हटाएं)"
          itemName={examToDelete.name}
          itemSubText={`Session: ${examToDelete.session} • Term: ${examToDelete.term || 'N/A'}`}
          message={`Are you sure you want to delete this examination? Deleting "${examToDelete.name}" will permanently remove its 2-meeting timetable, evaluated student marks, and any generated admit cards from both local storage and cloud database.`}
          confirmButtonText="Yes, Permanently Delete Examination"
        />
      )}

      {/* Marks Entry Modal */}
      {studentForMarksEntry && activeExam && (
        <MarksEntryModal
          isOpen={!!studentForMarksEntry}
          onClose={() => setStudentForMarksEntry(null)}
          exam={activeExam}
          student={studentForMarksEntry}
        />
      )}

      {/* Marksheet Print Modal */}
      {selectedMarkForReportCard && activeExam && (
        <PrintPreviewModal
          isOpen={!!selectedMarkForReportCard}
          onClose={() => setSelectedMarkForReportCard(null)}
          title={`Official Report Card - ${selectedMarkForReportCard.studentName}`}
          fileName={`SBSC-Report-Card-${selectedMarkForReportCard.rollNo}-${selectedMarkForReportCard.studentName.replace(/\s+/g, '_')}.pdf`}
        >
          <MarksheetReportCardPdf examMark={selectedMarkForReportCard} exam={activeExam} />
        </PrintPreviewModal>
      )}

      {/* Gazette Ledger Print Modal */}
      {activeExam && (
        <PrintPreviewModal
          isOpen={isGazetteOpen}
          onClose={() => setIsGazetteOpen(false)}
          title={`Result Gazette Ledger - ${activeExam.name}`}
          fileName={`SBSC-Gazette-${activeExam.name.replace(/\s+/g, '_')}.pdf`}
        >
          <ExamResultLedgerPdf exam={activeExam} selectedClass={activeClass} />
        </PrintPreviewModal>
      )}

      {/* 3-Term Consolidated Annual Report Card Modal */}
      {studentForConsolidatedCard && (
        <PrintPreviewModal
          isOpen={!!studentForConsolidatedCard}
          onClose={() => setStudentForConsolidatedCard(null)}
          title={`3-Term Annual Report Card - ${studentForConsolidatedCard.fullName}`}
          fileName={`SBSC-Annual-Report-Card-${studentForConsolidatedCard.rollNo}-${studentForConsolidatedCard.fullName.replace(/\s+/g, '_')}.pdf`}
        >
          <Consolidated3TermReportCardPdf student={studentForConsolidatedCard} />
        </PrintPreviewModal>
      )}
    </div>
  );
};
