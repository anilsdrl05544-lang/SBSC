import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Teacher } from '../../types/school';
import { dispatchSafeMessage } from '../../services/whatsappService';
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface TeacherPasswordModalProps {
  teacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TeacherPasswordModal: React.FC<TeacherPasswordModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { teacherCreateNewPassword, settings } = useSchool();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';

  const handleGenerateStrong = () => {
    const prefixes = ['Teach', 'Vidya', 'Faculty', 'Edu', 'Guru'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(1000 + Math.random() * 9000);
    const pass = `${prefix}@${digits}`;
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNew(true);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword.trim()) {
      setErrorMsg('कृपया अपना वर्तमान पासवर्ड (Current Password) दर्ज करें।');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए (Minimum 4 characters).');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं (Passwords do not match).');
      return;
    }

    const res = teacherCreateNewPassword(teacher.id, currentPassword.trim(), newPassword.trim());
    if (res.success) {
      setSuccessMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleContactAdminWhatsApp = () => {
    const text = `🏫 *${settings.schoolName || 'SBSC Public School'}*
*TEACHER PASSWORD RESET REQUEST*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respected Admin Sir *${adminName}*,
Namaste. I am faculty member:
👤 *Teacher Name:* ${teacher.name}
🆔 *Employee ID:* ${teacher.empId}
🏫 *Assigned Class:* ${teacher.assignedClass || 'Class Teacher'}
📞 *My Contact:* ${teacher.phone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kindly reset my portal password as only Admin is authorized to reset passwords.
Thank you.`;

    const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(url, 'whatsapp', text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                <KeyRound className="w-5 h-5 text-blue-950" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Faculty Self-Service Security
                </span>
                <h3 className="text-lg font-black tracking-tight">Create New Teacher Password</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Faculty Member:</span>
              <strong className="text-amber-300">{teacher.name}</strong>
              <span className="text-slate-400 font-mono">({teacher.empId})</span>
            </div>
            <span className="bg-blue-800/80 text-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-blue-700">
              {teacher.assignedClass || 'Class Teacher'}
            </span>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Status Messages */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-2xl text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-slate-700 font-bold text-xs mb-1.5 flex items-center justify-between">
              <span>1. Current Password (वर्तमान पासवर्ड) *</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Provided by Admin Anil Singh
              </span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 font-bold text-xs">
                2. New Password (नया पासवर्ड बनाएं) *
              </label>
              <button
                type="button"
                onClick={handleGenerateStrong}
                className="text-[11px] font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Generate Strong</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new secret password..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-950 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-slate-700 font-bold text-xs mb-1.5">
              3. Confirm New Password (नया पासवर्ड दोबारा दर्ज करें) *
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-blue-950 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-black text-xs shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Save & Set New Password (नया पासवर्ड सुरक्षित करें)</span>
          </button>

          {/* STRICT ADMIN RESET NOTICE & HELPLINE */}
          <div className="mt-4 pt-4 border-t border-slate-200 bg-amber-50/80 rounded-2xl p-4 border border-amber-300/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-800 shrink-0" />
              <span className="text-xs font-black text-amber-950">
                Forgot Password? Reset Allowed ONLY by Admin
              </span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              यदि आप अपना वर्तमान पासवर्ड भूल गए हैं, तो सुरक्षा नियमों के तहत पासवर्ड <b>केवल स्कूल एडमिन {adminName}</b> द्वारा ही रीसेट किया जा सकता है। सहायता हेतु नीचे संपर्क करें:
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleContactAdminWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Admin ({adminPhone})</span>
              </button>

              <a
                href={`tel:${adminPhone}`}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-bold text-xs transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Admin</span>
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
