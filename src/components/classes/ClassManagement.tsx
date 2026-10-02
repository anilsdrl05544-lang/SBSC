import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { ClassInfo, SubjectItem } from '../../types/school';
import { CURRICULUM_TEMPLATES } from '../../data/initialData';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Users,
  DoorClosed,
  CreditCard,
  X,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
  Search,
  ArrowRight,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { FeeDuesReportPdf } from '../reports/templates/FeeDuesReportPdf';

export const ClassManagement: React.FC = () => {
  const {
    classes,
    addClass,
    updateClass,
    deleteClass,
    restoreInitialClasses,
    teachers,
    students,
    settings,
  } = useSchool();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<ClassInfo | null>(null);

  // Active Delete Confirmation Modal State
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
  const [reassignAction, setReassignAction] = useState<'reassign' | 'unassign'>('reassign');
  const [targetReassignClassId, setTargetReassignClassId] = useState<string>('');

  // Reset / Restore confirmation state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Due List PDF Print Modal State
  const [duesClassForPdf, setDuesClassForPdf] = useState<ClassInfo | null>(null);

  // Notification / Alert message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Omit<ClassInfo, 'id'>>({
    name: 'Class 11',
    gradeNumber: 11,
    sections: ['A', 'B'],
    classTeacherId: teachers[0]?.id || '',
    roomNumber: 'Room 301',
    monthlyFee: 2000,
    capacity: 45,
    subjects: [
      { id: 'sub-1', name: 'Physics', code: 'PHY-042', maxMarks: 100, passingMarks: 33 },
      { id: 'sub-2', name: 'Chemistry', code: 'CHEM-043', maxMarks: 100, passingMarks: 33 },
      { id: 'sub-3', name: 'Mathematics', code: 'MATH-041', maxMarks: 100, passingMarks: 33 },
      { id: 'sub-4', name: 'English Core', code: 'ENG-301', maxMarks: 100, passingMarks: 33 },
    ],
  });

  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectMaxMarks, setSubjectMaxMarks] = useState(50);

  // Helper to show dismissable toast
  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleApplyCurriculumTemplate = (templateKey: 'PRE_PRIMARY' | 'PRIMARY_1_TO_5' | 'MIDDLE_6_TO_8') => {
    const list = CURRICULUM_TEMPLATES[templateKey];
    if (!list) return;
    const mapped: SubjectItem[] = list.map((item, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      name: item.name,
      code: item.code,
      maxMarks: item.maxMarks,
      passingMarks: item.passingMarks,
    }));
    setFormData((prev) => ({
      ...prev,
      subjects: mapped,
    }));
    const label = templateKey === 'PRE_PRIMARY' ? 'Pre-Primary (हिंदी, Math, English, Art - 50M each)' : templateKey === 'PRIMARY_1_TO_5' ? 'Primary 1-5 (हिंदी, English, Math, Science, Social, Computer - 50M each)' : 'Middle 6-8 (हिंदी, English, Math, Science, Geography, History, संस्कृत, Art, Home Science - 50M each)';
    showToast(`Applied preset: ${label}`, 'success');
  };

  // Sort classes logically: Nursery, LKG, UKG, Grade 1 to 12, PRT
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const getOrder = (c: ClassInfo) => {
        if (c.id === 'c-nursery') return 1;
        if (c.id === 'c-lkg') return 2;
        if (c.id === 'c-ukg') return 3;
        if (c.id === 'c-prt') return 25;
        return (c.gradeNumber ?? 0) + 10;
      };
      return getOrder(a) - getOrder(b);
    });
  }, [classes]);

  // Filtered classes by search
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return sortedClasses;
    const q = searchQuery.toLowerCase().trim();
    return sortedClasses.filter((c) => {
      const teacher = teachers.find((t) => t.id === c.classTeacherId);
      return (
        c.name.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q) ||
        (teacher && teacher.name.toLowerCase().includes(q)) ||
        c.sections.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [sortedClasses, searchQuery, teachers]);

  const handleOpenAdd = () => {
    setClassToEdit(null);
    setFormData({
      name: `Class ${classes.length + 1}`,
      gradeNumber: classes.length + 1,
      sections: ['A'],
      classTeacherId: teachers[0]?.id || '',
      roomNumber: `Room 10${classes.length + 1}`,
      monthlyFee: 1200,
      capacity: 35,
      subjects: [
        { id: `sub-${Date.now()}-1`, name: 'हिंदी', code: 'HIN', maxMarks: 50, passingMarks: 17 },
        { id: `sub-${Date.now()}-2`, name: 'English', code: 'ENG', maxMarks: 50, passingMarks: 17 },
        { id: `sub-${Date.now()}-3`, name: 'Math', code: 'MATH', maxMarks: 50, passingMarks: 17 },
        { id: `sub-${Date.now()}-4`, name: 'Science', code: 'SCI', maxMarks: 50, passingMarks: 17 },
        { id: `sub-${Date.now()}-5`, name: 'Social', code: 'SOC', maxMarks: 50, passingMarks: 17 },
        { id: `sub-${Date.now()}-6`, name: 'Computer', code: 'CMP', maxMarks: 50, passingMarks: 17 },
      ],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ClassInfo) => {
    setClassToEdit(c);
    const { id, ...rest } = c;
    setFormData(rest);
    setIsModalOpen(true);
  };

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    const max = Number(subjectMaxMarks) || 50;
    const newSub: SubjectItem = {
      id: `sub-${Date.now()}`,
      name: subjectName.trim(),
      code: subjectCode.trim() || subjectName.slice(0, 3).toUpperCase(),
      maxMarks: max,
      passingMarks: max === 50 ? 17 : Math.round(max * 0.33),
    };
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSub],
    }));
    setSubjectName('');
    setSubjectCode('');
    setSubjectMaxMarks(50);
  };

  const handleRemoveSubject = (subId: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subId),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (classToEdit) {
      updateClass(classToEdit.id, formData);
      showToast(`Class "${formData.name}" updated successfully!`, 'success');
    } else {
      addClass(formData);
      showToast(`New class "${formData.name}" added successfully!`, 'success');
    }
    setIsModalOpen(false);
  };

  // Initiate Delete Class Flow
  const triggerDelete = (cls: ClassInfo) => {
    setClassToDelete(cls);
    // Find first other available class as default reassign target
    const otherClass = classes.find((c) => c.id !== cls.id);
    setTargetReassignClassId(otherClass?.id || '');
    setReassignAction('reassign');
  };

  // Execute Active Deletion (without window.confirm!)
  const handleConfirmDelete = () => {
    if (!classToDelete) return;

    const enrolledStudents = students.filter((s) => s.classId === classToDelete.id);
    const reassignId = reassignAction === 'reassign' ? targetReassignClassId : undefined;

    deleteClass(classToDelete.id, reassignId);

    if (enrolledStudents.length > 0 && reassignId) {
      const targetClass = classes.find((c) => c.id === reassignId);
      showToast(
        `Class "${classToDelete.name}" deleted. ${enrolledStudents.length} students reassigned to "${targetClass?.name || 'new class'}".`,
        'success'
      );
    } else if (enrolledStudents.length > 0) {
      showToast(
        `Class "${classToDelete.name}" deleted. ${enrolledStudents.length} students marked unassigned.`,
        'warning'
      );
    } else {
      showToast(`Class "${classToDelete.name}" has been permanently deleted.`, 'success');
    }

    setClassToDelete(null);
  };

  // Handle restoring initial classes
  const handleRestoreDefaults = () => {
    restoreInitialClasses();
    setIsRestoreModalOpen(false);
    showToast('Standard school classes have been restored to default list.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-md transition-all animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-extrabold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Curriculum & Class Hierarchy</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Class & Subject Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure classes, sections, assigned faculty in-charges, fee structures, and delete obsolete classes with active student reassignments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRestoreModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Restore default pre-primary and secondary classes"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() =>
              setDuesClassForPdf({
                id: '',
                name: 'All Classes',
                section: 'All',
                capacity: 0,
                monthlyFee: 0,
                subjects: [],
                roomNumber: '',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Open Class-Wise Outstanding Dues PDF Register for all classes"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Class-Wise Due List PDF</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add New Class</span>
          </button>
        </div>
      </div>

      {/* Search and Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search class, room, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-blue-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Classes: <strong className="text-blue-950 font-black">{classes.length}</strong>
          </span>
          <span className="text-xs font-bold text-slate-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
            Total Students: <strong className="text-blue-950 font-black">{students.length}</strong>
          </span>
        </div>
      </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No classes found</h3>
          <p className="text-slate-500 text-xs mt-1">
            {searchQuery ? `No classes matching "${searchQuery}"` : 'No classes available in the school system.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-950 text-white text-xs font-bold hover:bg-blue-900"
            >
              Add First Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const classTeacher = teachers.find((t) => t.id === cls.classTeacherId);
            const enrolledCount = students.filter((s) => s.classId === cls.id).length;

            return (
              <div
                key={cls.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition relative group"
              >
                <div>
                  {/* Title and Sections */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">GRADE LEVEL</span>
                      <h3 className="text-lg font-extrabold text-blue-950 flex items-center gap-2">
                        {cls.name}
                        {cls.id === 'c-prt' && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md font-black">
                            PRT
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {cls.sections.map((sec) => (
                        <span
                          key={sec}
                          className="w-6 h-6 rounded-full bg-blue-100 text-blue-950 font-bold text-xs flex items-center justify-center border border-blue-300"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Info Items */}
                  <div className="space-y-2 text-xs border-y border-slate-100 py-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Enrolled Students:</span>
                      </span>
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-md ${
                          enrolledCount > 0 ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {enrolledCount} / {cls.capacity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                        <span>Classroom Location:</span>
                      </span>
                      <span className="font-medium text-slate-800">{cls.roomNumber}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>Class Teacher:</span>
                      </span>
                      <span className="font-bold text-slate-900">{classTeacher?.name || 'Not Assigned'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Monthly Fee Slab:</span>
                      </span>
                      <span className="font-extrabold text-emerald-800">
                        {settings.currencySymbol} {(Number(cls.monthlyFee) || 0).toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                  </div>

                  {/* Subject Pills */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Curriculum Subjects ({cls.subjects.length}):
                      </span>
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {cls.subjects[0]?.maxMarks || 50} Max Marks
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cls.subjects.map((sub) => (
                        <span
                          key={sub.id}
                          className="bg-slate-50 hover:bg-blue-50 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px] border border-slate-200"
                        >
                          {sub.name} <span className="text-[9px] text-slate-400 font-mono">({sub.code || sub.name.slice(0, 3)})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Action Buttons: Edit and Prominent Delete */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Class ID: {cls.id}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDuesClassForPdf(cls)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                      title={`Open Due List PDF for Class ${cls.name}`}
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-700" />
                      <span>Dues PDF</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                      title={`Edit ${cls.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-900" />
                      <span>Edit</span>
                    </button>

                    {/* Active, Functional Delete Button */}
                    <button
                      onClick={() => triggerDelete(cls)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                      title={`Delete ${cls.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-red-200 animate-fadeIn">
            {/* Red Alert Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Confirm Class Deletion</h3>
                  <p className="text-[11px] text-red-100">Permanent removal of academic class record</p>
                </div>
              </div>
              <button
                onClick={() => setClassToDelete(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-rose-900 text-sm">
                      Delete Class &quot;{classToDelete.name}&quot;?
                    </h4>
                    <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                      You are about to permanently remove this class from the system. This will remove its timetable, fee configuration, and teacher assignment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Class Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Room / Location:</span>
                  <span className="font-bold text-slate-900">{classToDelete.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Class Teacher:</span>
                  <span className="font-bold text-slate-900">
                    {teachers.find((t) => t.id === classToDelete.classTeacherId)?.name || 'None Assigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Sections:</span>
                  <span className="font-bold text-slate-900">{classToDelete.sections.join(', ')}</span>
                </div>
              </div>

              {/* Enrolled Students Protection */}
              {(() => {
                const enrolledCount = students.filter((s) => s.classId === classToDelete.id).length;
                const otherClasses = classes.filter((c) => c.id !== classToDelete.id);

                if (enrolledCount === 0) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-900 font-bold">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero (0) students enrolled in this class. Safe to delete immediately.</span>
                    </div>
                  );
                }

                return (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Notice: {enrolledCount} active student{enrolledCount > 1 ? 's' : ''} currently enrolled!</span>
                    </div>

                    <p className="text-slate-600 text-[11px]">
                      Choose how you want to handle existing students currently assigned to this class:
                    </p>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reassignOption"
                          checked={reassignAction === 'reassign'}
                          onChange={() => setReassignAction('reassign')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-900"
                        />
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 block text-xs">
                            Reassign students to another class:
                          </span>
                          {reassignAction === 'reassign' && (
                            <select
                              value={targetReassignClassId}
                              onChange={(e) => setTargetReassignClassId(e.target.value)}
                              className="mt-1.5 w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-xs text-blue-950 focus:outline-blue-900"
                            >
                              {otherClasses.map((oc) => (
                                <option key={oc.id} value={oc.id}>
                                  {oc.name} (Room {oc.roomNumber})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer pt-1 border-t border-amber-200">
                        <input
                          type="radio"
                          name="reassignOption"
                          checked={reassignAction === 'unassign'}
                          onChange={() => setReassignAction('unassign')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-900"
                        />
                        <div>
                          <span className="font-bold text-slate-800 text-xs">
                            Keep students as &quot;Unassigned&quot;
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            Students will remain in database and can be moved to another class later.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel / Keep Class
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete Class</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">{classToEdit ? 'Edit Class & Subjects' : 'Create New Class'}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 11 (Commerce)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-blue-950"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Grade Sequence No.</label>
                  <input
                    type="number"
                    value={formData.gradeNumber}
                    onChange={(e) => setFormData({ ...formData, gradeNumber: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sections (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="A, B, C"
                    value={formData.sections.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sections: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class Teacher</label>
                  <select
                    value={formData.classTeacherId || ''}
                    onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  >
                    <option value="">None Assigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Room / Floor</label>
                  <input
                    type="text"
                    placeholder="Room 204 (2nd Floor)"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Monthly Tuition Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-extrabold text-emerald-800"
                  />
                </div>
              </div>

              {/* Subject Adder & Preset Templates */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
                    Configure Class Subjects ({formData.subjects.length}):
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Standard: 50 max marks per subject
                  </span>
                </div>

                {/* 1-Click Curriculum Presets */}
                <div className="mb-3 p-2 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-900 uppercase block mb-1.5">
                    Apply Standard Curriculum Presets (50 Marks Each):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCurriculumTemplate('PRE_PRIMARY')}
                      className="px-2 py-1 rounded bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 font-semibold text-[11px] transition shadow-xs cursor-pointer"
                    >
                      Nursery / L.K.G. / U.K.G. (हिंदी, Math, English, Art)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCurriculumTemplate('PRIMARY_1_TO_5')}
                      className="px-2 py-1 rounded bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 font-semibold text-[11px] transition shadow-xs cursor-pointer"
                    >
                      Class 1 to 5 (हिंदी, English, Math, Science, Social, Computer)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCurriculumTemplate('MIDDLE_6_TO_8')}
                      className="px-2 py-1 rounded bg-white hover:bg-blue-100 border border-blue-300 text-blue-900 font-semibold text-[11px] transition shadow-xs cursor-pointer"
                    >
                      Class 6 to 8 (हिंदी, English, Math, Science, Geo, His, संस्कृत, Art, Home Sci)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Subject Name (e.g. Science)"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs min-w-[140px]"
                  />
                  <input
                    type="text"
                    placeholder="Code (SCI)"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-20 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Max:</span>
                    <input
                      type="number"
                      value={subjectMaxMarks}
                      onChange={(e) => setSubjectMaxMarks(Number(e.target.value))}
                      className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-blue-950 text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-3 py-2 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition cursor-pointer text-xs"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {formData.subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="bg-white p-2 rounded border border-slate-200 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {sub.name} <span className="text-[10px] text-slate-500 font-mono">[{sub.code || sub.name.slice(0, 3)}]</span>
                        </span>
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Max: {sub.maxMarks || 50}M
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Pass: {sub.passingMarks || 17}M
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Remove subject"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {formData.subjects.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3 italic">
                      No subjects added yet. Click one of the presets above to quickly configure subjects.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between gap-3">
                {/* Delete button directly in Edit Modal if editing an existing class */}
                {classToEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      triggerDelete(classToEdit);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Class</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>{classToEdit ? 'Save Changes' : 'Create Class'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Default Classes Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold">Reset Default Classes</h3>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                This will restore all default classes (Nursery, LKG, UKG, Class 1 to Class 10, and PRT Primary In-Charge) to the school registry, clearing any deleted class entries.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Restore Standard Classes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class-Wise Due List PDF Print & Export Modal */}
      {duesClassForPdf && (
        <PrintPreviewModal
          isOpen={!!duesClassForPdf}
          onClose={() => setDuesClassForPdf(null)}
          title={
            duesClassForPdf.id
              ? `Class ${duesClassForPdf.name} - Outstanding Due List PDF`
              : 'Class-Wise Outstanding Fee & Dues Deficiency Register'
          }
          fileName={`SBSC-ClassWise-Due-List-${
            duesClassForPdf.id ? `Class-${duesClassForPdf.name.replace(/\s+/g, '-')}-` : ''
          }${new Date().toISOString().slice(0, 10)}.pdf`}
        >
          <FeeDuesReportPdf
            selectedClass={duesClassForPdf.id ? duesClassForPdf : undefined}
            initialClassId={duesClassForPdf.id || undefined}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
};
