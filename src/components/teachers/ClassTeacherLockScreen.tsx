import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { ClassInfo, Teacher } from '../../types/school';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  LogIn,
  School,
  ArrowRight,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { dispatchSafeMessage } from '../../services/whatsappService';

interface ClassTeacherLockScreenProps {
  targetClass: ClassInfo;
  assignedTeacher?: Teacher;
  onSuccessUnlock: () => void;
  onOpenAdminLogin?: () => void;
}

export const ClassTeacherLockScreen: React.FC<ClassTeacherLockScreenProps> = ({
  targetClass,
  assignedTeacher,
  onSuccessUnlock,
  onOpenAdminLogin,
}) => {
  const { settings, verifyClassTeacherPassword, loginWithCredentials } = useSchool();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const teacherName = assignedTeacher?.name || 'Assigned Class Teacher';
  const teacherDesignation = assignedTeacher?.designation || 'Class In-Charge';
  const teacherEmpId = assignedTeacher?.empId || '';

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(`Please enter the teacher password provided by Admin ${adminName}.`);
      return;
    }

    setError(null);
    setLoading(true);

    setTimeout(() => {
      // 1. Try class teacher password verification
      const result = verifyClassTeacherPassword(targetClass.id, password.trim());
      setLoading(false);

      if (result.success) {
        onSuccessUnlock();
      } else {
        // Also check if admin password was entered (allowing admin to unlock class view)
        const adminCheck = loginWithCredentials('admin', password.trim());
        if (adminCheck.success) {
          onSuccessUnlock();
          return;
        }

        setError(
          result.message ||
            `Incorrect password! Please ask School Administrator ${adminName} (Mob: ${adminPhone}) for your teacher password.`
        );
      }
    }, 250);
  };

  const handleContactAdmin = () => {
    const text = `Namaste ${adminName} Sir,\nI am trying to access the Class Teacher Portal for *${targetClass.name}* at *${settings.schoolName || 'SBSC Public School'}*.\nPlease provide my teacher login password.\nTeacher Name: ${teacherName}\nEmployee ID: ${teacherEmpId}`;
    const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`;
    const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(waUrl, 'whatsapp');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.schoolName}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap className="w-10 h-10 text-blue-900" />
            )}
          </div>
          <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-white uppercase">
            {settings.schoolName || 'SBSC Public School'}
          </h2>
          <p className="text-[11px] text-blue-200 mt-0.5">
            {settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>Class Teacher Portal • सुरक्षित कक्षा लॉगिन</span>
          </div>
        </div>

        {/* Selected Class Highlight Box */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/80 border-2 border-blue-200 rounded-2xl p-4 text-center space-y-1 relative">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-900 bg-blue-200/80 px-2.5 py-0.5 rounded-full">
              Selected Target Class (निर्धारित कक्षा)
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {targetClass.name}
            </h3>
            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-center gap-2 text-xs text-slate-700">
              <GraduationCap className="w-4 h-4 text-blue-800" />
              <span>
                Class In-Charge:{' '}
                <strong className="text-blue-950 font-bold">{teacherName}</strong>
                {teacherEmpId ? ` (${teacherEmpId})` : ''}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-600 leading-relaxed">
              इस लिंक से केवल <strong>{targetClass.name}</strong> का विवरण खुलेगा। कृपया आगे बढ़ने के लिए स्कूल एडमिनिस्ट्रेटर <strong>{adminName}</strong> द्वारा दिया गया पासवर्ड दर्ज करें।
            </p>
          </div>

          {/* Admin Password Provider Info Card */}
          <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-3.5 space-y-2 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Password Provided by Admin (एडमिन द्वारा प्रदत्त)</span>
              </div>
              <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                Admin: {adminName}
              </span>
            </div>

            <p className="text-[11px] text-slate-700 leading-relaxed">
              टीचर अपनी कक्षा का पासवर्ड स्कूल एडमिन <strong>{adminName}</strong> से प्राप्त करें। शिक्षक पोर्टल में जाकर नया पासवर्ड बना सकते हैं, लेकिन <strong>पासवर्ड रीसेट करने का अधिकार केवल एडमिन {adminName}</strong> के पास है। सहायता हेतु संपर्क करें:
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-200/80 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Phone className="w-3.5 h-3.5 text-blue-900" />
                <span>Admin Helpline:</span>
                <a href={`tel:${adminPhone}`} className="text-blue-950 font-mono font-extrabold hover:underline">
                  {adminPhone}
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleContactAdmin}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <a
                  href={`tel:${adminPhone}`}
                  className="px-2.5 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Admin</span>
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Teacher Login Password (टीचर पासवर्ड)</span>
                <span className="text-[10px] text-amber-700 font-bold">Admin Provided</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                  placeholder="Enter Password (पासवर्ड दर्ज करें)"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-blue-700 focus:bg-white rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <span className="font-bold block">{error}</span>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleContactAdmin}
                      className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Admin ({adminPhone})</span>
                    </button>
                    <a
                      href={`tel:${adminPhone}`}
                      className="text-blue-900 hover:text-blue-950 font-bold flex items-center gap-1 underline"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Admin</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-75"
            >
              {loading ? (
                <span>Verifying Password...</span>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-300" />
                  <span>Open {targetClass.name} (कक्षा खोलें)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Scope Disclaimer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Strict Class Privacy (कक्षा डेटा सुरक्षा)</span>
            </div>
            <p>
              लॉगिन होने पर आप केवल <strong>{targetClass.name}</strong> के छात्रों की हाजिरी, फीस रिपोर्ट, होमवर्क और परीक्षा नंबर देख एवं भर सकेंगे। अन्य कक्षाओं का डेटा सुरक्षित और छुपा रहेगा।
            </p>
          </div>

          {/* Contact Admin / Help */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={handleContactAdmin}
              className="flex items-center gap-1.5 hover:text-blue-900 font-bold transition cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin: <strong>{adminName}</strong> ({adminPhone})</span>
            </button>

            {onOpenAdminLogin && (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="hover:text-blue-900 font-bold text-[11px] underline cursor-pointer"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
