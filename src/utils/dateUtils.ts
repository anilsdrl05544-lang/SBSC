/**
 * Date formatting and parsing utility strictly adhering to Indian official DD/MM/YYYY format.
 */

/**
 * Converts an Excel numeric serial date (e.g. 41044, 44561) to a JavaScript Date object.
 */
export function excelSerialToJSDate(serial: number): Date {
  // Excel epoch begins Jan 1 1900. Days offset from 1970 Unix epoch is 25569.
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);
  const minutes = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 60);
  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
}

/**
 * Converts any date representation (YYYY-MM-DD, ISO, DD-MM-YYYY, DD/MM/YYYY, Excel serial, or Date)
 * to strict DD/MM/YYYY format.
 * Example: '2012-05-15' -> '15/05/2012'
 */
export function formatDateToDDMMYYYY(dateInput?: unknown): string {
  if (dateInput === null || dateInput === undefined) return '-';

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Handle number (Excel serial or epoch)
  if (typeof dateInput === 'number') {
    if (dateInput > 10000 && dateInput < 80000) {
      const d = excelSerialToJSDate(dateInput);
      return formatDateToDDMMYYYY(d);
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return formatDateToDDMMYYYY(d);
  }

  const clean = String(dateInput).trim();
  if (!clean || clean === '-' || clean === 'undefined' || clean === 'null') return '-';

  // Excel serial number as string (e.g. "44561")
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num > 10000 && num < 80000) {
      return formatDateToDDMMYYYY(excelSerialToJSDate(num));
    }
  }

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    return clean.replace(/-/g, '/');
  }

  // YYYY-MM-DD or ISO timestamp
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.slice(0, 10).split('-');
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}/.test(clean)) {
    const parts = clean.slice(0, 10).split('/');
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  // Single digit day/month: e.g. D/M/YYYY or D-M-YYYY or D.M.YYYY
  const dmParts = clean.split(/[-/.]/);
  if (dmParts.length === 3) {
    if (dmParts[0].length === 4) {
      // YYYY-M-D
      const y = dmParts[0];
      const m = dmParts[1].padStart(2, '0');
      const d = dmParts[2].padStart(2, '0');
      return `${d}/${m}/${y}`;
    } else if (dmParts[2].length === 4) {
      // D-M-YYYY
      const d = dmParts[0].padStart(2, '0');
      const m = dmParts[1].padStart(2, '0');
      const y = dmParts[2];
      return `${d}/${m}/${y}`;
    }
  }

  // Fallback to Date object parsing
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // Ignore error
  }

  return clean;
}

/**
 * Normalizes input date to standard YYYY-MM-DD (suitable for HTML5 <input type="date">)
 * from DD/MM/YYYY, DD-MM-YYYY, Excel serial, or any parseable date.
 */
export function normalizeDateToYYYYMMDD(dateInput?: unknown): string {
  if (dateInput === null || dateInput === undefined) return '';

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput === 'number') {
    if (dateInput > 10000 && dateInput < 80000) {
      return normalizeDateToYYYYMMDD(excelSerialToJSDate(dateInput));
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return normalizeDateToYYYYMMDD(d);
  }

  const clean = String(dateInput).trim();
  if (!clean || clean === '-' || clean === 'undefined' || clean === 'null') return '';

  // Excel serial number as string
  if (/^\d{5}$/.test(clean)) {
    const num = Number(clean);
    if (num > 10000 && num < 80000) {
      return normalizeDateToYYYYMMDD(excelSerialToJSDate(num));
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // ISO timestamp e.g. 2024-04-01T00:00:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    return clean.slice(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmParts = clean.split(/[-/.]/);
  if (dmParts.length === 3) {
    if (dmParts[2].length === 4) {
      // DD/MM/YYYY or D/M/YYYY
      const day = dmParts[0].padStart(2, '0');
      const month = dmParts[1].padStart(2, '0');
      const year = dmParts[2];
      return `${year}-${month}-${day}`;
    } else if (dmParts[0].length === 4) {
      // YYYY/MM/DD
      const year = dmParts[0];
      const month = dmParts[1].padStart(2, '0');
      const day = dmParts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Return empty on failure
  }

  return '';
}

/**
 * Validates whether a string or input is a valid calendar date
 */
export function isValidDDMMYYYY(str: string): boolean {
  if (!str) return false;
  const clean = str.trim();
  const match = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1950 || year > 2100) return false;

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Robust gender parser handling English, Hindi, Abbreviations, and Common Variations
 */
export function normalizeGender(val: unknown): 'Male' | 'Female' | 'Other' {
  if (!val) return 'Male';
  const str = String(val).trim().toLowerCase();

  // Female variations
  if (
    str === 'f' ||
    str.startsWith('fem') ||
    str === 'girl' ||
    str === 'girls' ||
    str === 'g' ||
    str === 'woman' ||
    str === 'women' ||
    str === 'mahila' ||
    str === 'ladki' ||
    str === 'larki' ||
    str === 'kanya' ||
    str === 'balika' ||
    str.includes('लड़की') ||
    str.includes('महिला') ||
    str.includes('बालिका') ||
    str.includes('कन्या') ||
    str.includes('स्त्री')
  ) {
    return 'Female';
  }

  // Other variations
  if (
    str === 'o' ||
    str.startsWith('oth') ||
    str.includes('trans') ||
    str.includes('अन्य')
  ) {
    return 'Other';
  }

  // Male variations / Default
  return 'Male';
}
