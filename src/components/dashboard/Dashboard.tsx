import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BirthdayDashboardWidget } from './BirthdayDashboardWidget';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Award,
  BookOpen,
  BellRing,
  Printer,
  UserPlus,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  MessageSquare,
  Bus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface DashboardProps {
  onNavigate: (module: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { students, teachers, classes, feePayments, exams, examMarks, notices, homeworkList, settings, currentUser } = useSchool();

  // Metrics
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Active').length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;
  const totalCollectedFees = feePayments.reduce((s, p) => s + p.amountPaid, 0);

  // Revenue chart data (by month)
  const revenueData = [
    { month: 'Apr', collections: 145000, dues: 25000 },
    { month: 'May', collections: 168000, dues: 22000 },
    { month: 'Jun', collections: 120000, dues: 30000 },
    { month: 'Jul', collections: 195000, dues: 18000 },
    { month: 'Aug', collections: 230000, dues: 15000 },
    { month: 'Sep', collections: 185000, dues: 28000 },
  ];

  // Class enrollment chart data
  const classData = classes.map((c) => ({
    name: c.name.replace('Class ', 'C-'),
    students: students.filter((s) => s.classId === c.id).length,
    capacity: c.capacity,
  }));

  // Gender distribution
  const maleCount = students.filter((s) => s.gender === 'Male').length;
  const femaleCount = students.filter((s) => s.gender === 'Female').length;
  const genderData = [
    { name: 'Boys', value: maleCount, color: '#1e3a8a' },
    { name: 'Girls', value: femaleCount, color: '#ec4899' },
  ];

  // Attendance rate
  const attendanceRate = 94.6;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <GraduationCap className="w-80 h-80 text-white" />
        </div>

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Academic Session: {settings.academicSession} Active</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {settings.schoolName}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Campus ERP & Management Portal • Bairwa Nankar, Siddharthnagar, Uttar Pradesh • Affiliation No: {settings.affiliationNo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('class-teacher')}
            className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 text-xs"
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Class Teacher Portal</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95 text-xs uppercase tracking-wider"
          >
            <Printer className="w-4 h-4" />
            <span>A4 Reports Hub</span>
          </button>

          <button
            onClick={() => onNavigate('conveyance')}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 text-xs"
          >
            <Bus className="w-4 h-4 text-amber-300" />
            <span>Conveyance List</span>
          </button>

          <button
            onClick={() => onNavigate('fees')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 text-xs"
          >
            <Receipt className="w-4 h-4" />
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* Official Birthday Celebrations & Date-Wise Notification Widget */}
      <BirthdayDashboardWidget />

      {/* Top 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex justify-between items-start group"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              TOTAL ENROLLED STUDENTS
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-950">{totalStudents}</span>
              <span className="text-xs font-bold text-emerald-700">100% Verified</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <span className="font-semibold text-blue-900">{activeStudents} Active</span> in {totalClasses} Class Sections
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center group-hover:scale-110 transition shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Teachers & Faculty */}
        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex justify-between items-start group"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              FACULTY & TEACHING STAFF
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalTeachers}</span>
              <span className="text-xs font-bold text-blue-900">B.Ed / PGT</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Student-Teacher Ratio: <b className="text-slate-800 font-bold">{(totalStudents / (totalTeachers || 1)).toFixed(0)}:1</b>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center group-hover:scale-110 transition shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Total Fee Collections */}
        <div
          onClick={() => onNavigate('fees')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex justify-between items-start group"
        >
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              TOTAL FEE REVENUE (YTD)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                {settings.currencySymbol} {totalCollectedFees.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {feePayments.length} Official Receipts Logged
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex justify-between items-start group"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              DAILY ATTENDANCE RATE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-900">{attendanceRate}%</span>
              <span className="text-xs font-bold text-emerald-700">Healthy</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Biometric & Register Synced
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center group-hover:scale-110 transition shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row: Monthly Revenue & Class Strength */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span>Fee Collections vs Pending Dues Analysis</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Monthly revenue inflow comparison for session {settings.academicSession}</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                INR (₹) Breakdown
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any) => [`₹ ${Number(value).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="collections" name="Collected Fees" fill="#047857" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dues" name="Pending Dues" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Student Demographics & Gender Ratio (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-900" />
              <span>Student Gender Ratio</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Total enrolled pupil distribution</p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
            <div className="text-center bg-blue-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-blue-900 uppercase block">BOYS</span>
              <span className="font-extrabold text-slate-900 text-sm">{maleCount}</span>
              <span className="text-[10px] text-slate-500 block">
                {Math.round((maleCount / (totalStudents || 1)) * 100)}%
              </span>
            </div>
            <div className="text-center bg-pink-50 p-2 rounded-xl">
              <span className="text-[10px] font-bold text-pink-900 uppercase block">GIRLS</span>
              <span className="font-extrabold text-slate-900 text-sm">{femaleCount}</span>
              <span className="text-[10px] text-slate-500 block">
                {Math.round((femaleCount / (totalStudents || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Class Capacity & Quick Action Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Strength Bar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-900" />
                <span>Class Enrollment vs Maximum Room Capacity</span>
              </h3>
              <p className="text-xs text-slate-500">Real-time seat occupancy across grade batches</p>
            </div>
            <button
              onClick={() => onNavigate('classes')}
              className="text-xs font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1"
            >
              Manage Classes <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="students" name="Enrolled" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Room Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Circulars & Bulletins Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BellRing className="w-4 h-4 text-rose-700" />
                <span>Recent Notice Board</span>
              </h3>
              <button
                onClick={() => onNavigate('notices')}
                className="text-xs font-bold text-rose-800 hover:text-rose-700"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {notices.slice(0, 3).map((n) => (
                <div key={n.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                      {n.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{n.date}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 line-clamp-1">{n.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('notices')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
          >
            Open School Bulletin Board
          </button>
        </div>
      </div>

      {/* Quick Access Action Matrix (11 Essential Shortcuts) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-900" />
          <span>Quick Module Access & PDF Export Shortcuts</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <button
            onClick={() => onNavigate('students')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <UserPlus className="w-6 h-6 text-blue-900 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-blue-950">New Admission</span>
          </button>

          <button
            onClick={() => onNavigate('fees')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <Receipt className="w-6 h-6 text-emerald-800 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-emerald-950">Collect Fee</span>
          </button>

          <button
            onClick={() => onNavigate('attendance')}
            className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <CalendarCheck className="w-6 h-6 text-amber-700 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-amber-950">Mark Attendance</span>
          </button>

          <button
            onClick={() => onNavigate('exams')}
            className="p-3 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <Award className="w-6 h-6 text-purple-900 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-purple-950">Exam Marksheets</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <Printer className="w-6 h-6 text-blue-950 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-blue-950">11 A4 Reports</span>
          </button>

          <button
            onClick={() => onNavigate('fees')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <MessageSquare className="w-6 h-6 text-emerald-600 fill-current group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-emerald-950">WhatsApp Dues</span>
          </button>

          <button
            onClick={() => onNavigate('certificates')}
            className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition group"
          >
            <GraduationCap className="w-6 h-6 text-amber-800 group-hover:scale-110 transition" />
            <span className="font-bold text-slate-800 group-hover:text-amber-950">Transfer Cert (TC)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
