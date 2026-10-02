import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Receipt,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SetFeePasswordModal } from './SetFeePasswordModal';

interface FeesLockScreenProps {
  onUnlock: () => void;
  onBack?: () => void;
}

export const FeesLockScreen: React.FC<FeesLockScreenProps> = ({
  onUnlock,
  onBack,
}) => {
  const { verifyFeePassword, currentUser, settings } = useSchool();

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passwordInput.trim()) {
      setErrorMessage('Please enter the Admin Password (कृपया एडमिन पासवर्ड दर्ज करें).');
      return;
    }

    setIsUnlocking(true);

    setTimeout(() => {
      const isValid = verifyFeePassword(passwordInput.trim());
      setIsUnlocking(false);

      if (isValid) {
        setIsSuccess(true);
        try {
          sessionStorage.setItem('sbsc_fees_unlocked', 'true');
        } catch {}

        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setErrorMessage('Incorrect Password! Only Admin can open Fees options (गलत पासवर्ड! केवल एडमिन फीस खोल सकते हैं).');
      }
    }, 200);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-lg shadow-amber-400/20 mb-3 ring-4 ring-amber-400/30">
              <Lock className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Protected • केवल एडमिन</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Fees & Accounts Locked
            </h1>
            <p className="text-slate-300 text-xs mt-1 max-w-sm">
              सुरक्षित फीस प्रबंधन • केवल अधिकृत एडमिन पासवर्ड द्वारा खोला जा सकता है
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Information box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
              <Receipt className="w-4 h-4 text-blue-900" />
              <span>Protected Options & Financial Records:</span>
            </div>
            <ul className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Cash & UPI Collections</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Zero Fee & Bulk Options</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Receipt Cancellation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Student Dues & Arrears</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password verified! Opening Fees Management...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Enter Admin Password (एडमिन पासवर्ड दर्ज करें)</span>
                <span className="text-[10px] text-slate-400 font-mono">Principal / Admin</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-950 pr-12 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isUnlocking || isSuccess}
                className="w-full py-3 rounded-2xl bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>{isUnlocking ? 'Verifying...' : 'Unlock Fees Options (फीस खोलें)'}</span>
              </button>

              <div className="flex items-center justify-between gap-3 pt-1">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSetPasswordOpen(true)}
                  className="text-xs text-blue-900 hover:text-blue-700 font-extrabold px-3 py-2 rounded-xl hover:bg-blue-50 transition cursor-pointer flex items-center gap-1 ml-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Set / Change Password</span>
                </button>
              </div>
            </div>
          </form>

          {/* Hint note */}
          <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Current active session: <strong className="text-slate-600">{settings.schoolName}</strong>
          </div>
        </div>
      </div>

      {/* Set Password Modal */}
      {isSetPasswordOpen && (
        <SetFeePasswordModal
          isOpen={isSetPasswordOpen}
          onClose={() => setIsSetPasswordOpen(false)}
          requireOldPassword={true}
          onSuccess={() => {
            setErrorMessage('');
          }}
        />
      )}
    </div>
  );
};
