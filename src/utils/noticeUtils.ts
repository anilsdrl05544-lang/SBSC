import { Notice } from '../types/school';

/**
 * Normalizes any category string into standard canonical key:
 * 'examination', 'holiday', 'fee', 'academic', 'event', 'general'
 */
export const normalizeNoticeCategory = (cat?: string): string => {
  if (!cat) return 'general';
  const c = cat.trim().toLowerCase();
  if (c.startsWith('emerg') || c.startsWith('urg') || c.includes('आपात')) return 'emergency';
  if (c.startsWith('exam')) return 'examination';
  if (c.startsWith('event') || c.startsWith('cultur') || c.startsWith('sport')) return 'event';
  if (c.startsWith('acad')) return 'academic';
  if (c.startsWith('holid')) return 'holiday';
  if (c.startsWith('fee')) return 'fee';
  return c;
};

/**
 * Checks if a notice matches a given category filter.
 * Handles 'all', 'Exam' vs 'Examination', 'Event' vs 'Events', etc.
 */
export const matchesNoticeCategory = (noticeCategory?: string, filterCategory: string = 'all'): boolean => {
  if (!filterCategory || filterCategory.toLowerCase() === 'all') return true;
  return normalizeNoticeCategory(noticeCategory) === normalizeNoticeCategory(filterCategory);
};

export const DEMO_NOTICE_IDS = new Set(['not-1', 'not-2', 'not-3', 'not-4']);

/**
 * Robust check to determine if an Admin or Teacher created circular
 * should be visible to a student or parent.
 */
export const isNoticeVisibleToStudent = (
  notice: Notice,
  studentClassId?: string,
  studentClassName?: string,
  localDeletedIds?: Set<string>
): boolean => {
  if (!notice || !notice.id) return false;
  // Permanently hide the old demo notices (e.g. Half Yearly Examination not-2)
  if (DEMO_NOTICE_IDS.has(notice.id)) return false;
  if (notice.isDeleted) return false;
  if (localDeletedIds && localDeletedIds.has(notice.id)) return false;

  // Teacher-only internal circulars should never be visible to students or parents
  const aud = (notice.targetAudience || '').trim().toLowerCase();
  if (
    aud === 'teachers' ||
    aud === 'teacher' ||
    aud === 'faculty' ||
    aud === 'staff' ||
    aud === 'teachers only' ||
    aud === 'staff only'
  ) {
    return false;
  }

  // Target class check:
  // If no targetClassId or set to 'all' / 'all classes', it is universal for all students
  const targetClass = (notice as any).targetClassId ? String((notice as any).targetClassId).trim().toLowerCase() : '';
  if (
    targetClass &&
    targetClass !== 'all' &&
    targetClass !== 'all classes' &&
    targetClass !== 'all-classes' &&
    targetClass !== 'none' &&
    targetClass !== 'null' &&
    targetClass !== 'undefined'
  ) {
    const sClassId = (studentClassId || '').trim().toLowerCase();
    const sClassName = (studentClassName || '').trim().toLowerCase();

    const matchId = sClassId && targetClass === sClassId;
    const matchName =
      sClassName &&
      (targetClass === sClassName ||
        targetClass.replace(/\s+/g, '') === sClassName.replace(/\s+/g, ''));

    if (!matchId && !matchName) {
      return false;
    }
  }

  return true;
};

/**
 * Standard badge styling helper based on category
 */
export const getNoticeCategoryBadge = (category?: string) => {
  const norm = normalizeNoticeCategory(category);
  switch (norm) {
    case 'emergency':
      return {
        label: 'Emergency Alert (आपातकालीन)',
        bg: 'bg-red-100 text-red-950 border-red-400 font-extrabold',
        dot: 'bg-red-600 animate-pulse',
      };
    case 'examination':
      return {
        label: 'Examinations (परीक्षा)',
        bg: 'bg-purple-100 text-purple-900 border-purple-300',
        dot: 'bg-purple-600',
      };
    case 'holiday':
      return {
        label: 'Holiday (अवकाश)',
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-600',
      };
    case 'fee':
      return {
        label: 'Fee Circular (शुल्क)',
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600',
      };
    case 'academic':
      return {
        label: 'Academic (शैक्षणिक)',
        bg: 'bg-teal-100 text-teal-900 border-teal-300',
        dot: 'bg-teal-600',
      };
    case 'event':
      return {
        label: 'Events & Sports (कार्यक्रम)',
        bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        dot: 'bg-indigo-600',
      };
    default:
      return {
        label: 'General Notice (सामान्य)',
        bg: 'bg-rose-100 text-rose-900 border-rose-300',
        dot: 'bg-rose-600',
      };
  }
};
