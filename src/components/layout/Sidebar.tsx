import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Receipt,
  Award,
  BookMarked,
  BellRing,
  Printer,
  Scroll,
  Settings,
  Shield,
  X,
  ChevronRight,
  FileSpreadsheet,
  Smartphone,
  Share2,
  Bus,
  Lock,
  User,
} from 'lucide-react';

interface SidebarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenShareMobile?: () => void;
  restrictedClassName?: string;
  onRelockClass?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onNavigate,
  isOpen,
  onClose,
  onOpenShareMobile,
  restrictedClassName,
  onRelockClass,
}) => {
  const { settings, currentUser } = useSchool();

  const allNavItems = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, badge: '', roles: ['admin'] },
    {
      id: 'student-portal',
      label: currentUser.role === 'student' || currentUser.role === 'parent' ? 'My Student Portal' : 'Students Panel (Read-Only)',
      icon: User,
      badge: 'Portal',
      highlight: true,
      roles: ['admin', 'teacher', 'student', 'parent'],
    },
    { id: 'class-teacher', label: 'Class Teacher Portal', icon: GraduationCap, badge: currentUser.role === 'teacher' ? 'My Class' : 'Class View', highlight: currentUser.role === 'teacher', roles: ['admin', 'teacher'] },
    { id: 'students', label: 'Student Admissions', icon: Users, badge: '', roles: ['admin', 'teacher'] },
    { id: 'teachers', label: 'Faculty & Passwords', icon: GraduationCap, badge: '', roles: ['admin'] },
    { id: 'classes', label: 'Classes & Subjects', icon: BookOpen, badge: '', roles: ['admin'] },
    { id: 'attendance', label: 'Attendance Register', icon: CalendarCheck, badge: '', roles: ['admin', 'teacher'] },
    { id: 'fees', label: 'Fees & Receipts', icon: Receipt, badge: '🔒 Admin', roles: ['admin'] },
    { id: 'conveyance', label: 'Conveyance & Transport', icon: Bus, badge: 'Fleet', highlight: true, roles: ['admin', 'teacher'] },
    { id: 'exams', label: 'Exams & Marks (7 Sub)', icon: Award, badge: '', roles: ['admin', 'teacher'] },
    { id: 'sheets', label: 'Import Excel / Sheets', icon: FileSpreadsheet, badge: 'New', highlight: true, roles: ['admin'] },
    { id: 'reports', label: 'Official A4 Reports', icon: Printer, badge: '11 PDFs', highlight: true, roles: ['admin', 'teacher'] },
    { id: 'homework', label: 'Class Homework', icon: BookMarked, badge: '', roles: ['admin', 'teacher', 'student', 'parent'] },
    { id: 'notices', label: 'School Notices', icon: BellRing, badge: '', roles: ['admin', 'teacher', 'student', 'parent'] },
    { id: 'certificates', label: 'Certificates & TC', icon: Scroll, badge: '', roles: ['admin'] },
    { id: 'settings', label: 'School Settings & Backup', icon: Settings, badge: '', roles: ['admin'] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(currentUser.role));

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-blue-950 text-slate-200 border-r border-blue-900 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="p-5 border-b border-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg ring-2 ring-amber-300/30 overflow-hidden shrink-0">
                  <img
                    src={settings.logoUrl}
                    alt={settings.schoolName || 'School Logo'}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg ring-2 ring-amber-300/30 shrink-0">
                  SBSC
                </div>
              )}
              <div>
                <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight">
                  {settings.schoolName || 'SBSC PUBLIC SCHOOL'}
                </h1>
                <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">
                  {settings.district || 'Bairwa Nankar'} • ERP
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Restricted Class Status Card */}
          {restrictedClassName && (
            <div className="mx-3 mt-3 p-3 bg-amber-500/15 border border-amber-400/30 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{restrictedClassName}</span>
                </span>
                <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                  Locked
                </span>
              </div>
              <p className="text-[10px] text-amber-200/80 leading-tight">
                Teacher access restricted exclusively to this class.
              </p>
              {onRelockClass && (
                <button
                  onClick={onRelockClass}
                  className="w-full mt-1 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition"
                >
                  <Lock className="w-3 h-3 text-amber-300" />
                  <span>Relock Screen</span>
                </button>
              )}
            </div>
          )}

          {/* Nav Items List */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div className="px-3 py-1.5 text-[10px] font-extrabold text-blue-300 uppercase tracking-wider">
              Management Modules
            </div>

            {navItems.map((item) => {
              const isActive = currentModule === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                      : item.highlight
                      ? 'text-amber-300 hover:bg-blue-900/90 bg-blue-900/40 border border-amber-400/20'
                      : 'text-slate-300 hover:bg-blue-900/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : item.highlight ? 'text-amber-400' : 'text-blue-300'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & session */}
        <div className="p-4 border-t border-blue-900 bg-blue-950/80 text-[11px] space-y-2.5">
          {onOpenShareMobile && (
            <button
              onClick={() => {
                onOpenShareMobile();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center justify-center gap-2 transition text-xs"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Mobile App / Share Link</span>
            </button>
          )}

          <div className="flex items-center justify-between text-blue-300">
            <span>Academic Session:</span>
            <span className="font-bold text-amber-300 font-mono">{settings.academicSession}</span>
          </div>

          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role: <strong className="text-white">{currentUser.role}</strong></span>
          </div>
        </div>
      </aside>
    </>
  );
};
