import React, { useState, useMemo } from 'react';
import { X, Bus, Check, DollarSign, User, Phone, MapPin, AlertCircle, Home, Sparkles, Compass } from 'lucide-react';
import { Student } from '../../types/school';
import { ConveyanceVehicle, ConveyanceRoute, LOCAL_STOPPAGE_VILLAGES, matchAddressToConveyance, AddressConveyanceMatch } from '../../data/conveyanceData';
import { useSchool } from '../../context/SchoolContext';

interface ConveyanceStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  vehicles: ConveyanceVehicle[];
  routes: ConveyanceRoute[];
  onSave: (updatedData: {
    conveyFee: number;
    conveyVehicle: string;
    conveyRoute: string;
    conveyStop: string;
    conveyVillage: string;
    conveyDriverName: string;
    conveyDriverPhone: string;
  }) => void;
}

export const ConveyanceStudentModal: React.FC<ConveyanceStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  vehicles,
  routes,
  onSave,
}) => {
  const { classes } = useSchool();

  const [conveyFee, setConveyFee] = useState<number>(student?.conveyFee || 600);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(student?.conveyVehicle || (vehicles[0]?.name || ''));
  const [selectedRoute, setSelectedRoute] = useState<string>(student?.conveyRoute || (routes[0]?.name || ''));
  const [stoppage, setStoppage] = useState<string>(student?.conveyStop || student?.address || '');
  const [village, setVillage] = useState<string>(student?.conveyVillage || 'Riwa Nankar');
  const [driverName, setDriverName] = useState<string>(student?.conveyDriverName || (vehicles[0]?.driverName || ''));
  const [driverPhone, setDriverPhone] = useState<string>(student?.conveyDriverPhone || (vehicles[0]?.driverPhone || ''));

  // Update fields when student changes
  React.useEffect(() => {
    if (student) {
      setConveyFee(student.conveyFee || 600);
      setSelectedVehicle(student.conveyVehicle || (vehicles[0]?.name || 'School Van 02 (Eeco)'));
      setSelectedRoute(student.conveyRoute || (routes[0]?.name || 'Riwa Nankar Belt'));
      setStoppage(student.conveyStop || student.address || '');
      setVillage(student.conveyVillage || 'Riwa Nankar');
      setDriverName(student.conveyDriverName || (vehicles[0]?.driverName || ''));
      setDriverPhone(student.conveyDriverPhone || (vehicles[0]?.driverPhone || ''));
    }
  }, [student, vehicles, routes]);

  // Compute address match recommendation
  const addressMatch = useMemo<AddressConveyanceMatch | null>(() => {
    if (!student?.address) return null;
    return matchAddressToConveyance(student.address, student.conveyFee);
  }, [student?.address, student?.conveyFee]);

  const handleApplyAddressMatch = () => {
    if (!addressMatch) return;
    setVillage(addressMatch.village);
    setSelectedRoute(addressMatch.route);
    setStoppage(addressMatch.stoppage);
    setSelectedVehicle(addressMatch.vehicle);
    setDriverName(addressMatch.driverName);
    setDriverPhone(addressMatch.driverPhone);
    setConveyFee(addressMatch.monthlyFee);
  };

  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);

  // When vehicle changes, auto-fill driver and default route
  const handleVehicleChange = (vehName: string) => {
    setSelectedVehicle(vehName);
    const matchedVeh = vehicles.find((v) => v.name === vehName);
    if (matchedVeh) {
      setDriverName(matchedVeh.driverName);
      setDriverPhone(matchedVeh.driverPhone);
      const matchedRoute = routes.find((r) => r.vehicleId === matchedVeh.id);
      if (matchedRoute) {
        setSelectedRoute(matchedRoute.name);
        if (!student.conveyFee) {
          setConveyFee(matchedRoute.defaultMonthlyFee);
        }
      }
    }
  };

  // When route changes, pick suggested stoppages
  const handleRouteChange = (routeName: string) => {
    setSelectedRoute(routeName);
    const matchedRoute = routes.find((r) => r.name === routeName);
    if (matchedRoute) {
      if (matchedRoute.defaultMonthlyFee && (!student.conveyFee || student.conveyFee === 0)) {
        setConveyFee(matchedRoute.defaultMonthlyFee);
      }
      const matchedVeh = vehicles.find((v) => v.id === matchedRoute.vehicleId);
      if (matchedVeh) {
        setSelectedVehicle(matchedVeh.name);
        setDriverName(matchedVeh.driverName);
        setDriverPhone(matchedVeh.driverPhone);
      }
    }
  };

  // Quick village selection helper
  const handleSelectVillage = (selectedVillageName: string) => {
    setVillage(selectedVillageName);
    const villageMaster = LOCAL_STOPPAGE_VILLAGES.find((v) => v.village === selectedVillageName);
    if (villageMaster) {
      if (!stoppage || stoppage === 'Local School Stop' || stoppage === 'School Gate') {
        setStoppage(villageMaster.stoppages[0] || `${selectedVillageName} Chauraha`);
      }
      if (villageMaster.defaultRoute) {
        setSelectedRoute(villageMaster.defaultRoute);
      }
      if (villageMaster.defaultVehicle) {
        setSelectedVehicle(villageMaster.defaultVehicle);
      }
      if (!student.conveyFee || student.conveyFee === 0) {
        setConveyFee(villageMaster.defaultFee);
      }
    }
  };

  const matchedRouteObj = routes.find((r) => r.name === selectedRoute);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      conveyFee: Number(conveyFee) || 0,
      conveyVehicle: selectedVehicle,
      conveyRoute: selectedRoute,
      conveyStop: stoppage.trim() || student.address || 'School Gate',
      conveyVillage: village.trim() || 'Riwa Nankar',
      conveyDriverName: driverName,
      conveyDriverPhone: driverPhone,
    });
    onClose();
  };

  const handleRemoveFromConveyance = () => {
    if (window.confirm(`Are you sure you want to remove ${student.fullName} from School Conveyance? This will set Conveyance Fee to ₹0.`)) {
      onSave({
        conveyFee: 0,
        conveyVehicle: '',
        conveyRoute: '',
        conveyStop: '',
        conveyVillage: '',
        conveyDriverName: '',
        conveyDriverPhone: '',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Assign / Edit Conveyance Details
              </h3>
              <p className="text-xs text-blue-200">
                वाहन एवं रूट विवरण: <span className="text-amber-300 font-semibold">{student.fullName}</span> ({currentClass?.name || 'Class'} - {student.section})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Snapshot Banner */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Adm No:</span>
            <span className="font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
              {student.admissionNo}
            </span>
            <span className="font-bold text-slate-700 ml-2">Roll No:</span>
            <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
              {student.rollNo || 'N/A'}
            </span>
          </div>
          <div className="text-slate-600">
            Father: <span className="font-bold text-slate-800">{student.fatherName}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Address Matching Smart Recommendation */}
          {student.address && addressMatch && (
            <div className={`p-4 rounded-2xl border transition-all ${
              addressMatch.matched 
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-emerald-300 shadow-xs' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Address Match Detection (पते से मिलान):</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      addressMatch.confidence === 'EXACT' 
                        ? 'bg-emerald-200 text-emerald-900' 
                        : addressMatch.confidence === 'HIGH'
                        ? 'bg-blue-200 text-blue-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      {addressMatch.confidenceScore}% {addressMatch.confidence} Match
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium italic">
                    "{student.address}"
                  </p>

                  <div className="text-xs text-slate-800 pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Village: <strong className="text-emerald-900">{addressMatch.village}</strong> ({addressMatch.hindiVillage})
                    </span>
                    <span>•</span>
                    <span>
                      Route: <strong className="text-indigo-900">{addressMatch.route}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Stoppage: <strong className="text-slate-900">{addressMatch.stoppage}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyAddressMatch}
                  className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition hover:scale-[1.02] cursor-pointer"
                  title="Auto-fill Village, Route, Stoppage & Vehicle from matched address"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Auto-Fill from Address</span>
                </button>
              </div>
            </div>
          )}

          {/* Vehicle Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select School Vehicle (वाहन चुनें) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} ({v.registrationNo}) • {v.type} ({v.capacity} Seats) - Driver: {v.driverName}
                </option>
              ))}
              <option value="Custom / Private Transport">Other / Custom Transport</option>
            </select>
          </div>

          {/* Route Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Route (रूट चुनें) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => handleRouteChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              {routes.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.code}) • Default: ₹{r.defaultMonthlyFee}/mo
                </option>
              ))}
              <option value="Local Route">Local Route</option>
            </select>
          </div>

          {/* Stoppage Village Name */}
          <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Stoppage Village Name (स्टॉपेज ग्राम / गाँव का नाम) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                गाँव / क्षेत्र
              </span>
            </div>

            <div className="relative">
              <Home className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
              <input
                type="text"
                list="local-villages-list"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Riwa Nankar, Amariya, Sangldeep, Patkhauli, Itauwa, Dhuswa, Gayghat"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
              <datalist id="local-villages-list">
                {LOCAL_STOPPAGE_VILLAGES.map((v, i) => (
                  <option key={i} value={v.village}>
                    {v.hindiName} ({v.defaultRoute})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Quick Village Selection Buttons */}
            <div>
              <p className="text-[11px] font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                <span>Select from Nearby Stoppage Villages (निकटवर्ती ग्राम चुनें):</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LOCAL_STOPPAGE_VILLAGES.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectVillage(v.village)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium cursor-pointer ${
                      village === v.village
                        ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                        : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {v.village} ({v.hindiName})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stoppage Landmark / Pickup Point */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Stoppage Landmark / Pickup Point (स्टॉपेज स्थल / लैंडमार्क) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={stoppage}
                onChange={(e) => setStoppage(e.target.value)}
                placeholder="e.g. Bairwa Chauraha, Thana Chowk, Mandi Mod"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Quick Stoppage Chips from selected route */}
            {matchedRouteObj && matchedRouteObj.stoppages.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Suggested Stoppages on this route:</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedRouteObj.stoppages.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setStoppage(s.name);
                        if (s.village) setVillage(s.village);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        stoppage === s.name
                          ? 'bg-blue-900 text-white border-blue-900 font-bold'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {s.name} {s.village ? `[ग्राम: ${s.village}]` : ''} ({s.pickupTime})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Conveyance Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Conveyance Fee (मासिक वाहन शुल्क ₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={conveyFee}
                  onChange={(e) => setConveyFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Annual Total: <span className="font-bold text-slate-800">₹{((conveyFee || 0) * 12).toLocaleString('en-IN')}</span> / year
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Driver Contact (चालक फ़ोन)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 94151 00000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Driver: <span className="font-semibold text-slate-700">{driverName || 'Not specified'}</span>
              </p>
            </div>
          </div>

          {/* Quick preset fee chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Fee Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              {[400, 500, 600, 800, 1000, 1200, 1500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setConveyFee(amt)}
                  className={`text-xs px-3 py-1 rounded-lg border font-bold transition ${
                    conveyFee === amt
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ₹{amt}/mo
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {student.conveyFee && student.conveyFee > 0 ? (
              <button
                type="button"
                onClick={handleRemoveFromConveyance}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition"
              >
                Remove from Conveyance
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Save Conveyance Details</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
