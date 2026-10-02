import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Phone,
  Check,
  AlertCircle,
  ShieldCheck,
  Key,
  History,
  Save,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { Student } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import { getStudentPasswordBreakdown } from '../../utils/studentAuthUtils';

interface QuickPhoneEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: (msg: string) => void;
}

export const QuickPhoneEditModal: React.FC<QuickPhoneEditModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const { updateStudent, classes } = useSchool();
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (student && isOpen) {
      setNewPhone(student.guardianPhone || '');
      setError(null);
      setIsSaving(false);
      setSavedSuccess(false);
    }
  }, [student, isOpen]);

  const className = useMemo(() => {
    if (!student) return '';
    const c = classes.find((cl) => cl.id === student.classId);
    return c ? `${c.name} (${c.section})` : '';
  }, [student, classes]);

  const cleanCurrentPhone = useMemo(() => {
    return (student?.guardianPhone || '').replace(/\D/g, '');
  }, [student]);

  const cleanNewPhone = useMemo(() => {
    return newPhone.replace(/\D/g, '');
  }, [newPhone]);

  const isValidPhone = cleanNewPhone.length === 10;
  const isChanged = cleanNewPhone !== cleanCurrentPhone;

  // Calculate new password preview
  const passwordPreview = useMemo(() => {
    if (!student) return null;
    return getStudentPasswordBreakdown(student.fullName, newPhone || student.guardianPhone);
  }, [student, newPhone]);

  if (!isOpen || !student) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanNewPhone) {
      setError('कृपया मोबाइल नंबर दर्ज करें (Please enter mobile number)');
      return;
    }
    if (cleanNewPhone.length !== 10) {
      setError('मोबाइल नंबर ठीक 10 अंकों का होना चाहिए (Mobile number must be exactly 10 digits)');
      return;
    }

    if (!isChanged) {
      setError('आपने वही पुराना नंबर दर्ज किया है। कृपया नया नंबर दर्ज करें।');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const oldPhoneNumber = student.guardianPhone?.trim() || '';
      const updatedPreviousPhones = Array.from(
        new Set([
          ...(student.previousPhones || []),
          ...(oldPhoneNumber ? [oldPhoneNumber] : []),
        ])
      ).filter(Boolean);

      updateStudent(student.id, {
        guardianPhone: cleanNewPhone,
        emergencyContact: cleanNewPhone,
        previousPhones: updatedPreviousPhones,
        oldPhone: oldPhoneNumber,
        updatedAt: new Date().toISOString(),
      });

      setSavedSuccess(true);
      const successMsg = `✓ ${student.fullName} का मोबाइल नंबर बदलकर ${cleanNewPhone} कर दिया गया!`;
      if (onSuccess) onSuccess(successMsg);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      setIsSaving(false);
      setError('नंबर अपडेट करते समय त्रुटि हुई। कृपया पुनः प्रयास करें।');
    }
  };

  return (
    <div
      id="quick-phone-edit-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="quick-phone-edit-modal"
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">मोबाइल नंबर बदलें (Change Phone)</h3>
              <p className="text-[11px] text-blue-200">
                {student.fullName} • {className}
              </p>
            </div>
          </div>
          <button
            id="quick-phone-close-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Current Phone Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  वर्तमान नंबर (Current Mobile)
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {student.guardianPhone || 'कोई नंबर दर्ज नहीं (Not set)'}
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                Adm #{student.admissionNo}
              </span>
            </div>

            {/* Previous phone numbers if any */}
            {student.previousPhones && student.previousPhones.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>पुराने नंबर: {student.previousPhones.join(', ')}</span>
              </div>
            )}
          </div>

          {/* New Phone Input */}
          <div>
            <label
              htmlFor="quick-phone-input"
              className="block text-xs font-bold text-slate-800 mb-1.5"
            >
              नया मोबाइल नंबर (New 10-Digit Mobile Number) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                +91
              </div>
              <input
                id="quick-phone-input"
                type="tel"
                maxLength={10}
                autoFocus
                placeholder="10 अंकों का नया मोबाइल नंबर दर्ज करें"
                value={newPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setNewPhone(val);
                  if (error) setError(null);
                }}
                className={`w-full pl-11 pr-10 py-2.5 bg-white border rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none transition-all ${
                  isValidPhone && isChanged
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {isValidPhone && isChanged ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Phone className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              अंक दर्ज किए गए: {cleanNewPhone.length}/10
            </p>
          </div>

          {/* Password & Login Compatibility Banner */}
          {passwordPreview && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>पोर्टल लॉगिन अपडेट (Portal Login Password)</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                नया पासवर्ड: <code className="bg-emerald-100 font-mono px-1.5 py-0.5 rounded font-bold text-emerald-950">{passwordPreview.defaultPassword}</code> (वैकल्पिक: <code className="bg-emerald-100 font-mono px-1.5 py-0.5 rounded font-bold text-emerald-950">{passwordPreview.namePlusYearPassword}</code>)
              </p>
              <div className="flex items-start gap-1 text-[10px] text-emerald-700 mt-1">
                <Key className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <b>सुरक्षित बैकअप:</b> छात्र नए नंबर अथवा पुराने नंबर दोनों से लॉगिन कर सकेंगे।
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>नंबर सफलतापूर्वक अपडेट हो गया!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              id="quick-phone-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              रद्द करें (Cancel)
            </button>
            <button
              id="quick-phone-save-btn"
              type="submit"
              disabled={!isValidPhone || !isChanged || isSaving}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow flex items-center gap-1.5 transition-all ${
                isValidPhone && isChanged && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-600/30 active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>अपडेट हो रहा है...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>नंबर बदलें (Save Number)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
