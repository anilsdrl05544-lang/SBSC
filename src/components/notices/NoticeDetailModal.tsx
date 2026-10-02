import React from 'react';
import { Notice, SchoolSettings } from '../../types/school';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import { dispatchSafeMessage } from '../../services/whatsappService';
import {
  X,
  Printer,
  Share2,
  Bell,
  Calendar,
  Tag,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface NoticeDetailModalProps {
  notice: Notice | null;
  settings: SchoolSettings;
  onClose: () => void;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({
  notice,
  settings,
  onClose,
}) => {
  if (!notice) return null;

  const schoolName = settings.schoolName || 'SBSC PUBLIC SCHOOL';
  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';
  const address = settings.address || 'Bairwa Nankar, Naugarh Road';
  const district = settings.district || 'Siddharthnagar';
  const schoolCode = settings.schoolCode || '71092';

  const displayDate = notice.date || (notice as any).publishDate || new Date().toISOString().slice(0, 10);
  const formattedDate = formatDateToDDMMYYYY(displayDate);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `📢 *${schoolName} - आधिकारिक विद्यालय सूचना (OFFICIAL NOTICE)*\n\n` +
      `📌 *विषय (Subject):* ${notice.title}\n` +
      `📅 *दिनांक (Date):* ${formattedDate}\n` +
      `🏷️ *श्रेणी (Category):* ${notice.category || 'General'}\n` +
      `👤 *जारीकर्ता (Issued By):* ${notice.postedBy || 'Principal Office'}\n\n` +
      `*विवरण (Notice Body):*\n${notice.content}\n\n` +
      `— *${adminName} (प्रशासक / एडमिन)*\n` +
      `🏫 *${schoolName}*, ${district}\n` +
      `📞 संपर्क/हेल्पलाइन: ${adminPhone}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    dispatchSafeMessage(url, 'whatsapp', text);
  };

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    Emergency: { bg: 'bg-red-100', text: 'text-red-950 font-black', border: 'border-red-400' },
    Holiday: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
    Examination: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
    Academic: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
    Fee: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
    Event: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
    General: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  };

  const catStyle = categoryColors[notice.category] || categoryColors.General;
  const isEmergency = notice.category === 'Emergency';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:static print:inset-auto print:bg-white print:overflow-visible print:block">
      <div className={`bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative print:shadow-none print:border-none print:m-0 print:max-w-none print:rounded-none flex flex-col max-h-[92vh] ${
        isEmergency ? 'border-2 border-red-500 ring-2 ring-red-300/60' : 'border border-slate-300'
      }`}>
        {/* Top Action Bar (Hidden on Print) */}
        <div className={`px-5 py-4 text-white flex items-center justify-between border-b print:hidden shrink-0 ${
          isEmergency ? 'bg-red-950 border-red-800' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isEmergency ? 'bg-red-600/30 border border-red-500/50 text-red-200' : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                {isEmergency ? '🚨 Emergency School Alert (आपातकालीन सूचना)' : 'Official School Circular'}
              </h3>
              <p className="text-[11px] text-slate-300">विद्यालय आवश्यक परिपत्र व प्रशासनिक आदेश</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Share Notice to WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Print Official Notice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Letterhead Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white print:p-0">
          {/* Printable Letterhead Container */}
          <div className="border-2 border-slate-300 rounded-2xl p-6 sm:p-8 relative bg-white shadow-xs print:border-2 print:border-black print:shadow-none">
            {/* School Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-black uppercase tracking-widest mb-1">
                <Sparkles className="w-3 h-3 text-amber-600 fill-current" />
                <span>कार्यालय - प्रधानाचार्य / विद्यालय प्रशासन</span>
                <Sparkles className="w-3 h-3 text-amber-600 fill-current" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-serif uppercase">
                {schoolName}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {address}, {district}, Uttar Pradesh
              </p>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Affiliated to CBSE / UP Board • School Code: {schoolCode} • Helpline: {adminPhone}
              </p>
            </div>

            {/* Reference & Date Strip */}
            <div className="py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-mono">
              <div>
                <span className="text-slate-400 uppercase text-[10px] block font-bold">Ref No.</span>
                <span className="font-bold text-slate-900">SBSC/NOT/{notice.id.replace('not-', '')}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase text-[10px] block font-bold">Date of Notice</span>
                <span className="font-bold text-slate-900">{formattedDate}</span>
              </div>
            </div>

            {/* Notice Category & Priority Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md border text-xs font-black uppercase ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
              >
                {notice.category || 'General Notice'}
              </span>

              {(notice.priority === 'High' || (notice.priority as any) === 'high') && (
                <span className="px-2.5 py-0.5 rounded-md border border-rose-300 bg-rose-100 text-rose-900 text-xs font-black uppercase">
                  ⚠️ Urgent / महत्वपूर्ण
                </span>
              )}

              {notice.isPinned && (
                <span className="px-2.5 py-0.5 rounded-md border border-blue-300 bg-blue-100 text-blue-900 text-xs font-black uppercase">
                  📌 Pinned Notice
                </span>
              )}

              <span className="text-xs text-slate-500 ml-auto font-medium">
                Target: <b>{notice.targetAudience || 'All Students & Parents'}</b>
              </span>
            </div>

            {/* Notice Title */}
            <div className="pt-3 pb-2">
              <h2 className={`text-lg sm:text-2xl leading-snug ${
                isEmergency ? 'font-black text-red-600 drop-shadow-xs tracking-wide' : 'font-black text-slate-950'
              }`}>
                {notice.title}
              </h2>
            </div>

            {/* Notice Content / Body */}
            <div className="py-4 text-xs sm:text-sm leading-relaxed font-sans border-t border-slate-100 whitespace-pre-line space-y-3">
              <p className={`font-semibold italic ${
                isEmergency ? 'text-red-800' : 'text-slate-600'
              }`}>
                समस्त छात्रों, अभिभावकों एवं संबंधित जनों को सूचित किया जाता है कि:
              </p>
              <div className={`p-4 rounded-xl leading-relaxed whitespace-pre-line ${
                isEmergency
                  ? 'bg-red-50 text-red-700 font-bold border-2 border-red-300 shadow-2xs text-sm sm:text-base'
                  : 'bg-slate-50 text-slate-800 font-normal border border-slate-200 text-xs sm:text-sm'
              }`}>
                {notice.content}
              </div>
            </div>

            {/* Authority Sign & Seal Row */}
            <div className="pt-8 mt-6 border-t-2 border-slate-200 flex items-end justify-between text-xs">
              <div className="text-left space-y-1">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[8px] font-black text-slate-700 uppercase tracking-widest text-center leading-tight">
                  OFFICIAL
                  <br />
                  SCHOOL
                  <br />
                  SEAL
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  SBSC Public School
                </span>
              </div>

              <div className="text-right space-y-1">
                <div className="font-serif italic text-base font-black text-slate-950 font-cursive">
                  {adminName}
                </div>
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                  {notice.postedBy || 'Principal / Administrator'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {schoolName}, Siddharthnagar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden shrink-0">
          <span className="font-semibold">
            Issued By: <b className="text-slate-900">{notice.postedBy || 'School Office'}</b>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
