import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Globe,
  Sparkles,
  HelpCircle,
  Download,
  Info,
  GraduationCap,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  UserCheck,
  ShieldCheck,
  School,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { dispatchSafeMessage } from '../../services/whatsappService';
import { formatUniversalWhatsAppGroupMessage } from '../../utils/studentAuthUtils';

interface ShareMobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareMobileAppModal: React.FC<ShareMobileAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    classes,
    teachers,
    updateTeacherPassword,
    cloudSyncStatus,
    lastCloudSyncTime,
    syncAllToCloud,
  } = useSchool();
  const [copied, setCopied] = useState(false);
  const [shareSection, setShareSection] = useState<'student-portal' | 'class-teacher' | 'full-school'>('student-portal');
  const [activeDeviceTab, setActiveDeviceTab] = useState<'android' | 'ios' | 'deploy' | 'fix403'>('fix403');
  const [publicUrl, setPublicUrl] = useState<string>('https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app');
  const [isDevUrl, setIsDevUrl] = useState<boolean>(false);
  const [isCloudPushing, setIsCloudPushing] = useState<boolean>(false);
  const [cloudPushSuccess, setCloudPushSuccess] = useState<boolean>(false);

  // Universal student portal link and copy states
  const [studentPortalCopied, setStudentPortalCopied] = useState(false);
  const [studentMessageCopied, setStudentMessageCopied] = useState(false);

  // Selected class for class teacher link
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showTeacherPassword, setShowTeacherPassword] = useState<boolean>(false);
  const [isPasswordSaved, setIsPasswordSaved] = useState<boolean>(false);
  const [teacherCopied, setTeacherCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // If currently on ais-dev, auto-convert to ais-pre so other phones don't get 403 Forbidden
      if (origin.includes('ais-dev-')) {
        setIsDevUrl(true);
        const sharedOrigin = origin.replace('ais-dev-', 'ais-pre-');
        setPublicUrl(sharedOrigin);
      } else {
        setPublicUrl(origin);
      }
    }
  }, [isOpen]);

  // Set default selected class when modal opens or classes load
  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      // Default to Class 5 or first available class
      const defaultCls = classes.find((c) => c.name.includes('5')) || classes[0];
      setSelectedClassId(defaultCls.id);
    }
  }, [classes, isOpen]);

  // Find selected class and assigned teacher
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const assignedTeacher = selectedClass
    ? teachers.find(
        (t) =>
          t.id === selectedClass.classTeacherId ||
          t.assignedClassId === selectedClass.id ||
          t.assignedClass?.toLowerCase() === selectedClass.name.toLowerCase()
      )
    : undefined;

  // Sync teacher password whenever assigned teacher changes
  useEffect(() => {
    if (assignedTeacher) {
      setTeacherPassword(assignedTeacher.password || 'Teacher@123');
    } else {
      setTeacherPassword('Teacher@123');
    }
  }, [assignedTeacher?.id]);

  if (!isOpen) return null;

  // Class link URL: ?class=<id>
  const classShareUrl = selectedClass ? `${publicUrl}?class=${selectedClass.id}` : publicUrl;

  const handleSaveTeacherPassword = () => {
    if (!assignedTeacher) {
      alert('Please assign a class teacher in Faculty Management first.');
      return;
    }
    if (!teacherPassword.trim()) {
      alert('Password cannot be empty.');
      return;
    }
    updateTeacherPassword(assignedTeacher.id, teacherPassword.trim(), assignedTeacher.username);
    setIsPasswordSaved(true);
    setTimeout(() => setIsPasswordSaved(false), 3000);
  };

  const handleGenerateRandomPassword = () => {
    const prefixes = ['SBSC', 'Teach', 'Vidya', 'Gurukul', 'Faculty'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const newPass = `${prefix}@${num}`;
    setTeacherPassword(newPass);
    if (assignedTeacher) {
      updateTeacherPassword(assignedTeacher.id, newPass, assignedTeacher.username);
      setIsPasswordSaved(true);
      setTimeout(() => setIsPasswordSaved(false), 3000);
    }
  };

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';

  const teacherShareMessage = `🏫 *${settings.schoolName || 'SBSC Public School'}*
*CLASS TEACHER SECURE PORTAL LINK*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
आदरणीय अध्यापक / Respected Teacher,
👤 *Teacher Name:* ${assignedTeacher?.name || 'Class In-Charge'}
🏫 *Designated Class:* ${selectedClass?.name || 'Class'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Direct Class Link:*
${classShareUrl}

🔑 *Login Password:* \`${teacherPassword}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Admin Contact (पासवर्ड या सहायता हेतु):*
Admin: ${adminName} (Mob: ${adminPhone})
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 *Strict Access Rule:*
यह लिंक केवल आपके द्वारा अधिकृत *${selectedClass?.name}* को खोलेगा। लिंक खोलकर एडमिन ${adminName} द्वारा दिया गया पासवर्ड दर्ज करें। आप केवल अपनी कक्षा की दैनिक हाजिरी (Attendance), बच्चों की सूची, होमवर्क एवं परीक्षा नंबर भर सकेंगे।`;

  const handleShareTeacherWhatsApp = () => {
    const cleanPhone = assignedTeacher?.phone ? assignedTeacher.phone.replace(/[^0-9]/g, '') : '';
    const phoneWithCountry = cleanPhone
      ? cleanPhone.startsWith('91')
        ? cleanPhone
        : `91${cleanPhone}`
      : '';
    const waUrl = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(teacherShareMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(teacherShareMessage)}`;
    dispatchSafeMessage(waUrl, 'whatsapp', teacherShareMessage);
  };

  const handleCopyTeacherCredentials = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(teacherShareMessage);
        setTeacherCopied(true);
        setTimeout(() => setTeacherCopied(false), 2500);
      }
    } catch {
      window.prompt('Copy Class Teacher Credentials:', teacherShareMessage);
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback prompt
      window.prompt('Copy this public URL:', publicUrl);
    }
  };

  const cleanPublicBase = (publicUrl || '').trim().replace(/\/+$/, '');
  const studentPortalUrl = `${cleanPublicBase}/?portal=student#student-portal`;
  const studentPortalMessage = formatUniversalWhatsAppGroupMessage(
    settings.schoolName || 'SBSC PUBLIC SCHOOL',
    studentPortalUrl
  );

  const handleShareStudentPortalWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(studentPortalMessage)}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(studentPortalMessage).catch(() => {});
      }
    } catch {}
    dispatchSafeMessage(waUrl, 'whatsapp', studentPortalMessage);
  };

  const handleCopyStudentPortalLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(studentPortalUrl);
        setStudentPortalCopied(true);
        setTimeout(() => setStudentPortalCopied(false), 2500);
      } else {
        window.prompt('Copy Universal Student Portal Link:', studentPortalUrl);
      }
    } catch {
      window.prompt('Copy Universal Student Portal Link:', studentPortalUrl);
    }
  };

  const handleCopyStudentPortalMessage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(studentPortalMessage);
        setStudentMessageCopied(true);
        setTimeout(() => setStudentMessageCopied(false), 2500);
      } else {
        window.prompt('Copy WhatsApp Announcement Message:', studentPortalMessage);
      }
    } catch {
      window.prompt('Copy WhatsApp Announcement Message:', studentPortalMessage);
    }
  };

  const qrStudentPortalUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    studentPortalUrl
  )}&bgcolor=ffffff&color=065f46&margin=1`;

  const handleShareWhatsApp = () => {
    const text = `🏫 *${settings.schoolName || 'SBSC Public School'} Portal*\n\nAccess the complete school management system on your mobile phone or computer:\n🔗 ${publicUrl}\n\n*Included Modules:*\n• Student Admissions & Fees\n• Daily Attendance Register\n• 7-Subject Exams & Marksheets\n• Homework & Notices\n• 11 Official A4 Printable Reports\n\n_No app store download or Android Studio needed. Open directly in Chrome or Safari!_`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(waUrl, 'whatsapp', text);
  };

  const handleSyncBeforeShare = async () => {
    setIsCloudPushing(true);
    try {
      const ok = await syncAllToCloud();
      if (ok) {
        setCloudPushSuccess(true);
        setTimeout(() => setCloudPushSuccess(false), 3500);
      }
    } finally {
      setIsCloudPushing(false);
    }
  };

  // QR code image URL generator (using reliable HTTPS QR API with pure fallback)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    publicUrl
  )}&bgcolor=ffffff&color=1e3a8a&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>Mobile Access & Public Link</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  HTTPS Live
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                Open on any Android, iPhone, tablet or computer with zero installs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Mode Switcher: Student Portal vs Class Teacher vs Full School */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShareSection('student-portal')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              shareSection === 'student-portal'
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-700/50'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Student Portal (ग्रुप लिंक)</span>
            <span className="text-[10px] bg-emerald-300 text-emerald-950 font-black px-1.5 py-0.2 rounded-md uppercase">
              Parent
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShareSection('class-teacher')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              shareSection === 'class-teacher'
                ? 'bg-blue-950 text-amber-300 ring-2 ring-blue-900/50'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Class Teacher Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShareSection('full-school')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              shareSection === 'full-school'
                ? 'bg-blue-950 text-white ring-2 ring-blue-900/50'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Admin App</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-slate-800 text-xs">
          {/* ========================================================================= */}
          {/* TAB 0: STUDENT PORTAL (UNIVERSAL LINK FOR WHATSAPP GROUP) */}
          {/* ========================================================================= */}
          {shareSection === 'student-portal' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Instructions banner */}
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3 text-emerald-950">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-2">
                    <span>Universal Student Portal (व्हाट्सएप ग्रुप हेतु एक ही कॉमन लिंक)</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                      Parent Friendly
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                    यह एक ही लिंक स्कूल के व्हाट्सएप ग्रुप में शेयर करें। प्रत्येक छात्र या अभिभावक अपना <strong>मोबाइल नंबर और पासवर्ड</strong> डालकर केवल अपना ही विवरण (हाजिरी, फीस रसीदें, परिणाम) सुरक्षित देख सकेंगे। अन्य छात्रों का रिकॉर्ड किसी अन्य को नहीं दिखेगा।
                  </p>
                </div>
              </div>

              {/* Password Rule Highlight */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-slate-800">
                <div className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>पासवर्ड का मानक फॉर्मूला (Password Rule):</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  छात्र के अंग्रेजी नाम के <strong>प्रथम 4 अक्षर (CAPITAL)</strong> + पंजीकृत <strong>मोबाइल नंबर के अंतिम 4 अंक</strong>।
                </p>
                <div className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                  उदा. नाम = AMIT, मोबाइल = 9999999999 ➔ पासवर्ड = AMIT9999
                </div>
                <p className="text-[11px] text-indigo-950 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 mt-1 leading-relaxed">
                  👨‍👩‍👧‍👦 <strong>एक ही मोबाइल नंबर पर भाई-बहन?</strong> यदि एक ही परिवार से 2 या 3 बच्चे पढ़ते हैं, तो जिस बच्चे का पासवर्ड दर्ज किया जाएगा (उदा. <strong>AMIT9999</strong> अथवा <strong>ROHI9999</strong>), पोर्टल पर सीधे उसी बच्चे का रिपोर्ट कार्ड खुलेगा।
                </p>
              </div>

              {/* Universal Link Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-700" />
                    <span>WhatsApp Group Link (कॉमन पोर्टल लिंक):</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Single Link for All
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 truncate select-all">
                    {studentPortalUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyStudentPortalLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                      studentPortalCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {studentPortalCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{studentPortalCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleShareStudentPortalWhatsApp}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>व्हाट्सएप ग्रुप में भेजें (Share to WhatsApp)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyStudentPortalMessage}
                  className="py-3 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  {studentMessageCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{studentMessageCopied ? 'संदेश कॉपी हो गया!' : 'पूरा संदेश कॉपी करें (Copy Message)'}</span>
                </button>
              </div>

              {/* WhatsApp Message Preview */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>WhatsApp Group Broadcast Preview (ग्रुप संदेश प्रारूप):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Ready to Share</span>
                </div>
                <pre className="text-[11px] font-sans whitespace-pre-wrap text-slate-200 leading-relaxed max-h-40 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {studentPortalMessage}
                </pre>
              </div>

              {/* QR Code for Student Portal */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center gap-3">
                <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src={qrStudentPortalUrl}
                    alt="Student Portal QR Code"
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 font-extrabold text-emerald-950 text-xs">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>School Notice Board / Circular QR Code</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    इस QR कोड को स्कूल के नोटिस बोर्ड पर भी चस्पा किया जा सकता है। कोई भी अभिभावक या छात्र सीधे अपने फोन कैमरे से स्कैन करके इसी कॉमन पोर्टल तक पहुंच सकता है।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: CLASS TEACHER RESTRICTED LINK (ONLY SELECTED CLASS) */}
          {/* ========================================================================= */}
          {shareSection === 'class-teacher' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Instructions banner */}
              <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-start gap-3 text-blue-950">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-blue-950">
                    Restricted Class Portal for Teachers (सिर्फ चुनी हुई कक्षा खुलेगी)
                  </h4>
                  <p className="text-[11px] text-blue-900/90 leading-relaxed">
                    इस लिंक से टीचर केवल अपनी अधिकृत कक्षा खोल सकेंगे। एडमिन द्वारा सेट किया गया पासवर्ड डालने पर ही कक्षा खुलेगी। अन्य कक्षाएं और एडमिन फीस रिकॉर्ड पूरी तरह सुरक्षित एवं लॉक रहेंगे।
                  </p>
                </div>
              </div>

              {/* Step 1: Select Class */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <School className="w-4 h-4 text-blue-900" />
                    <span>1. Select Class (कक्षा चुनें):</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    {classes.length} Classes Available
                  </span>
                </div>

                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-white border-2 border-blue-900/30 focus:border-blue-900 rounded-xl py-2.5 px-3 font-bold text-slate-900 text-xs shadow-xs"
                >
                  {classes.map((cls) => {
                    const t = teachers.find(
                      (tch) =>
                        tch.id === cls.classTeacherId ||
                        tch.assignedClassId === cls.id ||
                        tch.assignedClass?.toLowerCase() === cls.name.toLowerCase()
                    );
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.section || 'General'}) • Teacher: {t?.name || 'Not Assigned'}
                      </option>
                    );
                  })}
                </select>

                {/* Assigned Faculty Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-black shrink-0">
                      <UserCheck className="w-4 h-4 text-blue-900" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {assignedTeacher?.name || 'Class In-Charge Not Assigned'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Emp ID: <span className="font-mono font-bold text-blue-900">{assignedTeacher?.empId || 'N/A'}</span> • Mobile: <span className="font-mono">{assignedTeacher?.phone || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-950 border border-blue-200 px-2.5 py-1 rounded-lg">
                    {selectedClass?.name || 'Selected Class'}
                  </span>
                </div>
              </div>

              {/* Step 2: Set / Manage Admin Password for Teacher */}
              <div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>2. Admin-Provided Teacher Password (टीचर पासवर्ड):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                      Admin: {adminName} ({adminPhone})
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[10px] text-blue-900 hover:text-blue-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showTeacherPassword ? 'text' : 'password'}
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Enter teacher password..."
                      className="w-full bg-white border-2 border-amber-300 focus:border-amber-600 rounded-xl py-2 pl-3 pr-9 font-mono font-black text-xs text-slate-900 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showTeacherPassword ? 'Hide password' : 'Show password'}
                    >
                      {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveTeacherPassword}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shrink-0 shadow-xs cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>

                {isPasswordSaved && (
                  <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-xl text-[11px] text-emerald-950 font-bold flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>✓ Teacher password updated and securely synced to Cloud!</span>
                  </div>
                )}

                <p className="text-[10px] text-amber-900 leading-tight">
                  एडमिन द्वारा यह पासवर्ड टीचर को दिया जाएगा। जब टीचर लिंक खोलेंगे, उन्हें केवल यह पासवर्ड दर्ज करना होगा।
                </p>
              </div>

              {/* Step 3: Direct Class Link */}
              <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-700" />
                    <span>3. Dedicated Class Share Link (विशिष्ट क्लास लिंक):</span>
                  </span>
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300">
                    Locked to {selectedClass?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-emerald-300 px-3 py-2 rounded-xl font-mono text-[11px] text-slate-900 truncate select-all">
                    {classShareUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTeacherCredentials}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-xs cursor-pointer ${
                      teacherCopied
                        ? 'bg-emerald-700 text-white'
                        : 'bg-blue-900 hover:bg-blue-950 text-white'
                    }`}
                  >
                    {teacherCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link & Pass</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dispatch & Preview Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareTeacherWhatsApp}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send to Teacher via WhatsApp</span>
                  </button>

                  <a
                    href={classShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-blue-950 font-extrabold text-xs border border-slate-300 flex items-center justify-center gap-2 transition shadow-2xs"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-900" />
                    <span>Test / Preview Class Lock Screen</span>
                  </a>
                </div>

                <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200 text-[10px] text-slate-700 space-y-1">
                  <p className="font-extrabold text-emerald-950">
                    🔒 Strict Protection Guarantee:
                  </p>
                  <p>
                    • यह लिंक सीधे <strong>{selectedClass?.name}</strong> के लिए लॉक स्क्रीन खोलेगा।
                  </p>
                  <p>
                    • टीचर को सिर्फ <strong>{teacherPassword}</strong> दर्ज करना होगा।
                  </p>
                  <p>
                    • लॉगिन के बाद टीचर केवल अपनी कक्षा के छात्र, हाजिरी, होमवर्क और परीक्षा नंबर देख/भर सकेंगे।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: FULL SCHOOL APP & QR CODE */}
          {/* ========================================================================= */}
          {shareSection === 'full-school' && (
            <div className="space-y-4 animate-fadeIn">
              {/* 403 Forbidden Warning & Instant Resolution Box */}
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                  <span className="p-1 rounded-md bg-amber-200 text-amber-900 font-mono text-[10px]">FIX 403</span>
                  <span>Why other mobiles got "Error 403 Forbidden":</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  In Google AI Studio, URLs with <strong>ais-dev-</strong> are private to your logged-in Google account. When another mobile phone opens an <strong>ais-dev</strong> link, Google Cloud blocks it with <strong>403 Forbidden</strong>.
                </p>
                <div className="p-2.5 bg-white/90 rounded-lg border border-amber-300/80 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-900">2 Simple Steps to Open on Any Mobile Phone:</p>
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <span className="font-bold text-amber-800 shrink-0">Step 1:</span>
                    <span>
                      Look at the top-right corner of <strong>Google AI Studio</strong> (above this screen) and click the <strong>"Share"</strong> button. Make sure sharing is enabled.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <span className="font-bold text-amber-800 shrink-0">Step 2:</span>
                    <span>
                      Share the <strong>Public Shared Link (ais-pre)</strong> below. It will open directly on any phone without login or error!
                    </span>
                  </div>
                </div>
              </div>

              {/* Online Cloud Database Status Card */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl space-y-2 text-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="font-extrabold text-xs text-emerald-950">
                      Cloud Database Live (ऑनलाइन डेटाबेस चालू है)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Firestore Connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  सभी विद्यार्थियों की लिस्ट, फीस रिकॉर्ड, हाजिरी, कक्षाएं एवं सेटिंग्स ऑनलाइन क्लाउड डेटाबेस में सुरक्षित हैं। लिंक शेयर करने पर दूसरे फोन/कंप्यूटर पर पूरा डेटा लाइव दिखेगा।
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Last synced: {lastCloudSyncTime || 'Just now'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncBeforeShare}
                    disabled={isCloudPushing}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/60 px-2.5 py-1 rounded-md border border-emerald-300 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>{cloudPushSuccess ? '✓ Data Synced to Cloud!' : isCloudPushing ? 'Syncing...' : 'Sync All Data to Cloud Now ➔'}</span>
                  </button>
                </div>
              </div>

              {/* Public Link Banner Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Public Shareable Link (For All Mobiles)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Public Shared URL (ais-pre)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-900 truncate select-all">
                    {publicUrl}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-xs cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-900 hover:bg-blue-950 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Notice: This URL uses <strong>ais-pre-</strong> (Public Shared App) instead of <strong>ais-dev-</strong>. Anyone with this link can open the application in their mobile browser (Chrome, Safari, Firefox).
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Link via WhatsApp</span>
                </button>

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs border border-blue-200 flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4 text-blue-900" />
                  <span>Open in New Browser Window</span>
                </a>
              </div>

              {/* QR Code Scan on Phone */}
              <div className="p-4 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src={qrApiUrl}
                    alt="Scan to open on mobile"
                    className="w-32 h-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-slate-900 text-xs">
                    <QrCode className="w-4 h-4 text-blue-900" />
                    <span>Instant Mobile Phone Scan</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Open your smartphone's camera (Android or iPhone) and point it at this QR code. Tap the notification banner to launch SBSC Public School instantly.
                  </p>
                  <div className="pt-1 text-[10px] text-blue-900 font-semibold flex items-center justify-center sm:justify-start gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>No downloads required • Works on all smartphones</span>
                  </div>
                </div>
              </div>

              {/* Device Installation Guide Tabs */}
              <div className="space-y-2">
                <div className="flex border-b border-slate-200 gap-2">
                  <button
                    onClick={() => setActiveDeviceTab('fix403')}
                    className={`pb-2 px-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                      activeDeviceTab === 'fix403'
                        ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ⚠️ Fix 403 Error
                  </button>
                  <button
                    onClick={() => setActiveDeviceTab('android')}
                    className={`pb-2 px-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                      activeDeviceTab === 'android'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🤖 Android
                  </button>
                  <button
                    onClick={() => setActiveDeviceTab('ios')}
                    className={`pb-2 px-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                      activeDeviceTab === 'ios'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🍎 iPhone / iPad
                  </button>
                  <button
                    onClick={() => setActiveDeviceTab('deploy')}
                    className={`pb-2 px-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                      activeDeviceTab === 'deploy'
                        ? 'border-purple-600 text-purple-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ☁️ Cloud Deploy
                  </button>
                </div>

                {/* Fix 403 error guide */}
                {activeDeviceTab === 'fix403' && (
                  <div className="p-4 bg-amber-50/90 rounded-xl border border-amber-300 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                      <span className="p-1 bg-amber-200 text-amber-900 rounded font-black text-[10px]">WHY 403?</span>
                      <span>HTTP 403 Forbidden happens when other devices open a private development link.</span>
                    </div>

                    <div className="space-y-2 text-slate-800 text-[11px] leading-relaxed">
                      <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1">
                        <p className="font-bold text-slate-900">1. Difference between the 2 URLs:</p>
                        <p className="text-slate-600">
                          ❌ <code>ais-dev-...run.app</code> = Only works in YOUR computer browser where you are logged in to Google AI Studio.
                        </p>
                        <p className="text-emerald-700 font-semibold">
                          ✓ <code>ais-pre-...run.app</code> = PUBLIC link that ANY mobile phone can open without login!
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1">
                        <p className="font-bold text-slate-900">2. How to enable Public Access in AI Studio (Takes 10 seconds):</p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-700">
                          <li>In the top header of <strong>Google AI Studio</strong>, find and click the <strong>"Share"</strong> button.</li>
                          <li>Select <strong>"Anyone with the link can view"</strong> (or click Share/Publish).</li>
                          <li>Copy or share the <strong>ais-pre</strong> URL:</li>
                        </ol>
                        <div className="pt-1.5 flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value="https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app"
                            className="flex-1 bg-slate-50 border border-slate-300 px-2.5 py-1.5 rounded text-[10px] font-mono text-slate-900 select-all"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                'https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app'
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2500);
                            }}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Android instructions */}
                {activeDeviceTab === 'android' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fadeIn">
                    <p className="font-bold text-slate-900 text-xs">
                      How to install on Android as a Home Screen App:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                      <li>
                        Open <strong>{publicUrl}</strong> in <strong>Google Chrome</strong> on your phone.
                      </li>
                      <li>
                        Tap the <strong>three dots (⋮)</strong> in the top-right corner.
                      </li>
                      <li>
                        Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                      </li>
                      <li>
                        Tap <strong>Add</strong>. The official <strong>SBSC School</strong> icon will be created on your home screen!
                      </li>
                    </ol>
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-900 font-medium">
                      ✓ Launches in native standalone full-screen mode without the browser URL bar.
                    </div>
                  </div>
                )}

                {/* iOS instructions */}
                {activeDeviceTab === 'ios' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fadeIn">
                    <p className="font-bold text-slate-900 text-xs">
                      How to install on iPhone or iPad:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                      <li>
                        Open <strong>{publicUrl}</strong> in <strong>Safari</strong>.
                      </li>
                      <li>
                        Tap the <strong>Share button</strong> (the square with an arrow pointing up <span className="font-mono font-bold">⎋</span>) at the bottom bar.
                      </li>
                      <li>
                        Scroll down and tap <strong>"Add to Home Screen"</strong> (with the <strong>+</strong> icon).
                      </li>
                      <li>
                        Tap <strong>Add</strong> in the top-right. The SBSC School app will appear alongside your other apps.
                      </li>
                    </ol>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-900 font-medium">
                      ✓ High-resolution iOS app icon and offline state caching are already pre-configured.
                    </div>
                  </div>
                )}

                {/* Deploy instructions */}
                {activeDeviceTab === 'deploy' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-fadeIn">
                    <p className="font-bold text-slate-900 text-xs">
                      Permanent Public Sharing & Cloud Run Deployment:
                    </p>
                    <div className="space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-blue-900 shrink-0">1. Instant Share:</span>
                        <span>
                          In the Google AI Studio header, click the <strong>"Share"</strong> button in the top-right to create a permanent public preview URL that never expires.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-blue-900 shrink-0">2. Deploy to Cloud Run:</span>
                        <span>
                          Click <strong>Deploy</strong> in the AI Studio menu to host this full-stack application on your own Google Cloud Run domain with custom domains (e.g. <code>portal.sbscschool.in</code>) and free SSL certificates.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-blue-900 shrink-0">3. GitHub Export:</span>
                        <span>
                          You can also click <strong>Settings &gt; Export to GitHub</strong> to clone the repository anytime.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Responsive for Android, iPhone, iPad & Desktops</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
