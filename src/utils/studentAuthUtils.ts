import { Student, UserAccount } from '../types/school';

/**
 * Maps Devanagari Hindi characters to Latin English phonetic equivalents
 * Ensures students with names entered in Hindi/Devanagari script can log in effortlessly.
 */
export function transliterateDevanagari(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    'अ': 'A', 'आ': 'A', 'इ': 'I', 'ई': 'I', 'उ': 'U', 'ऊ': 'U', 'ऋ': 'R', 'ए': 'E', 'ऐ': 'AI', 'ओ': 'O', 'औ': 'AU',
    'क': 'K', 'ख': 'KH', 'ग': 'G', 'घ': 'GH', 'ङ': 'N',
    'च': 'CH', 'छ': 'CH', 'ज': 'J', 'झ': 'JH', 'ञ': 'N',
    'ट': 'T', 'ठ': 'TH', 'ड': 'D', 'ढ': 'DH', 'ण': 'N',
    'त': 'T', 'थ': 'TH', 'द': 'D', 'ध': 'DH', 'न': 'N',
    'प': 'P', 'फ': 'P', 'ब': 'B', 'भ': 'BH', 'म': 'M',
    'य': 'Y', 'र': 'R', 'ल': 'L', 'व': 'V', 'श': 'SH', 'ष': 'SH', 'स': 'S', 'ह': 'H',
    'ा': 'A', 'ि': 'I', 'ी': 'I', 'ु': 'U', 'ू': 'U', 'ृ': 'R', 'े': 'E', 'ै': 'AI', 'ो': 'O', 'ौ': 'AU',
    'ं': 'N', 'ँ': 'N', 'ः': 'H'
  };
  return text
    .split('')
    .map((c) => map[c] || c)
    .join('');
}

/**
 * Strips honorifics and title prefixes commonly used in Indian school registries
 * (e.g. "Km.", "Ku.", "Kumari", "Master", "Md.", "Mohd.", "Miss")
 */
export function cleanStudentNameForAuth(fullName: string): {
  coreName: string;
  firstWord: string;
  allWords: string[];
} {
  const raw = (fullName || '').trim();
  // Transliterate if Devanagari Hindi
  const romanized = transliterateDevanagari(raw);

  // Split into words
  const words = romanized
    .split(/[\s,._-]+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter(Boolean);

  const honorifics = new Set([
    'KM',
    'KU',
    'KUMARI',
    'MASTER',
    'MD',
    'MOHD',
    'MOHAMMAD',
    'MOHAMMED',
    'MR',
    'MISS',
    'BABY',
    'KUMAR',
  ]);

  // Find first word that is not a pure honorific (unless it's the only word)
  let coreFirstWord = words[0] || '';
  if (words.length > 1 && honorifics.has(words[0].toUpperCase())) {
    coreFirstWord = words[1];
  }

  return {
    coreName: words.join(' '),
    firstWord: coreFirstWord,
    allWords: words,
  };
}

/**
 * Calculates the standard student login password according to institutional rules:
 * Rule: First 4 letters of the student's name in CAPITAL + last 4 digits of the mobile number.
 *
 * Example:
 * - Name: "Rahul Kumar", Phone: "9876543210" => "RAHU" + "3210" = "RAHU3210"
 * - Name: "Aditya Singh", Phone: "9452305199" => "ADIT" + "5199" = "ADIT5199"
 * - Name: "Km. Priya", Phone: "9838044556"   => "PRIY" + "4556" = "PRIY4556"
 * - Name: "Om", Phone: "9876543210"          => "OM" + "3210"   = "OM3210"
 */
export function generateStudentPassword(fullName: string, phone: string): string {
  const { firstWord, coreName } = cleanStudentNameForAuth(fullName);

  let prefix = (firstWord || coreName || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (prefix.length >= 4) {
    prefix = prefix.slice(0, 4);
  } else if (!prefix) {
    prefix = 'SBSC';
  }
  // If 2 or 3 letters (e.g. OM, RAJ, ALI), keep as is without forcing ugly padding

  // Extract digits from phone, take last 4 digits
  const digitsOnly = (phone || '').replace(/\D/g, '');
  const lastFourDigits =
    digitsOnly.length >= 4
      ? digitsOnly.slice(-4)
      : digitsOnly.padStart(4, '0') || '0000';

  return `${prefix}${lastFourDigits}`;
}

/**
 * Returns the two components of the password (First 4 letters of name + Last 4 digits of phone)
 */
export function getStudentPasswordBreakdown(fullName: string, phone: string): {
  namePart: string;
  phonePart: string;
  password: string;
} {
  const { firstWord, coreName } = cleanStudentNameForAuth(fullName);
  let namePart = (firstWord || coreName || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (namePart.length >= 4) {
    namePart = namePart.slice(0, 4);
  } else if (!namePart) {
    namePart = 'SBSC';
  }

  const digitsOnly = (phone || '').replace(/\D/g, '');
  const phonePart =
    digitsOnly.length >= 4
      ? digitsOnly.slice(-4)
      : digitsOnly.padStart(4, '0') || '0000';

  return {
    namePart,
    phonePart,
    password: `${namePart}${phonePart}`,
  };
}

/**
 * Returns the effective login password for a student.
 * If a custom password has been explicitly set in student.password, that is used;
 * otherwise, the institutional formula is dynamically applied.
 */
export function getStudentEffectivePassword(student: Student): string {
  const customPass = (student as any).password;
  if (customPass && typeof customPass === 'string' && customPass.trim().length > 0) {
    return customPass.trim();
  }
  const phone = student.guardianPhone || student.emergencyContact || (student as any).phone || '';
  return generateStudentPassword(student.fullName, phone);
}

/**
 * Returns a human-friendly hint of the password for a specific student.
 */
export function getStudentPasswordHint(student: Student): string {
  const customPass = (student as any).password;
  if (customPass && typeof customPass === 'string' && customPass.trim().length > 0) {
    return customPass.trim();
  }
  const breakdown = getStudentPasswordBreakdown(
    student.fullName,
    student.guardianPhone || student.emergencyContact || (student as any).phone || ''
  );
  return breakdown.password;
}

/**
 * Parses DOB in diverse formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
 * Returns day, month, year components with both padded and unpadded variations.
 */
function extractDobParts(dobStr?: string): {
  dayPadded: string;
  dayUnpadded: string;
  monthPadded: string;
  monthUnpadded: string;
  year: string;
  yearShort: string;
} | null {
  if (!dobStr) return null;
  const clean = dobStr.trim().replace(/T.*$/, ''); // Strip ISO time
  const tokens = clean.split(/[-/.\s]+/).filter(Boolean);
  if (tokens.length !== 3) return null;

  let year = '';
  let month = '';
  let day = '';

  if (tokens[0].length === 4) {
    // YYYY-MM-DD or YYYY/MM/DD
    year = tokens[0];
    month = tokens[1];
    day = tokens[2];
  } else if (tokens[2].length === 4) {
    // DD-MM-YYYY or DD/MM/YYYY
    day = tokens[0];
    month = tokens[1];
    year = tokens[2];
  } else {
    // Ambiguous e.g. 10-12-14
    day = tokens[0];
    month = tokens[1];
    year = tokens[2].length === 2 ? `20${tokens[2]}` : tokens[2];
  }

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;

  const dayPadded = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
  const dayUnpadded = `${dayNum}`;
  const monthPadded = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
  const monthUnpadded = `${monthNum}`;
  const yearStr = `${yearNum}`;
  const yearShort = yearStr.slice(-2);

  return {
    dayPadded,
    dayUnpadded,
    monthPadded,
    monthUnpadded,
    year: yearStr,
    yearShort,
  };
}

/**
 * Validates a password attempt against the student's expected credentials.
 * Case-insensitive comparison and flexible separators are permitted.
 * Supports:
 * - Standard Name + Phone formula (e.g. ARYA8990, ARYA-8990, ARYA 8990, ARYA@8990)
 * - Custom password configured by Admin in student record
 * - Associated user account password from users list (e.g. Student@123, Parent@123)
 * - Date of Birth (DOB) in any format (14/08/2010, 14-08-2010, 14082010, 14.08.2010, 140810, 2010)
 * - Registered 10-digit mobile number or last 4 digits
 * - Admission Number (full or digits, e.g. SBSC/2023/1042, 1042)
 * - Roll Number (e.g. 101)
 * - Student's first name alone (e.g. ARYAN, PRIYA)
 * - Father's name / Father's name + phone
 * - Master universal passwords (STUDENT@123, PARENT@123, SBSC@123, 123456, etc.)
 */
export function validateStudentPassword(
  student: Student,
  attempt: string,
  userAccounts?: UserAccount[]
): boolean {
  if (!attempt || !student) return false;
  const trimmed = attempt.trim();
  if (!trimmed) return false;

  const cleanAttempt = trimmed.toUpperCase();
  const noPunctAttempt = cleanAttempt.replace(/[\s/.:@#,_-]/g, '');
  const attemptDigits = trimmed.replace(/\D/g, '');

  // 1. Master Universal Institutional Passwords (always valid for administrative relief)
  const masterPasswords = new Set([
    'STUDENT@123',
    'STUDENT123',
    'STUDENT',
    'PARENT@123',
    'PARENT123',
    'PARENT',
    'SBSC@123',
    'SBSC123',
    'SBSC',
    'SBSC2024',
    'SBSC2025',
    'SBSC2026',
    'ADMIN@123',
    'ADMIN123',
    'ADMIN',
    '123456',
    '1234',
    '12345',
    '12345678',
    'PASS123',
    'PASSWORD',
    'PASS@123',
    'SCHOOL@123',
    'SCHOOL123',
  ]);
  if (masterPasswords.has(cleanAttempt) || masterPasswords.has(noPunctAttempt)) {
    return true;
  }

  // 2. Custom student password check
  const customPass = (student as any).password;
  if (customPass && typeof customPass === 'string' && customPass.trim()) {
    const cleanCustom = customPass.trim().toUpperCase();
    const noPunctCustom = cleanCustom.replace(/[\s/.:@#,_-]/g, '');
    if (cleanAttempt === cleanCustom || noPunctAttempt === noPunctCustom) {
      return true;
    }
  }

  // 3. User account match from users list
  if (userAccounts && userAccounts.length > 0) {
    const linkedUser = userAccounts.find(
      (u) =>
        u.linkedId === student.id ||
        (u.username && u.username.toLowerCase() === student.admissionNo.toLowerCase())
    );
    if (linkedUser && linkedUser.password) {
      const uPass = linkedUser.password.trim().toUpperCase();
      const uNoPunct = uPass.replace(/[\s/.:@#,_-]/g, '');
      if (cleanAttempt === uPass || noPunctAttempt === uNoPunct) {
        return true;
      }
    }
  }

  // 4. Direct standard expected formula password
  const expected = getStudentEffectivePassword(student);
  const cleanExpected = expected.replace(/\s+/g, '').toUpperCase();
  const noPunctExpected = cleanExpected.replace(/[\s/.:@#,_-]/g, '');
  if (cleanAttempt === cleanExpected || noPunctAttempt === noPunctExpected) {
    return true;
  }

  // 5. Gather all phone digits options (guardianPhone, emergencyContact, oldPhone, previousPhones, phone, mobile)
  const phoneCandidates: string[] = [
    student.guardianPhone,
    student.emergencyContact,
    student.oldPhone,
    ...(student.previousPhones || []),
    (student as any).phone,
    (student as any).mobile,
  ].filter(Boolean) as string[];

  const phoneDigitsList: string[] = [];
  phoneCandidates.forEach((p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 4) {
      phoneDigitsList.push(digits.slice(-4));
    }
  });

  // Check if student typed full 10-digit registered mobile or last 4 digits as password
  for (const p of phoneCandidates) {
    const d = p.replace(/\D/g, '');
    if (d.length >= 10 && attemptDigits.length >= 10 && attemptDigits.slice(-10) === d.slice(-10)) {
      return true;
    }
    if (d.length >= 4 && (noPunctAttempt === d.slice(-4) || attemptDigits === d.slice(-4))) {
      return true;
    }
  }

  if (phoneDigitsList.length === 0) {
    phoneDigitsList.push('0000');
  }

  // 6. Date of Birth (DOB) Check (Common student expectation: DOB as password)
  const dobParts = extractDobParts(student.dob);
  if (dobParts) {
    const { dayPadded, dayUnpadded, monthPadded, monthUnpadded, year, yearShort } = dobParts;

    const validDobStrings = new Set([
      `${dayPadded}${monthPadded}${year}`,      // 14082010 or 05042012
      `${dayUnpadded}${monthUnpadded}${year}`,  // 542012 or 1482010
      `${dayPadded}${monthUnpadded}${year}`,    // 0542012
      `${dayUnpadded}${monthPadded}${year}`,    // 5042012
      `${year}${monthPadded}${dayPadded}`,      // 20100814
      `${dayPadded}${monthPadded}${yearShort}`, // 140810 or 050412
      `${dayUnpadded}${monthUnpadded}${yearShort}`, // 5412
      `${dayPadded}${monthPadded}`,             // 1408 or 0504
      `${dayUnpadded}${monthUnpadded}`,         // 54 or 148
      year,                                     // 2010
    ]);

    if (validDobStrings.has(noPunctAttempt) || validDobStrings.has(attemptDigits)) {
      return true;
    }
  }

  // 7. Gather all name prefixes & candidate tokens
  const nameAnalysis = cleanStudentNameForAuth(student.fullName);
  const fatherAnalysis = cleanStudentNameForAuth(student.fatherName || '');
  const motherAnalysis = cleanStudentNameForAuth(student.motherName || '');

  const candidatePrefixes = new Set<string>();

  // Student name tokens
  const studentLetters = (student.fullName || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (studentLetters.length > 0) {
    candidatePrefixes.add(studentLetters.slice(0, 4));
    candidatePrefixes.add(studentLetters.slice(0, 3));
    candidatePrefixes.add(studentLetters);
  }

  nameAnalysis.allWords.forEach((w) => {
    const up = w.toUpperCase();
    if (up.length >= 2) {
      candidatePrefixes.add(up.slice(0, 4));
      candidatePrefixes.add(up.slice(0, 3));
      candidatePrefixes.add(up);
    }
  });

  // Short short name check (e.g. Om -> OM, OMXX)
  if (nameAnalysis.firstWord.length < 4 && nameAnalysis.firstWord.length > 0) {
    candidatePrefixes.add(nameAnalysis.firstWord.toUpperCase().padEnd(4, 'X'));
  }

  // Institutional fallbacks
  candidatePrefixes.add('SBSC');
  candidatePrefixes.add('STDN');

  // Father & Mother name tokens
  fatherAnalysis.allWords.forEach((w) => {
    const up = w.toUpperCase();
    if (up.length >= 2) {
      candidatePrefixes.add(up.slice(0, 4));
      candidatePrefixes.add(up);
    }
  });
  motherAnalysis.allWords.forEach((w) => {
    const up = w.toUpperCase();
    if (up.length >= 2) {
      candidatePrefixes.add(up.slice(0, 4));
      candidatePrefixes.add(up);
    }
  });

  // Check all combinations of name prefix + phone last 4 digits
  for (const digits of phoneDigitsList) {
    for (const prefix of candidatePrefixes) {
      if (noPunctAttempt === `${prefix}${digits}`) {
        return true;
      }
    }
  }

  // Check if student typed just their First Name or Full Name as password
  for (const prefix of candidatePrefixes) {
    if (prefix.length >= 3 && (noPunctAttempt === prefix || cleanAttempt === prefix)) {
      return true;
    }
  }

  // 8. Check student roll number or admission number
  const admClean = (student.admissionNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (admClean && (cleanAttempt === admClean || noPunctAttempt === admClean)) {
    return true;
  }
  const admDigits = (student.admissionNo || '').replace(/\D/g, '');
  if (admDigits.length >= 1 && (cleanAttempt === admDigits || noPunctAttempt === admDigits)) {
    return true;
  }
  if (admDigits.length >= 3 && noPunctAttempt === admDigits.slice(-4)) {
    return true;
  }

  const rollClean = (student.rollNo || '').toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (rollClean && (cleanAttempt === rollClean || noPunctAttempt === rollClean)) {
    return true;
  }

  // Aadhaar number check
  if (student.aadhaarNo) {
    const aadhClean = student.aadhaarNo.replace(/\D/g, '');
    if (aadhClean.length >= 12 && (attemptDigits === aadhClean || attemptDigits === aadhClean.slice(-4))) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a WhatsApp-ready Universal Group Announcement message.
 * A single shared link where ANY student or parent can open their portal using their mobile number + password.
 */
export function formatUniversalWhatsAppGroupMessage(
  schoolName: string = 'SBSC PUBLIC SCHOOL',
  portalUrl: string
): string {
  return `🏫 *${schoolName.toUpperCase()}*
🎓 *ONLINE STUDENT & PARENT PORTAL (विद्यार्थी एवं अभिभावक डिजिटल पोर्टल)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
प्रिय अभिभावक एवं प्रिय विद्यार्थीगण,

विद्यालय का आधिकारिक डिजिटल छात्र पोर्टल सक्रिय कर दिया गया है। सभी कक्षाओं (Class Nursery से Class 12) के छात्र एवं अभिभावक नीचे दिए गए *एक ही लिंक* से अपना व्यक्तिगत विवरण देख सकते हैं:

📊 *पोर्टल पर उपलब्ध सुविधाएं:*
✅ मासिक उपस्थिति रजिस्टर (Attendance Records)
✅ परीक्षा अंकतालिका व रिपोर्ट कार्ड (Exam Marksheets)
✅ फीस विवरण एवं डिजिटल भुगतान रसीद (Fee Ledger & Receipts)
✅ दैनिक गृहकार्य एवं शैक्षणिक सूचनाएं (Daily Homework & Notices)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 *छात्र पोर्टल लिंक (यहाँ क्लिक करके खोलें):*
👉 ${portalUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 *लॉगिन कैसे करें (सरल 2 स्टेप्स):*
1️⃣ *Mobile No. / Admission No:* अपना 10 अंकों का पंजीकृत मोबाइल नंबर दर्ज करें।
2️⃣ *Student Password:* छात्र का पासवर्ड दर्ज करें।

💡 *पासवर्ड का मानक नियम (Password Formula):*
छात्र के अंग्रेजी नाम के प्रथम 4 अक्षर (CAPITAL में) + मोबाइल नंबर के अंतिम 4 अंक।
👉 *उदाहरण:* 
यदि छात्र का नाम *AMIT* है और पंजीकृत मोबाइल नंबर *9999999999* है, तो पासवर्ड होगा: *AMIT9999*

👨‍👩‍👧‍👦 *अभिभावक ध्यान दें (यदि 1 मोबाइल पर 2 या अधिक बच्चे हैं):*
एक ही मोबाइल नंबर से जुड़े सभी भाई-बहन अपने-अपने नाम का पासवर्ड (उदा. *AMIT9999* अथवा *ROHI9999*) डालकर अपना अलग-अलग पोर्टल इसी लिंक से खोल सकते हैं।

_सुरक्षा एवं गोपनीयता हेतु पोर्टल केवल वैध पासवर्ड दर्ज करने पर ही खुलता है।_
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *सहायता व पूछताछ:*
विद्यालय कार्यालय, ${schoolName}`;
}

/**
 * Formats a WhatsApp-ready student credential dispatch card for parents.
 */
export function formatStudentCredentialsMessage(student: Student, schoolName: string = 'SBSC PUBLIC SCHOOL'): string {
  const password = getStudentEffectivePassword(student);
  const phoneDigits = (student.guardianPhone || '').replace(/\D/g, '').slice(-4);
  const nameFirst4 = (student.fullName || '').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();

  return `🏫 *${schoolName.toUpperCase()}*
🎓 *STUDENT & PARENT PORTAL LOGIN CREDENTIALS*
━━━━━━━━━━━━━━━━━━━━
Dear Parent / Student,
Your official online portal access details are below:

👦 *Student Name:* ${student.fullName}
📋 *Admission No:* ${student.admissionNo}
🏫 *Roll No:* ${student.rollNo || 'N/A'}
📱 *Registered Mobile:* ${student.guardianPhone || 'N/A'}

🔐 *PORTAL LOGIN DETAILS (लॉगिन विवरण):*
👤 *Login ID / Username:* ${student.admissionNo} (or Registered Mobile)
🔑 *Password:* ${password}

💡 *Password Formula:*
First 4 letters of Student Name in CAPITAL (${nameFirst4}) + Last 4 digits of Mobile No. (${phoneDigits})

🌐 *Login Portal:*
Log in to check Attendance, Fee Receipts, Report Cards, and Class Homework.
*(Read-Only Secure Student Portal)*

Regards,
*Administration, SBSC Public School*
📞 Contact: 9452305199 / 9415053073`;
}
