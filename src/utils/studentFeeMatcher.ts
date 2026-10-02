import * as XLSX from 'xlsx';
import { Student, ClassInfo } from '../types/school';

export interface DueHeadBreakdown {
  tuitionFee: number;
  admissionFee: number;
  registrationFee: number;
  examFee: number;
  conveyFee: number;
  previousDue: number; // Previous Due / Old Balance / Arrears (पिछला बकाया)
  lateFine: number; // Late Fine / Penalty
  totalDue: number;
}

export interface RawDueRow {
  rowNumber: number;
  rawStudentName: string;
  rawClassName: string;
  rawFatherName: string;
  rawAdmissionNo?: string;
  rawRollNo?: string;
  heads: DueHeadBreakdown;
  remarks?: string;
  originalRow: Record<string, any>;
}

export type MatchConfidence = 'exact' | 'fuzzy' | 'ambiguous' | 'none';

export interface StudentMatchCandidate {
  student: Student;
  score: number;
  reason: string;
}

export interface ProcessedDueRow extends RawDueRow {
  matchedStudent: Student | null;
  matchConfidence: MatchConfidence;
  matchScore: number;
  matchReason: string;
  candidateMatches: StudentMatchCandidate[];
  isSelected: boolean; // whether to include in commit
}

export interface DueExcelParseResult {
  fileName: string;
  totalRows: number;
  exactMatchesCount: number;
  fuzzyMatchesCount: number;
  ambiguousCount: number;
  unmatchedCount: number;
  totalDueAmount: number;
  totalSheetDueAmount: number;
  matchedDueAmount: number;
  unmatchedDueAmount: number;
  rows: ProcessedDueRow[];
  headersFound: string[];
}

/**
 * Remove honorifics and noise words commonly found in Indian student/father names.
 */
const HONORIFICS_REGEX =
  /^(mr\.|mr|mrs\.|mrs|ms\.|ms|shri|shree|sri|sh\.|dr\.|dr|late|smt\.|smt|pt\.|pandit|master|md\.|md|mohd\.|mohd|km\.|km|ku\.|ku|baby|father:|c\/o|s\/o|d\/o|w\/o|so|do|wo|co|श्री|श्रीमती|स्वर्गीय|स्व\.|डा\.|डॉ\.)\s+/i;

export const normalizeName = (name: string | undefined | null): string => {
  if (!name) return '';
  let cleaned = String(name).trim().toLowerCase();
  // Strip honorific / parentage prefixes
  cleaned = cleaned.replace(HONORIFICS_REGEX, '').trim();
  // Strip embedded parentage indicators e.g. "s/o", "d/o", "c/o"
  cleaned = cleaned.replace(/\b(s\/o|d\/o|w\/o|c\/o|so|do|wo|co|father|s\/)\b/gi, ' ');
  // Remove special symbols but keep hindi characters and english letters
  cleaned = cleaned.replace(/[^\w\s\u0900-\u097F]/gi, ' ');
  // Collapse whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
};

/**
 * Normalize class names across multiple notations (e.g. "10th", "Class 10", "X", "10-A", "NURSERY", "LKG", "UKG")
 */
export const normalizeClassName = (rawClass: string | undefined | null): string => {
  if (!rawClass) return '';
  const s = String(rawClass).trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');

  if (s.includes('nur') || s.includes('नर्सरी')) return 'nursery';
  if (s.includes('lkg') || s.includes('kg1') || s.includes('lowerkg') || s.includes('एलकेजी')) return 'lkg';
  if (s.includes('ukg') || s.includes('kg2') || s.includes('upperkg') || s.includes('यूकेजी')) return 'ukg';
  if (s.includes('prep') || s.includes('प्रेप')) return 'prep';
  if (s.includes('play') || s.includes('प्ले')) return 'playgroup';

  // Words to numbers
  if (s === 'first' || s === 'one' || s === 'प्रथम' || s === 'कक्षा1') return '1';
  if (s === 'second' || s === 'two' || s === 'द्वितीय' || s === 'कक्षा2') return '2';
  if (s === 'third' || s === 'three' || s === 'तृतीय' || s === 'कक्षा3') return '3';
  if (s === 'fourth' || s === 'four' || s === 'चतुर्थ' || s === 'कक्षा4') return '4';
  if (s === 'fifth' || s === 'five' || s === 'पंचम' || s === 'कक्षा5') return '5';
  if (s === 'sixth' || s === 'six' || s === 'षष्ठम' || s === 'कक्षा6') return '6';
  if (s === 'seventh' || s === 'seven' || s === 'सप्तम' || s === 'कक्षा7') return '7';
  if (s === 'eighth' || s === 'eight' || s === 'अष्टम' || s === 'कक्षा8') return '8';
  if (s === 'ninth' || s === 'nine' || s === 'नवम' || s === 'कक्षा9') return '9';
  if (s === 'tenth' || s === 'ten' || s === 'दशम' || s === 'कक्षा10') return '10';
  if (s === 'eleventh' || s === 'eleven' || s === 'एकादश' || s === 'कक्षा11') return '11';
  if (s === 'twelfth' || s === 'twelve' || s === 'द्वादश' || s === 'कक्षा12') return '12';

  // Check roman numerals
  if (s === 'i' || s === 'classi' || s === '1st' || s === 'class1' || s === '1') return '1';
  if (s === 'ii' || s === 'classii' || s === '2nd' || s === 'class2' || s === '2') return '2';
  if (s === 'iii' || s === 'classiii' || s === '3rd' || s === 'class3' || s === '3') return '3';
  if (s === 'iv' || s === 'classiv' || s === '4th' || s === 'class4' || s === '4') return '4';
  if (s === 'v' || s === 'classv' || s === '5th' || s === 'class5' || s === '5') return '5';
  if (s === 'vi' || s === 'classvi' || s === '6th' || s === 'class6' || s === '6') return '6';
  if (s === 'vii' || s === 'classvii' || s === '7th' || s === 'class7' || s === '7') return '7';
  if (s === 'viii' || s === 'classviii' || s === '8th' || s === 'class8' || s === '8') return '8';
  if (s === 'ix' || s === 'classix' || s === '9th' || s === 'class9' || s === '9') return '9';
  if (s === 'x' || s === 'classx' || s === '10th' || s === 'class10' || s === '10') return '10';
  if (s === 'xi' || s === 'classxi' || s === '11th' || s === 'class11' || s === '11') return '11';
  if (s === 'xii' || s === 'classxii' || s === '12th' || s === 'class12' || s === '12') return '12';

  // Extract digits if available
  const match = s.match(/\d+/);
  if (match) return match[0];

  return s;
};

/**
 * Calculate token overlap and Levenshtein similarity (0 to 1)
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const n1 = normalizeName(str1);
  const n2 = normalizeName(str2);

  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1.0;

  // Substring check
  if (n1.includes(n2) || n2.includes(n1)) {
    const minLen = Math.min(n1.length, n2.length);
    const maxLen = Math.max(n1.length, n2.length);
    if (minLen / maxLen > 0.6) return 0.92;
  }

  // Token Jaccard similarity & anagram/reorder check
  const arr1 = n1.split(' ').filter(Boolean);
  const arr2 = n2.split(' ').filter(Boolean);
  const tokens1 = new Set(arr1);
  const tokens2 = new Set(arr2);
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  const tokenScore = union.size > 0 ? intersection.size / union.size : 0;

  // Exact same tokens in different order (e.g. "Singh Rahul" vs "Rahul Singh")
  if (tokens1.size > 1 && tokens1.size === tokens2.size && intersection.size === tokens1.size) {
    return 0.98;
  }

  // Token score = 1
  if (tokenScore === 1) return 0.95;

  // Levenshtein distance for fuzzy typos
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const editDist = levenshteinDistance(longer, shorter);
  const levScore = (longerLength - editDist) / longerLength;

  return Math.max(tokenScore, levScore);
};

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Match a raw Excel row against the students database based on Name, Class, and Father Name.
 */
export const matchStudentByNameClassFather = (
  raw: {
    studentName: string;
    className: string;
    fatherName: string;
    admissionNo?: string;
  },
  students: Student[],
  classes: ClassInfo[]
): {
  matchedStudent: Student | null;
  matchConfidence: MatchConfidence;
  matchScore: number;
  matchReason: string;
  candidateMatches: StudentMatchCandidate[];
} => {
  const normInputStudent = normalizeName(raw.studentName);
  const normInputFather = normalizeName(raw.fatherName);
  const normInputClass = normalizeClassName(raw.className);
  const rawAdm = raw.admissionNo ? String(raw.admissionNo).trim().toLowerCase() : '';

  // 1. Direct Admission No exact match if present in the Excel
  if (rawAdm) {
    const admMatch = students.find(
      (s) => s.admissionNo && s.admissionNo.trim().toLowerCase() === rawAdm
    );
    if (admMatch) {
      return {
        matchedStudent: admMatch,
        matchConfidence: 'exact',
        matchScore: 100,
        matchReason: `Exact Admission Number match (${admMatch.admissionNo})`,
        candidateMatches: [{ student: admMatch, score: 100, reason: 'Matched by Admission No' }],
      };
    }
  }

  // Map classIds to normalized names
  const classMap = new Map<string, string>();
  classes.forEach((c) => {
    classMap.set(c.id, normalizeClassName(c.name));
  });

  const candidates: Array<{ student: Student; score: number; reason: string }> = [];

  for (const student of students) {
    const normDbStudent = normalizeName(student.fullName);
    const normDbFather = normalizeName(student.fatherName);
    const studentClassNorm = classMap.get(student.classId) || '';

    // Class Match Score (0 to 30)
    let classScore = 0;
    let classMatches = false;
    if (!normInputClass) {
      classScore = 20; // neutral if class not specified in sheet
    } else if (normInputClass === studentClassNorm) {
      classScore = 30;
      classMatches = true;
    } else {
      const inputDigits = normInputClass.match(/\d+/)?.[0];
      const dbDigits = studentClassNorm.match(/\d+/)?.[0];
      if (inputDigits && dbDigits && inputDigits === dbDigits) {
        classScore = 28;
        classMatches = true;
      } else if (normInputClass.includes(studentClassNorm) || studentClassNorm.includes(normInputClass)) {
        classScore = 25;
        classMatches = true;
      } else {
        classScore = 0;
      }
    }

    // Student Name Similarity (0 to 45)
    const studentSim = calculateStringSimilarity(normInputStudent, normDbStudent);
    const nameScore = Math.round(studentSim * 45);

    // Father Name Similarity (0 to 35)
    let fatherSim = 0;
    if (!normInputFather) {
      fatherSim = 0.5; // neutral if sheet does not have father column
    } else {
      fatherSim = calculateStringSimilarity(normInputFather, normDbFather);
    }
    const fatherScore = Math.round(fatherSim * 35);

    let totalScore = classScore + nameScore + fatherScore;

    // High confidence boost when BOTH Student Name & Father's Name match strongly!
    if (normInputFather && studentSim >= 0.88 && fatherSim >= 0.88) {
      totalScore = Math.max(totalScore, classMatches ? 100 : 95);
    } else if (normInputFather && studentSim >= 0.80 && fatherSim >= 0.80) {
      totalScore = Math.max(totalScore, classMatches ? 92 : 85);
    }

    // Reason construction
    const reasons: string[] = [];
    if (studentSim >= 0.92) reasons.push('Exact Student Name');
    else if (studentSim >= 0.75) reasons.push('Fuzzy Student Name');

    if (normInputFather) {
      if (fatherSim >= 0.92) reasons.push("Exact Father's Name");
      else if (fatherSim >= 0.75) reasons.push("Fuzzy Father's Name");
    }

    if (classMatches) reasons.push('Class Matched');
    else if (normInputClass) reasons.push(`Class: ${normInputClass} vs DB`);

    if (totalScore >= 50) {
      candidates.push({
        student,
        score: totalScore,
        reason: reasons.join(' • ') || 'Potential match',
      });
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      matchedStudent: null,
      matchConfidence: 'none',
      matchScore: 0,
      matchReason: 'No matching student found by Name, Class & Father',
      candidateMatches: [],
    };
  }

  const best = candidates[0];
  const second = candidates[1];

  // If score is 90+, it's an exact match on Name + Class + Father
  if (best.score >= 90) {
    return {
      matchedStudent: best.student,
      matchConfidence: 'exact',
      matchScore: best.score,
      matchReason: `100% Matched on Student & Father Name (${best.reason})`,
      candidateMatches: candidates.slice(0, 3),
    };
  }

  // If score is 75-89 and distinctly better than 2nd candidate
  if (best.score >= 70 && (!second || best.score - second.score >= 12)) {
    return {
      matchedStudent: best.student,
      matchConfidence: 'fuzzy',
      matchScore: best.score,
      matchReason: `High-confidence match (${best.reason})`,
      candidateMatches: candidates.slice(0, 3),
    };
  }

  // Ambiguous: two close candidates
  if (best.score >= 55) {
    return {
      matchedStudent: best.student,
      matchConfidence: 'ambiguous',
      matchScore: best.score,
      matchReason: `Multiple potential matches (Please verify: ${best.student.fullName} s/o ${best.student.fatherName})`,
      candidateMatches: candidates.slice(0, 4),
    };
  }

  return {
    matchedStudent: null,
    matchConfidence: 'none',
    matchScore: best.score,
    matchReason: 'Insufficient match confidence',
    candidateMatches: candidates.slice(0, 3),
  };
};

/**
 * Extracts inner primitive from cell values if SheetJS returned an object
 */
const extractCellValue = (val: any): any => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'object') {
    if (val.v !== undefined && val.v !== null) return val.v;
    if (val.w !== undefined && val.w !== null) return val.w;
    if (val.text !== undefined && val.text !== null) return val.text;
  }
  return val;
};

/**
 * Flexible column key finder that checks case-insensitive aliases with exact match precedence
 */
const findColumnValue = (row: Record<string, any>, aliases: string[]): any => {
  const keys = Object.keys(row);
  // Pass 1: exact normalized match
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');
      if (normalizedKey === target) {
        const rawVal = extractCellValue(row[key]);
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          return rawVal;
        }
      }
    }
  }
  // Pass 2: substring match
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '');
      if (normalizedKey.includes(target) || (target.length >= 4 && target.includes(normalizedKey))) {
        const rawVal = extractCellValue(row[key]);
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
          return rawVal;
        }
      }
    }
  }
  return undefined;
};

export const parseNumericAmount = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'object') {
    if (val.v !== undefined && val.v !== null) return parseNumericAmount(val.v);
    if (val.w !== undefined && val.w !== null) return parseNumericAmount(val.w);
    if (val.text !== undefined && val.text !== null) return parseNumericAmount(val.text);
  }
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.round(val));
  let str = String(val).trim();
  // Strip currency symbols (₹, $, Rs., etc.), commas, spaces, trailing '/-', and trailing '.00'
  str = str.replace(/[₹$€£\u20B9,]/g, '').replace(/(\/-|\.00$)/g, '').trim();
  const clean = str.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.max(0, Math.round(num));
};

/**
 * Parses an Excel or CSV file containing due list and runs the head-wise and Name/Class/Father matching engine
 */
export const parseDueExcelFile = async (
  file: File,
  students: Student[],
  classes: ClassInfo[]
): Promise<DueExcelParseResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Pick best sheet with actual data
  let targetSheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws) continue;
    const testAoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (testAoa.length > 2) {
      targetSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error('No readable sheet found in this Excel workbook.');
  }

  // Convert to array-of-arrays to intelligently find the real header row
  const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (aoa.length === 0) {
    throw new Error('The uploaded sheet contains no data rows.');
  }

  // Scan first 15 rows to identify the actual table header row
  let headerRowIndex = 0;
  let bestHeaderScore = -1;
  const headerKeywords = [
    'name', 'student', 'class', 'father', 'roll', 'adm', 'admission',
    'due', 'fee', 'dues', 'fees', 'tuition', 'balance', 'total', 'amount',
    'नाम', 'विद्यार्थी', 'छात्र', 'कक्षा', 'पिता', 'बकाया', 'शुल्क', 'राशि', 'योग'
  ];

  for (let r = 0; r < Math.min(15, aoa.length); r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    for (const cell of row) {
      const str = String(extractCellValue(cell) || '').toLowerCase().trim();
      if (!str) continue;
      for (const kw of headerKeywords) {
        if (str.includes(kw)) {
          score++;
          break;
        }
      }
    }
    if (score > bestHeaderScore && score >= 2) {
      bestHeaderScore = score;
      headerRowIndex = r;
    }
  }

  const rawHeaders = (aoa[headerRowIndex] || []).map((h, idx) => {
    const s = String(extractCellValue(h) || '').trim();
    return s || `COLUMN_${idx}`;
  });

  const rawJson: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    const rowCells = aoa[r];
    if (!Array.isArray(rowCells) || rowCells.every((c) => c === '' || c === null || c === undefined)) {
      continue;
    }
    const obj: Record<string, any> = {};
    rawHeaders.forEach((header, idx) => {
      obj[header] = extractCellValue(rowCells[idx]);
    });
    rawJson.push(obj);
  }

  if (rawJson.length === 0) {
    throw new Error('No data rows found below the header row in this Excel sheet.');
  }

  const headersFound = rawHeaders.filter((h) => !h.startsWith('COLUMN_'));

  const processedRows: ProcessedDueRow[] = [];
  let exactMatchesCount = 0;
  let fuzzyMatchesCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;
  let totalDueAmount = 0;
  let totalSheetDueAmount = 0;
  let matchedDueAmount = 0;
  let unmatchedDueAmount = 0;
  let detectedSheetGrandTotal = 0;

  rawJson.forEach((row, index) => {
    // 1. Detect Name, Class, Father
    const rawStudentName = String(
      findColumnValue(row, [
        'student name',
        'student fullname',
        'student full name',
        "student's name",
        'students name',
        'studentname',
        'name',
        'student',
        'fullname',
        'full name',
        'विद्यार्थी का नाम',
        'विद्यार्थी',
        'छात्र का नाम',
        'छात्र',
        'छात्रा का नाम',
        'छात्रा',
        'नाम',
        'student_name',
        'sname',
        's_name',
      ]) || ''
    ).trim();

    const rawClassName = String(
      findColumnValue(row, [
        'class',
        'standard',
        'grade',
        'std',
        'कक्षा',
        'वर्ग',
        'class name',
        'classname',
        'class_name',
        'sec',
        'section',
        'class/sec',
      ]) || ''
    ).trim();

    const rawFatherName = String(
      findColumnValue(row, [
        'father name',
        'fathers name',
        "father's name",
        'fathername',
        'father',
        'f name',
        'f. name',
        'fname',
        'f_name',
        'f/name',
        'पिता का नाम',
        'पिता',
        'पिताजी का नाम',
        'पिताजी',
        'अभिभावक का नाम',
        'अभिभावक',
        'guardian name',
        'guardian',
        'parent name',
        'parents name',
        'father_name',
        'father_guardian',
      ]) || ''
    ).trim();

    const rawAdmissionNo = findColumnValue(row, [
      'student id / admission number',
      'student id / admission no',
      'student id',
      'student_id',
      'studentid',
      'student code',
      'admission number',
      'admission no',
      'admissionno',
      'adm no',
      'adm_no',
      'adm no.',
      'adm. no.',
      'scholar no',
      'sno',
      'दाखिला सं.',
      'दाखिला नंबर',
      'प्रवेश क्रमांक',
    ]);

    const rawRollNo = findColumnValue(row, ['roll no', 'rollno', 'roll', 'अनुक्रमांक', 'रोल नंबर']);

    // Skip empty lines where name is blank
    if (!rawStudentName && !rawAdmissionNo) {
      return;
    }

    // Check if this row is a Summary / Grand Total row in the Excel sheet
    const isSummaryRow = /^(total|grand\s*total|net\s*total|sum|all\s*total|total\s*due|total\s*dues|कुल\s*योग|कुल|योग|महायोग)$/i.test(
      rawStudentName.trim()
    );

    if (isSummaryRow) {
      // Find the grand total amount from this summary row
      const summaryAmount = parseNumericAmount(
        findColumnValue(row, [
          'total due',
          'total dues',
          'total',
          'grand total',
          'due amount',
          'amount',
          'due',
          'balance',
          'कुल बकाया',
          'कुल',
        ])
      );
      if (summaryAmount > 0) {
        detectedSheetGrandTotal = summaryAmount;
      }
      return; // Do NOT process the summary row as a student
    }

    // 2. Detect Head-wise Due Amounts
    const tuitionFee = parseNumericAmount(
      findColumnValue(row, [
        'tuition fee',
        'tuition fees',
        'tuition',
        'tution fee',
        'tution fees',
        'tution',
        'monthly fee',
        'monthly fees',
        'शिक्षण शुल्क',
        'ट्यूशन फीस',
        'ट्यूशन शुल्क',
        'ट्यूशन',
        'tuition_fee',
        'tution_fee',
        'tuitionfee',
        'tutionfee',
        'monthly_fee',
        't_fee',
      ])
    );

    const admissionFee = parseNumericAmount(
      findColumnValue(row, [
        'admission fee',
        'admission fees',
        'adm fee',
        'adm fees',
        'admission',
        'adm',
        'admission charge',
        'admission charges',
        'प्रवेश शुल्क',
        'दाखिला फीस',
        'दाखिला शुल्क',
        'प्रवेश फीस',
        'प्रवेश',
        'admission_fee',
        'adm_fee',
        'admissionfee',
        'admfee',
      ])
    );

    const registrationFee = parseNumericAmount(
      findColumnValue(row, [
        'registration fee',
        'registration fees',
        'reg fee',
        'reg fees',
        'reg. fee',
        'reg. fees',
        'registration charge',
        'registration charges',
        'reg charge',
        'reg charges',
        'reg. charge',
        'reg. charges',
        'registration amount',
        'reg amount',
        'reg amt',
        'reg. amt',
        'registration',
        'reg',
        'पंजीकरण शुल्क',
        'पंजीकरण फीस',
        'पंजीकरण प्रभार',
        'पंजीकरण राशि',
        'पंजीकरण',
        'रजिस्ट्रेशन शुल्क',
        'रजिस्ट्रेशन फीस',
        'रजिस्ट्रेशन चार्ज',
        'रजिस्ट्रेशन राशि',
        'रजिस्ट्रेशन',
        'नामांकन शुल्क',
        'नामांकन फीस',
        'नामांकन',
        'enrolment fee',
        'enrollment fee',
        'enrol fee',
        'enroll fee',
        'registration_fee',
        'reg_fee',
        'regfee',
        'reg_charge',
        'regcharges',
      ])
    );

    const examFee = parseNumericAmount(
      findColumnValue(row, [
        'exam fee',
        'exam fees',
        'examination fee',
        'examination fees',
        'exam charge',
        'exam charges',
        'exam',
        'examination',
        'परीक्षण शुल्क',
        'परीक्षा शुल्क',
        'परीक्षा फीस',
        'परीक्षा',
        'exam_fee',
        'examination_fee',
        'examfee',
      ])
    );

    const rawConveyFee = parseNumericAmount(
      findColumnValue(row, [
        'convey fee',
        'convey fees',
        'conveyance fee',
        'conveyance fees',
        'transport fee',
        'transport fees',
        'bus fee',
        'bus fees',
        'van fee',
        'van fees',
        'auto fee',
        'vehicle fee',
        'convey',
        'conveyance',
        'transport',
        'bus',
        'van',
        'वाहन शुल्क',
        'वाहन फीस',
        'बस फीस',
        'परिवहन शुल्क',
        'convey_fee',
        'transport_fee',
        'bus_fee',
      ])
    );
    // School system rule: conveyance of ₹600 is treated as ₹0
    const conveyFee = rawConveyFee === 600 ? 0 : rawConveyFee;

    const hasExplicitPrevDueCol =
      findColumnValue(row, [
        'previous due',
        'previous dues',
        'prev due',
        'prev. due',
        'previous',
        'prev',
        'old due',
        'old dues',
        'old balance',
        'old bal',
        'arrears',
        'arrear',
        'arrear amount',
        'arrears amount',
        'arrears fee',
        'past due',
        'past dues',
        'back due',
        'back dues',
        'last session due',
        'last session dues',
        'last year due',
        'previous year due',
        'previous session due',
        'previous session dues',
        'opening due',
        'opening balance',
        'carry forward',
        'carryover',
        'carried due',
        'पिछला बकाया',
        'पिछला',
        'पिछली बकाया',
        'पुराना बकाया',
        'पूर्व बकाया',
        'गत वर्ष बकाया',
        'गत बकाया',
        'पिछले वर्ष का बकाया',
        'old_due',
        'previous_due',
        'prev_due',
        'previousdue',
        'prevdue',
        'old_balance',
        'oldbalance',
      ]) !== undefined;

    const previousDue = parseNumericAmount(
      findColumnValue(row, [
        'previous due',
        'previous dues',
        'prev due',
        'prev. due',
        'previous',
        'prev',
        'old due',
        'old dues',
        'old balance',
        'old bal',
        'arrears',
        'arrear',
        'arrear amount',
        'arrears amount',
        'arrears fee',
        'past due',
        'past dues',
        'back due',
        'back dues',
        'last session due',
        'last session dues',
        'last year due',
        'previous year due',
        'previous session due',
        'previous session dues',
        'opening due',
        'opening balance',
        'carry forward',
        'carryover',
        'carried due',
        'पिछला बकाया',
        'पिछला',
        'पिछली बकाया',
        'पुराना बकाया',
        'पूर्व बकाया',
        'गत वर्ष बकाया',
        'गत बकाया',
        'पिछले वर्ष का बकाया',
        'old_due',
        'previous_due',
        'prev_due',
        'previousdue',
        'prevdue',
        'old_balance',
        'oldbalance',
      ])
    );

    const lateFine = parseNumericAmount(
      findColumnValue(row, [
        'fine',
        'late fine',
        'late fee',
        'fine (₹)',
        'late fine (₹)',
        'fines',
        'penalty',
        'विलंब शुल्क',
        'विलम्ब शुल्क',
        'late_fine',
      ])
    );

    // Fallback for general due or arrears column if explicit previous due was not found
    const combinedPrevOrFine = parseNumericAmount(
      findColumnValue(row, [
        'previous due / late fine',
        'prev due / fine',
        'pending due',
        'outstanding',
        'balance due',
        'balance',
        'bal',
        'बकाया',
        'शेष',
        'शेष बकाया',
      ])
    );

    // If explicit Previous Due column was found, use its value strictly
    let effectivePreviousDue = hasExplicitPrevDueCol
      ? previousDue
      : previousDue > 0
      ? previousDue
      : combinedPrevOrFine;

    const explicitTotal = parseNumericAmount(
      findColumnValue(row, [
        'total due',
        'total dues',
        'total due amount',
        'total due amt',
        'total fee',
        'total fees',
        'total fee due',
        'total fees due',
        'net due',
        'net due amount',
        'total amount due',
        'amount due',
        'due amount',
        'due amt',
        'due fee',
        'due fees',
        'dues fee',
        'fees due',
        'fee due',
        'total',
        'grand total',
        'net total',
        'balance due',
        'bal due',
        'balance',
        'bal',
        'outstanding',
        'outstanding due',
        'outstanding dues',
        'outstanding amount',
        'pending due',
        'pending dues',
        'pending amount',
        'pending fee',
        'pending fees',
        'pending',
        'dues',
        'due',
        'amount',
        'total amount',
        'net amount',
        'net payable',
        'total payable',
        'payable',
        'payable amount',
        'remaining fee',
        'remaining dues',
        'remaining due',
        'remaining',
        'rem fee',
        'कुल बकाया',
        'कुल बकाया राशि',
        'कुल बकाया शुल्क',
        'कुल फीस',
        'कुल देय',
        'कुल देय राशि',
        'देय राशि',
        'देय फीस',
        'देय शुल्क',
        'बकाया राशि',
        'बकाया फीस',
        'बकाया शुल्क',
        'बकाया',
        'शेष राशि',
        'शेष बकाया',
        'शेष फीस',
        'शेष',
        'कुल योग',
        'कुल',
        'fees',
        'fee',
        'fee_due',
        'total_due',
        'due_amount',
        'due_amt',
        'net_due',
      ])
    );

    // Sum of explicit heads
    const headsSum =
      tuitionFee + admissionFee + registrationFee + examFee + conveyFee + lateFine + effectivePreviousDue;

    let effectiveTuition = tuitionFee;
    // If no specific fee heads were provided in sheet, but an explicit total/due was provided:
    // In an Arrears/Due upload sheet without explicit Previous Due column, this represents Previous Due!
    if (!hasExplicitPrevDueCol && headsSum === 0 && explicitTotal > 0) {
      effectivePreviousDue = explicitTotal;
    }

    const remarks = String(findColumnValue(row, ['remarks', 'comment', 'note', 'विवरण']) || '').trim();

    // 3. Match against Database by Name, Class, Father
    const matchResult = matchStudentByNameClassFather(
      {
        studentName: rawStudentName,
        className: rawClassName,
        fatherName: rawFatherName,
        admissionNo: rawAdmissionNo ? String(rawAdmissionNo) : undefined,
      },
      students,
      classes
    );

    if (matchResult.matchConfidence === 'exact') exactMatchesCount++;
    else if (matchResult.matchConfidence === 'fuzzy') fuzzyMatchesCount++;
    else if (matchResult.matchConfidence === 'ambiguous') ambiguousCount++;
    else unmatchedCount++;

    // Auto-fill Previous Due from system database record ONLY if column was absent in Excel sheet
    let autoFilledPreviousDue = effectivePreviousDue;
    if (
      !hasExplicitPrevDueCol &&
      autoFilledPreviousDue === 0 &&
      matchResult.matchedStudent &&
      (matchResult.matchedStudent.previousDue || 0) > 0
    ) {
      autoFilledPreviousDue = matchResult.matchedStudent.previousDue || 0;
    }

    // If explicit total from sheet exceeds heads sum AND Previous Due column was absent, attribute difference to previous due
    const currentHeadsExcludingPrev =
      effectiveTuition + admissionFee + registrationFee + examFee + conveyFee + lateFine;
    if (!hasExplicitPrevDueCol && explicitTotal > currentHeadsExcludingPrev + autoFilledPreviousDue) {
      autoFilledPreviousDue = explicitTotal - currentHeadsExcludingPrev;
    }

    // Important Calculation:
    // Total Due = Admission Fee + Registration Fee + Tuition Fee + Exam Fee + Conveyance Fee + Fine + Previous Due
    const computedTotalDue =
      admissionFee +
      registrationFee +
      effectiveTuition +
      examFee +
      conveyFee +
      lateFine +
      autoFilledPreviousDue;

    // Exact due of this row: explicit total from sheet if provided and > 0, otherwise computedTotalDue
    const rowSheetDue = explicitTotal > 0 ? explicitTotal : computedTotalDue;
    totalSheetDueAmount += rowSheetDue;

    if (matchResult.matchedStudent) {
      matchedDueAmount += rowSheetDue;
    } else {
      unmatchedDueAmount += rowSheetDue;
    }

    totalDueAmount += rowSheetDue;

    processedRows.push({
      rowNumber: index + 2, // 1-indexed plus header row
      rawStudentName,
      rawClassName,
      rawFatherName,
      rawAdmissionNo: rawAdmissionNo ? String(rawAdmissionNo) : undefined,
      rawRollNo: rawRollNo ? String(rawRollNo) : undefined,
      heads: {
        admissionFee,
        registrationFee,
        tuitionFee: effectiveTuition,
        examFee,
        conveyFee,
        lateFine,
        previousDue: autoFilledPreviousDue,
        totalDue: rowSheetDue,
      },
      remarks,
      originalRow: row,
      matchedStudent: matchResult.matchedStudent,
      matchConfidence: matchResult.matchConfidence,
      matchScore: matchResult.matchScore,
      matchReason: matchResult.matchReason,
      candidateMatches: matchResult.candidateMatches,
      isSelected: matchResult.matchedStudent !== null,
    });
  });

  // If a summary row (Grand Total: 1334850) was explicitly identified in the Excel sheet
  if (detectedSheetGrandTotal > 0 && (totalSheetDueAmount === 0 || Math.abs(detectedSheetGrandTotal - totalSheetDueAmount) < 100)) {
    totalSheetDueAmount = detectedSheetGrandTotal;
    totalDueAmount = detectedSheetGrandTotal;
  }

  return {
    fileName: file.name,
    totalRows: processedRows.length,
    exactMatchesCount,
    fuzzyMatchesCount,
    ambiguousCount,
    unmatchedCount,
    totalDueAmount,
    totalSheetDueAmount,
    matchedDueAmount,
    unmatchedDueAmount,
    rows: processedRows,
    headersFound,
  };
};

/**
 * Generates an Excel workbook template pre-configured for Due uploads with Name, Class, Father and Head-wise columns.
 */
export const generateDueExcelTemplate = (
  students: Student[],
  classes: ClassInfo[],
  prefillCurrentStudents: boolean = true
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Student ID / Admission Number',
    'Student Name',
    "Father's Name",
    'Class',
    'Admission Fee',
    'Registration Fee',
    'Tuition Fee',
    'Exam Fee',
    'Conveyance Fee',
    'Fine',
    'Previous Due',
    'Total Due',
    'Remarks',
  ];

  const classMap = new Map<string, string>();
  classes.forEach((c) => classMap.set(c.id, c.name));

  let rowsData: any[][] = [];

  if (prefillCurrentStudents && students.length > 0) {
    rowsData = students
      .filter((s) => s.status === 'Active')
      .map((s) => {
        const className = classMap.get(s.classId) || 'Class 1';
        const admission = s.admissionFee ?? 2000;
        const reg = s.registrationFee ?? 1000;
        const tuition = s.tuitionFee ?? 18000;
        const exam = s.examFee ?? 1500;
        const convey = s.conveyFee ?? 0;
        const fine = s.lateFine ?? 0;
        const prevDue = s.previousDue ?? 0;
        // Total Due = Admission Fee + Registration Fee + Tuition Fee + Exam Fee + Conveyance Fee + Fine + Previous Due
        const total = admission + reg + tuition + exam + convey + fine + prevDue;

        return [
          s.admissionNo,
          s.fullName,
          s.fatherName,
          className,
          admission,
          reg,
          tuition,
          exam,
          convey,
          fine,
          prevDue,
          total,
          'Active student due',
        ];
      });
  } else {
    // Standard blank sample rows with exact columns
    rowsData = [
      ['SBSC-2025-101', 'Aarav Sharma', 'Rajesh Sharma', 'Class 10', 2000, 1000, 18000, 1500, 1200, 0, 1500, 25200, 'Sample student record'],
      ['SBSC-2025-102', 'Priya Verma', 'Anil Verma', 'Class 10', 0, 0, 18000, 1500, 0, 0, 0, 19500, 'Sample student record'],
      ['SBSC-2025-201', 'Aditya Singh', 'Suresh Singh', 'Class 8', 1500, 500, 15000, 1500, 1000, 250, 2000, 21750, 'Sample student record'],
    ];
  }

  const wsData = [headers, ...rowsData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 28 }, // Student ID / Admission Number
    { wch: 24 }, // Student Name
    { wch: 24 }, // Father's Name
    { wch: 14 }, // Class
    { wch: 16 }, // Admission Fee
    { wch: 18 }, // Registration Fee
    { wch: 16 }, // Tuition Fee
    { wch: 14 }, // Exam Fee
    { wch: 18 }, // Conveyance Fee
    { wch: 14 }, // Fine
    { wch: 16 }, // Previous Due
    { wch: 16 }, // Total Due
    { wch: 24 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Student_Dues_Master');

  // Add an Instructions / Guide sheet
  const guideWs = XLSX.utils.aoa_to_sheet([
    ['SBSC SCHOOL - HEAD-WISE DUE EXCEL UPLOAD INSTRUCTIONS'],
    [''],
    ['1. COLUMNS IN ORDER:'],
    ['   - Student ID / Admission Number: Scholar / Admission Number for direct matching.'],
    ['   - Student Name: Full student name.'],
    ['   - Father\'s Name: Father / Guardian name for 100% accurate identification.'],
    ['   - Class: Standard or grade name (e.g. Nursery, L.K.G., Class 1, Class 10).'],
    ['   - Admission Fee (प्रवेश शुल्क): One-time new admission charge.'],
    ['   - Registration Fee (पंजीकरण शुल्क): Registration charge.'],
    ['   - Tuition Fee (शिक्षण शुल्क): Annual or monthly academic tuition fee.'],
    ['   - Exam Fee (परीक्षा शुल्क): Examination fee.'],
    ['   - Conveyance Fee (वाहन शुल्क): Transport / bus charge.'],
    ['   - Fine (विलंब शुल्क): Late fee / penalties.'],
    ['   - Previous Due (पिछला बकाया): Carried-over arrears / old session balance.'],
    ['   - Total Due (कुल देय): Sum of all individual fee heads.'],
    [''],
    ['2. IMPORTANT CALCULATION FORMULA:'],
    ['   Total Due = Admission Fee + Registration Fee + Tuition Fee + Exam Fee + Conveyance Fee + Fine + Previous Due'],
    [''],
    ['3. SEPARATE HEAD IMPORT POLICY:'],
    ['   - The Previous Due amount is imported separately from all other Fee Heads.'],
    ['   - It is never mixed or conflated with Tuition, Admission, Registration, Exam, Conveyance, or Fine.'],
  ]);
  guideWs['!cols'] = [{ wch: 95 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Instructions');

  return wb;
};

export const downloadDueExcelTemplate = (
  students: Student[],
  classes: ClassInfo[],
  prefill: boolean = true
) => {
  const wb = generateDueExcelTemplate(students, classes, prefill);
  const filename = prefill
    ? `SBSC_Current_Students_Due_Template_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `SBSC_Blank_Headwise_Due_Template.xlsx`;
  XLSX.writeFile(wb, filename);
};
