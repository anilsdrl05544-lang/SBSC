import React, { useState, useEffect, useRef } from 'react';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { LoginModal } from './components/layout/LoginModal';
import { ShareMobileAppModal } from './components/layout/ShareMobileAppModal';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Modules
import { Dashboard } from './components/dashboard/Dashboard';
import { StudentManagement } from './components/students/StudentManagement';
import { TeacherManagement } from './components/teachers/TeacherManagement';
import { ClassManagement } from './components/classes/ClassManagement';
import { AttendanceManagement } from './components/attendance/AttendanceManagement';
import { FeeManagement } from './components/fees/FeeManagement';
import { FeesLockScreen } from './components/fees/FeesLockScreen';
import { SetFeePasswordModal } from './components/fees/SetFeePasswordModal';
import { ExamManagement } from './components/exams/ExamManagement';
import { ReportCenter } from './components/reports/ReportCenter';
import { SheetImportManager } from './components/sheets/SheetImportManager';
import { HomeworkManagement } from './components/homework/HomeworkManagement';
import { NoticeManagement } from './components/notices/NoticeManagement';
import { CertificateManagement } from './components/certificates/CertificateManagement';
import { SettingsManagement } from './components/settings/SettingsManagement';
import { ClassTeacherPortal } from './components/teachers/ClassTeacherPortal';
import { ClassTeacherLockScreen } from './components/teachers/ClassTeacherLockScreen';
import { ConveyanceManagement } from './components/transport/ConveyanceManagement';
import { DataBackupModal } from './components/settings/DataBackupModal';
import { BirthdayNotificationModal } from './components/birthday/BirthdayNotificationModal';
import { StudentPortal } from './components/students/StudentPortal';
import { Lock, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';

const VALID_MODULES = [
  'dashboard',
  'class-teacher',
  'student-portal',
  'students',
  'teachers',
  'classes',
  'attendance',
  'fees',
  'conveyance',
  'exams',
  'reports',
  'sheets',
  'homework',
  'notices',
  'certificates',
  'settings',
];

function getInitialModule(userRole: string): string {
  try {
    if (userRole === 'student' || userRole === 'parent') {
      return 'student-portal';
    }
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (
      search &&
      (search.get('student') ||
        search.get('adm') ||
        search.get('studentId') ||
        search.get('portal') === 'student' ||
        search.has('student-portal') ||
        search.get('module') === 'student-portal')
    ) {
      return 'student-portal';
    }
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === 'student-portal') {
      return 'student-portal';
    }
    if (hash && VALID_MODULES.includes(hash)) {
      if (userRole === 'teacher' && ['teachers', 'fees', 'classes', 'sheets', 'settings'].includes(hash)) {
        return 'class-teacher';
      }
      return hash;
    }
    const saved = localStorage.getItem('sbsc_current_module') || sessionStorage.getItem('sbsc_current_module');
    if (saved && VALID_MODULES.includes(saved)) {
      if (userRole === 'teacher' && ['teachers', 'fees', 'classes', 'sheets', 'settings'].includes(saved)) {
        return 'class-teacher';
      }
      return saved;
    }
  } catch {}
  return userRole === 'teacher' ? 'class-teacher' : 'dashboard';
}

function MainApp() {
  const { currentUser, classes, teachers, logoutStudent, students, loginAsStudent } = useSchool();
  const [currentModule, setCurrentModuleState] = useState<string>(() => getInitialModule(currentUser.role));

  const [initialStudentPortalTab, setInitialStudentPortalTab] = useState<string | undefined>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const qTab = search.get('tab');
      if (qTab && ['overview', 'attendance', 'fees', 'exams', 'homework', 'notices', 'holidays'].includes(qTab)) {
        return qTab;
      }
    } catch {}
    return undefined;
  });

  const autoAuthAttemptedRef = useRef<string>('');

  // Check URL query parameter on init (?class=... or ?classId=... or ?teacher=...)
  const [restrictedClassIdParam, setRestrictedClassIdParam] = useState<string | null>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const qClass = search.get('class') || search.get('classId');
      if (qClass) {
        sessionStorage.setItem('sbsc_restricted_class_id', qClass);
        return qClass;
      }
      const qTeacher = search.get('teacher') || search.get('teacherId');
      if (qTeacher) {
        sessionStorage.setItem('sbsc_restricted_teacher_id', qTeacher);
        return qTeacher;
      }
      return sessionStorage.getItem('sbsc_restricted_class_id');
    } catch {
      return null;
    }
  });

  // Track if this restricted class session has been unlocked via password
  const [isLockedClassUnlocked, setIsLockedClassUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('sbsc_restricted_class_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Find target restricted class if any
  const targetRestrictedClass = restrictedClassIdParam
    ? classes.find(
        (c) =>
          c.id === restrictedClassIdParam ||
          c.name.toLowerCase() === restrictedClassIdParam.toLowerCase() ||
          c.classTeacherId === restrictedClassIdParam
      ) ||
      (sessionStorage.getItem('sbsc_restricted_teacher_id')
        ? classes.find(
            (c) => c.classTeacherId === sessionStorage.getItem('sbsc_restricted_teacher_id')
          )
        : undefined)
    : undefined;

  const handleRelockRestrictedClass = () => {
    try {
      sessionStorage.removeItem('sbsc_restricted_class_unlocked');
    } catch {}
    setIsLockedClassUnlocked(false);
  };

  const handleExitRestrictedMode = () => {
    try {
      sessionStorage.removeItem('sbsc_restricted_class_id');
      sessionStorage.removeItem('sbsc_restricted_class_unlocked');
      sessionStorage.removeItem('sbsc_restricted_teacher_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('class');
      url.searchParams.delete('classId');
      url.searchParams.delete('teacher');
      url.searchParams.delete('teacherId');
      window.history.replaceState(null, '', url.pathname + url.hash);
    } catch {}
    setRestrictedClassIdParam(null);
    setIsLockedClassUnlocked(false);
    setCurrentModule('dashboard');
  };

  const setCurrentModule = (mod: string) => {
    setCurrentModuleState(mod);
    try {
      localStorage.setItem('sbsc_current_module', mod);
      sessionStorage.setItem('sbsc_current_module', mod);
      window.history.replaceState(null, '', '#' + mod);
    } catch {}
  };

  const [classPortalTab, setClassPortalTab] = useState<
    'students' | 'attendance' | 'fees' | 'exams' | 'homework' | 'notices'
  >('students');
  const [classPortalTargetClassId, setClassPortalTargetClassId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

  // Fees Module Security & Password Protection (Admin Only)
  const [isFeesUnlocked, setIsFeesUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('sbsc_fees_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [isSetFeePasswordModalOpen, setIsSetFeePasswordModalOpen] = useState(false);

  const handleLockFees = () => {
    try {
      sessionStorage.removeItem('sbsc_fees_unlocked');
    } catch {}
    setIsFeesUnlocked(false);
  };

  const handleUnlockFees = () => {
    try {
      sessionStorage.setItem('sbsc_fees_unlocked', 'true');
    } catch {}
    setIsFeesUnlocked(true);
  };

  // Sync initial module if role changes or shared student URL parameter is present
  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, '');

      const qStudent = search.get('student') || search.get('adm') || search.get('studentId');
      const qAuth = search.get('auth') || search.get('pass') || search.get('key');
      const qTab = search.get('tab');
      const isStudentPortalParam =
        search.get('portal') === 'student' ||
        search.has('student-portal') ||
        search.get('module') === 'student-portal' ||
        hash === 'student-portal';

      if (qTab && ['overview', 'attendance', 'fees', 'exams', 'timetable', 'admit-card', 'homework', 'holidays'].includes(qTab)) {
        setInitialStudentPortalTab(qTab);
      }

      // If URL targeted a specific student
      if (qStudent) {
        const qClean = qStudent.trim();
        sessionStorage.setItem('sbsc_target_adm', qClean);

        if (students && students.length > 0) {
          const qLower = qClean.toLowerCase();
          const qDigits = qClean.replace(/\D/g, '');
          const matched = students.find((s) => {
            const adm = (s.admissionNo || '').trim().toLowerCase();
            const roll = (s.rollNo?.toString() || '').trim().toLowerCase();
            const phone = (s.guardianPhone || '').replace(/\D/g, '');
            return (
              adm === qLower ||
              (qLower.length >= 3 && adm.endsWith(qLower)) ||
              roll === qLower ||
              (qDigits.length >= 10 && phone.endsWith(qDigits.slice(-10)))
            );
          });

          if (matched) {
            sessionStorage.setItem('sbsc_target_adm', matched.admissionNo);

            // If secret / auth key provided in the link, auto-verify and unlock directly!
            if (qAuth && autoAuthAttemptedRef.current !== `${matched.admissionNo}_${qAuth}`) {
              autoAuthAttemptedRef.current = `${matched.admissionNo}_${qAuth}`;
              const res = loginAsStudent(matched.admissionNo, qAuth);
              if (res.success) {
                console.log('✓ Seamlessly logged in student from shared link:', matched.fullName);
              }
            }
          }
        }

        setCurrentModule('student-portal');
        return;
      }

      // Check for universal student portal link (e.g. from WhatsApp group)
      if (isStudentPortalParam) {
        setCurrentModule('student-portal');
        return;
      }
    } catch (err) {
      console.error('Error parsing student portal URL:', err);
    }

    if (currentUser.role === 'student' || currentUser.role === 'parent') {
      setCurrentModule('student-portal');
    } else if (
      currentUser.role === 'teacher' &&
      (currentModule === 'dashboard' ||
        currentModule === 'teachers' ||
        currentModule === 'settings' ||
        currentModule === 'sheets')
    ) {
      setCurrentModule('class-teacher');
    }
  }, [currentUser.role, students, loginAsStudent]);

  // Sync URL hash and sessionStorage on mount and on hashchange
  useEffect(() => {
    try {
      if (!window.location.hash || window.location.hash === '#') {
        window.history.replaceState(null, '', '#' + currentModule);
      }
      sessionStorage.setItem('sbsc_current_module', currentModule);
    } catch {}

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && VALID_MODULES.includes(hash)) {
        if (currentUser.role === 'student' || currentUser.role === 'parent') {
          setCurrentModuleState('student-portal');
        } else if (currentUser.role === 'teacher' && ['teachers', 'fees', 'classes', 'sheets', 'settings'].includes(hash)) {
          setCurrentModuleState('class-teacher');
        } else {
          setCurrentModuleState(hash);
        }
        try {
          localStorage.setItem('sbsc_current_module', hash);
          sessionStorage.setItem('sbsc_current_module', hash);
        } catch {}
      } else if (!hash) {
        // If hash was emptied by back navigation, preserve current module to prevent app from resetting
        const saved = sessionStorage.getItem('sbsc_current_module') || localStorage.getItem('sbsc_current_module');
        if (saved && VALID_MODULES.includes(saved)) {
          window.history.replaceState(null, '', '#' + saved);
          setCurrentModuleState(saved);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser.role]);

  // Keep hash and storage in sync if currentModule changes from internal navigation
  useEffect(() => {
    try {
      localStorage.setItem('sbsc_current_module', currentModule);
      sessionStorage.setItem('sbsc_current_module', currentModule);
      if (window.location.hash.replace(/^#/, '') !== currentModule) {
        window.history.replaceState(null, '', '#' + currentModule);
      }
    } catch {}
  }, [currentModule]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Strict Access: If URL targeted a specific class and it is not unlocked yet, show ClassTeacherLockScreen
  if (targetRestrictedClass && !isLockedClassUnlocked) {
    const assignedTeacher = teachers.find(
      (t) =>
        t.id === targetRestrictedClass.classTeacherId ||
        t.assignedClassId === targetRestrictedClass.id ||
        t.assignedClass?.toLowerCase() === targetRestrictedClass.name.toLowerCase()
    );

    return (
      <ClassTeacherLockScreen
        targetClass={targetRestrictedClass}
        assignedTeacher={assignedTeacher}
        onSuccessUnlock={() => {
          try {
            sessionStorage.setItem('sbsc_restricted_class_unlocked', 'true');
          } catch {}
          setIsLockedClassUnlocked(true);
          setCurrentModule('class-teacher');
          setClassPortalTargetClassId(targetRestrictedClass.id);
        }}
        onOpenAdminLogin={() => setIsLoginOpen(true)}
      />
    );
  }

  // Strict Access: If Student Portal is requested or user is logged in as student/parent,
  // render dedicated standalone student portal without administrative sidebar or admin toolbars
  const isDirectStudent = currentUser.role === 'student' || currentUser.role === 'parent';
  const isStudentPortalRequested = isDirectStudent || currentModule === 'student-portal';

  if (isStudentPortalRequested) {
    const portalTab =
      currentModule === 'homework' ? 'homework' :
      currentModule === 'attendance' ? 'attendance' :
      currentModule === 'fees' ? 'fees' :
      currentModule === 'exams' ? 'exams' :
      currentModule === 'timetable' ? 'timetable' :
      currentModule === 'admit-card' ? 'admit-card' :
      (initialStudentPortalTab as any) || undefined;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <StudentPortal
          onLogout={logoutStudent}
          onNavigate={setCurrentModule}
          initialTab={portalTab}
          onBackToDashboard={() => setCurrentModule('dashboard')}
          onOpenAdminLogin={() => setIsLoginOpen(true)}
        />
        {isLoginOpen && (
          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onOpenShareMobile={() => setIsShareModalOpen(true)}
          />
        )}
      </div>
    );
  }

  const renderModule = () => {
    // Strict Read-Only Student & Parent Portal
    // If the logged in user is a student or parent, ONLY render their personal student portal
    // No editing permissions, no access to other school administrative modules
    if (currentUser.role === 'student' || currentUser.role === 'parent' || currentModule === 'student-portal') {
      const portalTab =
        currentModule === 'homework' ? 'homework' :
        currentModule === 'attendance' ? 'attendance' :
        currentModule === 'fees' ? 'fees' :
        currentModule === 'exams' ? 'exams' :
        currentModule === 'timetable' ? 'timetable' :
        currentModule === 'admit-card' ? 'admit-card' : undefined;
      return <StudentPortal onLogout={logoutStudent} onNavigate={setCurrentModule} initialTab={portalTab} />;
    }

    // If restricted class link is active, exclusively render that class's portal
    if (targetRestrictedClass) {
      return (
        <ClassTeacherPortal
          onNavigate={setCurrentModule}
          initialClassId={targetRestrictedClass.id}
          lockedClassId={targetRestrictedClass.id}
          initialTab={classPortalTab}
        />
      );
    }

    // Role protection
    if (
      currentUser.role === 'teacher' &&
      ['teachers', 'fees', 'classes', 'sheets', 'settings'].includes(currentModule)
    ) {
      return (
        <ClassTeacherPortal
          onNavigate={setCurrentModule}
          initialTab={classPortalTab}
          initialClassId={classPortalTargetClassId}
        />
      );
    }

    switch (currentModule) {
      case 'dashboard':
        return currentUser.role === 'teacher' ? (
          <ClassTeacherPortal
            onNavigate={setCurrentModule}
            initialTab={classPortalTab}
            initialClassId={classPortalTargetClassId}
          />
        ) : (
          <Dashboard onNavigate={setCurrentModule} />
        );
      case 'class-teacher':
        return (
          <ClassTeacherPortal
            onNavigate={setCurrentModule}
            initialTab={classPortalTab}
            initialClassId={classPortalTargetClassId}
          />
        );
      case 'students':
        return <StudentManagement onNavigate={setCurrentModule} />;
      case 'teachers':
        return <TeacherManagement onNavigate={setCurrentModule} />;
      case 'classes':
        return <ClassManagement />;
      case 'attendance':
        return <AttendanceManagement onNavigate={setCurrentModule} />;
      case 'fees':
        if (!isFeesUnlocked) {
          return (
            <FeesLockScreen
              onUnlock={handleUnlockFees}
              onBack={() => setCurrentModule('dashboard')}
            />
          );
        }
        return (
          <FeeManagement
            onNavigate={setCurrentModule}
            onLockFees={handleLockFees}
            onOpenSetPassword={() => setIsSetFeePasswordModalOpen(true)}
          />
        );
      case 'conveyance':
        return <ConveyanceManagement onNavigate={setCurrentModule} />;
      case 'exams':
        return <ExamManagement onNavigate={setCurrentModule} />;
      case 'sheets':
        return <SheetImportManager onNavigate={setCurrentModule} />;
      case 'reports':
        return <ReportCenter onNavigate={setCurrentModule} />;
      case 'homework':
        return <HomeworkManagement />;
      case 'notices':
        return <NoticeManagement />;
      case 'certificates':
        return <CertificateManagement />;
      case 'settings':
        return <SettingsManagement onNavigate={setCurrentModule} />;
      default:
        return currentUser.role === 'teacher' ? <ClassTeacherPortal onNavigate={setCurrentModule} /> : <Dashboard onNavigate={setCurrentModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentModule={currentModule}
        onNavigate={setCurrentModule}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenShareMobile={() => setIsShareModalOpen(true)}
        restrictedClassName={targetRestrictedClass ? targetRestrictedClass.name : undefined}
        onRelockClass={targetRestrictedClass ? handleRelockRestrictedClass : undefined}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenLogin={() => setIsLoginOpen(true)}
          onNavigate={setCurrentModule}
          onOpenShareMobile={() => setIsShareModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenBirthdayModal={() => setIsBirthdayModalOpen(true)}
        />

        {/* Top security strip if locked to a specific class via share link */}
        {targetRestrictedClass && (
          <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md border-b border-blue-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="p-1 bg-amber-400 text-slate-950 rounded font-black text-[10px] tracking-wider">
                LOCKED CLASS
              </span>
              <span className="font-extrabold text-amber-300">
                {targetRestrictedClass.name}
              </span>
              <span className="text-blue-200 text-[11px] hidden sm:inline">
                • Class Teacher: <strong>{currentUser.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRelockRestrictedClass}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Relock this class screen"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Lock Screen (लॉक करें)</span>
              </button>
              <button
                type="button"
                onClick={handleExitRestrictedMode}
                className="text-[11px] bg-red-600/80 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Exit class link and return to school dashboard"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Link (बाहर निकलें)</span>
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {renderModule()}
        </main>

        {/* Global Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 mb-14 lg:mb-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 max-w-7xl mx-auto">
            <span>
              © {new Date().getFullYear()} <strong>SBSC PUBLIC SCHOOL</strong> • Bairwa Nankar, Siddharthnagar, UP
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Affiliation No: 2133490</span>
              <span>•</span>
              <span>School Code: 71205</span>
              <span>•</span>
              <button
                onClick={() => setCurrentModule('settings')}
                className="text-blue-900 hover:underline font-semibold"
              >
                System Settings
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation for Smartphones */}
      <MobileBottomNav
        currentModule={currentModule}
        onNavigate={setCurrentModule}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Share / Mobile App Modal with QR & WhatsApp Share */}
      <ShareMobileAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={setCurrentModule}
      />

      {/* Role Login Switcher Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onNavigateToClassPortal={(tab = 'students', classId) => {
          if (tab) setClassPortalTab(tab);
          if (classId) setClassPortalTargetClassId(classId);
          setCurrentModule('class-teacher');
        }}
        onNavigateToAttendance={(classId) => {
          if (classId) setClassPortalTargetClassId(classId);
          setCurrentModule('attendance');
        }}
      />

      {/* Set Fee Password Modal */}
      {isSetFeePasswordModalOpen && (
        <SetFeePasswordModal
          isOpen={isSetFeePasswordModalOpen}
          onClose={() => setIsSetFeePasswordModalOpen(false)}
          requireOldPassword={true}
        />
      )}

      {/* Institutional Data Backup & Auto-Backup System Modal */}
      {isBackupModalOpen && (
        <DataBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}

      {/* Birthday Celebrations & Date-Wise Notification Hub */}
      {isBirthdayModalOpen && (
        <BirthdayNotificationModal
          isOpen={isBirthdayModalOpen}
          onClose={() => setIsBirthdayModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SchoolProvider>
        <MainApp />
      </SchoolProvider>
    </ErrorBoundary>
  );
}
