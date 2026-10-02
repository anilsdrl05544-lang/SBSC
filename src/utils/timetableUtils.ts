import { ExamTimetableSlot } from '../types/school';

export interface SubjectOption {
  code: string;
  name: string;
  category: 'core' | 'language' | 'science' | 'activity' | 'special';
}

export const STANDARD_EXAM_SUBJECTS: SubjectOption[] = [
  // 12 Requested Primary Examination Subjects
  { code: 'HIN', name: 'हिंदी (Hindi)', category: 'language' },
  { code: 'VYK', name: 'व्याकरण (Vyakaran / Grammar)', category: 'language' },
  { code: 'ENG', name: 'English', category: 'language' },
  { code: 'SOC', name: 'Social (सामाजिक विज्ञान)', category: 'core' },
  { code: 'SCI', name: 'Science (विज्ञान)', category: 'science' },
  { code: 'MATH', name: 'Math (गणित)', category: 'core' },
  { code: 'GEO', name: 'Geography (भूगोल)', category: 'core' },
  { code: 'HIS', name: 'History (इतिहास)', category: 'core' },
  { code: 'SKT', name: 'संस्कृत (Sanskrit)', category: 'language' },
  { code: 'COMP', name: 'Computer', category: 'activity' },
  { code: 'ART', name: 'Art (चित्रकला)', category: 'activity' },
  { code: 'HSC', name: 'Home science (गृह विज्ञान)', category: 'core' },

  // Additional Special / Activity Subjects
  { code: 'GK', name: 'General Knowledge (GK)', category: 'core' },
  { code: 'EVS', name: 'Moral Science / EVS', category: 'science' },
  { code: 'URD', name: 'Urdu (उर्दू)', category: 'language' },
  { code: 'PE', name: 'Physical Education (शारीरिक शिक्षा)', category: 'activity' },
  { code: 'COM', name: 'Commerce / Book Keeping', category: 'core' },
  { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --', category: 'special' },
  { code: 'NONE', name: '-- No Exam / Study Break (अवकाश / खाली) --', category: 'special' },
];

export function findSubjectByCodeOrName(val: string): SubjectOption | undefined {
  if (!val) return undefined;
  return STANDARD_EXAM_SUBJECTS.find(
    (s) => s.name === val || s.code === val || s.name.toLowerCase() === val.toLowerCase()
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generate a default balanced 2-meeting timetable starting from startDate
 * Each meeting contains 2 subject options (Option 1 & Option 2)
 */
export function generateDefault2MeetingTimetable(
  startDateStr: string,
  endDateStr?: string,
  meeting1Time: string = '09:30 AM – 11:30 AM',
  meeting2Time: string = '12:00 PM – 02:00 PM'
): ExamTimetableSlot[] {
  // Balanced 12-subject 2-meeting schedule
  // Meeting 1: Primary + Secondary subject options
  const m1Primary = [
    { code: 'HIN', name: 'हिंदी (Hindi)' },
    { code: 'ENG', name: 'English' },
    { code: 'MATH', name: 'Math (गणित)' },
    { code: 'SCI', name: 'Science (विज्ञान)' },
    { code: 'SOC', name: 'Social (सामाजिक विज्ञान)' },
    { code: 'SKT', name: 'संस्कृत (Sanskrit)' },
  ];

  const m1Secondary = [
    { code: 'VYK', name: 'व्याकरण (Vyakaran / Grammar)' },
    { code: 'URD', name: 'Urdu (उर्दू)' },
    { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --' },
    { code: 'EVS', name: 'Moral Science / EVS' },
    { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --' },
    { code: 'GK', name: 'General Knowledge (GK)' },
  ];

  // Meeting 2: Primary + Secondary subject options
  const m2Primary = [
    { code: 'VYK', name: 'व्याकरण (Vyakaran / Grammar)' },
    { code: 'GEO', name: 'Geography (भूगोल)' },
    { code: 'HIS', name: 'History (इतिहास)' },
    { code: 'COMP', name: 'Computer' },
    { code: 'ART', name: 'Art (चित्रकला)' },
    { code: 'HSC', name: 'Home science (गृह विज्ञान)' },
  ];

  const m2Secondary = [
    { code: 'GK', name: 'General Knowledge (GK)' },
    { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --' },
    { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --' },
    { code: 'NONE', name: '-- None / No Exam (खाली / कोई नहीं) --' },
    { code: 'PE', name: 'Physical Education (शारीरिक शिक्षा)' },
    { code: 'COM', name: 'Commerce / Book Keeping' },
  ];

  let curr = new Date(startDateStr || '2026-03-01');
  if (isNaN(curr.getTime())) {
    curr = new Date();
  }

  const slots: ExamTimetableSlot[] = [];
  const targetCount = m1Primary.length;
  let added = 0;

  for (let step = 0; step < 30 && added < targetCount; step++) {
    // If Sunday, skip
    if (curr.getDay() === 0) {
      curr.setDate(curr.getDate() + 1);
      continue;
    }

    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayName = DAY_NAMES[curr.getDay()];

    const m1_1 = m1Primary[added % m1Primary.length];
    const m1_2 = m1Secondary[added % m1Secondary.length];
    const m2_1 = m2Primary[added % m2Primary.length];
    const m2_2 = m2Secondary[added % m2Secondary.length];

    slots.push({
      id: `slot-${dateStr}-${added + 1}`,
      date: dateStr,
      day: dayName,
      meeting1: {
        time: meeting1Time,
        subjectName: m1_1.name,
        subjectCode: m1_1.code,
        subject2Name: m1_2.code !== 'NONE' ? m1_2.name : '',
        subject2Code: m1_2.code !== 'NONE' ? m1_2.code : '',
        roomNo: `Hall 10${(added % 3) + 1}`,
      },
      meeting2: {
        time: meeting2Time,
        subjectName: m2_1.name,
        subjectCode: m2_1.code,
        subject2Name: m2_2.code !== 'NONE' ? m2_2.name : '',
        subject2Code: m2_2.code !== 'NONE' ? m2_2.code : '',
        roomNo: `Hall 20${(added % 3) + 1}`,
      },
    });

    added++;
    curr.setDate(curr.getDate() + 1);
  }

  return slots;
}
