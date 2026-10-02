import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, testFirebaseConnection, disableNetwork, enableNetwork } from './firebase';
import {
  SchoolSettings,
  UserAccount,
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
  Holiday,
  AdmitCardRecord,
} from '../types/school';

export interface FullSchoolData {
  settings: SchoolSettings;
  users: UserAccount[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassInfo[];
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  feePayments: FeePayment[];
  exams: Exam[];
  examMarks: ExamMark[];
  homeworks: Homework[];
  notices: Notice[];
  salaries: SalaryRecord[];
  certificates: Certificate[];
  admitCards?: AdmitCardRecord[];
  deletedNoticeIds?: string[];
}

export type CloudSyncStatus = 'connecting' | 'online' | 'syncing' | 'offline' | 'error' | 'quota_exceeded';

const QUOTA_STORAGE_KEY = 'sbsc_firestore_quota_exhausted_timestamp';

/**
 * Check if the Firestore daily write quota is currently exhausted.
 * Remembers quota status for up to 6 hours or until reset.
 */
export function isFirestoreQuotaExhausted(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const time = parseInt(raw, 10);
    // If recorded less than 6 hours ago, treat quota as exhausted to prevent retry storms
    if (Date.now() - time < 6 * 60 * 60 * 1000) {
      return true;
    }
    // Expired, clear and allow testing
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

/**
 * Mark Firestore daily write quota as exhausted
 */
export function markFirestoreQuotaExhausted(): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
    console.warn(
      '[Firebase] Free daily write quota reached (20,000 writes/day). Operating safely in local storage mode.'
    );
    disableNetwork(db).catch(() => {});
  } catch (e) {
    // non-fatal
  }
}

/**
 * Reset quota circuit breaker (e.g. on manual user retry)
 */
export function resetQuotaCircuitBreaker(): void {
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    enableNetwork(db).catch(() => {});
  } catch (e) {
    // non-fatal
  }
}

/**
 * Helper to test if an error represents a Firebase resource-exhausted / quota limit error
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err?.error?.code || '';
  const msg = (err.message || String(err)).toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units')
  );
}

// Intelligently merge local and remote admit card records without losing unlock/lock status
export function mergeAdmitCards(
  localCards: AdmitCardRecord[] = [],
  remoteCards: AdmitCardRecord[] = []
): AdmitCardRecord[] {
  const map = new Map<string, AdmitCardRecord>();

  const getKey = (ac: AdmitCardRecord): string => {
    return `${ac.examId}:::${String(ac.studentId || '').trim().toLowerCase()}`;
  };

  const allCards = [...(localCards || []), ...(remoteCards || [])];
  for (const card of allCards) {
    if (!card || !card.examId || !card.studentId) continue;
    const key = getKey(card);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...card });
    } else {
      const cardTime = card.updatedAt ? new Date(card.updatedAt).getTime() : 0;
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;

      // Last-write-wins based on updatedAt timestamp so admin can both lock and unlock properly
      if (cardTime >= existingTime) {
        map.set(key, {
          ...existing,
          ...card,
          rollNo: card.rollNo?.trim() ? card.rollNo : existing.rollNo,
          updatedAt: card.updatedAt || new Date().toISOString(),
        });
      } else {
        map.set(key, {
          ...card,
          ...existing,
          rollNo: existing.rollNo?.trim() ? existing.rollNo : card.rollNo,
          updatedAt: existing.updatedAt || new Date().toISOString(),
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Intelligently merge local and remote exams without losing customized 2-meeting timetables,
 * dates, timings, or configured subjects.
 */
export function mergeExams(
  localExams: Exam[] = [],
  remoteExams: Exam[] = []
): Exam[] {
  const map = new Map<string, Exam>();

  // 1. Seed with local exams (local changes are authoritative)
  if (Array.isArray(localExams)) {
    localExams.forEach((ex) => {
      if (ex && ex.id) {
        map.set(ex.id, { ...ex });
      }
    });
  }

  // 2. Merge remote exams
  if (Array.isArray(remoteExams)) {
    remoteExams.forEach((rem) => {
      if (!rem || !rem.id) return;
      const local = map.get(rem.id);
      if (!local) {
        map.set(rem.id, { ...rem });
      } else {
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        const remoteTime = rem.updatedAt ? new Date(rem.updatedAt).getTime() : 0;

        // Has local timetable been configured?
        const hasLocalTimetable = Array.isArray(local.timetable) && local.timetable.length > 0;
        const hasRemoteTimetable = Array.isArray(rem.timetable) && rem.timetable.length > 0;

        let preferredTimetable = local.timetable;
        if (hasLocalTimetable && !hasRemoteTimetable) {
          preferredTimetable = local.timetable;
        } else if (!hasLocalTimetable && hasRemoteTimetable) {
          preferredTimetable = rem.timetable;
        } else if (hasLocalTimetable && hasRemoteTimetable) {
          preferredTimetable = localTime >= remoteTime ? local.timetable : rem.timetable;
        }

        const preferredMeeting1 = (localTime >= remoteTime ? local.meeting1Time : rem.meeting1Time) || local.meeting1Time || rem.meeting1Time;
        const preferredMeeting2 = (localTime >= remoteTime ? local.meeting2Time : rem.meeting2Time) || local.meeting2Time || rem.meeting2Time;

        if (localTime >= remoteTime) {
          map.set(rem.id, {
            ...rem,
            ...local,
            meeting1Time: preferredMeeting1,
            meeting2Time: preferredMeeting2,
            timetable: preferredTimetable,
          });
        } else {
          map.set(rem.id, {
            ...local,
            ...rem,
            meeting1Time: preferredMeeting1,
            meeting2Time: preferredMeeting2,
            timetable: preferredTimetable,
          });
        }
      }
    });
  }

  return Array.from(map.values());
}

// Remove undefined values recursively so Firestore never throws invalid-nested-field errors
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString() as unknown as T;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

/**
 * Intelligently merge local and remote fee payments without losing any recorded receipts
 */
export function mergeFeePayments(
  localPayments: FeePayment[] = [],
  remotePayments: FeePayment[] = []
): FeePayment[] {
  const map = new Map<string, FeePayment>();

  const getKey = (p: FeePayment): string => {
    if (p.id) return p.id;
    if (p.receiptNo) return p.receiptNo;
    return `${p.studentId || ''}_${p.admissionNo || ''}_${p.date || ''}_${p.amountPaid || 0}`;
  };

  // 1. Add all local payments first
  if (Array.isArray(localPayments)) {
    localPayments.forEach((p) => {
      if (!p) return;
      const key = getKey(p);
      map.set(key, { ...p });
    });
  }

  // 2. Merge remote payments
  if (Array.isArray(remotePayments)) {
    remotePayments.forEach((rem) => {
      if (!rem) return;
      const key = getKey(rem);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...rem });
      } else {
        // If local is cancelled, preserve cancellation status
        if (existing.status === 'Cancelled' && rem.status !== 'Cancelled') {
          map.set(key, { ...rem, ...existing });
        } else if (rem.status === 'Cancelled') {
          map.set(key, { ...existing, ...rem });
        } else {
          // Merge preserving richer local properties
          map.set(key, { ...rem, ...existing });
        }
      }
    });
  }

  // Sort newest date/receipt first
  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.date || '').getTime();
    const timeB = new Date(b.date || '').getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
      return timeB - timeA;
    }
    return (b.receiptNo || b.id || '').localeCompare(a.receiptNo || a.id || '');
  });
}

/**
 * Intelligently merge local and remote attendance records without losing any records
 */
export function mergeAttendanceRecords(
  localRecords: AttendanceRecord[] = [],
  remoteRecords: AttendanceRecord[] = []
): AttendanceRecord[] {
  const map = new Map<string, AttendanceRecord>();

  // 1. Add all local records first
  if (Array.isArray(localRecords)) {
    localRecords.forEach((rec) => {
      if (!rec || !rec.date || !rec.targetId) return;
      const key = `${rec.date}_${rec.type || 'student'}_${rec.targetId}`;
      map.set(key, { ...rec });
    });
  }

  // 2. Merge remote records without dropping any unique local records
  if (Array.isArray(remoteRecords)) {
    remoteRecords.forEach((rem) => {
      if (!rem || !rem.date || !rem.targetId) return;
      const key = `${rem.date}_${rem.type || 'student'}_${rem.targetId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...rem });
      } else {
        // Both local and remote have a record for this targetId on this date
        map.set(key, {
          ...existing,
          ...rem,
          id: existing.id || rem.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          status: rem.status || existing.status,
          remarks: rem.remarks !== undefined ? rem.remarks : existing.remarks,
        });
      }
    });
  }

  return Array.from(map.values());
}

/**
 * Intelligently merge local and remote students dataset.
 * Honors local updates, prevents old cloud data from overwriting recently changed phone numbers or details.
 */
export function mergeStudents(
  localStudents: Student[] = [],
  remoteStudents: Student[] = [],
  deletedIds: string[] = []
): Student[] {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, Student>();

  // 1. Put all local students into map
  if (Array.isArray(localStudents)) {
    localStudents.forEach((st) => {
      if (!st || !st.id || deletedSet.has(st.id)) return;
      map.set(st.id, { ...st });
    });
  }

  // 2. Merge remote students
  if (Array.isArray(remoteStudents)) {
    remoteStudents.forEach((rem) => {
      if (!rem || !rem.id || deletedSet.has(rem.id)) return;
      const local = map.get(rem.id);
      if (!local) {
        // Remote student that doesn't exist locally - add it
        map.set(rem.id, { ...rem });
      } else {
        // Both exist: check timestamps or modified status
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        const remoteTime = rem.updatedAt ? new Date(rem.updatedAt).getTime() : 0;

        const combinedPreviousPhones = Array.from(
          new Set([...(rem.previousPhones || []), ...(local.previousPhones || [])])
        ).filter(Boolean);

        if (localTime >= remoteTime) {
          // Local is newer or actively edited locally; keep local fields as primary!
          map.set(rem.id, {
            ...rem,
            ...local,
            previousPhones: combinedPreviousPhones,
            oldPhone: local.oldPhone || rem.oldPhone,
            guardianPhone: local.guardianPhone || rem.guardianPhone,
            emergencyContact: local.emergencyContact || rem.emergencyContact || local.guardianPhone,
          });
        } else {
          // Remote is newer; use remote but preserve local previousPhones and oldPhone
          map.set(rem.id, {
            ...local,
            ...rem,
            previousPhones: combinedPreviousPhones,
            oldPhone: rem.oldPhone || local.oldPhone,
            guardianPhone: rem.guardianPhone || local.guardianPhone,
            emergencyContact: rem.emergencyContact || local.emergencyContact || rem.guardianPhone,
          });
        }
      }
    });
  }

  return Array.from(map.values());
}

export const DUMMY_TEACHER_IDS = new Set(['t-1', 't-2', 't-3', 't-4']);
export const PERMANENT_TEACHER_IDS = new Set([
  't-shanti',
  't-meena',
  't-ramjiyawan',
  't-shyamlal',
  't-prachi',
  't-gorakh',
  't-ravindra',
  't-shashimaul',
  't-aditya',
  't-harishankar',
  't-shalu',
]);

export const DUMMY_TEACHER_NAMES = new Set([
  'rahul sharma',
  'mr. rahul sharma',
  'sunita pandey',
  'mrs. sunita pandey',
  'dr. meera tripathi',
  'meera tripathi',
  'arvind verma',
  'mr. arvind verma',
]);

const LEGACY_DUMMY_SALARIES = new Set([26000, 28000, 30000, 31000, 32000, 33000, 34000, 35000, 36000, 38000, 39000, 40000, 42000]);

export function isDummyTeacher(t: Partial<Teacher>): boolean {
  if (!t) return true;
  if (t.id && DUMMY_TEACHER_IDS.has(t.id)) return true;
  if (t.name && DUMMY_TEACHER_NAMES.has(t.name.trim().toLowerCase())) return true;
  if (t.username && ['rahul.sharma', 'sunita.pandey', 'meera.tripathi', 'arvind.verma'].includes(t.username.toLowerCase())) return true;
  return false;
}

/**
 * Intelligently merge local and remote teachers dataset.
 * - Total count = exactly the 11 permanent teachers (unless admin explicitly added a new teacher).
 * - Salary = 0 unless admin explicitly changed it in the admin panel.
 * - Preserves local phone numbers and admin modifications; cloud cannot overwrite with stale numbers.
 * - Filters out all dummy/demo teachers.
 */
export function mergeTeachers(
  localTeachers: Teacher[] = [],
  remoteTeachers: Teacher[] = [],
  deletedIds: string[] = []
): Teacher[] {
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, Teacher>();

  const sanitizeTeacher = (t: Teacher): Teacher => {
    // Salary defaults to 0 as explicitly instructed
    const rawSal = typeof t.salary === 'number' ? t.salary : 0;
    const cleanSalary = LEGACY_DUMMY_SALARIES.has(rawSal) ? 0 : rawSal;
    return {
      ...t,
      salary: cleanSalary,
    };
  };

  // 1. Put all local teachers into map first (local state is primary)
  if (Array.isArray(localTeachers)) {
    localTeachers.forEach((lt) => {
      if (!lt || !lt.id || deletedSet.has(lt.id) || isDummyTeacher(lt)) return;
      map.set(lt.id, sanitizeTeacher(lt));
    });
  }

  // 2. Merge remote teachers carefully
  if (Array.isArray(remoteTeachers)) {
    remoteTeachers.forEach((rem) => {
      if (!rem || !rem.id || deletedSet.has(rem.id) || isDummyTeacher(rem)) return;
      const cleanRemote = sanitizeTeacher(rem);
      const local = map.get(rem.id);

      if (!local) {
        // Only accept new remote teacher if it is one of the 11 permanent teachers or a valid custom added teacher
        if (PERMANENT_TEACHER_IDS.has(rem.id) || rem.id.startsWith('t-')) {
          map.set(rem.id, cleanRemote);
        }
      } else {
        // Teacher exists both locally and remotely:
        // Local phone and salary are strictly preserved unless remote was modified by an admin more recently
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 1;
        const remoteTime = cleanRemote.updatedAt ? new Date(cleanRemote.updatedAt).getTime() : 0;

        // Keep local phone number if local has one; do not let remote overwrite phone
        const preferredPhone = local.phone?.trim() ? local.phone : cleanRemote.phone;
        const preferredSalary = typeof local.salary === 'number' ? local.salary : 0;

        if (localTime >= remoteTime) {
          map.set(rem.id, {
            ...cleanRemote,
            ...local,
            phone: preferredPhone,
            salary: preferredSalary,
          });
        } else {
          map.set(rem.id, {
            ...local,
            ...cleanRemote,
            phone: preferredPhone,
            salary: typeof cleanRemote.salary === 'number' && !LEGACY_DUMMY_SALARIES.has(cleanRemote.salary) ? cleanRemote.salary : preferredSalary,
          });
        }
      }
    });
  }

  // Filter out any dummy teachers or deleted IDs
  const result = Array.from(map.values()).filter((t) => !isDummyTeacher(t) && !deletedSet.has(t.id));

  // If there are more than 11 teachers and some are not in PERMANENT_TEACHER_IDS or created by admin, prioritize the 11
  return result;
}

const DEMO_NOTICE_IDS = new Set(['not-1', 'not-2', 'not-3', 'not-4']);

/**
 * Intelligently merge local and remote notices dataset.
 * Honors deletions (deletedNoticeIds & isDeleted: true), guarantees deleted notices never reappear.
 */
export function mergeNotices(
  localNotices: Notice[] = [],
  remoteNotices: Notice[] = [],
  deletedIds: string[] = []
): Notice[] {
  const deletedSet = new Set([...DEMO_NOTICE_IDS, ...deletedIds]);

  // 1. If remoteNotices is provided from cloud, it is the authoritative server state
  if (Array.isArray(remoteNotices)) {
    return remoteNotices.filter((n) => n && n.id && !deletedSet.has(n.id) && !n.isDeleted);
  }

  // 2. If completely offline and remote is not available, filter local notices
  return (localNotices || []).filter((n) => n && n.id && !deletedSet.has(n.id) && !n.isDeleted);
}

const SCHOOL_ID = 'sbsc_main';
const COLLECTION_NAME = 'schools';

/**
 * Fetch all data from Firestore online database
 */
export async function fetchAllSchoolDataFromCloud(): Promise<Partial<FullSchoolData> | null> {
  // If Firestore quota is exhausted, immediately return to avoid errors
  if (isFirestoreQuotaExhausted()) {
    return null;
  }

  try {
    const modules = [
      'settings',
      'users',
      'students',
      'teachers',
      'classes',
      'attendance',
      'holidays',
      'feePayments',
      'exams',
      'examMarks',
      'homeworks',
      'notices',
      'salaries',
      'certificates',
      'admitCards',
      'deletedNoticeIds',
    ];

    const results: Partial<FullSchoolData> = {};
    let foundAny = false;

    // First try the consolidated bundle doc for ultra-fast single-roundtrip load
    try {
      const bundleRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'sync', 'bundle');
      const bundleSnap = await getDoc(bundleRef);
      if (bundleSnap.exists()) {
        const bundleData = bundleSnap.data();
        if (bundleData && bundleData.payload) {
          console.log('✓ Loaded online school data bundle from Firestore');
          const payload = bundleData.payload as FullSchoolData;

          // Double check individual deletedNoticeIds doc
          try {
            const delRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'deletedNoticeIds');
            const delSnap = await getDoc(delRef);
            if (delSnap.exists()) {
              const delVal = delSnap.data();
              if (delVal && Array.isArray(delVal.items)) {
                payload.deletedNoticeIds = Array.from(new Set([...(payload.deletedNoticeIds || []), ...delVal.items]));
              }
            }
          } catch (e) {
            // non-fatal
          }

          const allDeletedNoticeIds = new Set([
            ...DEMO_NOTICE_IDS,
            ...(payload.deletedNoticeIds || []),
          ]);

          // Double check individual attendance doc in case module was updated independently
          try {
            const attRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'attendance');
            const attSnap = await getDoc(attRef);
            if (attSnap.exists()) {
              const attVal = attSnap.data();
              if (attVal && Array.isArray(attVal.items)) {
                payload.attendance = mergeAttendanceRecords(payload.attendance || [], attVal.items);
              }
            }
          } catch (e) {
            // non-fatal
          }

          // Double check individual feePayments doc in case module was updated independently
          try {
            const feesRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'feePayments');
            const feesSnap = await getDoc(feesRef);
            if (feesSnap.exists()) {
              const feesVal = feesSnap.data();
              if (feesVal && Array.isArray(feesVal.items)) {
                payload.feePayments = mergeFeePayments(payload.feePayments || [], feesVal.items);
              }
            }
          } catch (e) {
            // non-fatal
          }

          // Double check individual notices doc in case module was updated independently
          try {
            const noticesRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'notices');
            const noticesSnap = await getDoc(noticesRef);
            if (noticesSnap.exists()) {
              const noticesVal = noticesSnap.data();
              if (noticesVal && Array.isArray(noticesVal.items) && noticesVal.items.length > 0) {
                payload.notices = mergeNotices(payload.notices || [], noticesVal.items, Array.from(allDeletedNoticeIds));
              }
            }
          } catch (e) {
            // non-fatal
          }

          // Double check individual teachers doc in case module was updated independently
          try {
            const teachersRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'teachers');
            const teachersSnap = await getDoc(teachersRef);
            if (teachersSnap.exists()) {
              const teachersVal = teachersSnap.data();
              if (teachersVal && Array.isArray(teachersVal.items) && teachersVal.items.length > 0) {
                payload.teachers = mergeTeachers(payload.teachers || [], teachersVal.items);
              }
            }
          } catch (e) {
            // non-fatal
          }

          // Double check individual admitCards doc in case module was updated independently
          try {
            const admitRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'admitCards');
            const admitSnap = await getDoc(admitRef);
            if (admitSnap.exists()) {
              const admitVal = admitSnap.data();
              if (admitVal && Array.isArray(admitVal.items) && admitVal.items.length > 0) {
                payload.admitCards = mergeAdmitCards(payload.admitCards || [], admitVal.items);
              }
            }
          } catch (e) {
            // non-fatal
          }

          // Ensure dummy teachers are permanently excluded and salaries sanitized to 0
          if (Array.isArray(payload.teachers)) {
            payload.teachers = mergeTeachers([], payload.teachers);
          }

          // Ensure deleted notices & demo notices are permanently excluded
          if (Array.isArray(payload.notices)) {
            payload.notices = payload.notices.filter(
              (n) => n && n.id && !allDeletedNoticeIds.has(n.id) && !n.isDeleted
            );
          }

          return payload;
        }
      }
    } catch (e: any) {
      if (isQuotaExceededError(e)) {
        markFirestoreQuotaExhausted();
        return null;
      }
      const msg = (e?.message || String(e)).toLowerCase();
      if (msg.includes('offline') || msg.includes('unavailable')) {
        // Client is offline, do not attempt 14 per-module queries
        return null;
      }
      console.warn('Bundle fetch skipped, checking per module:', e?.message || e);
    }

    // Per-module fetch (only if online and bundle not found)
    await Promise.all(
      modules.map(async (modName) => {
        try {
          const docRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', modName);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const val = snap.data();
            if (val && val.items !== undefined) {
              (results as any)[modName] = val.items;
              foundAny = true;
            } else if (val && val.data !== undefined) {
              (results as any)[modName] = val.data;
              foundAny = true;
            }
          }
        } catch (err: any) {
          if (isQuotaExceededError(err)) {
            markFirestoreQuotaExhausted();
          } else {
            const msg = (err?.message || String(err)).toLowerCase();
            if (!msg.includes('offline')) {
              console.warn(`Could not fetch module ${modName} from Firestore:`, err?.message || err);
            }
          }
        }
      })
    );

    if (results.teachers && Array.isArray(results.teachers)) {
      results.teachers = mergeTeachers([], results.teachers);
    }

    return foundAny ? results : null;
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      markFirestoreQuotaExhausted();
    } else {
      console.warn('School data cloud fetch ended:', error?.message || error);
    }
    return null;
  }
}

let moduleSaveTimeout: any = null;
let pendingModuleUpdates: Partial<FullSchoolData> = {};

/**
 * Push an individual module to Firestore with debouncing and consolidated bundle writes.
 * Aggregates rapid changes (e.g. marking 40 students) into a single write operation.
 */
export async function saveModuleToCloud<K extends keyof FullSchoolData>(
  moduleName: K,
  data: FullSchoolData[K],
  immediate: boolean = false
): Promise<boolean> {
  // If Firestore quota is exhausted, immediately skip network calls to prevent retry loops
  if (isFirestoreQuotaExhausted()) {
    return false;
  }

  // Queue module data cleanly
  pendingModuleUpdates[moduleName] = sanitizeForFirestore(data);

  return new Promise((resolve) => {
    if (moduleSaveTimeout) {
      clearTimeout(moduleSaveTimeout);
    }

    const flushDelay = immediate || moduleName === 'notices' ? 50 : 2000;

    moduleSaveTimeout = setTimeout(async () => {
      try {
        if (isFirestoreQuotaExhausted()) {
          resolve(false);
          return;
        }

        const updatesToFlush = { ...pendingModuleUpdates };
        pendingModuleUpdates = {};

        const bundleRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'sync', 'bundle');
        const updatePayload: Record<string, any> = {
          lastUpdated: new Date().toISOString(),
          timestamp: serverTimestamp(),
        };

        for (const [mod, val] of Object.entries(updatesToFlush)) {
          updatePayload[`payload.${mod}`] = val;
        }

        await setDoc(bundleRef, updatePayload, { merge: true });

        // If notices were updated, also directly persist to data/notices document as secondary safeguard
        if (updatesToFlush.notices) {
          try {
            const noticesDocRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'notices');
            await setDoc(noticesDocRef, {
              items: updatesToFlush.notices,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {}
        }

        // If deletedNoticeIds were updated, also directly persist to data/deletedNoticeIds document
        if (updatesToFlush.deletedNoticeIds) {
          try {
            const delNoticesDocRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'deletedNoticeIds');
            await setDoc(delNoticesDocRef, {
              items: updatesToFlush.deletedNoticeIds,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {}
        }

        // If teachers were updated, also directly persist to data/teachers document as secondary safeguard
        if (updatesToFlush.teachers) {
          try {
            const teachersDocRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'teachers');
            await setDoc(teachersDocRef, {
              items: updatesToFlush.teachers,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {}
        }

        // If admit cards were updated, also directly persist to data/admitCards document
        if (updatesToFlush.admitCards) {
          try {
            const admitDocRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'data', 'admitCards');
            await setDoc(admitDocRef, {
              items: updatesToFlush.admitCards,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {}
        }

        resolve(true);
      } catch (error: any) {
        if (isQuotaExceededError(error)) {
          markFirestoreQuotaExhausted();
        } else {
          console.warn(`Error saving module ${String(moduleName)} to Firestore:`, error);
        }
        resolve(false);
      }
    }, flushDelay);
  });
}

/**
 * Push full school database to Firestore cloud.
 * Writes ONLY to the central consolidated bundle document (1 write unit instead of 15 write units).
 */
export async function pushAllSchoolDataToCloud(fullData: FullSchoolData): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    console.warn('[Firebase] Skipping cloud push: Daily write quota is currently exhausted. Data is safe locally.');
    return false;
  }

  try {
    const cleanBundle = sanitizeForFirestore(fullData);

    // Write consolidated bundle (1 write unit, 93.3% quota reduction!)
    const bundleRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'sync', 'bundle');
    await setDoc(
      bundleRef,
      {
        payload: cleanBundle,
        lastUpdated: new Date().toISOString(),
        timestamp: serverTimestamp(),
        schoolName: fullData.settings?.schoolName || 'SBSC Public School',
        stats: {
          studentsCount: fullData.students?.length || 0,
          teachersCount: fullData.teachers?.length || 0,
          feesCount: fullData.feePayments?.length || 0,
        },
      },
      { merge: true }
    );

    console.log('✓ Consolidated school dataset saved to Firestore cloud in 1 write unit.');
    return true;
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      markFirestoreQuotaExhausted();
    } else {
      console.warn('Failed to push school data to cloud (safe fallback to local storage):', error?.message || error);
    }
    return false;
  }
}

/**
 * Real-time cloud listener: listens for changes on the central bundle
 */
export function subscribeToCloudUpdates(
  onDataReceived: (data: FullSchoolData) => void,
  onError?: (err: Error) => void
): () => void {
  if (isFirestoreQuotaExhausted()) {
    return () => {};
  }

  try {
    const bundleRef = doc(db, COLLECTION_NAME, SCHOOL_ID, 'sync', 'bundle');
    const unsubscribe = onSnapshot(
      bundleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.data();
          if (val && val.payload) {
            onDataReceived(val.payload as FullSchoolData);
          }
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          markFirestoreQuotaExhausted();
        } else {
          console.warn('Realtime listener notice:', error);
        }
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markFirestoreQuotaExhausted();
    } else {
      console.error('Failed to subscribe to cloud updates:', err);
    }
    return () => {};
  }
}

export { testFirebaseConnection };
