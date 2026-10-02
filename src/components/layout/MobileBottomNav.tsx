import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Receipt,
  Menu,
  GraduationCap,
  BookMarked,
  Share2,
  User,
  BellRing,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  onOpenSidebar: () => void;
  onOpenShareModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentModule,
  onNavigate,
  onOpenSidebar,
  onOpenShareModal,
}) => {
  const { currentUser } = useSchool();
  const isTeacher = currentUser.role === 'teacher';
  const isStudent = currentUser.role === 'student' || currentUser.role === 'parent';

  const navItems = isStudent
    ? [
        {
          id: 'student-portal',
          label: 'My Portal',
          icon: User,
        },
        {
          id: 'homework',
          label: 'Homework',
          icon: BookMarked,
        },
        {
          id: 'notices',
          label: 'Notices',
          icon: BellRing,
        },
      ]
    : [
        {
          id: isTeacher ? 'class-teacher' : 'dashboard',
          label: isTeacher ? 'My Class' : 'Dashboard',
          icon: isTeacher ? GraduationCap : LayoutDashboard,
        },
        {
          id: 'students',
          label: 'Students',
          icon: Users,
        },
        {
          id: 'attendance',
          label: 'Attendance',
          icon: CalendarCheck,
        },
        {
          id: isTeacher ? 'homework' : 'fees',
          label: isTeacher ? 'Homework' : 'Fees',
          icon: isTeacher ? BookMarked : Receipt,
        },
      ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg flex items-center justify-around safe-bottom">
      {navItems.map((item) => {
        const isActive = currentModule === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
              isActive
                ? 'text-blue-900 font-extrabold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition ${
                isActive ? 'bg-blue-100 text-blue-950 shadow-2xs' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Share / Install on Phone */}
      <button
        onClick={onOpenShareModal}
        title="Share or Install on Mobile"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-emerald-700 hover:text-emerald-900 font-medium min-w-[56px]"
      >
        <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
          <Share2 className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap font-bold">
          Share
        </span>
      </button>

      {/* All Modules Menu Drawer */}
      <button
        onClick={onOpenSidebar}
        title="All Modules Menu"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-medium min-w-[56px]"
      >
        <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
          More
        </span>
      </button>
    </div>
  );
};
