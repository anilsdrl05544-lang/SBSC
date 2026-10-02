import React, { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Notice, Student } from '../../types/school';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Phone,
  Calendar,
  AlertTriangle,
  Users,
  ExternalLink,
  Search,
  CheckCircle2,
  Sparkles,
  Palmtree,
  CalendarDays,
  Flame,
  FileText,
  Clock,
  ChevronRight,
  Smartphone,
  Share2,
  Filter,
  Zap,
} from 'lucide-react';
import {
  cleanPhoneNumber,
  generateWhatsAppUrl,
  generateSmsUrl,
  generateGroupSmsUrl,
  WHATSAPP_NOTICE_TEMPLATES,
  SMS_NOTICE_TEMPLATES,
  formatNoticeBroadcastMessage,
  formatNoticeSmsMessage,
  NoticeBroadcastParams,
  dispatchSafeMessage,
  formatPhoneForSms,
} from '../../services/whatsappService';

interface NoticeBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotice?: Notice | null;
  initialCategory?: string;
  initialDate?: string;
  initialHolidayName?: string;
  initialChannel?: 'whatsapp' | 'sms';
}

export const NoticeBroadcastModal: React.FC<NoticeBroadcastModalProps> = ({
  isOpen,
  onClose,
  initialNotice,
  initialCategory,
  initialDate,
  initialHolidayName,
  initialChannel,
}) => {
  const { students, classes, settings, notices } = useSchool();

  // Channel: WhatsApp vs SMS
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'sms'>(
    initialChannel || 'whatsapp'
  );

  // Filter Audience
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Notice details
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [category, setCategory] = useState<string>('Holiday');
  const [eventDate, setEventDate] = useState(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [reopenDate, setReopenDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('holiday_notice');
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Queue state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentStudentIds, setSentStudentIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQueueCompleted, setIsQueueCompleted] = useState(false);

  // Copy feedback
  const [hasCopiedText, setHasCopiedText] = useState(false);
  const [hasCopiedPhones, setHasCopiedPhones] = useState(false);

  // Initialize from props
  useEffect(() => {
    if (!isOpen) return;

    if (initialNotice) {
      setNoticeTitle(initialNotice.title);
      setNoticeContent(initialNotice.content);
      setCategory(initialNotice.category);
      setEventDate(initialNotice.date || new Date().toISOString().slice(0, 10));

      // Match template by category
      if (initialNotice.category === 'Emergency') {
        setSelectedTemplateId('urgent_alert');
      } else if (initialNotice.category === 'Holiday') {
        setSelectedTemplateId('holiday_notice');
      } else if (initialNotice.category === 'Events' || (initialNotice.category as any) === 'Event') {
        setSelectedTemplateId('event_invitation');
      } else if (initialNotice.category === 'Exam' || (initialNotice.category as any) === 'Examination') {
        setSelectedTemplateId('exam_datesheet');
      } else {
        setSelectedTemplateId('general_circular');
      }
    } else if (initialHolidayName) {
      setNoticeTitle(`Holiday Declared: ${initialHolidayName}`);
      setNoticeContent(`School will remain closed on the auspicious occasion of ${initialHolidayName}. Students must complete their holiday homework.`);
      setCategory('Holiday');
      setSelectedTemplateId('holiday_notice');
      if (initialDate) setEventDate(initialDate);
    } else if (initialCategory) {
      setCategory(initialCategory);
      if (initialCategory === 'Events') {
        setNoticeTitle('Annual Sports Meet & Cultural Festival');
        setNoticeContent('All students and parents are invited to participate in the grand annual festival.');
        setSelectedTemplateId('event_invitation');
      } else if (initialCategory === 'Holiday') {
        setNoticeTitle('Festival Holiday Announcement');
        setNoticeContent('School will remain closed on this date.');
        setSelectedTemplateId('holiday_notice');
      }
    } else {
      // Default to Holiday notice
      setNoticeTitle('Official School Holiday Notification');
      setNoticeContent('The school shall remain closed. Parents are requested to ensure revision work.');
      setCategory('Holiday');
      setSelectedTemplateId('holiday_notice');
    }

    // Reset queue index on open
    setCurrentIndex(0);
    setSentStudentIds(new Set());
    setIsQueueCompleted(false);
  }, [isOpen, initialNotice, initialCategory, initialDate, initialHolidayName]);

  // List of eligible students based on class/section and search
  const targetStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'Active')
      .filter((s) => (selectedClassId === 'all' ? true : s.classId === selectedClassId))
      .filter((s) => (selectedSection === 'all' ? true : s.section === selectedSection))
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          (s.guardianPhone && s.guardianPhone.includes(q)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, selectedClassId, selectedSection, searchQuery]);

  // Selected student in queue
  const currentStudent = targetStudents[currentIndex] || targetStudents[0] || null;
  const currentClass = classes.find((c) => c.id === currentStudent?.classId);

  // Available templates
  const templates = activeChannel === 'whatsapp' ? WHATSAPP_NOTICE_TEMPLATES : SMS_NOTICE_TEMPLATES;

  // Build message params for current student
  const messageParams: NoticeBroadcastParams = useMemo(() => {
    return {
      noticeTitle: noticeTitle.trim() || 'Official School Notice',
      noticeContent: noticeContent.trim() || '',
      category: category,
      date: eventDate,
      reopenDate: reopenDate,
      studentName: currentStudent?.fullName || 'Student',
      fatherName: currentStudent?.fatherName || 'Parent',
      className: currentClass?.name || currentStudent?.classId || 'All Classes',
      section: currentStudent?.section || 'A',
      admissionNo: currentStudent?.admissionNo || 'N/A',
      schoolName: settings.schoolName || 'SBSC Public School',
      schoolPhone: settings.contactNumber || '+91 94150 00000',
    };
  }, [noticeTitle, noticeContent, category, eventDate, reopenDate, currentStudent, currentClass, settings]);

  // Generated message text
  const generatedMessage = useMemo(() => {
    if (isEditingCustom && customMessage) {
      return customMessage;
    }

    const templateObj = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (!templateObj) return '';

    if (activeChannel === 'whatsapp') {
      return formatNoticeBroadcastMessage(templateObj.templateText, messageParams);
    } else {
      return formatNoticeSmsMessage(templateObj.templateText, messageParams);
    }
  }, [isEditingCustom, customMessage, selectedTemplateId, templates, activeChannel, messageParams]);

  // Target phone number
  const rawPhone = currentStudent?.guardianPhone || '';
  const cleanPhone = cleanPhoneNumber(rawPhone);

  // URLs memoized safely
  const whatsAppUrl = useMemo(() => {
    if (!isOpen) return '';
    return generateWhatsAppUrl(cleanPhone, generatedMessage);
  }, [isOpen, cleanPhone, generatedMessage]);

  const smsUrl = useMemo(() => {
    if (!isOpen) return '';
    return generateSmsUrl(cleanPhone, generatedMessage);
  }, [isOpen, cleanPhone, generatedMessage]);

  // All phone numbers in audience for group SMS
  const allAudiencePhones = useMemo(() => {
    if (!isOpen) return [];
    return targetStudents
      .map((s) => cleanPhoneNumber(s.guardianPhone))
      .filter((p) => p && p.length >= 10);
  }, [isOpen, targetStudents]);

  const groupSmsUrl = useMemo(() => {
    if (!isOpen || allAudiencePhones.length === 0) return '';
    return generateGroupSmsUrl(allAudiencePhones, generatedMessage);
  }, [isOpen, allAudiencePhones, generatedMessage]);

  // Unblockable dispatcher using safe dispatch
  const dispatchMessageSafely = (url: string, channel: 'whatsapp' | 'sms' = 'whatsapp') => {
    dispatchSafeMessage(url, channel);
  };

  // Stepper handlers
  const handleSendAndNext = () => {
    if (!currentStudent) return;

    if (!cleanPhone || cleanPhone.length < 10) {
      alert(`Parent contact number for ${currentStudent.fullName} is invalid or missing.`);
      return;
    }

    // Mark as sent
    setSentStudentIds((prev) => new Set([...prev, currentStudent.id]));

    // Dispatch safely without unloading the SPA
    const currentUrl = activeChannel === 'whatsapp' ? whatsAppUrl : smsUrl;
    dispatchSafeMessage(currentUrl, activeChannel, generatedMessage);

    // Auto-advance
    if (currentIndex < targetStudents.length - 1) {
      const nextStudent = targetStudents[currentIndex + 1];
      setCurrentIndex((i) => i + 1);
      setToastMessage(`✓ Sent to Parent of ${currentStudent.fullName}! Next: ${nextStudent.fullName}`);
    } else {
      setIsQueueCompleted(true);
      setToastMessage(`🎉 Finished sending notices to all ${targetStudents.length} students!`);
    }

    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendCurrentOnly = () => {
    if (!currentStudent) return;
    if (!cleanPhone) {
      alert(`Invalid phone number for ${currentStudent.fullName}`);
      return;
    }
    setSentStudentIds((prev) => new Set([...prev, currentStudent.id]));
    const currentUrl = activeChannel === 'whatsapp' ? whatsAppUrl : smsUrl;
    dispatchSafeMessage(currentUrl, activeChannel, generatedMessage);
    setToastMessage(`✓ Dispatched to ${currentStudent.fullName}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsQueueCompleted(false);
    }
  };

  const handleNextStudent = () => {
    if (currentIndex < targetStudents.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsQueueCompleted(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2000);
    } catch {
      alert('Failed to copy text.');
    }
  };

  const handleCopyPhones = async () => {
    try {
      await navigator.clipboard.writeText(allAudiencePhones.join(', '));
      setHasCopiedPhones(true);
      setTimeout(() => setHasCopiedPhones(false), 2000);
    } catch {
      alert('Failed to copy phones.');
    }
  };

  // Quick preset selector
  const handleApplyPreset = (presetType: 'holiday' | 'event' | 'urgent' | 'exam' | 'ptm') => {
    setIsEditingCustom(false);
    if (presetType === 'holiday') {
      setCategory('Holiday');
      setSelectedTemplateId(activeChannel === 'whatsapp' ? 'holiday_notice' : 'sms_holiday');
      setNoticeTitle('School Holiday Announcement');
      setNoticeContent('The school shall remain closed. Students are requested to complete the assigned holiday projects.');
    } else if (presetType === 'event') {
      setCategory('Events');
      setSelectedTemplateId(activeChannel === 'whatsapp' ? 'event_invitation' : 'sms_event');
      setNoticeTitle('Annual School Sports & Cultural Meet');
      setNoticeContent('All parents and students are cordially invited to celebrate our grand annual festival.');
    } else if (presetType === 'urgent') {
      setCategory('Emergency');
      setSelectedTemplateId(activeChannel === 'whatsapp' ? 'urgent_weather_closure' : 'sms_urgent');
      setNoticeTitle('Emergency Weather & Administrative Closure Order');
      setNoticeContent('Due to severe cold wave / torrential rain / DM emergency orders, the school will remain strictly closed today.');
    } else if (presetType === 'exam') {
      setCategory('Exam');
      setSelectedTemplateId(activeChannel === 'whatsapp' ? 'exam_datesheet' : 'sms_exam');
      setNoticeTitle('Term Examination Datesheet & Advisory');
      setNoticeContent('Half-yearly / Annual examinations will commence as per the published schedule.');
    } else if (presetType === 'ptm') {
      setCategory('Academic');
      setSelectedTemplateId(activeChannel === 'whatsapp' ? 'ptm_meeting' : 'sms_ptm');
      setNoticeTitle('Parent-Teacher Meeting (PTM) Invitation');
      setNoticeContent('Please visit the school between 9:00 AM to 1:00 PM to discuss your ward academic progress.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  {settings.schoolName || 'SBSC School ERP'}
                </span>
                <span className="bg-white/10 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  All Students Broadcast
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Send Notice via SMS & WhatsApp (Holiday, Event, etc.)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Channel Switcher */}
            <div className="bg-black/40 p-1 rounded-xl flex items-center gap-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('whatsapp');
                  setIsEditingCustom(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeChannel === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('sms');
                  setIsEditingCustom(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeChannel === 'sms'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Form & Audience Config (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Quick Template Category Presets */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  Quick Broadcast Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('holiday')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      category === 'Holiday'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    <span>Holiday</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('event')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      category === 'Events'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Event</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('urgent')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      category === 'Emergency' || (category === 'General' && selectedTemplateId.includes('urgent'))
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Emergency Alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('exam')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      category === 'Exam'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Exam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('ptm')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      category === 'Academic'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>PTM</span>
                  </button>
                </div>
              </div>

              {/* Notice Title & Announcement Content */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div>
                  <label className="block text-slate-700 font-extrabold text-xs mb-1">
                    Notice Subject / Title *
                  </label>
                  <input
                    type="text"
                    value={noticeTitle}
                    onChange={(e) => {
                      setNoticeTitle(e.target.value);
                      setIsEditingCustom(false);
                    }}
                    placeholder="e.g. Diwali Holiday Announcement / Annual Sports Day Celebration"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-rose-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold text-[11px] mb-1">
                      Event / Holiday Date:
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => {
                        setEventDate(e.target.value);
                        setIsEditingCustom(false);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  {category === 'Holiday' ? (
                    <div>
                      <label className="block text-slate-600 font-bold text-[11px] mb-1">
                        School Reopening Date:
                      </label>
                      <input
                        type="date"
                        value={reopenDate}
                        onChange={(e) => {
                          setReopenDate(e.target.value);
                          setIsEditingCustom(false);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-600 font-bold text-[11px] mb-1">
                        Notice Category:
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setIsEditingCustom(false);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        <option value="Emergency">🚨 Emergency Alert (आपातकालीन / DM आदेश)</option>
                        <option value="Holiday">School Holiday</option>
                        <option value="Events">School Event / Function</option>
                        <option value="Exam">Examination & Datesheet</option>
                        <option value="Academic">Academic & PTM</option>
                        <option value="General">General Circular</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-extrabold text-xs">
                      Announcement Details / Body Content *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {noticeContent.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={noticeContent}
                    onChange={(e) => {
                      setNoticeContent(e.target.value);
                      setIsEditingCustom(false);
                    }}
                    placeholder="Enter the notice details, special instructions, homework guidelines, venue or timing..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-rose-800 leading-relaxed"
                  />
                </div>

                {/* Template Style Selector */}
                <div>
                  <label className="block text-slate-600 font-bold text-[11px] mb-1">
                    Message Template Format:
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      setIsEditingCustom(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.tag})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Audience & Class Filter */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-rose-800" />
                    <span>Target Audience:</span>
                  </span>
                  <span className="text-[11px] font-bold text-rose-900 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Eligible Students: <b>{targetStudents.length}</b> ({allAudiencePhones.length} Valid Mobile Nos)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Class Filter:</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setCurrentIndex(0);
                        setIsQueueCompleted(false);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                    >
                      <option value="all">All Classes ({students.length} Students)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Section Filter:</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        setSelectedSection(e.target.value);
                        setCurrentIndex(0);
                        setIsQueueCompleted(false);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                    >
                      <option value="all">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>

                {/* Search Within Audience */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentIndex(0);
                      setIsQueueCompleted(false);
                    }}
                    placeholder="Search student by name, admission no or parent phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Recipient Chips Carousel */}
                <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                  {targetStudents.map((s, idx) => {
                    const isSelected = idx === currentIndex;
                    const isSent = sentStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(idx);
                          setIsQueueCompleted(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs ring-2 ring-rose-400'
                            : isSent
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSent && <Check className="w-3 h-3 text-emerald-600" />}
                        <span>{s.fullName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Realistic Phone Mockup & Dispatch Stepper (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-3.5">
              {/* Active Queue Stepper & Progress Tracker */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>
                      Parent Queue: <b className="text-rose-950">{currentIndex + 1} of {targetStudents.length}</b>
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    Sent: <b className="text-emerald-700 font-extrabold">{sentStudentIds.size}</b> / {targetStudents.length}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((sentStudentIds.size / Math.max(1, targetStudents.length)) * 100)
                      )}%`,
                    }}
                  />
                </div>

                {/* Current Recipient Info */}
                {currentStudent && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="truncate max-w-[210px]">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Current Recipient ({currentStudent.fatherName})
                      </span>
                      <span className="font-extrabold text-slate-900 uppercase truncate block">
                        {currentStudent.fullName} • Class {currentClass?.name || currentStudent.classId}-{currentStudent.section}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono font-bold">
                        📞 +{cleanPhone || 'No Mobile'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrevStudent}
                        disabled={currentIndex === 0}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 cursor-pointer"
                        title="Previous parent"
                      >
                        ◀ Prev
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStudent}
                        disabled={currentIndex >= targetStudents.length - 1}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
                        title="Next parent"
                      >
                        Next ➔
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Toast Alert */}
              {toastMessage && (
                <div className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-md transition-all animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>{toastMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    className="text-white/80 hover:text-white text-xs cursor-pointer ml-2 p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Queue Finished Celebration Card */}
              {isQueueCompleted && (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 text-center space-y-2 shadow-md animate-in fade-in">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-950">Notice Broadcast Completed!</h4>
                  <p className="text-xs text-emerald-800">
                    All {targetStudents.length} students/parents have been reached for this notice.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex(0);
                        setIsQueueCompleted(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Restart from First Student
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              )}

              {/* Phone Mockup Frame */}
              <div className="bg-slate-900 rounded-[28px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col flex-1">
                {/* App Bar (WhatsApp vs SMS) */}
                <div
                  className={`px-3 py-2 rounded-t-2xl flex items-center justify-between text-white ${
                    activeChannel === 'whatsapp' ? 'bg-[#075E54]' : 'bg-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase">
                      {currentStudent?.fullName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate max-w-[140px]">
                        {currentStudent ? `${currentStudent.fatherName} (${currentStudent.fullName})` : 'Parent'}
                      </div>
                      <div className="text-[10px] text-white/75 font-mono">
                        +{cleanPhone || '91XXXXXXXXXX'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded uppercase">
                    {activeChannel === 'whatsapp' ? 'WhatsApp' : 'Text SMS'}
                  </span>
                </div>

                {/* Chat Canvas */}
                <div
                  className={`flex-1 p-3 rounded-b-2xl overflow-y-auto space-y-2 min-h-[220px] max-h-[340px] flex flex-col justify-start ${
                    activeChannel === 'whatsapp' ? 'bg-[#ECE5DD]' : 'bg-slate-900/90'
                  }`}
                >
                  <div
                    className={`max-w-[95%] p-3 rounded-2xl shadow-xs text-xs whitespace-pre-wrap leading-relaxed ${
                      activeChannel === 'whatsapp'
                        ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-none self-end'
                        : 'bg-blue-600 text-white rounded-tr-none self-end'
                    }`}
                  >
                    {isEditingCustom ? (
                      <textarea
                        rows={8}
                        value={customMessage || generatedMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        className="w-full bg-white/90 text-slate-900 p-2 rounded-xl text-xs font-mono border border-slate-300"
                      />
                    ) : (
                      <span>{generatedMessage}</span>
                    )}

                    <div className="text-[9px] text-right opacity-70 mt-1 flex items-center justify-end gap-1 font-mono">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {activeChannel === 'whatsapp' && <span>✓✓</span>}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingCustom) {
                          setCustomMessage(generatedMessage);
                        }
                        setIsEditingCustom(!isEditingCustom);
                      }}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-white/80 px-2 py-0.5 rounded-md shadow-xs cursor-pointer"
                    >
                      {isEditingCustom ? '✓ Finish Custom Edit' : '✏️ Edit Message Text'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-2">
                {activeChannel === 'whatsapp' ? (
                  /* Main WhatsApp Dispatch Button */
                  <button
                    type="button"
                    onClick={handleSendAndNext}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600 active:scale-98 text-white font-black text-sm shadow-md transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 fill-current text-emerald-200" />
                      <span>
                        {targetStudents.length > 1
                          ? currentIndex < targetStudents.length - 1
                            ? `Send WhatsApp & Next Parent ➔ (${currentIndex + 1}/${targetStudents.length})`
                            : `Send WhatsApp to ${currentStudent?.fullName || 'Student'} (Finish)`
                          : `Send WhatsApp to ${currentStudent?.fullName || 'Student'}`}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                    {targetStudents[currentIndex + 1] && currentIndex < targetStudents.length - 1 && (
                      <span className="text-[10px] text-emerald-100 font-normal">
                        Next up: {targetStudents[currentIndex + 1].fullName} (Class {targetStudents[currentIndex + 1].classId})
                      </span>
                    )}
                  </button>
                ) : activeChannel === 'sms' && targetStudents.length > 1 ? (
                  /* One-Click SMS Hero for Multiple Selected Students */
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        dispatchSafeMessage(groupSmsUrl, 'sms', generatedMessage);
                        const commaSeparated = Array.from(new Set(allAudiencePhones.map((p) => formatPhoneForSms(p)).filter(Boolean))).join(', ');
                        if (commaSeparated && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                          try {
                            navigator.clipboard.writeText(commaSeparated).catch(() => {});
                          } catch {}
                        }
                        setToastMessage(`✓ Group SMS opened for ${allAudiencePhones.length} parents! (${allAudiencePhones.length} numbers copied to clipboard)`);
                        setTimeout(() => setToastMessage(null), 5000);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-blue-700/20 transition flex flex-col items-center justify-center gap-1 cursor-pointer border border-blue-400/40"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>⚡ Send SMS to All {allAudiencePhones.length} Selected Parents (1-Click)</span>
                      </div>
                      <span className="text-[11px] text-blue-100 font-normal">
                        Opens your SMS app with all {allAudiencePhones.length} parent numbers & message pre-filled at once!
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500">Or send one-by-one:</span>
                      <button
                        type="button"
                        onClick={handleSendAndNext}
                        className="py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {currentIndex < targetStudents.length - 1
                            ? `Send to ${currentStudent?.fullName || 'Current'} & Next (${currentIndex + 1}/${targetStudents.length})`
                            : `Send to ${currentStudent?.fullName || 'Student'} (Finish)`}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Main SMS Dispatch Button (Single Student) */
                  <button
                    type="button"
                    onClick={handleSendAndNext}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 active:scale-98 text-white font-black text-sm shadow-md transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-200" />
                      <span>Send SMS to {currentStudent?.fullName || 'Student'}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                  </button>
                )}

                {/* Stepper Controls */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={currentIndex === 0}
                    className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <span>◀ Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendCurrentOnly}
                    className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Send to current parent without advancing"
                  >
                    <span>Stay & Send</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={currentIndex >= targetStudents.length - 1}
                    className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Skip ➔</span>
                  </button>
                </div>

                {/* Direct Fallback Links */}
                <div className="pt-1 text-center">
                  {activeChannel === 'whatsapp' ? (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Direct Link: Tap if WhatsApp was blocked</span>
                    </a>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => dispatchSafeMessage(smsUrl, 'sms', generatedMessage)}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Launch Phone SMS App</span>
                      </button>
                      <a
                        href="https://messages.google.com/web"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-slate-300 inline-flex items-center gap-1 transition"
                        title="For PC / Laptop: Open Google Messages Web"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Messages Web (PC)</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Utility Buttons: Copy Message, Copy Phones */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedText ? 'Copied Text!' : 'Copy Message'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPhones}
                    className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Copy all parent mobile numbers comma-separated for bulk SMS gateway"
                  >
                    {hasCopiedPhones ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Phone className="w-3.5 h-3.5" />}
                    <span>{hasCopiedPhones ? 'Copied Phones!' : 'Copy All Numbers'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
