import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Exam, ExamTimetableSlot } from '../../types/school';
import {
  STANDARD_EXAM_SUBJECTS,
  generateDefault2MeetingTimetable,
  findSubjectByCodeOrName,
} from '../../utils/timetableUtils';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { ExamTimetablePdf } from '../reports/templates/ExamTimetablePdf';

interface ExamTimetableEditorProps {
  exam: Exam;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ExamTimetableEditor: React.FC<ExamTimetableEditorProps> = ({ exam }) => {
  const { updateExam, settings } = useSchool();

  const [meeting1Time, setMeeting1Time] = useState<string>(exam.meeting1Time || '09:30 AM – 11:30 AM');
  const [meeting2Time, setMeeting2Time] = useState<string>(exam.meeting2Time || '12:00 PM – 02:00 PM');
  const [slots, setSlots] = useState<ExamTimetableSlot[]>(() => {
    if (Array.isArray(exam.timetable) && exam.timetable.length > 0) {
      return exam.timetable;
    }
    return generateDefault2MeetingTimetable(exam.startDate, exam.endDate, exam.meeting1Time, exam.meeting2Time);
  });

  const [isSaved, setIsSaved] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [customSubjectSlots, setCustomSubjectSlots] = useState<{ [key: string]: boolean }>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync when active exam changes
  useEffect(() => {
    const m1 = exam.meeting1Time || '09:30 AM – 11:30 AM';
    const m2 = exam.meeting2Time || '12:00 PM – 02:00 PM';
    setMeeting1Time(m1);
    setMeeting2Time(m2);
    if (Array.isArray(exam.timetable) && exam.timetable.length > 0) {
      setSlots(exam.timetable);
    } else {
      const generated = generateDefault2MeetingTimetable(exam.startDate, exam.endDate, m1, m2);
      setSlots(generated);
      // Persist generated default timetable immediately to the exam object
      updateExam(exam.id, {
        meeting1Time: m1,
        meeting2Time: m2,
        timetable: generated,
      });
    }
    setIsSaved(true);
  }, [exam.id]);

  // Helper to commit slots both locally and to SchoolContext
  const commitSlots = (nextSlots: ExamTimetableSlot[], m1: string = meeting1Time, m2: string = meeting2Time) => {
    setSlots(nextSlots);
    setIsSaved(true);
    updateExam(exam.id, {
      meeting1Time: m1,
      meeting2Time: m2,
      timetable: nextSlots,
    });
  };

  const handleDateChange = (index: number, newDate: string) => {
    const updated = [...slots];
    const d = new Date(newDate);
    const dayName = !isNaN(d.getTime()) ? DAY_NAMES[d.getDay()] : 'Monday';
    updated[index] = {
      ...updated[index],
      date: newDate,
      day: dayName,
    };
    commitSlots(updated);
  };

  // Ist Meeting - Subject Option 1
  const handleMeeting1Subject1Change = (index: number, val: string) => {
    const updated = [...slots];
    if (val === 'CUSTOM') {
      setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m1-s1`]: true }));
      return;
    }
    const matched = findSubjectByCodeOrName(val);
    updated[index] = {
      ...updated[index],
      meeting1: {
        ...updated[index].meeting1,
        subjectName: val,
        subjectCode: matched && matched.code !== 'NONE' ? matched.code : '',
      },
    };
    commitSlots(updated);
  };

  // Ist Meeting - Subject Option 2
  const handleMeeting1Subject2Change = (index: number, val: string) => {
    const updated = [...slots];
    if (val === 'CUSTOM') {
      setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m1-s2`]: true }));
      return;
    }
    const matched = findSubjectByCodeOrName(val);
    const isNone = !val || val === 'NONE' || val.includes('None') || val.includes('कोई नहीं');
    updated[index] = {
      ...updated[index],
      meeting1: {
        ...updated[index].meeting1,
        subject2Name: isNone ? '' : val,
        subject2Code: isNone ? '' : (matched && matched.code !== 'NONE' ? matched.code : ''),
      },
    };
    commitSlots(updated);
  };

  // IInd Meeting - Subject Option 1
  const handleMeeting2Subject1Change = (index: number, val: string) => {
    const updated = [...slots];
    if (val === 'CUSTOM') {
      setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m2-s1`]: true }));
      return;
    }
    const matched = findSubjectByCodeOrName(val);
    updated[index] = {
      ...updated[index],
      meeting2: {
        ...updated[index].meeting2,
        subjectName: val,
        subjectCode: matched && matched.code !== 'NONE' ? matched.code : '',
      },
    };
    commitSlots(updated);
  };

  // IInd Meeting - Subject Option 2
  const handleMeeting2Subject2Change = (index: number, val: string) => {
    const updated = [...slots];
    if (val === 'CUSTOM') {
      setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m2-s2`]: true }));
      return;
    }
    const matched = findSubjectByCodeOrName(val);
    const isNone = !val || val === 'NONE' || val.includes('None') || val.includes('कोई नहीं');
    updated[index] = {
      ...updated[index],
      meeting2: {
        ...updated[index].meeting2,
        subject2Name: isNone ? '' : val,
        subject2Code: isNone ? '' : (matched && matched.code !== 'NONE' ? matched.code : ''),
      },
    };
    commitSlots(updated);
  };

  // Backward compatibility aliases
  const handleMeeting1SubjectChange = handleMeeting1Subject1Change;
  const handleMeeting2SubjectChange = handleMeeting2Subject1Change;

  const handleApplyMeeting1TimeToAll = () => {
    const updated = slots.map((s) => ({
      ...s,
      meeting1: {
        ...s.meeting1,
        time: meeting1Time,
      },
    }));
    commitSlots(updated, meeting1Time, meeting2Time);
  };

  const handleApplyMeeting2TimeToAll = () => {
    const updated = slots.map((s) => ({
      ...s,
      meeting2: {
        ...s.meeting2,
        time: meeting2Time,
      },
    }));
    commitSlots(updated, meeting1Time, meeting2Time);
  };

  const handleAutoGenerateDates = () => {
    const fresh = generateDefault2MeetingTimetable(exam.startDate, exam.endDate, meeting1Time, meeting2Time);
    commitSlots(fresh);
  };

  const handleAddSlot = () => {
    // Pick date following last slot or startDate
    let nextDateStr = exam.startDate || '2026-03-01';
    if (slots.length > 0) {
      const lastDate = new Date(slots[slots.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      if (lastDate.getDay() === 0) {
        lastDate.setDate(lastDate.getDate() + 1);
      }
      nextDateStr = lastDate.toISOString().split('T')[0];
    }
    const d = new Date(nextDateStr);
    const dayName = !isNaN(d.getTime()) ? DAY_NAMES[d.getDay()] : 'Monday';

    const newSlot: ExamTimetableSlot = {
      id: `slot-${Date.now()}`,
      date: nextDateStr,
      day: dayName,
      meeting1: {
        time: meeting1Time,
        subjectName: 'हिंदी (Hindi)',
        subjectCode: 'HIN',
        roomNo: 'Hall 1',
      },
      meeting2: {
        time: meeting2Time,
        subjectName: 'Computer Science',
        subjectCode: 'COMP',
        roomNo: 'Hall 2',
      },
    };

    commitSlots([...slots, newSlot]);
  };

  const handleDeleteSlot = (index: number) => {
    commitSlots(slots.filter((_, i) => i !== index));
  };

  const handleDuplicateSlot = (index: number) => {
    const item = slots[index];
    const copy: ExamTimetableSlot = {
      ...item,
      id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const nextSlots = [...slots];
    nextSlots.splice(index + 1, 0, copy);
    commitSlots(nextSlots);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...slots];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    commitSlots(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === slots.length - 1) return;
    const copy = [...slots];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    commitSlots(copy);
  };

  const handleSaveTimetable = () => {
    commitSlots(slots, meeting1Time, meeting2Time);
    setSaveToast('✓ परीक्षा समय-सारणी (2 Meetings) सफलतापूर्वक सुरक्षित कर दी गई है! यह छात्र पोर्टल (Student Portal) पर तुरंत दिखाई दे रही है।');
    setTimeout(() => setSaveToast(null), 4000);
  };

  const istMeetingCount = slots.reduce((acc, s) => {
    let count = 0;
    if (s.meeting1?.subjectName && !s.meeting1.subjectName.toLowerCase().includes('no exam') && !s.meeting1.subjectName.includes('खाली') && !s.meeting1.subjectName.includes('None')) count++;
    if (s.meeting1?.subject2Name && !s.meeting1.subject2Name.toLowerCase().includes('no exam') && !s.meeting1.subject2Name.includes('खाली') && !s.meeting1.subject2Name.includes('None')) count++;
    return acc + count;
  }, 0);

  const iindMeetingCount = slots.reduce((acc, s) => {
    let count = 0;
    if (s.meeting2?.subjectName && !s.meeting2.subjectName.toLowerCase().includes('no exam') && !s.meeting2.subjectName.includes('खाली') && !s.meeting2.subjectName.includes('None')) count++;
    if (s.meeting2?.subject2Name && !s.meeting2.subject2Name.toLowerCase().includes('no exam') && !s.meeting2.subject2Name.includes('खाली') && !s.meeting2.subject2Name.includes('None')) count++;
    return acc + count;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                Examination Date Sheet (2 Meetings)
              </span>
              <span className="text-xs text-slate-500 font-mono">Session: {exam.session}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-950" />
              <span>{exam.name} — 2-Meeting Examination Time Table</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              प्रथम पाली (Ist Meeting) एवं द्वितीय पाली (IInd Meeting) के समय व विषयों का निर्धारण करें। यह समय-सारणी छात्र प्रवेश पत्र (Admit Card) व पोर्टल पर स्वतः प्रदर्शित होगी।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-900" />
              <span>Print Date Sheet (समय-सारणी प्रिंट)</span>
            </button>

            <button
              onClick={handleSaveTimetable}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-purple-950 hover:bg-purple-900 text-amber-300 ring-2 ring-amber-400'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'Saved to Exam & Cloud ✓' : 'Save Time Table (सुरक्षित करें)'}</span>
            </button>
          </div>
        </div>

        {saveToast && (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-emerald-950 font-bold text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveToast(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs px-2 py-0.5 rounded cursor-pointer font-extrabold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Shift Time Settings Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/60 p-4 rounded-xl border border-purple-200/80">
          {/* Meeting 1 Global Time */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-purple-950 flex items-center justify-between">
              <span>Ist Meeting Time (प्रथम पाली):</span>
              <button
                type="button"
                onClick={handleApplyMeeting1TimeToAll}
                className="text-[10px] text-purple-700 hover:text-purple-950 underline font-bold cursor-pointer"
                title="Apply this timing to all Ist meeting slots below"
              >
                Apply to All
              </button>
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-purple-700 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={meeting1Time}
                onChange={(e) => {
                  setMeeting1Time(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="09:30 AM – 11:30 AM"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-purple-900"
              />
            </div>
            <span className="text-[10px] text-slate-500">e.g. 09:30 AM – 11:30 AM</span>
          </div>

          {/* Meeting 2 Global Time */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-indigo-950 flex items-center justify-between">
              <span>IInd Meeting Time (द्वितीय पाली):</span>
              <button
                type="button"
                onClick={handleApplyMeeting2TimeToAll}
                className="text-[10px] text-indigo-700 hover:text-indigo-950 underline font-bold cursor-pointer"
                title="Apply this timing to all IInd meeting slots below"
              >
                Apply to All
              </button>
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-indigo-700 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={meeting2Time}
                onChange={(e) => {
                  setMeeting2Time(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="12:00 PM – 02:00 PM"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-900"
              />
            </div>
            <span className="text-[10px] text-slate-500">e.g. 12:00 PM – 02:00 PM</span>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={handleAutoGenerateDates}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
              <span>Reset Standard 5-Day Template</span>
            </button>
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <button
              onClick={handleAddSlot}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>+ Add Exam Date / Shift (तिथि जोड़ें)</span>
            </button>
          </div>
        </div>

        {/* Timetable Overview Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-600">
              Total Examination Days: <strong className="text-slate-900 font-bold">{slots.length} Days</strong>
            </span>
            <span className="font-semibold text-purple-900">
              Ist Meeting Papers: <strong className="font-bold">{istMeetingCount}</strong>
            </span>
            <span className="font-semibold text-indigo-900">
              IInd Meeting Papers: <strong className="font-bold">{iindMeetingCount}</strong>
            </span>
          </div>
          {!isSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
              ● Unsaved changes — Click "Save Time Table" to persist
            </span>
          )}
        </div>
      </div>

      {/* Slots Table Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-purple-950 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-40">Exam Date & Day</th>
                <th className="py-3 px-3 bg-purple-900 min-w-[280px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-xs">Ist Meeting (प्रथम पाली / 1st Shift)</span>
                      <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        2 Subject Options
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-200 font-normal">
                      Default Timing: {meeting1Time}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 bg-indigo-900 min-w-[280px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-xs">IInd Meeting (द्वितीय पाली / 2nd Shift)</span>
                      <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        2 Subject Options
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-200 font-normal">
                      Default Timing: {meeting2Time}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 w-28 text-center">Room / Hall</th>
                <th className="py-3 px-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slots.map((slot, index) => {
                const isCustomM1S1 = customSubjectSlots[`${index}-m1-s1`];
                const isCustomM1S2 = customSubjectSlots[`${index}-m1-s2`];
                const isCustomM2S1 = customSubjectSlots[`${index}-m2-s1`];
                const isCustomM2S2 = customSubjectSlots[`${index}-m2-s2`];

                return (
                  <tr key={slot.id || index} className="hover:bg-purple-50/20 transition align-top">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                      {index + 1}
                    </td>

                    {/* Date & Day */}
                    <td className="py-3 px-3 space-y-1">
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(e) => handleDateChange(index, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-900 focus:outline-purple-900"
                      />
                      <span className="inline-block bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        {slot.day}
                      </span>
                    </td>

                    {/* Ist Meeting: 2 Subject Options & Time */}
                    <td className="py-3 px-3 bg-purple-50/25 space-y-2">
                      {/* Subject Option 1 */}
                      <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-purple-950 flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-900 text-amber-300 inline-flex items-center justify-center text-[8px] font-black">
                              1
                            </span>
                            <span>Option 1 (मुख्य विषय):</span>
                          </span>
                          {slot.meeting1.subjectCode && (
                            <span className="font-mono font-bold text-purple-900 bg-purple-100 px-1 rounded text-[9px]">
                              [{slot.meeting1.subjectCode}]
                            </span>
                          )}
                        </div>

                        {isCustomM1S1 ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={slot.meeting1.subjectName}
                              onChange={(e) => {
                                const updated = [...slots];
                                updated[index].meeting1.subjectName = e.target.value;
                                setSlots(updated);
                                setIsSaved(false);
                              }}
                              placeholder="Type Subject 1..."
                              className="w-full bg-white border border-purple-400 rounded px-2 py-1 font-bold text-xs text-purple-950 focus:outline-purple-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m1-s1`]: false }))}
                              className="text-[10px] text-slate-600 font-bold px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300"
                            >
                              List
                            </button>
                          </div>
                        ) : (
                          <select
                            value={slot.meeting1.subjectName}
                            onChange={(e) => handleMeeting1Subject1Change(index, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white border border-purple-300 rounded px-2 py-1 font-bold text-xs text-purple-950 focus:outline-purple-900 cursor-pointer shadow-2xs"
                          >
                            {STANDARD_EXAM_SUBJECTS.map((sub, sIdx) => (
                              <option key={`m1s1-${sub.code}-${sIdx}`} value={sub.name}>
                                {sub.name} {sub.code && sub.code !== 'NONE' ? `[${sub.code}]` : ''}
                              </option>
                            ))}
                            <option value="CUSTOM">+ Type Custom Subject Name...</option>
                          </select>
                        )}
                      </div>

                      {/* Subject Option 2 */}
                      <div className="bg-white p-2 rounded-lg border border-purple-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-purple-900 flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-purple-700 text-white inline-flex items-center justify-center text-[8px] font-black">
                              2
                            </span>
                            <span>Option 2 (द्वितीय / वैकल्पिक विषय):</span>
                          </span>
                          {slot.meeting1.subject2Code && (
                            <span className="font-mono font-bold text-purple-900 bg-purple-100 px-1 rounded text-[9px]">
                              [{slot.meeting1.subject2Code}]
                            </span>
                          )}
                        </div>

                        {isCustomM1S2 ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={slot.meeting1.subject2Name || ''}
                              onChange={(e) => {
                                const updated = [...slots];
                                updated[index].meeting1.subject2Name = e.target.value;
                                setSlots(updated);
                                setIsSaved(false);
                              }}
                              placeholder="Type Subject 2..."
                              className="w-full bg-white border border-purple-400 rounded px-2 py-1 font-bold text-xs text-purple-950 focus:outline-purple-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m1-s2`]: false }))}
                              className="text-[10px] text-slate-600 font-bold px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300"
                            >
                              List
                            </button>
                          </div>
                        ) : (
                          <select
                            value={slot.meeting1.subject2Name || '-- None / No Exam (खाली / कोई नहीं) --'}
                            onChange={(e) => handleMeeting1Subject2Change(index, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white border border-purple-300 rounded px-2 py-1 font-bold text-xs text-purple-950 focus:outline-purple-900 cursor-pointer shadow-2xs"
                          >
                            <option value="NONE">-- None / No Exam (खाली / कोई नहीं) --</option>
                            {STANDARD_EXAM_SUBJECTS.filter((s) => s.code !== 'NONE').map((sub, sIdx) => (
                              <option key={`m1s2-${sub.code}-${sIdx}`} value={sub.name}>
                                {sub.name} {sub.code ? `[${sub.code}]` : ''}
                              </option>
                            ))}
                            <option value="CUSTOM">+ Type Custom Subject Name...</option>
                          </select>
                        )}
                      </div>

                      {/* Timing & Code Row */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">
                            Ist Meeting Timing:
                          </label>
                          <input
                            type="text"
                            value={slot.meeting1.time || meeting1Time}
                            onChange={(e) => {
                              const updated = [...slots];
                              updated[index].meeting1.time = e.target.value;
                              setSlots(updated);
                              setIsSaved(false);
                            }}
                            placeholder="Timing..."
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] font-mono font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">
                            Opt 1 Code:
                          </label>
                          <input
                            type="text"
                            value={slot.meeting1.subjectCode || ''}
                            onChange={(e) => {
                              const updated = [...slots];
                              updated[index].meeting1.subjectCode = e.target.value;
                              setSlots(updated);
                              setIsSaved(false);
                            }}
                            placeholder="e.g. HIN"
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    </td>

                    {/* IInd Meeting: 2 Subject Options & Time */}
                    <td className="py-3 px-3 bg-indigo-50/25 space-y-2">
                      {/* Subject Option 1 */}
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-indigo-950 flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-900 text-amber-300 inline-flex items-center justify-center text-[8px] font-black">
                              1
                            </span>
                            <span>Option 1 (मुख्य विषय):</span>
                          </span>
                          {slot.meeting2?.subjectCode && (
                            <span className="font-mono font-bold text-indigo-900 bg-indigo-100 px-1 rounded text-[9px]">
                              [{slot.meeting2.subjectCode}]
                            </span>
                          )}
                        </div>

                        {isCustomM2S1 ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={slot.meeting2?.subjectName || ''}
                              onChange={(e) => {
                                const updated = [...slots];
                                if (!updated[index].meeting2) {
                                  updated[index].meeting2 = { time: meeting2Time, subjectName: '' };
                                }
                                updated[index].meeting2.subjectName = e.target.value;
                                setSlots(updated);
                                setIsSaved(false);
                              }}
                              placeholder="Type Subject 1..."
                              className="w-full bg-white border border-indigo-400 rounded px-2 py-1 font-bold text-xs text-indigo-950 focus:outline-indigo-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m2-s1`]: false }))}
                              className="text-[10px] text-slate-600 font-bold px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300"
                            >
                              List
                            </button>
                          </div>
                        ) : (
                          <select
                            value={slot.meeting2?.subjectName || '-- No Exam / Study Break (अवकाश / खाली) --'}
                            onChange={(e) => handleMeeting2Subject1Change(index, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white border border-indigo-300 rounded px-2 py-1 font-bold text-xs text-indigo-950 focus:outline-indigo-900 cursor-pointer shadow-2xs"
                          >
                            {STANDARD_EXAM_SUBJECTS.map((sub, sIdx) => (
                              <option key={`m2s1-${sub.code}-${sIdx}`} value={sub.name}>
                                {sub.name} {sub.code && sub.code !== 'NONE' ? `[${sub.code}]` : ''}
                              </option>
                            ))}
                            <option value="CUSTOM">+ Type Custom Subject Name...</option>
                          </select>
                        )}
                      </div>

                      {/* Subject Option 2 */}
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-700 text-white inline-flex items-center justify-center text-[8px] font-black">
                              2
                            </span>
                            <span>Option 2 (द्वितीय / वैकल्पिक विषय):</span>
                          </span>
                          {slot.meeting2?.subject2Code && (
                            <span className="font-mono font-bold text-indigo-900 bg-indigo-100 px-1 rounded text-[9px]">
                              [{slot.meeting2.subject2Code}]
                            </span>
                          )}
                        </div>

                        {isCustomM2S2 ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={slot.meeting2?.subject2Name || ''}
                              onChange={(e) => {
                                const updated = [...slots];
                                if (!updated[index].meeting2) {
                                  updated[index].meeting2 = { time: meeting2Time, subjectName: '' };
                                }
                                updated[index].meeting2.subject2Name = e.target.value;
                                setSlots(updated);
                                setIsSaved(false);
                              }}
                              placeholder="Type Subject 2..."
                              className="w-full bg-white border border-indigo-400 rounded px-2 py-1 font-bold text-xs text-indigo-950 focus:outline-indigo-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setCustomSubjectSlots((prev) => ({ ...prev, [`${index}-m2-s2`]: false }))}
                              className="text-[10px] text-slate-600 font-bold px-1.5 py-1 rounded bg-slate-200 hover:bg-slate-300"
                            >
                              List
                            </button>
                          </div>
                        ) : (
                          <select
                            value={slot.meeting2?.subject2Name || '-- None / No Exam (खाली / कोई नहीं) --'}
                            onChange={(e) => handleMeeting2Subject2Change(index, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white border border-indigo-300 rounded px-2 py-1 font-bold text-xs text-indigo-950 focus:outline-indigo-900 cursor-pointer shadow-2xs"
                          >
                            <option value="NONE">-- None / No Exam (खाली / कोई नहीं) --</option>
                            {STANDARD_EXAM_SUBJECTS.filter((s) => s.code !== 'NONE').map((sub, sIdx) => (
                              <option key={`m2s2-${sub.code}-${sIdx}`} value={sub.name}>
                                {sub.name} {sub.code ? `[${sub.code}]` : ''}
                              </option>
                            ))}
                            <option value="CUSTOM">+ Type Custom Subject Name...</option>
                          </select>
                        )}
                      </div>

                      {/* Timing & Code Row */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">
                            IInd Meeting Timing:
                          </label>
                          <input
                            type="text"
                            value={slot.meeting2?.time || meeting2Time}
                            onChange={(e) => {
                              const updated = [...slots];
                              if (!updated[index].meeting2) {
                                updated[index].meeting2 = { time: meeting2Time, subjectName: '' };
                              }
                              updated[index].meeting2.time = e.target.value;
                              setSlots(updated);
                              setIsSaved(false);
                            }}
                            placeholder="Timing..."
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] font-mono font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">
                            Opt 1 Code:
                          </label>
                          <input
                            type="text"
                            value={slot.meeting2?.subjectCode || ''}
                            onChange={(e) => {
                              const updated = [...slots];
                              if (!updated[index].meeting2) {
                                updated[index].meeting2 = { time: meeting2Time, subjectName: '' };
                              }
                              updated[index].meeting2.subjectCode = e.target.value;
                              setSlots(updated);
                              setIsSaved(false);
                            }}
                            placeholder="e.g. COMP"
                            className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Room / Hall */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="text"
                        value={slot.meeting1.roomNo || slot.meeting2?.roomNo || ''}
                        onChange={(e) => {
                          const updated = [...slots];
                          updated[index].meeting1.roomNo = e.target.value;
                          if (updated[index].meeting2) {
                            updated[index].meeting2.roomNo = e.target.value;
                          }
                          setSlots(updated);
                          setIsSaved(false);
                        }}
                        placeholder="Hall 101"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-center font-mono"
                      />
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === slots.length - 1}
                          title="Move Down"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSlot(index)}
                          title="Duplicate Slot"
                          className="p-1 rounded text-slate-400 hover:text-purple-900 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(index)}
                          title="Delete Exam Date Slot"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar inside Table */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={handleAddSlot}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-white font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Add Another Exam Date (एक और तिथि जोड़ें)</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Total {slots.length} dates configured for {exam.name}
            </span>
            <button
              onClick={handleSaveTimetable}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold transition shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Time Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Date Sheet Modal */}
      {isPrintModalOpen && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Official 2-Meeting Exam Date Sheet - ${exam.name}`}
          fileName={`SBSC-TimeTable-${exam.name.replace(/\s+/g, '_')}.pdf`}
        >
          <ExamTimetablePdf exam={{ ...exam, meeting1Time, meeting2Time, timetable: slots }} />
        </PrintPreviewModal>
      )}
    </div>
  );
};
