export interface BirthdayCelebrant {
  id: string;
  type: 'student' | 'teacher';
  name: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob: string; // YYYY-MM-DD
  dobFormatted: string; // DD/MM/YYYY
  age: number; // Turning age this year
  birthMonth: number; // 1 - 12
  birthDay: number; // 1 - 31
  className?: string;
  classId?: string;
  section?: string;
  rollNo?: string;
  admissionNo?: string;
  fatherName?: string;
  motherName?: string;
  guardianPhone?: string;
  phone?: string;
  designation?: string;
  empId?: string;
  photoUrl?: string;
  address?: string;
  isToday: boolean;
  isTomorrow: boolean;
  daysUntil: number; // 0 for today, 1 for tomorrow, etc.
}

export interface BirthdayMessageTemplate {
  id: string;
  title: string;
  language: 'hindi' | 'english' | 'bilingual';
  targetAudience: 'student' | 'teacher' | 'all';
  tag: string;
  templateText: string;
}
