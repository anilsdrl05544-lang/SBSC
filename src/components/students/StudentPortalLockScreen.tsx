import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  User,
  CheckCircle2,
  Share2,
  Send,
  Copy,
  Check,
  Palmtree,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Student, Holiday } from '../../types/school';
import {
  formatUniversalWhatsAppGroupMessage,
} from '../../utils/studentAuthUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';

interface StudentPortalLockScreenProps {
  onSuccessLogin?: (student: Student) => void;
  onBackToDashboard?: () => void;
  initialIdentifier?: string;
  onOpenAdminLogin?: () => void;
}

export const StudentPortalLockScreen: React.FC<StudentPortalLockScreenProps> = ({
  onSuccessLogin,
  onBackToDashboard,
  initialIdentifier = '',
  onOpenAdminLogin,
}) => {
  const { loginAsStudent, settings, currentUser, holidays, students, classes } = useSchool();

  const [identifier, setIdentifier] = useState(() => {
    if (initialIdentifier) return initialIdentifier;
    try {
      const savedAdm = sessionStorage.getItem('sbsc_target_adm');
      if (savedAdm) return savedAdm;
      const search = new URLSearchParams(window.location.search);
      const q = search.get('student') || search.get('adm') || search.get('studentId');
      if (q) return q.trim();
    } catch {}
    return '';
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedStudentForLogin, setSelectedStudentForLogin] = useState<Student | null>(null);

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Upcoming public school holidays
  const upcomingPublicHolidays = useMemo(() => {
    return [...(holidays || [])]
      .filter((h) => (h.endDate || h.date) >= todayDateStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, todayDateStr]);

  // Compute public universal portal URL
  const getUniversalPortalUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin.trim().replace(/\/+$/, '');
    const base = origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
    return `${base}/?portal=student#student-portal`;
  };

  // Find all matched students matching the entered identifier
  const matchedStudentsList = useMemo(() => {
    if (!identifier.trim() || !students || students.length === 0) return [];
    const clean = identifier.trim().toLowerCase();
    const cleanNoPunct = clean.replace(/[^a-z0-9]/g, '');
    const digits = clean.replace(/\D/g, '');

    return students.filter((s) => {
      if (s.id.toLowerCase() === clean || `s-${clean}` === s.id.toLowerCase()) return true;
      const adm = (s.admissionNo || '').trim().toLowerCase();
      const admClean = adm.replace(/[^a-z0-9]/g, '');
      const admDigits = adm.replace(/\D/g, '');
      const roll = (s.rollNo?.toString() || '').trim().toLowerCase();
      const name = (s.fullName || '').trim().toLowerCase();
      const aadhaar = (s.aadhaarNo || '').replace(/\D/g, '');

      if (
        adm === clean ||
        admClean === cleanNoPunct ||
        (cleanNoPunct.length >= 1 && (admClean.endsWith(cleanNoPunct) || cleanNoPunct.endsWith(admClean))) ||
        (digits.length >= 1 && admDigits.length >= 1 && (admDigits.endsWith(digits) || digits.endsWith(admDigits)))
      ) {
        return true;
      }
      if (roll === clean || (digits.length > 0 && roll === digits)) return true;
      if (digits.length >= 4 && aadhaar && (aadhaar === digits || aadhaar.endsWith(digits))) return true;
      if (name === clean || name.includes(clean)) return true;
      if (clean.length >= 3) {
        const tokens = clean.split(/[\s,._-]+/).filter((w) => w.length >= 3);
        if (tokens.some((t) => name.includes(t))) return true;
      }

      // Check phone numbers
      const phoneList = [
        s.guardianPhone,
        s.emergencyContact,
        s.oldPhone,
        ...(s.previousPhones || []),
        (s as any).phone,
        (s as any).mobile,
      ].filter(Boolean) as string[];

      for (const p of phoneList) {
        const pDigits = p.replace(/\D/g, '');
        if (digits.length >= 7) {
          if (pDigits.slice(-10) === digits.slice(-10) || pDigits.includes(digits) || digits.includes(pDigits)) {
            return true;
          }
        } else if (digits.length >= 4 && pDigits.endsWith(digits)) {
          return true;
        }
      }
      return false;
    });
  }, [identifier, students]);

  // Active student for credentials card
  const activeMatchedStudent = useMemo(() => {
    if (selectedStudentForLogin) {
      const stillExists = matchedStudentsList.find((s) => s.id === selectedStudentForLogin.id);
      if (stillExists) return stillExists;
    }
    if (matchedStudentsList.length === 1) return matchedStudentsList[0];
    return null;
  }, [selectedStudentForLogin, matchedStudentsList]);

  const handleShareToWhatsAppGroup = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const portalUrl = getUniversalPortalUrl();
    const msg = formatUniversalWhatsAppGroupMessage(settings.schoolName || 'SBSC PUBLIC SCHOOL', portalUrl);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg).catch(() => {});
      }
    } catch {}

    dispatchSafeMessage(waUrl, 'whatsapp', msg);
  };

  const handleCopyUniversalLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const portalUrl = getUniversalPortalUrl();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(portalUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        window.prompt('Copy Universal Student Portal Link:', portalUrl);
      }
    } catch {
      window.prompt('Copy Universal Student Portal Link:', portalUrl);
    }
  };

  // Sync if initialIdentifier changes
  useEffect(() => {
    if (initialIdentifier && !identifier) {
      setIdentifier(initialIdentifier);
    }
  }, [initialIdentifier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setError('कृपया अपना प्रवेश क्रमांक (Admission No.) अथवा पंजीकृत मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (!cleanPass) {
      setError('कृपया अपना पासवर्ड (Password) दर्ज करें।');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = loginAsStudent(cleanId, cleanPass);
      setLoading(false);

      if (res.success && res.student) {
        try {
          sessionStorage.removeItem('sbsc_target_adm');
        } catch {}
        if (onSuccessLogin) {
          onSuccessLogin(res.student);
        }
      } else {
        setError(
          res.message ||
            'गलत प्रवेश क्रमांक अथवा पासवर्ड! कृपया सही विवरण दर्ज करें अथवा विद्यालय कार्यालय से संपर्क करें।'
        );
      }
    }, 250);
  };

  const schoolName = settings.schoolName || 'SBSC Public School';
  const tagline = settings.schoolTagline || 'विद्या ददाति विनयं | Exceeding Excellence in Education';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 my-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-6">
        <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-emerald-950 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Subtle Background Elements */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* School Badge Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-lg">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={schoolName}
                className="w-12 h-12 rounded-xl object-contain"
              />
            ) : (
              <GraduationCap className="w-9 h-9 text-emerald-300" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {schoolName}
          </h2>
          <p className="text-xs text-blue-200/90 font-medium mt-0.5">
            {tagline}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-black uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-emerald-300" />
            <span>Student & Parent Portal (सुरक्षित विद्यार्थी पोर्टल)</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Strict Privacy Protection Guarantee Notice */}
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-start gap-3 text-emerald-950">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                <span>गोपनीयता सुरक्षा गारंटी (Strict Data Privacy)</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md font-bold">
                  100% Secure
                </span>
              </h4>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                विद्यार्थी के व्यक्तिगत अभिलेख, शुल्क विवरण, परीक्षा परिणाम व उपस्थिति की पूर्ण गोपनीयता सुनिश्चित करने हेतु केवल छात्र द्वारा सही पासवर्ड दर्ज करने पर ही व्यक्तिगत पोर्टल खुलेगा।
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {error}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Admission No. / Mobile No. (प्रवेश क्रमांक या मोबाइल नंबर) *</span>
                <span className="text-[10px] text-slate-400 font-normal">आवश्यक</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="उदा. 9999999999 अथवा SBSC-001"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-700 focus:bg-white transition"
                  autoFocus={!identifier}
                />
                {identifier && (
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('');
                      setSelectedStudentForLogin(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition text-xs font-bold"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Multiple Siblings Registered on the same Mobile Number */}
            {matchedStudentsList.length > 1 && (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span>👨‍👩‍👧‍👦 {matchedStudentsList.length} विद्यार्थी पंजीकृत हैं (Select Student):</span>
                  </span>
                  <span className="text-[10px] font-bold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                    {matchedStudentsList.length} Students
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  इस नंबर से जुड़े सभी बच्चे नीचे दिए गए हैं। जिस छात्र का पोर्टल खोलना है उस पर क्लिक करें:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {matchedStudentsList.map((st) => {
                    const stClass = classes.find((c) => c.id === st.classId);
                    const isSelected = activeMatchedStudent?.id === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentForLogin(st);
                          setIdentifier(st.admissionNo);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-950 ring-2 ring-blue-500/50'
                            : 'bg-white hover:bg-indigo-100/60 text-slate-800 border-indigo-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs">{st.fullName}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {stClass?.name || 'Class'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] opacity-90 mt-0.5">
                          <span>प्रवेश: {st.admissionNo}</span>
                          <span>Roll #{st.rollNo || 'N/A'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single or Selected Student Verified Details */}
            {activeMatchedStudent && (
              <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-2 animate-in fade-in shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-900 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                      {activeMatchedStudent.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">{activeMatchedStudent.fullName}</span>
                        <span className="text-[10px] font-bold bg-blue-200 text-blue-950 px-2 py-0.5 rounded-full">
                          {classes.find((c) => c.id === activeMatchedStudent.classId)?.name || 'Class'}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-800 font-medium">
                        प्रवेश क्रमांक: <strong className="font-mono">{activeMatchedStudent.admissionNo}</strong> • Roll #{activeMatchedStudent.rollNo || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>सत्यापित छात्र ✓</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-blue-200/60 text-[11px] text-blue-900 flex items-center gap-1.5 font-medium">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>कृपया पोर्टल खोलने हेतु नीचे अपना पासवर्ड दर्ज करें (Enter your password below to open portal).</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Student Password (विद्यार्थी पासवर्ड) *</span>
                <span className="text-[10px] text-slate-400 font-normal">आवश्यक</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="उदा. AMIT9999, जन्मतिथि (DOB), अथवा मोबाइल नंबर"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-emerald-700 focus:bg-white placeholder:normal-case tracking-wider transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer transition"
                  title={showPassword ? 'पासवर्ड छिपाएं' : 'पासवर्ड देखें'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Formula & Alternate Password Helper Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-slate-600 text-xs">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>पासवर्ड निर्देश (Password Format Guidance):</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                <li>
                  🔹 <strong>मानक नियम (Standard Formula):</strong> नाम के प्रथम 4 अक्षर (CAPITAL) + पंजीकृत मोबाइल के अंतिम 4 अंक (उदा.{' '}
                  <strong className="font-mono text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">
                    AMIT9999
                  </strong>
                  )
                </li>
                <li>
                  🔹 <strong>जन्मतिथि (Date of Birth):</strong> छात्र की जन्मतिथि किसी भी रूप में (उदा. <span className="font-mono">14/08/2010</span>, <span className="font-mono">14-08-2010</span>, अथवा <span className="font-mono">14082010</span>)
                </li>
                <li>
                  🔹 <strong>रजिस्टर्ड मोबाइल नंबर:</strong> विद्यालय में पंजीकृत 10 अंकों का पूरा मोबाइल नंबर भी मान्य है।
                </li>
              </ul>
              <p className="text-[11px] text-indigo-900 font-medium bg-indigo-50/80 p-2 rounded-xl border border-indigo-100 leading-relaxed">
                🔒 <strong>सुरक्षा सूचना:</strong> छात्र का पोर्टल केवल वैध पासवर्ड दर्ज करने पर ही खुलेगा। किसी भी तकनीकी सहायता हेतु विद्यालय कार्यालय से संपर्क करें।
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>पासवर्ड सत्यापित हो रहा है...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>पासवर्ड सत्यापित करें एवं पोर्टल खोलें (Unlock Portal)</span>
                </>
              )}
            </button>
          </form>

          {/* WhatsApp Group Share Card */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-emerald-950">
              <span className="font-extrabold text-[11px] flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>व्हाट्सएप ग्रुप हेतु कॉमन लिंक (Single Group Link):</span>
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.2 rounded">
                All Students & Parents
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              यह एक ही लिंक विद्यालय के सभी अभिभावकों एवं छात्रों के लिए है। सभी लोग अपना मोबाइल नंबर और पासवर्ड डालकर अपना-अपना व्यक्तिगत पोर्टल खोल सकते हैं।
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareToWhatsAppGroup}
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-98"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp ग्रुप में भेजें</span>
              </button>
              <button
                type="button"
                onClick={handleCopyUniversalLink}
                className="py-2 px-3 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'लिंक कॉपी हो गया!' : 'लिंक कॉपी करें'}</span>
              </button>
            </div>
          </div>

          {/* Admin Navigation Options */}
          {(onBackToDashboard || onOpenAdminLogin) && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 transition hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Admin Dashboard पर वापस लौटें</span>
                </button>
              )}
              {onOpenAdminLogin && (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="inline-flex items-center gap-1.5 font-bold text-blue-900 hover:text-blue-950 transition hover:underline cursor-pointer ml-auto"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
                  <span>प्रशासक / स्टाफ लॉगिन (Staff Login)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Public Upcoming Holidays Panel (Read-Only) */}
      {upcomingPublicHolidays.length > 0 && (
        <div className="w-full bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 p-4 sm:px-6 text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30">
                <Palmtree className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>Upcoming School Holidays (आगामी अवकाश तालिका)</span>
                </h3>
                <p className="text-[11px] text-emerald-100">सत्र {settings.academicYear || '2025-26'} विद्यालय अवकाश सूची</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg border border-white/30">
              {upcomingPublicHolidays.length} Holidays
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3 max-h-96 overflow-y-auto divide-y divide-slate-100">
            {upcomingPublicHolidays.map((h) => {
              const dateObj = new Date(h.date + 'T00:00:00');
              const dayOfWeek = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
              return (
                <div key={h.id} className="pt-3 first:pt-0 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-[8px] uppercase font-bold tracking-wider opacity-80 leading-none">
                      {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span className="text-base font-black leading-tight">{dateObj.getDate()}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        {formatDateToDDMMYYYY(h.date)} ({dayOfWeek})
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
                        {h.type}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {h.name}
                    </h4>
                    {h.endDate && (
                      <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
                        Multi-day Vacation until {formatDateToDDMMYYYY(h.endDate)}
                      </p>
                    )}
                    {h.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {h.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
