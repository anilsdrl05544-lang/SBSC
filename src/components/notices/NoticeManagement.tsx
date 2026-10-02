import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Notice } from '../../types/school';
import {
  BellRing,
  Plus,
  Calendar,
  Tag,
  Users,
  Trash2,
  X,
  Save,
  Pin,
  AlertCircle,
  Edit3,
  MessageSquare,
  Smartphone,
  Search,
  Check,
  Sparkles,
  Share2,
  Filter,
  Palmtree,
  CalendarDays,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  GraduationCap,
  Eye,
} from 'lucide-react';
import { NoticeBroadcastModal } from './NoticeBroadcastModal';
import { matchesNoticeCategory, normalizeNoticeCategory } from '../../utils/noticeUtils';

export const NoticeManagement: React.FC = () => {
  const { notices, addNotice, updateNotice, deleteNotice, settings, students, classes } = useSchool();

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for Add / Edit Notice
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // Delete Confirmation Modal
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);

  // Notice Broadcast Modal (WhatsApp & SMS)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [selectedNoticeForBroadcast, setSelectedNoticeForBroadcast] = useState<Notice | null>(null);

  // Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Notice, 'id'> & { targetClassId?: string }>({
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
    postedBy: 'Principal Office',
    targetAudience: 'All',
    targetClassId: 'all',
    category: 'General',
    isPinned: false,
    priority: 'Medium',
  });

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Filtered Notices with search
  const filteredNotices = useMemo(() => {
    return notices
      .filter((n) => (categoryFilter ? matchesNoticeCategory(n.category, categoryFilter) : true))
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.postedBy && n.postedBy.toLowerCase().includes(q)) ||
          (n.category && n.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Pinned notices first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by date descending
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notices, categoryFilter, searchQuery]);

  // Open Add Notice
  const handleOpenAddModal = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      date: new Date().toISOString().slice(0, 10),
      postedBy: 'Principal Office',
      targetAudience: 'All',
      targetClassId: 'all',
      category: 'General',
      isPinned: false,
      priority: 'Medium',
    });
    setIsModalOpen(true);
  };

  // Open Edit Notice
  const handleOpenEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    const rawCat = notice.category || 'General';
    const norm = normalizeNoticeCategory(rawCat);
    let mappedCat: any = 'General';
    if (norm === 'emergency') mappedCat = 'Emergency';
    else if (norm === 'examination') mappedCat = 'Examination';
    else if (norm === 'academic') mappedCat = 'Academic';
    else if (norm === 'holiday') mappedCat = 'Holiday';
    else if (norm === 'fee') mappedCat = 'Fee';
    else if (norm === 'event') mappedCat = 'Event';

    setFormData({
      title: notice.title,
      content: notice.content,
      date: notice.date || new Date().toISOString().slice(0, 10),
      postedBy: notice.postedBy || 'Principal Office',
      targetAudience: notice.targetAudience || 'All',
      targetClassId: (notice as any).targetClassId || 'all',
      category: mappedCat,
      isPinned: !!notice.isPinned,
      priority: notice.priority || 'Medium',
    });
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please enter notice title and announcement details.');
      return;
    }

    if (editingNotice) {
      updateNotice(editingNotice.id, formData);
      showToast(`✓ Updated notice "${formData.title}" successfully.`);
    } else {
      addNotice(formData);
      showToast(`✓ Published new circular "${formData.title}" on the notice board & student portal.`);
    }

    setIsModalOpen(false);
    setEditingNotice(null);
  };

  // Delete Handlers
  const handleConfirmDelete = () => {
    if (!noticeToDelete) return;
    const deletedTitle = noticeToDelete.title;
    deleteNotice(noticeToDelete.id);
    setNoticeToDelete(null);
    showToast(`✓ Notice "${deletedTitle}" deleted.`);
  };

  // Toggle Pin
  const handleTogglePin = (notice: Notice) => {
    const newPinned = !notice.isPinned;
    updateNotice(notice.id, { isPinned: newPinned });
    showToast(newPinned ? `📌 Pinned "${notice.title}" to top.` : `Unpinned "${notice.title}".`);
  };

  // Trigger Broadcast for specific notice
  const handleOpenNoticeBroadcast = (notice: Notice) => {
    setSelectedNoticeForBroadcast(notice);
    setIsBroadcastModalOpen(true);
  };

  // Category badge styling helper
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Emergency':
        return 'bg-red-100 text-red-950 border-red-400 font-extrabold';
      case 'Holiday':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Events':
      case 'Event':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Exam':
      case 'Examination':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Fee':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Academic':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      default:
        return 'bg-rose-100 text-rose-900 border-rose-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase tracking-wider mb-1">
            <BellRing className="w-4 h-4" />
            <span>Official Institutional Bulletin & Circulars</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            School Notices & Circulars
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Publish, edit, and broadcast school circulars, holiday declarations, events, exams, and urgent updates to students and parents via WhatsApp & SMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Bulk Broadcast Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedNoticeForBroadcast(null);
              setIsBroadcastModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Broadcast SMS & WhatsApp</span>
          </button>

          {/* Publish Notice Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Notice</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Circulars</span>
            <span className="text-xl font-black text-slate-900">{notices.length}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <BellRing className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pinned on Top</span>
            <span className="text-xl font-black text-amber-600">{notices.filter((n) => n.isPinned).length}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Pin className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Holidays & Events</span>
            <span className="text-xl font-black text-indigo-700">
              {notices.filter((n) => n.category === 'Holiday' || n.category === 'Events').length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Palmtree className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Students Reachable</span>
            <span className="text-xl font-black text-emerald-700">{students.length}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Categories Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: '', label: 'All Circulars (सभी)' },
            { id: 'Emergency', label: '🚨 Emergency (आपातकालीन)' },
            { id: 'General', label: 'General (सामान्य)' },
            { id: 'Academic', label: 'Academic (शैक्षणिक)' },
            { id: 'Examination', label: 'Exams (परीक्षा)' },
            { id: 'Holiday', label: 'Holiday (अवकाश)' },
            { id: 'Fee', label: 'Fee (शुल्क)' },
            { id: 'Event', label: 'Events (कार्यक्रम)' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-rose-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars by title, keyword, issuer..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-rose-800 shadow-xs"
          />
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3.5">
        {filteredNotices.map((notice) => {
          const isEmergency = notice.category === 'Emergency';
          return (
            <div
              key={notice.id}
              className={`bg-white border rounded-3xl p-5 shadow-xs transition hover:shadow-md flex flex-col lg:flex-row justify-between gap-4 ${
                isEmergency
                  ? 'border-2 border-red-500 bg-red-50/25 ring-2 ring-red-300/60 shadow-xs'
                  : notice.isPinned
                  ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-300/60'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {notice.isPinned && (
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      <Pin className="w-3 h-3 fill-current" /> PINNED TO TOP
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                      isEmergency
                        ? 'bg-red-600 text-white border-red-700 shadow-2xs tracking-wider'
                        : getCategoryBadgeClass(notice.category)
                    }`}
                  >
                    {isEmergency ? '🚨 Emergency Alert' : notice.category}
                  </span>

                  {/* Student Portal Visibility Badge */}
                  {notice.targetAudience === 'Teachers' ? (
                    <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>Staff Only</span>
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Student Portal Live (छात्र पोर्टल पर दिखेगा)</span>
                    </span>
                  )}

                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    Audience: {notice.targetAudience}
                  </span>

                  {(notice as any).targetClassId && (notice as any).targetClassId !== 'all' && (
                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-blue-700" />
                      <span>
                        Class: {classes.find((c) => c.id === (notice as any).targetClassId)?.name || (notice as any).targetClassId}
                      </span>
                    </span>
                  )}

                  {notice.priority && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        notice.priority === 'High'
                          ? 'bg-rose-100 text-rose-800'
                          : notice.priority === 'Low'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Priority: {notice.priority}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono font-medium flex items-center gap-1 ml-auto">
                    <Calendar className="w-3 h-3" /> {notice.date}
                  </span>
                </div>

                <h3 className={`text-base sm:text-lg ${
                  isEmergency ? 'font-black text-red-600 tracking-wide drop-shadow-2xs' : 'font-black text-slate-900'
                }`}>
                  {notice.title}
                </h3>
                <p className={`text-xs leading-relaxed whitespace-pre-line ${
                  isEmergency
                    ? 'font-bold text-red-700 bg-red-50/90 p-3 rounded-xl border border-red-200 shadow-2xs'
                    : 'text-slate-600'
                }`}>
                  {notice.content}
                </p>

                <div className="pt-2 text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <span>Issued by: <b className="text-slate-800 font-bold">{notice.postedBy}</b></span>
                </div>
              </div>

            {/* Action Buttons Column */}
            <div className="flex flex-wrap lg:flex-col justify-end items-end gap-2 border-t lg:border-t-0 lg:border-l lg:pl-4 border-slate-100 pt-3 lg:pt-0 shrink-0">
              {/* Broadcast Options on Every Notice Card */}
              <div className="flex items-center gap-1.5 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenNoticeBroadcast(notice)}
                  className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold transition cursor-pointer"
                  title="Send this notice to parents via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNoticeBroadcast(notice)}
                  className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs font-extrabold transition cursor-pointer"
                  title="Send this notice to parents via Text SMS"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Send SMS</span>
                </button>
              </div>

              {/* Management Tools: Edit, Pin, Delete */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTogglePin(notice)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    notice.isPinned
                      ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  title={notice.isPinned ? 'Unpin notice' : 'Pin notice to top'}
                >
                  <Pin className={`w-4 h-4 ${notice.isPinned ? 'fill-current' : ''}`} />
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(notice)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-700 hover:text-blue-900 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition text-xs font-bold cursor-pointer"
                  title="Edit Notice Circular"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Edit</span>
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setNoticeToDelete(notice)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {filteredNotices.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-3">
            <BellRing className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-extrabold text-sm text-slate-800">No circulars or notices found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No announcements match "${searchQuery}". Try clearing search.`
                : 'There are no notices published in this category yet.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Publish First Notice</span>
            </button>
          </div>
        )}
      </div>

      {/* Publish / Edit Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  {settings.schoolName || 'SBSC School ERP'}
                </span>
                <h3 className="text-base sm:text-lg font-black">
                  {editingNotice ? 'Edit School Notice Circular' : 'Publish New School Circular'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Circular Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule for Half-Yearly Parent Teacher Meeting (PTM) / Diwali Holiday Announcement"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-rose-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category (श्रेणी) *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  >
                    <option value="Emergency">🚨 Emergency Alert (आपातकालीन सूचना / DM आदेश)</option>
                    <option value="General">General Notice & Bulletin (सामान्य परिपत्र)</option>
                    <option value="Academic">Academic Notice (शैक्षणिक सूचना)</option>
                    <option value="Examination">Examinations & Datesheet (परीक्षा समय सारणी)</option>
                    <option value="Holiday">School Holiday (विद्यालय अवकाश)</option>
                    <option value="Fee">Tuition & Bus Fee Notice (शुल्क सूचना)</option>
                    <option value="Event">Cultural & Sports Events (खेलकूद व कार्यक्रम)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Target Audience (लक्षित समूह) *</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  >
                    <option value="All">All (Students, Parents & Staff)</option>
                    <option value="Students">Students & Parents (छात्र एवं अभिभावक)</option>
                    <option value="Parents">Parents Only (केवल अभिभावक)</option>
                    <option value="Teachers">Teachers & Staff Only (केवल शिक्षक / आंतरिक)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Target Class (लक्षित कक्षा)</label>
                  <select
                    value={formData.targetClassId || 'all'}
                    onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  >
                    <option value="all">All Classes (समस्त कक्षाएं - नर्सरी से 10वीं)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Section {c.section || 'A'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Portal Visibility Status Callout */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${
                  formData.targetAudience === 'Teachers'
                    ? 'bg-amber-50 text-amber-950 border-amber-300'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                }`}
              >
                {formData.targetAudience === 'Teachers' ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      🔒 <strong>आंतरिक स्टाफ सूचना:</strong> यह परिपत्र केवल शिक्षकों/स्टाफ के लिए है (छात्र व अभिभावक पोर्टल पर प्रदर्शित नहीं होगा)।
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      ✓ <strong>छात्र व अभिभावक पोर्टल पर तुरंत प्रदर्शित होगा:</strong> यह परिपत्र छात्रों के पोर्टल नोटिस बोर्ड, टॉप अलर्ट टिकर एवं प्रिंट स्लिप में तुरंत दिखेगा।
                      {formData.targetClassId && formData.targetClassId !== 'all'
                        ? ` (केवल ${classes.find((c) => c.id === formData.targetClassId)?.name || 'चयनित कक्षा'} के छात्रों को)`
                        : ' (समस्त विद्यार्थियों को)'}
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Notice Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Priority</label>
                  <select
                    value={formData.priority || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Issued By</label>
                  <select
                    value={formData.postedBy || 'Principal Office'}
                    onChange={(e) => setFormData({ ...formData, postedBy: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
                  >
                    <option value="Principal Office">Principal Office</option>
                    <option value="Examination Controller">Examination Controller</option>
                    <option value="Academic Coordinator">Academic Coordinator</option>
                    <option value="Sports & Activity Dept">Sports & Activity Dept</option>
                    <option value="Administrative Office">Administrative Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  Notice Announcement Body *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Type the complete circular text, instructions, timing, or details..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 leading-relaxed focus:outline-rose-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="w-4 h-4 text-rose-800 rounded border-slate-300 focus:ring-rose-700 cursor-pointer"
                />
                <label htmlFor="pinCheck" className="text-slate-800 font-bold cursor-pointer">
                  Pin this circular to the top of Notice Board
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingNotice ? 'Update Notice' : 'Publish Notice'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">Delete Notice Circular?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete circular:
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 my-2">
                "{noticeToDelete.title}"
              </div>
              <p className="text-[11px] text-rose-600 font-semibold">
                This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoticeToDelete(null)}
                className="py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 font-black text-xs text-white shadow-md cursor-pointer"
              >
                Yes, Delete Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Broadcast Modal (WhatsApp & SMS) */}
      <NoticeBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => {
          setIsBroadcastModalOpen(false);
          setSelectedNoticeForBroadcast(null);
        }}
        initialNotice={selectedNoticeForBroadcast}
      />
    </div>
  );
};
