import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Teacher } from '../../types/school';
import { dispatchSafeMessage } from '../../services/whatsappService';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Search,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  MessageCircle,
  Printer,
  X,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AdminTeacherPasswordConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminTeacherPasswordConsoleModal: React.FC<AdminTeacherPasswordConsoleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    teachers,
    classes,
    settings,
    adminResetTeacherPassword,
    adminBatchResetAllTeacherPasswords,
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswordMap, setVisiblePasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Single teacher custom reset state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');

  // Batch reset confirmation modal state
  const [isConfirmBatchOpen, setIsConfirmBatchOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'default' | 'unique'>('default');

  if (!isOpen) return null;

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const togglePasswordVisibility = (teacherId: string) => {
    setVisiblePasswordMap((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('✓ Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetSingle = (teacher: Teacher, passwordChoice?: string) => {
    const res = adminResetTeacherPassword(teacher.id, passwordChoice || 'Teacher@123');
    if (res.success) {
      showToast(`✓ Reset password for ${teacher.name} to "${res.newPassword}"`);
      setEditingTeacherId(null);
      setCustomPasswordInput('');
    }
  };

  const handleExecuteBatchReset = () => {
    const res = adminBatchResetAllTeacherPasswords(batchMode);
    if (res.success) {
      showToast(`✓ ${res.message}`);
      setIsConfirmBatchOpen(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicOrigin = origin.includes('ais-dev-')
    ? origin.replace('ais-dev-', 'ais-pre-')
    : origin || 'https://ais-pre-dxqoqmf2v522mg6d7kluyu-177139873826.asia-southeast1.run.app';

  const handleWhatsAppTeacher = (teacher: Teacher) => {
    const assignedCls = classes.find(
      (c) =>
        c.classTeacherId === teacher.id ||
        c.id === teacher.assignedClassId ||
        c.name.toLowerCase() === (teacher.assignedClass || '').toLowerCase()
    );

    const directLink = assignedCls
      ? `${publicOrigin}?class=${assignedCls.id}`
      : `${publicOrigin}?teacher=${teacher.id}`;

    const text = `🏫 *${settings.schoolName || 'SBSC Public School'}*
*CLASS TEACHER LOGIN CREDENTIALS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Teacher Name:* ${teacher.name}
🆔 *Employee ID:* ${teacher.empId}
🏫 *Designated Class:* ${teacher.assignedClass || assignedCls?.name || 'Class In-Charge'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Direct Class Link:*
${directLink}

🔑 *Login Password:* \`${teacher.password || 'Teacher@123'}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *Admin Contact (पासवर्ड रीसेट या सहायता):*
Admin: ${adminName} (Mob: ${adminPhone})
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 *Security Notice:*
यह पासवर्ड एडमिन ${adminName} द्वारा रीसेट/प्रदान किया गया है। यदि आप नया पासवर्ड बनाना चाहें, तो पोर्टल में "Create New Password" विकल्प का उपयोग करें। यदि पासवर्ड भूल जाएं, तो केवल एडमिन ही इसे रीसेट कर सकते हैं।`;

    const cleanPhone = teacher.phone ? teacher.phone.replace(/[^0-9]/g, '') : '';
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = cleanPhone
      ? `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(url, 'whatsapp', text);
  };

  const handlePrintCredentialsSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print credentials sheet.');
      return;
    }

    const rowsHtml = teachers
      .map(
        (t, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: bold; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 8px 12px; font-weight: bold;">${t.name}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${t.empId}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #1e3a8a;">${t.assignedClass || 'Subject Faculty'}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${t.phone}</td>
        <td style="padding: 8px 12px; font-family: monospace; font-weight: bold; background-color: #fef3c7; color: #78350f;">${t.password || 'Teacher@123'}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SBSC Public School - Faculty Master Passwords Sheet</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background-color: #0f172a; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .badge { background: #dbeafe; color: #1e3a8a; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; font-size: 20px;">${settings.schoolName || 'SBSC Public School'}</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
              CONFIDENTIAL • FACULTY MASTER PASSWORDS & CREDENTIALS DIRECTORY (ADMIN COPY)
            </p>
            <div style="margin-top: 8px; font-size: 11px; color: #334155;">
              Authorized Administrator: <b>${adminName}</b> (Contact: <b>${adminPhone}</b>) • Date: <b>${new Date().toLocaleDateString('en-IN')}</b>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Teacher Name</th>
                <th>Employee ID</th>
                <th>Assigned Class</th>
                <th>Mobile Number</th>
                <th>Master Password</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <p style="margin-top: 20px; font-size: 11px; color: #64748b;">
            Strict Rule: Only School Administrator ${adminName} has the authority to reset forgotten passwords.
          </p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.empId.toLowerCase().includes(q) ||
      (t.assignedClass && t.assignedClass.toLowerCase().includes(q)) ||
      t.phone.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 sm:p-6 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-lg font-black shrink-0">
                <KeyRound className="w-6 h-6 text-blue-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Admin Only Master Console
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-bold">
                    Admin: <b>{adminName}</b> ({adminPhone})
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                  Faculty Passwords & Reset Console
                </h2>
                <p className="text-xs text-slate-300">
                  Teachers create their passwords in their portal. <b>Resetting passwords is restricted to Admin Only.</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintCredentialsSheet}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                title="Print master credentials sheet"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Print Master Sheet</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Batch Reset Bar (Admin Authority) */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Reset Operations:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBatchMode('default');
                  setIsConfirmBatchOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Passwords to Default (Teacher@123)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBatchMode('unique');
                  setIsConfirmBatchOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold transition border border-blue-700 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset All to Unique Passwords (Teach@EmpId)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="bg-emerald-900 text-emerald-100 px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-emerald-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search faculty by name, employee ID, class or phone..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllPasswords}
                onChange={(e) => setShowAllPasswords(e.target.checked)}
                className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
              />
              <span>Reveal All Passwords</span>
            </label>

            <span className="text-xs text-slate-400 font-bold">
              Showing {filteredTeachers.length} of {teachers.length} Teachers
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">Faculty Member</th>
                  <th className="py-3 px-3.5">Assigned Class</th>
                  <th className="py-3 px-3.5">Mobile Phone</th>
                  <th className="py-3 px-3.5">Current Password</th>
                  <th className="py-3 px-3.5 text-right">Admin Reset & Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredTeachers.map((teacher, idx) => {
                  const pass = teacher.password || 'Teacher@123';
                  const isVisible = showAllPasswords || !!visiblePasswordMap[teacher.id];
                  const isEditingThis = editingTeacherId === teacher.id;

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px] font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-slate-900">{teacher.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {teacher.empId} • {teacher.designation}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        {teacher.assignedClass ? (
                          <span className="bg-blue-50 text-blue-950 font-extrabold px-2 py-0.5 rounded-lg border border-blue-200 text-[11px]">
                            {teacher.assignedClass}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Subject Faculty</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-700 font-medium">
                        {teacher.phone}
                      </td>

                      {/* Password Field */}
                      <td className="py-3 px-3.5">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customPasswordInput}
                              onChange={(e) => setCustomPasswordInput(e.target.value)}
                              placeholder="New password..."
                              className="bg-amber-50 border border-amber-400 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-950 w-36 focus:outline-none"
                            />
                            <button
                              onClick={() => handleResetSingle(teacher, customPasswordInput)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingTeacherId(null);
                                setCustomPasswordInput('');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-950 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs">
                              {isVisible ? pass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(teacher.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={isVisible ? 'Hide password' : 'Show password'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(pass, teacher.id)}
                              className="p-1 rounded text-slate-400 hover:text-blue-900 cursor-pointer"
                              title="Copy password"
                            >
                              {copiedId === teacher.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Reset to Default (Admin) */}
                          <button
                            onClick={() => handleResetSingle(teacher, 'Teacher@123')}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Reset to default Teacher@123"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-600" />
                            <span>Reset (Default)</span>
                          </button>

                          {/* Custom Password Input Trigger */}
                          <button
                            onClick={() => {
                              setEditingTeacherId(teacher.id);
                              setCustomPasswordInput(pass);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Set custom password as Admin"
                          >
                            <KeyRound className="w-3 h-3 text-amber-700" />
                            <span>Set New</span>
                          </button>

                          {/* WhatsApp Credentials to Teacher */}
                          <button
                            onClick={() => handleWhatsAppTeacher(teacher)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                            title="WhatsApp login link and password to teacher"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Security Rule: Individual teachers can <b>create their new password</b> in their class portal, but <b>only Admin Anil Singh</b> can execute password resets.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Console
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Batch Reset */}
      {isConfirmBatchOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Confirm Admin Batch Password Reset?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                You are about to reset passwords for <b>all {teachers.length} faculty members</b> to{' '}
                {batchMode === 'default' ? (
                  <span className="font-mono font-bold text-amber-900">"Teacher@123"</span>
                ) : (
                  <span className="font-mono font-bold text-blue-900">"Teach@EmpId"</span>
                )}
                . Teachers will use this new password to access their class portals.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirmBatchOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBatchReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 text-amber-300 font-black text-xs shadow-md transition cursor-pointer"
              >
                Confirm Batch Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
