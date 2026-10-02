import React, { useState, useMemo, useCallback } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Exam, Student, AdmitCardRecord, ClassInfo } from '../../types/school';
import {
  Award,
  Search,
  Printer,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  X,
  Save,
  User,
  Sparkles,
  Hash,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Building,
  Calendar,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { ExamAdmitCardPdf } from '../reports/templates/ExamAdmitCardPdf';

interface AdmitCardManagementProps {
  onNavigate?: (module: string) => void;
}

export const AdmitCardManagement: React.FC<AdmitCardManagementProps> = ({ onNavigate }) => {
  const {
    exams,
    classes,
    students,
    admitCards,
    updateAdmitCard,
    toggleAdmitCardLock,
    bulkToggleAdmitCardLock,
    batchSetAdmitCardPermissions,
    updateStudentRollNo,
    autoAssignClassRollNos,
    autoAssignAllClassesRollNos,
    getStudentDueAmount,
    settings,
  } = useSchool();

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Preview modals
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Roll number inline editing state
  const [editingRollNoId, setEditingRollNoId] = useState<string | null>(null);
  const [tempRollNo, setTempRollNo] = useState<string>('');

  // Default Admit Card Settings Form
  const [defaultExamCenter, setDefaultExamCenter] = useState<string>(
    `${settings.schoolName}, ${settings.schoolAddress || settings.address || 'Campus'}, ${settings.district || ''}`
  );
  const [defaultReportingTime, setDefaultReportingTime] = useState<string>('08:30 AM');
  const [defaultExamTiming, setDefaultExamTiming] = useState<string>('09:00 AM – 12:00 PM');
  const [defaultInstructions, setDefaultInstructions] = useState<string>(
    '1. Candidates must carry the printed admit card and school ID to the examination hall.\n2. Report to the examination center at least 30 minutes before the scheduled time.\n3. Electronic devices, smartwatches, and unauthorized papers are strictly prohibited.\n4. Students must follow invigilator instructions and maintain strict discipline.'
  );

  const activeExam: Exam | undefined = exams.find((e) => e.id === selectedExamId) || exams[0];
  const activeClass: ClassInfo | undefined = classes.find((c) => c.id === selectedClassId);

  // Get active admit card record for a student with robust multi-field matching
  const getAdmitCardForStudent = (studentId: string, admNo?: string): AdmitCardRecord | undefined => {
    if (!activeExam) return undefined;
    const sIdClean = String(studentId || '').trim().toLowerCase();
    const admClean = String(admNo || '').trim().toLowerCase();
    return admitCards.find((a) => {
      if (a.examId !== activeExam.id) return false;
      const aStudentId = String(a.studentId || '').trim().toLowerCase();
      if (aStudentId === sIdClean) return true;
      if (admClean && aStudentId === admClean) return true;
      if (admClean && aStudentId.replace(/[^a-z0-9]/g, '') === admClean.replace(/[^a-z0-9]/g, '')) return true;
      if (a.id && (a.id === `ac-${activeExam.id}-${sIdClean}` || a.id.endsWith(`-${sIdClean}`))) return true;
      return false;
    });
  };

  // Check if student is allowed / eligible under school exam dues policy:
  // - Non-conveyance students ("जो बच्चे साधन वाले न हो"): कुल ₹2,500 बाकी तक admit card show
  // - Conveyance students ("साधन वाले बच्चे"): कुल ₹3,900 बाकी तक (Tuition 1800 + Exam 300 + Convey 1800)
  const isStudentAdmitCardUnlocked = useCallback(
    (student: Student, card?: AdmitCardRecord): boolean => {
      if (card && card.isReleased === true) return true;
      const due = getStudentDueAmount(student.id);
      const rawConv = student.conveyFee || 0;
      const hasConvey = Boolean((rawConv > 0 && rawConv !== 600) || student.conveyVehicle || student.conveyRoute || (student as any).transportRoute);
      const maxAllowed = hasConvey ? 3900 : 2500;
      const isEligibleByFee = due <= maxAllowed;
      if (isEligibleByFee) {
        const isDisciplinary = Boolean(
          card?.lockReason &&
          (card.lockReason.toLowerCase().includes('discipline') ||
           card.lockReason.toLowerCase().includes('administrative hold') ||
           card.lockReason.includes('अनुशासन') ||
           card.lockReason.includes('निर्देशानुसार रोक'))
        );
        if (!isDisciplinary) return true;
      }
      return false;
    },
    [getStudentDueAmount]
  );

  // Students in selected class (filtered and sorted)
  const classStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClassId && s.classId !== selectedClassId) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchName = s.fullName.toLowerCase().includes(q);
          const matchRoll = s.rollNo?.toLowerCase().includes(q);
          const matchAdm = s.admissionNo?.toLowerCase().includes(q);
          if (!matchName && !matchRoll && !matchAdm) return false;
        }

        if (statusFilter !== 'all' && activeExam) {
          const ac = getAdmitCardForStudent(s.id, s.admissionNo);
          const isUnlocked = isStudentAdmitCardUnlocked(s, ac);
          if (statusFilter === 'unlocked' && !isUnlocked) return false;
          if (statusFilter === 'locked' && isUnlocked) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const rollComp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        if (rollComp !== 0) return rollComp;
        return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      });
  }, [students, selectedClassId, searchTerm, statusFilter, activeExam, admitCards, isStudentAdmitCardUnlocked]);

  // Statistics for the current selection
  const stats = useMemo(() => {
    let unlocked = 0;
    let locked = 0;
    let withDues = 0;

    classStudents.forEach((st) => {
      const ac = getAdmitCardForStudent(st.id, st.admissionNo);
      const isCardUnlocked = isStudentAdmitCardUnlocked(st, ac);
      if (isCardUnlocked) unlocked++;
      else locked++;

      const due = getStudentDueAmount(st.id);
      if (due > 0) withDues++;
    });

    return {
      total: classStudents.length,
      unlocked,
      locked,
      withDues,
    };
  }, [classStudents, admitCards, activeExam, getStudentDueAmount, isStudentAdmitCardUnlocked]);

  // Handle inline roll number save
  const handleSaveRollNo = (studentId: string) => {
    if (tempRollNo.trim()) {
      updateStudentRollNo(studentId, tempRollNo.trim());
      if (activeExam) {
        updateAdmitCard(activeExam.id, studentId, { rollNo: tempRollNo.trim() });
      }
    }
    setEditingRollNoId(null);
  };

  // Toggle individual student lock
  const handleToggleLock = (student: Student) => {
    if (!activeExam) return;
    const ac = getAdmitCardForStudent(student.id, student.admissionNo);
    const currentlyUnlocked = Boolean(ac && ac.isReleased === true);
    const nextState = !currentlyUnlocked;

    const lockReason = nextState
      ? undefined
      : getStudentDueAmount(student.id) > 0
      ? 'बकाया शुल्क लंबित (Fee Dues Pending)'
      : 'प्रशासनिक रोक (Administrative Hold)';

    toggleAdmitCardLock(activeExam.id, student.id, nextState, lockReason);
    setActionFeedback(
      nextState
        ? `✓ ${student.fullName} के प्रवेश पत्र को अनुमति (Allow) दे दी गई है। छात्र पोर्टल पर तुरंत दिखेगा।`
        : `🔒 ${student.fullName} का प्रवेश पत्र रोक (Lock) दिया गया है।`
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Allow displayed students
  const handleAllowDisplayed = () => {
    if (!activeExam) return;
    const studentIds = classStudents.map((s) => s.id);
    bulkToggleAdmitCardLock(activeExam.id, studentIds, true);
    setActionFeedback(`✓ ${studentIds.length} विद्यार्थियों के प्रवेश पत्र को अनुमति (Allow) दे दी गई है।`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Allow ALL students in entire school
  const handleAllowAllSchool = () => {
    if (!activeExam) return;
    const studentIds = students.map((s) => s.id);
    bulkToggleAdmitCardLock(activeExam.id, studentIds, true);
    setActionFeedback(`✓ विद्यालय के सभी ${studentIds.length} विद्यार्थियों के प्रवेश पत्र को अनुमति (Allow) दे दी गई है!`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Lock displayed students
  const handleLockDisplayed = () => {
    if (!activeExam) return;
    const studentIds = classStudents.map((s) => s.id);
    bulkToggleAdmitCardLock(activeExam.id, studentIds, false, 'प्रशासनिक निर्देशानुसार रोक (Withheld by School Administration)');
    setActionFeedback(`🔒 ${studentIds.length} विद्यार्थियों के प्रवेश पत्र को रोक (Lock) दिया गया है।`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Lock ALL students in entire school
  const handleLockAllSchool = () => {
    if (!activeExam) return;
    const studentIds = students.map((s) => s.id);
    bulkToggleAdmitCardLock(activeExam.id, studentIds, false, 'प्रशासनिक निर्देशानुसार रोक (Withheld by School Administration)');
    setActionFeedback(`🔒 विद्यालय के सभी ${studentIds.length} विद्यार्थियों के प्रवेश पत्र को रोक (Lock) दिया गया है।`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Bulk Unlock Paid & Eligible Students
  const handleUnlockPaidOnly = () => {
    if (!activeExam) return;
    const updates = students.map((st) => {
      const due = getStudentDueAmount(st.id);
      const isPaid = due <= 0;
      const rawConv = st.conveyFee || 0;
      const hasConvey = Boolean((rawConv > 0 && rawConv !== 600) || st.conveyVehicle || st.conveyRoute || (st as any).transportRoute);
      const maxAllowed = hasConvey ? 3900 : 2500;
      const isEligible = due <= maxAllowed;
      return {
        studentId: st.id,
        isReleased: isEligible,
        lockReason: !isEligible
          ? `बकाया शुल्क सीमा से अधिक है: ₹${due.toLocaleString('en-IN')} (स्वीकृत सीमा: ₹${maxAllowed.toLocaleString('en-IN')})`
          : undefined,
        dueTuitionFee: isPaid ? 0 : (hasConvey ? 1800 : 2200),
        dueExamFee: isPaid ? 0 : 300,
        dueConveyFee: isPaid ? 0 : (hasConvey ? 1800 : 0),
        totalDueAmount: isPaid ? 0 : (hasConvey ? 3900 : 2500),
        otherFeesStatus: isPaid ? 'FULLY PAID (पूर्णतः चुकता • ₹0)' : 'ALL PAID (पूर्णतः चुकता)',
      };
    });
    batchSetAdmitCardPermissions(activeExam.id, updates);
    const eligibleCount = updates.filter((u) => u.isReleased).length;
    setActionFeedback(`✓ परीक्षा नीति अनुसार पात्र ${eligibleCount} छात्रों को प्रवेश पत्र अनुमति दी गई (शून्य बकाया छात्र: ₹0 शुल्क, गैर-साधन ≤ ₹2,500, साधन वाले ≤ ₹3,900), शेष ${updates.length - eligibleCount} छात्र बकाया अधिक होने से लॉक हैं।`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Restore and sync original given roll numbers for current class or all classes
  const handleAutoAssignRollNumbers = () => {
    if (!selectedClassId) {
      if (
        window.confirm(
          'क्या आप सभी विद्यार्थियों के पूर्व निर्धारित मूल रोल नंबर (Original Given Roll Nos: 101, 102, 201, 301, 401, 501, 601, 001, 01, 02 आदि) पुनर्स्थापित कर एडमिट कार्ड पर सेट करना चाहते हैं?'
        )
      ) {
        autoAssignAllClassesRollNos();
        setActionFeedback(
          '✓ सभी कक्षाओं के मूल दिए गए रोल नंबर (Original Given Roll Nos) सफलतापूर्वक एडमिट कार्ड पर सेट कर दिए गए हैं।'
        );
        setTimeout(() => setActionFeedback(null), 4000);
      }
      return;
    }

    if (
      window.confirm(
        `क्या आप ${activeClass?.name || 'इस कक्षा'} के विद्यार्थियों के पूर्व निर्धारित मूल रोल नंबर एडमिट कार्ड पर सेट करना चाहते हैं?`
      )
    ) {
      autoAssignClassRollNos(selectedClassId);
      setActionFeedback(
        `✓ ${activeClass?.name || 'कक्षा'} के मूल दिए गए रोल नंबर सफलतापूर्वक एडमिट कार्ड पर सेट कर दिए गए हैं।`
      );
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Students eligible for bulk printing (unlocked only)
  const unlockedStudentsForPrint = useMemo(() => {
    return classStudents.filter((st) => {
      const ac = getAdmitCardForStudent(st.id, st.admissionNo);
      return isStudentAdmitCardUnlocked(st, ac);
    });
  }, [classStudents, isStudentAdmitCardUnlocked]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-blue-700" />
            <span>Official Examination Board • Admit Card Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Exam Admit Cards & Roll Numbers (प्रवेश पत्र एवं रोल नंबर)
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            विद्यार्थियों के रोल नंबर दर्ज करें, प्रवेश पत्र डाउनलोड की अनुमति दें या रोकें, तथा आधिकारिक A4 प्रवेश पत्र प्रिंट करें।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Center & Timing Settings</span>
          </button>

          <button
            onClick={() => setIsBulkPrintOpen(true)}
            disabled={unlockedStudentsForPrint.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 disabled:bg-slate-300 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Bulk Print ({unlockedStudentsForPrint.length})</span>
          </button>
        </div>
      </div>

      {/* Exam & Class Selection Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {exams.map((ex) => {
          const isSelected = ex.id === selectedExamId;
          const classCount = students.length;
          const unlockedCount = students.filter((s) => {
            const ac = admitCards.find((a) => a.examId === ex.id && a.studentId === s.id);
            return Boolean(ac && ac.isReleased === true);
          }).length;

          return (
            <button
              key={ex.id}
              onClick={() => setSelectedExamId(ex.id)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-950 bg-blue-50/70 shadow-md ring-2 ring-blue-900/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
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

                <h3 className={`font-extrabold text-xs sm:text-sm ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                  {ex.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{ex.term}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-emerald-700">
                  {unlockedCount} / {classCount} Unlocked
                </span>
                <span className={`font-bold ${isSelected ? 'text-blue-950' : 'text-slate-400'}`}>
                  {isSelected ? '✓ Selected' : 'Select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Total Students (कुल छात्र)
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">{stats.total}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeClass?.name || 'All Classes'}</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1 flex items-center gap-1">
            <Unlock className="w-3 h-3 text-emerald-600" />
            <span>Allowed / Unlocked (जारी)</span>
          </span>
          <span className="text-xl font-extrabold text-emerald-800 font-mono">{stats.unlocked}</span>
          <p className="text-[10px] text-emerald-600 mt-0.5">Can download from portal</p>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-rose-600" />
            <span>Locked / Withheld (रोक)</span>
          </span>
          <span className="text-xl font-extrabold text-rose-800 font-mono">{stats.locked}</span>
          <p className="text-[10px] text-rose-600 mt-0.5">Portal access disabled</p>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Fee Dues Pending (शुल्क बकाया)</span>
          </span>
          <span className="text-xl font-extrabold text-amber-800 font-mono">{stats.withDues}</span>
          <p className="text-[10px] text-amber-600 mt-0.5">Students with balance</p>
        </div>
      </div>

      {/* Class, Search & Quick Actions Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Class Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Class:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-blue-900 text-xs"
              >
                <option value="">All Classes ({students.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-blue-900 text-xs"
              >
                <option value="all">All Students ({classStudents.length})</option>
                <option value="unlocked">✓ Allowed / Permitted by Admin ({stats.unlocked})</option>
                <option value="locked">🔒 Not Allowed / Pending ({stats.locked})</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-slate-500 font-semibold text-[10px] uppercase mb-0.5">Search Student:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Name, roll no, adm no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-blue-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
            <button
              onClick={handleAllowAllSchool}
              title="Unlock admit cards for all students across the entire school"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Allow ALL (पूरा विद्यालय)</span>
            </button>

            {selectedClassId && (
              <button
                onClick={handleAllowDisplayed}
                title="Unlock admit cards for students in selected class"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs transition shadow-2xs cursor-pointer"
              >
                <span>Allow {activeClass?.name || 'Class'} ({classStudents.length})</span>
              </button>
            )}

            <button
              onClick={handleLockAllSchool}
              title="Lock admit cards for all students across the entire school"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock ALL (पूरा विद्यालय)</span>
            </button>

            {selectedClassId && (
              <button
                onClick={handleLockDisplayed}
                title="Lock admit cards for students in selected class"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold text-xs transition shadow-2xs cursor-pointer"
              >
                <span>Lock {activeClass?.name || 'Class'} ({classStudents.length})</span>
              </button>
            )}

            <button
              onClick={handleUnlockPaidOnly}
              title="Unlock students with 0 dues or permitted dues (Non-transport ≤ ₹2,500, Transport ≤ ₹3,900)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Allow Eligible / Paid</span>
            </button>

            <button
              onClick={handleAutoAssignRollNumbers}
              title="विद्यार्थियों के मूल दिए गए रोल नंबर पुनर्स्थापित/सेट करें (Original Given Roll Nos)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold text-xs transition cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-blue-700" />
              <span>मूल रोल नंबर सेट करें</span>
            </button>
          </div>
        </div>

        {actionFeedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-950 flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Students Admit Card Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-blue-950 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4 w-36">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-300" />
                    <span>Roll No (रोल नंबर)</span>
                  </div>
                </th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-3">Class & Section</th>
                <th className="py-3 px-3 text-center">Fee Status</th>
                <th className="py-3 px-4 text-center">Admit Card Access (अनुमति / लॉक)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No students found matching current filters.</p>
                  </td>
                </tr>
              ) : (
                classStudents.map((st, idx) => {
                  const ac = getAdmitCardForStudent(st.id, st.admissionNo);
                  const isUnlocked = isStudentAdmitCardUnlocked(st, ac);
                  const currentRoll = (st.rollNo?.trim() || ac?.rollNo?.trim() || '').replace(/^(NUR|LKG|UKG)-/, '');
                  const due = getStudentDueAmount(st.id);
                  const rawConv = st.conveyFee || 0;
                  const hasConvey = Boolean((rawConv > 0 && rawConv !== 600) || st.conveyVehicle || st.conveyRoute || (st as any).transportRoute);
                  const maxAllowed = hasConvey ? 3900 : 2500;
                  const isEditingRoll = editingRollNoId === st.id;
                  const cls = classes.find((c) => c.id === st.classId);

                  return (
                    <tr
                      key={st.id}
                      className={`transition ${
                        isUnlocked ? 'hover:bg-blue-50/30' : 'bg-slate-50/40 hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Roll Number Inline Editable */}
                      <td className="py-3 px-4">
                        {isEditingRoll ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={tempRollNo}
                              onChange={(e) => setTempRollNo(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRollNo(st.id);
                                if (e.key === 'Escape') setEditingRollNoId(null);
                              }}
                              placeholder="e.g. 101"
                              className="w-20 px-2 py-1 bg-amber-50 border-2 border-amber-400 rounded text-xs font-bold text-slate-900 focus:outline-hidden"
                            />
                            <button
                              onClick={() => handleSaveRollNo(st.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Save Roll Number"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRollNoId(null)}
                              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRollNoId(st.id);
                              setTempRollNo(currentRoll);
                            }}
                            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 text-left transition"
                            title="Click to edit roll number"
                          >
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {currentRoll ? `#${currentRoll}` : 'Set Roll'}
                            </span>
                            <span className="text-[10px] text-slate-400 group-hover:text-amber-700 font-normal">
                              ✎
                            </span>
                          </button>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{st.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 uppercase block leading-tight">
                              {st.fullName}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>Adm: {st.admissionNo}</span>
                              {st.fatherName && <span>• F: {st.fatherName}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {cls?.name || st.classId} - {st.section}
                      </td>

                      {/* Fee Status */}
                      <td className="py-3 px-3 text-center">
                        {due <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fully Paid
                          </span>
                        ) : due <= maxAllowed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            ₹{due.toLocaleString('en-IN')} Due (Permitted • {hasConvey ? 'साधन' : 'गैर-साधन'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ₹{due.toLocaleString('en-IN')} Due
                          </span>
                        )}
                      </td>

                      {/* Lock / Unlock Toggle Button */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isUnlocked ? (
                            <button
                              onClick={() => handleToggleLock(st)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs transition shadow-2xs cursor-pointer bg-emerald-600 hover:bg-rose-600 text-white group"
                              title="अनुमति प्राप्त है • क्लिक करके अनुमति वापस लें (Revoke Permission)"
                            >
                              <Unlock className="w-3.5 h-3.5 group-hover:hidden" />
                              <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                              <span className="group-hover:hidden">✓ Allowed (अनुमति प्राप्त)</span>
                              <span className="hidden group-hover:inline">Lock (अनुमति हटाएं)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleLock(st)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-300 hover:border-emerald-600"
                              title="अनुमति नहीं है • क्लिक करके छात्र को अनुमति प्रदान करें (Grant Permission)"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                              <span>Give Permission (अनुमति दें)</span>
                            </button>
                          )}

                          <span className="text-[10px] text-slate-500 font-medium max-w-[150px] truncate" title={ac?.lockReason}>
                            {isUnlocked ? 'पोर्टल पर दिखेगा व डाउनलोड होगा' : (ac?.lockReason || 'अनुमति नहीं दी गई')}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewStudent(st)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold text-xs transition"
                            title="Preview and Print Student Admit Card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Student Admit Card Print Preview Modal */}
      {previewStudent && activeExam && (
        <PrintPreviewModal
          isOpen={Boolean(previewStudent)}
          onClose={() => setPreviewStudent(null)}
          title={`Admit Card: ${previewStudent.fullName} (${activeExam.name})`}
          fileName={`SBSC-AdmitCard-${previewStudent.fullName.replace(/\s+/g, '_')}-${activeExam.name.replace(/\s+/g, '_')}.pdf`}
        >
          <div id="printable-document-content">
            <ExamAdmitCardPdf
              exam={activeExam}
              student={previewStudent}
              admitCard={getAdmitCardForStudent(previewStudent.id, previewStudent.admissionNo)}
              targetClass={classes.find((c) => c.id === previewStudent.classId)}
            />
          </div>
        </PrintPreviewModal>
      )}

      {/* Bulk Print Modal (All Unlocked Students) */}
      {isBulkPrintOpen && activeExam && (
        <PrintPreviewModal
          isOpen={isBulkPrintOpen}
          onClose={() => setIsBulkPrintOpen(false)}
          title={`Bulk Admit Cards: ${activeClass?.name || 'All Classes'} (${unlockedStudentsForPrint.length} Students)`}
          fileName={`SBSC-Bulk-AdmitCards-${activeExam.name.replace(/\s+/g, '_')}.pdf`}
        >
          <div id="printable-document-content" className="space-y-12 print:space-y-0">
            {unlockedStudentsForPrint.map((st, i) => (
              <div key={st.id} className="print:break-after-page print:page-break-after-always">
                <ExamAdmitCardPdf
                  exam={activeExam}
                  student={st}
                  admitCard={getAdmitCardForStudent(st.id, st.admissionNo)}
                  targetClass={classes.find((c) => c.id === st.classId)}
                />
              </div>
            ))}
          </div>
        </PrintPreviewModal>
      )}

      {/* Settings Modal (Exam Center, Timings, Instructions) */}
      {isSettingsModalOpen && activeExam && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">Admit Card Examination Settings</h3>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Apply defaults to all students in current class or exam
                const instructionsArray = defaultInstructions.split('\n').filter((l) => l.trim().length > 0);
                classStudents.forEach((st) => {
                  updateAdmitCard(activeExam.id, st.id, {
                    examCenter: defaultExamCenter,
                    reportingTime: defaultReportingTime,
                    examTiming: defaultExamTiming,
                    instructions: instructionsArray,
                  });
                });
                setIsSettingsModalOpen(false);
                alert('Exam center, timings and instructions updated successfully for all students in this view!');
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Center Name & Address *</label>
                <input
                  type="text"
                  required
                  value={defaultExamCenter}
                  onChange={(e) => setDefaultExamCenter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Candidate Reporting Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:30 AM"
                    value={defaultReportingTime}
                    onChange={(e) => setDefaultReportingTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Exam Duration / Timing *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:00 AM – 12:00 PM"
                    value={defaultExamTiming}
                    onChange={(e) => setDefaultExamTiming(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">General Candidate Instructions (1 per line)</label>
                <textarea
                  rows={4}
                  value={defaultInstructions}
                  onChange={(e) => setDefaultInstructions(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md"
                >
                  Apply to Selected Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
