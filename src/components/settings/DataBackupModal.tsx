import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { exportTableToCsv } from '../../services/pdfService';
import {
  X,
  Download,
  Database,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  Users,
  CreditCard,
  Calendar,
  Layers,
  FileText,
  Sparkles,
  Info,
  RefreshCw,
  Clock,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Smartphone,
  Cloud,
} from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const {
    students,
    feePayments,
    classes,
    teachers,
    settings,
    getStudentDueAmount,
    autoBackupConfig,
    autoBackupSnapshots,
    lastAutoBackupTime,
    updateAutoBackupConfig,
    triggerManualAutoBackup,
    restoreFromAutoBackupSnapshot,
    deleteAutoBackupSnapshot,
    downloadAutoBackupSnapshot,
    cloudSyncStatus,
    lastCloudSyncTime,
    syncAllToCloud,
    pullAllFromCloud,
    importDatabaseJSON,
  } = useSchool();
  const [activeTab, setActiveTab] = useState<'all' | 'upload_sync' | 'auto_backup' | 'json' | 'csv'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [uploadedFileStats, setUploadedFileStats] = useState<{
    fileName: string;
    studentCount: number;
    feeCount: number;
    content: string;
  } | null>(null);

  if (!isOpen) return null;

  const totalFeeCollected = feePayments.reduce((acc, f) => acc + (Number(f.amountPaid) || 0), 0);
  const activeStudentsCount = students.filter((s) => s.status === 'Active').length;

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const handleTriggerInstantBackup = () => {
    const snap = triggerManualAutoBackup();
    showNotification(`✓ Automated snapshot successfully generated (${snap.sizeKb} KB) and synced to Cloud!`);
  };

  const handleConfirmRestore = (snapshotId: string) => {
    setIsRestoring(true);
    const ok = restoreFromAutoBackupSnapshot(snapshotId);
    setIsRestoring(false);
    setSnapshotToRestore(null);
    if (ok) {
      showNotification('✓ System state successfully restored from snapshot!');
    } else {
      showNotification('Failed to restore snapshot. Please verify file integrity.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const sCount = Array.isArray(parsed.students) ? parsed.students.length : (parsed.summary?.totalStudentsCount || 0);
        const fCount = Array.isArray(parsed.feePayments) ? parsed.feePayments.length : (parsed.summary?.totalFeePaymentsCount || 0);
        setUploadedFileStats({
          fileName: file.name,
          studentCount: sCount,
          feeCount: fCount,
          content: text,
        });
      } catch {
        showNotification('⚠️ Invalid JSON file format. Please upload a valid backup .json file.');
      }
    };
    reader.readAsText(file);
  };

  const handleApplyUploadedBackup = async () => {
    if (!uploadedFileStats) return;
    setIsRestoring(true);
    try {
      const ok = importDatabaseJSON(uploadedFileStats.content);
      if (ok) {
        showNotification('✓ Backup restored & synced to Cloud! All other mobile devices will now show this uploaded data.');
        setUploadedFileStats(null);
      } else {
        showNotification('⚠️ Failed to restore database from file.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSyncToCloudNow = async () => {
    setIsSyncingCloud(true);
    try {
      const ok = await syncAllToCloud();
      if (ok) {
        showNotification('✓ Live school data successfully pushed to Cloud! All other mobiles will receive this immediately.');
      } else {
        showNotification('Cloud sync saved locally. Will retry cloud push automatically.');
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullFromCloudNow = async () => {
    setIsSyncingCloud(true);
    try {
      const ok = await pullAllFromCloud();
      if (ok) {
        showNotification('✓ Latest records pulled from Cloud successfully!');
      } else {
        showNotification('Could not pull from cloud. Local records maintained.');
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // 1. Export as JSON (Students and Fee Records)
  const handleExportJson = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const exportPayload = {
      backupType: 'Institutional Student & Fee Records Manual Backup',
      version: '1.0',
      schoolName: settings.schoolName,
      affiliationNo: settings.affiliationNo || '',
      schoolCode: settings.schoolCode || '',
      academicSession: settings.academicSession,
      exportedAt: new Date().toISOString(),
      exportedAtFormattedDDMMYYYY: formatDateToDDMMYYYY(todayStr),
      summary: {
        totalStudentsCount: students.length,
        activeStudentsCount,
        totalFeePaymentsCount: feePayments.length,
        totalFeeAmountCollected: totalFeeCollected,
      },
      students: students.map((s) => {
        const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
        return {
          id: s.id,
          admissionNo: s.admissionNo,
          rollNo: s.rollNo,
          fullName: s.fullName,
          classId: s.classId,
          className: cls,
          section: s.section,
          gender: s.gender,
          dob: s.dob,
          dobDDMMYYYY: formatDateToDDMMYYYY(s.dob),
          fatherName: s.fatherName,
          motherName: s.motherName,
          guardianPhone: s.guardianPhone,
          email: s.email || '',
          address: s.address,
          bloodGroup: s.bloodGroup,
          aadhaarNo: s.aadhaarNo || '',
          category: s.category,
          admissionDate: s.admissionDate,
          admissionDateDDMMYYYY: formatDateToDDMMYYYY(s.admissionDate),
          status: s.status,
          emergencyContact: s.emergencyContact || '',
          previousSchool: s.previousSchool || '',
        };
      }),
      feePayments: feePayments.map((f) => {
        const cls = classes.find((c) => c.id === f.classId)?.name || f.classId;
        return {
          id: f.id,
          receiptNo: f.receiptNo,
          studentId: f.studentId,
          studentName: f.studentName,
          admissionNo: f.admissionNo,
          classId: f.classId,
          className: cls,
          section: f.section,
          date: f.date,
          dateDDMMYYYY: formatDateToDDMMYYYY(f.date),
          monthsPaid: f.monthsPaid || [],
          amountPaid: f.amountPaid,
          paymentMethod: f.paymentMethod,
          transactionRef: f.transactionRef || '',
          feeHeadBreakdown: f.feeHeadBreakdown || [],
          discount: f.discount || 0,
          fine: f.fine || 0,
          totalDueBefore: f.totalDueBefore || 0,
          balanceRemaining: f.balanceRemaining || 0,
          remarks: f.remarks || '',
          receivedBy: f.receivedBy,
          academicSession: f.academicSession,
        };
      }),
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SBSC-Students-And-Fees-Backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification(`Exported ${students.length} student records and ${feePayments.length} fee records as JSON file!`);
  };

  // 2. Export Students CSV
  const handleExportStudentsCsv = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const headers = [
      'Admission No',
      'Roll No',
      'Full Name',
      'Class',
      'Section',
      'Gender',
      'DOB (DD/MM/YYYY)',
      'Father Name',
      'Mother Name',
      'Guardian Phone',
      'Email',
      'Address',
      'Blood Group',
      'Aadhaar No',
      'Category',
      'Admission Date (DD/MM/YYYY)',
      'Status',
      'Emergency Contact',
      'Previous School',
    ];

    const rows = students.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
      return [
        s.admissionNo,
        s.rollNo,
        s.fullName,
        cls,
        s.section,
        s.gender,
        formatDateToDDMMYYYY(s.dob),
        s.fatherName,
        s.motherName,
        s.guardianPhone,
        s.email || '',
        s.address,
        s.bloodGroup,
        s.aadhaarNo || '',
        s.category,
        formatDateToDDMMYYYY(s.admissionDate),
        s.status,
        s.emergencyContact || '',
        s.previousSchool || '',
      ];
    });

    exportTableToCsv(`SBSC-Students-Backup-${todayStr}.csv`, [headers, ...rows]);
    showNotification(`Exported ${students.length} student records to CSV!`);
  };

  // 3. Export Fees CSV
  const handleExportFeesCsv = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const headers = [
      'Receipt No',
      'Student Name',
      'Admission No',
      'Class',
      'Section',
      'Payment Date (DD/MM/YYYY)',
      'Amount Paid (₹)',
      'Payment Method',
      'Months Paid',
      'Fee Head Breakdown',
      'Total Due Before (₹)',
      'Balance Remaining (₹)',
      'Discount (₹)',
      'Fine (₹)',
      'Transaction Ref',
      'Remarks',
      'Received By',
      'Academic Session',
    ];

    const rows = feePayments.map((f) => {
      const cls = classes.find((c) => c.id === f.classId)?.name || f.classId;
      const breakdown = (f.feeHeadBreakdown || []).map((h) => `${h.head}: ₹${h.amount}`).join('; ');
      return [
        f.receiptNo,
        f.studentName,
        f.admissionNo,
        cls,
        f.section,
        formatDateToDDMMYYYY(f.date),
        f.amountPaid,
        f.paymentMethod,
        (f.monthsPaid || []).join(', '),
        breakdown,
        f.totalDueBefore,
        f.balanceRemaining,
        f.discount,
        f.fine,
        f.transactionRef || '',
        f.remarks || '',
        f.receivedBy,
        f.academicSession,
      ];
    });

    exportTableToCsv(`SBSC-Fee-Records-Backup-${todayStr}.csv`, [headers, ...rows]);
    showNotification(`Exported ${feePayments.length} fee payment records to CSV!`);
  };

  // 4. Export Consolidated Student & Fee Ledger CSV
  const handleExportConsolidatedCsv = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const headers = [
      'Admission No',
      'Roll No',
      'Student Name',
      'Class',
      'Section',
      'Gender',
      'DOB (DD/MM/YYYY)',
      'Guardian Phone',
      'Category',
      'Status',
      'Fee Receipts Count',
      'Total Fees Paid (₹)',
      'Total Concessions (₹)',
      'Current Net Due (₹)',
      'Latest Receipt No',
      'Latest Payment Date (DD/MM/YYYY)',
      'Latest Payment Method',
      'Latest Balance Remaining (₹)',
    ];

    const rows = students.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
      const studentPayments = feePayments.filter(
        (f) =>
          (f.studentId === s.id || f.admissionNo.toLowerCase() === s.admissionNo.toLowerCase()) &&
          f.status !== 'Cancelled'
      );
      const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const totalDiscount = studentPayments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);
      const netDue = getStudentDueAmount(s.id);
      const latestPayment = studentPayments.length > 0 ? studentPayments[0] : null;

      return [
        s.admissionNo,
        s.rollNo,
        s.fullName,
        cls,
        s.section,
        s.gender,
        formatDateToDDMMYYYY(s.dob),
        s.guardianPhone,
        s.category,
        s.status,
        studentPayments.length,
        totalPaid,
        totalDiscount,
        netDue,
        latestPayment?.receiptNo || 'None',
        latestPayment?.date ? formatDateToDDMMYYYY(latestPayment.date) : '-',
        latestPayment?.paymentMethod || '-',
        latestPayment ? latestPayment.balanceRemaining : 0,
      ];
    });

    exportTableToCsv(`SBSC-Students-And-Fees-Consolidated-${todayStr}.csv`, [headers, ...rows]);
    showNotification(`Exported consolidated student & fee records (${students.length} records) to CSV!`);
  };

  // 5. Download Both CSVs
  const handleExportBothCsv = () => {
    handleExportStudentsCsv();
    setTimeout(() => {
      handleExportFeesCsv();
    }, 600);
  };

  return (
    <div
      id="backup-data-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800/80 border border-blue-400/30 flex items-center justify-center text-amber-300 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Manual Backup: Student & Fee Records</h2>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300/30">
                  JSON / CSV
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Export current institutional student enrolment and fee payment records on-demand.
              </p>
            </div>
          </div>
          <button
            id="btn-close-backup-modal"
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metrics Summary */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-800" />
              Total Students
            </span>
            <span className="text-base font-extrabold text-slate-900">{students.length}</span>
            <span className="text-[10px] text-emerald-700 block font-medium mt-0.5">
              {activeStudentsCount} Active Enrolments
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-700" />
              Fee Transactions
            </span>
            <span className="text-base font-extrabold text-slate-900">{feePayments.length}</span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">Receipts Logged</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-700" />
              Total Collected
            </span>
            <span className="text-base font-extrabold text-emerald-800">
              ₹{totalFeeCollected.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">In School Register</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-800" />
              Active Session
            </span>
            <span className="text-base font-extrabold text-blue-900">{settings.academicSession}</span>
            <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
              {formatDateToDDMMYYYY(new Date().toISOString().slice(0, 10))}
            </span>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 space-y-5">
          {/* Format Selection Tab Pills */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-2">Options:</span>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Options
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auto_backup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'auto_backup'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Backup (स्वचालित बैकअप)</span>
              {autoBackupConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              JSON (.json)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'csv'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV (.csv)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload_sync')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'upload_sync'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>Mobile Sync & Upload (अन्य मोबाइल में दिखाएं)</span>
            </button>
          </div>

          {/* Section: Upload & Mobile Sync (Uploads data show others mobile) */}
          {(activeTab === 'all' || activeTab === 'upload_sync') && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-5 text-white shadow-md border border-purple-800/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black tracking-wide text-white">
                        Multi-Device Cloud Sync (अन्य मोबाइलों में डेटा दिखाएं)
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {cloudSyncStatus === 'online'
                          ? 'ONLINE & CONNECTED'
                          : cloudSyncStatus === 'syncing'
                          ? 'SYNCING...'
                          : cloudSyncStatus === 'quota_exceeded'
                          ? 'QUOTA EXCEEDED (LOCAL SAFE)'
                          : 'STANDBY'}
                      </span>
                    </div>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      Upload school database JSON or push local changes to Firebase so teachers, parents & staff see records instantly on all mobile phones.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncToCloudNow}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>Sync to Cloud Now (अन्य मोबाइल में भेजें)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePullFromCloudNow}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>Pull from Cloud</span>
                  </button>
                </div>
              </div>

              {/* Cloud Daily Quota Exceeded Notice */}
              {cloudSyncStatus === 'quota_exceeded' && (
                <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-100">
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Firebase Free Daily Write Limit Reached (20,000 writes/day)
                    </p>
                    <p className="text-[11px] text-amber-200/80">
                      All student details, password sets, and fee collections are safe in local storage. Quota resets daily at 00:00 UTC, or you can upgrade to pay-as-you-go Blaze.
                    </p>
                  </div>
                  <a
                    href="https://console.firebase.google.com/project/deep-axiom-cxfhk/firestore/databases/ai-studio-sbscschoolmanage-787a01b7-6a8d-4406-9ece-4bfeba789cc1/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs transition shadow-sm cursor-pointer"
                  >
                    Upgrade Database
                  </a>
                </div>
              )}

              {/* Upload JSON file area */}
              <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Upload className="w-4 h-4 text-purple-300" />
                    <span className="text-xs font-bold text-white">Upload School Database Backup (.json)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Select a previously exported or prepared institutional JSON file. Restoring will immediately synchronize it to all connected mobile phones.
                  </p>
                  {lastCloudSyncTime && (
                    <p className="text-[10px] text-purple-300 font-mono">
                      Last Cloud Push: {lastCloudSyncTime}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                  <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-amber-300" />
                    <span>Select .json File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  {uploadedFileStats && (
                    <button
                      type="button"
                      onClick={handleApplyUploadedBackup}
                      disabled={isRestoring}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-md animate-bounce"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>
                        {isRestoring
                          ? 'Restoring & Syncing...'
                          : `Confirm Restore (${uploadedFileStats.studentCount} Students)`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Automated Data Backup (Auto-Backup) */}
          {(activeTab === 'all' || activeTab === 'auto_backup') && (
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-5 text-white shadow-md border border-blue-800/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black tracking-wide text-white">
                        Automated Data Backup System (स्वचालित डेटा बैकअप)
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          autoBackupConfig.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {autoBackupConfig.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      Periodically snapshots all students, teachers, classes, and fee registers with local and cloud redundancy.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerInstantBackup}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Take Snapshot Now</span>
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Toggle Enable */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto-Backup Status</span>
                    <span className="text-[11px] text-blue-200/70">
                      {autoBackupConfig.enabled ? 'Active background timer' : 'Service currently paused'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBackupConfig.enabled}
                      onChange={(e) => updateAutoBackupConfig({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Frequency selector */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">Backup Frequency</span>
                    <Clock className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <select
                    value={autoBackupConfig.frequency}
                    onChange={(e) => updateAutoBackupConfig({ frequency: e.target.value as any })}
                    disabled={!autoBackupConfig.enabled}
                    className="w-full text-xs font-bold bg-slate-800 border border-white/20 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="hourly">Hourly (Every 60 min)</option>
                    <option value="daily">Daily (Once per day - Recommended)</option>
                    <option value="weekly">Weekly (Once every 7 days)</option>
                  </select>
                </div>

                {/* Cloud sync toggle */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto Cloud Sync</span>
                    <span className="text-[11px] text-blue-200/70">Mirror snapshot to Firestore</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBackupConfig.autoCloudSync}
                    onChange={(e) => updateAutoBackupConfig({ autoCloudSync: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Snapshots Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-blue-200 font-bold">
                  <span>Recent Automated Snapshots ({autoBackupSnapshots.length})</span>
                  <span className="text-[11px] text-blue-300/70">
                    Last: {lastAutoBackupTime ? new Date(lastAutoBackupTime).toLocaleString('en-IN') : 'None yet'}
                  </span>
                </div>

                {autoBackupSnapshots.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-xs text-blue-200/70">
                    <p>No automated snapshots recorded yet.</p>
                    <p className="text-[11px] mt-1 text-blue-300/50">
                      Click <b>"Take Snapshot Now"</b> above to capture your first institutional backup archive.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/10 text-blue-200 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-2.5">Date & Time</th>
                          <th className="p-2.5">Trigger Reason</th>
                          <th className="p-2.5">Records Summary</th>
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white text-[11px]">
                        {autoBackupSnapshots.map((snap) => (
                          <tr key={snap.id} className="hover:bg-white/5 transition">
                            <td className="p-2.5 font-mono font-medium">
                              {new Date(snap.timestamp).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold capitalize">
                                {(snap.triggerReason || 'auto_backup').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-2.5 text-blue-200">
                              {snap.summary?.studentsCount ?? 0} Students • {snap.summary?.feePaymentsCount ?? 0} Fees • {snap.summary?.teachersCount ?? 0} Teachers
                            </td>
                            <td className="p-2.5 text-slate-300 font-mono">
                              {snap.sizeKb} KB
                            </td>
                            <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => downloadAutoBackupSnapshot(snap.id)}
                                title="Download JSON Snapshot"
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Download className="w-3 h-3" />
                                <span>JSON</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSnapshotToRestore(snap.id)}
                                title="Restore school data to this snapshot point"
                                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAutoBackupSnapshot(snap.id)}
                                title="Delete Snapshot"
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Format 1: JSON Export Card */}
            {(activeTab === 'all' || activeTab === 'json') && (
              <div
                className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition ${
                  activeTab === 'json' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                        <FileJson className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">JSON Format (.json)</h3>
                        <span className="text-[10px] text-slate-500">Structured Data Interchange</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      .json
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Downloads a single, unified JSON file containing complete records of all{' '}
                    <b>{students.length} students</b> and <b>{feePayments.length} fee payment receipts</b> with full
                    metadata, nested fee head breakdowns, and formatted Indian calendar dates.
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Included Collections:</span>
                      <span className="font-semibold text-slate-800">Students + Fee Payments</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date Format:</span>
                      <span className="font-semibold text-slate-800">ISO & DD/MM/YYYY</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Best For:</span>
                      <span className="font-semibold text-slate-800">System Backups, API, Migration</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100">
                  <button
                    id="btn-export-json"
                    type="button"
                    onClick={handleExportJson}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm hover:shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>
            )}

            {/* Format 2: CSV Export Card */}
            {(activeTab === 'all' || activeTab === 'csv') && (
              <div
                className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition ${
                  activeTab === 'csv' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">CSV Format (.csv)</h3>
                        <span className="text-[10px] text-slate-500">Excel / Google Sheets Compatible</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                      .csv
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Export tabular spreadsheets ready to open directly in Microsoft Excel, Google Sheets, or Apple
                    Numbers with official Indian headers and DD/MM/YYYY dates.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <button
                      id="btn-export-csv-students"
                      type="button"
                      onClick={handleExportStudentsCsv}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 font-bold transition text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-900" />
                        Students Master
                      </span>
                      <Download className="w-3.5 h-3.5 text-slate-400 hover:text-blue-900" />
                    </button>

                    <button
                      id="btn-export-csv-fees"
                      type="button"
                      onClick={handleExportFeesCsv}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 font-bold transition text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                        Fee Receipts Register
                      </span>
                      <Download className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-700" />
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      id="btn-export-csv-consolidated"
                      type="button"
                      onClick={handleExportConsolidatedCsv}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-800 font-bold transition text-left text-[11px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-700" />
                        Consolidated Student & Fee Ledger (.csv)
                      </span>
                      <Download className="w-3.5 h-3.5 text-slate-400 hover:text-purple-700" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100">
                  <button
                    id="btn-export-csv-all"
                    type="button"
                    onClick={handleExportBothCsv}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm hover:shadow transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download All (Students & Fees CSVs)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Data Security & Privacy Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Security & Official Compliance Note:</span>
              <span>
                Exported files contain official school administrative data including student personal details, Aadhaar
                numbers, and financial receipt ledgers. Keep all downloaded backup files in a secure, password-protected
                environment.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">
            SBSC Public School ERP • Backup Module
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Snapshot Restore Confirmation Submodal */}
      {snapshotToRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Confirm System Restore</h4>
                <p className="text-xs text-slate-500">Restore institutional state from snapshot</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Restoring will replace current school records (students, teachers, classes, fee receipts, etc.) with the data saved in this snapshot point. Any changes made after this snapshot was taken will be overwritten.
            </p>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-900 font-medium">
              <b>Safety Notice:</b> A safety snapshot will automatically be archived before this restoration takes place.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(snapshotToRestore)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'Restoring...' : 'Yes, Restore From Snapshot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
