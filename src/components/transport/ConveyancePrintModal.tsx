import React from 'react';
import { X, Printer, Bus, CheckCircle2 } from 'lucide-react';
import { Student, SchoolSettings } from '../../types/school';
import { ConveyanceVehicle } from '../../data/conveyanceData';

interface ConveyancePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  settings: SchoolSettings;
  vehicleName?: string;
  routeName?: string;
  matchedVehicle?: ConveyanceVehicle;
  getStudentDueAmount: (id: string) => number;
}

export const ConveyancePrintModal: React.FC<ConveyancePrintModalProps> = ({
  isOpen,
  onClose,
  students,
  settings,
  vehicleName,
  routeName,
  matchedVehicle,
  getStudentDueAmount,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalMonthlyDemand = students.reduce((sum, s) => sum + (s.conveyFee || 0), 0);
  const totalAnnualDemand = totalMonthlyDemand * 12;
  const totalOutstandingDue = students.reduce((sum, s) => sum + getStudentDueAmount(s.id), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Container - hide during print via standard print styles */}
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Action Header - hidden on print */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Official Conveyance Register (A4 Print Preview)
              </h3>
              <p className="text-[11px] text-slate-300">
                Ready for office, bus driver, and conductor registers ({students.length} Students)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans bg-white print:p-0 print:m-0 text-slate-900" id="printable-conveyance-sheet">
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.schoolName}
                  className="w-14 h-14 object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight uppercase font-serif">
                  {settings.schoolName || 'SBSC PUBLIC SCHOOL'}
                </h1>
                <p className="text-xs text-slate-700 font-medium">
                  {settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar, Uttar Pradesh'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Affiliation No: {settings.affiliationNo || 'CBSE-UP-272025'} • Helpline: {settings.contactNumber || settings.phone}
                </p>
              </div>
            </div>

            <div className="mt-2 inline-block bg-slate-100 border border-slate-300 px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase text-slate-900">
              OFFICIAL CONVEYANCE & TRANSPORT REGISTER (वाहन व छात्र सूची)
            </div>
          </div>

          {/* Vehicle / Route Metadata Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Vehicle Assigned</span>
              <span className="font-bold text-slate-900">{vehicleName || matchedVehicle?.name || 'All Fleet Vehicles'}</span>
              {matchedVehicle?.registrationNo && (
                <span className="text-[10px] font-mono text-slate-600 block">({matchedVehicle.registrationNo})</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Driver / Phone</span>
              <span className="font-bold text-slate-900">{matchedVehicle?.driverName || 'Designated Driver'}</span>
              <span className="text-[10px] text-slate-600 block">{matchedVehicle?.driverPhone || settings.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Route / Belt</span>
              <span className="font-bold text-slate-900">{routeName || matchedVehicle?.primaryRoute || 'All School Routes'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Session & Date</span>
              <span className="font-bold text-slate-900">{settings.academicSession || '2025-2026'}</span>
              <span className="text-[10px] text-slate-500 block">Date: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold">
                  <th className="p-1.5 border border-slate-300 text-center w-8">#</th>
                  <th className="p-1.5 border border-slate-300 w-16">Adm No</th>
                  <th className="p-1.5 border border-slate-300 w-12 text-center">Roll</th>
                  <th className="p-1.5 border border-slate-300">Student Name</th>
                  <th className="p-1.5 border border-slate-300">Father Name</th>
                  <th className="p-1.5 border border-slate-300 w-16 text-center">Class-Sec</th>
                  <th className="p-1.5 border border-slate-300">Stoppage & Village (स्टॉपेज व ग्राम)</th>
                  <th className="p-1.5 border border-slate-300 w-20 text-right">Fee (₹/Mo)</th>
                  <th className="p-1.5 border border-slate-300 w-24">Parent Mobile</th>
                  <th className="p-1.5 border border-slate-300 w-24 text-center">Parent Sign</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => (
                  <tr key={st.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300 font-mono font-semibold text-slate-800">{st.admissionNo}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-700">{st.rollNo || '-'}</td>
                    <td className="p-1.5 border border-slate-300 font-bold text-slate-900">{st.fullName}</td>
                    <td className="p-1.5 border border-slate-300 text-slate-700">{st.fatherName}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-semibold text-slate-800">
                      {st.classId.replace('c-', 'C-')} {st.section}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-slate-800">
                      <div className="font-semibold text-slate-900">{st.conveyStop || 'School Gate'}</div>
                      {st.conveyVillage && (
                        <div className="text-[10px] font-bold text-emerald-700">ग्राम: {st.conveyVillage}</div>
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-emerald-800">
                      ₹{(st.conveyFee || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-mono text-[10px] text-slate-700">
                      {st.guardianPhone || st.emergencyContact}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                  <td colSpan={7} className="p-2 border border-slate-300 text-right uppercase">
                    Total Students: <span className="font-extrabold text-blue-900">{students.length}</span> | Monthly Total:
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono text-emerald-900 font-black">
                    ₹{totalMonthlyDemand.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2} className="p-2 border border-slate-300 text-xs text-slate-600">
                    Annual: ₹{totalAnnualDemand.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Signature Blocks */}
          <div className="mt-10 pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-800">
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1 mx-auto"></div>
              <p className="font-bold">Driver / Conductor Signature</p>
              <p className="text-[10px] text-slate-500">वाहन चालक / परिचालक हस्ताक्षर</p>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1 mx-auto"></div>
              <p className="font-bold">Transport In-charge</p>
              <p className="text-[10px] text-slate-500">वाहन प्रभारी / कार्यालय सहायक</p>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1 mx-auto"></div>
              <p className="font-bold">Principal / Director Signature</p>
              <p className="text-[10px] text-slate-500">प्रधानाचार्य / संस्था प्रधान</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
