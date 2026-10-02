import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { DataBackupModal } from './DataBackupModal';
import { SchoolLogoManager } from './SchoolLogoManager';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Database,
  Lock,
  UserCheck,
  FileSpreadsheet,
  AtSign,
  ExternalLink,
  Send,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { SetFeePasswordModal } from '../fees/SetFeePasswordModal';

interface SettingsManagementProps {
  onNavigate?: (module: any) => void;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ onNavigate }) => {
  const { settings, updateSettings, exportDatabaseJSON, importDatabaseJSON, resetToDemoData, currentUser } = useSchool();

  const [formData, setFormData] = useState(settings);
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail || settings.email || 'anilsingh636@gmail.com');
  const [syncWithAdminAccount, setSyncWithAdminAccount] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSetFeePassModalOpen, setIsSetFeePassModalOpen] = useState(false);

  useEffect(() => {
    // Only synchronize formData from external settings when the user is NOT actively editing uncommitted form inputs
    if (!isDirty) {
      setFormData(settings);
      setAdminEmail(settings.adminEmail || settings.email || 'anilsingh636@gmail.com');
    }
  }, [settings, isDirty]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const payload = {
      ...formData,
      schoolName: formData.schoolName?.trim() || settings.schoolName,
      principalName: formData.principalName?.trim() || settings.principalName,
      affiliationNo: formData.affiliationNo?.trim() ?? settings.affiliationNo,
      schoolCode: formData.schoolCode?.trim() ?? settings.schoolCode,
      academicSession: formData.academicSession?.trim() || settings.academicSession,
      adminName: formData.adminName?.trim() || settings.adminName || 'Anil Singh',
      adminPhone: formData.adminPhone?.trim() || formData.phone?.trim() || settings.adminPhone || '9452305199',
      phone: formData.phone?.trim() || formData.adminPhone?.trim() || settings.phone || '9452305199',
      contactNumber: formData.phone?.trim() || formData.adminPhone?.trim() || settings.phone || '9452305199',
      address: formData.schoolAddress?.trim() || formData.address?.trim() || settings.address,
      schoolAddress: formData.schoolAddress?.trim() || formData.address?.trim() || settings.schoolAddress,
      tagline: formData.schoolTagline?.trim() || formData.tagline?.trim() || settings.tagline,
      schoolTagline: formData.schoolTagline?.trim() || formData.tagline?.trim() || settings.schoolTagline,
      email: formData.email?.trim() || settings.email,
      adminEmail: syncWithAdminAccount ? (formData.email?.trim() || settings.email) : adminEmail.trim(),
      absentFinePerDay: formData.absentFinePerDay !== undefined ? Number(formData.absentFinePerDay) : (settings.absentFinePerDay ?? 5),
      upiId: formData.upiId?.trim() ?? settings.upiId,
      logoUrl: formData.logoUrl !== undefined ? formData.logoUrl : settings.logoUrl,
      stampUrl: formData.stampUrl !== undefined ? formData.stampUrl : settings.stampUrl,
    };
    updateSettings(payload);
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleQuickSaveEmail = (newEmail: string) => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    const updated = {
      ...formData,
      email: trimmed,
      adminEmail: syncWithAdminAccount ? trimmed : adminEmail,
    };
    setFormData(updated);
    if (syncWithAdminAccount) setAdminEmail(trimmed);
    updateSettings({
      email: trimmed,
      adminEmail: syncWithAdminAccount ? trimmed : adminEmail,
    });
    setIsDirty(false);
    setEmailUpdateSuccess(true);
    setTimeout(() => setEmailUpdateSuccess(false), 3500);
  };

  // Full Database Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SBSC-Complete-ERP-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full Restore from File
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = importDatabaseJSON(text);
        if (success) {
          setRestoreMessage('System database successfully restored!');
          setTimeout(() => setRestoreMessage(''), 3500);
        } else {
          alert('Invalid backup file structure or corrupted data.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset to Factory Seed Data
  const handleResetFactory = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all data to default SBSC Public School demo database? All custom inputs will be refreshed.'
      )
    ) {
      resetToDemoData();
      setFormData(settings);
      setRestoreMessage('System successfully reset to factory demo records!');
      setTimeout(() => setRestoreMessage(''), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-blue-900" />
            <span>School Configuration & System Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Institutional Settings & Admin Options</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure school profile, official board affiliation, active e-mail, UPI, backups, and administrative privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              id="btn-save-top"
              type="button"
              onClick={() => handleSubmit()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition cursor-pointer animate-pulse"
              title="Save all changes to institutional settings"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>Save Changes (सेव करें)</span>
            </button>
          )}

          {saveSuccess && (
            <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fadeIn">
              <CheckCircle className="w-4 h-4" /> Settings Saved & Synced!
            </span>
          )}

          <button
            id="btn-backup-data"
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
            title="Export student and fee records as JSON or CSV"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>Backup Data</span>
            <span className="bg-blue-800 text-[10px] text-blue-200 px-1.5 py-0.5 rounded font-mono">
              JSON / CSV
            </span>
          </button>
        </div>
      </div>

      {/* DEDICATED ADMIN OPTIONS: APP & SCHOOL E-MAIL CONFIGURATION CARD */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <AtSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  App & Institutional E-mail Options
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active in ERP
                </span>
              </div>
              <p className="text-blue-200/80 text-xs">
                Manage the primary email address used across all report cards, receipts, WhatsApp notifications, and admin login.
              </p>
            </div>
          </div>

          {emailUpdateSuccess && (
            <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <CheckCircle className="w-4 h-4" />
              <span>E-mail Updated Successfully!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 text-xs">
          {/* Email Editing Form */}
          <div className="lg:col-span-7 space-y-3.5">
            <div>
              <label className="block text-blue-200 font-bold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  App / Official School Contact E-mail *
                </span>
                <span className="text-[11px] text-amber-300 font-mono">
                  Current: {formData.email || 'None'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, email: val });
                    if (syncWithAdminAccount) setAdminEmail(val);
                  }}
                  placeholder="e.g. anilsingh636@gmail.com"
                  className="w-full bg-slate-900/90 border-2 border-blue-500/70 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none transition shadow-inner"
                />
              </div>
              <p className="text-[11px] text-blue-300/80 mt-1">
                This email is stamped on all 11 Printable A4 Reports, Student Marksheets, Fee Receipts, and Transfer Certificates.
              </p>
            </div>

            {/* Quick 1-Click Preset Buttons */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-blue-300/80 font-bold block mb-1.5">
                ⚡ Quick 1-Click E-mail Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSaveEmail('anilsingh636@gmail.com')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
                    formData.email === 'anilsingh636@gmail.com'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-blue-900/60 hover:bg-blue-800 text-blue-100 border-blue-700/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>anilsingh636@gmail.com</span>
                  {formData.email === 'anilsingh636@gmail.com' && <CheckCircle className="w-3 h-3 text-slate-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSaveEmail('sbscpublicschool@gmail.com')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
                    formData.email === 'sbscpublicschool@gmail.com'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-blue-900/60 hover:bg-blue-800 text-blue-100 border-blue-700/60'
                  }`}
                >
                  <span>sbscpublicschool@gmail.com</span>
                  {formData.email === 'sbscpublicschool@gmail.com' && <CheckCircle className="w-3 h-3 text-slate-950" />}
                </button>
              </div>
            </div>

            {/* Administrator Account Login E-mail Option */}
            <div className="p-3 bg-blue-900/40 border border-blue-800/70 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-blue-100 font-bold flex items-center gap-1.5 text-xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Administrator Account Login Email</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncWithAdminAccount}
                    onChange={(e) => {
                      setSyncWithAdminAccount(e.target.checked);
                      if (e.target.checked) setAdminEmail(formData.email);
                    }}
                    className="rounded text-amber-400 focus:ring-0"
                  />
                  <span>Same as App Email</span>
                </label>
              </div>

              {!syncWithAdminAccount && (
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. anilsingh636@gmail.com"
                  className="w-full bg-slate-900/90 border border-blue-600 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none"
                />
              )}
              <p className="text-[10px] text-blue-300/70">
                Connected to Admin User (<code className="text-amber-300">{currentUser.name}</code>). Updating this ensures administrator notifications and password recovery reach your verified inbox.
              </p>
            </div>

            {/* Actions: Save & Test */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickSaveEmail(formData.email)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black flex items-center gap-1.5 shadow transition text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save App E-mail</span>
              </button>

              <a
                href={`mailto:${formData.email}?subject=SBSC%20School%20ERP%20Email%20Test&body=Hello%20Administrator,%0D%0A%0D%0AThis%20is%20a%20verification%20test%20from%20SBSC%20Public%20School%20ERP.%20Active%20Email:%20${formData.email}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-blue-100 border border-blue-700 font-bold flex items-center gap-1.5 transition text-xs"
                title="Send test email via your device's mail client"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>Test E-mail Client (Mailto)</span>
              </a>
            </div>
          </div>

          {/* Live Preview on Documents */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-blue-800/80 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                📄 Live Preview on Official Documents:
              </span>

              <div className="bg-white text-slate-900 p-3 rounded-lg border border-slate-300 shadow-sm space-y-1.5 text-center">
                <div className="font-extrabold text-blue-950 text-xs font-serif uppercase tracking-tight">
                  {formData.schoolName || 'SBSC PUBLIC SCHOOL'}
                </div>
                <div className="text-[10px] text-slate-600">
                  {formData.schoolAddress || formData.address || 'Bairwa Nankar, Naugarh Road'}, Siddharthnagar
                </div>
                <div className="text-[9px] text-slate-700 flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-200">
                  <span className="font-mono font-bold text-blue-900">📞 {formData.phone || '+91 94508 12345'}</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    ✉️ {formData.email || 'anilsingh636@gmail.com'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-blue-950/60 rounded-lg border border-blue-800/50 space-y-1 text-[11px] text-blue-200">
              <span className="font-bold text-white block">Where this email is used:</span>
              <ul className="space-y-0.5 list-disc list-inside text-blue-200/90 text-[10px]">
                <li>Header on all 11 Printable A4 PDF Reports & Marksheets</li>
                <li>Official Fee Receipts (Printed & Thermal 80mm)</li>
                <li>Transfer, Bonafide & Character Certificates</li>
                <li>WhatsApp & SMS Fee Reminders Contact Footer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED ADMIN OPTIONS: SCHOOL LOGO & OFFICIAL PRINCIPAL STAMP UPLOADER */}
      <SchoolLogoManager />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
            <Building className="w-4 h-4 text-blue-900" />
            <span>Institutional Identity & Accreditation Parameters</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Official School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={(e) => {
                    setFormData({ ...formData, schoolName: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-extrabold text-blue-950 text-sm focus:outline-blue-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Motto / Tagline</label>
                <input
                  type="text"
                  value={formData.schoolTagline || formData.tagline || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, schoolTagline: e.target.value, tagline: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Full Campus Address *</label>
                <input
                  type="text"
                  required
                  value={formData.schoolAddress || formData.address || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, schoolAddress: e.target.value, address: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Education Board (शिक्षा बोर्ड)</label>
                <input
                  type="text"
                  value={formData.board || 'UP BOARD'}
                  onChange={(e) => {
                    setFormData({ ...formData, board: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                  placeholder="e.g. UP BOARD"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Affiliation / Board Reg. No.</label>
                <input
                  type="text"
                  value={formData.affiliationNo}
                  onChange={(e) => {
                    setFormData({ ...formData, affiliationNo: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">School Identification Code</label>
                <input
                  type="text"
                  value={formData.schoolCode}
                  onChange={(e) => {
                    setFormData({ ...formData, schoolCode: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Principal / Head of Institution</label>
                <input
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => {
                    setFormData({ ...formData, principalName: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Academic Session Active</label>
                <input
                  type="text"
                  value={formData.academicSession}
                  onChange={(e) => {
                    setFormData({ ...formData, academicSession: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                  <span>School Administrator / Manager Name</span>
                  <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    Provides Teacher Passwords
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.adminName ?? ''}
                  onChange={(e) => {
                    setFormData({ ...formData, adminName: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Anil Singh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Name shown on Teacher Lock Screen and portal authorization headers.
                </span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                  <span>Admin Contact / Mobile Number *</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Helpline: 9452305199
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.phone ?? formData.adminPhone ?? ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                      adminPhone: e.target.value,
                      contactNumber: e.target.value,
                    });
                    setIsDirty(true);
                  }}
                  placeholder="9452305199"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-950"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Teachers contact this number via WhatsApp or Phone to request their class login password.
                </span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                  <span>Official Administrative Email *</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Synced with Header
                  </span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, email: val });
                    if (syncWithAdminAccount) setAdminEmail(val);
                    setIsDirty(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                  <span>School UPI ID (For Fees & QR)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Active UPI</span>
                </label>
                <input
                  type="text"
                  value={formData.upiId ?? ''}
                  onChange={(e) => {
                    setFormData({ ...formData, upiId: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="e.g. anilsingh636-2@oksbi"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-900"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Used in WhatsApp reminders, SMS alerts, receipts & QR codes for digital fee collection.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                  <span>Student Absent Fine Rate (छात्र अनुपस्थिति अर्थदंड दर)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                    रु 5 प्रति दिन (Default)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formData.absentFinePerDay ?? 5}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setFormData({ ...formData, absentFinePerDay: val });
                      setIsDirty(true);
                    }}
                    placeholder="5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-7 pr-3 font-bold text-slate-900 focus:outline-blue-900"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  यह अर्थदंड 1 अनुपस्थिति = ₹5 प्रति दिन के हिसाब से केवल अनुपस्थित (Absent) छात्रों के WhatsApp/SMS संदेश में स्वतः जुड़ेगा।
                </span>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md transition"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save School Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Database Backup & Restore Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Data Backup & Restore</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export full school records (students, teachers, fees, exam marks, attendance) to a secure JSON file, or restore
              from an existing backup.
            </p>

            {restoreMessage && (
              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 text-xs font-bold">
                {restoreMessage}
              </div>
            )}

            <div className="space-y-3">
              {/* Manual Student & Fee Records Backup Action */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-700" />
                    Manual Records Export
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                    JSON / CSV
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Trigger on-demand manual export of current student and fee collection records as a JSON or CSV file.
                </p>
                <button
                  id="btn-backup-data-card"
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>Backup Data</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Full ERP System Backup
                </span>

                {/* Backup Download Button */}
                <button
                  onClick={handleDownloadBackup}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download Full Database Backup (JSON)</span>
                </button>

                {/* Restore File Input */}
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs border border-blue-200 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-blue-900" />
                  <span>Restore Database from File</span>
                  <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
                </label>

                {/* Reset to Factory Defaults */}
                <button
                  onClick={handleResetFactory}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Demo Seed Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Fees Security & Password Protection Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-900" />
                <span>Fees Security & Password</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Active</span>
              </span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              फीस विकल्प पासवर्ड द्वारा सुरक्षित हैं और केवल अधिकृत एडमिन पासवर्ड द्वारा खोले जा सकते हैं। (Fees options require Admin password verification to access collections, zero-fee discounts, or receipt cancellations).
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">Access Restriction:</span>
                <span className="font-bold text-blue-950">Administrator Only</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">Master Fallback:</span>
                <span className="font-mono text-slate-900 font-bold">Admin@123</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">Last Changed:</span>
                <span className="font-mono text-slate-500">{settings.feePasswordLastUpdated || 'Default Active'}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setIsSetFeePassModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-black text-xs shadow-sm transition cursor-pointer active:scale-98"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Set / Change Fees Password (पासवर्ड बदलें)</span>
              </button>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('fees')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open Fees Management (फीस पोर्टल खोलें)</span>
                </button>
              )}
            </div>
          </div>

          {/* User Roles & Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Shield className="w-4 h-4 text-blue-900" />
              <span>Role Access Control</span>
            </h3>

            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Administrator / Principal:</span>
                <span className="text-emerald-700 font-bold">Full Master Access</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Faculty / Teacher:</span>
                <span className="text-blue-900 font-bold">Marks & Attendance</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Accountant:</span>
                <span className="text-emerald-800 font-bold">Fee Collection & Dues</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-900">Student & Parent:</span>
                <span className="text-slate-700 font-bold">Profile, Report Cards, Dues</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Data Backup Modal for Students & Fees */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Set Fees Option Password Modal */}
      {isSetFeePassModalOpen && (
        <SetFeePasswordModal
          isOpen={isSetFeePassModalOpen}
          onClose={() => setIsSetFeePassModalOpen(false)}
          requireOldPassword={true}
        />
      )}
    </div>
  );
};

