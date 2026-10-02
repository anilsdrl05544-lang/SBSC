import React from 'react';
import { Exam, Student, ClassInfo, AdmitCardRecord } from '../../../types/school';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { GraduationCap, Award, QrCode, ShieldCheck, User } from 'lucide-react';

interface ExamAdmitCardPdfProps {
  exam: Exam;
  student: Student;
  admitCard?: AdmitCardRecord;
  targetClass?: ClassInfo;
}

export const ExamAdmitCardPdf: React.FC<ExamAdmitCardPdfProps> = ({
  exam,
  student,
  admitCard,
  targetClass,
}) => {
  const { classes, settings, getStudentDueAmount } = useSchool();
  const classInfo = targetClass || classes.find((c) => c.id === student.classId);

  // Effective Exam Roll Number: prioritize student's official rollNo, strip prefixes, then AdmitCardRecord rollNo, then fallback
  const rawRoll = student.rollNo?.trim() || admitCard?.rollNo?.trim() || '';
  const effectiveRollNo = rawRoll ? rawRoll.replace(/^(NUR|LKG|UKG)-/, '') : 'N/A';
  const examCenter = admitCard?.examCenter || `${settings.schoolName} Campus, ${settings.address}, ${settings.district}`;
  const reportingTime = admitCard?.reportingTime || '09:00 AM';
  const examTiming = admitCard?.examTiming || '09:30 AM – 11:30 AM';

  // Determine subjects for student's class
  const classSubjects =
    classInfo?.subjects && classInfo.subjects.length > 0
      ? classInfo.subjects
      : [
          { id: 'sub-hin', name: 'हिंदी (Hindi)', code: 'HIN', maxMarks: 50, passingMarks: 17 },
          { id: 'sub-eng', name: 'English Language', code: 'ENG', maxMarks: 50, passingMarks: 17 },
          { id: 'sub-math', name: 'Mathematics (गणित)', code: 'MATH', maxMarks: 50, passingMarks: 17 },
          { id: 'sub-sci', name: 'Science (विज्ञान)', code: 'SCI', maxMarks: 50, passingMarks: 17 },
          { id: 'sub-soc', name: 'Social Studies (सामाजिक विज्ञान)', code: 'SOC', maxMarks: 50, passingMarks: 17 },
        ];

  // Determine 2-Meeting Exam Schedule from exam.timetable or fallback
  const examMeetingSlots = React.useMemo(() => {
    if (Array.isArray(exam.timetable) && exam.timetable.length > 0) {
      return exam.timetable;
    }

    // Fallback generation if timetable not explicitly configured
    const start = new Date(exam.startDate || '2026-03-01');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slots = [];
    const subjects = classSubjects.length > 0 ? classSubjects : [
      { id: 'sub-hin', name: 'हिंदी (Hindi)', code: 'HIN', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-eng', name: 'English Language', code: 'ENG', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-math', name: 'Mathematics (गणित)', code: 'MATH', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-sci', name: 'Science (विज्ञान)', code: 'SCI', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-soc', name: 'Social Studies (सामाजिक विज्ञान)', code: 'SOC', maxMarks: 50, passingMarks: 17 },
    ];

    let curr = new Date(start);
    for (let i = 0; i < subjects.length; i++) {
      if (curr.getDay() === 0) curr.setDate(curr.getDate() + 1);
      const dateStr = curr.toISOString().split('T')[0];
      const dayName = days[curr.getDay()];
      slots.push({
        id: `slot-${i}`,
        date: dateStr,
        day: dayName,
        meeting1: {
          time: exam.meeting1Time || '09:30 AM – 11:30 AM',
          subjectName: subjects[i].name,
          subjectCode: subjects[i].code,
          roomNo: `Hall ${(i % 3) + 1}`,
        },
        meeting2: {
          time: exam.meeting2Time || '12:00 PM – 02:00 PM',
          subjectName: i === 0 ? 'Computer Science' : i === 1 ? 'Drawing / Art' : '-- No Exam (अवकाश) --',
          subjectCode: i === 0 ? 'COMP' : i === 1 ? 'ART' : '',
          roomNo: `Hall ${(i % 3) + 2}`,
        },
      });
      curr.setDate(curr.getDate() + 1);
    }
    return slots;
  }, [exam.timetable, exam.startDate, exam.meeting1Time, exam.meeting2Time, classSubjects]);

  // Verification QR data string
  const qrVerificationData = `SBSC-ADMIT-CARD|${exam.name}|ROLL:${effectiveRollNo}|ADM:${student.admissionNo}|${student.fullName}|CLASS:${classInfo?.name || student.classId}|STATUS:VERIFIED`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrVerificationData)}`;

  // Fee status on Admit card:
  // User directive 1: "Admit card show only all paid and due only tution fee 1800, Exam fee 300, convey fee 1800"
  // User directive 2: "जो बच्चे साधन वाले न हो उनका कुल 2500 बाकी हो उनका भी admit card show on students portal"
  // User directive 3: "जिन बच्चों का कुल बकाया 0 शून्य हैं, या पूरा paid है, उनका tuition fee 0,and Exam fee 0 कर दो।"
  const rawConveyFee = student?.conveyFee || 0;
  const hasConveyance = Boolean(
    (rawConveyFee > 0 && rawConveyFee !== 600) ||
    student?.conveyVehicle ||
    student?.conveyRoute ||
    (student as any)?.transportRoute ||
    (student as any)?.busService ||
    (admitCard?.dueConveyFee !== undefined && admitCard.dueConveyFee > 0)
  );

  const studentDue = typeof getStudentDueAmount === 'function' ? getStudentDueAmount(student.id) : (student.previousDue || 0);
  const isFullyPaid = studentDue <= 0 || (admitCard?.totalDueAmount !== undefined && admitCard.totalDueAmount <= 0);

  const defaultDueTuition = isFullyPaid ? 0 : (hasConveyance ? 1800 : 2200);
  const defaultDueExam = isFullyPaid ? 0 : 300;
  const defaultDueConvey = isFullyPaid ? 0 : (hasConveyance ? 1800 : 0);
  const defaultTotalDue = isFullyPaid ? 0 : (hasConveyance ? 3900 : 2500);

  const dueTuitionFee = isFullyPaid
    ? 0
    : (admitCard?.dueTuitionFee !== undefined ? admitCard.dueTuitionFee : defaultDueTuition);
  const dueExamFee = isFullyPaid
    ? 0
    : (admitCard?.dueExamFee !== undefined ? admitCard.dueExamFee : defaultDueExam);
  const dueConveyFee = isFullyPaid
    ? 0
    : (admitCard?.dueConveyFee !== undefined ? admitCard.dueConveyFee : defaultDueConvey);
  const totalDueAmount = isFullyPaid
    ? 0
    : (admitCard?.totalDueAmount !== undefined ? admitCard.totalDueAmount : (dueTuitionFee + dueExamFee + dueConveyFee));
  const otherFeesStatus = isFullyPaid ? 'FULLY PAID (पूर्णतः चुकता • ₹0)' : (admitCard?.otherFeesStatus || 'ALL PAID (पूर्णतः चुकता)');

  return (
    <div className="bg-white p-6 sm:p-8 max-w-[850px] mx-auto border-2 border-slate-800 rounded-lg text-slate-900 font-sans text-xs relative print:p-4 print:border-2 print:border-black print:max-w-none print:w-full">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <div className="text-center">
          <h1 className="text-9xl font-black tracking-widest uppercase">SBSC</h1>
          <p className="text-4xl font-extrabold uppercase">ADMIT CARD</p>
        </div>
      </div>

      {/* Top Header Strip */}
      <div className="flex justify-between items-center text-[10px] text-slate-700 font-bold border-b border-slate-300 pb-1 mb-2 px-1">
        <span>AFFILIATION NO: {settings.affiliationNo}</span>
        <span className="bg-blue-950 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold">
          {settings.board}
        </span>
        <span>SCHOOL CODE: {settings.schoolCode}</span>
      </div>

      {/* Main School Title & Logo Header */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-blue-950 pb-3 mb-3">
        {/* Left Emblem / School Logo */}
        {settings.logoUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-1 shadow-2xs">
            <img
              src={settings.logoUrl}
              alt="School Logo"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-950 text-amber-300 flex flex-col items-center justify-center border-2 border-amber-400 shrink-0 shadow-xs">
            <GraduationCap className="w-8 h-8" />
            <span className="text-[7px] font-black tracking-tight text-white">ESTD. 2012</span>
          </div>
        )}

        {/* Center Text */}
        <div className="flex-1 text-center">
          <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-wide uppercase font-serif">
            {settings.schoolName}
          </h1>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {settings.address}, {settings.district}, {settings.state} - {settings.pinCode}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-center gap-3">
            <span>📞 Helpline: {settings.phone}</span>
            <span>✉️ {settings.email}</span>
            <span>🌐 {settings.website}</span>
          </p>
        </div>

        {/* Right Seal Badge */}
        {settings.stampUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-1 shadow-2xs">
            <img
              src={settings.stampUrl}
              alt="Official Seal"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-blue-950 flex flex-col items-center justify-center text-blue-950 shrink-0 shadow-xs">
            <Award className="w-7 h-7 text-amber-600" />
            <span className="text-[7px] font-black uppercase tracking-tight">OFFICIAL</span>
          </div>
        )}
      </div>

      {/* Title & Document Badge */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white px-4 py-2 rounded-lg flex items-center justify-between mb-4 shadow-xs print:bg-black print:text-white">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
            Academic Session {settings.academicSession}
          </span>
          <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
            {exam.name || 'EXAMINATION ADMIT CARD'}
          </h2>
        </div>
        <div className="text-right">
          <span className="inline-block bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
            HALL TICKET / प्रवेश पत्र
          </span>
          <span className="block text-[10px] text-slate-300 mt-0.5 font-mono">
            Issued on: {admitCard?.releaseDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Student Details and Photo Section */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mb-4">
        {/* Left 3 columns: Candidate Details Table */}
        <div className="sm:col-span-3 space-y-2">
          {/* Prominent Exam Roll Number Box */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-2.5 flex items-center justify-between shadow-2xs print:border-black print:bg-slate-100">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-950 tracking-wider block">
                EXAMINATION ROLL NUMBER (परीक्षा अनुक्रमांक)
              </span>
              <span className="text-xl font-black font-mono text-blue-950 tracking-wider">
                {effectiveRollNo}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-600 block">Class & Section</span>
              <span className="text-sm font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                {classInfo?.name || student.classId} - {student.section}
              </span>
            </div>
          </div>

          {/* Student Detailed Fields Grid */}
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-bold text-slate-700 w-1/3">Candidate's Name (परीक्षार्थी का नाम):</td>
                <td className="p-2 font-black text-blue-950 uppercase text-sm">
                  {student.fullName}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-bold text-slate-700">Admission No. (प्रवेश क्रमांक):</td>
                <td className="p-2 font-mono font-bold text-slate-900">{student.admissionNo}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-bold text-slate-700">Father's Name (पिता का नाम):</td>
                <td className="p-2 font-bold text-slate-800 uppercase">{student.fatherName}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-bold text-slate-700">Mother's Name (माता का नाम):</td>
                <td className="p-2 font-bold text-slate-800 uppercase">{student.motherName || 'Verified on Record'}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 bg-slate-50 font-bold text-slate-700">Date of Birth (जन्मतिथि):</td>
                <td className="p-2 font-medium text-slate-800">
                  {student.dob ? formatDateToDDMMYYYY(student.dob) : 'Verified on Record'} • Gender: {student.gender || 'Male'}
                </td>
              </tr>
              <tr>
                <td className="p-2 bg-slate-50 font-bold text-slate-700">Examination Center (परीक्षा केंद्र):</td>
                <td className="p-2 font-bold text-slate-900">{examCenter}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right 1 column: Candidate Photo & QR Verification */}
        <div className="flex flex-col items-center justify-between gap-2 border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 print:bg-white">
          {/* Photo Box */}
          <div className="w-28 h-32 border-2 border-dashed border-slate-400 rounded-md overflow-hidden bg-white flex flex-col items-center justify-center p-1 relative shadow-2xs">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="w-full h-full object-cover rounded"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-center p-1 flex flex-col items-center justify-center">
                <User className="w-10 h-10 text-slate-400 mb-1" />
                <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight">
                  Affix Passport Photo
                </span>
                <span className="text-[7px] text-slate-400 mt-0.5">(पासपोर्ट फोटो)</span>
              </div>
            )}
          </div>
          <span className="text-[9px] font-mono text-slate-600 font-bold">
            {student.admissionNo}
          </span>

          {/* QR Code */}
          <div className="w-20 h-20 border border-slate-300 rounded p-1 bg-white flex flex-col items-center justify-center">
            <img
              src={qrUrl}
              alt="Admit Card QR"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback icon if offline
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[7px] font-black text-slate-600 mt-0.5 tracking-tighter">
              VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Official Fee Clearance & Account Status (शुल्क अनापत्ति व अवशेष विवरण) */}
      <div className="mb-3.5 border-2 border-slate-700 rounded-lg overflow-hidden bg-white text-slate-900 shadow-2xs print:border-black">
        <div className="bg-slate-800 text-white px-3 py-1 flex items-center justify-between print:bg-black">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-black text-[10px] uppercase tracking-wider">
              Fee Clearance & Account Verification (शुल्क विवरण व अनापत्ति पत्र)
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.2 rounded font-mono">
            {otherFeesStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-300 bg-slate-50/70 text-center text-[10px]">
          <div className="p-1.5">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Tuition Fee Due (शिक्षण शुल्क)</span>
            <span className={`text-xs font-black font-mono ${isFullyPaid ? 'text-emerald-700' : 'text-rose-700'}`}>
              ₹{dueTuitionFee.toLocaleString('en-IN')}
            </span>
            <span className={`text-[8px] block font-semibold ${isFullyPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isFullyPaid ? 'पूर्णतः चुकता (Paid)' : 'अवशेष देय (Due)'}
            </span>
          </div>

          <div className="p-1.5">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Exam Fee Due (परीक्षा शुल्क)</span>
            <span className={`text-xs font-black font-mono ${isFullyPaid ? 'text-emerald-700' : 'text-rose-700'}`}>
              ₹{dueExamFee.toLocaleString('en-IN')}
            </span>
            <span className={`text-[8px] block font-semibold ${isFullyPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isFullyPaid ? 'पूर्णतः चुकता (Paid)' : 'अवशेष देय (Due)'}
            </span>
          </div>

          <div className="p-1.5">
            <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Convey Fee Due (वाहन शुल्क)</span>
            {isFullyPaid ? (
              <>
                <span className="text-xs font-black font-mono text-emerald-700">₹0</span>
                <span className="text-[8px] text-emerald-700 block font-semibold">पूर्णतः चुकता (Paid)</span>
              </>
            ) : hasConveyance && dueConveyFee > 0 ? (
              <>
                <span className="text-xs font-black font-mono text-rose-700">₹{dueConveyFee.toLocaleString('en-IN')}</span>
                <span className="text-[8px] text-rose-600 block font-semibold">अवशेष देय (Due)</span>
              </>
            ) : (
              <>
                <span className="text-xs font-black font-mono text-slate-700">₹0 (N/A)</span>
                <span className="text-[8px] text-slate-500 block font-semibold">साधन सुविधा नहीं</span>
              </>
            )}
          </div>

          <div className="p-1.5 bg-emerald-50/70">
            <span className="text-[8.5px] font-bold text-emerald-900 uppercase block">Admission, Reg. & Others</span>
            <span className="text-xs font-black text-emerald-700 uppercase">ALL PAID</span>
            <span className="text-[8px] text-emerald-800 block font-semibold">शून्य बकाया (₹0)</span>
          </div>
        </div>

        <div className={`border-t border-slate-300 px-3 py-1 flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-medium gap-1 ${isFullyPaid ? 'bg-emerald-50/90 text-emerald-950' : 'bg-amber-50/90 text-slate-800'}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-blue-950">प्रवेश पत्र अनुमति:</span>
            <span className="text-slate-700">
              {isFullyPaid ? (
                'विद्यार्थी का समस्त विद्यालय शुल्क (शिक्षण ₹0, परीक्षा ₹0, वाहन व पंजीकरण ₹0) पूर्णतः चुकता सत्यापित है। कोई देय अवशेष नहीं (Net Due: ₹0) है।'
              ) : hasConveyance ? (
                `प्रवेश व पंजीकरण सहित अन्य समस्त शुल्क चुकता हैं। केवल उपरोक्त शिक्षण (₹${dueTuitionFee.toLocaleString('en-IN')}), परीक्षा (₹${dueExamFee.toLocaleString('en-IN')}) व वाहन (₹${dueConveyFee.toLocaleString('en-IN')}) शुल्क देय अवशेष हैं।`
              ) : (
                `प्रवेश, पंजीकरण व वाहन सहित अन्य समस्त शुल्क चुकता/शून्य हैं (साधन सुविधा नहीं)। केवल शिक्षण (₹${dueTuitionFee.toLocaleString('en-IN')}) व परीक्षा (₹${dueExamFee.toLocaleString('en-IN')}) शुल्क कुल ₹${totalDueAmount.toLocaleString('en-IN')} देय अवशेष हैं।`
              )}
            </span>
          </div>
          <div className={`shrink-0 font-mono font-black text-[10px] ${isFullyPaid ? 'text-emerald-800' : 'text-rose-800'}`}>
            कुल अवशेष (Net Due): {isFullyPaid ? '₹0 (Nil / पूर्ण चुकता)' : `₹${totalDueAmount.toLocaleString('en-IN')}`}
          </div>
        </div>
      </div>

      {/* Examination Schedule / Date-Sheet Table (2 Meetings) */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-t-lg gap-1">
          <span className="font-extrabold text-blue-950 text-xs uppercase tracking-wide">
            Subject-wise Examination Schedule (विषयवार परीक्षा समय-सारणी — 2 Meetings)
          </span>
          <span className="text-[10px] font-bold text-slate-700">
            Ist Meeting: <b>{exam.meeting1Time || '09:30 AM – 11:30 AM'}</b> • IInd Meeting: <b>{exam.meeting2Time || '12:00 PM – 02:00 PM'}</b>
          </span>
        </div>

        <table className="w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-blue-950 text-white font-extrabold text-center print:bg-slate-800">
              <th className="border border-slate-300 p-1 w-8">S.N.</th>
              <th className="border border-slate-300 p-1 w-20">Exam Date</th>
              <th className="border border-slate-300 p-1 w-16">Day</th>
              <th className="border border-slate-300 p-1 text-left bg-blue-900">
                Ist Meeting (प्रथम पाली)
                <span className="block text-[8px] font-normal text-blue-200 font-mono">
                  {exam.meeting1Time || '09:30 AM – 11:30 AM'}
                </span>
              </th>
              <th className="border border-slate-300 p-1 text-left bg-slate-800">
                IInd Meeting (द्वितीय पाली)
                <span className="block text-[8px] font-normal text-slate-300 font-mono">
                  {exam.meeting2Time || '12:00 PM – 02:00 PM'}
                </span>
              </th>
              <th className="border border-slate-300 p-1 w-16">Room / Hall</th>
              <th className="border border-slate-300 p-1 w-18">Cand. Sign</th>
              <th className="border border-slate-300 p-1 w-18">Invig. Sign</th>
            </tr>
          </thead>
          <tbody>
            {examMeetingSlots.map((slot, idx) => {
              const isEven = idx % 2 === 0;
              const dateObj = new Date(slot.date);
              const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : slot.date;
              const m1None =
                slot.meeting1.subjectName.toLowerCase().includes('no exam') ||
                slot.meeting1.subjectName.includes('खाली') ||
                slot.meeting1.subjectName.includes('अवकाश');
              const m2None =
                !slot.meeting2?.subjectName ||
                slot.meeting2.subjectName.toLowerCase().includes('no exam') ||
                slot.meeting2.subjectName.includes('खाली') ||
                slot.meeting2.subjectName.includes('अवकाश');

              return (
                <tr key={slot.id || idx} className={isEven ? 'bg-white' : 'bg-slate-50/80'}>
                  <td className="border border-slate-300 p-1 text-center font-bold text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold font-mono text-slate-900 whitespace-nowrap">
                    {formattedDate}
                  </td>
                  <td className="border border-slate-300 p-1 text-center text-slate-700 font-semibold">
                    {slot.day}
                  </td>
                  <td className="border border-slate-300 p-1">
                    {m1None && (!slot.meeting1.subject2Name || slot.meeting1.subject2Name.toLowerCase().includes('no exam') || slot.meeting1.subject2Name.includes('खाली')) ? (
                      <span className="text-slate-400 italic text-[9px]">-- No Exam --</span>
                    ) : (
                      <div className="space-y-1">
                        {!m1None && (
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-blue-950">
                              {slot.meeting1.subjectName}
                            </span>
                            {slot.meeting1.subjectCode && (
                              <span className="text-[7.5px] font-mono text-slate-500 font-bold">
                                [{slot.meeting1.subjectCode}]
                              </span>
                            )}
                          </div>
                        )}
                        {slot.meeting1.subject2Name &&
                          !slot.meeting1.subject2Name.toLowerCase().includes('no exam') &&
                          !slot.meeting1.subject2Name.includes('खाली') &&
                          !slot.meeting1.subject2Name.includes('None') && (
                            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200 text-blue-900 font-bold">
                              <span>{slot.meeting1.subject2Name}</span>
                              {slot.meeting1.subject2Code && (
                                <span className="text-[7.5px] font-mono text-slate-500 font-bold">
                                  [{slot.meeting1.subject2Code}]
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-1">
                    {m2None && (!slot.meeting2?.subject2Name || slot.meeting2.subject2Name.toLowerCase().includes('no exam') || slot.meeting2.subject2Name.includes('खाली')) ? (
                      <span className="text-slate-400 italic text-[9px]">-- No Exam --</span>
                    ) : (
                      <div className="space-y-1">
                        {!m2None && (
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-slate-800">
                              {slot.meeting2?.subjectName}
                            </span>
                            {slot.meeting2?.subjectCode && (
                              <span className="text-[7.5px] font-mono text-slate-500 font-bold">
                                [{slot.meeting2.subjectCode}]
                              </span>
                            )}
                          </div>
                        )}
                        {slot.meeting2?.subject2Name &&
                          !slot.meeting2.subject2Name.toLowerCase().includes('no exam') &&
                          !slot.meeting2.subject2Name.includes('खाली') &&
                          !slot.meeting2.subject2Name.includes('None') && (
                            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200 text-slate-700 font-bold">
                              <span>{slot.meeting2.subject2Name}</span>
                              {slot.meeting2.subject2Code && (
                                <span className="text-[7.5px] font-mono text-slate-500 font-bold">
                                  [{slot.meeting2.subject2Code}]
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-700">
                    {slot.meeting1.roomNo || slot.meeting2?.roomNo || 'Hall 1'}
                  </td>
                  <td className="border border-slate-300 p-1"></td>
                  <td className="border border-slate-300 p-1"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Important Instructions (महत्वपूर्ण निर्देश) */}
      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 mb-5 text-[10px] leading-relaxed text-slate-700">
        <h4 className="font-extrabold text-slate-900 uppercase text-[11px] mb-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
          <span>Important Instructions for Candidates (परीक्षार्थियों हेतु महत्वपूर्ण निर्देश):</span>
        </h4>
        <ol className="list-decimal pl-4 space-y-1">
          <li>
            <strong>प्रवेश पत्र की अनिवार्यता:</strong> परीक्षा कक्ष में यह प्रवेश-पत्र (Admit Card) प्रतिदिन लाना अनिवार्य है। बिना वैध प्रवेश पत्र परीक्षा में सम्मिलित होने की अनुमति नहीं दी जाएगी।
          </li>
          <li>
            <strong>समय की पाबंदी:</strong> परीक्षार्थी परीक्षा प्रारंभ होने के निर्धारित समय से कम से कम 20 मिनट पूर्व अपने परीक्षा केंद्र/कक्ष में स्थान ग्रहण कर लें।
          </li>
          <li>
            <strong>वर्जित सामग्री:</strong> परीक्षा कक्ष में मोबाइल फोन, स्मार्ट वॉच, कैलकुलेटर, पेजर, ईयरफोन या किसी भी प्रकार का इलेक्ट्रॉनिक उपकरण ले जाना पूर्णतः प्रतिबंधित है।
          </li>
          <li>
            <strong>लेखन सामग्री:</strong> उत्तर-पुस्तिका में केवल नीले (Blue) अथवा काले (Black) बॉल पेन का ही प्रयोग करें। अनुचित साधन (UFM) का प्रयोग करने पर परीक्षा निरस्त की जा सकती है।
          </li>
          <li>
            <strong>विद्यालय गणवेश:</strong> सभी छात्र-छात्राएं विद्यालय के निर्धारित स्वच्छ गणवेश (Uniform) एवं परिचय-पत्र (ID Card) में ही परीक्षा में उपस्थित हों।
          </li>
        </ol>
      </div>

      {/* Official Signatures Section */}
      <div className="grid grid-cols-4 gap-4 pt-6 border-t-2 border-slate-800 items-end text-center print:pt-4">
        {/* Candidate Signature */}
        <div>
          <div className="w-32 border-b border-slate-400 mx-auto mb-1 h-6"></div>
          <p className="text-[10px] font-bold text-slate-800">Candidate's Signature</p>
          <p className="text-[8px] text-slate-500">(परीक्षार्थी के हस्ताक्षर)</p>
        </div>

        {/* Class Teacher Signature */}
        <div>
          <div className="w-32 border-b border-slate-400 mx-auto mb-1 h-6"></div>
          <p className="text-[10px] font-bold text-slate-800">Class Teacher</p>
          <p className="text-[8px] text-slate-500">(कक्षाध्यापक के हस्ताक्षर)</p>
        </div>

        {/* Controller of Examination */}
        <div>
          <div className="w-32 border-b border-slate-400 mx-auto mb-1 h-6"></div>
          <p className="text-[10px] font-bold text-slate-800">Exam Controller</p>
          <p className="text-[8px] text-slate-500">(परीक्षा नियंत्रक)</p>
        </div>

        {/* Principal & Seal */}
        <div className="relative">
          {settings.stampUrl ? (
            <div className="w-14 h-14 mx-auto mb-1 opacity-90">
              <img
                src={settings.stampUrl}
                alt="Principal Seal"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-32 border-b-2 border-blue-950 mx-auto mb-1 h-6"></div>
          )}
          <p className="text-xs font-black text-blue-950 uppercase">{settings.principalName || 'Vijendra Pal'}</p>
          <p className="text-[10px] font-bold text-slate-700">Principal & Head of School (प्रधानाचार्य)</p>
          <p className="text-[8px] text-slate-500 font-mono">SBSC Public School</p>
        </div>
      </div>
    </div>
  );
};
