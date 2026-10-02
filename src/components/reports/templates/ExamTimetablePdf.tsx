import React from 'react';
import { Exam, ClassInfo } from '../../../types/school';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { GraduationCap, Award, Clock, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ExamTimetablePdfProps {
  exam: Exam;
  selectedClass?: ClassInfo;
}

export const ExamTimetablePdf: React.FC<ExamTimetablePdfProps> = ({ exam, selectedClass }) => {
  const { settings } = useSchool();

  const slots = exam.timetable || [];
  const meeting1Time = exam.meeting1Time || '09:30 AM – 11:30 AM';
  const meeting2Time = exam.meeting2Time || '12:00 PM – 02:00 PM';

  return (
    <div
      className="bg-white p-4 sm:p-5 max-w-[794px] mx-auto border-2 border-slate-800 rounded-lg text-slate-900 font-sans text-xs relative print:p-3 print:border-2 print:border-black print:max-w-none print:w-full avoid-break break-inside-avoid"
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
    >
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <div className="text-center">
          <h1 className="text-9xl font-black tracking-widest uppercase">SBSC</h1>
          <p className="text-4xl font-extrabold uppercase">EXAM TIME TABLE</p>
        </div>
      </div>

      {/* Top Header Strip */}
      <div className="flex justify-between items-center text-[9.5px] text-slate-700 font-bold border-b border-slate-300 pb-1 mb-1.5 px-1 avoid-break break-inside-avoid">
        <span>AFFILIATION NO: {settings.affiliationNo}</span>
        <span className="bg-purple-950 text-white px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider font-extrabold">
          {settings.board}
        </span>
        <span>SCHOOL CODE: {settings.schoolCode}</span>
      </div>

      {/* Main School Title & Logo Header */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-purple-950 pb-2 mb-2 avoid-break break-inside-avoid">
        {settings.logoUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-0.5 shadow-2xs">
            <img
              src={settings.logoUrl}
              alt="School Logo"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-purple-950 text-amber-300 flex flex-col items-center justify-center border-2 border-amber-400 shrink-0 shadow-xs">
            <GraduationCap className="w-6 h-6" />
            <span className="text-[6.5px] font-black tracking-tight text-white">ESTD. 2012</span>
          </div>
        )}

        <div className="flex-1 text-center">
          <h1 className="text-lg sm:text-xl font-black text-purple-950 tracking-wide uppercase font-serif leading-tight">
            {settings.schoolName}
          </h1>
          <p className="text-[10.5px] font-semibold text-slate-700 mt-0.5">
            {settings.address}, {settings.district}, {settings.state} - {settings.pinCode}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5 flex items-center justify-center gap-2.5">
            <span>📞 Helpline: {settings.phone}</span>
            <span>✉️ {settings.email}</span>
            <span>🌐 {settings.website}</span>
          </p>
        </div>

        {settings.stampUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-0.5 shadow-2xs">
            <img
              src={settings.stampUrl}
              alt="Official Seal"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-purple-950 flex flex-col items-center justify-center text-purple-950 shrink-0 shadow-xs">
            <Award className="w-5 h-5 text-amber-600" />
            <span className="text-[6.5px] font-black uppercase tracking-tight">OFFICIAL</span>
          </div>
        )}
      </div>

      {/* Title & Document Badge */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white px-3 py-1.5 rounded-lg flex items-center justify-between mb-2 shadow-xs print:bg-black print:text-white avoid-break break-inside-avoid">
        <div>
          <span className="text-[9px] uppercase font-bold text-amber-300 tracking-wider block">
            Academic Session {exam.session || settings.academicSession}
          </span>
          <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase">
            {exam.name} — OFFICIAL DATE SHEET & TIME TABLE (परीक्षा समय-सारणी)
          </h2>
          {selectedClass && (
            <span className="text-[10px] text-purple-200 font-bold block mt-0.5">
              Class: {selectedClass.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="inline-block bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
            2 MEETINGS / दो पारियां
          </span>
          <span className="block text-[9.5px] text-slate-300 mt-0.5 font-mono">
            Duration: {formatDateToDDMMYYYY(exam.startDate)} to {formatDateToDDMMYYYY(exam.endDate)}
          </span>
        </div>
      </div>

      {/* 2 Meetings Shift Timings Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 avoid-break break-inside-avoid">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-950 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            Ist
          </div>
          <div>
            <span className="text-[9.5px] font-black uppercase text-purple-950 tracking-wider block">
              Ist Meeting (प्रथम पाली / Morning Shift)
            </span>
            <span className="text-xs font-extrabold text-slate-900 font-mono">
              {meeting1Time}
            </span>
            <span className="block text-[9px] text-slate-500 font-medium">
              Reporting: 30 minutes before commencement
            </span>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            IInd
          </div>
          <div>
            <span className="text-[9.5px] font-black uppercase text-indigo-950 tracking-wider block">
              IInd Meeting (द्वितीय पाली / Afternoon Shift)
            </span>
            <span className="text-xs font-extrabold text-slate-900 font-mono">
              {meeting2Time}
            </span>
            <span className="block text-[9px] text-slate-500 font-medium">
              Reporting: 20 minutes before commencement
            </span>
          </div>
        </div>
      </div>

      {/* 2-Meeting Examination Schedule Table */}
      <div className="mb-2.5">
        <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
          <thead>
            <tr className="bg-purple-950 text-white font-extrabold text-center print:bg-slate-900 avoid-break break-inside-avoid">
              <th className="border border-slate-300 p-1.5 w-9">S.N.</th>
              <th className="border border-slate-300 p-1.5 w-24">Exam Date</th>
              <th className="border border-slate-300 p-1.5 w-20">Day</th>
              <th className="border border-slate-300 p-1.5 bg-purple-900 text-left">
                Ist Meeting (प्रथम पाली)
                <span className="block text-[8.5px] font-normal text-purple-200 font-mono">
                  {meeting1Time}
                </span>
              </th>
              <th className="border border-slate-300 p-1.5 bg-indigo-900 text-left">
                IInd Meeting (द्वितीय पाली)
                <span className="block text-[8.5px] font-normal text-indigo-200 font-mono">
                  {meeting2Time}
                </span>
              </th>
              <th className="border border-slate-300 p-1.5 w-20 text-center">Room / Hall</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr className="avoid-break break-inside-avoid">
                <td colSpan={6} className="text-center py-4 text-slate-500 italic">
                  No examination dates scheduled yet.
                </td>
              </tr>
            ) : (
              slots.map((slot, index) => {
                const isEven = index % 2 === 0;
                const m1None =
                  !slot.meeting1?.subjectName ||
                  slot.meeting1.subjectName.toLowerCase().includes('no exam') ||
                  slot.meeting1.subjectName.includes('खाली') ||
                  slot.meeting1.subjectName.includes('अवकाश') ||
                  slot.meeting1.subjectName.includes('None');
                const m2None =
                  !slot.meeting2?.subjectName ||
                  slot.meeting2.subjectName.toLowerCase().includes('no exam') ||
                  slot.meeting2.subjectName.includes('खाली') ||
                  slot.meeting2.subjectName.includes('अवकाश') ||
                  slot.meeting2.subjectName.includes('None');

                return (
                  <tr
                    key={slot.id || index}
                    className={`${isEven ? 'bg-white' : 'bg-slate-50/70'} avoid-break break-inside-avoid`}
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-600">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold font-mono text-slate-900 whitespace-nowrap">
                      {formatDateToDDMMYYYY(slot.date)}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-700">
                      {slot.day}
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      {m1None && (!slot.meeting1?.subject2Name || slot.meeting1.subject2Name.toLowerCase().includes('no exam') || slot.meeting1.subject2Name.includes('खाली')) ? (
                        <span className="text-slate-400 italic text-[9.5px]">
                          — No Examination (अवकाश) —
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {/* Subject 1 */}
                          {!m1None && (
                            <div>
                              <div className="font-extrabold text-purple-950 text-[11px] flex items-center gap-1.5 flex-wrap">
                                <span className="text-[8.5px] bg-purple-900 text-amber-300 font-black px-1 rounded">1</span>
                                <span>{slot.meeting1.subjectName}</span>
                                {slot.meeting1.subjectCode && (
                                  <span className="bg-purple-100 text-purple-800 font-mono font-bold px-1 rounded text-[8.5px]">
                                    [{slot.meeting1.subjectCode}]
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Subject 2 if present */}
                          {slot.meeting1?.subject2Name &&
                            !slot.meeting1.subject2Name.toLowerCase().includes('no exam') &&
                            !slot.meeting1.subject2Name.includes('खाली') &&
                            !slot.meeting1.subject2Name.includes('None') && (
                              <div className="pt-0.5 border-t border-purple-100">
                                <div className="font-bold text-purple-900 text-[10px] flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[8.5px] bg-purple-700 text-white font-black px-1 rounded">2</span>
                                  <span>{slot.meeting1.subject2Name}</span>
                                  {slot.meeting1.subject2Code && (
                                    <span className="bg-purple-50 text-purple-700 font-mono font-bold px-1 rounded text-[8px]">
                                      [{slot.meeting1.subject2Code}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          <div className="text-[8.5px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-purple-700" />
                            <span>{slot.meeting1?.time || meeting1Time}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-1.5">
                      {m2None && (!slot.meeting2?.subject2Name || slot.meeting2.subject2Name.toLowerCase().includes('no exam') || slot.meeting2.subject2Name.includes('खाली')) ? (
                        <span className="text-slate-400 italic text-[9.5px]">
                          — No Examination (अवकाश) —
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {/* Subject 1 */}
                          {!m2None && (
                            <div>
                              <div className="font-extrabold text-indigo-950 text-[11px] flex items-center gap-1.5 flex-wrap">
                                <span className="text-[8.5px] bg-indigo-900 text-amber-300 font-black px-1 rounded">1</span>
                                <span>{slot.meeting2?.subjectName}</span>
                                {slot.meeting2?.subjectCode && (
                                  <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-1 rounded text-[8.5px]">
                                    [{slot.meeting2.subjectCode}]
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Subject 2 if present */}
                          {slot.meeting2?.subject2Name &&
                            !slot.meeting2.subject2Name.toLowerCase().includes('no exam') &&
                            !slot.meeting2.subject2Name.includes('खाली') &&
                            !slot.meeting2.subject2Name.includes('None') && (
                              <div className="pt-0.5 border-t border-indigo-100">
                                <div className="font-bold text-indigo-900 text-[10px] flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[8.5px] bg-indigo-700 text-white font-black px-1 rounded">2</span>
                                  <span>{slot.meeting2.subject2Name}</span>
                                  {slot.meeting2.subject2Code && (
                                    <span className="bg-indigo-50 text-indigo-700 font-mono font-bold px-1 rounded text-[8px]">
                                      [{slot.meeting2.subject2Code}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          <div className="text-[8.5px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-indigo-700" />
                            <span>{slot.meeting2?.time || meeting2Time}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-700 font-semibold text-[9.5px]">
                      {slot.meeting1?.roomNo || slot.meeting2?.roomNo || 'Main Hall'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rules & Instructions */}
      <div
        className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/70 mb-2.5 text-[9.5px] leading-relaxed text-slate-700 rules-block avoid-break break-inside-avoid"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <h4 className="font-extrabold text-slate-900 uppercase text-[10px] mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-950" />
          <span>RULES & INSTRUCTIONS FOR CANDIDATES (परीक्षार्थियों हेतु महत्वपूर्ण निर्देश):</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] leading-snug">
          <p>1. परीक्षार्थी परीक्षा प्रारंभ होने से 30 मिनट पूर्व अपने परीक्षा कक्ष में अनिवार्य रूप से स्थान ग्रहण करें।</p>
          <p>2. प्रत्येक परीक्षार्थी के पास विद्यालय द्वारा जारी आधिकारिक प्रवेश पत्र (Admit Card) व पहचान पत्र होना अनिवार्य है।</p>
          <p>3. परीक्षा कक्ष में मोबाइल फोन, स्मार्ट वॉच, कैलकुलेटर अथवा अन्य इलेक्ट्रॉनिक गैजेट्स पूर्णतः वर्जित हैं।</p>
          <p>4. उत्तरपुस्तिका पर रोल नंबर व विवरण स्पष्ट अक्षरों में लिखें; किसी भी प्रकार के अनुचित साधन (UFM) का प्रयोग दंडनीय है।</p>
          <p>5. द्वितीय पाली (IInd Meeting) के परीक्षार्थी दोपहर 12:10 PM तक अनिवार्य रूप से परीक्षा केंद्र पर उपस्थित हों।</p>
          <p>6. परीक्षा समाप्त होने तक किसी भी छात्र को कक्ष से बाहर जाने की अनुमति नहीं होगी।</p>
        </div>
      </div>

      {/* Signatures & Seal */}
      <div
        className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-3 text-center text-[10.5px] signature-block avoid-break break-inside-avoid"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <div>
          <div className="h-8 flex items-end justify-center">
            <span className="font-serif italic font-bold text-slate-700 text-xs">Controller of Exams</span>
          </div>
          <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800 text-[10px]">
            Exam Superintendent / प्रभारी
          </div>
        </div>

        <div className="flex flex-col items-center justify-end">
          {settings.stampUrl ? (
            <img
              src={settings.stampUrl}
              alt="Seal"
              className="w-10 h-10 object-contain mb-0.5 opacity-90"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[6.5px] text-slate-400 font-bold mb-0.5">
              OFFICIAL SEAL
            </div>
          )}
          <span className="text-[9px] text-slate-500 font-bold">Institution Seal</span>
        </div>

        <div>
          <div className="h-8 flex items-end justify-center">
            <span className="font-serif italic font-extrabold text-blue-950 text-xs">
              {settings.principalName || 'Vijendra Pal'}
            </span>
          </div>
          <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800 text-[10px]">
            Principal / Headmaster
          </div>
        </div>
      </div>
    </div>
  );
};
