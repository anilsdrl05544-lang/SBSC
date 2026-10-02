import React, { useState, useMemo } from 'react';
import {
  Bus,
  Search,
  Filter,
  Printer,
  Download,
  Plus,
  Settings,
  Phone,
  MessageSquare,
  Edit2,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Car,
  ShieldCheck,
  Home,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Student } from '../../types/school';
import {
  ConveyanceVehicle,
  ConveyanceRoute,
  LOCAL_STOPPAGE_VILLAGES,
  getStoredVehicles,
  saveStoredVehicles,
  getStoredRoutes,
  saveStoredRoutes,
  matchAddressToConveyance,
} from '../../data/conveyanceData';
import { ConveyanceStudentModal } from './ConveyanceStudentModal';
import { VehicleRouteModal } from './VehicleRouteModal';
import { ConveyancePrintModal } from './ConveyancePrintModal';
import { ConveyanceWhatsAppModal } from './ConveyanceWhatsAppModal';
import { AddressMatchModal } from './AddressMatchModal';

interface ConveyanceManagementProps {
  onNavigate?: (module: string) => void;
}

export const ConveyanceManagement: React.FC<ConveyanceManagementProps> = ({ onNavigate }) => {
  const { students, classes, settings, updateStudent, updateStudentFee, getStudentDueAmount, getStudentFeeBreakdown } = useSchool();

  // Fleet & Route State
  const [vehicles, setVehicles] = useState<ConveyanceVehicle[]>(() => getStoredVehicles());
  const [routes, setRoutes] = useState<ConveyanceRoute[]>(() => getStoredRoutes());

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'vehicles' | 'routes' | 'villages' | 'defaulters' | 'enroll'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>('all');

  // Multi-select for bulk actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printVehicleFilter, setPrintVehicleFilter] = useState<string | undefined>(undefined);
  const [printRouteFilter, setPrintRouteFilter] = useState<string | undefined>(undefined);
  const [whatsAppStudent, setWhatsAppStudent] = useState<Student | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isAddressMatchModalOpen, setIsAddressMatchModalOpen] = useState(false);

  // Bulk assignment state
  const [bulkVehicle, setBulkVehicle] = useState('');
  const [bulkRoute, setBulkRoute] = useState('');
  const [bulkVillage, setBulkVillage] = useState('');
  const [bulkStop, setBulkStop] = useState('');
  const [bulkFee, setBulkFee] = useState<number>(600);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper to determine if a student is actively availing conveyance
  const isConveyanceEnrolled = (s: Student) => {
    return (s.conveyFee && s.conveyFee > 0) || Boolean(s.conveyVehicle) || Boolean(s.conveyRoute);
  };

  // Extract unique stoppage villages strictly from the configured transportation options
  const availableVillages = useMemo(() => {
    return LOCAL_STOPPAGE_VILLAGES.map((v) => v.village);
  }, []);

  // Base list depending on activeTab
  const baseStudents = useMemo(() => {
    if (activeTab === 'enroll') {
      // In enroll tab, show all active school students
      return students.filter((s) => s.status === 'Active');
    }
    // Otherwise, show only students enrolled in conveyance
    return students.filter((s) => s.status === 'Active' && isConveyanceEnrolled(s));
  }, [students, activeTab]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return baseStudents.filter((s) => {
      // Class filter
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;

      // Vehicle filter
      if (selectedVehicleFilter !== 'all') {
        if (s.conveyVehicle !== selectedVehicleFilter) return false;
      }

      // Route filter
      if (selectedRouteFilter !== 'all') {
        if (s.conveyRoute !== selectedRouteFilter) return false;
      }

      // Village filter
      if (selectedVillageFilter !== 'all') {
        if ((s.conveyVillage || '') !== selectedVillageFilter) return false;
      }

      // Defaulters tab filter
      if (activeTab === 'defaulters') {
        const netDue = getStudentDueAmount(s.id);
        if (netDue <= 0) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.fullName || '').toLowerCase().includes(q);
        const matchesAdm = (s.admissionNo || '').toLowerCase().includes(q);
        const matchesRoll = (s.rollNo || '').toLowerCase().includes(q);
        const matchesFather = (s.fatherName || '').toLowerCase().includes(q);
        const matchesPhone = (s.guardianPhone || '').toLowerCase().includes(q) || (s.emergencyContact || '').includes(q);
        const matchesStop = (s.conveyStop || '').toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q);
        const matchesVillage = (s.conveyVillage || '').toLowerCase().includes(q);
        const matchesRoute = (s.conveyRoute || '').toLowerCase().includes(q);
        const matchesVehicle = (s.conveyVehicle || '').toLowerCase().includes(q);

        if (!matchesName && !matchesAdm && !matchesRoll && !matchesFather && !matchesPhone && !matchesStop && !matchesVillage && !matchesRoute && !matchesVehicle) {
          return false;
        }
      }

      return true;
    });
  }, [baseStudents, selectedClassId, selectedVehicleFilter, selectedRouteFilter, selectedVillageFilter, activeTab, searchQuery, getStudentDueAmount]);

  // Fleet Statistics
  const stats = useMemo(() => {
    const conveyanceStudents = students.filter((s) => s.status === 'Active' && isConveyanceEnrolled(s));
    const totalEnrolled = conveyanceStudents.length;
    const totalSchoolStudents = students.filter((s) => s.status === 'Active').length;
    const enrollmentPercent = totalSchoolStudents > 0 ? Math.round((totalEnrolled / totalSchoolStudents) * 100) : 0;

    const monthlyDemand = conveyanceStudents.reduce((sum, s) => sum + (s.conveyFee || 0), 0);
    const annualDemand = monthlyDemand * 12;

    const totalFleetCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);

    // Defaulters in conveyance
    const defaultersCount = conveyanceStudents.filter((s) => getStudentDueAmount(s.id) > 0).length;
    const totalPendingDues = conveyanceStudents.reduce((sum, s) => sum + getStudentDueAmount(s.id), 0);

    return {
      totalEnrolled,
      totalSchoolStudents,
      enrollmentPercent,
      monthlyDemand,
      annualDemand,
      totalFleetCapacity,
      defaultersCount,
      totalPendingDues,
    };
  }, [students, vehicles, getStudentDueAmount]);

  // Save student conveyance updates
  const handleSaveStudentConveyance = (data: {
    conveyFee: number;
    conveyVehicle: string;
    conveyRoute: string;
    conveyStop: string;
    conveyVillage: string;
    conveyDriverName: string;
    conveyDriverPhone: string;
  }) => {
    if (!editingStudent) return;

    // 1. Update basic student fields
    updateStudent(editingStudent.id, {
      conveyVehicle: data.conveyVehicle,
      conveyRoute: data.conveyRoute,
      conveyStop: data.conveyStop,
      conveyVillage: data.conveyVillage,
      conveyDriverName: data.conveyDriverName,
      conveyDriverPhone: data.conveyDriverPhone,
      conveyFee: data.conveyFee,
    });

    // 2. Update fee breakdown so yearly total due reflects new convey fee
    updateStudentFee(editingStudent.id, {
      conveyFee: data.conveyFee,
    });

    showToast(`Conveyance details updated for ${editingStudent.fullName}!`);
  };

  // Bulk Assignment Handler
  const handleApplyBulkAssignment = () => {
    if (selectedStudentIds.length === 0) return;

    const matchedVeh = vehicles.find((v) => v.name === bulkVehicle);
    const matchedRoute = routes.find((r) => r.name === bulkRoute);

    selectedStudentIds.forEach((sId) => {
      const target = students.find((s) => s.id === sId);
      if (!target) return;

      updateStudent(sId, {
        conveyVehicle: bulkVehicle || target.conveyVehicle,
        conveyRoute: bulkRoute || target.conveyRoute,
        conveyVillage: bulkVillage || target.conveyVillage,
        conveyStop: bulkStop || target.conveyStop,
        conveyDriverName: matchedVeh?.driverName || target.conveyDriverName,
        conveyDriverPhone: matchedVeh?.driverPhone || target.conveyDriverPhone,
        conveyFee: bulkFee !== undefined ? bulkFee : target.conveyFee,
      });

      if (bulkFee !== undefined) {
        updateStudentFee(sId, {
          conveyFee: bulkFee,
        });
      }
    });

    showToast(`Bulk conveyance updated for ${selectedStudentIds.length} students!`);
    setSelectedStudentIds([]);
    setShowBulkAssignModal(false);
  };

  // Bulk Apply Matches from Address Matcher Modal
  const handleApplyAddressMatches = (
    updatedList: Array<{
      studentId: string;
      conveyVillage: string;
      conveyRoute: string;
      conveyStop: string;
      conveyVehicle: string;
      conveyFee: number;
      conveyDriverName: string;
      conveyDriverPhone: string;
    }>
  ) => {
    updatedList.forEach((item) => {
      updateStudent(item.studentId, {
        conveyVillage: item.conveyVillage,
        conveyRoute: item.conveyRoute,
        conveyStop: item.conveyStop,
        conveyVehicle: item.conveyVehicle,
        conveyDriverName: item.conveyDriverName,
        conveyDriverPhone: item.conveyDriverPhone,
        conveyFee: item.conveyFee,
      });
      updateStudentFee(item.studentId, {
        conveyFee: item.conveyFee,
      });
    });
    showToast(`✅ Successfully matched & updated Route, Stoppage & Village for ${updatedList.length} students from their addresses!`);
  };

  // 1-Click Quick Match Single Student Address
  const handleQuickMatchStudentAddress = (targetStudent: Student) => {
    const match = matchAddressToConveyance(targetStudent.address, targetStudent.conveyFee);
    updateStudent(targetStudent.id, {
      conveyVillage: match.village,
      conveyRoute: match.route,
      conveyStop: match.stoppage,
      conveyVehicle: match.vehicle,
      conveyDriverName: match.driverName,
      conveyDriverPhone: match.driverPhone,
      conveyFee: match.monthlyFee,
    });
    updateStudentFee(targetStudent.id, {
      conveyFee: match.monthlyFee,
    });
    showToast(`📍 Matched ${targetStudent.fullName} to ${match.village} • ${match.stoppage} (${match.route})`);
  };

  // Bulk Auto-Match for currently checked students
  const handleBulkAutoMatchSelected = () => {
    const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));
    const payload = selectedStudents.map((st) => {
      const match = matchAddressToConveyance(st.address, st.conveyFee);
      return {
        studentId: st.id,
        conveyVillage: match.village,
        conveyRoute: match.route,
        conveyStop: match.stoppage,
        conveyVehicle: match.vehicle,
        conveyFee: match.monthlyFee,
        conveyDriverName: match.driverName,
        conveyDriverPhone: match.driverPhone,
      };
    });
    handleApplyAddressMatches(payload);
    setSelectedStudentIds([]);
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'S.No',
      'Admission No',
      'Roll No',
      'Student Name',
      'Father Name',
      'Class',
      'Section',
      'Vehicle Assigned',
      'Route Name',
      'Stoppage Village',
      'Pickup Stoppage',
      'Monthly Convey Fee',
      'Annual Convey Fee',
      'Total Net Due',
      'Parent Contact',
      'Driver Name',
      'Driver Contact',
    ];

    const rows = filteredStudents.map((s, idx) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
      const fee = s.conveyFee || 0;
      const netDue = getStudentDueAmount(s.id);
      return [
        idx + 1,
        `"${s.admissionNo}"`,
        `"${s.rollNo || ''}"`,
        `"${s.fullName}"`,
        `"${s.fatherName}"`,
        `"${cls}"`,
        `"${s.section}"`,
        `"${s.conveyVehicle || 'Unassigned'}"`,
        `"${s.conveyRoute || ''}"`,
        `"${s.conveyVillage || 'Riwa Nankar'}"`,
        `"${s.conveyStop || s.address || ''}"`,
        fee,
        fee * 12,
        netDue,
        `"${s.guardianPhone || s.emergencyContact || ''}"`,
        `"${s.conveyDriverName || ''}"`,
        `"${s.conveyDriverPhone || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SBSC_Conveyance_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Conveyance list exported to CSV successfully!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast banner */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5" />
                <span>Transport & Fleet ERP</span>
              </span>
              <span className="text-blue-200 text-xs font-medium hidden sm:inline">
                {settings.schoolName || 'SBSC Public School'} • Riwa Nankar
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>School Conveyance List</span>
              <span className="text-sm font-bold bg-white/20 text-white px-3 py-0.5 rounded-full">
                {stats.totalEnrolled} Students Enrolled
              </span>
            </h1>

            <p className="text-sm text-blue-200 mt-1 max-w-2xl">
              वाहनवार एवं रूटवार छात्र कन्वेंस रजिस्टर • Stoppage details, vehicle rosters, driver contacts & conveyance fee collection
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddressMatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
              title="Students address match village Route & Stoppage"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Address Matcher (पते से ऑटो-मैच)</span>
            </button>

            <button
              onClick={() => {
                setPrintVehicleFilter(undefined);
                setPrintRouteFilter(undefined);
                setIsPrintModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print A4 Register</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsFleetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Car className="w-4 h-4 text-slate-950" />
              <span>Fleet & Routes ({vehicles.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Statistics Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Conveyance Students
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalEnrolled}</span>
            <span className="text-xs text-slate-500 font-semibold">/ {stats.totalSchoolStudents} Students</span>
          </div>
          <div className="text-[11px] text-blue-700 font-semibold">
            {stats.enrollmentPercent}% of school using transport
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fleet Capacity
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{vehicles.length} Vehicles</span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            {stats.totalFleetCapacity} total seating capacity
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Demand
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800">
              ₹{stats.monthlyDemand.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">/month</span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            Annual: ₹{stats.annualDemand.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => setActiveTab('defaulters')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-rose-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">
              {stats.defaultersCount} Students
            </span>
          </div>
          <div className="text-[11px] text-rose-600 font-bold">
            ₹{stats.totalPendingDues.toLocaleString('en-IN')} pending balance ➔
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 sm:px-6 pt-3 bg-slate-50/70 gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>All Conveyance Students ({stats.totalEnrolled})</span>
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>By Vehicle / Bus ({vehicles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('routes')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'routes'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>By Route & Stoppages ({routes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('villages')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'villages'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>By Village / ग्राम ({availableVillages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('defaulters')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'defaulters'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Conveyance Dues ({stats.defaultersCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('enroll')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'enroll'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-amber-100/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>+ Enroll More Students ({stats.totalSchoolStudents - stats.totalEnrolled} remaining)</span>
            </button>
          </div>

          <div className="pb-2 text-xs font-semibold text-slate-500">
            Showing <span className="text-slate-900 font-bold">{filteredStudents.length}</span> students
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search student, adm, father, stop, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Vehicle Filter */}
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>

            {/* Route Filter */}
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Village Filter */}
            <select
              value={selectedVillageFilter}
              onChange={(e) => setSelectedVillageFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-950 bg-emerald-50/60 focus:bg-white focus:outline-none"
            >
              <option value="all">All Villages (सभी गाँव)</option>
              {availableVillages.map((vil, vIdx) => (
                <option key={vIdx} value={vil}>
                  🏡 {vil}
                </option>
              ))}
            </select>

            {(searchQuery || selectedClassId !== 'all' || selectedVehicleFilter !== 'all' || selectedRouteFilter !== 'all' || selectedVillageFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClassId('all');
                  setSelectedVehicleFilter('all');
                  setSelectedRouteFilter('all');
                  setSelectedVillageFilter('all');
                }}
                className="px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-bold transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when students are selected) */}
        {selectedStudentIds.length > 0 && (
          <div className="bg-blue-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                {selectedStudentIds.length} Selected
              </span>
              <span>Bulk Actions for Selected Students:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkAutoMatchSelected}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Automatically match village, route, stoppage and vehicle based on each student's address"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto-Match Address ({selectedStudentIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBulkAssignModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Bulk Assign Vehicle / Fee</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-xs font-semibold text-blue-200 transition cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Vehicle-wise Overview Cards */}
        {activeTab === 'vehicles' && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Vehicle-wise Student Rosters</h3>
                <p className="text-xs text-slate-500">Each bus / van with its assigned students and seat occupancy</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => {
                const assignedStudents = students.filter(
                  (s) => s.status === 'Active' && s.conveyVehicle === v.name
                );
                const occupancyPercent = Math.min(100, Math.round((assignedStudents.length / v.capacity) * 100));

                return (
                  <div
                    key={v.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base">{v.name}</h4>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {v.registrationNo}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPrintVehicleFilter(v.name);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        title="Print roster for this vehicle"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Roster</span>
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Seat Occupancy</span>
                        <span>
                          <strong className="text-slate-900">{assignedStudents.length}</strong> / {v.capacity} Seats ({occupancyPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancyPercent > 90
                              ? 'bg-rose-500'
                              : occupancyPercent > 60
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Driver Contact & Route */}
                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Driver</span>
                        <span className="font-bold text-slate-800">{v.driverName}</span>
                      </div>
                      <a
                        href={`tel:${v.driverPhone}`}
                        className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{v.driverPhone}</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Route-wise Overview Cards */}
        {activeTab === 'routes' && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Transport Routes & Stoppages</h3>
                <p className="text-xs text-slate-500">Pick-up and drop routes with students at each belt</p>
              </div>
            </div>

            <div className="space-y-4">
              {routes.map((r) => {
                const assignedStudents = students.filter(
                  (s) => s.status === 'Active' && s.conveyRoute === r.name
                );

                return (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-950 font-mono font-bold text-xs">
                          {r.code}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{r.name}</h4>
                          <p className="text-xs text-slate-500">{r.description}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-blue-900 text-sm">{assignedStudents.length} Students</span>
                        <span className="text-[10px] text-slate-400 block">Enrolled on Route</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.stoppages.map((st, sIdx) => {
                        const countAtStop = assignedStudents.filter((s) => (s.conveyStop || '').includes(st.name)).length;
                        return (
                          <div
                            key={sIdx}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold text-slate-800">{st.name}</span>
                            <span className="text-[10px] text-slate-400">({st.pickupTime})</span>
                            {countAtStop > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                                {countAtStop}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Village-wise Directory */}
        {activeTab === 'villages' && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-700" />
                  <span>Village-wise Stoppage Directory (ग्रामवार स्टॉपेज व छात्र सूची)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive listing of all local villages, stoppage landmarks, vehicle routes, and student counts
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                {availableVillages.length} Villages Configured
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableVillages.map((vilName) => {
                const masterEntry = LOCAL_STOPPAGE_VILLAGES.find((v) => v.village === vilName);
                const assignedStudents = students.filter(
                  (s) => s.status === 'Active' && isConveyanceEnrolled(s) && (s.conveyVillage === vilName || (!s.conveyVillage && (s.conveyStop || s.address || '').toLowerCase().includes(vilName.toLowerCase())))
                );
                const totalMonthlyFee = assignedStudents.reduce((sum, s) => sum + (s.conveyFee || 0), 0);
                const commonVehicle = assignedStudents[0]?.conveyVehicle || masterEntry?.defaultVehicle || 'School Bus';
                const commonRoute = assignedStudents[0]?.conveyRoute || masterEntry?.defaultRoute || 'Local Route';

                return (
                  <div
                    key={vilName}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {vilName} {masterEntry?.hindiName ? `(${masterEntry.hindiName})` : ''}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {masterEntry?.stoppages ? masterEntry.stoppages.join(', ') : 'Central Stoppage'}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-xs">
                        {assignedStudents.length} Students
                      </span>
                    </div>

                    <div className="text-[11px] space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Route:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">{commonRoute}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Vehicle:</span>
                        <span className="font-semibold text-blue-900">{commonVehicle}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Est. Monthly:</span>
                        <span className="font-bold text-emerald-700">₹{totalMonthlyFee.toLocaleString('en-IN')}/mo</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVillageFilter(vilName);
                        showToast(`Filtered students for ${vilName}`);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-800 hover:text-emerald-900 font-bold text-[11px] transition text-center cursor-pointer"
                    >
                      Filter Table ({assignedStudents.length} Students)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Student & Admission</th>
                <th className="p-3">Class & Sec</th>
                <th className="p-3">Vehicle Assigned</th>
                <th className="p-3">Route & Stoppage</th>
                <th className="p-3 text-right">Convey Fee (₹)</th>
                <th className="p-3 text-center">Due Balance</th>
                <th className="p-3">Parent Contact</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <Bus className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
                    <p className="font-bold text-base text-slate-700">No students match your filter criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search filters or switch tabs</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  const isEnrolled = isConveyanceEnrolled(st);
                  const netDue = getStudentDueAmount(st.id);
                  const matchedVeh = vehicles.find((v) => v.name === st.conveyVehicle);
                  const currentClass = classes.find((c) => c.id === st.classId);

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-blue-50/40 transition ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(st.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Index */}
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>

                      {/* Student Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {st.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{st.fullName}</span>
                              {st.gender === 'Female' && (
                                <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1 rounded">F</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-semibold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded">
                                {st.admissionNo}
                              </span>
                              <span>Roll: {st.rollNo || '-'}</span>
                              <span>• Father: {st.fatherName}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                          {currentClass?.name || st.classId.replace('c-', 'Class ')} - {st.section}
                        </span>
                      </td>

                      {/* Vehicle Assigned */}
                      <td className="p-3">
                        {st.conveyVehicle ? (
                          <div className="flex items-center gap-1.5">
                            <Bus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-bold text-blue-950 text-xs">{st.conveyVehicle}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Route & Stoppage */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-900">{st.conveyStop || st.address || 'Local Stoppage'}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {st.conveyVillage && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200">
                                🏠 {st.conveyVillage}
                              </span>
                            )}
                            {st.conveyRoute && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                {st.conveyRoute}
                              </span>
                            )}
                          </div>

                          {/* Quick 1-click address match button if unassigned or if route doesn't match address */}
                          {st.address && (!st.conveyRoute || !st.conveyVillage) && (
                            <button
                              type="button"
                              onClick={() => handleQuickMatchStudentAddress(st)}
                              className="mt-1 text-[10px] font-extrabold text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                              title={`Auto-Match route and stoppage from address "${st.address}"`}
                            >
                              <Sparkles className="w-3 h-3 text-emerald-700" />
                              <span>⚡ Auto-Match Address</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Monthly Convey Fee */}
                      <td className="p-3 text-right">
                        {st.conveyFee && st.conveyFee > 0 ? (
                          <div>
                            <span className="font-black text-emerald-800 font-mono text-sm">
                              ₹{st.conveyFee.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">/month</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">₹0</span>
                        )}
                      </td>

                      {/* Due Status */}
                      <td className="p-3 text-center">
                        {netDue > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] inline-flex items-center gap-1">
                            <span>₹{netDue.toLocaleString('en-IN')} Due</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Cleared</span>
                          </span>
                        )}
                      </td>

                      {/* Parent Phone */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700">
                            {st.guardianPhone || st.emergencyContact}
                          </span>
                          {(st.guardianPhone || st.emergencyContact) && (
                            <a
                              href={`tel:${st.guardianPhone || st.emergencyContact}`}
                              className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition"
                              title="Call Parent"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp alert button */}
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsAppStudent(st);
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                            title="Send WhatsApp Conveyance Alert"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Edit conveyance button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(st);
                              setIsEditModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                            title="Assign / Edit Conveyance"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{isEnrolled ? 'Edit' : 'Enroll'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Total Showing: <strong className="text-slate-900">{filteredStudents.length}</strong>
            </span>
            <span>•</span>
            <span>
              Total Monthly Demand: <strong className="text-emerald-800">₹{filteredStudents.reduce((s, st) => s + (st.conveyFee || 0), 0).toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPrintVehicleFilter(undefined);
                setPrintRouteFilter(undefined);
                setIsPrintModalOpen(true);
              }}
              className="font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Conveyance Register</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Bulk Assign to {selectedStudentIds.length} Students
              </h3>
              <button onClick={() => setShowBulkAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Vehicle</label>
                <select
                  value={bulkVehicle}
                  onChange={(e) => setBulkVehicle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="">Keep Existing / No Change</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.registrationNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Route</label>
                <select
                  value={bulkRoute}
                  onChange={(e) => setBulkRoute(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="">Keep Existing / No Change</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Stoppage Village (गाँव)</label>
                <select
                  value={bulkVillage}
                  onChange={(e) => setBulkVillage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="">Keep Existing / No Change</option>
                  {availableVillages.map((vil, vIdx) => (
                    <option key={vIdx} value={vil}>
                      {vil}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Stoppage Point</label>
                <input
                  type="text"
                  placeholder="e.g. Village Chowk, Main Gate, Market"
                  value={bulkStop}
                  onChange={(e) => setBulkStop(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Conveyance Fee (₹)</label>
                <input
                  type="number"
                  value={bulkFee}
                  onChange={(e) => setBulkFee(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkAssignment}
                className="px-5 py-2 rounded-xl bg-blue-900 text-white font-bold hover:bg-blue-800 shadow-md"
              >
                Apply to {selectedStudentIds.length} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <ConveyanceStudentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingStudent(null);
          }}
          student={editingStudent}
          vehicles={vehicles}
          routes={routes}
          onSave={handleSaveStudentConveyance}
        />
      )}

      {/* Fleet & Routes Modal */}
      {isFleetModalOpen && (
        <VehicleRouteModal
          isOpen={isFleetModalOpen}
          onClose={() => setIsFleetModalOpen(false)}
          vehicles={vehicles}
          routes={routes}
          onUpdateVehicles={(v) => {
            setVehicles(v);
            saveStoredVehicles(v);
          }}
          onUpdateRoutes={(r) => {
            setRoutes(r);
            saveStoredRoutes(r);
          }}
        />
      )}

      {/* Printable A4 Modal */}
      {isPrintModalOpen && (
        <ConveyancePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          students={
            printVehicleFilter
              ? students.filter((s) => s.status === 'Active' && s.conveyVehicle === printVehicleFilter)
              : filteredStudents
          }
          settings={settings}
          vehicleName={printVehicleFilter}
          routeName={printRouteFilter}
          matchedVehicle={vehicles.find((v) => v.name === printVehicleFilter)}
          getStudentDueAmount={getStudentDueAmount}
        />
      )}

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && whatsAppStudent && (
        <ConveyanceWhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsAppStudent(null);
          }}
          student={whatsAppStudent}
          settings={settings}
          matchedVehicle={vehicles.find((v) => v.name === whatsAppStudent.conveyVehicle)}
          dueAmount={getStudentDueAmount(whatsAppStudent.id)}
        />
      )}

      {/* Address Matcher Modal */}
      {isAddressMatchModalOpen && (
        <AddressMatchModal
          isOpen={isAddressMatchModalOpen}
          onClose={() => setIsAddressMatchModalOpen(false)}
          students={students}
          classes={classes}
          vehicles={vehicles}
          routes={routes}
          onApplyMatches={handleApplyAddressMatches}
        />
      )}
    </div>
  );
};
