import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BirthdayCelebrant, BirthdayMessageTemplate } from '../../types/birthday';
import {
  getAllCelebrants,
  getTodaysCelebrants,
  getTomorrowsCelebrants,
  getUpcomingCelebrants,
  getCelebrantsForMonthAndDay,
  getCelebrantsForMonth,
  BIRTHDAY_MESSAGE_TEMPLATES,
  formatBirthdayMessage,
  sendBirthdayWishes,
  generateBirthdayWhatsAppUrl,
} from '../../utils/birthdayUtils';
import { PrintableBirthdayCard } from './PrintableBirthdayCard';
import {
  X,
  Cake,
  Calendar,
  Search,
  MessageSquare,
  Printer,
  Phone,
  Filter,
  CheckCircle2,
  Copy,
  Sparkles,
  Send,
  Download,
  Award,
  FileText,
  User,
  GraduationCap,
  Clock,
  ChevronRight,
  ExternalLink,
  Gift,
  PartyPopper,
  SlidersHorizontal,
} from 'lucide-react';

interface BirthdayNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'today' | 'upcoming' | 'month' | 'date_search';
  targetDate?: Date;
}

export const BirthdayNotificationModal: React.FC<BirthdayNotificationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'today',
}) => {
  const { students, teachers, classes, settings } = useSchool();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'month' | 'date_search'>(initialTab);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'teacher'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date-wise search states
  const now = new Date();
  const [searchMonth, setSearchMonth] = useState<number>(now.getMonth() + 1);
  const [searchDay, setSearchDay] = useState<number>(now.getDate());

  // Message composer state
  const [selectedCelebrantForMessage, setSelectedCelebrantForMessage] = useState<BirthdayCelebrant | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('hindi_warm_blessing');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Printable card state
  const [selectedCelebrantForCard, setSelectedCelebrantForCard] = useState<BirthdayCelebrant | null>(null);

  // All celebrants calculated
  const allCelebrants = useMemo(() => {
    return getAllCelebrants(students, teachers, classes);
  }, [students, teachers, classes]);

  const todaysCelebrants = useMemo(() => getTodaysCelebrants(allCelebrants), [allCelebrants]);
  const tomorrowsCelebrants = useMemo(() => getTomorrowsCelebrants(allCelebrants), [allCelebrants]);
  const upcomingCelebrants = useMemo(() => getUpcomingCelebrants(allCelebrants, 7), [allCelebrants]);
  const thisMonthCelebrants = useMemo(() => getCelebrantsForMonth(allCelebrants, now.getMonth() + 1), [allCelebrants, now]);

  // Date-wise search celebrants
  const dateWiseCelebrants = useMemo(() => {
    return getCelebrantsForMonthAndDay(allCelebrants, searchMonth, searchDay);
  }, [allCelebrants, searchMonth, searchDay]);

  // Current tab celebrants
  const currentList = useMemo(() => {
    let list: BirthdayCelebrant[] = [];
    if (activeTab === 'today') list = todaysCelebrants;
    else if (activeTab === 'upcoming') list = upcomingCelebrants;
    else if (activeTab === 'month') list = thisMonthCelebrants;
    else if (activeTab === 'date_search') list = dateWiseCelebrants;

    // Apply Filters
    return list.filter((c) => {
      // Role filter
      if (selectedRole !== 'all' && c.type !== selectedRole) return false;
      // Class filter
      if (selectedClassId !== 'all') {
        if (c.type === 'student' && c.classId !== selectedClassId) return false;
        if (c.type === 'teacher') return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesAdm = c.admissionNo?.toLowerCase().includes(q);
        const matchesClass = c.className?.toLowerCase().includes(q);
        const matchesFather = c.fatherName?.toLowerCase().includes(q);
        const matchesPhone = c.guardianPhone?.includes(q) || c.phone?.includes(q);
        if (!matchesName && !matchesAdm && !matchesClass && !matchesFather && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [
    activeTab,
    todaysCelebrants,
    upcomingCelebrants,
    thisMonthCelebrants,
    dateWiseCelebrants,
    selectedRole,
    selectedClassId,
    searchQuery,
  ]);

  // Open Message Composer for a celebrant
  const handleOpenMessageComposer = (celebrant: BirthdayCelebrant) => {
    setSelectedCelebrantForMessage(celebrant);
    const templateId = celebrant.type === 'teacher' ? 'teacher_birthday_blessing' : 'hindi_warm_blessing';
    setSelectedTemplateId(templateId);
    const template = BIRTHDAY_MESSAGE_TEMPLATES.find((t) => t.id === templateId) || BIRTHDAY_MESSAGE_TEMPLATES[0];
    setCustomMessageText(formatBirthdayMessage(template.templateText, celebrant, settings));
    setDispatchStatus(null);
  };

  // Change Template in Composer
  const handleTemplateChange = (templateId: string) => {
    if (!selectedCelebrantForMessage) return;
    setSelectedTemplateId(templateId);
    const template = BIRTHDAY_MESSAGE_TEMPLATES.find((t) => t.id === templateId) || BIRTHDAY_MESSAGE_TEMPLATES[0];
    setCustomMessageText(formatBirthdayMessage(template.templateText, selectedCelebrantForMessage, settings));
  };

  // Send WhatsApp
  const handleSendWhatsApp = (celebrant: BirthdayCelebrant, messageOverride?: string) => {
    const res = sendBirthdayWishes(
      celebrant,
      settings,
      'whatsapp',
      selectedTemplateId,
      messageOverride || customMessageText
    );
    setDispatchStatus('WhatsApp link dispatched and text copied to clipboard!');
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  // Send SMS
  const handleSendSms = (celebrant: BirthdayCelebrant, messageOverride?: string) => {
    sendBirthdayWishes(
      celebrant,
      settings,
      'sms',
      selectedTemplateId,
      messageOverride || customMessageText
    );
    setDispatchStatus('SMS dispatched to mobile carrier app!');
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  // Copy Message
  const handleCopyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Batch Send WhatsApp for all today's celebrants
  const handleBatchSendTodaysWishes = () => {
    if (todaysCelebrants.length === 0) return;
    todaysCelebrants.forEach((c, idx) => {
      setTimeout(() => {
        const { url, message } = generateBirthdayWhatsAppUrl(c, settings, 'hindi_warm_blessing');
        window.open(url, '_blank');
      }, idx * 1200);
    });
    setDispatchStatus(`Dispatched WhatsApp for ${todaysCelebrants.length} celebrants!`);
    setTimeout(() => setDispatchStatus(null), 5000);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header Banner */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 text-white flex items-center justify-between relative overflow-hidden shrink-0">
            {/* Background Decorative Circles */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute left-1/3 -top-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                <Cake className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">
                    Birthday Congratulations & Date-Wise Hub
                  </h2>
                  {todaysCelebrants.length > 0 && (
                    <span className="bg-white text-rose-700 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs animate-pulse flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-current" />
                      {todaysCelebrants.length} Today!
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-100 font-medium">
                  Official Greetings from Administrator <b>{settings.adminName || 'Anil Singh'}</b> • SBSC Public School
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              {currentList.length > 0 && (
                <button
                  onClick={() => setSelectedCelebrantForCard(currentList[0])}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs border border-white/30 backdrop-blur-xs transition cursor-pointer"
                  title="Open Greeting Card Studio & Download Options"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Card Studio</span>
                </button>
              )}
              {todaysCelebrants.length > 1 && (
                <button
                  onClick={handleBatchSendTodaysWishes}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-900 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
                  title="Sequential WhatsApp wishes"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send All Today ({todaysCelebrants.length})</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'today'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Cake className="w-4 h-4" />
                <span>Today's Birthdays</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'today' ? 'bg-slate-950 text-amber-400' : 'bg-rose-100 text-rose-800'
                }`}>
                  {todaysCelebrants.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'upcoming'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Next 7 Days</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {upcomingCelebrants.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('month')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'month'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>This Month ({monthNames[now.getMonth()]})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {thisMonthCelebrants.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('date_search')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'date_search'
                    ? 'bg-blue-950 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Search className="w-4 h-4 text-amber-500" />
                <span>Search by Birth Date</span>
              </button>
            </div>

            {/* Quick Status / Counter */}
            <span className="text-[11px] font-bold text-slate-500 hidden md:inline">
              Showing <b>{currentList.length}</b> Celebrants
            </span>
          </div>

          {/* Date-Wise Specific Picker Header (Visible when in date_search tab) */}
          {activeTab === 'date_search' && (
            <div className="px-5 py-3 bg-amber-50/80 border-b border-amber-200 flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Select Birth Date:</span>
                </span>
                {/* Day selector */}
                <select
                  value={searchDay}
                  onChange={(e) => setSearchDay(Number(e.target.value))}
                  className="text-xs font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>

                {/* Month selector */}
                <select
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(Number(e.target.value))}
                  className="text-xs font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-bold text-amber-900">
                Found <b>{dateWiseCelebrants.length}</b> school member{dateWiseCelebrants.length === 1 ? '' : 's'} born on {searchDay} {monthNames[searchMonth - 1]}
              </div>
            </div>
          )}

          {/* Search and Secondary Filter Row */}
          <div className="px-5 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search celebrant by student/teacher name, class, admission no..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Role filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Roles (Students & Faculty)</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers & Staff Only</option>
              </select>

              {/* Class filter */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toast / Notification if any */}
          {dispatchStatus && (
            <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dispatchStatus}</span>
              </div>
              <button
                onClick={() => setDispatchStatus(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main List Area */}
          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            {currentList.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                  🎂
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  {activeTab === 'today'
                    ? 'No Birthdays Today'
                    : activeTab === 'upcoming'
                    ? 'No Birthdays in the Next 7 Days'
                    : 'No Birthdays Found for Selected Criteria'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeTab === 'today'
                    ? `There are no student or teacher birthdays on today's calendar. Check the "Next 7 Days" tab or "Search by Birth Date" to browse upcoming celebrations!`
                    : 'Try selecting a different date, clearing filters, or browsing the monthly overview.'}
                </p>
                {activeTab === 'today' && upcomingCelebrants.length > 0 && (
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition"
                  >
                    <Clock className="w-4 h-4" />
                    <span>View Upcoming Celebrations ({upcomingCelebrants.length})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {currentList.map((celebrant) => {
                  const isToday = celebrant.isToday;
                  const phoneNum = celebrant.guardianPhone || celebrant.phone || '';

                  return (
                    <div
                      key={`${celebrant.type}-${celebrant.id}`}
                      className={`rounded-2xl border p-4 transition relative flex flex-col justify-between ${
                        isToday
                          ? 'bg-gradient-to-br from-amber-50/90 via-white to-rose-50/50 border-amber-300 shadow-sm ring-1 ring-amber-400/50'
                          : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Top Badge Row */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            {isToday ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                <Sparkles className="w-3 h-3 fill-current" />
                                <span>Birthday Today!</span>
                              </span>
                            ) : celebrant.isTomorrow ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                                Tomorrow
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                                In {celebrant.daysUntil} days
                              </span>
                            )}

                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              celebrant.type === 'student'
                                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                : 'bg-purple-50 text-purple-900 border border-purple-200'
                            }`}>
                              {celebrant.type === 'student' ? 'Student' : 'Faculty / Staff'}
                            </span>
                          </div>

                          <span className="text-[11px] font-extrabold text-amber-900 font-mono">
                            {celebrant.dobFormatted}
                          </span>
                        </div>

                        {/* Celebrant Identity Header */}
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {celebrant.photoUrl ? (
                              <img
                                src={celebrant.photoUrl}
                                alt={celebrant.name}
                                className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black text-lg border-2 border-amber-400 shadow-xs">
                                🎂
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {celebrant.name}
                            </h4>

                            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {celebrant.type === 'student' ? (
                                <span className="font-semibold text-blue-950">
                                  {celebrant.className} ({celebrant.section}) • Roll #{celebrant.rollNo || '-'}
                                </span>
                              ) : (
                                <span className="font-semibold text-purple-950">
                                  {celebrant.designation || 'Faculty Member'}
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-500 mt-1 truncate">
                              Turning <b className="text-amber-800 font-bold">{celebrant.age} Years</b>
                              {celebrant.fatherName && ` • S/o: ${celebrant.fatherName}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {/* Send WhatsApp Wishes Button */}
                          <button
                            onClick={() => handleOpenMessageComposer(celebrant)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
                            title="Open message composer & send WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            <span>Send Wishes</span>
                          </button>

                          {/* Greeting Card & Download Button */}
                          <button
                            onClick={() => setSelectedCelebrantForCard(celebrant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
                            title="Download Greeting Card (PNG / PDF / Print)"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-950" />
                            <span>Download Card</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Quick Direct WhatsApp */}
                          <button
                            onClick={() => handleSendWhatsApp(celebrant)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition"
                            title="Quick 1-Click WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Call */}
                          {phoneNum && (
                            <a
                              href={`tel:${phoneNum}`}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                              title={`Direct Call: ${phoneNum}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">
                School Administrator:
              </span>
              <span className="font-semibold text-blue-900">
                {settings.adminName || 'Anil Singh'} ({settings.adminPhone || settings.phone || '9452305199'})
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
            >
              Close Hub
            </button>
          </div>
        </div>
      </div>

      {/* Message Composer Drawer / Modal */}
      {selectedCelebrantForMessage && (
        <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-emerald-300 fill-current" />
                <div>
                  <h3 className="font-bold text-sm">
                    Compose Official Birthday Greeting
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Recipient: <b>{selectedCelebrantForMessage.name}</b> ({selectedCelebrantForMessage.className || selectedCelebrantForMessage.designation})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCelebrantForMessage(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Official Wish Template:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BIRTHDAY_MESSAGE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition ${
                        selectedTemplateId === tmpl.id
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{tmpl.title}</span>
                        <span className="text-[9px] bg-slate-200 px-1.5 py-0.2 rounded font-mono">
                          {tmpl.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Personalized Message Text (Admin Signed):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyText(customMessageText)}
                    className="text-[11px] text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedNotification ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={customMessageText}
                  onChange={(e) => setCustomMessageText(e.target.value)}
                  className="w-full text-xs p-3 font-sans bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition leading-relaxed text-slate-800"
                />
              </div>

              {/* Destination Phone & Channel Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    Destination Mobile Number
                  </span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm">
                    {selectedCelebrantForMessage.guardianPhone || selectedCelebrantForMessage.phone || 'No phone on record'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Admin: {settings.adminName || 'Anil Singh'}
                </span>
              </div>
            </div>

            {/* Composer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedCelebrantForMessage(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCelebrantForCard(selectedCelebrantForMessage);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  title="Open Greeting Card with PNG / PDF Download Options"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSms(selectedCelebrantForMessage)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
                >
                  Send SMS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSendWhatsApp(selectedCelebrantForMessage);
                    setSelectedCelebrantForMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Card Modal */}
      {selectedCelebrantForCard && (
        <PrintableBirthdayCard
          celebrant={selectedCelebrantForCard}
          settings={settings}
          onClose={() => setSelectedCelebrantForCard(null)}
        />
      )}
    </>
  );
};
