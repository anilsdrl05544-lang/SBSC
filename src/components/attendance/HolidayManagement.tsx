import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Holiday } from '../../types/school';
import {
  Palmtree,
  Calendar,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  Flag,
  CalendarDays,
  FileSpreadsheet,
  Share2,
} from 'lucide-react';
import { exportTableToCsv } from '../../services/pdfService';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { NoticeBroadcastModal } from '../notices/NoticeBroadcastModal';

interface HolidayManagementProps {
  onSelectDateForAttendance?: (dateStr: string) => void;
}

export const HolidayManagement: React.FC<HolidayManagementProps> = ({ onSelectDateForAttendance }) => {
  const { holidays, addHoliday, updateHoliday, deleteHoliday, settings } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedHolidayForBroadcast, setSelectedHolidayForBroadcast] = useState<Holiday | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    isMultiDay: boolean;
    endDate: string;
    description: string;
    type: Holiday['type'];
  }>({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    isMultiDay: false,
    endDate: new Date().toISOString().slice(0, 10),
    description: '',
    type: 'Festival',
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  // Open add modal
  const handleOpenAddModal = (defaultDate?: string) => {
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: defaultDate || new Date().toISOString().slice(0, 10),
      isMultiDay: false,
      endDate: defaultDate || new Date().toISOString().slice(0, 10),
      description: '',
      type: 'Festival',
    });
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setFormData({
      name: h.name,
      date: h.date,
      isMultiDay: !!h.endDate && h.endDate !== h.date,
      endDate: h.endDate || h.date,
      description: h.description || '',
      type: h.type || 'Festival',
    });
    setIsAddModalOpen(true);
  };

  // Handle Save (Add or Update)
  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) return;

    if (formData.isMultiDay && formData.endDate && formData.endDate < formData.date) {
      alert('End date cannot be earlier than start date.');
      return;
    }

    const payload: Omit<Holiday, 'id'> = {
      name: formData.name.trim(),
      date: formData.date,
      endDate: formData.isMultiDay && formData.endDate ? formData.endDate : undefined,
      description: formData.description.trim() || undefined,
      type: formData.type,
    };

    if (editingHoliday) {
      updateHoliday(editingHoliday.id, payload);
      setFeedbackMessage(`✓ Updated holiday "${payload.name}" successfully.`);
    } else {
      addHoliday(payload);
      setFeedbackMessage(`✓ Added new holiday "${payload.name}" to school calendar.`);
    }

    setIsAddModalOpen(false);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!holidayToDelete) return;
    const name = holidayToDelete.name;
    deleteHoliday(holidayToDelete.id);
    setHolidayToDelete(null);
    setFeedbackMessage(`✓ Deleted holiday "${name}".`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered and sorted holidays
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter((h) => {
        // Search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = h.name.toLowerCase().includes(term);
          const matchDesc = (h.description || '').toLowerCase().includes(term);
          const matchDate = h.date.includes(term);
          if (!matchName && !matchDesc && !matchDate) return false;
        }

        // Type filter
        if (selectedType !== 'all' && h.type !== selectedType) {
          return false;
        }

        // Month filter (1-12)
        if (selectedMonth !== 'all') {
          const hMonth = parseInt(h.date.slice(5, 7), 10);
          if (hMonth !== parseInt(selectedMonth, 10)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, searchTerm, selectedType, selectedMonth]);

  // Statistics
  const totalHolidays = holidays.length;
  const upcomingHolidays = useMemo(() => {
    return holidays.filter((h) => (h.endDate || h.date) >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, todayStr]);

  const nextHoliday = upcomingHolidays[0];

  const getHolidayTypeBadge = (type?: Holiday['type']) => {
    switch (type) {
      case 'National':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Festival':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Vacation':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Gazetted':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'Emergency':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  // Format date helper
  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysCount = (start: string, end?: string) => {
    if (!end || start === end) return 1;
    const s = new Date(`${start}T00:00:00`).getTime();
    const e = new Date(`${end}T00:00:00`).getTime();
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['S.No', 'Holiday Name', 'Start Date', 'End Date', 'Days', 'Category / Type', 'Reason & Details'];
    const rows = filteredHolidays.map((h, i) => [
      i + 1,
      h.name,
      h.date,
      h.endDate || h.date,
      getDaysCount(h.date, h.endDate),
      h.type || 'Festival',
      h.description || '',
    ]);
    exportTableToCsv(`SBSC-Academic-Holidays-${settings.academicSession || '2026-2027'}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white rounded-2xl p-4 border border-blue-900/50 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
              Academic Calendar
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black">{totalHolidays}</span>
              <span className="text-xs text-slate-300 font-medium">Declared Holidays</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Session {settings.academicSession || '2026-2027'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-300/30 flex items-center justify-center text-amber-300">
            <Palmtree className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Next Holiday</span>
            {nextHoliday ? (
              <>
                <div className="text-sm font-extrabold text-blue-950 mt-1 truncate max-w-[180px]">
                  {nextHoliday.name}
                </div>
                <div className="text-xs font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateDisplay(nextHoliday.date)}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 mt-1">No upcoming holidays scheduled</div>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Actions</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleOpenAddModal()}
              className="flex-1 px-3 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-black text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Print official holiday calendar sheet"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Alert Message */}
      {feedbackMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search holiday name, reason, or date..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-900 focus:bg-white"
            />
          </div>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-blue-900 cursor-pointer"
          >
            <option value="all">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-blue-900 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="National">National Holidays</option>
            <option value="Festival">Festivals</option>
            <option value="Gazetted">Gazetted</option>
            <option value="Vacation">Vacation / Breaks</option>
            <option value="Institutional">Institutional</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Download CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedHolidayForBroadcast(null);
              setIsBroadcastModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black transition shadow-xs cursor-pointer"
            title="Broadcast holiday announcement to all students via SMS & WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Holiday</span>
          </button>
        </div>
      </div>

      {/* Holiday Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Date & Schedule</th>
                <th className="py-3.5 px-4">Holiday Name & Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Duration</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHolidays.map((h, idx) => {
                const days = getDaysCount(h.date, h.endDate);
                const isMultiDay = days > 1;
                const isToday =
                  todayStr === h.date ||
                  (h.endDate && todayStr >= h.date && todayStr <= h.endDate);
                const isPast = (h.endDate || h.date) < todayStr;
                const isUpcoming = h.date > todayStr;

                return (
                  <tr
                    key={h.id}
                    className={`transition ${
                      isToday
                        ? 'bg-amber-50/70 border-l-4 border-l-amber-500'
                        : isPast
                        ? 'bg-slate-50/40 text-slate-500 hover:bg-slate-50'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>

                    {/* Date Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 ${
                            isToday
                              ? 'bg-amber-500 text-white font-black shadow-xs'
                              : 'bg-blue-50 text-blue-950 font-bold border border-blue-100'
                          }`}
                        >
                          <span className="text-[11px] leading-tight">
                            {new Date(`${h.date}T00:00:00`).getDate()}
                          </span>
                          <span className="text-[8px] uppercase tracking-tighter leading-none opacity-80">
                            {new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}
                          </span>
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {formatDateDisplay(h.date)}
                          </div>
                          {isMultiDay && h.endDate && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              to {formatDateDisplay(h.endDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Name and Description */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>{h.name}</span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                            Today's Holiday
                          </span>
                        )}
                      </div>
                      {h.description && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-md">
                          {h.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getHolidayTypeBadge(
                          h.type
                        )}`}
                      >
                        {h.type || 'Festival'}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-block font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                        {days} {days === 1 ? 'Day' : 'Days'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                          <Sparkles className="w-3 h-3 text-amber-600" /> Active Today
                        </span>
                      ) : isUpcoming ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Upcoming
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-slate-400">
                          Concluded
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectDateForAttendance && (
                          <button
                            onClick={() => onSelectDateForAttendance(h.date)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold transition cursor-pointer"
                            title="Open Attendance Register for this holiday date"
                          >
                            View Register
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedHolidayForBroadcast(h);
                            setIsBroadcastModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          title="Broadcast Holiday Notice to All Students (WhatsApp & SMS)"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(h)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-900 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setHolidayToDelete(h)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredHolidays.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Palmtree className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-xs text-slate-700">No holidays found</p>
                      <p className="text-[11px] text-slate-400">
                        Try clearing search terms or adding a new holiday to your academic calendar.
                      </p>
                      <button
                        onClick={() => handleOpenAddModal()}
                        className="px-3.5 py-1.5 text-xs font-bold text-blue-950 bg-amber-300 hover:bg-amber-400 rounded-xl transition cursor-pointer"
                      >
                        + Add Holiday
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT HOLIDAY MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingHoliday ? 'Edit Academic Holiday' : 'Declare New School Holiday'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Holiday dates automatically lock attendance to "HOLIDAY" for all students and staff.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-5 space-y-4 text-xs">
              {/* Holiday Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Holiday Name / Occasion <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Gandhi Jayanti, Diwali Break, Local District Holiday..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-blue-900 focus:bg-white"
                />
              </div>

              {/* Category / Type */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Holiday Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Festival', 'National', 'Gazetted', 'Vacation', 'Institutional', 'Emergency'] as const).map(
                    (cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormData({ ...formData, type: cat })}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          formData.type === cat
                            ? 'bg-blue-950 text-amber-300 border-blue-950 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Start Date & Multi-day Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData({
                        ...formData,
                        date: newStart,
                        endDate: formData.isMultiDay ? (formData.endDate < newStart ? newStart : formData.endDate) : newStart,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-950 focus:outline-blue-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">End Date</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-blue-900">
                      <input
                        type="checkbox"
                        checked={formData.isMultiDay}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isMultiDay: e.target.checked,
                            endDate: e.target.checked ? formData.endDate || formData.date : formData.date,
                          })
                        }
                        className="rounded text-blue-900 focus:ring-blue-900"
                      />
                      <span>Multi-day</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={!formData.isMultiDay}
                    value={formData.endDate}
                    min={formData.date}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold ${
                      formData.isMultiDay
                        ? 'bg-slate-50 border-slate-300 text-blue-950 focus:outline-blue-900'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Reason / Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason / Description / Circular Reference
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details (e.g. As per DM order / Festive celebrations / School order ref #...)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-blue-900 focus:bg-white resize-none"
                />
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-950 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> On this date, attendance for both Students and Staff will show{' '}
                  <strong>“HOLIDAY”</strong> with this reason. Standard options (Present, Absent, Leave) will be locked.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-black transition shadow-sm cursor-pointer active:scale-95"
                >
                  {editingHoliday ? 'Save Changes' : 'Declare Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Holiday?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>"{holidayToDelete.name}"</strong> (
                {formatDateDisplay(holidayToDelete.date)}) from the academic calendar?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2 mt-2 border border-amber-200">
                Attendance records on this date will revert to regular editable registers.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-sm cursor-pointer active:scale-95"
              >
                Yes, Delete Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`SBSC Public School - Official Academic Holiday Calendar ${settings.academicSession || '2026-2027'}`}
        fileName={`SBSC-Holiday-Calendar-${settings.academicSession || '2026-2027'}.pdf`}
      >
        <div className="p-8 max-w-4xl mx-auto bg-white text-slate-900 text-xs">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-black tracking-tight text-blue-950 uppercase">{settings.schoolName}</h1>
            <p className="text-xs font-bold text-slate-600 mt-0.5">{settings.subTitle}</p>
            <p className="text-[11px] text-slate-500">
              {settings.address}, {settings.district}, {settings.state} - {settings.pinCode}
            </p>
            <div className="mt-3 inline-block bg-blue-950 text-amber-300 px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase">
              Official Academic Holiday Calendar (Session {settings.academicSession || '2026-2027'})
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-400 uppercase text-[10px]">
                <th className="border border-slate-400 p-2 w-10 text-center">S.No</th>
                <th className="border border-slate-400 p-2 text-left">Date / Duration</th>
                <th className="border border-slate-400 p-2 text-left">Holiday Name & Occasion</th>
                <th className="border border-slate-400 p-2 text-center">Category</th>
                <th className="border border-slate-400 p-2 text-center">Days</th>
                <th className="border border-slate-400 p-2 text-left">Reason / Circular Remarks</th>
              </tr>
            </thead>
            <tbody>
              {holidays
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h, i) => {
                  const days = getDaysCount(h.date, h.endDate);
                  return (
                    <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-400 p-2 text-center font-bold text-slate-600">{i + 1}</td>
                      <td className="border border-slate-400 p-2 font-bold whitespace-nowrap">
                        {formatDateDisplay(h.date)}
                        {h.endDate && h.endDate !== h.date && (
                          <span className="block text-[10px] text-slate-500 font-normal">
                            to {formatDateDisplay(h.endDate)}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-400 p-2 font-black text-blue-950">{h.name}</td>
                      <td className="border border-slate-400 p-2 text-center font-semibold text-slate-700">
                        {h.type || 'Festival'}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-mono font-bold">{days}</td>
                      <td className="border border-slate-400 p-2 text-slate-600 italic">
                        {h.description || 'School Closed'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Footer Signatures */}
          <div className="mt-16 flex justify-between items-end pt-6 border-t border-slate-200">
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1"></div>
              <span className="text-[11px] font-bold text-slate-600">Administrative Officer</span>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-slate-400 mb-1"></div>
              <span className="text-[11px] font-bold text-slate-900">{settings.principalName}</span>
              <span className="block text-[10px] text-slate-500">Principal / Head of Institution</span>
            </div>
          </div>
        </div>
      </PrintPreviewModal>

      {/* Notice Broadcast Modal for Holiday Announcement */}
      <NoticeBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setIsBroadcastModalOpen(false);
          setSelectedHolidayForBroadcast(null);
        }}
        initialHolidayName={selectedHolidayForBroadcast?.name}
        initialDate={selectedHolidayForBroadcast?.date}
        initialCategory="Holiday"
      />
    </div>
  );
};
