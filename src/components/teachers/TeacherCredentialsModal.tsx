import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Teacher } from '../../types/school';
import { dispatchSafeMessage } from '../../services/whatsappService';
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  Printer,
  Sparkles,
  ShieldCheck,
  LogIn,
  X,
  User,
  Phone,
  Mail,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';

interface TeacherCredentialsModalProps {
  teacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onLoginAsTeacher?: (teacherId: string) => void;
}

export const TeacherCredentialsModal: React.FC<TeacherCredentialsModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onLoginAsTeacher,
}) => {
  const { updateTeacherPassword, classes, settings } = useSchool();

  const [username, setUsername] = useState(
    teacher.username || teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '.') || teacher.empId.toLowerCase()
  );
  const [password, setPassword] = useState(teacher.password || 'Teacher@123');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const prefixes = ['SBSC', 'Teach', 'Faculty', 'Vidya', 'Gurukul'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generated = `${randomPrefix}@${randomDigits}`;
    setPassword(generated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      alert('Password cannot be empty.');
      return;
    }
    updateTeacherPassword(teacher.id, password.trim(), username.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const teacherClass = classes.find(
    (c) =>
      c.classTeacherId === teacher.id ||
      c.id === teacher.assignedClassId ||
      c.name.toLowerCase() === teacher.assignedClass?.toLowerCase()
  );

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicOrigin = origin.includes('ais-dev-')
    ? origin.replace('ais-dev-', 'ais-pre-')
    : origin || 'https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app';
  
  const directClassUrl = teacherClass
    ? `${publicOrigin}?class=${teacherClass.id}`
    : `${publicOrigin}?teacher=${teacher.id}`;

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';

  const credentialText = `🏫 *${settings.schoolName}*
*CLASS TEACHER SECURE PORTAL ACCESS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Teacher Name:* ${teacher.name}
🆔 *Employee ID:* ${teacher.empId}
💼 *Designation:* ${teacher.designation}
🏫 *Designated Class:* ${teacher.assignedClass || teacherClass?.name || 'Class In-Charge'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Direct Class Link:*
${directClassUrl}

🔑 *Login Password:* ${password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Admin Contact (पासवर्ड या सहायता हेतु):*
Admin: ${adminName} (Mob: ${adminPhone})
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 *Strict Access Rule:*
यह लिंक केवल आपके द्वारा अधिकृत *${teacher.assignedClass || teacherClass?.name || 'कक्षा'}* को खोलेगा। लिंक खोलने के बाद ऊपर दिया गया एडमिन पासवर्ड दर्ज करें। आप केवल अपनी कक्षा के बच्चों की उपस्थिति, होमवर्क और परीक्षा नंबर देख एवं भर सकेंगे।`;

  const handleCopy = () => {
    navigator.clipboard.writeText(credentialText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = teacher.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(credentialText)}`;
    dispatchSafeMessage(url, 'whatsapp');
  };

  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faculty Login Passkey - ${teacher.name}</title>
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 15px; }
          .card { border: 2px solid #1e3a8a; border-radius: 12px; padding: 20px; max-width: 550px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
          .school-title { color: #1e3a8a; font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; }
          .sub-title { font-size: 11px; color: #64748b; font-weight: bold; margin-top: 3px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; border: 1px solid #fde68a; margin-top: 6px; }
          .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 15px; }
          .field { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .label { color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; display: block; }
          .val { font-weight: bold; color: #0f172a; margin-top: 2px; }
          .cred-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 12px; text-align: center; margin: 15px 0; }
          .cred-box h4 { margin: 0 0 8px 0; color: #1e3a8a; font-size: 13px; font-weight: 800; }
          .cred-row { display: flex; justify-content: space-around; font-size: 14px; }
          .cred-item { font-family: monospace; font-size: 15px; font-weight: 800; color: #1e3a8a; }
          .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="school-title">${settings.schoolName}</h1>
            <div class="sub-title">${settings.schoolAddress} • Affiliation: ${settings.affiliationNo}</div>
            <div class="badge">OFFICIAL FACULTY & CLASS TEACHER PASSKEY</div>
          </div>
          <div class="content-grid">
            <div class="field"><span class="label">Teacher Name</span><span class="val">${teacher.name}</span></div>
            <div class="field"><span class="label">Employee ID</span><span class="val">${teacher.empId}</span></div>
            <div class="field"><span class="label">Designation</span><span class="val">${teacher.designation}</span></div>
            <div class="field"><span class="label">Class In-Charge</span><span class="val">${teacher.assignedClass || 'Subject Teacher'}</span></div>
          </div>
          <div class="cred-box">
            <h4>AUTHORIZED ERP LOGIN CREDENTIALS</h4>
            <div class="cred-row">
              <div><span class="label">Username / Emp ID</span><span class="cred-item">${username}</span></div>
              <div><span class="label">System Password</span><span class="cred-item">${password}</span></div>
            </div>
          </div>
          <div class="footer">
            Generated & Approved by Principal/Admin Office • SBSC Campus ERP Portal • Printed on ${new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Managed Credentials</span>
              </div>
              <h3 className="text-base font-extrabold tracking-tight">Teacher Password & Login Portal</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teacher Info Snapshot */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs">
              {teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{teacher.name}</h4>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="font-mono text-blue-900 font-bold">{teacher.empId}</span>
                <span>•</span>
                <span className="text-slate-700">{teacher.designation}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-950 border border-blue-200 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-blue-900" />
              <span>In-Charge: <b>{teacher.assignedClass || 'Subject Teacher'}</b></span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Password & Username updated successfully! Teacher can now log in with these credentials.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Login Username / Handle *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ku.shanti or TCH-101"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-blue-900 focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Teacher can also sign in using their Emp ID (<b>{teacher.empId}</b>) or Email.
              </span>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Teacher Login Password *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[10px] text-blue-900 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Auto-Generate</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter custom password..."
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-extrabold text-blue-950 focus:outline-blue-900 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2 top-1.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-500">
                  Managed by Admin: <b>{adminName}</b> ({adminPhone})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPassword('Teacher@123');
                    updateTeacherPassword(teacher.id, 'Teacher@123', username.trim());
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 3000);
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer"
                  title="Admin Only: Reset password to default Teacher@123"
                >
                  <RotateCcw className="w-3 h-3 text-slate-600" />
                  <span>Reset to Default (Admin)</span>
                </button>
              </div>
              <div className="text-[9.5px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2 py-1 rounded-lg mt-1 font-semibold">
                🔒 Policy: Teachers create their own password in their portal. Password resets are restricted to <b>Admin Only</b>.
              </div>
            </div>
          </div>

          {/* Direct Class Share Link Box */}
          <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>Direct Class Link for {teacher.assignedClass || teacherClass?.name || 'Class'}</span>
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                🔒 Password Protected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directClassUrl}
                className="flex-1 bg-white border border-emerald-300 px-3 py-1.5 rounded-xl font-mono text-[11px] text-slate-800 select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(directClassUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shrink-0"
              >
                Copy Link
              </button>
            </div>
            <p className="text-[10px] text-emerald-800 leading-tight">
              Only opens <strong>{teacher.assignedClass || teacherClass?.name || 'this class'}</strong>. Teacher must enter password <strong className="font-mono">{password}</strong> to unlock.
            </p>
          </div>

          {/* WhatsApp & Print Actions Box */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-950">Quick Dispatch & Sharing:</span>
              <span className="text-[10px] font-mono text-slate-500">{teacher.phone}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Send WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCard}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Pass Slip</span>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
            {onLoginAsTeacher && (
              <button
                type="button"
                onClick={() => {
                  onLoginAsTeacher(teacher.id);
                  onClose();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Login As {teacher.name.split(' ')[0]}</span>
              </button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-extrabold shadow-md transition active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Save Password</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
