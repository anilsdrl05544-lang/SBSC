import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BirthdayCelebrant } from '../../types/birthday';
import {
  getAllCelebrants,
  getTodaysCelebrants,
  getUpcomingCelebrants,
  sendBirthdayWishes,
} from '../../utils/birthdayUtils';
import { BirthdayNotificationModal } from '../birthday/BirthdayNotificationModal';
import { PrintableBirthdayCard } from '../birthday/PrintableBirthdayCard';
import {
  Cake,
  Sparkles,
  MessageSquare,
  Printer,
  Calendar,
  ChevronRight,
  Send,
  PartyPopper,
  Clock,
  Award,
  Download,
} from 'lucide-react';

export const BirthdayDashboardWidget: React.FC = () => {
  const { students, teachers, classes, settings } = useSchool();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'today' | 'upcoming' | 'month' | 'date_search'>('today');
  const [selectedCelebrantForCard, setSelectedCelebrantForCard] = useState<BirthdayCelebrant | null>(null);

  const allCelebrants = useMemo(() => {
    return getAllCelebrants(students, teachers, classes);
  }, [students, teachers, classes]);

  const todaysCelebrants = useMemo(() => getTodaysCelebrants(allCelebrants), [allCelebrants]);
  const nextCelebrant = useMemo(() => {
    return allCelebrants.find((c) => !c.isToday);
  }, [allCelebrants]);

  const handleOpenHub = (tab: 'today' | 'upcoming' | 'month' | 'date_search' = 'today') => {
    setModalInitialTab(tab);
    setIsModalOpen(true);
  };

  const handleQuickSend = (celebrant: BirthdayCelebrant, e: React.MouseEvent) => {
    e.stopPropagation();
    sendBirthdayWishes(celebrant, settings, 'whatsapp');
  };

  const handleOpenCard = (celebrant: BirthdayCelebrant, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCelebrantForCard(celebrant);
  };

  return (
    <>
      {todaysCelebrants.length > 0 ? (
        /* Active Today Celebration Banner */
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          {/* Subtle Decorative Circles */}
          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute left-1/4 top-0 -translate-y-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
                  <Cake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                      <span>Today's Birthday Celebrations (आज के जन्मदिवस)</span>
                    </h3>
                    <span className="bg-white text-rose-700 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                      {todaysCelebrants.length} Celebrant{todaysCelebrants.length === 1 ? '' : 's'}!
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium">
                    Administrator <b>{settings.adminName || 'Anil Singh'}</b> wishes our bright minds joyful celebrations!
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenHub('today')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-extrabold text-xs transition border border-white/30 shadow-xs cursor-pointer"
              >
                <span>Birth Date-Wise Hub</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Celebrants Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaysCelebrants.map((c) => (
                <div
                  key={`${c.type}-${c.id}`}
                  onClick={() => handleOpenHub('today')}
                  className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 border border-white/40 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 flex items-center justify-center font-black text-base border-2 border-amber-400 shadow-xs shrink-0 overflow-hidden">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        '🎂'
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate group-hover:text-amber-900 transition">
                          {c.name}
                        </h4>
                      </div>
                      <p className="text-[10px] font-semibold text-blue-950 truncate">
                        {c.type === 'student' ? `${c.className} (${c.section})` : c.designation} • {c.age} yrs
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        Born: {c.dobFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleQuickSend(c, e)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                      title="Send WhatsApp Birthday Wishes"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleOpenCard(c, e)}
                      className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 transition cursor-pointer"
                      title="Greeting Card & Download Options (PNG, PDF, Print)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-900" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Discreet / Clean State When No Birthdays Today */
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Birthdays & Celebrations
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  No birthdays today
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {nextCelebrant ? (
                  <>
                    Next upcoming: <b className="text-slate-900">{nextCelebrant.name}</b> ({nextCelebrant.className || nextCelebrant.designation}) on{' '}
                    <b className="text-amber-800 font-bold">{nextCelebrant.dobFormatted}</b> (in {nextCelebrant.daysUntil} days).
                  </>
                ) : (
                  'Browse student and faculty birthdays by date, month, or class.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenHub('upcoming')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Upcoming Days</span>
            </button>

            <button
              onClick={() => handleOpenHub('date_search')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Search by Date</span>
            </button>
          </div>
        </div>
      )}

      {/* Birthday Modal Hub */}
      <BirthdayNotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalInitialTab}
      />

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
