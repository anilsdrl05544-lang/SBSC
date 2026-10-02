import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Shield,
  CreditCard,
  Printer,
  Calendar,
  User,
  Undo2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Student, AttendanceRecord, AttendanceFineStatus } from '../../types/school';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { AttendanceFineModal } from './AttendanceFineModal';

interface AttendanceFineRegisterProps {
  initialClassId?: string;
  initialSection?: string;
}

export const AttendanceFineRegister: React.FC<AttendanceFineRegisterProps> = ({
  initialClassId,
  initialSection,
}) => {
  const {
    students,
    classes,
    attendance,
    settings,
    markAttendanceFinePaid,
    waiveAttendanceFine,
    resetAttendanceFineToUnpaid,
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'all');
  const [selectedSection, setSelectedSection] = useState<string>(initialSection || 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<'All' | AttendanceFineStatus>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-selection state for bulk operations
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  // Single modal state
  const [modalTargetStudent, setModalTargetStudent] = useState<Student | null>(null);
  const [modalTargetRecords, setModalTargetRecords] = useState<AttendanceRecord[] | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fine rate
  const fineRatePerDay = settings.absentFinePerDay ?? 5;

  // Student map for fast lookups
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Class map
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  // Filter absent student attendance records
  const absentRecords = useMemo(() => {
    return attendance
      .filter((a) => {
        if (a.type !== 'student' || a.status !== 'Absent') return false;

        const st = studentMap.get(a.targetId);
        if (!st) return false;

        // Class filter
        if (selectedClassId !== 'all') {
          const recClassId = a.classId || st.classId;
          if (recClassId !== selectedClassId) return false;
        }

        // Section filter
        if (selectedSection !== 'all') {
          const recSection = a.section || st.section;
          if (recSection !== selectedSection) return false;
        }

        // Month filter
        if (selectedMonth !== 'all' && selectedMonth) {
          if (!a.date.startsWith(selectedMonth)) return false;
        }

        // Fine status filter
        const currentFineStatus: AttendanceFineStatus = a.fineStatus || 'Unpaid';
        if (statusFilter !== 'All' && currentFineStatus !== statusFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = st.fullName.toLowerCase().includes(q);
          const admMatch = st.admissionNo.toLowerCase().includes(q);
          const rollMatch = (st.rollNo || '').toLowerCase().includes(q);
          const fatherMatch = (st.fatherName || '').toLowerCase().includes(q);
          if (!nameMatch && !admMatch && !rollMatch && !fatherMatch) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, studentMap, selectedClassId, selectedSection, selectedMonth, statusFilter, searchQuery]);

  // Metrics calculation
  const totalAbsentDays = absentRecords.length;
  const paidRecords = absentRecords.filter((r) => r.fineStatus === 'Paid');
  const waivedRecords = absentRecords.filter((r) => r.fineStatus === 'Waived');
  const unpaidRecords = absentRecords.filter((r) => r.fineStatus !== 'Paid' && r.fineStatus !== 'Waived');

  const totalIncurredFine = totalAbsentDays * fineRatePerDay;
  const totalPaidFine = paidRecords.reduce((sum, r) => sum + (r.fineAmount || fineRatePerDay), 0);
  const totalPendingFine = unpaidRecords.length * fineRatePerDay;
  const totalWaivedFine = waivedRecords.length * fineRatePerDay;

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedRecordIds.length === absentRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(absentRecords.map((r) => r.id));
    }
  };

  const handleBulkMarkPaid = () => {
    if (selectedRecordIds.length === 0) return;
    const receiptNo = `AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    markAttendanceFinePaid(selectedRecordIds, {
      paymentMode: 'Cash',
      receiptNo,
      paidDate: new Date().toISOString().slice(0, 10),
      fineAmount: fineRatePerDay,
    });
    setBulkActionFeedback(`Marked ${selectedRecordIds.length} attendance fine(s) as Paid (Receipt #${receiptNo})`);
    setSelectedRecordIds([]);
    setTimeout(() => setBulkActionFeedback(null), 3000);
  };

  const handleBulkWaive = () => {
    if (selectedRecordIds.length === 0) return;
    waiveAttendanceFine(selectedRecordIds, 'Bulk Waived by Administration');
    setBulkActionFeedback(`Waived fine for ${selectedRecordIds.length} absent record(s).`);
    setSelectedRecordIds([]);
    setTimeout(() => setBulkActionFeedback(null), 3000);
  };

  const handleBulkResetUnpaid = () => {
    if (selectedRecordIds.length === 0) return;
    resetAttendanceFineToUnpaid(selectedRecordIds);
    setBulkActionFeedback(`Reset ${selectedRecordIds.length} fine(s) back to Unpaid status.`);
    setSelectedRecordIds([]);
    setTimeout(() => setBulkActionFeedback(null), 3000);
  };

  const openStudentModal = (record: AttendanceRecord) => {
    const st = studentMap.get(record.targetId);
    if (!st) return;
    setModalTargetStudent(st);
    setModalTargetRecords([record]);
    setIsModalOpen(true);
  };

  const openStudentAllAbsentsModal = (studentId: string) => {
    const st = studentMap.get(studentId);
    if (!st) return;
    setModalTargetStudent(st);
    setModalTargetRecords(undefined);
    setIsModalOpen(true);
  };

  const handlePrintRegister = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Absents</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{totalAbsentDays}</span>
            <span className="text-xs font-semibold text-slate-400">Records</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Incurred</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">₹{totalIncurredFine}</span>
            <span className="text-xs font-semibold text-slate-400">@₹{fineRatePerDay}/day</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase block">Fine Collected (Paid)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-800">₹{totalPaidFine}</span>
            <span className="text-xs font-bold text-emerald-700">{paidRecords.length} Days</span>
          </div>
        </div>

        <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase block">Pending Due (Unpaid)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-800">₹{totalPendingFine}</span>
            <span className="text-xs font-bold text-rose-700">{unpaidRecords.length} Days</span>
          </div>
        </div>

        <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-600 uppercase block">Fines Waived</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-800">₹{totalWaivedFine}</span>
            <span className="text-xs font-bold text-slate-500">{waivedRecords.length} Days</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Sec:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Month:</span>
              <input
                type="month"
                value={selectedMonth === 'all' ? '' : selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value || 'all')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white font-mono"
              />
              {selectedMonth !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  className="text-[11px] text-blue-700 font-bold hover:underline"
                >
                  Clear Month
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Status:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                {(['All', 'Unpaid', 'Paid', 'Waived'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      statusFilter === st
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'All' ? 'All' : st === 'Unpaid' ? 'Unpaid (बकाया)' : st === 'Paid' ? 'Paid (जमा)' : 'Waived (माफ)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintRegister}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-800 text-white hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Register</span>
            </button>
          </div>
        </div>

        {/* Search input and Bulk Actions Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, roll, or adm no..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-900"
            />
          </div>

          {/* Bulk Actions when items are selected */}
          {selectedRecordIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="font-extrabold text-blue-950">
                {selectedRecordIds.length} Selected
              </span>
              <button
                type="button"
                onClick={handleBulkMarkPaid}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Paid (जमा करें)</span>
              </button>
              <button
                type="button"
                onClick={handleBulkWaive}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold transition flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Waive (माफ करें)</span>
              </button>
              <button
                type="button"
                onClick={handleBulkResetUnpaid}
                className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer"
                title="Reset to Unpaid"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {bulkActionFeedback && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bulkActionFeedback}</span>
          </div>
        )}
      </div>

      {/* Absent Fine Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={absentRecords.length > 0 && selectedRecordIds.length === absentRecords.length}
                    onChange={handleSelectAllVisible}
                    className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-800"
                  />
                </th>
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4 w-24 text-center">Class / Roll</th>
                <th className="py-3 px-4 w-24 text-center">Fine (रु)</th>
                <th className="py-3 px-4 w-32 text-center">Status</th>
                <th className="py-3 px-4">Payment / Waiver Info</th>
                <th className="py-3 px-4 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {absentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="font-bold text-slate-700">No Absent Records Matching Filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Either no students were absent in the selected period or all fines are cleared.
                    </p>
                  </td>
                </tr>
              ) : (
                absentRecords.map((r) => {
                  const st = studentMap.get(r.targetId);
                  if (!st) return null;

                  const isSelected = selectedRecordIds.includes(r.id);
                  const isPaid = r.fineStatus === 'Paid';
                  const isWaived = r.fineStatus === 'Waived';
                  const isUnpaid = !isPaid && !isWaived;
                  const recordFine = r.fineAmount || fineRatePerDay;

                  return (
                    <tr
                      key={r.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-blue-50/70'
                          : isUnpaid
                          ? 'hover:bg-rose-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-800"
                        />
                      </td>

                      {/* Absent Date */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatDateToDDMMYYYY(r.date)}
                      </td>

                      {/* Student Details */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => openStudentAllAbsentsModal(st.id)}
                          className="cursor-pointer group"
                        >
                          <span className="font-extrabold text-slate-900 group-hover:text-blue-800 transition block">
                            {st.fullName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Adm: <strong className="text-slate-700">{st.admissionNo}</strong>
                            {st.fatherName ? ` • S/D of ${st.fatherName}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Class and Roll */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-800 block text-xs">
                          {classMap.get(r.classId || st.classId) || 'Class'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Roll #{st.rollNo || '-'}
                        </span>
                      </td>

                      {/* Fine Amount */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-black text-xs text-slate-900">
                          ₹{recordFine}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Paid (जमा)</span>
                          </span>
                        )}
                        {isWaived && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300">
                            <Shield className="w-3 h-3 text-slate-600" />
                            <span>Waived (माफ)</span>
                          </span>
                        )}
                        {isUnpaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-700" />
                            <span>Due (बकाया)</span>
                          </span>
                        )}
                      </td>

                      {/* Payment / Waiver Details */}
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {isPaid && (
                          <div>
                            <span className="font-bold text-slate-800">
                              Receipt #{r.fineReceiptNo || 'N/A'}
                            </span>
                            <span className="text-slate-500 block">
                              {r.finePaymentMode || 'Cash'} • {formatDateToDDMMYYYY(r.finePaidDate || r.date)}
                            </span>
                          </div>
                        )}
                        {isWaived && (
                          <div>
                            <span className="text-slate-700 font-semibold italic">
                              {r.fineWaivedReason || 'Waived by Authority'}
                            </span>
                          </div>
                        )}
                        {isUnpaid && (
                          <span className="text-slate-400 italic">
                            Awaiting payment at counter
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUnpaid && (
                            <button
                              type="button"
                              onClick={() => openStudentModal(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Mark fine as Paid"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay (जमा)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openStudentAllAbsentsModal(st.id)}
                            className="px-2 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                            title="View all fines for this student"
                          >
                            All Fines
                          </button>

                          {(isPaid || isWaived) && (
                            <button
                              type="button"
                              onClick={() => resetAttendanceFineToUnpaid([r.id])}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Reset back to Unpaid"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Student Attendance Fine Modal */}
      {isModalOpen && modalTargetStudent && (
        <AttendanceFineModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalTargetStudent(null);
            setModalTargetRecords(undefined);
          }}
          student={modalTargetStudent}
          targetRecords={modalTargetRecords}
        />
      )}
    </div>
  );
};
