import React, { useState } from 'react';
import { X, Bus, Plus, Trash2, Edit2, Check, Phone, Users, MapPin, Clock } from 'lucide-react';
import { ConveyanceVehicle, ConveyanceRoute, saveStoredVehicles, saveStoredRoutes } from '../../data/conveyanceData';

interface VehicleRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: ConveyanceVehicle[];
  routes: ConveyanceRoute[];
  onUpdateVehicles: (v: ConveyanceVehicle[]) => void;
  onUpdateRoutes: (r: ConveyanceRoute[]) => void;
}

export const VehicleRouteModal: React.FC<VehicleRouteModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  routes,
  onUpdateVehicles,
  onUpdateRoutes,
}) => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes'>('vehicles');

  // New Vehicle form state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehName, setVehName] = useState('');
  const [vehRegNo, setVehRegNo] = useState('');
  const [vehType, setVehType] = useState<'Bus' | 'Van' | 'Auto / Magic' | 'Other'>('Bus');
  const [vehCapacity, setVehCapacity] = useState<number>(32);
  const [vehDriver, setVehDriver] = useState('');
  const [vehDriverPhone, setVehDriverPhone] = useState('');
  const [vehConductor, setVehConductor] = useState('');
  const [vehRoute, setVehRoute] = useState('');

  // New Route form state
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeCode, setRouteCode] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [routeVehId, setRouteVehId] = useState('');
  const [routeFee, setRouteFee] = useState<number>(600);
  const [routeStoppagesText, setRouteStoppagesText] = useState('');

  if (!isOpen) return null;

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehName.trim() || !vehRegNo.trim()) return;

    const newVeh: ConveyanceVehicle = {
      id: `veh-${Date.now()}`,
      name: vehName.trim(),
      registrationNo: vehRegNo.trim().toUpperCase(),
      type: vehType,
      capacity: Number(vehCapacity) || 30,
      driverName: vehDriver.trim() || 'Driver Assigned',
      driverPhone: vehDriverPhone.trim() || '+91 94151 00000',
      conductorName: vehConductor.trim() || undefined,
      primaryRoute: vehRoute.trim() || 'Local Area',
      status: 'Active',
    };

    const updated = [...vehicles, newVeh];
    onUpdateVehicles(updated);
    saveStoredVehicles(updated);

    // Reset form
    setVehName('');
    setVehRegNo('');
    setVehDriver('');
    setVehDriverPhone('');
    setVehConductor('');
    setVehRoute('');
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = (id: string) => {
    if (window.confirm('Delete this vehicle from the conveyance fleet?')) {
      const updated = vehicles.filter((v) => v.id !== id);
      onUpdateVehicles(updated);
      saveStoredVehicles(updated);
    }
  };

  const handleAddRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) return;

    // Parse stoppages from comma-separated or newline-separated text
    const parsedStoppages = routeStoppagesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        name,
        pickupTime: `07:${String(15 + idx * 10).padStart(2, '0')} AM`,
        dropTime: `02:${String(30 - idx * 10).padStart(2, '0')} PM`,
      }));

    const newRoute: ConveyanceRoute = {
      id: `route-${Date.now()}`,
      name: routeName.trim(),
      code: routeCode.trim() || `R-${routes.length + 1}`,
      description: routeDesc.trim() || routeName.trim(),
      vehicleId: routeVehId || (vehicles[0]?.id || ''),
      defaultMonthlyFee: Number(routeFee) || 600,
      stoppages: parsedStoppages.length > 0 ? parsedStoppages : [{ name: 'School Campus', pickupTime: '08:00 AM', dropTime: '01:40 PM' }],
    };

    const updated = [...routes, newRoute];
    onUpdateRoutes(updated);
    saveStoredRoutes(updated);

    // Reset form
    setRouteName('');
    setRouteCode('');
    setRouteDesc('');
    setRouteStoppagesText('');
    setShowAddRoute(false);
  };

  const handleDeleteRoute = (id: string) => {
    if (window.confirm('Delete this route?')) {
      const updated = routes.filter((r) => r.id !== id);
      onUpdateRoutes(updated);
      saveStoredRoutes(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Manage Fleet & Transport Routes
              </h3>
              <p className="text-xs text-blue-200">
                विद्यालय वाहन व रूट प्रबंधन • SBSC Public School
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === 'vehicles'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Vehicles & Fleet ({vehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
              activeTab === 'routes'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Routes & Stoppages ({routes.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'vehicles' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Active School Vehicles</h4>
                  <p className="text-xs text-slate-500">School buses, vans, and contracted conveyances</p>
                </div>
                {!showAddVehicle && (
                  <button
                    type="button"
                    onClick={() => setShowAddVehicle(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Vehicle</span>
                  </button>
                )}
              </div>

              {/* Add Vehicle Form */}
              {showAddVehicle && (
                <form onSubmit={handleAddVehicle} className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-blue-950 text-xs uppercase tracking-wider">Add Vehicle to Fleet</h5>
                    <button
                      type="button"
                      onClick={() => setShowAddVehicle(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Vehicle Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. School Bus 03"
                        value={vehName}
                        onChange={(e) => setVehName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Registration No. *</label>
                      <input
                        type="text"
                        placeholder="e.g. UP 55 T 9999"
                        value={vehRegNo}
                        onChange={(e) => setVehRegNo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Type & Capacity</label>
                      <div className="flex gap-2">
                        <select
                          value={vehType}
                          onChange={(e) => setVehType(e.target.value as any)}
                          className="w-2/3 px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                        >
                          <option value="Bus">Bus</option>
                          <option value="Van">Van</option>
                          <option value="Auto / Magic">Auto / Magic</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Seats"
                          value={vehCapacity}
                          onChange={(e) => setVehCapacity(parseInt(e.target.value) || 0)}
                          className="w-1/3 px-2 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ram Kumar"
                        value={vehDriver}
                        onChange={(e) => setVehDriver(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver Mobile *</label>
                      <input
                        type="text"
                        placeholder="+91 94151 00000"
                        value={vehDriverPhone}
                        onChange={(e) => setVehDriverPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Primary Route</label>
                      <input
                        type="text"
                        placeholder="e.g. Amariya - Sangldeep Route"
                        value={vehRoute}
                        onChange={(e) => setVehRoute(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition"
                    >
                      Save Vehicle
                    </button>
                  </div>
                </form>
              )}

              {/* Vehicle Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-blue-300 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{v.name}</h5>
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {v.registrationNo}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {v.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Type / Capacity</span>
                        <span className="font-semibold text-slate-700">{v.type} ({v.capacity} Seats)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Primary Route</span>
                        <span className="font-semibold text-slate-700 truncate block">{v.primaryRoute}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Driver Contact:</span>
                        <span className="font-bold text-slate-800">{v.driverName}</span>
                      </div>
                      <a
                        href={`tel:${v.driverPhone}`}
                        className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-[11px] flex items-center gap-1 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{v.driverPhone}</span>
                      </a>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Routes Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Transport Routes & Stoppages</h4>
                  <p className="text-xs text-slate-500">Pick-up and drop routes with timing schedule</p>
                </div>
                {!showAddRoute && (
                  <button
                    type="button"
                    onClick={() => setShowAddRoute(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Route</span>
                  </button>
                )}
              </div>

              {/* Add Route Form */}
              {showAddRoute && (
                <form onSubmit={handleAddRoute} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-indigo-950 text-xs uppercase tracking-wider">Add New Route</h5>
                    <button
                      type="button"
                      onClick={() => setShowAddRoute(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Route Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dhuswa - Gayghat Route"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Route Code</label>
                      <input
                        type="text"
                        placeholder="e.g. R-05"
                        value={routeCode}
                        onChange={(e) => setRouteCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Default Monthly Fee (₹)</label>
                      <input
                        type="number"
                        placeholder="₹"
                        value={routeFee}
                        onChange={(e) => setRouteFee(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-bold text-slate-700 mb-1">Stoppages (Comma separated or one per line)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Dhuswa Chauraha, Kanya Pathshala, Gayghat Pul, SBSC Campus Gate"
                      value={routeStoppagesText}
                      onChange={(e) => setRouteStoppagesText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition"
                    >
                      Save Route
                    </button>
                  </div>
                </form>
              )}

              {/* Routes List */}
              <div className="space-y-3">
                {routes.map((r) => {
                  const assignedVeh = vehicles.find((v) => v.id === r.vehicleId || v.name === r.vehicleId);
                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-950 font-mono font-bold text-xs">
                            {r.code}
                          </span>
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">{r.name}</h5>
                            <p className="text-xs text-slate-500">{r.description}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-emerald-700 text-sm">₹{r.defaultMonthlyFee}/mo</span>
                          <span className="text-[10px] text-slate-400 block">Default Convey Fee</span>
                        </div>
                      </div>

                      {/* Stoppages Timeline */}
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          Stoppages & Timings ({r.stoppages.length})
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {r.stoppages.map((s, idx) => (
                            <div
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs"
                            >
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              <span className="font-semibold">{s.name}</span>
                              <span className="text-[10px] text-slate-400">({s.pickupTime})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="text-slate-500">
                          Assigned Vehicle: <span className="font-bold text-slate-800">{assignedVeh?.name || 'School Bus'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoute(r.id)}
                          className="text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
