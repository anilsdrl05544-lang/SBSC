import * as XLSX from 'xlsx';
import { Student, Teacher, AttendanceRecord, AttendanceStatus, FeePayment, ExamMark, ClassInfo, Exam } from '../types/school';
import { normalizeDateToYYYYMMDD, normalizeGender, formatDateToDDMMYYYY } from '../utils/dateUtils';

export type SheetEntityType = 'students' | 'attendance' | 'fees' | 'marks' | 'teachers';

export interface ParsedRowResult<T> {
  rowNumber: number;
  data: Partial<T>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SheetParseResult<T> {
  entityType: SheetEntityType;
  sheetName: string;
  totalRows: number;
  validRows: ParsedRowResult<T>[];
  invalidRows: ParsedRowResult<T>[];
  headers: string[];
}

// 1. Template Generation
export const generateSampleWorkbook = (
  entityType: SheetEntityType,
  classesList: ClassInfo[] = [],
  examsList: Exam[] = []
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  if (entityType === 'students') {
    const headers = [
      'Admission No *',
      'Roll No *',
      'Full Name *',
      'Class *',
      'Section *',
      'Gender (Male/Female/Other)',
      'DOB (DD/MM/YYYY)',
      'Father Name *',
      'Mother Name',
      'Guardian Phone *',
      'Address *',
      'Category (General/OBC/SC/ST/EWS)',
      'Blood Group',
      'Aadhaar No',
      'Emergency Contact',
      'Admission Date (DD/MM/YYYY)',
      'Total Due Fees',
      'Tuition Fees',
      'Admission Fees',
      'Registration Fees',
      'Exam Fees',
      'Convey Fees',
      'Late Fine',
    ];

    const sampleRows = [
      [
        'SBSC-2025-101',
        '101',
        'Aarav Sharma',
        classesList[0]?.name || 'Class 10',
        'A',
        'Male',
        '15/04/2010',
        'Rajesh Sharma',
        'Sunita Sharma',
        '9876543210',
        'Bairwa Nankar, Siddharthnagar, UP',
        'General',
        'B+',
        '458912348899',
        '9876543210',
        '01/04/2025',
        24500, // Total Due Fees
        18000, // Tuition Fees
        2000,  // Admission Fees
        1000,  // Registration Fees
        1500,  // Exam Fees
        1500,  // Convey Fees
        500,   // Late Fine
      ],
      [
        'SBSC-2025-102',
        '102',
        'Priya Verma',
        classesList[0]?.name || 'Class 10',
        'A',
        'Female',
        '22/08/2010',
        'Anil Verma',
        'Kiran Verma',
        '9876500001',
        'Civil Lines, Siddharthnagar, UP',
        'OBC',
        'O+',
        '889912345678',
        '9876500001',
        '01/04/2025',
        22000,
        18000,
        1500,
        500,
        1500,
        500,
        0,
      ],
      [
        'SBSC-2025-103',
        '103',
        'Mohammad Zaid',
        classesList[1]?.name || 'Class 9',
        'B',
        'Male',
        '10/01/2011',
        'Tariq Khan',
        'Fatima Khan',
        '9811223344',
        'Station Road, Naugarh, UP',
        'General',
        'A+',
        '123456789012',
        '9811223344',
        '02/04/2025',
        23500,
        18000,
        2000,
        1000,
        1500,
        1000,
        0,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Import_Template');
  } else if (entityType === 'attendance') {
    const headers = [
      'Admission No *',
      'Student Name',
      'Class *',
      'Section *',
      'Date (YYYY-MM-DD) *',
      'Status (Present/Absent/Leave/Sunday/Holiday/Half Day) *',
      'Remarks',
    ];

    const sampleRows = [
      ['SBSC-2025-101', 'Aarav Sharma', classesList[0]?.name || 'Class 10', 'A', '2026-09-01', 'Present', 'On time'],
      ['SBSC-2025-102', 'Priya Verma', classesList[0]?.name || 'Class 10', 'A', '2026-09-01', 'Present', 'Regular'],
      ['SBSC-2025-103', 'Mohammad Zaid', classesList[1]?.name || 'Class 9', 'B', '2026-09-01', 'Absent', 'Medical leave submitted'],
      ['SBSC-2025-101', 'Aarav Sharma', classesList[0]?.name || 'Class 10', 'A', '2026-09-07', 'Sunday', 'Weekly Off'],
      ['SBSC-2025-102', 'Priya Verma', classesList[0]?.name || 'Class 10', 'A', '2026-08-15', 'Holiday', 'Independence Day'],
      ['SBSC-2025-103', 'Mohammad Zaid', classesList[1]?.name || 'Class 9', 'B', '2026-09-02', 'Half Day', 'Left early with parent permission'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Import_Template');
  } else if (entityType === 'fees') {
    const headers = [
      'Admission No *',
      'Student Name',
      'Amount Paid (₹) *',
      'Payment Date (YYYY-MM-DD)',
      'Months Paid (Comma separated)',
      'Payment Method (Cash/UPI/Card/Cheque/Net Banking) *',
      'Transaction Ref / Cheque No',
      'Discount (₹)',
      'Fine (₹)',
      'Remarks',
    ];

    const sampleRows = [
      ['SBSC-2025-101', 'Aarav Sharma', '2000', '2026-09-01', 'September 2026', 'UPI', 'UPI/2938472910', '0', '0', 'Full monthly tuition paid'],
      ['SBSC-2025-102', 'Priya Verma', '3600', '2026-09-01', 'August 2026, September 2026', 'Cash', '', '0', '0', 'Quarterly fee clearance'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Fees_Import_Template');
  } else if (entityType === 'marks') {
    const headers = [
      'Exam Name *',
      'Admission No *',
      'Student Name',
      'Subject Name *',
      'Theory Marks (Obtained) *',
      'Practical / Internal Marks',
      'Max Total Marks *',
      'Remarks',
    ];

    const sampleRows = [
      [examsList[0]?.name || 'Periodic Assessment 1', 'SBSC-2025-101', 'Aarav Sharma', 'Mathematics', '72', '18', '100', 'Very good logical reasoning'],
      [examsList[0]?.name || 'Periodic Assessment 1', 'SBSC-2025-101', 'Aarav Sharma', 'Science', '68', '19', '100', 'Strong practical work'],
      [examsList[0]?.name || 'Periodic Assessment 1', 'SBSC-2025-102', 'Priya Verma', 'Mathematics', '78', '20', '100', 'Class topper in Math'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Marks_Import_Template');
  } else if (entityType === 'teachers') {
    const headers = [
      'Emp ID *',
      'Full Name *',
      'Designation *',
      'Qualification *',
      'Subjects (Comma separated) *',
      'Assigned Class',
      'Email *',
      'Phone *',
      'Monthly Salary (₹) *',
      'Join Date (YYYY-MM-DD)',
      'Gender (Male/Female)',
      'Experience (Years)',
      'Address',
    ];

    const sampleRows = [
      [
        'EMP-101',
        'Dr. Rameshwar Shukla',
        'PGT Mathematics',
        'M.Sc, B.Ed, Ph.D',
        'Mathematics, Statistics',
        classesList[0]?.name || 'Class 10',
        'rameshwar.shukla@sbscschool.edu.in',
        '9876543201',
        '45000',
        '2018-07-01',
        'Male',
        '12',
        'Teachers Colony, Siddharthnagar, UP',
      ],
      [
        'EMP-102',
        'Sunita Mishra',
        'TGT Science',
        'M.Sc Physics, B.Ed',
        'Science, Physics',
        classesList[1]?.name || 'Class 9',
        'sunita.mishra@sbscschool.edu.in',
        '9876543202',
        '38000',
        '2020-04-15',
        'Female',
        '8',
        'Station Road, Siddharthnagar, UP',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers_Import_Template');
  }

  return wb;
};

// 2. Download File Helpers
export const downloadWorkbook = (wb: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(wb, filename);
};

export const downloadCsvTemplate = (entityType: SheetEntityType, classesList: ClassInfo[], examsList: Exam[]) => {
  const wb = generateSampleWorkbook(entityType, classesList, examsList);
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SBSC_${entityType}_template.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadXlsxTemplate = (entityType: SheetEntityType, classesList: ClassInfo[], examsList: Exam[]) => {
  const wb = generateSampleWorkbook(entityType, classesList, examsList);
  downloadWorkbook(wb, `SBSC_${entityType}_template.xlsx`);
};

// 3. Parser & Normalizer
export const parseSheetFile = async (
  file: File,
  entityType: SheetEntityType,
  context: {
    classes: ClassInfo[];
    students: Student[];
    teachers: Teacher[];
    exams: Exam[];
  }
): Promise<SheetParseResult<any>> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0] || 'Sheet1';
  const ws = wb.Sheets[sheetName];

  // Convert to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

  // Get raw headers from first row
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headers: string[] = (aoa[0] || []).map((h: any) => String(h || '').trim());

  const validRows: ParsedRowResult<any>[] = [];
  const invalidRows: ParsedRowResult<any>[] = [];

  const cleanKey = (key: string) =>
    key
      .toLowerCase()
      .replace(/[\s_\-/().*[\]]/g, '')
      .trim();

  // Helper to map object keys flexibly
  const getVal = (row: Record<string, any>, possibleKeys: string[]): any => {
    const cleanedPossibles = possibleKeys.map(cleanKey);
    for (const rawKey of Object.keys(row)) {
      const cleaned = cleanKey(rawKey);
      if (cleanedPossibles.includes(cleaned)) {
        return row[rawKey];
      }
    }
    return '';
  };

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for 1-based index including header
    const errors: string[] = [];
    const warnings: string[] = [];

    if (entityType === 'students') {
      const admissionNo = String(getVal(row, ['admissionno', 'admno', 'admissionnumber', 'id', 'admission_no']) || '').trim();
      const fullName = String(getVal(row, ['fullname', 'studentname', 'name', 'student_name']) || '').trim();
      const rollNo = String(getVal(row, ['rollno', 'roll', 'rollnumber', 'roll_no']) || '1').trim();
      const classNameRaw = String(getVal(row, ['class', 'classid', 'classname', 'grade']) || '').trim();
      const section = String(getVal(row, ['section', 'sec']) || 'A').toUpperCase().trim();
      const genderRaw = getVal(row, ['gender', 'sex', 'ling', 'gender_mf', 'boygirl', 'लिंग', 'जेंडर', 'gender(male/female/other)']);
      const gender = normalizeGender(genderRaw);
      const fatherName = String(getVal(row, ['fathername', 'father', 'fathersname', 'father_name']) || '').trim();
      const motherName = String(getVal(row, ['mothername', 'mother', 'mothersname', 'mother_name']) || '').trim();
      const guardianPhone = String(getVal(row, ['guardianphone', 'phone', 'mobile', 'contact', 'parentphone', 'phone_number']) || '').trim();
      const address = String(getVal(row, ['address', 'residence', 'city', 'location']) || 'Riwa Nankar, Siddharthnagar, UP').trim();
      
      const rawDob = getVal(row, [
        'dob',
        'dateofbirth',
        'birthdate',
        'dob(dd/mm/yyyy)',
        'dobddmmyyyy',
        'dob(yyyymmdd)',
        'birth_date',
        'date_of_birth',
        'जन्मतिथि',
        'janmtithi',
        'janmatithi',
      ]);
      const dob = normalizeDateToYYYYMMDD(rawDob) || '2012-01-01';

      const bloodGroup = String(getVal(row, ['bloodgroup', 'blood', 'blood_group']) || 'B+').trim();
      const aadhaarNo = String(getVal(row, ['aadhaarno', 'aadhaar', 'uid', 'aadhar']) || '').trim();
      const category = String(getVal(row, ['category', 'caste']) || 'General').trim();
      const emergencyContact = String(getVal(row, ['emergencycontact', 'emergencyphone', 'emergency']) || guardianPhone).trim();
      
      const rawAdmissionDate = getVal(row, [
        'registrationdate',
        'regdate',
        'dateofregistration',
        'registration_date',
        'reg_date',
        'admissiondate',
        'dateofadmission',
        'admittedon',
        'admissiondate(dd/mm/yyyy)',
        'registrationdate(dd/mm/yyyy)',
        'पंजीकरणतिथि',
        'प्रवेशतिथि',
        'panjikarandate',
        'praveshtithi',
        'doadm',
        'doa',
        'admission',
      ]);
      const admissionDate = normalizeDateToYYYYMMDD(rawAdmissionDate) || new Date().toISOString().slice(0, 10);

      if (!admissionNo) errors.push('Admission Number is required.');
      if (!fullName) errors.push('Student Full Name is required.');
      if (!fatherName) errors.push("Father's Name is required.");
      if (!guardianPhone) errors.push('Guardian Phone number is required.');

      // Match class
      let matchedClass = context.classes.find(
        (c) =>
          c.name.toLowerCase() === classNameRaw.toLowerCase() ||
          c.id.toLowerCase() === classNameRaw.toLowerCase() ||
          c.name.toLowerCase().includes(classNameRaw.toLowerCase())
      );
      if (!matchedClass && context.classes.length > 0) {
        matchedClass = context.classes[0];
        if (classNameRaw) {
          warnings.push(`Class '${classNameRaw}' not found; defaulted to '${matchedClass.name}'.`);
        }
      }

      // Parse Yearly Due Fees & Breakdown: Tuition, Admission, Registration, Exam, Conveyance, Late Fine
      const parseFeeNum = (val: any): number | undefined => {
        if (val === '' || val === null || val === undefined) return undefined;
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        if (!cleaned) return undefined;
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
      };

      const rawTotalDue = getVal(row, ['totalduefees', 'totaldue', 'totalyearlydue', 'yearlydue', 'annualdue', 'totalfees', 'total_due_fees', 'duefees', 'totalfee']);
      const rawTuition = getVal(row, ['tuitionfees', 'tuitionfee', 'tuition', 'tutionfees', 'tutionfee', 'tution', 'annualtuition', 'monthlytuition']);
      const rawAdmission = getVal(row, ['admissionfees', 'admissionfee', 'admfee', 'admission_fee', 'admission']);
      const rawRegistration = getVal(row, ['registrationfees', 'registrationfee', 'regfee', 'registration_fee', 'registration']);
      const rawExam = getVal(row, ['examfees', 'examfee', 'examinationfee', 'exam_fee', 'exam']);
      const rawConvey = getVal(row, ['conveyfees', 'conveyfee', 'conveyancefees', 'conveyancefee', 'conveyance', 'convey', 'transportfee', 'busfee', 'convey_fees', 'transport']);
      const rawLateFine = getVal(row, ['latefine', 'latefees', 'fine', 'late_fine', 'penalty', 'latefee']);

      const tuitionFee = parseFeeNum(rawTuition);
      const admissionFee = parseFeeNum(rawAdmission);
      const registrationFee = parseFeeNum(rawRegistration);
      const examFee = parseFeeNum(rawExam);
      const conveyFee = parseFeeNum(rawConvey);
      const lateFine = parseFeeNum(rawLateFine);
      let totalYearlyDue = parseFeeNum(rawTotalDue);

      const hasBreakdown = [tuitionFee, admissionFee, registrationFee, examFee, conveyFee, lateFine].some((v) => v !== undefined);

      if (totalYearlyDue === undefined && hasBreakdown) {
        totalYearlyDue =
          (tuitionFee || 0) +
          (admissionFee || 0) +
          (registrationFee || 0) +
          (examFee || 0) +
          (conveyFee || 0) +
          (lateFine || 0);
      }

      const studentData: Partial<Student> = {
        admissionNo: admissionNo || `SBSC-${Date.now()}`,
        rollNo: rollNo || '1',
        fullName,
        classId: matchedClass?.id || 'c-1',
        section: section || 'A',
        gender,
        fatherName,
        motherName: motherName || 'N/A',
        guardianPhone,
        address,
        dob: dob || '2012-01-01',
        bloodGroup,
        aadhaarNo,
        category: (['General', 'OBC', 'SC', 'ST', 'EWS'].includes(category) ? category : 'General') as any,
        emergencyContact,
        admissionDate,
        status: 'Active',
        tuitionFee,
        admissionFee,
        registrationFee,
        examFee,
        conveyFee,
        lateFine,
        totalYearlyDue,
      };

      const result: ParsedRowResult<Student> = {
        rowNumber: rowNum,
        data: studentData,
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      if (result.isValid) validRows.push(result);
      else invalidRows.push(result);
    } else if (entityType === 'attendance') {
      const admissionNo = String(getVal(row, ['admissionno', 'admno', 'student_id', 'id']) || '').trim();
      const date = String(getVal(row, ['date', 'attendance_date', 'att_date']) || new Date().toISOString().slice(0, 10)).trim();
      const statusRaw = String(getVal(row, ['status', 'attendance', 'present_absent']) || 'Present').trim();
      const remarks = String(getVal(row, ['remarks', 'reason', 'note']) || '').trim();

      if (!admissionNo) errors.push('Admission No / Student ID is required.');

      const student = context.students.find(
        (s) => s.admissionNo.toLowerCase() === admissionNo.toLowerCase() || s.id === admissionNo
      );
      if (!student) {
        errors.push(`Student with Admission No '${admissionNo}' not found in registry.`);
      }

      let status: AttendanceStatus = 'Present';
      const sl = statusRaw.toLowerCase().trim();
      if (sl.startsWith('a') && !sl.includes('adm')) status = 'Absent';
      else if (sl.includes('sun')) status = 'Sunday';
      else if (sl.includes('hol') || sl.includes('fest') || sl.includes('vacation') || sl.includes('off')) status = 'Holiday';
      else if (sl.includes('half')) status = 'Half-Day';
      else if (sl.startsWith('l') && sl.includes('eav')) status = 'Leave';
      else if (sl.startsWith('l') && sl.includes('ate')) status = 'Late';
      else status = 'Present';

      const attData: Partial<AttendanceRecord> = {
        date,
        type: 'student',
        targetId: student?.id || '',
        classId: student?.classId || '',
        section: student?.section || 'A',
        status,
        remarks,
      };

      const result: ParsedRowResult<AttendanceRecord> = {
        rowNumber: rowNum,
        data: attData,
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      if (result.isValid) validRows.push(result);
      else invalidRows.push(result);
    } else if (entityType === 'fees') {
      const admissionNo = String(getVal(row, ['admissionno', 'admno', 'student_id']) || '').trim();
      const amountPaid = parseFloat(String(getVal(row, ['amountpaid', 'amount', 'paid', 'totalpaid']) || '0'));
      const date = String(getVal(row, ['paymentdate', 'date', 'paiddate']) || new Date().toISOString().slice(0, 10)).trim();
      const paymentMethodRaw = String(getVal(row, ['paymentmethod', 'method', 'mode', 'paymentmode']) || 'Cash').trim();
      const transactionRef = String(getVal(row, ['transactionref', 'ref', 'chequeno', 'reference', 'txnid']) || '').trim();
      const monthsPaidRaw = String(getVal(row, ['monthspaid', 'months', 'month', 'period']) || 'Current Month').trim();
      const discount = parseFloat(String(getVal(row, ['discount', 'concession']) || '0')) || 0;
      const fine = parseFloat(String(getVal(row, ['fine', 'latefee']) || '0')) || 0;
      const remarks = String(getVal(row, ['remarks', 'notes', 'comment']) || 'Bulk Sheet Imported Payment').trim();

      if (!admissionNo) errors.push('Admission Number is required.');
      if (isNaN(amountPaid) || amountPaid <= 0) errors.push('Valid Amount Paid greater than 0 is required.');

      const student = context.students.find(
        (s) => s.admissionNo.toLowerCase() === admissionNo.toLowerCase() || s.id === admissionNo
      );
      if (!student) {
        errors.push(`Student with Admission No '${admissionNo}' not found in database.`);
      }

      let paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Cheque' | 'Net Banking' = 'Cash';
      const pm = paymentMethodRaw.toLowerCase();
      if (pm.includes('upi') || pm.includes('gpay') || pm.includes('phonepe') || pm.includes('paytm')) paymentMethod = 'UPI';
      else if (pm.includes('card') || pm.includes('debit') || pm.includes('credit')) paymentMethod = 'Card';
      else if (pm.includes('cheque') || pm.includes('draft') || pm.includes('dd')) paymentMethod = 'Cheque';
      else if (pm.includes('net') || pm.includes('bank') || pm.includes('neft') || pm.includes('rtgs')) paymentMethod = 'Net Banking';

      const feeData: Partial<FeePayment> = {
        studentId: student?.id || '',
        studentName: student?.fullName || 'Imported Student',
        admissionNo: student?.admissionNo || admissionNo,
        classId: student?.classId || 'c-1',
        section: student?.section || 'A',
        date,
        monthsPaid: monthsPaidRaw.split(',').map((m) => m.trim()),
        amountPaid,
        paymentMethod,
        transactionRef,
        feeHeadBreakdown: [{ head: 'Tuition Fee (Sheet Import)', amount: amountPaid }],
        discount,
        fine,
        totalDueBefore: amountPaid,
        balanceRemaining: 0,
        remarks,
        receivedBy: 'Sheet Import Accountant',
        academicSession: '2025-2026',
      };

      const result: ParsedRowResult<FeePayment> = {
        rowNumber: rowNum,
        data: feeData,
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      if (result.isValid) validRows.push(result);
      else invalidRows.push(result);
    } else if (entityType === 'marks') {
      const examNameRaw = String(getVal(row, ['examname', 'exam', 'examid', 'testname']) || '').trim();
      const admissionNo = String(getVal(row, ['admissionno', 'admno', 'student_id', 'rollno']) || '').trim();
      const subjectName = String(getVal(row, ['subjectname', 'subject', 'sub']) || '').trim();
      const theoryMarks = parseFloat(String(getVal(row, ['theorymarks', 'theory', 'marks', 'obtained']) || '0'));
      const practicalMarks = parseFloat(String(getVal(row, ['practicalmarks', 'practical', 'internal']) || '0')) || 0;
      const maxMarks = parseFloat(String(getVal(row, ['maxmarks', 'max', 'totalmarks', 'maximum']) || '100')) || 100;
      const remarks = String(getVal(row, ['remarks', 'feedback']) || '').trim();

      if (!subjectName) errors.push('Subject Name is required.');
      if (isNaN(theoryMarks)) errors.push('Valid theory marks number is required.');

      const student = context.students.find(
        (s) => s.admissionNo.toLowerCase() === admissionNo.toLowerCase() || s.rollNo === admissionNo || s.id === admissionNo
      );
      if (!student) {
        errors.push(`Student '${admissionNo}' not found.`);
      }

      let exam = context.exams.find(
        (e) => e.name.toLowerCase() === examNameRaw.toLowerCase() || e.id === examNameRaw
      );
      if (!exam && context.exams.length > 0) {
        exam = context.exams[0];
        if (examNameRaw) warnings.push(`Exam '${examNameRaw}' not found; defaulted to '${exam.name}'.`);
      }

      const totalObtained = (theoryMarks || 0) + (practicalMarks || 0);
      const grade =
        totalObtained >= 90 ? 'A1' : totalObtained >= 80 ? 'A2' : totalObtained >= 70 ? 'B1' : totalObtained >= 60 ? 'B2' : totalObtained >= 50 ? 'C1' : totalObtained >= 40 ? 'C2' : totalObtained >= 33 ? 'D' : 'E';

      const markItemData = {
        examId: exam?.id || 'exam-1',
        studentId: student?.id || '',
        studentName: student?.fullName || '',
        rollNo: student?.rollNo || '1',
        classId: student?.classId || 'c-1',
        section: student?.section || 'A',
        subjectMark: {
          subjectId: `sub-${subjectName.toLowerCase().replace(/\s+/g, '-')}`,
          subjectName,
          theoryMarks,
          practicalMarks,
          maxMarks,
          obtainedMarks: totalObtained,
          grade,
          remarks,
        },
      };

      const result: ParsedRowResult<any> = {
        rowNumber: rowNum,
        data: markItemData,
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      if (result.isValid) validRows.push(result);
      else invalidRows.push(result);
    } else if (entityType === 'teachers') {
      const empId = String(getVal(row, ['empid', 'emp_id', 'teacherid', 'id']) || '').trim();
      const name = String(getVal(row, ['fullname', 'teachername', 'name']) || '').trim();
      const designation = String(getVal(row, ['designation', 'post', 'role']) || 'Teacher').trim();
      const qualification = String(getVal(row, ['qualification', 'degree', 'education']) || 'B.Ed').trim();
      const subjectsRaw = String(getVal(row, ['subjects', 'subject', 'teaching']) || 'General').trim();
      const assignedClass = String(getVal(row, ['assignedclass', 'class', 'classteacher']) || '').trim();
      const email = String(getVal(row, ['email', 'emailaddress', 'mail']) || `${empId.toLowerCase()}@sbscschool.edu.in`).trim();
      const phone = String(getVal(row, ['phone', 'mobile', 'contact']) || '').trim();
      const salary = parseFloat(String(getVal(row, ['monthlysalary', 'salary', 'pay']) || '30000')) || 30000;
      const joinDateRaw = getVal(row, ['joindate', 'dateofjoining', 'joiningdate']);
      const joinDate = normalizeDateToYYYYMMDD(joinDateRaw) || '2022-04-01';
      const genderRaw = getVal(row, ['gender', 'sex', 'ling', 'gender_mf', 'boygirl', 'लिंग', 'जेंडर']);
      const expYears = parseInt(String(getVal(row, ['experience', 'experienceyears', 'exp']) || '3'), 10) || 3;
      const address = String(getVal(row, ['address', 'residence']) || 'Riwa Nankar, Siddharthnagar, UP').trim();

      if (!empId) errors.push('Employee ID is required.');
      if (!name) errors.push('Teacher Name is required.');
      if (!phone) errors.push('Phone number is required.');

      const gender = (normalizeGender(genderRaw) === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female';
      const subjects = subjectsRaw.split(',').map((s) => s.trim());

      const teacherData: Partial<Teacher> = {
        empId,
        name,
        designation,
        qualification,
        subjects,
        assignedClass,
        email,
        phone,
        salary,
        joinDate,
        gender,
        experienceYears: expYears,
        address,
        status: 'Active',
      };

      const result: ParsedRowResult<Teacher> = {
        rowNumber: rowNum,
        data: teacherData,
        isValid: errors.length === 0,
        errors,
        warnings,
      };

      if (result.isValid) validRows.push(result);
      else invalidRows.push(result);
    }

    return null;
  });

  return {
    entityType,
    sheetName,
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    headers,
  };
};

// 4. Export Table Dataset to Excel Workbook
export const exportDatasetToExcel = (filename: string, sheetName: string, data: Record<string, any>[]) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};
