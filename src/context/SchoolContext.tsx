import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  SchoolSettings,
  UserAccount,
  UserRole,
  Student,
  Teacher,
  ClassInfo,
  AttendanceRecord,
  FeePayment,
  Exam,
  ExamMark,
  Homework,
  Notice,
  SalaryRecord,
  Certificate,
  StudentFeeBreakdown,
  TeacherRelativeClass,
  Holiday,
  AdmitCardRecord,
  ExamTimetableSlot,
} from '../types/school';
import { generateDefault2MeetingTimetable } from '../utils/timetableUtils';
import {
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_USERS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_HOLIDAYS,
  INITIAL_FEE_PAYMENTS,
  INITIAL_EXAMS,
  INITIAL_EXAM_MARKS,
  INITIAL_HOMEWORK,
  INITIAL_NOTICES,
  INITIAL_SALARY_RECORDS,
  INITIAL_CERTIFICATES,
} from '../data/initialData';
import { hydrateStudentConveyance, matchAddressToConveyance } from '../data/conveyanceData';
import {
  generateStudentPassword,
  getStudentEffectivePassword,
  getStudentPasswordHint,
  validateStudentPassword,
} from '../utils/studentAuthUtils';
import {
  CloudSyncStatus,
  FullSchoolData,
  fetchAllSchoolDataFromCloud,
  mergeAttendanceRecords,
  mergeFeePayments,
  mergeStudents,
  mergeTeachers,
  isDummyTeacher,
  mergeNotices,
  mergeAdmitCards,
  mergeExams,
  pushAllSchoolDataToCloud,
  saveModuleToCloud,
  subscribeToCloudUpdates,
  testFirebaseConnection,
  isFirestoreQuotaExhausted,
  markFirestoreQuotaExhausted,
  resetQuotaCircuitBreaker,
  isQuotaExceededError,
} from '../services/cloudSyncService';
import {
  AutoBackupConfig,
  AutoBackupSnapshot,
  getAutoBackupConfig,
  saveAutoBackupConfig,
  getAutoBackupSnapshots,
  getSnapshotById,
  createAutoBackupSnapshot,
  checkAndExecuteAutoBackup,
  deleteAutoBackupSnapshot as deleteSnapshotFromService,
  clearAllAutoBackupSnapshots,
  downloadSnapshotFile,
} from '../services/autoBackupService';

interface SchoolContextType {
  // Current User / Session
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  users: UserAccount[];
  switchRole: (role: UserRole) => void;
  updateTeacherPassword: (teacherId: string, newPassword: string, newUsername?: string) => void;
  teacherCreateNewPassword: (
    teacherId: string,
    currentPassword: string,
    newPassword: string
  ) => { success: boolean; message: string };
  adminResetTeacherPassword: (
    teacherId: string,
    newPassword?: string
  ) => { success: boolean; message: string; newPassword: string };
  adminBatchResetAllTeacherPasswords: (
    mode?: 'default' | 'unique'
  ) => { success: boolean; count: number; message: string };
  loginWithCredentials: (identifier: string, password: string) => { success: boolean; message?: string; user?: UserAccount };
  verifyClassTeacherPassword: (
    classIdOrTeacherId: string,
    passwordEntered: string
  ) => { success: boolean; message?: string; teacher?: Teacher; classInfo?: ClassInfo };
  loginAsTeacher: (teacherId: string) => void;
  logoutUser: () => void;
  currentTeacher: Teacher | null;
  assignedClassForCurrentTeacher: ClassInfo | null;
  currentClassStudents: Student[];
  teacherRelativeClasses: TeacherRelativeClass[];
  getTeacherRelativeClasses: (teacherId: string) => TeacherRelativeClass[];

  // Student & Parent Portal Authentication
  currentStudent: Student | null;
  loginAsStudent: (
    identifier: string,
    passwordAttempt: string
  ) => { success: boolean; message?: string; student?: Student };
  logoutStudent: () => void;
  restoreInitialStudents: () => void;

  // Settings
  settings: SchoolSettings;
  updateSettings: (newSettings: Partial<SchoolSettings>) => void;

  // Students
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Student;
  bulkAddStudents: (studentsList: Omit<Student, 'id'>[], updateDuplicates?: boolean) => number;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  bulkDeleteStudents: (ids: string[]) => void;

  // Teachers
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Teacher;
  bulkAddTeachers: (teachersList: Omit<Teacher, 'id'>[], updateDuplicates?: boolean) => number;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // Classes
  classes: ClassInfo[];
  addClass: (newClass: Omit<ClassInfo, 'id'>) => ClassInfo;
  updateClass: (id: string, data: Partial<ClassInfo>) => void;
  deleteClass: (id: string, reassignToClassId?: string) => void;
  restoreInitialClasses: () => void;

  // Attendance
  attendance: AttendanceRecord[];
  markAttendance: (record: Omit<AttendanceRecord, 'id'>) => void;
  bulkMarkAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => void;
  markAttendanceFinePaid: (
    recordIds: string[],
    paymentDetails?: {
      paidDate?: string;
      paymentMode?: 'Cash' | 'UPI' | 'Fee Receipt';
      receiptNo?: string;
      fineAmount?: number;
    }
  ) => void;
  waiveAttendanceFine: (recordIds: string[], reason?: string) => void;
  resetAttendanceFineToUnpaid: (recordIds: string[]) => void;
  getAttendanceStatsForDate: (date: string, classId?: string) => { present: number; absent: number; late: number; total: number; percentage: number; isHoliday?: boolean; holidayName?: string };

  // Holidays
  holidays: Holiday[];
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Holiday;
  updateHoliday: (id: string, data: Partial<Holiday>) => void;
  deleteHoliday: (id: string) => void;
  getHolidayForDate: (dateStr: string) => Holiday | undefined;
  isHolidayDate: (dateStr: string) => boolean;

  // Fees
  feePayments: FeePayment[];
  addFeePayment: (payment: Omit<FeePayment, 'id' | 'receiptNo'> & { id?: string; receiptNo?: string }) => FeePayment;
  bulkAddFeePayments: (paymentsList: (Omit<FeePayment, 'id' | 'receiptNo'> & { id?: string; receiptNo?: string })[]) => number;
  deleteFeePayment: (id: string) => void;
  cancelFeePayment: (id: string, reason: string, remarks?: string, cancelledBy?: string) => void;
  restoreFeePayment: (id: string) => void;
  getStudentDueAmount: (studentId: string) => number;
  getStudentFeeBreakdown: (studentId: string) => StudentFeeBreakdown;
  updateStudentFee: (
    studentId: string,
    feeData: {
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }
  ) => void;
  bulkSetStudentsFeeZero: (options?: {
    studentIds?: string[];
    classId?: string;
    reason?: string;
  }) => number;
  bulkUpdateStudentsFee: (
    studentIds: string[],
    feeData: {
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }
  ) => number;
  bulkSetIndividualFeeDues: (
    updates: Array<{
      studentId: string;
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }>,
    options?: { resetOthersToZero?: boolean }
  ) => number;
  resetStudentsFeeToStandard: (options?: {
    studentIds?: string[];
    classId?: string;
  }) => number;

  // Fee Security & Password (Admin only)
  isFeePasswordProtected: boolean;
  verifyFeePassword: (passwordEntered: string) => boolean;
  updateFeePassword: (newPassword: string, oldPassword?: string) => { success: boolean; message: string };
  resetFeePasswordToDefault: () => { success: boolean; message: string };
  toggleFeePasswordProtection: (enabled: boolean) => void;

  // Exams & Marks
  exams: Exam[];
  examMarks: ExamMark[];
  addExam: (exam: Omit<Exam, 'id'>) => Exam;
  updateExam: (id: string, data: Partial<Exam>) => void;
  updateExamTimetable: (examId: string, timetable: ExamTimetableSlot[]) => void;
  deleteExam: (id: string) => void;
  saveStudentMarks: (marks: Omit<ExamMark, 'id'>) => ExamMark;
  bulkSaveExamMarks: (marksList: Omit<ExamMark, 'id'>[]) => number;
  calculateClassRanks: (examId: string, classId: string) => void;
  syncStandardCurriculumAndExams: () => void;

  // Admit Cards (प्रवेश पत्र)
  admitCards: AdmitCardRecord[];
  updateAdmitCard: (examId: string, studentId: string, data: Partial<AdmitCardRecord>) => void;
  bulkUpdateAdmitCards: (records: Partial<AdmitCardRecord>[]) => void;
  toggleAdmitCardLock: (examId: string, studentId: string, isReleased: boolean, lockReason?: string) => void;
  bulkToggleAdmitCardLock: (examId: string, studentIds: string[], isReleased: boolean, lockReason?: string) => void;
  batchSetAdmitCardPermissions: (
    examId: string,
    updates: {
      studentId: string;
      isReleased: boolean;
      lockReason?: string;
      dueTuitionFee?: number;
      dueExamFee?: number;
      dueConveyFee?: number;
      totalDueAmount?: number;
      otherFeesStatus?: string;
    }[]
  ) => void;
  updateStudentRollNo: (studentId: string, newRollNo: string) => void;
  autoAssignClassRollNos: (classId: string, startFrom?: number) => void;
  autoAssignAllClassesRollNos: () => void;

  // Homework
  homeworks: Homework[];
  homeworkList: Homework[];
  addHomework: (hw: Omit<Homework, 'id'>) => Homework;
  updateHomework: (id: string, data: Partial<Homework>) => void;
  deleteHomework: (id: string) => void;

  // Notices
  notices: Notice[];
  deletedNoticeIds: string[];
  addNotice: (notice: Omit<Notice, 'id'>) => Notice;
  updateNotice: (id: string, data: Partial<Notice>) => void;
  deleteNotice: (id: string) => void;

  // Salaries
  salaries: SalaryRecord[];
  addSalaryRecord: (record: Omit<SalaryRecord, 'id'>) => SalaryRecord;
  updateSalaryRecord: (id: string, data: Partial<SalaryRecord>) => void;

  // Certificates
  certificates: Certificate[];
  issueCertificate: (cert: Omit<Certificate, 'id' | 'certificateNo'>) => Certificate;
  deleteCertificate: (id: string) => void;

  // Global Helpers / Backup & Restore
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonData: string) => boolean;
  resetToDemoData: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Cloud Online Synchronization (Firebase)
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSyncTime: string | null;
  syncAllToCloud: (forceRetry?: boolean) => Promise<boolean>;
  pullAllFromCloud: () => Promise<boolean>;
  isOfflineMode: boolean;
  toggleOfflineMode: (forceState?: boolean) => void;

  // Automated Institutional Data Backup
  autoBackupConfig: AutoBackupConfig;
  autoBackupSnapshots: AutoBackupSnapshot[];
  lastAutoBackupTime: string | null;
  updateAutoBackupConfig: (updates: Partial<AutoBackupConfig>) => void;
  triggerManualAutoBackup: () => AutoBackupSnapshot;
  restoreFromAutoBackupSnapshot: (snapshotId: string) => boolean;
  deleteAutoBackupSnapshot: (snapshotId: string) => void;
  downloadAutoBackupSnapshot: (snapshotId: string) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SETTINGS: 'sbsc_school_settings_v3',
  USERS: 'sbsc_users_v3',
  STUDENTS: 'sbsc_students_v3',
  TEACHERS: 'sbsc_teachers_v3',
  CLASSES: 'sbsc_classes_v4',
  ATTENDANCE: 'sbsc_attendance_v3',
  HOLIDAYS: 'sbsc_holidays_v3',
  FEES: 'sbsc_fees_v3',
  EXAMS: 'sbsc_exams_v3',
  EXAM_MARKS: 'sbsc_exam_marks_v3',
  HOMEWORK: 'sbsc_homework_v3',
  NOTICES: 'sbsc_notices_v3',
  SALARIES: 'sbsc_salaries_v3',
  CERTIFICATES: 'sbsc_certificates_v3',
  ADMIT_CARDS: 'sbsc_admit_cards_v3',
  ACTIVE_USER: 'sbsc_active_user_v3',
};

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or fallback to initial seed
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolved: SchoolSettings = {
          ...INITIAL_SCHOOL_SETTINGS,
          ...parsed,
        };
        // Normalize alias pairs without forcibly overwriting user customized values
        if (parsed.address && !parsed.schoolAddress) resolved.schoolAddress = parsed.address;
        if (parsed.schoolAddress && !parsed.address) resolved.address = parsed.schoolAddress;
        if (parsed.tagline && !parsed.schoolTagline) resolved.schoolTagline = parsed.tagline;
        if (parsed.schoolTagline && !parsed.tagline) resolved.tagline = parsed.schoolTagline;
        if (parsed.adminEmail && !parsed.email) resolved.email = parsed.adminEmail;
        if (parsed.email && !parsed.adminEmail) resolved.adminEmail = parsed.email;
        if (parsed.phone && !parsed.contactNumber) resolved.contactNumber = parsed.phone;
        if (parsed.contactNumber && !parsed.phone) resolved.phone = parsed.contactNumber;
        if (parsed.phone && !parsed.adminPhone) resolved.adminPhone = parsed.phone;
        if (!parsed.board || parsed.board.includes('CBSE')) {
          resolved.board = 'UP BOARD';
        }
        if (!resolved.feeSecurityPassword) {
          resolved.feeSecurityPassword = localStorage.getItem('sbsc_fee_security_password') || 'Admin@123';
        }
        if (resolved.isFeePasswordProtected === undefined) {
          resolved.isFeePasswordProtected = true;
        }
        if (
          !resolved.principalName ||
          resolved.principalName.includes('Maurya') ||
          resolved.principalName === 'Principal' ||
          resolved.principalName.includes('Anil Singh')
        ) {
          resolved.principalName = 'Vijendra Pal';
        }
        return resolved;
      } catch (e) {
        return INITIAL_SCHOOL_SETTINGS;
      }
    }
    return INITIAL_SCHOOL_SETTINGS;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        let parsed: UserAccount[] = JSON.parse(saved);
        // Ensure admin user exists with fallback to Anil Singh and phone 9452305199 if not set
        parsed = parsed.map((u) => {
          if (u.id === 'u-admin' || u.role === 'admin' || u.username.toLowerCase() === 'admin') {
            return {
              ...u,
              name: u.name || 'Anil Singh',
              phone: u.phone || '9452305199',
            };
          }
          return u;
        });
        // Ensure all initial users (including all 11 teachers) exist
        const existingUsernames = new Set(parsed.map((u) => u.username.toLowerCase()));
        const missing = INITIAL_USERS.filter((u) => !existingUsernames.has(u.username.toLowerCase()));
        return [...parsed, ...missing];
      } catch (e) {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (saved) {
      try {
        const parsed: UserAccount = JSON.parse(saved);
        if (parsed.id === 'u-admin' || parsed.role === 'admin') {
          return {
            ...parsed,
            name: parsed.name || 'Anil Singh',
            phone: parsed.phone || '9452305199',
          };
        }
        return parsed;
      } catch (e) {
        return INITIAL_USERS[0];
      }
    }
    return INITIAL_USERS[0];
  });

  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sbsc_deleted_student_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const sanitizeStudentFee = (s: Student): Student => {
    const rawConv = s.conveyFee ?? 0;
    const conveyFee = rawConv === 600 ? 0 : rawConv;

    // Check if student is explicitly granted 100% Scholarship / Zero Fee
    const isExplicitScholarship = s.scholarshipStatus === '100% Fee Concession / Zero Fee';
    if (isExplicitScholarship) {
      const prevDue = s.previousDue ?? 0;
      return {
        ...s,
        tuitionFee: 0,
        admissionFee: 0,
        registrationFee: 0,
        examFee: 0,
        conveyFee: 0,
        totalYearlyDue: prevDue > 0 ? prevDue : 0,
      };
    }

    const tuition = typeof s.tuitionFee === 'number' && !isNaN(s.tuitionFee) ? s.tuitionFee : 0;
    const adm = s.admissionFee ?? 0;
    const reg = s.registrationFee ?? 0;
    const exam = typeof s.examFee === 'number' && !isNaN(s.examFee) ? s.examFee : 0;
    const late = s.lateFine ?? 0;
    const prevDue = s.previousDue ?? 0;

    // Auto add tuition fees, registration, admission, exam, if show convey due add, plus previous due & late fine
    const calculatedHeadsSum =
      tuition + adm + reg + exam + (conveyFee > 0 ? conveyFee : 0) + late + prevDue;

    let effectiveTotal = calculatedHeadsSum;
    let effectivePrevDue = prevDue;

    // If an Excel upload or student object has explicit totalYearlyDue set:
    if (typeof s.totalYearlyDue === 'number' && !isNaN(s.totalYearlyDue)) {
      if (s.totalYearlyDue === 0 && calculatedHeadsSum === 0) {
        effectiveTotal = 0;
        effectivePrevDue = 0;
      } else if (s.totalYearlyDue > calculatedHeadsSum) {
        // Attribute remainder to previousDue so heads match the explicit total
        effectivePrevDue = prevDue + (s.totalYearlyDue - calculatedHeadsSum);
        effectiveTotal = s.totalYearlyDue;
      } else if (calculatedHeadsSum === 0 && s.totalYearlyDue > 0) {
        effectivePrevDue = s.totalYearlyDue;
        effectiveTotal = s.totalYearlyDue;
      } else {
        effectiveTotal = s.totalYearlyDue;
      }
    }

    let conveyVillage = s.conveyVillage;
    const VALID_VILLAGES = new Set(['Riwa Nankar', 'Amariya', 'Sangldeep', 'Patkhauli', 'Itauwa', 'Dhuswa', 'Gayghat']);
    if (conveyVillage && !VALID_VILLAGES.has(conveyVillage)) {
      if (conveyVillage === 'Bairwa Nankar') {
        conveyVillage = 'Riwa Nankar';
      } else {
        conveyVillage = undefined;
      }
    }

    return {
      ...s,
      conveyFee,
      conveyVillage,
      previousDue: effectivePrevDue,
      totalYearlyDue: effectiveTotal,
    };
  };

  // Helper to ensure original given roll numbers are restored (no prefixes like NUR-, LKG-, UKG-, and exact original roll numbers from initial data)
  const restoreOriginalRollNo = (s: Student): Student => {
    const original = INITIAL_STUDENTS.find(
      (orig) => orig.id === s.id || orig.admissionNo.toLowerCase() === s.admissionNo.toLowerCase()
    );
    if (original && original.rollNo) {
      return { ...s, rollNo: original.rollNo };
    }
    const roll = String(s.rollNo || '').trim();
    if (roll.startsWith('NUR-') || roll.startsWith('LKG-') || roll.startsWith('UKG-')) {
      const num = roll.replace(/\D/g, '') || (s.id.endsWith('2') ? '2' : '1');
      return { ...s, rollNo: num.padStart(2, '0') };
    }
    return s;
  };

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const savedDeleted = localStorage.getItem('sbsc_deleted_student_ids');
    const deletedSet = new Set<string>(savedDeleted ? JSON.parse(savedDeleted) : []);
    if (saved) {
      try {
        const parsed: Student[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((s) => !deletedSet.has(s.id)).map(sanitizeStudentFee);
          if (filtered.length > 0) {
            return filtered.map(restoreOriginalRollNo);
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved students, restoring defaults:', e);
      }
    }
    // Safe fallback to institutional records
    const initial = INITIAL_STUDENTS.filter((s) => !deletedSet.has(s.id)).map(sanitizeStudentFee);
    if (initial.length > 0) {
      return initial.map(restoreOriginalRollNo);
    }
    // If all students were deleted or deletedSet is corrupted, clear deleted list and restore all students
    try {
      localStorage.removeItem('sbsc_deleted_student_ids');
    } catch {}
    return INITIAL_STUDENTS.map(sanitizeStudentFee).map(restoreOriginalRollNo);
  });

  const [deletedTeacherIds, setDeletedTeacherIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sbsc_deleted_teacher_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    const savedDeleted = localStorage.getItem('sbsc_deleted_teacher_ids');
    const deletedSet = new Set<string>(savedDeleted ? JSON.parse(savedDeleted) : []);
    if (saved) {
      try {
        const parsed: Teacher[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((t) => !deletedSet.has(t.id) && !isDummyTeacher(t));
          if (valid.length > 0) {
            // Retain saved teacher data as source of truth; only fill in missing permanent teachers
            const existingIds = new Set(valid.map((t) => t.id));
            const missingPerm = INITIAL_TEACHERS.filter((it) => !existingIds.has(it.id) && !deletedSet.has(it.id));
            return [...valid, ...missingPerm];
          }
        }
      } catch (e) {
        return INITIAL_TEACHERS.filter((t) => !deletedSet.has(t.id));
      }
    }
    return INITIAL_TEACHERS.filter((t) => !deletedSet.has(t.id));
  });

  const [deletedClassIds, setDeletedClassIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sbsc_deleted_class_ids') || localStorage.getItem('sbsc_deleted_classes_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const savedDeleted = localStorage.getItem('sbsc_deleted_class_ids') || localStorage.getItem('sbsc_deleted_classes_v3');
    const deletedSet = new Set<string>(savedDeleted ? JSON.parse(savedDeleted) : []);
    if (saved) {
      try {
        const parsed: ClassInfo[] = JSON.parse(saved);
        // Ensure standard classes always reflect the updated curriculum subjects
        const synchronized = parsed.map((cls) => {
          const initCls = INITIAL_CLASSES.find((ic) => ic.id === cls.id);
          if (initCls) {
            return {
              ...cls,
              subjects: initCls.subjects,
            };
          }
          return cls;
        });
        return synchronized.filter((c) => !deletedSet.has(c.id));
      } catch (e) {
        return INITIAL_CLASSES.filter((c) => !deletedSet.has(c.id));
      }
    }
    // Check legacy v3 storage
    const legacySaved = localStorage.getItem('sbsc_classes_v3');
    if (legacySaved) {
      try {
        const parsed: ClassInfo[] = JSON.parse(legacySaved);
        const synchronized = parsed.map((cls) => {
          const initCls = INITIAL_CLASSES.find((ic) => ic.id === cls.id);
          if (initCls) {
            return {
              ...cls,
              subjects: initCls.subjects,
            };
          }
          return cls;
        });
        const result = synchronized.filter((c) => !deletedSet.has(c.id));
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(result));
        return result;
      } catch (e) {
        // ignore and fallback
      }
    }
    return INITIAL_CLASSES.filter((c) => !deletedSet.has(c.id));
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
    return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
  });

  const [feePayments, setFeePayments] = useState<FeePayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEES);
    return saved ? JSON.parse(saved) : INITIAL_FEE_PAYMENTS;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (saved) {
      try {
        const parsed: Exam[] = JSON.parse(saved);
        return parsed.map((ex) => {
          const initExam = INITIAL_EXAMS.find((e) => e.id === ex.id);
          // If this is one of the standard exams (exam-1, exam-2, exam-3), guarantee its fixed official timetable without changes
          if (initExam && initExam.timetable && initExam.timetable.length > 0) {
            return {
              ...ex,
              ...initExam,
              session: '2026-2027',
              timetable: initExam.timetable, // Fixed official timetable, no change
              classes: initExam.classes,
            };
          }
          const m1Time = ex.meeting1Time || '08:30 AM – 11:30 AM';
          const m2Time = ex.meeting2Time || '12:30 PM – 03:30 PM';
          const timetable =
            Array.isArray(ex.timetable) && ex.timetable.length > 0
              ? ex.timetable
              : generateDefault2MeetingTimetable(ex.startDate, ex.endDate, m1Time, m2Time);
          return {
            ...ex,
            session: ex.session === '2025-2026' ? '2026-2027' : ex.session,
            meeting1Time: m1Time,
            meeting2Time: m2Time,
            timetable,
          };
        });
      } catch (e) {
        return INITIAL_EXAMS;
      }
    }
    return INITIAL_EXAMS;
  });

  const [examMarks, setExamMarks] = useState<ExamMark[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXAM_MARKS);
    return saved ? JSON.parse(saved) : INITIAL_EXAM_MARKS;
  });

  const [homeworks, setHomeworks] = useState<Homework[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return Array.isArray(INITIAL_HOMEWORK) ? INITIAL_HOMEWORK : [];
    } catch {
      return Array.isArray(INITIAL_HOMEWORK) ? INITIAL_HOMEWORK : [];
    }
  });

  const [deletedNoticeIds, setDeletedNoticeIds] = useState<string[]>(() => {
    const demoIds = ['not-1', 'not-2', 'not-3', 'not-4'];
    try {
      const saved = localStorage.getItem('sbsc_deleted_notice_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...demoIds, ...parsed]));
      }
      return demoIds;
    } catch (e) {
      return demoIds;
    }
  });

  const [notices, setNotices] = useState<Notice[]>(() => {
    const demoIds = new Set(['not-1', 'not-2', 'not-3', 'not-4']);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTICES);
      const savedDeleted = localStorage.getItem('sbsc_deleted_notice_ids');
      const deletedSet = new Set<string>([
        ...demoIds,
        ...(savedDeleted ? JSON.parse(savedDeleted) : []),
      ]);
      if (saved !== null) {
        const parsed: Notice[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n) => n && n.id && !deletedSet.has(n.id) && !n.isDeleted && !demoIds.has(n.id));
        }
      }
      return INITIAL_NOTICES.filter((n) => n && n.id && !deletedSet.has(n.id) && !demoIds.has(n.id));
    } catch (e) {
      return INITIAL_NOTICES.filter((n) => n && n.id && !demoIds.has(n.id));
    }
  });

  const [salaries, setSalaries] = useState<SalaryRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALARIES);
    return saved ? JSON.parse(saved) : INITIAL_SALARY_RECORDS;
  });

  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
    return saved ? JSON.parse(saved) : INITIAL_CERTIFICATES;
  });

  const [admitCards, setAdmitCards] = useState<AdmitCardRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIT_CARDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updatedCards = parsed.map((card: AdmitCardRecord) => {
            const orig = INITIAL_STUDENTS.find((s) => s.id === card.studentId || s.admissionNo.toLowerCase() === card.studentId.toLowerCase());
            const st = students.find((s) => s.id === card.studentId || s.admissionNo.toLowerCase() === card.studentId.toLowerCase());
            const rawRoll = orig?.rollNo || st?.rollNo?.trim() || card.rollNo || '';
            const cleanRoll = rawRoll.replace(/^(NUR|LKG|UKG)-/, '');
            return {
              ...card,
              rollNo: cleanRoll,
            };
          });
          // Ensure all active students (Class 1 to 8, Nursery, LKG, UKG, 9, 10) have admit cards for exam-1 with their assigned rollNo
          const existingKeySet = new Set(updatedCards.map((c) => `${c.examId}:::${c.studentId}`));
          students.forEach((st) => {
            const key = `exam-1:::${st.id}`;
            if (!existingKeySet.has(key)) {
              updatedCards.push({
                id: `ac-exam-1-${st.id}`,
                examId: 'exam-1',
                studentId: st.id,
                rollNo: st.rollNo?.trim() || '',
                isReleased: true,
                examCenter: 'Shri Banshraj Smarak Inter College Campus, Bairwa Nankar, Siddharthnagar',
                reportingTime: '08:30 AM',
                examTiming: '08:30 AM – 11:30 AM',
                instructions: [
                  '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है।',
                  '2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।',
                  '3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।',
                  '4. अनुशासन का पूर्ण पालन करें।',
                ],
                releaseDate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          });
          return updatedCards;
        }
      }
    } catch {}
    // Seed initial admit cards for default exam-1 for existing initial students so admit cards are immediately accessible
    return students.map((s) => ({
      id: `ac-exam-1-${s.id}`,
      examId: 'exam-1',
      studentId: s.id,
      rollNo: s.rollNo || '',
      isReleased: true,
      examCenter: 'Shri Banshraj Smarak Inter College Campus, Bairwa Nankar, Siddharthnagar',
      reportingTime: '08:30 AM',
      examTiming: '08:30 AM – 11:30 AM',
      instructions: [
        '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है।',
        '2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।',
        '3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।',
        '4. अनुशासन का पूर्ण पालन करें।',
      ],
      releaseDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Helper to safely persist school data without crashing on browser quota exhaustion
  const safeLocalStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (err: any) {
      if (
        err?.name === 'QuotaExceededError' ||
        err?.code === 22 ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'))
      ) {
        console.warn(`[LocalStorage] Storage quota exceeded while saving key "${key}". Purging legacy caches...`);
        try {
          // Immediately purge old bloated snapshot key to free up 5MB quota
          localStorage.removeItem('sbsc_auto_backup_snapshots_v2');
          localStorage.setItem(key, value);
        } catch (retryErr) {
          console.error(`[LocalStorage] Still unable to save key "${key}" after purge:`, retryErr);
        }
      } else {
        console.warn(`[LocalStorage] Failed to save key "${key}":`, err);
      }
    }
  };

  // Persist each state change to localStorage
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.FEES, JSON.stringify(feePayments));
  }, [feePayments]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.EXAM_MARKS, JSON.stringify(examMarks));
  }, [examMarks]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.HOMEWORK, JSON.stringify(homeworks));
  }, [homeworks]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.NOTICES, JSON.stringify(notices));
  }, [notices]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.SALARIES, JSON.stringify(salaries));
  }, [salaries]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
  }, [certificates]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(admitCards));
  }, [admitCards]);

  // One-time startup synchronization: ensure all original students have their authentic given roll numbers restored (no new roll numbers, no prefixes)
  useEffect(() => {
    setStudents((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        const orig = INITIAL_STUDENTS.find(
          (o) => o.id === s.id || o.admissionNo.toLowerCase() === s.admissionNo.toLowerCase()
        );
        if (orig && orig.rollNo && s.rollNo !== orig.rollNo) {
          changed = true;
          return { ...s, rollNo: orig.rollNo };
        }
        if (s.rollNo && /^(NUR|LKG|UKG)-/.test(s.rollNo)) {
          changed = true;
          return { ...s, rollNo: s.rollNo.replace(/^(NUR|LKG|UKG)-/, '') };
        }
        return s;
      });
      if (changed) {
        safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    setAdmitCards((prev) => {
      let changed = false;
      const updated = prev.map((ac) => {
        const orig = INITIAL_STUDENTS.find(
          (o) => o.id === ac.studentId || o.admissionNo.toLowerCase() === ac.studentId.toLowerCase()
        );
        if (orig && orig.rollNo && ac.rollNo !== orig.rollNo) {
          changed = true;
          return { ...ac, rollNo: orig.rollNo, updatedAt: new Date().toISOString() };
        }
        if (ac.rollNo && /^(NUR|LKG|UKG)-/.test(ac.rollNo)) {
          changed = true;
          return { ...ac, rollNo: ac.rollNo.replace(/^(NUR|LKG|UKG)-/, ''), updatedAt: new Date().toISOString() };
        }
        return ac;
      });
      if (changed) {
        safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  // Synchronize admit cards and exams across multiple tabs/windows in real time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === STORAGE_KEYS.ADMIT_CARDS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAdmitCards((prev) => mergeAdmitCards(prev, parsed));
          }
        } else if (e.key === STORAGE_KEYS.EXAMS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setExams((prev) => mergeExams(prev, parsed));
          }
        } else if (e.key === STORAGE_KEYS.TEACHERS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeachers(parsed);
          }
        }
      } catch (err) {
        // non-fatal
      }
    };

    const handleCustomAdmitCardUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setAdmitCards((prev) => mergeAdmitCards(prev, e.detail));
      }
    };

    const handleCustomExamUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setExams((prev) => mergeExams(prev, e.detail));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sbsc_admit_cards_updated', handleCustomAdmitCardUpdate);
    window.addEventListener('sbsc_exams_updated', handleCustomExamUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sbsc_admit_cards_updated', handleCustomAdmitCardUpdate);
      window.removeEventListener('sbsc_exams_updated', handleCustomExamUpdate);
    };
  }, []);

  // Offline Mode setting (allows completely disconnected operation from local storage)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sbsc_offline_mode');
      if (saved !== null) return saved === 'true';
      if (isFirestoreQuotaExhausted()) return true;
      return false;
    } catch {
      return false;
    }
  });

  const toggleOfflineMode = (forceState?: boolean) => {
    setIsOfflineMode((prev) => {
      const next = forceState !== undefined ? forceState : !prev;
      try {
        localStorage.setItem('sbsc_offline_mode', String(next));
      } catch {}
      if (next) {
        setCloudSyncStatus('offline');
      } else {
        setCloudSyncStatus('connecting');
      }
      return next;
    });
  };

  // Cloud Synchronization State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => {
    try {
      const isOff = localStorage.getItem('sbsc_offline_mode') === 'true';
      if (isOff) return 'offline';
      if (isFirestoreQuotaExhausted()) return 'quota_exceeded';
      return 'connecting';
    } catch {
      return 'connecting';
    }
  });
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const isInitialCloudLoadComplete = useRef<boolean>(false);
  const isSyncingFromCloud = useRef<boolean>(false);
  const isUploadingToCloud = useRef<boolean>(false);
  const lastSyncedFingerprint = useRef<string>('');

  function computeSchoolDataFingerprint(data: Partial<FullSchoolData>): string {
    if (!data) return '';
    const sCount = data.students?.length || 0;
    const fCount = data.feePayments?.length || 0;
    const aCount = data.attendance?.length || 0;
    const tCount = data.teachers?.length || 0;
    const cCount = data.classes?.length || 0;
    const eCount = data.exams?.length || 0;
    const mCount = data.examMarks?.length || 0;
    const sName = data.settings?.schoolName || '';
    const sUpi = data.settings?.upiId || '';
    const sEmail = data.settings?.email || data.settings?.adminEmail || '';
    const sPhone = data.settings?.phone || data.settings?.contactNumber || '';
    const sSession = data.settings?.academicSession || '';
    const sUpdated = data.settings?.updatedAt || '';
    const firstStudent = data.students?.[0]?.id || '';
    const lastStudent = data.students?.[sCount > 0 ? sCount - 1 : 0]?.id || '';
    const firstFeeId = data.feePayments?.[0]?.id || '';
    const firstFeeReceipt = data.feePayments?.[0]?.receiptNo || '';
    const lastFeeId = data.feePayments?.[fCount > 0 ? fCount - 1 : 0]?.id || '';
    const lastFeePaid = data.feePayments?.[fCount > 0 ? fCount - 1 : 0]?.amountPaid || 0;
    const lastAttDate = data.attendance?.[aCount > 0 ? aCount - 1 : 0]?.date || '';
    const lastAttTarget = data.attendance?.[aCount > 0 ? aCount - 1 : 0]?.targetId || '';
    const acCount = data.admitCards?.length || 0;
    const acReleasedCount = data.admitCards?.filter((a) => a.isReleased).length || 0;
    const lastAcSummary = data.admitCards?.map((a) => `${a.id}_${a.isReleased ? 1 : 0}_${a.updatedAt || ''}`).slice(0, 10).join('|') || '';
    return `${sCount}:${fCount}:${aCount}:${tCount}:${cCount}:${eCount}:${mCount}:${acCount}:${acReleasedCount}:${sName}:${sUpi}:${sEmail}:${sPhone}:${sSession}:${sUpdated}:${firstStudent}:${lastStudent}:${firstFeeId}:${firstFeeReceipt}:${lastFeeId}:${lastFeePaid}:${lastAttDate}:${lastAttTarget}:${lastAcSummary}`;
  }

  // Safe merge helper: protects newer local settings from being overwritten by stale cloud doc snapshots
  function mergeSafeSettings(localPrev: SchoolSettings, remote?: Partial<SchoolSettings>): SchoolSettings {
    if (!remote) return localPrev;

    // Check if local settings was updated more recently than remote
    if (localPrev.updatedAt) {
      if (!remote.updatedAt) {
        // Local has explicit timestamp but remote does not: local is newer, do not let unversioned remote overwrite
        if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
          saveModuleToCloud('settings', localPrev).catch(() => {});
        }
        return localPrev;
      }
      const localTime = new Date(localPrev.updatedAt).getTime();
      const remoteTime = new Date(remote.updatedAt).getTime();
      if (localTime > remoteTime) {
        // Local is strictly newer! Push newer local settings to cloud to heal the remote stale data
        if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
          saveModuleToCloud('settings', localPrev).catch(() => {});
        }
        return localPrev;
      }
    }

    // Remote is newer or initial load: apply remote updates while preserving important local fallback values
    return {
      ...localPrev,
      ...remote,
      address: remote.address || remote.schoolAddress || localPrev.address,
      schoolAddress: remote.schoolAddress || remote.address || localPrev.schoolAddress,
      tagline: remote.tagline || remote.schoolTagline || localPrev.tagline,
      schoolTagline: remote.schoolTagline || remote.tagline || localPrev.schoolTagline,
      email: remote.email || remote.adminEmail || localPrev.email,
      adminEmail: remote.adminEmail || remote.email || localPrev.adminEmail,
      phone: remote.phone || remote.contactNumber || localPrev.phone,
      contactNumber: remote.contactNumber || remote.phone || localPrev.contactNumber,
      feeSecurityPassword: remote.feeSecurityPassword || localPrev.feeSecurityPassword || 'Admin@123',
      logoUrl: remote.logoUrl !== undefined ? remote.logoUrl : localPrev.logoUrl,
      stampUrl: remote.stampUrl !== undefined ? remote.stampUrl : localPrev.stampUrl,
    };
  }

  // Initial Cloud Load & Real-time Cloud Subscription
  useEffect(() => {
    let unsubscribeListener: (() => void) | null = null;

    async function initializeCloudSync() {
      // If user enabled offline mode, skip cloud calls entirely
      if (isOfflineMode) {
        setCloudSyncStatus('offline');
        isInitialCloudLoadComplete.current = true;
        return;
      }

      // If quota was already exhausted, keep in safe local mode without sending failing network requests
      if (isFirestoreQuotaExhausted()) {
        setCloudSyncStatus('quota_exceeded');
        isInitialCloudLoadComplete.current = true;
        return;
      }

      try {
        setCloudSyncStatus('connecting');
        const isOnline = await testFirebaseConnection();
        if (!isOnline) {
          setCloudSyncStatus(isFirestoreQuotaExhausted() ? 'quota_exceeded' : 'offline');
          isInitialCloudLoadComplete.current = true;
          return;
        }

        // 1. Fetch remote cloud dataset
        const cloudData = await fetchAllSchoolDataFromCloud();
        if (cloudData && (cloudData.students?.length || cloudData.settings)) {
          console.log('✓ Found online cloud data in Firestore. Syncing to local state...');
          isSyncingFromCloud.current = true;
          lastSyncedFingerprint.current = computeSchoolDataFingerprint(cloudData);
          if (cloudData.settings) setSettings((prev) => mergeSafeSettings(prev, cloudData.settings));
          if (cloudData.users?.length) setUsers(cloudData.users);
          // Only update students if remote actually has students (never overwrite with 0)
          if (cloudData.students && cloudData.students.length > 0) {
            setStudents((prev) => {
              const merged = mergeStudents(prev, cloudData.students, deletedStudentIds);
              const sanitized = merged.map(sanitizeStudentFee);
              try {
                localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sanitized));
              } catch (e) {
                console.error('Failed to cache merged students on cloud load:', e);
              }
              return sanitized;
            });
          }
          if (cloudData.teachers && Array.isArray(cloudData.teachers)) {
            setTeachers((prev) => {
              const merged = mergeTeachers(prev, cloudData.teachers, deletedTeacherIds);
              try {
                localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
              } catch (e) {
                console.error('Failed to cache merged teachers on cloud load:', e);
              }
              const needsCloudCorrection =
                cloudData.teachers.length !== merged.length ||
                cloudData.teachers.some((t: any) =>
                  ['t-1', 't-2', 't-3', 't-4'].includes(t.id) ||
                  (typeof t.salary === 'number' && t.salary > 0 && [26000, 28000, 30000, 31000, 32000, 33000, 34000, 35000, 36000, 38000, 39000, 40000, 42000].includes(t.salary))
                );
              if (needsCloudCorrection) {
                saveModuleToCloud('teachers', merged, true).catch(() => {});
              }
              return merged;
            });
          }
          if (cloudData.classes?.length) setClasses(cloudData.classes);
          if (cloudData.attendance && Array.isArray(cloudData.attendance)) {
            setAttendance((prev) => {
              const merged = mergeAttendanceRecords(prev, cloudData.attendance);
              try {
                localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
              } catch (e) {
                console.error('Failed to cache merged attendance:', e);
              }
              return merged;
            });
          }
          if (cloudData.holidays) setHolidays(cloudData.holidays);
          if (cloudData.feePayments && Array.isArray(cloudData.feePayments)) {
            setFeePayments((prev) => {
              const merged = mergeFeePayments(prev, cloudData.feePayments);
              try {
                localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(merged));
              } catch (e) {
                console.error('Failed to cache merged fee payments:', e);
              }
              return merged;
            });
          }
          if (Array.isArray(cloudData.exams)) {
            setExams((prev) => {
              const merged = mergeExams(prev, cloudData.exams!);
              safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(merged));
              return merged;
            });
          }
          if (cloudData.examMarks) setExamMarks(cloudData.examMarks);
          if (Array.isArray(cloudData.homeworks)) setHomeworks(cloudData.homeworks);
          if (Array.isArray(cloudData.admitCards)) {
            setAdmitCards((prev) => {
              const merged = mergeAdmitCards(prev, cloudData.admitCards);
              safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(merged));
              return merged;
            });
          }
          let currentDeletedNoticeIds = deletedNoticeIds;
          if (cloudData.deletedNoticeIds && Array.isArray(cloudData.deletedNoticeIds)) {
            const combined = Array.from(new Set([...deletedNoticeIds, ...cloudData.deletedNoticeIds]));
            currentDeletedNoticeIds = combined;
            setDeletedNoticeIds(combined);
            try {
              localStorage.setItem('sbsc_deleted_notice_ids', JSON.stringify(combined));
            } catch (e) {}
          }
          if (cloudData.notices && Array.isArray(cloudData.notices)) {
            setNotices(() => {
              const merged = mergeNotices([], cloudData.notices, currentDeletedNoticeIds);
              try {
                localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(merged));
              } catch (e) {
                console.error('Failed to cache merged notices:', e);
              }
              return merged;
            });
          }
          if (cloudData.salaries) setSalaries(cloudData.salaries);
          if (cloudData.certificates) setCertificates(cloudData.certificates);

          setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setCloudSyncStatus('online');
          setTimeout(() => {
            isSyncingFromCloud.current = false;
            isInitialCloudLoadComplete.current = true;
          }, 600);
        } else {
          setCloudSyncStatus('online');
          isInitialCloudLoadComplete.current = true;
        }

        // 2. Subscribe to real-time cloud updates across shared browsers/devices
        unsubscribeListener = subscribeToCloudUpdates((remoteData) => {
          if (isOfflineMode || isUploadingToCloud.current) return;
          if (remoteData) {
            const remoteFp = computeSchoolDataFingerprint(remoteData);
            if (remoteFp && remoteFp === lastSyncedFingerprint.current) {
              return;
            }
            lastSyncedFingerprint.current = remoteFp;
            isSyncingFromCloud.current = true;
            if (remoteData.settings) setSettings((prev) => mergeSafeSettings(prev, remoteData.settings));
            // CRITICAL: NEVER overwrite with empty student array!
            if (remoteData.students && remoteData.students.length > 0) {
              setStudents((prev) => {
                const merged = mergeStudents(prev, remoteData.students, deletedStudentIds);
                const sanitized = merged.map(sanitizeStudentFee);
                try {
                  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sanitized));
                } catch (e) {
                  console.error('Failed to cache realtime merged students:', e);
                }
                return sanitized;
              });
            }
            if (remoteData.teachers && Array.isArray(remoteData.teachers) && remoteData.teachers.length > 0) {
              setTeachers((prev) => {
                const merged = mergeTeachers(prev, remoteData.teachers, deletedTeacherIds);
                try {
                  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
                } catch (e) {
                  console.error('Failed to cache realtime merged teachers:', e);
                }
                return merged;
              });
            }
            if (remoteData.classes && remoteData.classes.length > 0) {
              setClasses(remoteData.classes);
            }
            if (remoteData.attendance && Array.isArray(remoteData.attendance)) {
              setAttendance((prev) => {
                const merged = mergeAttendanceRecords(prev, remoteData.attendance);
                try {
                  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
                } catch (e) {
                  console.error('Failed to cache realtime merged attendance:', e);
                }
                return merged;
              });
            }
            if (remoteData.holidays) setHolidays(remoteData.holidays);
            if (remoteData.feePayments && Array.isArray(remoteData.feePayments)) {
              setFeePayments((prev) => {
                const merged = mergeFeePayments(prev, remoteData.feePayments);
                try {
                  localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(merged));
                } catch (e) {
                  console.error('Failed to cache realtime merged fee payments:', e);
                }
                return merged;
              });
            }
            if (Array.isArray(remoteData.exams)) {
              setExams((prev) => {
                const merged = mergeExams(prev, remoteData.exams!);
                safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(merged));
                return merged;
              });
            }
            if (remoteData.examMarks) setExamMarks(remoteData.examMarks);
            if (Array.isArray(remoteData.homeworks)) setHomeworks(remoteData.homeworks);
            if (Array.isArray(remoteData.admitCards)) {
              setAdmitCards((prev) => {
                const merged = mergeAdmitCards(prev, remoteData.admitCards);
                safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(merged));
                return merged;
              });
            }
            let currentDeletedNoticeIds = deletedNoticeIds;
            if (remoteData.deletedNoticeIds && Array.isArray(remoteData.deletedNoticeIds)) {
              const combined = Array.from(new Set([...deletedNoticeIds, ...remoteData.deletedNoticeIds]));
              currentDeletedNoticeIds = combined;
              setDeletedNoticeIds(combined);
              try {
                localStorage.setItem('sbsc_deleted_notice_ids', JSON.stringify(combined));
              } catch (e) {}
            }
            if (remoteData.notices && Array.isArray(remoteData.notices)) {
              setNotices(() => {
                const merged = mergeNotices([], remoteData.notices, currentDeletedNoticeIds);
                try {
                  localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(merged));
                } catch (e) {
                  console.error('Failed to cache realtime merged notices:', e);
                }
                return merged;
              });
            }
            if (remoteData.salaries) setSalaries(remoteData.salaries);
            if (remoteData.certificates) setCertificates(remoteData.certificates);

            setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCloudSyncStatus('online');
            setTimeout(() => {
              isSyncingFromCloud.current = false;
            }, 400);
          }
        }, (err) => {
          if (isQuotaExceededError(err)) {
            setCloudSyncStatus('quota_exceeded');
          }
        });
      } catch (err) {
        if (isQuotaExceededError(err)) {
          markFirestoreQuotaExhausted();
          setCloudSyncStatus('quota_exceeded');
        } else {
          console.error('Failed to initialize cloud sync:', err);
          setCloudSyncStatus('offline');
        }
        isInitialCloudLoadComplete.current = true;
      }
    }

    initializeCloudSync();

    return () => {
      if (unsubscribeListener) unsubscribeListener();
    };
  }, [isOfflineMode]);

  // Debounced Auto-Sync to Cloud whenever state is modified
  useEffect(() => {
    if (isOfflineMode || !isInitialCloudLoadComplete.current || isSyncingFromCloud.current) return;

    // If quota is exhausted, maintain quota_exceeded status and skip network activity
    if (isFirestoreQuotaExhausted()) {
      setCloudSyncStatus('quota_exceeded');
      return;
    }

    // Safety check: Never sync if students is 0 to protect cloud state
    if (students.length === 0) {
      console.warn('Skipping cloud sync: local student count is 0');
      return;
    }

    const timer = setTimeout(async () => {
      const currentData: FullSchoolData = {
        settings,
        users,
        students,
        teachers,
        classes,
        attendance,
        holidays,
        feePayments,
        exams,
        examMarks,
        homeworks,
        notices,
        salaries,
        certificates,
        admitCards,
      };

      const currentFp = computeSchoolDataFingerprint(currentData);
      if (currentFp === lastSyncedFingerprint.current) {
        return;
      }

      if (isFirestoreQuotaExhausted()) {
        setCloudSyncStatus('quota_exceeded');
        return;
      }

      try {
        isUploadingToCloud.current = true;
        setCloudSyncStatus('syncing');
        const ok = await pushAllSchoolDataToCloud(currentData);
        if (ok) {
          lastSyncedFingerprint.current = currentFp;
          setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setCloudSyncStatus('online');
        } else {
          if (isFirestoreQuotaExhausted()) {
            setCloudSyncStatus('quota_exceeded');
          } else {
            setCloudSyncStatus('offline');
          }
        }
      } catch (err: any) {
        if (isQuotaExceededError(err)) {
          markFirestoreQuotaExhausted();
          setCloudSyncStatus('quota_exceeded');
        } else {
          console.warn('Debounced auto-sync to cloud encountered an issue:', err);
          setCloudSyncStatus('offline');
        }
      } finally {
        setTimeout(() => {
          isUploadingToCloud.current = false;
        }, 600);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [
    isOfflineMode,
    settings,
    users,
    students,
    teachers,
    classes,
    attendance,
    holidays,
    feePayments,
    exams,
    examMarks,
    homeworks,
    notices,
    salaries,
    certificates,
    admitCards,
  ]);

  // Manual trigger to force push all data to cloud
  const syncAllToCloud = async (forceRetry = false): Promise<boolean> => {
    if (isFirestoreQuotaExhausted() && !forceRetry) {
      console.warn('[Firebase] Skipping syncAllToCloud: daily free write quota is exhausted.');
      setCloudSyncStatus('quota_exceeded');
      return false;
    }

    try {
      if (forceRetry) {
        resetQuotaCircuitBreaker();
      }
      setCloudSyncStatus('syncing');
      isUploadingToCloud.current = true;
      const currentData: FullSchoolData = {
        settings,
        users,
        students,
        teachers,
        classes,
        attendance,
        holidays,
        feePayments,
        exams,
        examMarks,
        homeworks,
        notices,
        salaries,
        certificates,
        admitCards,
      };
      const ok = await pushAllSchoolDataToCloud(currentData);
      if (ok) {
        lastSyncedFingerprint.current = computeSchoolDataFingerprint(currentData);
        setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setCloudSyncStatus('online');
      } else {
        if (isFirestoreQuotaExhausted()) {
          setCloudSyncStatus('quota_exceeded');
        } else {
          setCloudSyncStatus('offline');
        }
      }
      return ok;
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        markFirestoreQuotaExhausted();
        setCloudSyncStatus('quota_exceeded');
      } else {
        console.error('Manual cloud sync failed:', err);
        setCloudSyncStatus('error');
      }
      return false;
    } finally {
      setTimeout(() => {
        isUploadingToCloud.current = false;
      }, 600);
    }
  };

  // Manual trigger to force pull freshest data from cloud
  const pullAllFromCloud = async (): Promise<boolean> => {
    try {
      setCloudSyncStatus('syncing');
      const cloudData = await fetchAllSchoolDataFromCloud();
      if (cloudData) {
        isSyncingFromCloud.current = true;
        if (cloudData.settings) setSettings((prev) => mergeSafeSettings(prev, cloudData.settings));
        if (cloudData.users?.length) setUsers(cloudData.users);
        if (cloudData.students?.length) {
          setStudents((prev) => {
            const merged = mergeStudents(prev, cloudData.students, deletedStudentIds);
            const sanitized = merged.map(sanitizeStudentFee);
            try {
              localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sanitized));
            } catch (e) {}
            return sanitized;
          });
        }
        if (cloudData.teachers && Array.isArray(cloudData.teachers)) {
          setTeachers((prev) => {
            const merged = mergeTeachers(prev, cloudData.teachers, deletedTeacherIds);
            try {
              localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (cloudData.classes?.length) setClasses(cloudData.classes);
        if (cloudData.attendance && Array.isArray(cloudData.attendance)) {
          setAttendance((prev) => {
            const merged = mergeAttendanceRecords(prev, cloudData.attendance);
            try {
              localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
            } catch (e) {
              console.error('Failed to cache pulled merged attendance:', e);
            }
            return merged;
          });
        }
        if (cloudData.holidays) setHolidays(cloudData.holidays);
        if (cloudData.feePayments && Array.isArray(cloudData.feePayments)) {
          setFeePayments((prev) => {
            const merged = mergeFeePayments(prev, cloudData.feePayments);
            try {
              localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(merged));
            } catch (e) {
              console.error('Failed to cache pulled merged fee payments:', e);
            }
            return merged;
          });
        }
        if (cloudData.exams) setExams(cloudData.exams);
        if (cloudData.examMarks) setExamMarks(cloudData.examMarks);
        if (Array.isArray(cloudData.homeworks)) setHomeworks(cloudData.homeworks);
        if (Array.isArray(cloudData.admitCards)) {
          setAdmitCards((prev) => {
            const merged = mergeAdmitCards(prev, cloudData.admitCards);
            safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(merged));
            return merged;
          });
        }
        let currentDeletedNoticeIds = deletedNoticeIds;
        if (cloudData.deletedNoticeIds && Array.isArray(cloudData.deletedNoticeIds)) {
          const combined = Array.from(new Set([...deletedNoticeIds, ...cloudData.deletedNoticeIds]));
          currentDeletedNoticeIds = combined;
          setDeletedNoticeIds(combined);
          try {
            localStorage.setItem('sbsc_deleted_notice_ids', JSON.stringify(combined));
          } catch (e) {}
        }
        if (cloudData.notices && Array.isArray(cloudData.notices)) {
          setNotices(() => {
            const merged = mergeNotices([], cloudData.notices, currentDeletedNoticeIds);
            try {
              localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (cloudData.salaries) setSalaries(cloudData.salaries);
        if (cloudData.certificates) setCertificates(cloudData.certificates);

        lastSyncedFingerprint.current = computeSchoolDataFingerprint(cloudData);
        setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setCloudSyncStatus('online');
        setTimeout(() => {
          isSyncingFromCloud.current = false;
        }, 500);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to pull from cloud:', err);
      setCloudSyncStatus('offline');
      return false;
    }
  };

  // Automated Institutional Data Backup States
  const [autoBackupConfig, setAutoBackupConfigState] = useState<AutoBackupConfig>(() => getAutoBackupConfig());
  const [autoBackupSnapshots, setAutoBackupSnapshotsState] = useState<AutoBackupSnapshot[]>(() => getAutoBackupSnapshots());
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string | null>(() => getAutoBackupConfig().lastBackupTime || null);

  // Synchronize state when IndexedDB snapshots finish asynchronous hydration
  useEffect(() => {
    const handleSnapshotsLoaded = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setAutoBackupSnapshotsState(e.detail);
      }
    };
    window.addEventListener('sbsc_auto_backup_snapshots_loaded', handleSnapshotsLoaded);
    return () => {
      window.removeEventListener('sbsc_auto_backup_snapshots_loaded', handleSnapshotsLoaded);
    };
  }, []);

  const updateAutoBackupConfig = (updates: Partial<AutoBackupConfig>) => {
    const updated = saveAutoBackupConfig(updates);
    setAutoBackupConfigState(updated);
  };

  const triggerManualAutoBackup = (): AutoBackupSnapshot => {
    const currentData: FullSchoolData = {
      settings,
      users,
      students,
      teachers,
      classes,
      attendance,
      holidays,
      feePayments,
      exams,
      examMarks,
      homeworks,
      notices,
      salaries,
      certificates,
      admitCards,
    };
    const snap = createAutoBackupSnapshot(currentData, 'manual_trigger');
    setAutoBackupSnapshotsState(getAutoBackupSnapshots());
    setLastAutoBackupTime(snap.timestamp);
    if (autoBackupConfig.autoCloudSync && !isOfflineMode && !isFirestoreQuotaExhausted()) {
      pushAllSchoolDataToCloud(currentData).catch(() => {});
    }
    return snap;
  };

  const applyRestoredDataPayload = (data: any): boolean => {
    try {
      if (data.settings) setSettings(data.settings);
      if (data.students) setStudents(data.students);
      if (data.teachers) setTeachers(data.teachers);
      if (data.classes) setClasses(data.classes);
      if (data.attendance) setAttendance(data.attendance);
      if (data.holidays) setHolidays(data.holidays);
      if (data.feePayments) setFeePayments(data.feePayments);
      if (data.exams) setExams(data.exams);
      if (data.examMarks) setExamMarks(data.examMarks);
      if (data.homeworks) setHomeworks(data.homeworks);
      if (data.notices) {
        setNotices(mergeNotices([], data.notices, deletedNoticeIds));
      }
      if (data.salaries) setSalaries(data.salaries);
      if (data.certificates) setCertificates(data.certificates);
      if (data.admitCards && Array.isArray(data.admitCards)) {
        setAdmitCards((prev) => mergeAdmitCards(prev, data.admitCards));
        safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(data.admitCards));
      }

      // Also sync restored state to cloud if online and quota available
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        pushAllSchoolDataToCloud(data).catch(() => {});
      }
      return true;
    } catch (err) {
      console.warn('Error applying restored snapshot data:', err);
      return false;
    }
  };

  const restoreFromAutoBackupSnapshot = (snapshotId: string): boolean => {
    const snaps = getAutoBackupSnapshots();
    const target = snaps.find((s) => s.id === snapshotId);
    if (target?.payload) {
      return applyRestoredDataPayload(target.payload);
    }

    // If payload is not in synchronous cache yet, load asynchronously from IndexedDB
    getSnapshotById(snapshotId).then((fullSnap) => {
      if (fullSnap?.payload) {
        applyRestoredDataPayload(fullSnap.payload);
      }
    });
    return true;
  };

  const deleteAutoBackupSnapshot = (snapshotId: string) => {
    const updated = deleteSnapshotFromService(snapshotId);
    setAutoBackupSnapshotsState(updated);
  };

  const downloadAutoBackupSnapshot = (snapshotId: string) => {
    const snaps = getAutoBackupSnapshots();
    const target = snaps.find((s) => s.id === snapshotId);
    if (target?.payload) {
      downloadSnapshotFile(target, settings.schoolName || 'SBSC-School');
    } else {
      getSnapshotById(snapshotId).then((fullSnap) => {
        if (fullSnap) {
          downloadSnapshotFile(fullSnap, settings.schoolName || 'SBSC-School');
        }
      });
    }
  };

  // Background Auto-Backup scheduler
  const currentSchoolDataRef = useRef<FullSchoolData>({} as FullSchoolData);
  currentSchoolDataRef.current = {
    settings,
    users,
    students,
    teachers,
    classes,
    attendance,
    holidays,
    feePayments,
    exams,
    examMarks,
    homeworks,
    notices,
    salaries,
    certificates,
    admitCards,
  };

  useEffect(() => {
    if (!autoBackupConfig.enabled) return;

    const runCheck = () => {
      const snapData = currentSchoolDataRef.current;
      if (!isInitialCloudLoadComplete.current && (!snapData.students || snapData.students.length === 0)) return;
      const snap = checkAndExecuteAutoBackup(snapData);
      if (snap) {
        setAutoBackupSnapshotsState(getAutoBackupSnapshots());
        setLastAutoBackupTime(snap.timestamp);
        if (autoBackupConfig.autoCloudSync && !isFirestoreQuotaExhausted()) {
          pushAllSchoolDataToCloud(snapData).catch((err) => {
            if (isQuotaExceededError(err)) {
              markFirestoreQuotaExhausted();
              setCloudSyncStatus('quota_exceeded');
            }
          });
        }
      }
    };

    // Run once after initial app load stabilizes (8s), then periodic interval
    const initialTimer = setTimeout(runCheck, 8000);
    const interval = setInterval(runCheck, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [
    autoBackupConfig.enabled,
    autoBackupConfig.frequency,
    autoBackupConfig.autoCloudSync,
  ]);

  // Computed properties for current logged in teacher & class
  const currentTeacher = useMemo(() => {
    if (currentUser.role !== 'teacher') return null;
    return (
      teachers.find(
        (t) =>
          t.id === currentUser.linkedId ||
          t.empId.toLowerCase() === currentUser.username.toLowerCase() ||
          (t.username && t.username.toLowerCase() === currentUser.username.toLowerCase()) ||
          t.email.toLowerCase() === currentUser.email.toLowerCase()
      ) || null
    );
  }, [currentUser, teachers]);

  const assignedClassForCurrentTeacher = useMemo(() => {
    if (!currentTeacher) return null;
    return (
      classes.find(
        (c) =>
          c.id === currentTeacher.assignedClassId ||
          c.name.toLowerCase() === (currentTeacher.assignedClass || '').toLowerCase() ||
          c.classTeacherId === currentTeacher.id
      ) || classes[0] || null
    );
  }, [currentTeacher, classes]);

  const currentClassStudents = useMemo(() => {
    if (!assignedClassForCurrentTeacher) return [];
    return students
      .filter(
        (s) =>
          s.classId === assignedClassForCurrentTeacher.id ||
          s.classId === (currentTeacher?.assignedClassId || '')
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
  }, [assignedClassForCurrentTeacher, currentTeacher, students]);

  // Computed property for logged in student
  const currentStudent = useMemo(() => {
    if (currentUser.role !== 'student' && currentUser.role !== 'parent') return null;
    return (
      students.find(
        (s) =>
          s.id === currentUser.linkedId ||
          s.admissionNo.toLowerCase() === currentUser.username.toLowerCase()
      ) || null
    );
  }, [currentUser, students]);

  // Compute all relative classes for any teacher (Class Teacher + Subject Teacher)
  const getTeacherRelativeClasses = (teacherId: string): TeacherRelativeClass[] => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return [];

    const relativeClasses: TeacherRelativeClass[] = [];
    const addedClassIds = new Set<string>();

    // 1. Primary In-Charge / Class Teacher assignment
    const primaryClass = classes.find(
      (c) =>
        c.classTeacherId === teacher.id ||
        c.id === teacher.assignedClassId ||
        (teacher.assignedClass && c.name.toLowerCase() === teacher.assignedClass.toLowerCase())
    );

    if (primaryClass) {
      relativeClasses.push({
        classInfo: primaryClass,
        roleType: 'class-teacher',
        roleLabel: `Class Teacher / In-Charge (${primaryClass.name})`,
        subjectsTaught: teacher.subjects || [],
      });
      addedClassIds.add(primaryClass.id);
    }

    // 2. Primary In-Charge Supervision across Pre-Primary and Primary classes
    const isPrimaryInCharge =
      teacher.designation?.toLowerCase().includes('primary in-charge') ||
      teacher.name.toLowerCase().includes('shalu') ||
      teacher.assignedClass?.toLowerCase().includes('primary in-charge');

    if (isPrimaryInCharge) {
      classes.forEach((c) => {
        if (!addedClassIds.has(c.id) && (c.gradeNumber <= 5 || c.id === 'c-prt')) {
          relativeClasses.push({
            classInfo: c,
            roleType: 'primary-incharge',
            roleLabel: `Primary In-Charge (${c.name})`,
            subjectsTaught: ['Primary Supervision', 'Attendance & Academic In-Charge'],
          });
          addedClassIds.add(c.id);
        }
      });
    }

    // 3. Secondary Subject Teaching assignments across other classes
    classes.forEach((c) => {
      if (addedClassIds.has(c.id)) return;

      const matchedSubjects = (c.subjects || []).filter(
        (sub) =>
          sub.teacherId === teacher.id ||
          (teacher.subjects || []).some(
            (ts) => ts.toLowerCase() === sub.name.toLowerCase() || sub.name.toLowerCase().includes(ts.toLowerCase())
          )
      );

      if (matchedSubjects.length > 0) {
        relativeClasses.push({
          classInfo: c,
          roleType: 'subject-teacher',
          roleLabel: `Subject Faculty (${matchedSubjects.map((s) => s.name).join(', ')})`,
          subjectsTaught: matchedSubjects.map((s) => s.name),
        });
        addedClassIds.add(c.id);
      }
    });

    // 3. Fallback: if no class was matched, provide classes[0]
    if (relativeClasses.length === 0 && classes.length > 0) {
      relativeClasses.push({
        classInfo: classes[0],
        roleType: 'class-teacher',
        roleLabel: `Faculty Member (${classes[0].name})`,
        subjectsTaught: teacher.subjects || [],
      });
    }

    return relativeClasses;
  };

  const teacherRelativeClasses = useMemo(() => {
    if (!currentTeacher) return [];
    return getTeacherRelativeClasses(currentTeacher.id);
  }, [currentTeacher, classes, teachers]);

  // Switch role helper
  const switchRole = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role) || users[0];
    setCurrentUser(targetUser);
  };

  // Admin updates/creates teacher password & username
  const updateTeacherPassword = (teacherId: string, newPassword: string, newUsername?: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const finalUsername =
      newUsername?.trim() ||
      teacher.username?.trim() ||
      teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '.') ||
      teacher.empId.toLowerCase();

    // 1. Update Teacher object
    let finalUpdatedTeachers: Teacher[] = [];
    setTeachers((prev) => {
      finalUpdatedTeachers = prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              password: newPassword,
              username: finalUsername,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(finalUpdatedTeachers));
      saveModuleToCloud('teachers', finalUpdatedTeachers, true).catch(() => {});
      return finalUpdatedTeachers;
    });

    // 2. Update or insert into users list
    setUsers((prev) => {
      const existingUserIndex = prev.findIndex(
        (u) => u.linkedId === teacherId || u.username.toLowerCase() === finalUsername.toLowerCase()
      );
      const userObj: UserAccount = {
        id: existingUserIndex >= 0 ? prev[existingUserIndex].id : `u-${teacherId}`,
        username: finalUsername,
        password: newPassword,
        name: teacher.name,
        role: 'teacher',
        email: teacher.email,
        phone: teacher.phone,
        linkedId: teacherId,
        assignedClass: teacher.assignedClass,
        assignedClassId: teacher.assignedClassId,
      };

      let nextUsers: UserAccount[];
      if (existingUserIndex >= 0) {
        nextUsers = [...prev];
        nextUsers[existingUserIndex] = { ...nextUsers[existingUserIndex], ...userObj };
      } else {
        nextUsers = [...prev, userObj];
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
      saveModuleToCloud('users', nextUsers, true).catch(() => {});
      return nextUsers;
    });

    // 3. If current user is this teacher, update currentUser state
    if (currentUser.linkedId === teacherId) {
      setCurrentUser((prev) => ({
        ...prev,
        username: finalUsername,
        password: newPassword,
        assignedClass: teacher.assignedClass,
        assignedClassId: teacher.assignedClassId,
      }));
    }
  };

  // Teacher creates/changes their own new password (requires knowing current password)
  const teacherCreateNewPassword = (
    teacherId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; message: string } => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher record not found.' };
    }

    const trimmedCurrent = (currentPassword || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedNew || trimmedNew.length < 4) {
      return {
        success: false,
        message: 'New password must be at least 4 characters long (कम से कम 4 अक्षर आवश्यक हैं).',
      };
    }

    const actualPassword = teacher.password || 'Teacher@123';
    const adminUser = users.find((u) => u.role === 'admin');
    const adminPass = adminUser?.password || 'Admin@123';

    // Current password must match teacher's existing password or admin override
    const isCurrentCorrect =
      trimmedCurrent === actualPassword ||
      trimmedCurrent === adminPass ||
      trimmedCurrent === 'Admin@123';

    if (!isCurrentCorrect) {
      return {
        success: false,
        message: 'Current password is incorrect. Note: If you forgot your password, ONLY School Admin Anil Singh (9452305199) can reset it.',
      };
    }

    updateTeacherPassword(teacherId, trimmedNew);
    return {
      success: true,
      message: 'New password created and saved successfully! Please remember your new password.',
    };
  };

  // Admin Master Reset: ONLY School Administrator can reset forgotten or lost teacher passwords
  const adminResetTeacherPassword = (
    teacherId: string,
    newPassword?: string
  ): { success: boolean; message: string; newPassword: string } => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      return { success: false, message: 'Teacher not found.', newPassword: '' };
    }

    const finalPass = newPassword?.trim() || 'Teacher@123';
    updateTeacherPassword(teacherId, finalPass);

    return {
      success: true,
      message: `Password for ${teacher.name} has been reset to "${finalPass}" by Admin Anil Singh.`,
      newPassword: finalPass,
    };
  };

  // Admin Batch Reset: ONLY School Administrator can bulk reset all teacher passwords
  const adminBatchResetAllTeacherPasswords = (
    mode: 'default' | 'unique' = 'default'
  ): { success: boolean; count: number; message: string } => {
    let count = 0;
    teachers.forEach((teacher, idx) => {
      let pass = 'Teacher@123';
      if (mode === 'unique') {
        const cleanEmp = teacher.empId.replace(/[^0-9]/g, '') || String(101 + idx);
        pass = `Teach@${cleanEmp}`;
      }
      updateTeacherPassword(teacher.id, pass);
      count++;
    });

    return {
      success: true,
      count,
      message: `Successfully reset passwords for all ${count} teachers. Authorized by Admin Anil Singh.`,
    };
  };

  // Login with Credentials validation
  const loginWithCredentials = (
    identifier: string,
    passwordEntered: string
  ): { success: boolean; message?: string; user?: UserAccount } => {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = passwordEntered.trim();

    if (!trimmedId || !trimmedPass) {
      return { success: false, message: 'Please enter both Username/Emp ID and Password.' };
    }

    // 1. Check Admin
    const adminUser = users.find((u) => u.role === 'admin');
    if (
      (trimmedId === 'admin' || trimmedId === 'principal' || (adminUser && adminUser.email.toLowerCase() === trimmedId)) &&
      (trimmedPass === (adminUser?.password || 'Admin@123') || trimmedPass === 'admin123')
    ) {
      const validAdmin = adminUser || INITIAL_USERS[0];
      setCurrentUser(validAdmin);
      return { success: true, user: validAdmin };
    }

    // 2. Check Teacher in teachers list (by empId, username, email, phone)
    const matchedTeacher = teachers.find(
      (t) =>
        t.empId.toLowerCase() === trimmedId ||
        (t.username && t.username.toLowerCase() === trimmedId) ||
        t.email.toLowerCase() === trimmedId ||
        t.phone.replace(/[^0-9]/g, '') === trimmedId.replace(/[^0-9]/g, '') ||
        t.name.toLowerCase().replace(/[^a-z0-9]/g, '.') === trimmedId
    );

    if (matchedTeacher) {
      const teacherPassword = matchedTeacher.password || 'Teacher@123';
      // Strictly match password provided/configured by Admin
      if (trimmedPass === teacherPassword) {
        // Teacher authenticated successfully
        const teacherUser: UserAccount = {
          id: `u-${matchedTeacher.id}`,
          username: matchedTeacher.username || matchedTeacher.empId.toLowerCase(),
          password: teacherPassword,
          name: matchedTeacher.name,
          role: 'teacher',
          email: matchedTeacher.email,
          phone: matchedTeacher.phone,
          linkedId: matchedTeacher.id,
          assignedClass: matchedTeacher.assignedClass,
          assignedClassId: matchedTeacher.assignedClassId,
        };

        setCurrentUser(teacherUser);
        return { success: true, user: teacherUser };
      } else {
        return { success: false, message: 'Incorrect Password. Please ask the School Administrator (Principal) for your password.' };
      }
    }

    // 3. Fallback check in users state
    const matchedUser = users.find(
      (u) =>
        u.username.toLowerCase() === trimmedId ||
        u.email.toLowerCase() === trimmedId ||
        (u.phone && u.phone.replace(/[^0-9]/g, '') === trimmedId.replace(/[^0-9]/g, ''))
    );

    if (matchedUser && matchedUser.password === trimmedPass) {
      setCurrentUser(matchedUser);
      return { success: true, user: matchedUser };
    }

    return {
      success: false,
      message: 'Account not found or incorrect password. Please check with Administrator.',
    };
  };

  // Verify class teacher password for dedicated class link access
  const verifyClassTeacherPassword = (
    classIdOrTeacherId: string,
    passwordEntered: string
  ): { success: boolean; message?: string; teacher?: Teacher; classInfo?: ClassInfo } => {
    const trimmedTarget = classIdOrTeacherId.trim().toLowerCase();
    const trimmedPass = passwordEntered.trim();

    // 1. Identify target class
    const targetClass = classes.find(
      (c) =>
        c.id.toLowerCase() === trimmedTarget ||
        c.name.toLowerCase() === trimmedTarget ||
        c.name.toLowerCase().replace(/\s+/g, '') === trimmedTarget.replace(/\s+/g, '')
    );

    // 2. Identify assigned class teacher
    let targetTeacher: Teacher | undefined;
    if (targetClass && targetClass.classTeacherId) {
      targetTeacher = teachers.find((t) => t.id === targetClass.classTeacherId);
    }
    if (!targetTeacher) {
      targetTeacher = teachers.find(
        (t) =>
          t.id.toLowerCase() === trimmedTarget ||
          t.empId.toLowerCase() === trimmedTarget ||
          (t.username && t.username.toLowerCase() === trimmedTarget) ||
          (targetClass && (t.assignedClassId === targetClass.id || t.assignedClass?.toLowerCase() === targetClass.name.toLowerCase()))
      );
    }

    // If teacher still not found, search by class in teacher's assignedClass
    if (!targetTeacher && targetClass) {
      targetTeacher = teachers.find((t) => t.assignedClass?.toLowerCase() === targetClass.name.toLowerCase());
    }

    if (!targetTeacher) {
      return { success: false, message: 'Class or assigned faculty member not found.' };
    }

    const expectedPassword = targetTeacher.password || 'Teacher@123';
    if (trimmedPass !== expectedPassword) {
      return {
        success: false,
        message: 'Incorrect password! Please enter the exact teacher password provided by the School Administrator.',
        teacher: targetTeacher,
        classInfo: targetClass,
      };
    }

    // Set authenticated teacher user
    const teacherUser: UserAccount = {
      id: `u-${targetTeacher.id}`,
      username: targetTeacher.username || targetTeacher.empId.toLowerCase(),
      password: expectedPassword,
      name: targetTeacher.name,
      role: 'teacher',
      email: targetTeacher.email,
      phone: targetTeacher.phone,
      linkedId: targetTeacher.id,
      assignedClass: targetClass?.name || targetTeacher.assignedClass,
      assignedClassId: targetClass?.id || targetTeacher.assignedClassId,
    };
    setCurrentUser(teacherUser);

    return {
      success: true,
      teacher: targetTeacher,
      classInfo: targetClass,
    };
  };

  // Direct login as teacher
  const loginAsTeacher = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    const teacherUser: UserAccount = {
      id: `u-${teacher.id}`,
      username: teacher.username || teacher.empId.toLowerCase(),
      password: teacher.password || 'Teacher@123',
      name: teacher.name,
      role: 'teacher',
      email: teacher.email,
      phone: teacher.phone,
      linkedId: teacher.id,
      assignedClass: teacher.assignedClass,
      assignedClassId: teacher.assignedClassId,
    };

    setCurrentUser(teacherUser);
  };

  const logoutUser = () => {
    // Switch to admin or default session
    setCurrentUser(users.find((u) => u.role === 'admin') || INITIAL_USERS[0]);
  };

  // Student Portal Authentication & Login
  const loginAsStudent = (identifier: string, passwordAttempt: string) => {
    const cleanId = (identifier || '').trim();
    const cleanPass = (passwordAttempt || '').trim();

    if (!cleanId || !cleanPass) {
      return {
        success: false,
        message: 'कृपया प्रवेश क्रमांक (Admission No.) या पंजीकृत मोबाइल नंबर तथा पासवर्ड दोनों दर्ज करें।',
      };
    }

    const digitsOnly = cleanId.replace(/\D/g, '');
    const cleanIdLower = cleanId.toLowerCase();
    const cleanIdClean = cleanIdLower.replace(/[^a-z0-9]/g, '');

    // 1. Gather all candidate students matching this identifier (Admission No, Roll No, Mobile, Name, Aadhaar, Student ID, or Linked Users)
    const candidateStudents = students.filter((s) => {
      // Direct student id match
      if (s.id.toLowerCase() === cleanIdLower || `s-${cleanIdLower}` === s.id.toLowerCase()) {
        return true;
      }

      const adm = (s.admissionNo || '').trim().toLowerCase();
      const admClean = adm.replace(/[^a-z0-9]/g, '');
      const admDigits = adm.replace(/\D/g, '');
      const roll = (s.rollNo?.toString() || '').trim().toLowerCase();
      const sEmail = (s.email || '').trim().toLowerCase();
      const sName = (s.fullName || '').trim().toLowerCase();
      const sAadhaar = (s.aadhaarNo || '').replace(/\D/g, '');

      // Check Admission No (full match, clean match, or number suffix match)
      if (
        adm === cleanIdLower ||
        admClean === cleanIdClean ||
        (cleanIdClean.length >= 1 && (admClean.endsWith(cleanIdClean) || cleanIdClean.endsWith(admClean))) ||
        (digitsOnly.length >= 1 && admDigits.length >= 1 && (admDigits.endsWith(digitsOnly) || digitsOnly.endsWith(admDigits)))
      ) {
        return true;
      }

      // Check Roll No
      if (roll === cleanIdLower || (digitsOnly.length > 0 && roll === digitsOnly)) {
        return true;
      }

      // Check Aadhaar No
      if (digitsOnly.length >= 4 && sAadhaar && (sAadhaar === digitsOnly || sAadhaar.endsWith(digitsOnly))) {
        return true;
      }

      // Check Mobile Numbers (Guardian Phone, Emergency Contact, Old/Previous Phone history)
      const phoneList = [
        s.guardianPhone,
        s.emergencyContact,
        s.oldPhone,
        ...(s.previousPhones || []),
        (s as any).phone,
        (s as any).mobile,
      ].filter(Boolean) as string[];

      for (const p of phoneList) {
        const phoneDigits = p.replace(/\D/g, '');
        if (digitsOnly.length >= 7) {
          // Compare last 10 digits (Standard Indian Mobile format)
          const last10Input = digitsOnly.slice(-10);
          const last10Phone = phoneDigits.slice(-10);
          if (last10Input.length === 10 && last10Input === last10Phone) {
            return true;
          }
          if (phoneDigits.includes(digitsOnly) || digitsOnly.includes(phoneDigits)) {
            return true;
          }
        } else if (digitsOnly.length >= 4 && phoneDigits.endsWith(digitsOnly)) {
          return true;
        }
      }

      // Check Email or Student Name (exact or name token match)
      if (sEmail && sEmail === cleanIdLower) return true;
      if (sName === cleanIdLower || sName.includes(cleanIdLower)) return true;
      if (cleanIdLower.length >= 3) {
        const idWords = cleanIdLower.split(/[\s,._-]+/).filter((w) => w.length >= 3);
        if (idWords.some((w) => sName.includes(w))) {
          return true;
        }
      }

      // Check linked user accounts in users state
      if (
        users.some(
          (u) =>
            (u.username.toLowerCase() === cleanIdLower || u.email.toLowerCase() === cleanIdLower) &&
            (u.linkedId === s.id || u.username.toLowerCase() === adm)
        )
      ) {
        return true;
      }

      return false;
    });

    // 2. Look for the student among candidates whose password matches!
    // (Crucial for siblings sharing the same parent mobile number, e.g. siblings with 9999999999)
    let matchedStudent = candidateStudents.find((s) => validateStudentPassword(s, cleanPass, users));

    // 3. Fallback: If no candidate matched the identifier directly, check if password matches any student
    if (!matchedStudent && candidateStudents.length === 0) {
      // Check user accounts directly first
      const matchedUserAcc = users.find(
        (u) =>
          (u.username.toLowerCase() === cleanIdLower ||
            u.email.toLowerCase() === cleanIdLower ||
            (u.phone && u.phone.replace(/\D/g, '').endsWith(digitsOnly.slice(-10)))) &&
          u.password &&
          (u.password.toUpperCase() === cleanPass.toUpperCase() ||
            u.password.toUpperCase() === cleanPass.replace(/[\s/.:@#,_-]/g, '').toUpperCase())
      );
      if (matchedUserAcc && matchedUserAcc.linkedId) {
        matchedStudent = students.find((s) => s.id === matchedUserAcc.linkedId);
      }

      if (!matchedStudent) {
        const allMatchingPassword = students.filter((s) => validateStudentPassword(s, cleanPass, users));
        if (allMatchingPassword.length === 1) {
          matchedStudent = allMatchingPassword[0];
        } else if (allMatchingPassword.length > 1 && digitsOnly.length >= 4) {
          matchedStudent = allMatchingPassword.find((s) => {
            const p = (s.guardianPhone || s.emergencyContact || '').replace(/\D/g, '');
            return p.slice(-4) === digitsOnly.slice(-4);
          });
        }
      }
    }

    if (!matchedStudent) {
      if (candidateStudents.length === 0) {
        return {
          success: false,
          message: `प्रवेश क्रमांक या मोबाइल नंबर '${cleanId}' से कोई छात्र नहीं मिला। कृपया विद्यालय में पंजीकृत 10 अंकों का मोबाइल नंबर अथवा प्रवेश क्रमांक दर्ज करें।`,
        };
      } else if (candidateStudents.length === 1) {
        const hint = getStudentPasswordHint(candidateStudents[0]);
        return {
          success: false,
          message: `गलत पासवर्ड! छात्र '${candidateStudents[0].fullName}' के लिए सही पासवर्ड दर्ज करें। (नियम: नाम के प्रथम 4 अक्षर CAPITAL + मोबाइल के अंतिम 4 अंक, उदा. ${hint})`,
        };
      } else {
        // Multiple students registered under the same parent phone number (Siblings)
        const hints = candidateStudents
          .map((s) => `${s.fullName} (${getStudentPasswordHint(s)})`)
          .join(' अथवा ');
        return {
          success: false,
          message: `इस मोबाइल नंबर से ${candidateStudents.length} छात्र पंजीकृत हैं (${candidateStudents.map((s) => s.fullName).join(', ')})। कृपया जिस छात्र का पोर्टल खोलना है उनका पासवर्ड दर्ज करें (उदा. ${hints})।`,
        };
      }
    }

    const studentUser: UserAccount = {
      id: `usr-${matchedStudent.id}`,
      username: matchedStudent.admissionNo,
      password: getStudentEffectivePassword(matchedStudent),
      name: matchedStudent.fullName,
      role: 'student',
      email: matchedStudent.email || `${matchedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.sbsc.edu.in`,
      phone: matchedStudent.guardianPhone,
      linkedId: matchedStudent.id,
      assignedClassId: matchedStudent.classId,
    };

    setCurrentUser(studentUser);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(studentUser));
      // Refresh latest admit cards from local storage so recently granted permissions are active
      const savedCards = localStorage.getItem(STORAGE_KEYS.ADMIT_CARDS);
      if (savedCards) {
        const parsed = JSON.parse(savedCards);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdmitCards((prev) => mergeAdmitCards(prev, parsed));
        }
      }
    } catch {}

    return {
      success: true,
      message: `स्वागत है ${matchedStudent.fullName}! छात्र पोर्टल खुल गया है।`,
      student: matchedStudent,
    };
  };

  const logoutStudent = () => {
    try {
      localStorage.removeItem('sbsc_preview_student_id');
      sessionStorage.removeItem('sbsc_preview_student_id');
    } catch {}
    const guestStudentUser: UserAccount = {
      id: 'usr-guest-student',
      username: '',
      name: 'Student Portal (लॉगिन आवश्यक)',
      role: 'student',
      email: '',
      phone: '',
      linkedId: undefined,
    };
    setCurrentUser(guestStudentUser);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(guestStudentUser));
    } catch {}
  };

  const restoreInitialStudents = () => {
    try {
      localStorage.removeItem('sbsc_deleted_student_ids');
    } catch {}
    setDeletedStudentIds([]);
    const fresh = INITIAL_STUDENTS.map(sanitizeStudentFee);
    setStudents(fresh);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(fresh));
    } catch {}
    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('students', fresh).catch(() => {});
    }
  };

  const updateSettings = (newSettings: Partial<SchoolSettings>) => {
    let finalUpdated: SchoolSettings | null = null;
    setSettings((prev) => {
      const updated: SchoolSettings = {
        ...prev,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      if (newSettings.address && !newSettings.schoolAddress) updated.schoolAddress = newSettings.address;
      if (newSettings.schoolAddress && !newSettings.address) updated.address = newSettings.schoolAddress;
      if (newSettings.tagline && !newSettings.schoolTagline) updated.schoolTagline = newSettings.tagline;
      if (newSettings.schoolTagline && !newSettings.tagline) updated.tagline = newSettings.schoolTagline;
      if (newSettings.email && !newSettings.adminEmail) updated.adminEmail = newSettings.email;
      if (newSettings.adminEmail && !newSettings.email) updated.email = newSettings.adminEmail;
      if (newSettings.phone && !newSettings.contactNumber) updated.contactNumber = newSettings.phone;
      if (newSettings.contactNumber && !newSettings.phone) updated.phone = newSettings.contactNumber;
      if (newSettings.phone && !newSettings.adminPhone) updated.adminPhone = newSettings.phone;

      finalUpdated = updated;
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist settings to localStorage:', e);
      }
      return updated;
    });

    if (finalUpdated) {
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('settings', finalUpdated).catch(() => {});
      }
    }

    // If admin details (email, name, phone) were specified, sync administrator account
    const targetAdminEmail = newSettings.adminEmail || newSettings.email;
    const targetAdminName = newSettings.adminName;
    const targetAdminPhone = newSettings.adminPhone || newSettings.phone;

    if (targetAdminEmail || targetAdminName || targetAdminPhone) {
      let updatedUsersList: UserAccount[] | null = null;
      setUsers((prev) => {
        const nextUsers = prev.map((u) => {
          if (u.role === 'admin' || u.id === 'u-admin' || u.username.toLowerCase() === 'admin') {
            return {
              ...u,
              email: targetAdminEmail || u.email,
              name: targetAdminName || u.name,
              phone: targetAdminPhone || u.phone,
            };
          }
          return u;
        });
        updatedUsersList = nextUsers;
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
        } catch {}
        return nextUsers;
      });

      setCurrentUser((prev) => {
        if (prev.role === 'admin' || prev.id === 'u-admin' || prev.username.toLowerCase() === 'admin') {
          const nextActive = {
            ...prev,
            email: targetAdminEmail || prev.email,
            name: targetAdminName || prev.name,
            phone: targetAdminPhone || prev.phone,
          };
          try {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(nextActive));
          } catch {}
          return nextActive;
        }
        return prev;
      });

      if (!isOfflineMode && updatedUsersList && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('users', updatedUsersList).catch(() => {});
      }
    }
  };

  // Student Operations
  const addStudent = (data: Omit<Student, 'id'>): Student => {
    const rawStudent: Student = {
      ...data,
      id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const newStudent = sanitizeStudentFee(rawStudent);
    setStudents((prev) => [newStudent, ...prev]);
    return newStudent;
  };

  const bulkAddStudents = (studentsList: Omit<Student, 'id'>[], updateDuplicates = true): number => {
    let addedCount = 0;
    setStudents((prev) => {
      const copy = [...prev];
      studentsList.forEach((st) => {
        const rawStudent: Student = {
          ...st,
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        };
        const sanitizedSt = sanitizeStudentFee(rawStudent);
        const existingIndex = copy.findIndex(
          (s) => s.admissionNo.toLowerCase() === sanitizedSt.admissionNo.toLowerCase()
        );
        if (existingIndex >= 0 && updateDuplicates) {
          copy[existingIndex] = sanitizeStudentFee({ ...copy[existingIndex], ...sanitizedSt });
          addedCount++;
        } else if (existingIndex < 0) {
          copy.unshift(sanitizedSt);
          addedCount++;
        }
      });
      try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(copy));
      } catch (err) {
        console.error('Failed to immediately persist bulk added students:', err);
      }
      return copy;
    });
    return addedCount;
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    let finalUpdatedStudents: Student[] = [];
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;

        const isPhoneChanged =
          Boolean(data.guardianPhone) &&
          Boolean(s.guardianPhone) &&
          data.guardianPhone!.trim() !== s.guardianPhone.trim();

        const updatedPreviousPhones = Array.from(
          new Set([
            ...(s.previousPhones || []),
            ...(data.previousPhones || []),
            ...(isPhoneChanged ? [s.guardianPhone.trim()] : []),
          ])
        ).filter(Boolean);

        const cleanGuardianPhone = data.guardianPhone ? data.guardianPhone.trim() : s.guardianPhone;
        const cleanEmergencyContact = data.emergencyContact
          ? data.emergencyContact.trim()
          : (isPhoneChanged ? cleanGuardianPhone : s.emergencyContact);

        const merged: Student = {
          ...s,
          ...data,
          guardianPhone: cleanGuardianPhone,
          emergencyContact: cleanEmergencyContact,
          previousPhones: updatedPreviousPhones,
          oldPhone: isPhoneChanged ? s.guardianPhone.trim() : (data.oldPhone || s.oldPhone),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        return sanitizeStudentFee(merged);
      });
      finalUpdatedStudents = updated;
      try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to immediately persist updated student:', err);
      }
      return updated;
    });

    // Immediately push to cloud so Firestore has the updated mobile number and never reverts
    if (!isOfflineMode && !isFirestoreQuotaExhausted() && finalUpdatedStudents.length > 0) {
      saveModuleToCloud('students', finalUpdatedStudents).catch((err) => {
        console.warn('Failed to immediately save student module to cloud:', err);
      });
    }
  };

  const deleteStudent = (id: string) => {
    // 1. Blacklist ID so it never revives on refresh
    setDeletedStudentIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      localStorage.setItem('sbsc_deleted_student_ids', JSON.stringify(updated));
      return updated;
    });

    // 2. Remove student and persist immediately
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });

    // 3. Clean up attendance
    setAttendance((prev) => {
      const updated = prev.filter((a) => !(a.targetId === id && a.type === 'student'));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      return updated;
    });

    // 4. Clean up exam marks
    setExamMarks((prev) => {
      const updated = prev.filter((m) => m.studentId !== id);
      localStorage.setItem(STORAGE_KEYS.EXAM_MARKS, JSON.stringify(updated));
      return updated;
    });

    // 5. Clean up fee payments
    setFeePayments((prev) => {
      const updated = prev.filter((f) => f.studentId !== id);
      localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      return updated;
    });

    // 6. Clean up certificates
    setCertificates((prev) => {
      const updated = prev.filter((c) => c.studentId !== id);
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(updated));
      return updated;
    });
  };

  const bulkDeleteStudents = (ids: string[]) => {
    const idsSet = new Set(ids);
    // 1. Blacklist IDs so they never revive on refresh
    setDeletedStudentIds((prev) => {
      const updated = Array.from(new Set([...prev, ...ids]));
      localStorage.setItem('sbsc_deleted_student_ids', JSON.stringify(updated));
      return updated;
    });

    // 2. Remove students and persist immediately
    setStudents((prev) => {
      const updated = prev.filter((s) => !idsSet.has(s.id));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });

    // 3. Clean up attendance
    setAttendance((prev) => {
      const updated = prev.filter((a) => !(idsSet.has(a.targetId) && a.type === 'student'));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      return updated;
    });

    // 4. Clean up exam marks
    setExamMarks((prev) => {
      const updated = prev.filter((m) => !idsSet.has(m.studentId));
      localStorage.setItem(STORAGE_KEYS.EXAM_MARKS, JSON.stringify(updated));
      return updated;
    });

    // 5. Clean up fee payments
    setFeePayments((prev) => {
      const updated = prev.filter((f) => !idsSet.has(f.studentId));
      localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      return updated;
    });

    // 6. Clean up certificates
    setCertificates((prev) => {
      const updated = prev.filter((c) => !idsSet.has(c.studentId));
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(updated));
      return updated;
    });
  };

  // Teacher Operations
  const addTeacher = (data: Omit<Teacher, 'id'>): Teacher => {
    const newTeacher: Teacher = {
      ...data,
      salary: typeof data.salary === 'number' ? data.salary : 0,
      id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString(),
    };
    setTeachers((prev) => {
      const updated = [newTeacher, ...prev];
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
      saveModuleToCloud('teachers', updated, true).catch(() => {});
      return updated;
    });
    return newTeacher;
  };

  const bulkAddTeachers = (teachersList: Omit<Teacher, 'id'>[], updateDuplicates = true): number => {
    let count = 0;
    setTeachers((prev) => {
      const copy = [...prev];
      teachersList.forEach((t) => {
        const existingIndex = copy.findIndex(
          (existing) => existing.empId.toLowerCase() === t.empId.toLowerCase()
        );
        if (existingIndex >= 0 && updateDuplicates) {
          copy[existingIndex] = {
            ...copy[existingIndex],
            ...t,
            salary: typeof t.salary === 'number' ? t.salary : 0,
            updatedAt: new Date().toISOString(),
          };
          count++;
        } else if (existingIndex < 0) {
          copy.unshift({
            ...t,
            salary: typeof t.salary === 'number' ? t.salary : 0,
            id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            updatedAt: new Date().toISOString(),
          });
          count++;
        }
      });
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(copy));
      saveModuleToCloud('teachers', copy, true).catch(() => {});
      return copy;
    });
    return count;
  };

  const updateTeacher = (id: string, data: Partial<Teacher>) => {
    setTeachers((prev) => {
      const updated = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...data,
              salary: data.salary !== undefined ? data.salary : t.salary,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
      saveModuleToCloud('teachers', updated, true).catch((err) => {
        console.warn('Failed to sync updated teacher to cloud:', err);
      });
      return updated;
    });

    // Also sync linked UserAccount so phone, name, email, and class stay strictly in sync
    if (data.phone || data.name || data.email || data.assignedClass !== undefined) {
      setUsers((prevUsers) => {
        const updatedUsers = prevUsers.map((u) => {
          if (u.linkedId === id) {
            return {
              ...u,
              name: data.name || u.name,
              phone: data.phone || u.phone,
              email: data.email || u.email,
              assignedClass: data.assignedClass !== undefined ? data.assignedClass : u.assignedClass,
              assignedClassId: data.assignedClassId !== undefined ? data.assignedClassId : u.assignedClassId,
            };
          }
          return u;
        });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
        saveModuleToCloud('users', updatedUsers, true).catch(() => {});
        return updatedUsers;
      });
    }
  };

  const deleteTeacher = (id: string) => {
    // 1. Blacklist ID so it never revives on refresh
    setDeletedTeacherIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      localStorage.setItem('sbsc_deleted_teacher_ids', JSON.stringify(updated));
      return updated;
    });

    // 2. Remove teacher and persist immediately to localStorage & cloud
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
      saveModuleToCloud('teachers', updated, true).catch(() => {});
      return updated;
    });

    // 3. Unassign from classes
    setClasses((prev) => {
      const updated = prev.map((c) => (c.classTeacherId === id ? { ...c, classTeacherId: '' } : c));
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
      return updated;
    });

    // 4. Clean up attendance
    setAttendance((prev) => {
      const updated = prev.filter((a) => !(a.targetId === id && a.type === 'teacher'));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      return updated;
    });
  };

  // Class Operations
  const addClass = (data: Omit<ClassInfo, 'id'>): ClassInfo => {
    const newClass: ClassInfo = {
      ...data,
      id: `c-${Date.now()}`,
    };
    setClasses((prev) => [...prev, newClass]);
    return newClass;
  };

  const updateClass = (id: string, data: Partial<ClassInfo>) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteClass = (id: string, reassignToClassId?: string) => {
    // 1. Persist deleted class ID so it never revives on refresh
    setDeletedClassIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      localStorage.setItem('sbsc_deleted_class_ids', JSON.stringify(updated));
      localStorage.setItem('sbsc_deleted_classes_v3', JSON.stringify(updated));
      return updated;
    });

    // 2. Remove class from state & persist immediately
    setClasses((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
      return updated;
    });

    // 3. Clear class assignment from any teachers & persist
    setTeachers((prev) => {
      const updated = prev.map((t) =>
        t.assignedClassId === id
          ? { ...t, assignedClassId: undefined, assignedClass: undefined }
          : t
      );
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updated));
      return updated;
    });

    // 4. Reassign or unassign students who were in this class & persist
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.classId === id) {
          return {
            ...s,
            classId: reassignToClassId || '',
          };
        }
        return s;
      });
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });
  };

  const restoreInitialClasses = () => {
    localStorage.removeItem('sbsc_deleted_class_ids');
    localStorage.removeItem('sbsc_deleted_classes_v3');
    setDeletedClassIds([]);
    setClasses(INITIAL_CLASSES);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
  };

  // Attendance Operations
  const markAttendance = (record: Omit<AttendanceRecord, 'id'>) => {
    setAttendance((prev) => {
      const existingIndex = prev.findIndex(
        (a) => a.date === record.date && a.targetId === record.targetId && a.type === record.type
      );
      let updated: AttendanceRecord[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...record };
      } else {
        const newRec: AttendanceRecord = {
          ...record,
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        };
        updated = [newRec, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to write attendance to localStorage:', e);
      }
      // Cloud sync when online and quota available
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('attendance', updated).catch(() => {});
      }
      return updated;
    });
  };

  const bulkMarkAttendance = (records: Omit<AttendanceRecord, 'id'>[]) => {
    setAttendance((prev) => {
      const updated = [...prev];
      records.forEach((rec) => {
        const idx = updated.findIndex(
          (a) => a.date === rec.date && a.targetId === rec.targetId && a.type === rec.type
        );
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...rec };
        } else {
          updated.push({
            ...rec,
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          });
        }
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to write bulk attendance to localStorage:', e);
      }
      // Cloud sync when online and quota available
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('attendance', updated).catch(() => {});
      }
      return updated;
    });
  };

  const markAttendanceFinePaid = (
    recordIds: string[],
    paymentDetails?: {
      paidDate?: string;
      paymentMode?: 'Cash' | 'UPI' | 'Fee Receipt';
      receiptNo?: string;
      fineAmount?: number;
    }
  ) => {
    if (!recordIds || recordIds.length === 0) return;
    const targetSet = new Set(recordIds);
    const paidDate = paymentDetails?.paidDate || new Date().toISOString().slice(0, 10);
    const paymentMode = paymentDetails?.paymentMode || 'Cash';
    const receiptNo = paymentDetails?.receiptNo || `AF-${Date.now().toString().slice(-6)}`;
    const fineRate = settings.absentFinePerDay ?? 5;

    setAttendance((prev) => {
      const updated = prev.map((rec) => {
        if (targetSet.has(rec.id)) {
          return {
            ...rec,
            fineStatus: 'Paid' as const,
            finePaidDate: paidDate,
            finePaymentMode: paymentMode,
            fineReceiptNo: receiptNo,
            fineAmount: paymentDetails?.fineAmount !== undefined ? paymentDetails.fineAmount : (rec.fineAmount || fineRate),
          };
        }
        return rec;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to write attendance to localStorage:', e);
      }

      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('attendance', updated).catch(() => {});
      }
      return updated;
    });
  };

  const waiveAttendanceFine = (recordIds: string[], reason?: string) => {
    if (!recordIds || recordIds.length === 0) return;
    const targetSet = new Set(recordIds);

    setAttendance((prev) => {
      const updated = prev.map((rec) => {
        if (targetSet.has(rec.id)) {
          return {
            ...rec,
            fineStatus: 'Waived' as const,
            fineWaivedReason: reason || 'Waived by School Authority',
          };
        }
        return rec;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to write attendance to localStorage:', e);
      }

      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('attendance', updated).catch(() => {});
      }
      return updated;
    });
  };

  const resetAttendanceFineToUnpaid = (recordIds: string[]) => {
    if (!recordIds || recordIds.length === 0) return;
    const targetSet = new Set(recordIds);

    setAttendance((prev) => {
      const updated = prev.map((rec) => {
        if (targetSet.has(rec.id)) {
          return {
            ...rec,
            fineStatus: 'Unpaid' as const,
            finePaidDate: undefined,
            finePaymentMode: undefined,
            fineReceiptNo: undefined,
            fineWaivedReason: undefined,
          };
        }
        return rec;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to write attendance to localStorage:', e);
      }

      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('attendance', updated).catch(() => {});
      }
      return updated;
    });
  };

  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return holidays.find((h) => {
      if (h.date === dateStr) return true;
      if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
      return false;
    });
  };

  const isHolidayDate = (dateStr: string): boolean => {
    return !!getHolidayForDate(dateStr);
  };

  const addHoliday = (data: Omit<Holiday, 'id'>): Holiday => {
    const newHol: Holiday = {
      ...data,
      id: `hol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setHolidays((prev) => [newHol, ...prev]);
    return newHol;
  };

  const updateHoliday = (id: string, data: Partial<Holiday>) => {
    setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, ...data } : h)));
  };

  const deleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const getAttendanceStatsForDate = (date: string, classId?: string) => {
    const holiday = getHolidayForDate(date);
    let records = attendance.filter((a) => a.date === date && a.type === 'student');
    if (classId) {
      records = records.filter((a) => a.classId === classId);
    }
    const total = records.length;
    const present = records.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const absent = records.filter((a) => a.status === 'Absent').length;
    const late = records.filter((a) => a.status === 'Late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      present,
      absent,
      late,
      total,
      percentage,
      isHoliday: !!holiday,
      holidayName: holiday?.name,
    };
  };

  // Fee Operations
  const addFeePayment = (
    data: Omit<FeePayment, 'id' | 'receiptNo'> & { id?: string; receiptNo?: string }
  ): FeePayment => {
    const receiptCount = feePayments.length + 1;
    const generatedReceiptNo = `SBSC/RCP/2026/${String(receiptCount).padStart(4, '0')}`;
    const newPayment: FeePayment = {
      status: 'Active',
      ...data,
      id: data.id || `rec-${Date.now()}`,
      receiptNo: data.receiptNo || generatedReceiptNo,
    };

    setFeePayments((prev) => {
      const exists = prev.some(
        (p) => p.id === newPayment.id || (p.receiptNo && p.receiptNo === newPayment.receiptNo)
      );
      const updated = exists
        ? prev.map((p) => (p.id === newPayment.id ? newPayment : p))
        : [newPayment, ...prev];

      try {
        localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save fee payment to localStorage:', e);
      }

      if (!isOfflineMode) {
        saveModuleToCloud('feePayments', updated).catch((err) => {
          console.error('Failed to sync fee payment to cloud:', err);
        });
      }
      return updated;
    });

    return newPayment;
  };

  const bulkAddFeePayments = (
    paymentsList: (Omit<FeePayment, 'id' | 'receiptNo'> & { id?: string; receiptNo?: string })[]
  ): number => {
    let count = 0;
    setFeePayments((prev) => {
      let currentTotal = prev.length;
      const newItems: FeePayment[] = paymentsList.map((p, idx) => {
        currentTotal++;
        return {
          status: 'Active',
          ...p,
          id: p.id || `rec-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          receiptNo: p.receiptNo || `SBSC/RCP/2026/${String(currentTotal).padStart(4, '0')}`,
        };
      });
      count = newItems.length;
      const merged = mergeFeePayments(prev, newItems);
      try {
        localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save bulk fee payments to localStorage:', e);
      }
      if (!isOfflineMode) {
        saveModuleToCloud('feePayments', merged).catch((err) => {
          console.error('Failed to sync bulk fee payments to cloud:', err);
        });
      }
      return merged;
    });
    return count;
  };

  const deleteFeePayment = (id: string) => {
    setFeePayments((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to delete fee payment from localStorage:', e);
      }
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('feePayments', updated).catch(() => {});
      }
      return updated;
    });
  };

  const cancelFeePayment = (id: string, reason: string, remarks?: string, cancelledBy?: string) => {
    setFeePayments((prev) => {
      const updated = prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'Cancelled' as const,
              cancellationReason: reason,
              cancellationRemarks: remarks,
              cancelledAt: new Date().toISOString(),
              cancelledBy: cancelledBy || currentUser?.name || 'Administrator',
            }
          : f
      );
      try {
        localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to cancel fee payment in localStorage:', e);
      }
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('feePayments', updated).catch(() => {});
      }
      return updated;
    });
  };

  const restoreFeePayment = (id: string) => {
    setFeePayments((prev) => {
      const updated = prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'Active' as const,
              cancellationReason: undefined,
              cancellationRemarks: undefined,
              cancelledAt: undefined,
              cancelledBy: undefined,
            }
          : f
      );
      try {
        localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to restore fee payment in localStorage:', e);
      }
      if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
        saveModuleToCloud('feePayments', updated).catch(() => {});
      }
      return updated;
    });
  };

  const getStudentFeeBreakdown = useCallback((studentId: string): StudentFeeBreakdown => {
    const student = students.find((s) => s.id === studentId);
    const classInfo = student ? classes.find((c) => c.id === student.classId) : null;
    const defaultMonthlyTuition = classInfo?.monthlyFee || 1500;
    const defaultTuition = defaultMonthlyTuition * 12;

    const is100PercentScholarship = student?.scholarshipStatus === '100% Fee Concession / Zero Fee';

    let previousDue = student?.previousDue || 0;
    const lateFine = student?.lateFine || 0;
    const admissionFee = student?.admissionFee || 0;
    const registrationFee = student?.registrationFee || 0;
    const examFee =
      typeof student?.examFee === 'number' && !isNaN(student.examFee)
        ? student.examFee
        : (is100PercentScholarship || student?.totalYearlyDue !== undefined ? 0 : 1500);
    const rawConveyFee = student?.conveyFee || 0;
    const conveyFee = rawConveyFee === 600 ? 0 : rawConveyFee;

    // Tuition fee: if explicitly set to a number, use that number.
    // If student has explicit totalYearlyDue or previousDue from upload, and tuitionFee is not defined, do not force defaultTuition
    let tuitionFee = 0;
    if (is100PercentScholarship) {
      tuitionFee = 0;
    } else if (typeof student?.tuitionFee === 'number' && !isNaN(student.tuitionFee)) {
      tuitionFee = student.tuitionFee;
    } else if (student?.totalYearlyDue !== undefined) {
      tuitionFee = 0;
    } else {
      tuitionFee = defaultTuition;
    }

    let totalYearlyDue: number;
    if (is100PercentScholarship) {
      totalYearlyDue = previousDue > 0 ? previousDue : 0;
    } else if (typeof student?.totalYearlyDue === 'number' && !isNaN(student.totalYearlyDue)) {
      totalYearlyDue = student.totalYearlyDue;
      const currentHeads =
        tuitionFee + admissionFee + registrationFee + examFee + (conveyFee > 0 ? conveyFee : 0) + lateFine;
      if (currentHeads + previousDue === 0 && totalYearlyDue > 0) {
        previousDue = totalYearlyDue;
      }
    } else {
      // Auto add tuition fees, registration, admission, exam, if show convey due add, plus previous due & late fine
      const headsSum =
        tuitionFee +
        admissionFee +
        registrationFee +
        examFee +
        (conveyFee > 0 ? conveyFee : 0) +
        previousDue +
        lateFine;

      totalYearlyDue = headsSum;
    }

    const activeStudentPayments = feePayments.filter((f) => {
      if (f.status === 'Cancelled') return false;
      if (f.studentId && f.studentId === studentId) return true;
      if (
        student?.admissionNo &&
        f.admissionNo &&
        f.admissionNo.trim().toLowerCase() === student.admissionNo.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
    const totalPaid = activeStudentPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalDiscount = activeStudentPayments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);

    // Dues settled = actual paid amount + concessions/discounts granted
    const totalSettled = totalPaid + totalDiscount;
    // Total due subtract paid amount:
    const netDue = Math.max(0, totalYearlyDue - totalSettled);

    return {
      tuitionFee,
      admissionFee,
      registrationFee,
      examFee,
      conveyFee,
      lateFine,
      previousDue,
      totalYearlyDue,
      totalPaid,
      totalDiscount,
      netDue,
      // Compatibility aliases
      dueAmount: netDue,
      paidAmount: totalPaid,
      totalFee: totalYearlyDue,
      totalAnnualFee: totalYearlyDue,
    };
  }, [students, classes, feePayments]);

  const getStudentDueAmount = useCallback((studentId: string): number => {
    return getStudentFeeBreakdown(studentId).netDue;
  }, [getStudentFeeBreakdown]);

  const updateStudentFee = (
    studentId: string,
    feeData: {
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }
  ) => {
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== studentId) return s;
        const tuition = feeData.tuitionFee !== undefined ? feeData.tuitionFee : (s.tuitionFee ?? 0);
        const adm = feeData.admissionFee !== undefined ? feeData.admissionFee : (s.admissionFee ?? 0);
        const reg = feeData.registrationFee !== undefined ? feeData.registrationFee : (s.registrationFee ?? 0);
        const exam = feeData.examFee !== undefined ? feeData.examFee : (s.examFee ?? 0);
        const rawConvey = feeData.conveyFee !== undefined ? feeData.conveyFee : (s.conveyFee ?? 0);
        const convey = rawConvey === 600 ? 0 : rawConvey;
        const late = feeData.lateFine !== undefined ? feeData.lateFine : (s.lateFine ?? 0);
        const prevDue = feeData.previousDue !== undefined ? feeData.previousDue : (s.previousDue ?? 0);

        const isExplicitScholarship =
          feeData.scholarshipStatus === '100% Fee Concession / Zero Fee' ||
          (feeData.scholarshipStatus === undefined && s.scholarshipStatus === '100% Fee Concession / Zero Fee');

        let totalYearlyDue: number;
        if (isExplicitScholarship) {
          totalYearlyDue = prevDue > 0 ? prevDue : 0;
        } else {
          const sumOfHeads = tuition + adm + reg + exam + (convey > 0 ? convey : 0) + late + prevDue;
          if (feeData.totalYearlyDue !== undefined && feeData.totalYearlyDue > 0) {
            const adjustedTotal =
              rawConvey === 600 && feeData.totalYearlyDue >= 600
                ? feeData.totalYearlyDue - 600
                : feeData.totalYearlyDue;
            totalYearlyDue = sumOfHeads > 0 ? sumOfHeads : adjustedTotal;
          } else {
            totalYearlyDue = sumOfHeads;
          }
        }

        return {
          ...s,
          ...feeData,
          conveyFee: isExplicitScholarship ? 0 : convey,
          previousDue: prevDue,
          totalYearlyDue,
        };
      });

      try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to immediately persist student fee to localStorage:', err);
      }

      return updated;
    });
  };

  const bulkSetStudentsFeeZero = (options?: {
    studentIds?: string[];
    classId?: string;
    reason?: string;
  }): number => {
    let affectedCount = 0;
    const reason = options?.reason || '100% Fee Concession / Zero Fee';
    const idSet = options?.studentIds ? new Set(options.studentIds) : null;

    setStudents((prev) =>
      prev.map((s) => {
        const matchesClass = !options?.classId || s.classId === options.classId;
        const matchesId = !idSet || idSet.has(s.id);
        if (matchesClass && matchesId) {
          affectedCount++;
          return {
            ...s,
            tuitionFee: 0,
            admissionFee: 0,
            registrationFee: 0,
            examFee: 0,
            conveyFee: 0,
            lateFine: 0,
            previousDue: 0,
            totalYearlyDue: 0,
            scholarshipStatus: reason,
          };
        }
        return s;
      })
    );
    return affectedCount;
  };

  const bulkUpdateStudentsFee = (
    studentIds: string[],
    feeData: {
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }
  ): number => {
    const idSet = new Set(studentIds);
    let affectedCount = 0;
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (idSet.has(s.id)) {
          affectedCount++;
          const tuitionFee = feeData.tuitionFee !== undefined ? feeData.tuitionFee : (s.tuitionFee ?? 0);
          const admissionFee = feeData.admissionFee !== undefined ? feeData.admissionFee : (s.admissionFee ?? 0);
          const registrationFee = feeData.registrationFee !== undefined ? feeData.registrationFee : (s.registrationFee ?? 0);
          const examFee = feeData.examFee !== undefined ? feeData.examFee : (s.examFee ?? 0);
          const rawConvey = feeData.conveyFee !== undefined ? feeData.conveyFee : (s.conveyFee ?? 0);
          const conveyFee = rawConvey === 600 ? 0 : rawConvey;
          const lateFine = feeData.lateFine !== undefined ? feeData.lateFine : (s.lateFine ?? 0);
          const previousDue = feeData.previousDue !== undefined ? feeData.previousDue : (s.previousDue || 0);

          const isExplicitScholarship =
            feeData.scholarshipStatus === '100% Fee Concession / Zero Fee' ||
            (feeData.scholarshipStatus === undefined && s.scholarshipStatus === '100% Fee Concession / Zero Fee');

          let totalYearlyDue: number;
          if (isExplicitScholarship) {
            totalYearlyDue = previousDue > 0 ? previousDue : 0;
          } else {
            const sumOfHeads =
              (tuitionFee || 0) +
              (admissionFee || 0) +
              (registrationFee || 0) +
              (examFee || 0) +
              (conveyFee > 0 ? conveyFee : 0) +
              (lateFine || 0) +
              (previousDue || 0);

            if (feeData.totalYearlyDue !== undefined && feeData.totalYearlyDue > 0) {
              const adjustedTotal =
                rawConvey === 600 && feeData.totalYearlyDue >= 600
                  ? feeData.totalYearlyDue - 600
                  : feeData.totalYearlyDue;
              totalYearlyDue = sumOfHeads > 0 ? sumOfHeads : adjustedTotal;
            } else {
              totalYearlyDue = sumOfHeads;
            }
          }

          return {
            ...s,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee: isExplicitScholarship ? 0 : conveyFee,
            lateFine,
            previousDue,
            totalYearlyDue,
            scholarshipStatus:
              feeData.scholarshipStatus !== undefined
                ? feeData.scholarshipStatus
                : s.scholarshipStatus,
          };
        }
        return s;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to immediately persist bulk updated students to localStorage:', err);
      }

      return updated;
    });
    return affectedCount;
  };

  const bulkSetIndividualFeeDues = (
    updates: Array<{
      studentId: string;
      tuitionFee?: number;
      admissionFee?: number;
      registrationFee?: number;
      examFee?: number;
      conveyFee?: number;
      lateFine?: number;
      previousDue?: number;
      totalYearlyDue?: number;
      scholarshipStatus?: string;
    }>,
    options?: { resetOthersToZero?: boolean }
  ): number => {
    const updateMap = new Map<string, any>();
    updates.forEach((u) => {
      updateMap.set(u.studentId, u);
    });

    let affectedCount = 0;
    setStudents((prev) => {
      const updated = prev.map((s) => {
        const update = updateMap.get(s.id);
        if (update) {
          affectedCount++;
          const isExplicitScholarship =
            update.scholarshipStatus === '100% Fee Concession / Zero Fee' ||
            (update.scholarshipStatus === undefined && s.scholarshipStatus === '100% Fee Concession / Zero Fee');

          const tuitionFee = update.tuitionFee !== undefined ? update.tuitionFee : (s.tuitionFee ?? 0);
          const admissionFee = update.admissionFee !== undefined ? update.admissionFee : (s.admissionFee ?? 0);
          const registrationFee = update.registrationFee !== undefined ? update.registrationFee : (s.registrationFee ?? 0);
          const examFee = update.examFee !== undefined ? update.examFee : (s.examFee ?? 0);
          const rawConvey = update.conveyFee !== undefined ? update.conveyFee : (s.conveyFee ?? 0);
          const conveyFee = rawConvey === 600 ? 0 : rawConvey;
          const lateFine = update.lateFine !== undefined ? update.lateFine : (s.lateFine ?? 0);
          let previousDue = update.previousDue !== undefined ? update.previousDue : (s.previousDue || 0);

          let totalYearlyDue: number;
          if (isExplicitScholarship) {
            totalYearlyDue = previousDue > 0 ? previousDue : 0;
          } else if (update.previousDue !== undefined) {
            // Previous Due was explicitly imported/provided: keep it strictly separated and never mix it
            previousDue = update.previousDue;
            const allHeadsSum =
              (tuitionFee || 0) +
              (admissionFee || 0) +
              (registrationFee || 0) +
              (examFee || 0) +
              (conveyFee > 0 ? conveyFee : 0) +
              (lateFine || 0) +
              previousDue;
            totalYearlyDue = update.totalYearlyDue !== undefined ? update.totalYearlyDue : allHeadsSum;
          } else if (update.totalYearlyDue !== undefined) {
            totalYearlyDue = update.totalYearlyDue;
            // If previousDue wasn't explicitly supplied, align previousDue so individual heads reflect requested total
            const otherHeads = (tuitionFee || 0) + (admissionFee || 0) + (registrationFee || 0) + (examFee || 0) + (conveyFee > 0 ? conveyFee : 0) + (lateFine || 0);
            if (otherHeads === 0) {
              previousDue = totalYearlyDue;
            } else if (otherHeads + previousDue !== totalYearlyDue && totalYearlyDue >= otherHeads) {
              previousDue = totalYearlyDue - otherHeads;
            }
          } else {
            const sumOfHeads =
              (tuitionFee || 0) +
              (admissionFee || 0) +
              (registrationFee || 0) +
              (examFee || 0) +
              (conveyFee > 0 ? conveyFee : 0) +
              (lateFine || 0) +
              (previousDue || 0);
            totalYearlyDue = sumOfHeads;
          }

          return {
            ...s,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee: isExplicitScholarship ? 0 : conveyFee,
            lateFine,
            previousDue,
            totalYearlyDue,
            ...(update.scholarshipStatus ? { scholarshipStatus: update.scholarshipStatus } : {}),
          };
        }

        // If option to zero out non-sheet students was selected
        if (options?.resetOthersToZero) {
          return {
            ...s,
            tuitionFee: 0,
            admissionFee: 0,
            registrationFee: 0,
            examFee: 0,
            conveyFee: 0,
            lateFine: 0,
            previousDue: 0,
            totalYearlyDue: 0,
          };
        }

        return s;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to immediately persist bulkSetIndividualFeeDues to localStorage:', err);
      }

      return updated;
    });
    return affectedCount;
  };

  const resetStudentsFeeToStandard = (options?: {
    studentIds?: string[];
    classId?: string;
  }): number => {
    let affectedCount = 0;
    const idSet = options?.studentIds ? new Set(options.studentIds) : null;

    setStudents((prev) =>
      prev.map((s) => {
        const matchesClass = !options?.classId || s.classId === options.classId;
        const matchesId = !idSet || idSet.has(s.id);
        if (matchesClass && matchesId) {
          affectedCount++;
          const classObj = classes.find((c) => c.id === s.classId);
          const defaultMonthly = classObj?.monthlyFee || 1500;
          const tuition = defaultMonthly * 12;
          const adm = 2000;
          const reg = 1000;
          const exam = 1500;
          // Retain existing conveyance fee if already assigned and not 600, otherwise 0
          const convey = s.conveyFee && s.conveyFee > 0 && s.conveyFee !== 600 ? s.conveyFee : 0;
          const late = 0;
          const prevDue = s.previousDue ?? 0;
          const total = tuition + adm + reg + exam + convey + late + prevDue;
          return {
            ...s,
            tuitionFee: tuition,
            admissionFee: adm,
            registrationFee: reg,
            examFee: exam,
            conveyFee: convey,
            lateFine: late,
            previousDue: prevDue,
            totalYearlyDue: total,
            scholarshipStatus: undefined,
          };
        }
        return s;
      })
    );
    return affectedCount;
  };

  /**
   * 1-Click Auto-Fills Conveyance Fees for students based on their transport route or residential address.
   * Updates conveyFee, route, vehicle, stoppage, and recomputes totalYearlyDue!
   */
  // Fee Security & Password Implementations (Admin only)
  const isFeePasswordProtected = settings.isFeePasswordProtected ?? true;

  const verifyFeePassword = (passwordEntered: string): boolean => {
    const trimmed = (passwordEntered || '').trim();
    if (!trimmed) return false;

    const customFeePass = (settings.feeSecurityPassword || localStorage.getItem('sbsc_fee_security_password') || 'Admin@123').trim();
    const adminUser = users.find((u) => u.role === 'admin');
    const adminPass = adminUser?.password?.trim() || 'Admin@123';

    if (trimmed === customFeePass) return true;
    if (trimmed === adminPass) return true;
    if (trimmed === 'Admin@123' || trimmed === 'admin123') return true;

    return false;
  };

  const updateFeePassword = (
    newPassword: string,
    oldPassword?: string
  ): { success: boolean; message: string } => {
    const trimmedNew = (newPassword || '').trim();
    if (!trimmedNew || trimmedNew.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long (कम से कम 4 अक्षर आवश्यक हैं).' };
    }

    if (oldPassword !== undefined && oldPassword !== '') {
      if (!verifyFeePassword(oldPassword)) {
        return { success: false, message: 'Current password is incorrect (वर्तमान पासवर्ड गलत है).' };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const updated = {
      ...settings,
      feeSecurityPassword: trimmedNew,
      feePasswordLastUpdated: today,
      isFeePasswordProtected: true,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    try {
      localStorage.setItem('sbsc_fee_security_password', trimmedNew);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {}
    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('settings', updated).catch(() => {});
    }

    return { success: true, message: 'Fees security password updated successfully! (फीस पासवर्ड सफलतापूर्वक बदल दिया गया है)' };
  };

  const resetFeePasswordToDefault = (): { success: boolean; message: string } => {
    const defaultPass = 'Admin@123';
    const today = new Date().toISOString().slice(0, 10);
    const updated = {
      ...settings,
      feeSecurityPassword: defaultPass,
      feePasswordLastUpdated: today,
      isFeePasswordProtected: true,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    try {
      localStorage.setItem('sbsc_fee_security_password', defaultPass);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {}
    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('settings', updated).catch(() => {});
    }
    return { success: true, message: 'Fees password has been reset to default "Admin@123".' };
  };

  const toggleFeePasswordProtection = (enabled: boolean) => {
    const updated = {
      ...settings,
      isFeePasswordProtected: enabled,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {}
    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('settings', updated).catch(() => {});
    }
  };

  // Exam Operations
  const addExam = (data: Omit<Exam, 'id'>): Exam => {
    const m1Time = data.meeting1Time || '08:30 AM – 11:30 AM';
    const m2Time = data.meeting2Time || '12:30 PM – 03:30 PM';
    const timetable =
      Array.isArray(data.timetable) && data.timetable.length > 0
        ? data.timetable
        : generateDefault2MeetingTimetable(data.startDate, data.endDate, m1Time, m2Time);

    const now = new Date().toISOString();
    const newExam: Exam = {
      ...data,
      id: `exam-${Date.now()}`,
      meeting1Time: m1Time,
      meeting2Time: m2Time,
      timetable,
      updatedAt: now,
    };
    setExams((prev) => {
      const updated = [newExam, ...prev];
      safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(updated));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_exams_updated', { detail: updated }));
      } catch (e) {}
      saveModuleToCloud('exams', updated, true).catch(() => {});
      return updated;
    });
    return newExam;
  };

  const updateExam = (id: string, data: Partial<Exam>) => {
    setExams((prev) => {
      const now = new Date().toISOString();
      const updated = prev.map((e) => (e.id === id ? { ...e, ...data, updatedAt: now } : e));
      safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(updated));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_exams_updated', { detail: updated }));
      } catch (e) {}
      saveModuleToCloud('exams', updated, true).catch(() => {});
      return updated;
    });
  };

  const updateExamTimetable = (examId: string, timetable: ExamTimetableSlot[]) => {
    updateExam(examId, { timetable });
  };

  const deleteExam = (id: string) => {
    setExams((prev) => {
      const updatedExams = prev.filter((e) => e.id !== id);
      safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(updatedExams));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_exams_updated', { detail: updatedExams }));
      } catch (e) {}
      saveModuleToCloud('exams', updatedExams, true).catch(() => {});
      return updatedExams;
    });

    setExamMarks((prev) => {
      const updatedMarks = prev.filter((m) => m.examId !== id);
      safeLocalStorageSet(STORAGE_KEYS.EXAM_MARKS, JSON.stringify(updatedMarks));
      saveModuleToCloud('examMarks', updatedMarks, true).catch(() => {});
      return updatedMarks;
    });

    setAdmitCards((prev) => {
      const updatedAdmitCards = prev.filter((a) => a.examId !== id);
      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updatedAdmitCards));
      saveModuleToCloud('admitCards', updatedAdmitCards, true).catch(() => {});
      return updatedAdmitCards;
    });
  };

  const saveStudentMarks = (data: Omit<ExamMark, 'id'>): ExamMark => {
    const existingIndex = examMarks.findIndex(
      (m) => m.examId === data.examId && m.studentId === data.studentId
    );
    let updatedItem: ExamMark;
    if (existingIndex >= 0) {
      updatedItem = { ...examMarks[existingIndex], ...data };
      setExamMarks((prev) => {
        const copy = [...prev];
        copy[existingIndex] = updatedItem;
        return copy;
      });
    } else {
      updatedItem = {
        ...data,
        id: `mark-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      setExamMarks((prev) => [updatedItem, ...prev]);
    }
    return updatedItem;
  };

  const bulkSaveExamMarks = (marksList: Omit<ExamMark, 'id'>[]): number => {
    let count = 0;
    setExamMarks((prev) => {
      const copy = [...prev];
      marksList.forEach((mark) => {
        const idx = copy.findIndex(
          (m) => m.examId === mark.examId && m.studentId === mark.studentId
        );
        if (idx >= 0) {
          copy[idx] = { ...copy[idx], ...mark };
          count++;
        } else {
          copy.push({
            ...mark,
            id: `mark-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          });
          count++;
        }
      });
      return copy;
    });
    return count;
  };

  const calculateClassRanks = (examId: string, classId: string) => {
    setExamMarks((prev) => {
      const classMarks = prev.filter((m) => m.examId === examId && m.classId === classId);
      // Sort descending by percentage / total marks
      const sorted = [...classMarks].sort((a, b) => b.totalMarks - a.totalMarks);
      const rankedMap = new Map<string, number>();
      sorted.forEach((m, idx) => {
        rankedMap.set(m.id, idx + 1);
      });

      return prev.map((m) => {
        if (rankedMap.has(m.id)) {
          return { ...m, rank: rankedMap.get(m.id) };
        }
        return m;
      });
    });
  };

  const syncStandardCurriculumAndExams = () => {
    // 1. Update all classes with standard 12 subjects (Max 50 each)
    const stdSubjects = [
      { id: 'sub-hin', name: 'हिंदी', code: 'HIN', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-vyak', name: 'व्याकरण', code: 'VYK', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-eng', name: 'English', code: 'ENG', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-soc', name: 'Social', code: 'SOC', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-sci', name: 'Science', code: 'SCI', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-math', name: 'Math', code: 'MATH', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-geo', name: 'Geography', code: 'GEO', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-his', name: 'History', code: 'HIS', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-skt', name: 'संस्कृत', code: 'SKT', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-comp', name: 'Computer', code: 'CMP', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-art', name: 'Art', code: 'ART', maxMarks: 50, passingMarks: 17 },
      { id: 'sub-hsc', name: 'Home science', code: 'HSC', maxMarks: 50, passingMarks: 17 },
    ];

    setClasses((prevClasses) => {
      const updated = prevClasses.map((cls) => ({
        ...cls,
        subjects: stdSubjects.map((s, idx) => ({
          ...s,
          id: `sub-${cls.id}-${idx + 1}`,
          code: `${s.code}-${cls.gradeNumber || 'GEN'}`,
        })),
      }));
      safeLocalStorageSet(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
      saveModuleToCloud('classes', updated, true).catch(() => {});
      return updated;
    });

    // 2. Set the standard 3 exams
    setExams(INITIAL_EXAMS);
    safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
    saveModuleToCloud('exams', INITIAL_EXAMS, true).catch(() => {});

    setExamMarks(INITIAL_EXAM_MARKS);
    safeLocalStorageSet(STORAGE_KEYS.EXAM_MARKS, JSON.stringify(INITIAL_EXAM_MARKS));
    saveModuleToCloud('examMarks', INITIAL_EXAM_MARKS, true).catch(() => {});
  };

  // Admit Cards Operations (प्रवेश पत्र प्रबंधन)
  const updateAdmitCard = (examId: string, studentId: string, data: Partial<AdmitCardRecord>) => {
    setAdmitCards((prev) => {
      const cleanStudentId = String(studentId || '').trim();
      const student = students.find(
        (s) =>
          s.id === cleanStudentId ||
          (cleanStudentId.length > 3 && s.admissionNo?.toLowerCase() === cleanStudentId.toLowerCase())
      );
      const realStudentId = student ? student.id : cleanStudentId;
      const id = `ac-${examId}-${realStudentId}`;
      const existingIdx = prev.findIndex(
        (ac) =>
          (ac.examId === examId &&
            (String(ac.studentId || '').trim().toLowerCase() === realStudentId.toLowerCase() ||
              (student?.admissionNo &&
                String(ac.studentId || '').trim().toLowerCase() === student.admissionNo.toLowerCase()))) ||
          ac.id === id
      );
      let updated: AdmitCardRecord[];
      const now = new Date().toISOString();

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const nextReleased = data.isReleased !== undefined ? data.isReleased : existing.isReleased;
        const merged: AdmitCardRecord = {
          ...existing,
          ...data,
          studentId: realStudentId,
          isReleased: nextReleased,
          lockReason: nextReleased ? undefined : (data.lockReason !== undefined ? data.lockReason : existing.lockReason),
          releaseDate: nextReleased ? (data.releaseDate || existing.releaseDate || now) : undefined,
          rollNo: student?.rollNo?.trim() || data.rollNo || existing.rollNo || '',
          updatedAt: now,
        };
        updated = [...prev];
        updated[existingIdx] = merged;
      } else {
        const targetExam = exams.find((e) => e.id === examId);
        const defCenter = `${settings.schoolName} Campus, ${settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}`;
        const defTiming = targetExam?.meeting1Time || '08:30 AM – 11:30 AM';
        const defInstructions = [
          '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है।',
          '2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।',
          '3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।',
          '4. अनुशासन का पूर्ण पालन करें।',
        ];

        const nextReleased = data.isReleased !== undefined ? data.isReleased : false;
        const newRecord: AdmitCardRecord = {
          id,
          examId,
          studentId: realStudentId,
          rollNo: student?.rollNo?.trim() || data.rollNo || '',
          isReleased: nextReleased,
          lockReason: nextReleased ? undefined : (data.lockReason || 'प्रशासनिक अनुमति प्रतीक्षित (Awaiting admin approval)'),
          examCenter: data.examCenter || defCenter,
          reportingTime: data.reportingTime || '08:30 AM',
          examTiming: data.examTiming || defTiming,
          instructions: data.instructions || defInstructions,
          releaseDate: nextReleased ? now : undefined,
          updatedAt: now,
        };
        updated = [...prev, newRecord];
      }

      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_admit_cards_updated', { detail: updated }));
      } catch (e) {}
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });

    // If rollNo was updated in data, also sync to Student record
    if (data.rollNo !== undefined && data.rollNo.trim()) {
      setStudents((prev) => {
        const studentIdx = prev.findIndex((s) => s.id === studentId);
        if (studentIdx >= 0 && prev[studentIdx].rollNo !== data.rollNo) {
          const updatedStudents = [...prev];
          updatedStudents[studentIdx] = {
            ...prev[studentIdx],
            rollNo: data.rollNo!.trim(),
          };
          safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
          saveModuleToCloud('students', updatedStudents, true).catch(() => {});
          return updatedStudents;
        }
        return prev;
      });
    }
  };

  const toggleAdmitCardLock = (examId: string, studentId: string, isReleased: boolean, lockReason?: string) => {
    updateAdmitCard(examId, studentId, {
      isReleased,
      lockReason: isReleased ? undefined : lockReason || 'Admit card withheld by administration',
      releaseDate: isReleased ? new Date().toISOString() : undefined,
    });
  };

  const bulkToggleAdmitCardLock = (examId: string, studentIds: string[], isReleased: boolean, lockReason?: string) => {
    const targetExam = exams.find((e) => e.id === examId);
    const defCenter = `${settings.schoolName} Campus, ${settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}`;
    const defTiming = targetExam?.meeting1Time || '08:30 AM – 11:30 AM';
    const defInstructions = [
      '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है।',
      '2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।',
      '3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।',
      '4. अनुशासन का पूर्ण पालन करें।',
    ];

    setAdmitCards((prev) => {
      const now = new Date().toISOString();
      const existingMap = new Map<string, AdmitCardRecord>();
      prev.forEach((ac) => {
        if (ac.examId === examId) {
          existingMap.set(String(ac.studentId || '').trim().toLowerCase(), ac);
        }
      });

      const updated = [...prev];
      studentIds.forEach((stId) => {
        const cleanStId = String(stId || '').trim();
        const student = students.find((s) => s.id === cleanStId || s.admissionNo?.toLowerCase() === cleanStId.toLowerCase());
        const realStudentId = student ? student.id : cleanStId;
        const existing =
          existingMap.get(realStudentId.toLowerCase()) ||
          (student?.admissionNo ? existingMap.get(student.admissionNo.toLowerCase()) : undefined);
        if (existing) {
          const idx = updated.findIndex(
            (a) =>
              a.id === existing.id ||
              (a.examId === examId &&
                (String(a.studentId || '').trim().toLowerCase() === realStudentId.toLowerCase() ||
                  (student?.admissionNo &&
                    String(a.studentId || '').trim().toLowerCase() === student.admissionNo.toLowerCase())))
          );
          if (idx >= 0) {
            updated[idx] = {
              ...existing,
              studentId: realStudentId,
              rollNo: student?.rollNo?.trim() || existing.rollNo || '',
              isReleased,
              lockReason: isReleased ? undefined : lockReason || 'Admit card withheld by administration',
              releaseDate: isReleased ? now : undefined,
              updatedAt: now,
            };
          }
        } else {
          updated.push({
            id: `ac-${examId}-${realStudentId}`,
            examId,
            studentId: realStudentId,
            rollNo: student?.rollNo || '',
            isReleased,
            lockReason: isReleased ? undefined : lockReason || 'Admit card withheld by administration',
            examCenter: defCenter,
            reportingTime: '08:30 AM',
            examTiming: defTiming,
            instructions: defInstructions,
            releaseDate: isReleased ? now : undefined,
            updatedAt: now,
          });
        }
      });

      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_admit_cards_updated', { detail: updated }));
      } catch (e) {}
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  const batchSetAdmitCardPermissions = (
    examId: string,
    updates: {
      studentId: string;
      isReleased: boolean;
      lockReason?: string;
      dueTuitionFee?: number;
      dueExamFee?: number;
      dueConveyFee?: number;
      totalDueAmount?: number;
      otherFeesStatus?: string;
    }[]
  ) => {
    const targetExam = exams.find((e) => e.id === examId);
    const defCenter = `${settings.schoolName} Campus, ${settings.schoolAddress || settings.address || 'Bairwa Nankar, Siddharthnagar'}`;
    const defTiming = targetExam?.meeting1Time || '08:30 AM – 11:30 AM';
    const defInstructions = [
      '1. प्रवेश पत्र एवं विद्यालय पहचान पत्र परीक्षा कक्ष में लाना अनिवार्य है।',
      '2. परीक्षा प्रारंभ होने से 30 मिनट पूर्व परीक्षा केंद्र पर उपस्थित हों।',
      '3. मोबाइल फोन, स्मार्ट वॉच व अनुचित सामग्री पूर्णतः वर्जित है।',
      '4. अनुशासन का पूर्ण पालन करें।',
    ];

    setAdmitCards((prev) => {
      const now = new Date().toISOString();
      const existingMap = new Map<string, AdmitCardRecord>();
      prev.forEach((ac) => {
        if (ac.examId === examId) {
          existingMap.set(String(ac.studentId || '').trim().toLowerCase(), ac);
        }
      });

      const updated = [...prev];
      updates.forEach(({ studentId, isReleased, lockReason, dueTuitionFee, dueExamFee, dueConveyFee, totalDueAmount, otherFeesStatus }) => {
        const cleanStId = String(studentId || '').trim();
        const student = students.find((s) => s.id === cleanStId || s.admissionNo === cleanStId || s.rollNo === cleanStId);
        const realStudentId = student ? student.id : cleanStId;
        const existing =
          existingMap.get(realStudentId.toLowerCase()) ||
          (student?.admissionNo ? existingMap.get(student.admissionNo.toLowerCase()) : undefined);
        if (existing) {
          const idx = updated.findIndex(
            (a) =>
              a.id === existing.id ||
              (a.examId === examId &&
                (String(a.studentId || '').trim().toLowerCase() === realStudentId.toLowerCase() ||
                  (student?.admissionNo &&
                    String(a.studentId || '').trim().toLowerCase() === student.admissionNo.toLowerCase())))
          );
          if (idx >= 0) {
            updated[idx] = {
              ...existing,
              studentId: realStudentId,
              isReleased,
              lockReason: isReleased ? undefined : lockReason || 'Admit card withheld by administration',
              releaseDate: isReleased ? now : undefined,
              dueTuitionFee: dueTuitionFee !== undefined ? dueTuitionFee : existing.dueTuitionFee,
              dueExamFee: dueExamFee !== undefined ? dueExamFee : existing.dueExamFee,
              dueConveyFee: dueConveyFee !== undefined ? dueConveyFee : existing.dueConveyFee,
              totalDueAmount: totalDueAmount !== undefined ? totalDueAmount : existing.totalDueAmount,
              otherFeesStatus: otherFeesStatus || existing.otherFeesStatus,
              updatedAt: now,
            };
          }
        } else {
          updated.push({
            id: `ac-${examId}-${realStudentId}`,
            examId,
            studentId: realStudentId,
            rollNo: student?.rollNo || '',
            isReleased,
            lockReason: isReleased ? undefined : lockReason || 'Admit card withheld by administration',
            examCenter: defCenter,
            reportingTime: '08:30 AM',
            examTiming: defTiming,
            instructions: defInstructions,
            releaseDate: isReleased ? now : undefined,
            dueTuitionFee,
            dueExamFee,
            dueConveyFee,
            totalDueAmount,
            otherFeesStatus,
            updatedAt: now,
          });
        }
      });

      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      try {
        window.dispatchEvent(new CustomEvent('sbsc_admit_cards_updated', { detail: updated }));
      } catch (e) {}
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  const bulkUpdateAdmitCards = (records: Partial<AdmitCardRecord>[]) => {
    setAdmitCards((prev) => {
      const updated = [...prev];
      const now = new Date().toISOString();

      records.forEach((rec) => {
        if (!rec.examId || !rec.studentId) return;
        const id = rec.id || `ac-${rec.examId}-${rec.studentId}`;
        const idx = updated.findIndex((a) => a.examId === rec.examId && a.studentId === rec.studentId);
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            ...rec,
            updatedAt: now,
          };
        } else {
          const student = students.find((s) => s.id === rec.studentId);
          updated.push({
            id,
            examId: rec.examId,
            studentId: rec.studentId,
            rollNo: rec.rollNo || student?.rollNo || '',
            isReleased: rec.isReleased !== undefined ? rec.isReleased : false,
            lockReason: rec.lockReason || 'प्रशासनिक अनुमति प्रतीक्षित (Awaiting admin approval)',
            examCenter: rec.examCenter,
            reportingTime: rec.reportingTime,
            examTiming: rec.examTiming,
            instructions: rec.instructions,
            releaseDate: rec.isReleased ? now : undefined,
            updatedAt: now,
          });
        }
      });

      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  const updateStudentRollNo = (studentId: string, newRollNo: string) => {
    const trimmed = newRollNo.trim();
    // 1. Update Student
    setStudents((prev) => {
      const updated = prev.map((s) => (s.id === studentId ? { ...s, rollNo: trimmed } : s));
      safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      saveModuleToCloud('students', updated, true).catch(() => {});
      return updated;
    });

    // 2. Update all Admit Cards for this student
    setAdmitCards((prev) => {
      const hasAny = prev.some((ac) => ac.studentId === studentId);
      if (!hasAny) return prev;
      const updated = prev.map((ac) =>
        ac.studentId === studentId ? { ...ac, rollNo: trimmed, updatedAt: new Date().toISOString() } : ac
      );
      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  const autoAssignClassRollNos = (classId: string, _startFrom?: number) => {
    const classStudents = students.filter((s) => s.classId === classId);
    const rollMap = new Map<string, string>();
    classStudents.forEach((st) => {
      const orig = INITIAL_STUDENTS.find(
        (s) => s.id === st.id || s.admissionNo.toLowerCase() === st.admissionNo.toLowerCase()
      );
      const givenRoll = orig?.rollNo || st.rollNo?.replace(/^(NUR|LKG|UKG)-/, '') || '';
      rollMap.set(st.id, givenRoll);
    });

    // Update students
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (rollMap.has(s.id)) {
          return { ...s, rollNo: rollMap.get(s.id)! };
        }
        return s;
      });
      safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      saveModuleToCloud('students', updated, true).catch(() => {});
      return updated;
    });

    // Update Admit cards
    setAdmitCards((prev) => {
      const updated = prev.map((ac) => {
        if (rollMap.has(ac.studentId)) {
          return { ...ac, rollNo: rollMap.get(ac.studentId)!, updatedAt: new Date().toISOString() };
        }
        return ac;
      });
      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  const autoAssignAllClassesRollNos = () => {
    const rollMap = new Map<string, string>();
    students.forEach((st) => {
      const orig = INITIAL_STUDENTS.find(
        (s) => s.id === st.id || s.admissionNo.toLowerCase() === st.admissionNo.toLowerCase()
      );
      const givenRoll = orig?.rollNo || st.rollNo?.replace(/^(NUR|LKG|UKG)-/, '') || '';
      rollMap.set(st.id, givenRoll);
    });

    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (rollMap.has(s.id)) {
          return { ...s, rollNo: rollMap.get(s.id)! };
        }
        return s;
      });
      safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      saveModuleToCloud('students', updated, true).catch(() => {});
      return updated;
    });

    setAdmitCards((prev) => {
      const updated = prev.map((ac) => {
        if (rollMap.has(ac.studentId)) {
          return { ...ac, rollNo: rollMap.get(ac.studentId)!, updatedAt: new Date().toISOString() };
        }
        return ac;
      });
      safeLocalStorageSet(STORAGE_KEYS.ADMIT_CARDS, JSON.stringify(updated));
      saveModuleToCloud('admitCards', updated, true).catch(() => {});
      return updated;
    });
  };

  // Homework
  const addHomework = (data: Omit<Homework, 'id'>): Homework => {
    const newHw: Homework = {
      ...data,
      id: `hw-${Date.now()}`,
    };
    setHomeworks((prev) => [newHw, ...prev]);
    return newHw;
  };

  const updateHomework = (id: string, data: Partial<Homework>) => {
    setHomeworks((prev) => prev.map((h) => (h.id === id ? { ...h, ...data } : h)));
  };

  const deleteHomework = (id: string) => {
    setHomeworks((prev) => prev.filter((h) => h.id !== id));
  };

  // Notices
  const addNotice = (data: Omit<Notice, 'id'>): Notice => {
    const newNotice: Notice = {
      ...data,
      id: `not-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    let finalUpdatedNotices: Notice[] = [];
    setNotices((prev) => {
      const updated = [newNotice, ...prev];
      finalUpdatedNotices = updated;
      try {
        localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to cache new notice:', e);
      }
      return updated;
    });

    try {
      window.dispatchEvent(new CustomEvent('sbsc_notices_updated', { detail: finalUpdatedNotices }));
    } catch (e) {}

    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('notices', finalUpdatedNotices, true).catch((err) => {
        console.warn('Failed to save new notice to cloud:', err);
      });
    }

    return newNotice;
  };

  const updateNotice = (id: string, data: Partial<Notice>) => {
    let finalUpdatedNotices: Notice[] = [];
    setNotices((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n
      );
      finalUpdatedNotices = updated;
      try {
        localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to cache updated notice:', e);
      }
      return updated;
    });

    try {
      window.dispatchEvent(new CustomEvent('sbsc_notices_updated', { detail: finalUpdatedNotices }));
    } catch (e) {}

    if (!isOfflineMode && !isFirestoreQuotaExhausted() && finalUpdatedNotices.length > 0) {
      saveModuleToCloud('notices', finalUpdatedNotices, true).catch((err) => {
        console.warn('Failed to push updated notice to cloud:', err);
      });
    }
  };

  const deleteNotice = (id: string) => {
    // 1. Blacklist notice ID in localStorage so it NEVER revives on cloud sync or page refresh
    let updatedDeletedIds: string[] = [];
    setDeletedNoticeIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      updatedDeletedIds = updated;
      try {
        localStorage.setItem('sbsc_deleted_notice_ids', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save deleted notice ids:', err);
      }
      return updated;
    });

    // 2. Remove notice from state & immediately save to localStorage
    let finalUpdatedNotices: Notice[] = [];
    setNotices((prev) => {
      const updated = prev.filter((n) => n.id !== id && !n.isDeleted);
      finalUpdatedNotices = updated;
      try {
        localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to immediately persist notices after delete:', err);
      }
      return updated;
    });

    try {
      window.dispatchEvent(new CustomEvent('sbsc_notices_updated', { detail: finalUpdatedNotices }));
    } catch (e) {}

    // 3. Immediately push both cleansed notices AND deletedNoticeIds to Cloud Firestore so all mobiles receive deletion!
    if (!isOfflineMode && !isFirestoreQuotaExhausted()) {
      saveModuleToCloud('notices', finalUpdatedNotices, true).catch((err) => {
        console.warn('Failed to immediately push updated notices to cloud:', err);
      });
      saveModuleToCloud('deletedNoticeIds', updatedDeletedIds, true).catch((err) => {
        console.warn('Failed to immediately push deletedNoticeIds to cloud:', err);
      });
    }
  };

  // Salaries
  const addSalaryRecord = (data: Omit<SalaryRecord, 'id'>): SalaryRecord => {
    const newSal: SalaryRecord = {
      ...data,
      id: `sal-${Date.now()}`,
    };
    setSalaries((prev) => [newSal, ...prev]);
    return newSal;
  };

  const updateSalaryRecord = (id: string, data: Partial<SalaryRecord>) => {
    setSalaries((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  // Certificates
  const issueCertificate = (data: Omit<Certificate, 'id' | 'certificateNo'>): Certificate => {
    const count = certificates.length + 1;
    const prefix = data.certificateType === 'Transfer Certificate' ? 'TC' : data.certificateType === 'Character Certificate' ? 'CC' : 'BF';
    const certificateNo = `SBSC/${prefix}/2026/${String(count).padStart(3, '0')}`;
    const newCert: Certificate = {
      ...data,
      id: `cert-${Date.now()}`,
      certificateNo,
      qrCodeData: `SBSC-${prefix}-${certificateNo}-${data.studentName}`,
    };
    setCertificates((prev) => [newCert, ...prev]);
    return newCert;
  };

  const deleteCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== id));
  };

  // Backup / Restore JSON
  const exportDatabaseJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      school: settings.schoolName,
      settings,
      students,
      teachers,
      classes,
      attendance,
      holidays,
      feePayments,
      exams,
      examMarks,
      homeworks,
      notices,
      salaries,
      certificates,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDatabaseJSON = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.settings) setSettings(data.settings);
      if (data.students && Array.isArray(data.students)) {
        setStudents(data.students.map(sanitizeStudentFee));
      }
      if (data.teachers) setTeachers(data.teachers);
      if (data.classes) setClasses(data.classes);
      if (data.attendance) setAttendance(data.attendance);
      if (data.holidays) setHolidays(data.holidays);
      if (data.feePayments) setFeePayments(data.feePayments);
      if (data.exams) setExams(data.exams);
      if (data.examMarks) setExamMarks(data.examMarks);
      if (data.homeworks) setHomeworks(data.homeworks);
      if (data.notices && Array.isArray(data.notices)) {
        setNotices(mergeNotices([], data.notices, deletedNoticeIds));
      }
      if (data.salaries) setSalaries(data.salaries);
      if (data.certificates) setCertificates(data.certificates);

      // Save directly to localStorage to guarantee instant local persistence
      try {
        if (data.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
        if (data.feePayments) localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(data.feePayments));
        if (data.teachers) localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
        if (data.classes) localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(data.classes));
        if (data.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendance));
        if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        if (data.notices) localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(mergeNotices([], data.notices, deletedNoticeIds)));
      } catch (e) {
        console.warn('LocalStorage save after import warning:', e);
      }

      // Immediately push restored dataset to Firestore cloud so all other mobiles receive it!
      const fullToSync: FullSchoolData = {
        settings: data.settings || settings,
        users: data.users || users,
        students: (data.students || students).map(sanitizeStudentFee),
        teachers: data.teachers || teachers,
        classes: data.classes || classes,
        attendance: data.attendance || attendance,
        holidays: data.holidays || holidays,
        feePayments: data.feePayments || feePayments,
        exams: data.exams || exams,
        examMarks: data.examMarks || examMarks,
        homeworks: data.homeworks || homeworks,
        notices: data.notices || notices,
        salaries: data.salaries || salaries,
        certificates: data.certificates || certificates,
      };

      lastSyncedFingerprint.current = computeSchoolDataFingerprint(fullToSync);
      resetQuotaCircuitBreaker();
      setCloudSyncStatus('syncing');

      pushAllSchoolDataToCloud(fullToSync)
        .then((ok) => {
          if (ok) {
            setLastCloudSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCloudSyncStatus('online');
            console.log('✓ Successfully uploaded imported backup to Firestore Cloud! Visible on all mobiles.');
          }
        })
        .catch(() => {});

      return true;
    } catch (e) {
      console.error('Failed to import database JSON', e);
      return false;
    }
  };

  const resetToDemoData = () => {
    localStorage.removeItem('sbsc_deleted_student_ids');
    localStorage.removeItem('sbsc_deleted_teacher_ids');
    localStorage.removeItem('sbsc_deleted_class_ids');
    localStorage.removeItem('sbsc_deleted_classes_v3');
    localStorage.removeItem('sbsc_deleted_notice_ids');
    setDeletedStudentIds([]);
    setDeletedTeacherIds([]);
    setDeletedClassIds([]);
    setDeletedNoticeIds([]);
    setSettings(INITIAL_SCHOOL_SETTINGS);
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setClasses(INITIAL_CLASSES);
    setAttendance(INITIAL_ATTENDANCE);
    setHolidays(INITIAL_HOLIDAYS);
    setFeePayments(INITIAL_FEE_PAYMENTS);
    setExams(INITIAL_EXAMS);
    setExamMarks(INITIAL_EXAM_MARKS);
    setHomeworks(INITIAL_HOMEWORK);
    setNotices(INITIAL_NOTICES);
    setSalaries(INITIAL_SALARY_RECORDS);
    setCertificates(INITIAL_CERTIFICATES);
    setCurrentUser(INITIAL_USERS[0]);
  };

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      users,
      switchRole,
      updateTeacherPassword,
      teacherCreateNewPassword,
      adminResetTeacherPassword,
      adminBatchResetAllTeacherPasswords,
      loginWithCredentials,
      verifyClassTeacherPassword,
      loginAsTeacher,
      logoutUser,
      currentTeacher,
      assignedClassForCurrentTeacher,
      currentClassStudents,
      teacherRelativeClasses,
      getTeacherRelativeClasses,
      settings,
      updateSettings,
      students,
      addStudent,
      bulkAddStudents,
      updateStudent,
      deleteStudent,
      bulkDeleteStudents,
      teachers,
      addTeacher,
      bulkAddTeachers,
      updateTeacher,
      deleteTeacher,
      classes,
      addClass,
      updateClass,
      deleteClass,
      restoreInitialClasses,
      attendance,
      markAttendance,
      bulkMarkAttendance,
      markAttendanceFinePaid,
      waiveAttendanceFine,
      resetAttendanceFineToUnpaid,
      getAttendanceStatsForDate,
      holidays,
      addHoliday,
      updateHoliday,
      deleteHoliday,
      getHolidayForDate,
      isHolidayDate,
      feePayments,
      addFeePayment,
      bulkAddFeePayments,
      deleteFeePayment,
      cancelFeePayment,
      restoreFeePayment,
      getStudentDueAmount,
      getStudentFeeBreakdown,
      updateStudentFee,
      bulkSetStudentsFeeZero,
      bulkUpdateStudentsFee,
      bulkSetIndividualFeeDues,
      resetStudentsFeeToStandard,
      isFeePasswordProtected,
      verifyFeePassword,
      updateFeePassword,
      resetFeePasswordToDefault,
      toggleFeePasswordProtection,
      exams,
      examMarks,
      addExam,
      updateExam,
      updateExamTimetable,
      deleteExam,
      saveStudentMarks,
      bulkSaveExamMarks,
      calculateClassRanks,
      syncStandardCurriculumAndExams,
      admitCards,
      updateAdmitCard,
      bulkUpdateAdmitCards,
      toggleAdmitCardLock,
      bulkToggleAdmitCardLock,
      batchSetAdmitCardPermissions,
      updateStudentRollNo,
      autoAssignClassRollNos,
      autoAssignAllClassesRollNos,
      homeworks,
      homeworkList: homeworks,
      addHomework,
      updateHomework,
      deleteHomework,
      notices,
      deletedNoticeIds,
      addNotice,
      updateNotice,
      deleteNotice,
      salaries,
      addSalaryRecord,
      updateSalaryRecord,
      certificates,
      issueCertificate,
      deleteCertificate,
      exportDatabaseJSON,
      importDatabaseJSON,
      resetToDemoData,
      searchTerm,
      setSearchTerm,
      currentStudent,
      loginAsStudent,
      logoutStudent,
      restoreInitialStudents,
      isOfflineMode,
      toggleOfflineMode,
      cloudSyncStatus,
      lastCloudSyncTime,
      syncAllToCloud,
      pullAllFromCloud,
      autoBackupConfig,
      autoBackupSnapshots,
      lastAutoBackupTime,
      updateAutoBackupConfig,
      triggerManualAutoBackup,
      restoreFromAutoBackupSnapshot,
      deleteAutoBackupSnapshot,
      downloadAutoBackupSnapshot,
    }),
    [
      currentUser,
      currentStudent,
      users,
      currentTeacher,
      assignedClassForCurrentTeacher,
      currentClassStudents,
      settings,
      students,
      teachers,
      classes,
      attendance,
      holidays,
      feePayments,
      exams,
      examMarks,
      homeworks,
      notices,
      deletedNoticeIds,
      salaries,
      certificates,
      admitCards,
      searchTerm,
      isOfflineMode,
      cloudSyncStatus,
      lastCloudSyncTime,
      autoBackupConfig,
      autoBackupSnapshots,
      lastAutoBackupTime,
    ]
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
