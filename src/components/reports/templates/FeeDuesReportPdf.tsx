import React, { useState, useMemo } from 'react';
import { Student, ClassInfo, Teacher } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import {
  Filter,
  Search,
  Users,
  GraduationCap,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  Building2,
  Calendar,
  CreditCard,
} from 'lucide-react';

export interface FeeDuesReportPdfProps {
  selectedClass?: ClassInfo;
  initialClassId?: string;
  initialOnlyWithDues?: boolean;
}

export const FeeDuesReportPdf: React.FC<FeeDuesReportPdfProps> = ({
  selectedClass,
  initialClassId,
  initialOnlyWithDues = true,
}) => {
  const { students, classes, teachers, getStudentDueAmount, getStudentFeeBreakdown, settings } = useSchool();

  // Internal interactive controls (hidden during print)
  const [activeClassId, setActiveClassId] = useState<string>(
    selectedClass?.id || initialClassId || ''
  );
  const [onlyWithDues, setOnlyWithDues] = useState<boolean>(initialOnlyWithDues);
  const [minDueFilter, setMinDueFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'roll' | 'name' | 'due-desc' | 'due-asc'>('roll');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'both' | 'summary-only' | 'detailed-only'>('both');

  // Helper to get class incharge teacher
  const getTeacherForClass = (classId: string): Teacher | undefined => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls || !cls.teacherId) return undefined;
    return teachers.find((t) => t.id === cls.teacherId);
  };

  // Compile full class-wise dataset
  const classWiseData = useMemo(() => {
    return classes.map((cls) => {
      const classTeacher = teachers.find((t) => t.id === cls.teacherId);
      const classStudents = students.filter((s) => s.classId === cls.id);

      const studentsWithDues = classStudents.map((student) => {
        const dueAmount = getStudentDueAmount(student.id);
        const breakdown = getStudentFeeBreakdown(student.id);
        const totalFee = breakdown.totalYearlyDue || 0;
        const totalPaid = breakdown.paidAmount || 0;

        return {
          student,
          dueAmount,
          totalFee,
          totalPaid,
          breakdown,
        };
      });

      // Filter based on user settings
      let filtered = studentsWithDues;
      if (onlyWithDues) {
        filtered = filtered.filter((item) => item.dueAmount > 0);
      }
      if (minDueFilter > 0) {
        filtered = filtered.filter((item) => item.dueAmount >= minDueFilter);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (item) =>
            item.student.fullName.toLowerCase().includes(q) ||
            item.student.admissionNo?.toLowerCase().includes(q) ||
            item.student.fatherName?.toLowerCase().includes(q) ||
            item.student.guardianPhone?.includes(q)
        );
      }

      // Sort students
      filtered.sort((a, b) => {
        if (sortBy === 'roll') {
          const rollA = parseInt(a.student.rollNo || '0', 10) || 0;
          const rollB = parseInt(b.student.rollNo || '0', 10) || 0;
          return rollA - rollB || a.student.fullName.localeCompare(b.student.fullName);
        }
        if (sortBy === 'name') {
          return a.student.fullName.localeCompare(b.student.fullName, undefined, { sensitivity: 'base' });
        }
        if (sortBy === 'due-desc') {
          return b.dueAmount - a.dueAmount || a.student.fullName.localeCompare(b.student.fullName);
        }
        if (sortBy === 'due-asc') {
          return a.dueAmount - b.dueAmount || a.student.fullName.localeCompare(b.student.fullName);
        }
        return 0;
      });

      const totalEnrolled = classStudents.length;
      const defaultersCount = studentsWithDues.filter((item) => item.dueAmount > 0).length;
      const classTotalDue = filtered.reduce((acc, item) => acc + item.dueAmount, 0);
      const classTotalFee = filtered.reduce((acc, item) => acc + item.totalFee, 0);
      const classTotalPaid = filtered.reduce((acc, item) => acc + item.totalPaid, 0);

      return {
        classInfo: cls,
        classTeacher,
        totalEnrolled,
        defaultersCount,
        classTotalDue,
        classTotalFee,
        classTotalPaid,
        students: filtered,
      };
    });
  }, [classes, students, teachers, getStudentDueAmount, getStudentFeeBreakdown, onlyWithDues, minDueFilter, searchQuery, sortBy]);

  // Determine which classes to display
  const displayedClasses = useMemo(() => {
    if (activeClassId) {
      return classWiseData.filter((c) => c.classInfo.id === activeClassId);
    }
    return classWiseData;
  }, [classWiseData, activeClassId]);

  // Overall totals across all displayed classes
  const grandTotals = useMemo(() => {
    const totalEnrolled = displayedClasses.reduce((acc, c) => acc + c.totalEnrolled, 0);
    const totalDefaulters = displayedClasses.reduce((acc, c) => acc + c.defaultersCount, 0);
    const totalDues = displayedClasses.reduce((acc, c) => acc + c.classTotalDue, 0);
    const totalDemanded = displayedClasses.reduce((acc, c) => acc + c.classTotalFee, 0);
    const totalPaid = displayedClasses.reduce((acc, c) => acc + c.classTotalPaid, 0);
    const displayedStudentsCount = displayedClasses.reduce((acc, c) => acc + c.students.length, 0);

    return {
      totalEnrolled,
      totalDefaulters,
      totalDues,
      totalDemanded,
      totalPaid,
      displayedStudentsCount,
    };
  }, [displayedClasses]);

  const currentSelectedClassObj = classes.find((c) => c.id === activeClassId);

  return (
    <div className="w-full text-slate-800 font-sans">
      {/* Interactive Controls Bar - HIDDEN in Print / PDF Output */}
      <div className="print:hidden mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white flex items-center gap-2">
                <span>Class-Wise Due List Generator (कक्षा अनुसार बकाया फीस रिपोर्ट)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded-full border border-rose-500/30">
                  PDF & Print Ready
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Filter by class, sort, or switch views. Click <strong>Print A4</strong> or <strong>Download PDF</strong> above when ready.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[10px] block font-bold uppercase">Classes</span>
              <span className="font-black text-white">{displayedClasses.length}</span>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 text-[10px] block font-bold uppercase">Defaulters</span>
              <span className="font-black text-amber-400">{grandTotals.displayedStudentsCount}</span>
            </div>
            <div className="bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl">
              <span className="text-rose-300 text-[10px] block font-bold uppercase">Total Due Amount</span>
              <span className="font-black text-rose-400">
                {settings.currencySymbol} {grandTotals.totalDues.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Class Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-300 mb-1 flex items-center gap-1 uppercase">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span>Select Class (कक्षा चुनें)</span>
            </label>
            <select
              value={activeClassId}
              onChange={(e) => setActiveClassId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-emerald-500 cursor-pointer"
            >
              <option value="">All Classes (Grouped Class-Wise • सभी कक्षाएं)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Sec: {cls.section || 'A'})
                </option>
              ))}
            </select>
          </div>

          {/* Dues Filter Toggle */}
          <div>
            <label className="text-[10px] font-bold text-slate-300 mb-1 flex items-center gap-1 uppercase">
              <Filter className="w-3 h-3 text-emerald-400" />
              <span>Due Filter Mode</span>
            </label>
            <select
              value={onlyWithDues ? 'dues-only' : 'all-students'}
              onChange={(e) => setOnlyWithDues(e.target.value === 'dues-only')}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-emerald-500 cursor-pointer"
            >
              <option value="dues-only">Only Students With Dues (&gt; ₹0)</option>
              <option value="all-students">All Students (Include Cleared ₹0)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[10px] font-bold text-slate-300 mb-1 flex items-center gap-1 uppercase">
              <ArrowUpDown className="w-3 h-3 text-amber-400" />
              <span>Sort Ledger By</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-emerald-500 cursor-pointer"
            >
              <option value="roll">Roll Number (1, 2, 3...)</option>
              <option value="name">Student Name (A to Z)</option>
              <option value="due-desc">Highest Due First (सबसे अधिक बकाया)</option>
              <option value="due-asc">Lowest Due First</option>
            </select>
          </div>

          {/* Minimum Due Threshold */}
          <div>
            <label className="text-[10px] font-bold text-slate-300 mb-1 flex items-center gap-1 uppercase">
              <CreditCard className="w-3 h-3 text-purple-400" />
              <span>Min Due Threshold</span>
            </label>
            <select
              value={minDueFilter}
              onChange={(e) => setMinDueFilter(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-emerald-500 cursor-pointer"
            >
              <option value={0}>All Due Amounts (₹0+)</option>
              <option value={500}>Above ₹500</option>
              <option value={1000}>Above ₹1,000</option>
              <option value={2500}>Above ₹2,500</option>
              <option value={5000}>Above ₹5,000 (Urgent Notice)</option>
            </select>
          </div>
        </div>

        {/* View Mode & Quick Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">View Layout:</span>
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  viewMode === 'both' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Executive Summary & Detailed Ledgers
              </button>
              <button
                type="button"
                onClick={() => setViewMode('summary-only')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  viewMode === 'summary-only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Summary Table Only
              </button>
              <button
                type="button"
                onClick={() => setViewMode('detailed-only')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  viewMode === 'detailed-only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Detailed Class Tables Only
              </button>
            </div>
          </div>

          <div className="relative min-w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Student, Father, Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PRINTABLE A4 DOCUMENT CANVAS */}
      {/* ======================================================== */}
      <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 text-xs">
        {/* Official Institution Header */}
        <ReportHeader
          title="CLASS-WISE OUTSTANDING FEE & DUES DEFICIENCY REGISTER"
          subTitle={
            currentSelectedClassObj
              ? `CLASS: ${currentSelectedClassObj.name} (Section: ${currentSelectedClassObj.section || 'A'}) • Class Incharge: ${
                  getTeacherForClass(currentSelectedClassObj.id)?.name || 'Not Assigned'
                }`
              : `INSTITUTIONAL AUDIT: ALL CLASSES DUES & DEFICIENCY SUMMARY (${classes.length} Classes Enrolled)`
          }
          badge={`OUTSTANDING DUES: ₹${grandTotals.totalDues.toLocaleString('en-IN')}`}
        />

        {/* Single Class Banner (when a single class is chosen) */}
        {currentSelectedClassObj && (
          <div className="mb-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-blue-200 uppercase tracking-wider font-bold block">Selected Class</span>
              <h2 className="text-base font-black tracking-wide">
                Class {currentSelectedClassObj.name} - Section {currentSelectedClassObj.section || 'A'}
              </h2>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Class In-Charge: <strong>{getTeacherForClass(currentSelectedClassObj.id)?.name || 'Not Assigned'}</strong> • Room: {currentSelectedClassObj.roomNumber || 'General'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="bg-white/10 px-3 py-1.5 rounded border border-white/20">
                <span className="text-[10px] text-blue-200 block">Total Students</span>
                <span className="font-extrabold text-sm">{displayedClasses[0]?.totalEnrolled || 0}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded border border-white/20">
                <span className="text-[10px] text-amber-300 block">Defaulters</span>
                <span className="font-extrabold text-sm text-amber-300">
                  {displayedClasses[0]?.students.length || 0}
                </span>
              </div>
              <div className="bg-rose-500/30 px-3 py-1.5 rounded border border-rose-400/50">
                <span className="text-[10px] text-rose-200 block">Total Class Due</span>
                <span className="font-black text-sm text-rose-200">
                  {settings.currencySymbol} {(displayedClasses[0]?.classTotalDue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 1: EXECUTIVE CLASS-WISE SUMMARY MATRIX TABLE */}
        {/* (Only displayed when viewing All Classes or when viewMode is 'both'/'summary-only') */}
        {/* ======================================================== */}
        {!activeClassId && (viewMode === 'both' || viewMode === 'summary-only') && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 border-b border-blue-900 pb-1">
              <h3 className="font-extrabold text-xs text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                <span>1. Class-Wise Fee Defaulters Matrix (कक्षा अनुसार संक्षिप्त सारांश)</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Academic Session: {settings.academicSession}
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-left text-[11px] mb-2">
              <thead>
                <tr className="bg-blue-950 text-white text-[10px] font-bold">
                  <th className="border border-slate-400 p-1.5 text-center w-8">#</th>
                  <th className="border border-slate-400 p-1.5 w-28">Class & Sec</th>
                  <th className="border border-slate-400 p-1.5">Class Incharge Teacher</th>
                  <th className="border border-slate-400 p-1.5 text-center w-20">Enrolled</th>
                  <th className="border border-slate-400 p-1.5 text-center w-20">Defaulters</th>
                  <th className="border border-slate-400 p-1.5 text-right w-24">Demand (₹)</th>
                  <th className="border border-slate-400 p-1.5 text-right w-24">Collected (₹)</th>
                  <th className="border border-slate-400 p-1.5 text-right w-28">Outstanding Dues (₹)</th>
                  <th className="border border-slate-400 p-1.5 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {classWiseData.map((c, idx) => {
                  const hasDues = c.classTotalDue > 0;
                  const recoveryPct =
                    c.classTotalFee > 0 ? Math.round((c.classTotalPaid / c.classTotalFee) * 100) : 100;

                  return (
                    <tr
                      key={c.classInfo.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                    >
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 p-1.5 font-bold text-blue-950">
                        {c.classInfo.name} <span className="text-[10px] text-slate-500 font-normal">({c.classInfo.section || 'A'})</span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                        {c.classTeacher?.name || <span className="text-slate-400 italic">Not Assigned</span>}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-800">
                        {c.totalEnrolled}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-amber-800">
                        {c.defaultersCount}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-700">
                        {c.classTotalFee.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-800 font-semibold">
                        {c.classTotalPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold text-red-700 font-mono">
                        {settings.currencySymbol} {c.classTotalDue.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            c.classTotalDue > 15000
                              ? 'bg-red-100 text-red-800'
                              : hasDues
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.classTotalDue > 15000 ? 'High Dues' : hasDues ? 'Pending' : 'All Clear'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Summary Row */}
                <tr className="bg-slate-200/90 font-black text-xs border-t-2 border-slate-500">
                  <td colSpan={3} className="border border-slate-400 p-2 text-right uppercase text-slate-900">
                    Grand Institutional Total ({classWiseData.length} Classes):
                  </td>
                  <td className="border border-slate-400 p-2 text-center text-slate-900">
                    {grandTotals.totalEnrolled}
                  </td>
                  <td className="border border-slate-400 p-2 text-center text-amber-900">
                    {grandTotals.totalDefaulters}
                  </td>
                  <td className="border border-slate-400 p-2 text-right font-mono text-slate-900">
                    {grandTotals.totalDemanded.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-slate-400 p-2 text-right font-mono text-emerald-900">
                    {grandTotals.totalPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-slate-400 p-2 text-right text-red-800 font-mono text-sm">
                    {settings.currencySymbol} {grandTotals.totalDues.toLocaleString('en-IN')}
                  </td>
                  <td className="border border-slate-400 p-2 text-center text-[10px] text-slate-700">
                    {grandTotals.totalDefaulters} Defaulters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION 2: DETAILED CLASS-BY-CLASS STUDENT ROSTERS */}
        {/* ======================================================== */}
        {viewMode !== 'summary-only' && (
          <div className="space-y-6">
            {!activeClassId && (
              <div className="border-b border-blue-900 pb-1 mb-2">
                <h3 className="font-extrabold text-xs text-blue-950 uppercase tracking-wide">
                  2. Detailed Student Defaulter Rosters by Class (कक्षा अनुसार छात्र बकाया विवरण)
                </h3>
              </div>
            )}

            {displayedClasses.map((cGroup) => {
              if (cGroup.students.length === 0) {
                // If onlyWithDues is active and class has no dues, show clean cleared badge or skip
                return (
                  <div
                    key={cGroup.classInfo.id}
                    className="border border-dashed border-emerald-300 bg-emerald-50/50 rounded p-2.5 text-center text-xs text-emerald-800 my-2"
                  >
                    <strong>Class {cGroup.classInfo.name} ({cGroup.classInfo.section || 'A'}):</strong> All {cGroup.totalEnrolled} students have cleared their fees! No outstanding dues.
                  </div>
                );
              }

              return (
                <div
                  key={cGroup.classInfo.id}
                  className="mb-6 break-inside-avoid"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Class Subheader Strip */}
                  <div className="bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-t flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-950 text-sm">
                        Class: {cGroup.classInfo.name} - Section {cGroup.classInfo.section || 'A'}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        • Class In-Charge: <strong>{cGroup.classTeacher?.name || 'Not Assigned'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold text-[11px]">
                      <span>Enrolled: <strong>{cGroup.totalEnrolled}</strong></span>
                      <span className="text-amber-800">
                        Defaulters: <strong>{cGroup.students.length}</strong>
                      </span>
                      <span className="bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded border border-rose-200">
                        Class Dues: {settings.currencySymbol} {cGroup.classTotalDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Student Table for this Class */}
                  <table className="w-full border-collapse border border-slate-300 text-left text-[10px]">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="border border-slate-400 p-1.5 text-center w-7">#</th>
                        <th className="border border-slate-400 p-1.5 w-20">Adm No</th>
                        <th className="border border-slate-400 p-1.5 w-10 text-center">Roll</th>
                        <th className="border border-slate-400 p-1.5">Student Full Name</th>
                        <th className="border border-slate-400 p-1.5">Father's Name & Contact</th>
                        <th className="border border-slate-400 p-1.5 text-right w-20">Total Fee (₹)</th>
                        <th className="border border-slate-400 p-1.5 text-right w-20">Paid (₹)</th>
                        <th className="border border-slate-400 p-1.5 text-right w-24">Balance Due (₹)</th>
                        <th className="border border-slate-400 p-1.5 text-center w-20">Notice Level</th>
                        <th className="border border-slate-400 p-1.5 text-center w-24">Parent Sign / Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cGroup.students.map((item, idx) => {
                        const { student, dueAmount, totalFee, totalPaid } = item;
                        return (
                          <tr
                            key={student.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="border border-slate-300 p-1.5 text-center text-slate-500 font-medium">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 p-1.5 font-mono text-slate-700">
                              {student.admissionNo}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">
                              {student.rollNo}
                            </td>
                            <td className="border border-slate-300 p-1.5 font-bold text-blue-950 uppercase">
                              {student.fullName}
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              <span className="font-medium text-slate-800 block">{student.fatherName}</span>
                              <span className="text-[9px] text-slate-600 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                {student.guardianPhone || 'N/A'}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">
                              {totalFee.toLocaleString('en-IN')}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-700 font-semibold">
                              {totalPaid.toLocaleString('en-IN')}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-right font-extrabold text-red-700 font-mono text-[11px]">
                              {settings.currencySymbol} {dueAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  dueAmount > 5000
                                    ? 'bg-red-100 text-red-800'
                                    : dueAmount > 2000
                                    ? 'bg-amber-100 text-amber-800'
                                    : dueAmount > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {dueAmount > 5000
                                  ? 'Final Notice'
                                  : dueAmount > 2000
                                  ? '2nd Reminder'
                                  : dueAmount > 0
                                  ? '1st Reminder'
                                  : 'Cleared'}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center text-[9px] text-slate-400">
                              <div className="h-4 border-b border-dotted border-slate-400"></div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Class Subtotal Row */}
                      <tr className="bg-rose-50/70 font-black border-t-2 border-slate-400 text-[11px]">
                        <td colSpan={5} className="border border-slate-300 p-1.5 text-right uppercase text-slate-800">
                          Subtotal for Class {cGroup.classInfo.name} ({cGroup.students.length} Students):
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-800">
                          {cGroup.classTotalFee.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-800">
                          {cGroup.classTotalPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-extrabold text-red-800 font-mono">
                          {settings.currencySymbol} {cGroup.classTotalDue.toLocaleString('en-IN')}
                        </td>
                        <td colSpan={2} className="border border-slate-300 p-1.5 text-center text-[9px] text-slate-500 font-normal">
                          Verified by Class Teacher
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================== */}
        {/* OFFICIAL SUMMARY & SIGNATURE FOOTER */}
        {/* ======================================================== */}
        <div className="mt-8 pt-4 border-t-2 border-slate-400">
          {/* Institution Direct Settlement Notice & Bank / UPI Instructions */}
          <div className="bg-slate-50 border border-slate-300 p-3 rounded-lg mb-6 text-[10px] text-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">
                NOTICE TO PARENTS / GUARDIANS (अभिभावकों हेतु आवश्यक सूचना):
              </span>
              <p>
                1. Please deposit outstanding dues before the 10th of every calendar month to avoid late surcharge fine.
              </p>
              <p>
                2. Fees can be deposited in Cash at the school fee counter or digitally via UPI / Bank Transfer.
              </p>
            </div>
            <div className="bg-white border border-slate-300 p-2 rounded text-right shrink-0">
              <span className="font-bold text-blue-900 block text-[11px]">Official School UPI ID</span>
              <span className="font-mono font-extrabold text-emerald-700 text-xs">
                {settings.upiId || 'anilsingh636-2@oksbi'}
              </span>
              <span className="text-[9px] text-slate-500 block">Bank: {settings.bankName || 'State Bank of India'}</span>
            </div>
          </div>

          {/* Three-Way Institutional Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center pt-6 px-2">
            <div>
              <div className="w-36 mx-auto border-b border-slate-800 mb-1"></div>
              <p className="font-bold text-slate-800 text-[11px]">Class Teacher In-Charge</p>
              <p className="text-[9px] text-slate-500">Verified & Physical Follow-Up</p>
            </div>

            <div>
              <div className="w-36 mx-auto border-b border-slate-800 mb-1"></div>
              <p className="font-bold text-slate-800 text-[11px]">Fee Accountant / Cashier</p>
              <p className="text-[9px] text-slate-500">Accounts Department SBSC</p>
            </div>

            <div>
              <div className="w-40 mx-auto border-b border-slate-800 mb-1"></div>
              <p className="font-bold text-slate-800 text-[11px]">{settings.principalName || 'Principal'}</p>
              <p className="text-[9px] font-semibold text-blue-950">Principal & Official Seal</p>
            </div>
          </div>

          <div className="mt-6 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2">
            Generated electronically via SBSC Public School ERP • Bairwa Nankar, Siddharthnagar, UP • {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};
