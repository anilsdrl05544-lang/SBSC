import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Check,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Send,
  ShieldCheck,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Student } from '../../types/school';
import {
  getStudentEffectivePassword,
  getStudentPasswordBreakdown,
  formatStudentCredentialsMessage,
} from '../../utils/studentAuthUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface SetStudentPasswordModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onPasswordUpdated?: (newPassword: string | undefined) => void;
}

export const SetStudentPasswordModal: React.FC<SetStudentPasswordModalProps> = ({
  student,
  isOpen,
  onClose,
  onPasswordUpdated,
}) => {
  const { updateStudent, classes, settings } = useSchool();
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (student) {
      const effective = getStudentEffectivePassword(student);
      setNewPassword(effective);
      setStatusMessage(null);
      setCopied(false);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const classObj = classes.find((c) => c.id === student.classId);
  const isCustomSet = Boolean(student.password && student.password.trim().length > 0);
  const formulaBreakdown = getStudentPasswordBreakdown(
    student.fullName,
    student.guardianPhone || student.emergencyContact || ''
  );

  const handleSaveCustomPassword = () => {
    const trimmed = newPassword.trim();
    if (!trimmed) {
      setStatusMessage({ text: 'Please enter a valid password or click Reset to Formula.', type: 'error' });
      return;
    }
    updateStudent(student.id, { password: trimmed });
    setStatusMessage({ text: `✓ Password successfully set to "${trimmed}"!`, type: 'success' });
    if (onPasswordUpdated) onPasswordUpdated(trimmed);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleResetToFormula = () => {
    updateStudent(student.id, { password: undefined });
    const standardFormula = formulaBreakdown.password;
    setNewPassword(standardFormula);
    setStatusMessage({
      text: `✓ Reset to standard institutional formula: "${standardFormula}"`,
      type: 'success',
    });
    if (onPasswordUpdated) onPasswordUpdated(undefined);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleCopyCredentials = async () => {
    const activePass = newPassword.trim() || getStudentEffectivePassword(student);
    const text = `Student: ${student.fullName}\nAdmission No / Login ID: ${student.admissionNo}\nPassword: ${activePass}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Student Login Credentials:', text);
    }
  };

  const handleSendWhatsApp = () => {
    const activePass = newPassword.trim() || getStudentEffectivePassword(student);
    const studentWithActivePass = { ...student, password: activePass };
    const schoolName = settings?.schoolName || 'SBSC Senior Secondary School';
    const msg = formatStudentCredentialsMessage(studentWithActivePass, schoolName);
    const cleanPhone = (student.guardianPhone || student.emergencyContact || '').replace(/\D/g, '');
    const waUrl =
      cleanPhone.length >= 10
        ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    try {
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('Failed to open WhatsApp window:', err);
    }
    dispatchSafeMessage(waUrl, 'whatsapp', msg);
    setStatusMessage({ text: '📲 Credentials message opened in WhatsApp!', type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>Set Student Password</span>
                <span className="text-[10px] bg-white/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  छात्र पासवर्ड सेट
                </span>
              </h3>
              <p className="text-xs text-blue-200/90">Configure student and parent portal login credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Student Dossier Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                {student.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate uppercase">{student.fullName}</h4>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded shrink-0">
                    {classObj?.name || student.classId}-{student.section}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Roll #{student.rollNo} • Adm: <strong className="font-mono text-slate-700">{student.admissionNo}</strong> • Ph: <span className="font-mono">{student.guardianPhone || 'N/A'}</span>
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase shrink-0 border ${
                isCustomSet
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {isCustomSet ? 'Custom Set' : 'Default Formula'}
            </span>
          </div>

          {/* Password Input Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-900" />
                <span>Portal Password (लॉगिन पासवर्ड)</span>
              </label>
              <button
                type="button"
                onClick={() => setNewPassword(formulaBreakdown.password)}
                className="text-[11px] text-blue-900 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                title="Fill with standard institutional formula"
              >
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Apply Standard Formula</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password (e.g. AMIT9876 or student123)..."
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-blue-900 focus:bg-white focus:border-blue-900 transition"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="p-1 text-slate-400 hover:text-blue-900 rounded-lg transition cursor-pointer"
                  title="Copy password to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Students and parents can log in using either their Admission Number or Registered Mobile with this password.
            </p>
          </div>

          {/* Institutional Formula Explanation */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <span>Standard Institutional Formula:</span>
              <span className="font-mono bg-blue-100 text-blue-950 px-1.5 py-0.2 rounded font-black text-[11px]">
                {formulaBreakdown.password}
              </span>
            </div>
            <p className="text-[11px] text-blue-800">
              First 4 letters of name in CAPITAL (<strong>{formulaBreakdown.namePart}</strong>) + Last 4 digits of phone (<strong>{formulaBreakdown.phonePart}</strong>).
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveCustomPassword}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-extrabold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Save Password (पासवर्ड सेव करें)</span>
            </button>

            {isCustomSet && (
              <button
                type="button"
                onClick={handleResetToFormula}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Reset to default automatic formula"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Formula</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              title="Share login password with parent via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
