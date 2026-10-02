import React, { useState } from 'react';
import { X, Send, Phone, MessageSquare, ExternalLink, Check, Copy } from 'lucide-react';
import { Student, SchoolSettings } from '../../types/school';
import { ConveyanceVehicle } from '../../data/conveyanceData';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface ConveyanceWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  settings: SchoolSettings;
  matchedVehicle?: ConveyanceVehicle;
  dueAmount: number;
}

export const ConveyanceWhatsAppModal: React.FC<ConveyanceWhatsAppModalProps> = ({
  isOpen,
  onClose,
  student,
  settings,
  matchedVehicle,
  dueAmount,
}) => {
  const [mode, setMode] = useState<'info' | 'due'>('info');
  const [customMsg, setCustomMsg] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (student) {
      const vName = student.conveyVehicle || matchedVehicle?.name || 'School Bus';
      const vReg = matchedVehicle?.registrationNo || 'UP 55 T 1234';
      const dName = student.conveyDriverName || matchedVehicle?.driverName || 'Designated Driver';
      const dPhone = student.conveyDriverPhone || matchedVehicle?.driverPhone || settings.phone;
      const stop = student.conveyStop || student.address || 'Designated Stoppage';
      const fee = student.conveyFee || 600;

      if (mode === 'info') {
        setCustomMsg(
          `*SCHOOL CONVEYANCE / TRANSPORT NOTICE*\n` +
          `Dear Parent of *${student.fullName}* (Class ${student.classId.replace('c-', 'C-')} - ${student.section}, Adm #${student.admissionNo}),\n\n` +
          `Here are your school conveyance details for Session ${settings.academicSession || '2025-26'}:\n` +
          `🚌 *Vehicle:* ${vName} (${vReg})\n` +
          `📍 *Pickup/Drop Stop:* ${stop}\n` +
          `👨‍✈️ *Driver Name:* ${dName}\n` +
          `📞 *Driver Contact:* ${dPhone}\n` +
          `💰 *Conveyance Fee:* ₹${fee.toLocaleString('en-IN')}/month\n\n` +
          `For transport inquiries, please contact our helpline: ${settings.contactNumber || settings.phone}.\n` +
          `- *${settings.schoolName || 'SBSC PUBLIC SCHOOL'}*`
        );
      } else {
        setCustomMsg(
          `*CONVEYANCE FEE DUE REMINDER*\n` +
          `Dear Parent of *${student.fullName}* (Adm #${student.admissionNo}),\n\n` +
          `This is a gentle reminder that conveyance fee of *₹${fee.toLocaleString('en-IN')}/mo* (Total Pending Fee: *₹${dueAmount.toLocaleString('en-IN')}*) is pending for this session.\n\n` +
          `Vehicle: ${vName} (${stop})\n` +
          `Kindly clear the pending conveyance fees at the school fee counter or pay via UPI:\n` +
          `📱 *UPI ID:* ${settings.upiId || '9415188990@upi'}\n\n` +
          `Helpline: ${settings.contactNumber || settings.phone}\n` +
          `- *${settings.schoolName || 'SBSC PUBLIC SCHOOL'}*`
        );
      }
    }
  }, [student, mode, settings, matchedVehicle, dueAmount]);

  if (!isOpen || !student) return null;

  const rawPhone = student.guardianPhone || student.emergencyContact || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(customMsg);
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
    dispatchSafeMessage(url, 'whatsapp', customMsg);
  };

  const handleSendSMS = () => {
    const encoded = encodeURIComponent(customMsg);
    const url = `sms:${cleanPhone}?body=${encoded}`;
    dispatchSafeMessage(url, 'sms', customMsg);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Send Transport Alert on WhatsApp
              </h3>
              <p className="text-xs text-emerald-100">
                To: <span className="font-bold text-white">{student.fullName}</span> ({rawPhone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('info')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              mode === 'info'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Vehicle & Route Notice (वाहन सूचना)
          </button>
          <button
            type="button"
            onClick={() => setMode('due')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              mode === 'due'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Conveyance Fee Due Reminder (शुल्क बकाया)
          </button>
        </div>

        {/* Message Editor */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Message Preview (Editable):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2">
            <span className="font-bold">WhatsApp Direct:</span>
            <span>Opens WhatsApp app directly without refreshing or navigating away from this page.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleSendSMS}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Standard SMS</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 fill-current" />
              <span>Send on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
