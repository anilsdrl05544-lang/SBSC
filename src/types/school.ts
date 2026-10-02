export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  email: string;
  linkedId?: string; // studentId or teacherId
  avatarUrl?: string;
  phone?: string;
  assignedClass?: string;
  assignedClassId?: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string; // YYYY-MM-DD
  classId: string;
  section: string;
  bloodGroup: string;
  aadhaarNo?: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  email?: string;
  address: string;
  admissionDate: string;
  photoUrl?: string;
  status: 'Active' | 'Inactive' | 'Alumni' | 'Transferred';
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  emergencyContact: string;
  previousSchool?: string;
  scholarshipStatus?: string;
  board?: string; // Education Board e.g. "UP BOARD"
  password?: string; // Auto-generated formula or custom student password
  previousPhones?: string[]; // Preserves historical phone numbers for seamless login after phone updates
  oldPhone?: string;
  updatedAt?: string;

  // Yearly Due Fees Structure & Breakdown
  totalYearlyDue?: number;   // Total annual fee due
  tuitionFee?: number;       // Annual Tuition Fee
  admissionFee?: number;     // Admission Fee
  registrationFee?: number;  // Registration Fee
  examFee?: number;          // Exam Fee
  conveyFee?: number;        // Conveyance / Transport Fee
  lateFine?: number;         // Late Fine
  previousDue?: number;      // Previous Due / Arrears / Old Balance (पिछला बकाया)

  // Conveyance / Transport Details (वाहन व रूट विवरण)
  conveyRoute?: string;      // e.g. "Riwa Nankar Belt", "Amariya - Sangldeep Route", "Patkhauli - Itauwa Route"
  conveyVehicle?: string;    // e.g. "School Bus 01 (UP 55 T 1234)", "Van 02", "Magic 01"
  conveyStop?: string;       // Stoppage / Landmark (e.g. "Riwa Nankar Chauraha")
  conveyVillage?: string;    // Stoppage Village Name (स्टॉपेज ग्राम / गाँव का नाम e.g. "Riwa Nankar", "Amariya", "Sangldeep", "Patkhauli", "Itauwa", "Dhuswa", "Gayghat")
  conveyDriverName?: string; // Driver Name (e.g. "Ramesh Kumar")
  conveyDriverPhone?: string;// Driver Mobile Number
}

export interface StudentFeeBreakdown {
  tuitionFee: number;
  admissionFee: number;
  registrationFee: number;
  examFee: number;
  conveyFee: number;
  lateFine: number;
  previousDue: number;      // Previous Due / Arrears / Old Balance (पिछला बकाया)
  totalYearlyDue: number;
  totalPaid: number;
  totalDiscount?: number;   // Total Concessions / Discounts Granted (छूट)
  netDue: number;
  // Backward and cross-component compatibility aliases
  dueAmount?: number;
  paidAmount?: number;
  totalFee?: number;
  totalAnnualFee?: number;
}

export interface Teacher {
  id: string;
  empId: string;
  name: string;
  designation: string;
  qualification: string;
  subjects: string[];
  assignedClass?: string; // e.g. "Class 10" or "Class 9"
  assignedClassId?: string; // e.g. "c-10" or "c-9"
  assignedSection?: string; // e.g. "A" or "All"
  email: string;
  phone: string;
  salary: number;
  joinDate: string;
  address: string;
  status: 'Active' | 'On Leave' | 'Resigned';
  gender: 'Male' | 'Female';
  experienceYears: number;
  photoUrl?: string;
  username?: string;
  password?: string;
  isClassTeacher?: boolean;
  dob?: string; // YYYY-MM-DD
  updatedAt?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  maxMarks: number;
  passingMarks: number;
  teacherId?: string;
}

export interface TeacherRelativeClass {
  classInfo: ClassInfo;
  roleType: 'class-teacher' | 'subject-teacher' | 'primary-incharge';
  roleLabel: string;
  subjectsTaught: string[];
}

export interface ClassInfo {
  id: string;
  name: string; // e.g., "Class 10", "Class 9", "Class 5", "UKG"
  gradeNumber: number; // For sorting e.g. -2 for Nursery, 10 for Class 10
  sections: string[]; // ["A", "B"]
  classTeacherId?: string;
  roomNumber: string;
  monthlyFee: number;
  subjects: SubjectItem[];
  capacity: number;
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Leave'
  | 'Sunday'
  | 'Holiday'
  | 'Half-Day'
  | 'Late';

export type AttendanceFineStatus = 'Unpaid' | 'Paid' | 'Waived';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'student' | 'teacher';
  targetId: string; // studentId or teacherId
  classId?: string;
  section?: string;
  status: AttendanceStatus;
  remarks?: string;
  fineAmount?: number;
  fineStatus?: AttendanceFineStatus;
  finePaidDate?: string;
  finePaymentMode?: 'Cash' | 'UPI' | 'Fee Receipt';
  fineReceiptNo?: string;
  fineWaivedReason?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day holidays
  description?: string; // Holiday Reason or detail
  type: 'National' | 'Festival' | 'Gazetted' | 'Institutional' | 'Vacation' | 'Emergency';
}

export interface FeeHead {
  id: string;
  name: string;
  defaultAmount: number;
  type: 'Monthly' | 'Annual' | 'One-Time';
}

export interface FeeStructure {
  id: string;
  classId: string;
  admissionFee: number;
  tuitionFeeMonthly: number;
  examFee: number;
  computerFee: number;
  transportFee: number;
  maintenanceFee: number;
  annualFee: number;
  previousDue?: number; // Previous Due / Arrears head
}

export interface FeePayment {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  classId: string;
  section: string;
  date: string; // YYYY-MM-DD
  monthsPaid: string[]; // ["April 2025", "May 2025"]
  amountPaid: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Cheque' | 'Net Banking';
  transactionRef?: string;
  feeHeadBreakdown: { head: string; amount: number }[];
  discount: number;
  fine: number;
  totalDueBefore: number;
  balanceRemaining: number;
  remarks?: string;
  receivedBy: string;
  academicSession: string;
  status?: 'Active' | 'Cancelled';
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationRemarks?: string;
}

export interface ExamMeetingDetails {
  time: string; // e.g. "08:30 AM – 11:30 AM"
  subjectName: string; // Subject Option 1 e.g. "हिंदी (Hindi)"
  subjectCode?: string; // Subject Option 1 Code e.g. "HIN"
  subject2Name?: string; // Subject Option 2 e.g. "व्याकरण (Vyakaran)" or optional second subject
  subject2Code?: string; // Subject Option 2 Code e.g. "VYK"
  roomNo?: string;
  notes?: string;
  classes?: string[]; // classIds or empty for all
}

export interface ExamTimetableSlot {
  id: string;
  date: string; // YYYY-MM-DD
  day: string; // "Monday", "Tuesday", etc.
  meeting1: ExamMeetingDetails; // Ist Meeting (प्रथम पाली / First Shift)
  meeting2: ExamMeetingDetails; // IInd Meeting (द्वितीय पाली / Second Shift)
  notes?: string;
}

export interface Exam {
  id: string;
  name: string; // e.g. "Quarterly Examination", "Half Yearly Examination", "Annual Examination"
  session: string; // "2026-2027"
  startDate: string;
  endDate: string;
  classes: string[];
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Published' | 'Scheduled';
  maxMarksDefault: number;
  term?: 'Quarterly' | 'Half Yearly' | 'Annual' | string;
  maxMarksPerSubject?: number;
  meeting1Time?: string; // Default timing for Ist Meeting e.g. "08:30 AM – 11:30 AM"
  meeting2Time?: string; // Default timing for IInd Meeting e.g. "12:30 PM – 03:30 PM"
  timetable?: ExamTimetableSlot[]; // 2-Meeting Examination Time Table
  updatedAt?: string;
}

export interface SubjectMark {
  subjectId: string;
  subjectName: string;
  theoryMarks: number;
  practicalMarks?: number;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  remarks?: string;
}

export interface ExamMark {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  section: string;
  subjectMarks: SubjectMark[];
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  attendancePresent?: number;
  attendanceTotal?: number;
  coScholastic?: {
    workEducation?: string;
    artEducation?: string;
    healthPhysical?: string;
    discipline?: string;
  };
  remarks?: string;
  status: 'Draft' | 'Submitted' | 'Published';
}

export interface AdmitCardRecord {
  id: string; // e.g. `ac-${examId}-${studentId}`
  examId: string;
  studentId: string;
  rollNo: string; // Exam Roll Number (editable by admin)
  isReleased: boolean; // true = unlocked/downloadable by student, false = locked
  releaseDate?: string;
  examCenter?: string;
  reportingTime?: string;
  examTiming?: string;
  instructions?: string[];
  lockReason?: string;
  updatedAt?: string;
  feeStatus?: string;
  dueTuitionFee?: number;
  dueExamFee?: number;
  dueConveyFee?: number;
  totalDueAmount?: number;
  otherFeesStatus?: string;
}

export interface Homework {
  id: string;
  classId: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  assignedByTeacherId?: string;
  assignedByTeacherName?: string;
  assignedBy?: string;
  totalSubmissions?: number;
  status: 'Active' | 'Archived';
  attachmentUrl?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  targetAudience: 'All' | 'Students' | 'Teachers' | 'Parents';
  targetClassId?: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  postedBy: string;
  category: 'Academic' | 'Holiday' | 'Fee' | 'Examination' | 'General' | 'Event' | 'Emergency';
  isPinned?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface SalaryRecord {
  id: string;
  empId: string;
  teacherName: string;
  designation: string;
  month: string; // "August 2025"
  year: number;
  basicPay: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'Paid' | 'Pending';
  paymentDate?: string;
  paymentMode?: string;
  transactionRef?: string;
}

export interface Certificate {
  id: string;
  certificateType: 'Transfer Certificate' | 'Character Certificate' | 'Bonafide Certificate' | 'Sports Certificate' | 'Merit Certificate';
  certificateNo: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  motherName?: string;
  admissionNo: string;
  classPassed: string;
  issueDate: string;
  reason: string;
  conduct: string;
  duesCleared: boolean;
  remarks?: string;
  qrCodeData?: string;
}

export interface SchoolSettings {
  schoolName: string;
  name?: string; // alias for schoolName
  subTitle: string;
  tagline: string;
  schoolTagline?: string; // alias for tagline
  address: string;
  schoolAddress?: string; // alias for address
  district: string;
  state: string;
  pinCode: string;
  phone: string;
  contactNumber?: string; // alias for phone
  adminPhone?: string; // admin contact number for teacher password assistance
  adminName?: string; // admin administrator name (e.g. Anil Singh)
  alternatePhone?: string;
  email: string;
  adminEmail?: string;
  website: string;
  affiliationNo: string;
  schoolCode: string;
  board: string;
  principalName: string;
  academicSession: string;
  currencySymbol: string;
  absentFinePerDay?: number; // Absent fine rate per absent day in INR (default: 5)
  upiId?: string;
  logoUrl?: string;
  stampUrl?: string;
  feeSecurityPassword?: string;
  isFeePasswordProtected?: boolean;
  feePasswordLastUpdated?: string;
  updatedAt?: string | number; // Timestamp of last setting change
  gradingScale: {
    minPercent: number;
    maxPercent: number;
    grade: string;
    description: string;
  }[];
}
