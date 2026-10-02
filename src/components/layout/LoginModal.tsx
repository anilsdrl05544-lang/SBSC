import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { UserRole, Teacher } from '../../types/school';
import {
  Shield,
  GraduationCap,
  User,
  Users,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  X,
  LogIn,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  ArrowRight,
  Search,
  BookOpen,
  Check,
  Share2,
  Copy,
  Send,
  Filter,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getStudentEffectivePassword, getStudentPasswordBreakdown } from '../../utils/studentAuthUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToClassPortal?: (
    tab?: 'students' | 'attendance' | 'fees' | 'exams' | 'homework' | 'notices',
    classId?: string
  ) => void;
  onNavigateToAttendance?: (classId?: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onNavigateToClassPortal,
  onNavigateToAttendance,
}) => {
  const {
    currentUser,
    switchRole,
    loginWithCredentials,
    loginAsTeacher,
    loginAsStudent,
    students,
    teachers,
    classes,
    getTeacherRelativeClasses,
    settings,
  } = useSchool();

  const [activeMode, setActiveMode] = useState<'select-teacher' | 'teacher-login' | 'student-login' | 'quick-switch'>('select-teacher');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Student Login State
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [studentError, setStudentError] = useState('');
  const [studentCopied, setStudentCopied] = useState(false);
  const [showPasswordHelper, setShowPasswordHelper] = useState(false);
  const [helperName, setHelperName] = useState('');
  const [helperPhone, setHelperPhone] = useState('');

  const helperBreakdown = useMemo(() => {
    return getStudentPasswordBreakdown(helperName, helperPhone);
  }, [helperName, helperPhone]);

  if (!isOpen) return null;

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    setTimeout(() => {
      const result = loginWithCredentials(identifier.trim(), password);
      setLoading(false);

      if (result.success) {
        onClose();
        if (result.user?.role === 'teacher' && onNavigateToClassPortal) {
          onNavigateToClassPortal('attendance');
        }
      } else {
        setErrorMessage(result.message || 'Invalid username or password.');
      }
    }, 200);
  };

  const handleQuickTeacherLogin = (teacher: Teacher, targetAction: 'attendance' | 'portal' = 'attendance') => {
    loginAsTeacher(teacher.id);
    onClose();

    if (targetAction === 'attendance') {
      if (onNavigateToClassPortal) {
        onNavigateToClassPortal('attendance', teacher.assignedClassId);
      } else if (onNavigateToAttendance) {
        onNavigateToAttendance(teacher.assignedClassId);
      }
    } else {
      if (onNavigateToClassPortal) {
        onNavigateToClassPortal('students', teacher.assignedClassId);
      }
    }
  };

  const handleSelectRole = (role: UserRole) => {
    switchRole(role);
    onClose();
    if (role === 'teacher' && onNavigateToClassPortal) {
      onNavigateToClassPortal('attendance');
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.empId.toLowerCase().includes(q) ||
      (t.assignedClass && t.assignedClass.toLowerCase().includes(q)) ||
      (t.subjects && t.subjects.some((s) => s.toLowerCase().includes(q))) ||
      t.designation.toLowerCase().includes(q)
    );
  });

  const roleProfiles: { role: UserRole; title: string; subtitle: string; icon: any; color: string }[] = [
    {
      role: 'admin',
      title: `Administrator: ${settings.adminName || 'Anil Singh'}`,
      subtitle: `Full master access to school registers, teacher passwords, fees, and settings. Contact: ${settings.adminPhone || settings.phone || '9452305199'}`,
      icon: Shield,
      color: 'bg-blue-950 text-amber-300 border-blue-900',
    },
    {
      role: 'teacher',
      title: 'Class Teacher / Faculty Panel',
      subtitle: 'Manage assigned class students, daily attendance register, due fees, and exam report cards.',
      icon: GraduationCap,
      color: 'bg-indigo-900 text-white border-indigo-800',
    },
    {
      role: 'student',
      title: 'Student Portal',
      subtitle: 'View report cards, attendance records, homework assignments, and notices.',
      icon: User,
      color: 'bg-emerald-900 text-white border-emerald-800',
    },
    {
      role: 'parent',
      title: 'Parent Portal',
      subtitle: 'Track student academic progress, fee payment history, dues, and circulars.',
      icon: Users,
      color: 'bg-amber-900 text-white border-amber-800',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                {settings.schoolName}
              </span>
              <h3 className="text-base font-extrabold tracking-tight">Teacher & Faculty Login Portal</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 flex gap-1">
          <button
            onClick={() => setActiveMode('select-teacher')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'select-teacher'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-900" />
            <span>Select Faculty (1-Click)</span>
          </button>

          <button
            onClick={() => setActiveMode('teacher-login')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'teacher-login'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Faculty Login</span>
          </button>

          <button
            onClick={() => setActiveMode('student-login')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'student-login'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>All Students Portal (सभी कक्षाएं)</span>
          </button>

          <button
            onClick={() => setActiveMode('quick-switch')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'quick-switch'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-900" />
            <span>Role Switcher</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: SELECT TEACHER (1-CLICK DIRECT ATTENDANCE) */}
        {/* ========================================================================= */}
        {activeMode === 'select-teacher' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Faculty Direct Access & Class Attendance</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Select a class teacher to immediately authenticate and open their relative class attendance register.
                </p>
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Filter by teacher name, relative class (e.g. Class 10), subject..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-900 focus:bg-white"
              />
            </div>

            {/* Teachers List */}
            <div className="space-y-2.5">
              {filteredTeachers.map((teacher) => {
                const isCurrent = currentUser.role === 'teacher' && (currentUser.linkedId === teacher.id || currentUser.name === teacher.name);
                const relativeClasses = getTeacherRelativeClasses(teacher.id);
                const primaryClass = relativeClasses.find((r) => r.roleType === 'class-teacher')?.classInfo ||
                  classes.find((c) => c.id === teacher.assignedClassId || c.name === teacher.assignedClass);

                return (
                  <div
                    key={teacher.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{teacher.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                            {teacher.empId}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-extrabold text-blue-950 bg-blue-100 px-2 py-0.5 rounded-full">
                              Current User
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">{teacher.designation}</span>
                          <span>•</span>
                          <span className="text-slate-500">
                            {teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.join(', ') : 'All Subjects'}
                          </span>
                        </div>

                        {/* Relative Class Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {primaryClass && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100/90 text-amber-900 text-[11px] font-extrabold border border-amber-300">
                              ⭐ In-Charge: {primaryClass.name} (Sec {teacher.assignedSection || 'A'})
                            </span>
                          )}
                          {relativeClasses
                            .filter((r) => r.roleType === 'subject-teacher')
                            .slice(0, 2)
                            .map((r) => (
                              <span
                                key={r.classInfo.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                📘 {r.classInfo.name} Faculty
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleQuickTeacherLogin(teacher, 'attendance')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        title="Log in and take students attendance for assigned relative class"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Take Attendance</span>
                      </button>

                      <button
                        onClick={() => handleQuickTeacherLogin(teacher, 'portal')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                        title="Open Class Teacher Portal"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Class Portal</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTeachers.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No teachers found matching "{teacherSearch}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: TEACHER LOGIN PANEL WITH PASSWORD */}
        {/* ========================================================================= */}
        {activeMode === 'teacher-login' && (
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-900">Class Teacher & Staff Authentication</h4>
              <p className="text-xs text-slate-500">
                Log in with your administrator-generated password to manage your assigned class students, attendance, due fees, and exam report cards.
              </p>
            </div>

            {/* Quick autofill badges */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Quick Demo Faculty Login:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {teachers.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(t.username || t.empId);
                      setPassword(t.password || 'Teacher@123');
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-blue-900 hover:bg-blue-50/50 text-slate-700 transition"
                  >
                    {t.name.split(' ')[1] || t.name} ({t.assignedClass || 'Faculty'})
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username / Emp ID / Email *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ku.shanti or TCH-101"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-blue-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-blue-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-98"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Faculty Portal & Take Attendance'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE: ALL CLASS ALL STUDENTS ONE LOGIN PANEL (STRICTLY READ-ONLY) */}
        {/* ========================================================================= */}
        {activeMode === 'student-login' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Header & Share Bar */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                        All Class All Students One Login Panel
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Strictly Read-Only (केवल देखने हेतु)</span>
                      </span>
                    </div>
                    <p className="text-xs text-teal-200/90 mt-0.5">
                      एक ही स्थान से सभी कक्षाओं के छात्र एवं अभिभावक अपना परिणाम, हाजिरी एवं फीस रसीदें देख सकते हैं।
                    </p>
                  </div>
                </div>

                {/* Share Button for Student Portal */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      let baseOrigin = window.location.origin;
                      if (baseOrigin.includes('ais-dev-')) {
                        baseOrigin = baseOrigin.replace('ais-dev-', 'ais-pre-');
                      }
                      const publicPortalUrl = `${baseOrigin}/?portal=student#student-portal`;
                      const shareMsg = `🏫 *${settings.schoolName || 'SBSC School'}*\n📋 *OFFICIAL STUDENT PORTAL (छात्र एवं अभिभावक पोर्टल)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\nसभी कक्षाओं के छात्र एवं अभिभावक अपना जारी परिणाम (Marksheet), दैनिक हाजिरी (Attendance), एवं फीस रसीदें (Fee Receipts) बिना किसी परेशानी के सीधे देख सकते हैं:\n🔗 ${publicPortalUrl}\n\n🔑 *लॉगिन पासवर्ड फॉर्मूला:*\nनाम के पहले 4 अक्षर (CAPITAL) + मोबाइल के अंतिम 4 अंक (जैसे: AMIT9876)\n\n_(नोट: यह केवल देखने हेतु आधिकारिक डिजिटल रिकॉर्ड है। इसमें कोई बदलाव नहीं किया जा सकता।)_`;

                      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;
                      dispatchSafeMessage(waUrl, 'whatsapp', shareMsg);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                    title="Share Student Portal on WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      let baseOrigin = window.location.origin;
                      if (baseOrigin.includes('ais-dev-')) {
                        baseOrigin = baseOrigin.replace('ais-dev-', 'ais-pre-');
                      }
                      const publicPortalUrl = `${baseOrigin}/?portal=student#student-portal`;
                      try {
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(publicPortalUrl);
                          setStudentCopied(true);
                          setTimeout(() => setStudentCopied(false), 2000);
                        } else {
                          window.prompt('Student Portal Link:', publicPortalUrl);
                        }
                      } catch {
                        window.prompt('Student Portal Link:', publicPortalUrl);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      studentCopied
                        ? 'bg-white text-emerald-950 border-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title="Copy Student Portal Link"
                  >
                    {studentCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Non-Editable Institutional Guarantee Note */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Institutional Read-Only Security Guarantee (अपरिवर्तनीय रिकॉर्ड):</strong>
                <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                  इस पोर्टल पर कोई भी संपादन (Edit) या बदलाव अनुमत नहीं है। छात्र और अभिभावक केवल अपना प्रकाशित परिणाम (Marksheets), हाजिरी और फीस विवरण देख व रसीद प्रिंट कर सकते हैं।
                </p>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PRIMARY: STUDENT LOGIN WITH CREATED PASSWORD FORM */}
            {/* ================================================================= */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Login with Password (छात्र एवं अभिभावक लॉगिन)
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      प्रवेश संख्या या पंजीकृत मोबाइल नंबर तथा अपने पासवर्ड से प्रवेश करें।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordHelper(!showPasswordHelper)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{showPasswordHelper ? 'Close Calculator' : 'Create / Check Password (पासवर्ड बनाएं)'}</span>
                </button>
              </div>

              {/* Password Formula Rule Infographic */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-700" />
                      <span>Official Password Formula (पासवर्ड नियम)</span>
                    </span>
                    <p className="text-[11px] font-semibold text-emerald-900">
                      First 4 letters of Student Name (CAPITAL) + Last 4 digits of Registered Mobile
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 font-mono text-[11px] font-black text-emerald-950 shadow-2xs">
                    <span className="text-blue-900">NAME(4)</span>
                    <span className="text-slate-400">+</span>
                    <span className="text-emerald-700">PHONE(4)</span>
                    <span className="text-slate-400">=</span>
                    <span className="text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded font-extrabold">AMIT9876</span>
                  </div>
                </div>
              </div>

              {/* Interactive Live Password Creator & Calculator Tool */}
              {showPasswordHelper && (
                <div className="bg-slate-50 border border-emerald-300 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Password Calculator (अपना पासवर्ड तुरंत जांचें व बनाएं):</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Auto-calculated</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Student Full Name (छात्र का नाम):
                      </label>
                      <input
                        type="text"
                        value={helperName}
                        onChange={(e) => setHelperName(e.target.value)}
                        placeholder="e.g. Amit Kumar"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Registered Mobile Number (मोबाइल नंबर):
                      </label>
                      <input
                        type="tel"
                        value={helperPhone}
                        onChange={(e) => setHelperPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-2.5 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 font-medium">Created Password:</span>
                      <span className="text-xs font-black font-mono text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        {helperBreakdown.password}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({helperBreakdown.namePart} + {helperBreakdown.phonePart})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentPasswordInput(helperBreakdown.password);
                        if (helperPhone.trim()) {
                          setStudentIdInput(helperPhone.trim());
                        }
                      }}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                    >
                      Use in Login Form ➔
                    </button>
                  </div>
                </div>
              )}

              {/* Login Error Notification */}
              {studentError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{studentError}</span>
                </div>
              )}

              {/* Main Student Sign In Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStudentError('');
                  setLoading(true);
                  setTimeout(() => {
                    const res = loginAsStudent(studentIdInput, studentPasswordInput);
                    setLoading(false);
                    if (res.success) {
                      onClose();
                    } else {
                      setStudentError(res.message);
                    }
                  }, 200);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admission No. / Registered Mobile No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. SBSC-001 or 9876543210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student Password (पासवर्ड) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={studentPasswordInput}
                        onChange={(e) => setStudentPasswordInput(e.target.value)}
                        placeholder="e.g. AMIT9876, DOB, or Mobile No"
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-emerald-700 focus:bg-white placeholder:normal-case"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1.5 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-300" />
                  <span>{loading ? 'Verifying Credentials...' : 'Sign In to Student Portal (छात्र पोर्टल में प्रवेश)'}</span>
                </button>
              </form>
            </div>

            {/* ================================================================= */}
            {/* PRIVACY & DATA SECURITY NOTICE */}
            {/* ================================================================= */}
            <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-extrabold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>गोपनीयता एवं सुरक्षा गारंटी (Strict Privacy & Protection)</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                छात्रों के व्यक्तिगत विवरण, उपस्थिति पंजिका, शुल्क विवरण तथा अंकपत्र की पूर्ण गोपनीयता सुनिश्चित करने हेतु केवल वैध पासवर्ड दर्ज करके ही विद्यार्थी का व्यक्तिगत पोर्टल देखा जा सकता है।
              </p>
              <div className="text-[10px] text-emerald-950 bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                <strong>💡 पासवर्ड का नियम:</strong> छात्र के अंग्रेजी नाम के पहले 4 अक्षर (CAPITAL) + पंजीकृत मोबाइल के अंतिम 4 अंक (उदा. यदि नाम AMIT व मोबाइल 9999999999 है तो पासवर्ड: <code className="font-mono font-bold bg-emerald-100 px-1 py-0.5 rounded">AMIT9999</code>).
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: ROLE SWITCHER (ADMIN / GUEST / PARENT) */}
        {/* ========================================================================= */}
        {activeMode === 'quick-switch' && (
          <div className="p-6 space-y-3">
            <p className="text-xs text-slate-500 mb-4">
              Select a designated system role to preview role-based access permissions:
            </p>

            <div className="space-y-2.5">
              {roleProfiles.map((item) => {
                const isCurrent = currentUser.role === item.role;
                const Icon = item.icon;

                return (
                  <div
                    key={item.role}
                    onClick={() => handleSelectRole(item.role)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                      isCurrent
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</h4>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-950 bg-blue-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-blue-900" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 leading-snug">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Active Session: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
            {currentUser.assignedClass ? ` • ${currentUser.assignedClass}` : ''}
          </span>
          <button onClick={onClose} className="font-bold text-blue-900 hover:underline cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
