import { Student, Teacher, ClassInfo, SchoolSettings } from '../types/school';
import { BirthdayCelebrant, BirthdayMessageTemplate } from '../types/birthday';
import { formatDateToDDMMYYYY } from './dateUtils';
import { cleanPhoneNumber, generateWhatsAppUrl, generateSmsUrl, cleanTextForSms, dispatchSafeMessage } from '../services/whatsappService';

/**
 * Parses any date-of-birth string into components: { year, month (1-12), day (1-31) }
 */
export function parseDob(dobStr?: string): { year: number; month: number; day: number } | null {
  if (!dobStr) return null;
  const clean = dobStr.trim();

  // Format 1: YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // Format 2: DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  return null;
}

/**
 * Calculates turning age on their birthday in the given target year.
 */
export function calculateTurningAge(birthYear: number, targetYear = new Date().getFullYear()): number {
  return Math.max(1, targetYear - birthYear);
}

/**
 * Computes the number of days until the person's next birthday relative to referenceDate.
 * Returns 0 if birthday is today.
 */
export function calculateDaysUntilBirthday(
  birthMonth: number,
  birthDay: number,
  refDate = new Date()
): number {
  const currentYear = refDate.getFullYear();
  const todayZero = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  // Try birthday in current year
  let bdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);

  // Handle Feb 29 for non-leap years
  if (birthMonth === 2 && birthDay === 29) {
    const isLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
    if (!isLeap) {
      bdayThisYear = new Date(currentYear, 1, 28);
    }
  }

  const diffTime = bdayThisYear.getTime() - todayZero.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    return diffDays;
  }

  // Birthday already passed this year, look at next year
  const nextYear = currentYear + 1;
  let bdayNextYear = new Date(nextYear, birthMonth - 1, birthDay);
  if (birthMonth === 2 && birthDay === 29) {
    const isNextLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
    if (!isNextLeap) {
      bdayNextYear = new Date(nextYear, 1, 28);
    }
  }

  const diffNextTime = bdayNextYear.getTime() - todayZero.getTime();
  return Math.round(diffNextTime / (1000 * 60 * 60 * 24));
}

/**
 * Builds a unified BirthdayCelebrant object from Student data.
 */
export function studentToCelebrant(
  student: Student,
  classes: ClassInfo[],
  refDate = new Date()
): BirthdayCelebrant | null {
  const parsed = parseDob(student.dob);
  if (!parsed) return null;

  const classObj = classes.find((c) => c.id === student.classId);
  const className = classObj?.name || student.classId;
  const daysUntil = calculateDaysUntilBirthday(parsed.month, parsed.day, refDate);
  const age = calculateTurningAge(parsed.year, refDate.getFullYear());

  return {
    id: student.id,
    type: 'student',
    name: student.fullName,
    gender: student.gender,
    dob: student.dob,
    dobFormatted: formatDateToDDMMYYYY(student.dob),
    age,
    birthMonth: parsed.month,
    birthDay: parsed.day,
    className,
    classId: student.classId,
    section: student.section,
    rollNo: student.rollNo,
    admissionNo: student.admissionNo,
    fatherName: student.fatherName,
    motherName: student.motherName,
    guardianPhone: student.guardianPhone || student.emergencyContact,
    phone: student.guardianPhone,
    photoUrl: student.photoUrl,
    address: student.address,
    isToday: daysUntil === 0,
    isTomorrow: daysUntil === 1,
    daysUntil,
  };
}

/**
 * Builds a unified BirthdayCelebrant object from Teacher data.
 */
export function teacherToCelebrant(
  teacher: Teacher,
  refDate = new Date()
): BirthdayCelebrant | null {
  if (!teacher.dob) return null;
  const parsed = parseDob(teacher.dob);
  if (!parsed) return null;

  const daysUntil = calculateDaysUntilBirthday(parsed.month, parsed.day, refDate);
  const age = calculateTurningAge(parsed.year, refDate.getFullYear());

  return {
    id: teacher.id,
    type: 'teacher',
    name: teacher.name,
    gender: teacher.gender,
    dob: teacher.dob,
    dobFormatted: formatDateToDDMMYYYY(teacher.dob),
    age,
    birthMonth: parsed.month,
    birthDay: parsed.day,
    designation: teacher.designation,
    empId: teacher.empId,
    phone: teacher.phone,
    guardianPhone: teacher.phone,
    photoUrl: teacher.photoUrl,
    address: teacher.address,
    isToday: daysUntil === 0,
    isTomorrow: daysUntil === 1,
    daysUntil,
  };
}

/**
 * Retrieves all valid celebrants across students and teachers, sorted by closest upcoming birthday.
 */
export function getAllCelebrants(
  students: Student[],
  teachers: Teacher[],
  classes: ClassInfo[],
  refDate = new Date()
): BirthdayCelebrant[] {
  const celebrants: BirthdayCelebrant[] = [];

  students.forEach((s) => {
    if (s.status === 'Active' || !s.status) {
      const c = studentToCelebrant(s, classes, refDate);
      if (c) celebrants.push(c);
    }
  });

  teachers.forEach((t) => {
    if (t.status === 'Active' || !t.status) {
      const c = teacherToCelebrant(t, refDate);
      if (c) celebrants.push(c);
    }
  });

  // Sort by: daysUntil ascending, then by class/name
  return celebrants.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Returns celebrants whose birthday is TODAY.
 */
export function getTodaysCelebrants(celebrants: BirthdayCelebrant[]): BirthdayCelebrant[] {
  return celebrants.filter((c) => c.isToday);
}

/**
 * Returns celebrants whose birthday is TOMORROW.
 */
export function getTomorrowsCelebrants(celebrants: BirthdayCelebrant[]): BirthdayCelebrant[] {
  return celebrants.filter((c) => c.isTomorrow);
}

/**
 * Returns celebrants whose birthday is within the next N days (including today).
 */
export function getUpcomingCelebrants(celebrants: BirthdayCelebrant[], days = 7): BirthdayCelebrant[] {
  return celebrants.filter((c) => c.daysUntil <= days);
}

/**
 * Returns celebrants born on a specific month and day.
 */
export function getCelebrantsForMonthAndDay(
  celebrants: BirthdayCelebrant[],
  month: number,
  day: number
): BirthdayCelebrant[] {
  return celebrants.filter((c) => c.birthMonth === month && c.birthDay === day);
}

/**
 * Returns celebrants born in a specific month (1-12).
 */
export function getCelebrantsForMonth(celebrants: BirthdayCelebrant[], month: number): BirthdayCelebrant[] {
  return celebrants
    .filter((c) => c.birthMonth === month)
    .sort((a, b) => a.birthDay - b.birthDay);
}

/**
 * Standard Official Admin Birthday Message Templates
 */
export const BIRTHDAY_MESSAGE_TEMPLATES: BirthdayMessageTemplate[] = [
  {
    id: 'hindi_warm_blessing',
    title: 'हिंदी शुभाशीष व बधाई (Hindi Warm Blessing - अनुशंसित)',
    language: 'hindi',
    targetAudience: 'student',
    tag: 'लोकप्रिय / Recommended',
    templateText: `🎂 *जन्मदिन की हार्दिक शुभकामनाएं एवं शुभाशीष!* 🎉

प्रिय छात्र *{student_name}* (कक्षा: *{class_name} - {section}*, प्रवेश सं: *{admission_no}*),

*{school_name}*, बैरवा नानकार परिवार एवं स्कूल प्रशासक *{admin_name}* की ओर से आपको जन्मदिन के पावन अवसर पर अनंत बधाई, स्नेह व मंगलमय शुभाशीष!

ईश्वर आपको उत्तम स्वास्थ्य, दीर्घायु, तीव्र बुद्धि एवं शिक्षा के क्षेत्र में नए कीर्तिमान स्थापित करने की शक्ति प्रदान करें। आप सदैव माता-पिता व विद्यालय का नाम रोशन करें। 🌟📚

सस्नेह शुभाशीष,
— *{admin_name} (प्रशासक / एडमिन)*
🏫 *{school_name}*, सिद्धार्थनगर
📞 हेल्पलाइन: {admin_phone}`,
  },
  {
    id: 'english_formal_academic',
    title: 'English Academic & Future Success Wish',
    language: 'english',
    targetAudience: 'student',
    tag: 'Formal / English',
    templateText: `🎉 *WARM BIRTHDAY CONGRATULATIONS & BLESSINGS!* 🎂

Dear *{student_name}* (Class: *{class_name} - {section}* | Roll #{roll_no} | Adm #{admission_no}),

On the joyous occasion of your birthday, the management, faculty, and Administrator *{admin_name}* of *{school_name}* extend our heartfelt congratulations and best wishes!

May this new year of your life be blessed with good health, intellectual brilliance, and extraordinary achievements in both your academics and co-curricular passions. Keep striving for excellence! 🌟🎓

With warm blessings,
— *{admin_name} (Administrator)*
🏫 *{school_name}*, Bairwa Nankar, Siddharthnagar
📞 Contact: {admin_phone}`,
  },
  {
    id: 'teacher_birthday_blessing',
    title: 'आदरणीय शिक्षक जन्मदिवस बधाई (Teacher & Staff Appreciation)',
    language: 'hindi',
    targetAudience: 'teacher',
    tag: 'शिक्षक / Staff',
    templateText: `💐 *हार्दिक जन्मदिवस शुभकामनाएँ एवं आदर!* 🎂

आदरणीय *{teacher_name}* जी ({designation}),

*{school_name}* परिवार तथा प्रबंधन एवं प्रशासक *{admin_name}* की ओर से आपको जन्मदिवस की अनंत हार्दिक शुभकामनाएं एवं मंगलकामनाएं!

विद्यार्थियों के चरित्र निर्माण एवं विद्यालय की प्रगति में आपका अनमोल मार्गदर्शन व समर्पण अत्यंत सराहनीय है। ईश्वर आपको सदैव स्वस्थ, प्रसन्नचित्त एवं दीर्घायु रखें।

सादर सप्रेम,
— *{admin_name} (प्रशासक)*
🏫 *{school_name}*, बैरवा नानकार, सिद्धार्थनगर
📞 हेल्पलाइन: {admin_phone}`,
  },
  {
    id: 'short_sms_wish',
    title: 'Quick SMS Wish (छोटा संदेश)',
    language: 'bilingual',
    targetAudience: 'all',
    tag: 'SMS Compatible',
    templateText: `Happy Birthday {student_name}! SBSC Public School & Admin {admin_name} wish you joyful celebrations, good health, and glorious success in your studies. - SBSC School, Ph: {admin_phone}`,
  },
];

/**
 * Replaces placeholders in birthday templates.
 */
export function formatBirthdayMessage(
  templateText: string,
  celebrant: BirthdayCelebrant,
  settings: SchoolSettings
): string {
  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';
  const schoolName = settings.schoolName || 'SBSC Public School';

  return templateText
    .replace(/{student_name}/g, celebrant.name)
    .replace(/{teacher_name}/g, celebrant.name)
    .replace(/{name}/g, celebrant.name)
    .replace(/{class_name}/g, celebrant.className || 'School')
    .replace(/{section}/g, celebrant.section || 'A')
    .replace(/{roll_no}/g, celebrant.rollNo || 'N/A')
    .replace(/{admission_no}/g, celebrant.admissionNo || 'N/A')
    .replace(/{father_name}/g, celebrant.fatherName || 'Parent')
    .replace(/{designation}/g, celebrant.designation || 'Faculty Member')
    .replace(/{age}/g, String(celebrant.age))
    .replace(/{dob}/g, celebrant.dobFormatted)
    .replace(/{school_name}/g, schoolName)
    .replace(/{admin_name}/g, adminName)
    .replace(/{admin_phone}/g, adminPhone);
}

/**
 * Generates WhatsApp Click-to-Chat URL for a celebrant.
 */
export function generateBirthdayWhatsAppUrl(
  celebrant: BirthdayCelebrant,
  settings: SchoolSettings,
  templateId = 'hindi_warm_blessing',
  customMessage?: string
): { url: string; message: string; phone: string } {
  const phone = celebrant.guardianPhone || celebrant.phone || '';
  const template =
    BIRTHDAY_MESSAGE_TEMPLATES.find((t) => t.id === templateId) ||
    BIRTHDAY_MESSAGE_TEMPLATES[0];

  const rawMessage = customMessage || template.templateText;
  const message = formatBirthdayMessage(rawMessage, celebrant, settings);
  const sanitized = cleanPhoneNumber(phone);
  const url = generateWhatsAppUrl(sanitized, message);

  return { url, message, phone: sanitized };
}

/**
 * Dispatches Birthday Message via WhatsApp or SMS safely.
 */
export function sendBirthdayWishes(
  celebrant: BirthdayCelebrant,
  settings: SchoolSettings,
  channel: 'whatsapp' | 'sms' = 'whatsapp',
  templateId = 'hindi_warm_blessing',
  customMessage?: string
) {
  const { url, message } = generateBirthdayWhatsAppUrl(celebrant, settings, templateId, customMessage);

  if (channel === 'whatsapp') {
    return dispatchSafeMessage(url, 'whatsapp', message);
  }

  // Cellular SMS
  const cleanSms = cleanTextForSms(message);
  const phoneDigits = celebrant.guardianPhone || celebrant.phone || '';
  const smsUrl = generateSmsUrl(phoneDigits, cleanSms);
  return dispatchSafeMessage(smsUrl, 'sms', cleanSms);
}
