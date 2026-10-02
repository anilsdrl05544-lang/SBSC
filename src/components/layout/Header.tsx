import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { getAllCelebrants, getTodaysCelebrants } from '../../utils/birthdayUtils';
import {
  Menu,
  Search,
  Printer,
  BellRing,
  User,
  Shield,
  GraduationCap,
  Calendar,
  Smartphone,
  QrCode,
  Share2,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Cake,
  Database,
  Sparkles,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  onNavigate: (module: string) => void;
  onOpenShareMobile?: () => void;
  onOpenBackupModal?: () => void;
  onOpenBirthdayModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenLogin,
  onNavigate,
  onOpenShareMobile,
  onOpenBackupModal,
  onOpenBirthdayModal,
}) => {
  const {
    settings,
    currentUser,
    notices,
    students,
    teachers,
    classes,
    isOfflineMode,
    toggleOfflineMode,
    cloudSyncStatus,
    lastCloudSyncTime,
    syncAllToCloud,
    autoBackupConfig,
    lastAutoBackupTime,
  } = useSchool();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const allCelebrants = useMemo(() => getAllCelebrants(students, teachers, classes), [students, teachers, classes]);
  const todaysBirthdaysCount = useMemo(() => getTodaysCelebrants(allCelebrants).length, [allCelebrants]);

  const handleManualSync = async () => {
    if (cloudSyncStatus === 'quota_exceeded') {
      setSyncFeedback('Daily quota reached • Saved locally');
      setTimeout(() => setSyncFeedback(null), 3500);
      return;
    }

    setIsManualSyncing(true);
    setSyncFeedback('Syncing with Cloud...');
    try {
      const ok = await syncAllToCloud();
      if (ok) {
        setSyncFeedback('✓ All Data Online!');
      } else {
        setSyncFeedback('Sync Offline');
      }
    } catch {
      setSyncFeedback('Sync Error');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile Sidebar Toggle + Brand Details */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
            <span>{settings.schoolName}</span>
            <span className="hidden md:inline-block text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
              ERP v3.2
            </span>
          </h2>
          <p className="text-[10px] text-slate-500 font-medium">
            Affiliation No: {settings.affiliationNo} • {settings.schoolAddress || settings.address}
          </p>
        </div>
      </div>

      {/* Center / Right: Quick Search Button & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Bar trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition"
        >
          <Search className="w-4 h-4 text-blue-900" />
          <span className="hidden md:inline">Quick Search...</span>
          <kbd className="hidden md:inline-block bg-white text-slate-500 border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Offline / Online Mode Toggle */}
        <button
          onClick={() => toggleOfflineMode()}
          title={
            isOfflineMode
              ? 'Offline Mode is ACTIVE (All changes stay 100% in local storage, no cloud sync). Click to switch to Online Sync.'
              : 'Online Mode is ACTIVE (Syncs to Firestore Cloud). Click to turn on Offline Mode.'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
            isOfflineMode
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 ring-1 ring-amber-300'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isOfflineMode ? (
            <WifiOff className="w-3.5 h-3.5 text-amber-800" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-emerald-700" />
          )}
          <span className="hidden md:inline text-[11px]">
            {isOfflineMode ? 'Offline Mode (Local)' : 'Online Mode'}
          </span>
        </button>

        {/* Cloud Online Database Status & 1-Click Sync */}
        <button
          onClick={handleManualSync}
          disabled={isManualSyncing || isOfflineMode}
          title={
            isOfflineMode
              ? 'Cloud Sync paused while in Offline Mode. Click "Offline Mode" to switch to Online.'
              : syncFeedback ||
                (cloudSyncStatus === 'online'
                  ? `Cloud Database Online (Live Sync) • Last synced: ${lastCloudSyncTime || 'Just now'} • Click to push now`
                  : cloudSyncStatus === 'syncing'
                  ? 'Syncing with Firestore Cloud Database...'
                  : cloudSyncStatus === 'quota_exceeded'
                  ? 'Firebase Free Daily Quota Reached (20,000 writes/day) • Operating safely in Local Storage mode • All changes saved locally • Click to test retry'
                  : 'Cloud Database Reconnecting • Click to retry')
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
            isOfflineMode
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              : cloudSyncStatus === 'online'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              : cloudSyncStatus === 'syncing' || isManualSyncing
              ? 'bg-blue-50 text-blue-900 border-blue-300 animate-pulse'
              : cloudSyncStatus === 'quota_exceeded'
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
          }`}
        >
          {cloudSyncStatus === 'syncing' || isManualSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin" />
          ) : cloudSyncStatus === 'online' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-amber-700" />
          )}
          <span className="hidden md:inline text-[11px]">
            {syncFeedback || (
              cloudSyncStatus === 'online'
                ? 'All Data Online'
                : cloudSyncStatus === 'syncing'
                ? 'Syncing...'
                : cloudSyncStatus === 'quota_exceeded'
                ? 'Local Mode (Cloud Quota)'
                : 'Cloud Offline'
            )}
          </span>
        </button>

        {/* Auto-Backup Status Indicator */}
        {onOpenBackupModal && (
          <button
            onClick={onOpenBackupModal}
            title={`Automated Data Backup: ${autoBackupConfig.enabled ? 'Active (' + autoBackupConfig.frequency + ')' : 'Disabled'} • Last: ${lastAutoBackupTime ? new Date(lastAutoBackupTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border-slate-200"
          >
            <Database className="w-3.5 h-3.5 text-blue-900" />
            <span className="text-[11px]">
              Auto-Backup: <b className="text-emerald-700">{autoBackupConfig.enabled ? 'On' : 'Off'}</b>
            </span>
          </button>
        )}

        {/* Student & Parent Read-Only Indicator */}
        {(currentUser.role === 'student' || currentUser.role === 'parent') && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Read-Only Student Record</span>
          </div>
        )}

        {/* Birthday Celebrations & Notifications Hub (Staff only) */}
        {currentUser.role !== 'student' && currentUser.role !== 'parent' && onOpenBirthdayModal && (
          <button
            onClick={onOpenBirthdayModal}
            title={
              todaysBirthdaysCount > 0
                ? `🎂 ${todaysBirthdaysCount} Birthday${todaysBirthdaysCount === 1 ? '' : 's'} Today! Click to view & send wishes`
                : 'Birthday Congratulations & Date-Wise Hub'
            }
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer ${
              todaysBirthdaysCount > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-bounce-subtle'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <Cake className="w-3.5 h-3.5 text-amber-950" />
            <span className="hidden md:inline text-[11px]">
              {todaysBirthdaysCount > 0 ? `Birthdays (${todaysBirthdaysCount})` : 'Birthdays'}
            </span>
            {todaysBirthdaysCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                {todaysBirthdaysCount}
              </span>
            )}
          </button>
        )}

        {/* 1-Click A4 PDF Reports Button (Staff only) */}
        {currentUser.role !== 'student' && currentUser.role !== 'parent' && (
          <button
            onClick={() => onNavigate('reports')}
            title="Open Official A4 PDF Reports Hub"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 text-xs font-bold border border-blue-200 transition"
          >
            <Printer className="w-4 h-4 text-blue-900" />
            <span className="hidden sm:inline">11 A4 Reports</span>
          </button>
        )}

        {/* Mobile Phone Public Link & QR Code */}
        {onOpenShareMobile && (
          <button
            onClick={onOpenShareMobile}
            title="Open on Mobile Phone or Share via WhatsApp"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold border border-emerald-200 transition shadow-2xs"
          >
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Mobile App / Share</span>
          </button>
        )}

        {/* Notices shortcut */}
        <button
          onClick={() => onNavigate('notices')}
          title="School Notices"
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <BellRing className="w-4 h-4" />
          {notices.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"></span>
          )}
        </button>

        {/* User Role Profile Badge & Switcher */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs">
            {currentUser.role.toLowerCase() === 'admin' ? (
              <Shield className="w-4 h-4" />
            ) : currentUser.role.toLowerCase() === 'teacher' ? (
              <GraduationCap className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <span className="font-bold text-slate-900 block leading-tight truncate max-w-[130px]">{currentUser.name}</span>
            <span className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">
              {currentUser.role.toLowerCase() === 'teacher'
                ? currentUser.assignedClass
                  ? `In-Charge (${currentUser.assignedClass})`
                  : 'Faculty'
                : `${currentUser.role} Portal`}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
