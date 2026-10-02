import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Bus,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Compass,
  Check,
  Building,
  Home,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Student, ClassInfo } from '../../types/school';
import {
  ConveyanceVehicle,
  ConveyanceRoute,
  LOCAL_STOPPAGE_VILLAGES,
  matchAddressToConveyance,
  AddressConveyanceMatch,
} from '../../data/conveyanceData';

interface MatchItem {
  student: Student;
  match: AddressConveyanceMatch;
  isAlreadyAssigned: boolean;
  hasDifferentVillage: boolean;
}

interface AddressMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassInfo[];
  vehicles: ConveyanceVehicle[];
  routes: ConveyanceRoute[];
  onApplyMatches: (
    updatedStudents: Array<{
      studentId: string;
      conveyVillage: string;
      conveyRoute: string;
      conveyStop: string;
      conveyVehicle: string;
      conveyFee: number;
      conveyDriverName: string;
      conveyDriverPhone: string;
    }>
  ) => void;
}

export const AddressMatchModal: React.FC<AddressMatchModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  vehicles,
  routes,
  onApplyMatches,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'high_confidence' | 'village_changed'>('all');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Generate match items for all active students
  const matchItems = useMemo<MatchItem[]>(() => {
    return students
      .filter((s) => s.status === 'Active')
      .map((st) => {
        const match = matchAddressToConveyance(st.address, st.conveyFee);
        const isAlreadyAssigned = Boolean(st.conveyRoute && st.conveyStop && (st.conveyFee || 0) > 0);
        const hasDifferentVillage = Boolean(st.conveyVillage && st.conveyVillage !== match.village);

        return {
          student: st,
          match,
          isAlreadyAssigned,
          hasDifferentVillage,
        };
      });
  }, [students]);

  // Pre-select high confidence matches on open
  React.useEffect(() => {
    if (isOpen) {
      // Default select all students that either don't have a route yet or have HIGH/EXACT confidence
      const initialIds = matchItems
        .filter((item) => !item.isAlreadyAssigned || item.match.confidenceScore >= 80)
        .map((item) => item.student.id);
      setSelectedIds(initialIds);
    }
  }, [isOpen, matchItems]);

  if (!isOpen) return null;

  // Filtered match items
  const filteredItems = matchItems.filter(({ student, match, isAlreadyAssigned, hasDifferentVillage }) => {
    if (selectedVillageFilter !== 'all' && match.village !== selectedVillageFilter) {
      return false;
    }

    if (filterType === 'unassigned' && isAlreadyAssigned) return false;
    if (filterType === 'high_confidence' && match.confidenceScore < 80) return false;
    if (filterType === 'village_changed' && !hasDifferentVillage) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (student.fullName || '').toLowerCase().includes(q);
      const matchAdm = (student.admissionNo || '').toLowerCase().includes(q);
      const matchAddr = (student.address || '').toLowerCase().includes(q);
      const matchVil = match.village.toLowerCase().includes(q) || match.hindiVillage.includes(q);
      const matchRoute = match.route.toLowerCase().includes(q);
      const matchStop = match.stoppage.toLowerCase().includes(q);

      if (!matchName && !matchAdm && !matchAddr && !matchVil && !matchRoute && !matchStop) {
        return false;
      }
    }

    return true;
  });

  // Unique detected villages
  const detectedVillages = Array.from(new Set(matchItems.map((m) => m.match.village))).sort();

  // Statistics
  const totalAnalyzed = matchItems.length;
  const highConfidenceCount = matchItems.filter((m) => m.match.confidenceScore >= 80).length;
  const unassignedCount = matchItems.filter((m) => !m.isAlreadyAssigned).length;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((f) => f.student.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplySelected = () => {
    const selectedMatches = matchItems.filter((m) => selectedIds.includes(m.student.id));
    const payload = selectedMatches.map((m) => ({
      studentId: m.student.id,
      conveyVillage: m.match.village,
      conveyRoute: m.match.route,
      conveyStop: m.match.stoppage,
      conveyVehicle: m.match.vehicle,
      conveyFee: m.match.monthlyFee,
      conveyDriverName: m.match.driverName,
      conveyDriverPhone: m.match.driverPhone,
    }));

    onApplyMatches(payload);
    onClose();
  };

  const handleApplySingle = (item: MatchItem) => {
    onApplyMatches([
      {
        studentId: item.student.id,
        conveyVillage: item.match.village,
        conveyRoute: item.match.route,
        conveyStop: item.match.stoppage,
        conveyVehicle: item.match.vehicle,
        conveyFee: item.match.monthlyFee,
        conveyDriverName: item.match.driverName,
        conveyDriverPhone: item.match.driverPhone,
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-blue-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Address to Route & Stoppage Auto-Matcher</span>
                <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Smart AI Linker
                </span>
              </h3>
              <p className="text-xs text-emerald-200">
                छात्रों के निवास पते (Address) के आधार पर स्वतः गाँव, रूट, स्टॉपेज व वाहन का मिलान एवं आवंटन
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Analyzed</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">{totalAnalyzed}</span>
              <span className="text-xs text-slate-500 font-semibold">Active Students</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">High Confidence Match</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-700">{highConfidenceCount}</span>
              <span className="text-xs text-emerald-600 font-semibold">
                ({Math.round((highConfidenceCount / (totalAnalyzed || 1)) * 100)}% Match Rate)
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-2xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">Identified Villages</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-blue-800">{detectedVillages.length}</span>
              <span className="text-xs text-blue-600 font-semibold">Local Village Belts</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student, address, village, or stoppage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">All Students ({matchItems.length})</option>
              <option value="high_confidence">High Confidence (80%+) ({highConfidenceCount})</option>
              <option value="unassigned">Unassigned to Route ({unassignedCount})</option>
              <option value="village_changed">Village Mismatches</option>
            </select>

            <select
              value={selectedVillageFilter}
              onChange={(e) => setSelectedVillageFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-emerald-300 text-xs font-bold bg-emerald-50 text-emerald-950 focus:outline-none"
            >
              <option value="all">All Villages (सभी गाँव)</option>
              {detectedVillages.map((v, idx) => (
                <option key={idx} value={v}>
                  🏡 {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matches Table */}
        <div className="overflow-y-auto flex-1 p-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 shadow-xs">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Student & Class</th>
                <th className="p-3">Student's Address (पता)</th>
                <th className="p-3">Matched Village & Route</th>
                <th className="p-3">Suggested Stoppage</th>
                <th className="p-3">Vehicle & Fee</th>
                <th className="p-3 text-center">Confidence</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Compass className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-700">No students found matching current filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing search query or village filter</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const { student, match, isAlreadyAssigned } = item;
                  const isSelected = selectedIds.includes(student.id);
                  const currentClass = classes.find((c) => c.id === student.classId);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-emerald-50/40 transition ${
                        isSelected ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStudent(student.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {student.admissionNo} • {currentClass?.name || 'Class'}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="p-3 max-w-[200px]">
                        <div className="text-[11px] text-slate-700 font-medium line-clamp-2" title={student.address}>
                          {student.address || <span className="text-slate-400 italic">No address on file</span>}
                        </div>
                      </td>

                      {/* Matched Village & Route */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-emerald-900 font-extrabold text-xs">
                            <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{match.village}</span>
                            <span className="text-[10px] text-emerald-700 font-normal">({match.hindiVillage})</span>
                          </div>
                          <div className="text-[10px] text-indigo-900 font-medium truncate max-w-[170px]">
                            {match.route}
                          </div>
                        </div>
                      </td>

                      {/* Stoppage Landmark */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-slate-900 font-semibold text-xs">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate max-w-[160px]">{match.stoppage}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {match.explanation}
                        </span>
                      </td>

                      {/* Vehicle & Fee */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-slate-800 font-bold text-xs">
                          <Bus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[130px]">{match.vehicle}</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-black">
                          ₹{match.monthlyFee.toLocaleString('en-IN')}/month
                        </div>
                      </td>

                      {/* Confidence Tag */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            match.confidence === 'EXACT'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : match.confidence === 'HIGH'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {match.confidenceScore}% {match.confidence}
                        </span>
                      </td>

                      {/* Single Action */}
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleApplySingle(item)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Apply this match to student"
                        >
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Apply</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Bulk Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Selected <strong className="text-emerald-900 font-bold">{selectedIds.length}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{filteredItems.length}</strong> filtered students
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleApplySelected}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Apply Auto-Match to {selectedIds.length} Students</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
