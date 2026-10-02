import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  FileText,
  Users,
  CalendarCheck,
  Receipt,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Award,
  UserCheck,
  CreditCard,
  Scroll,
  Printer,
  Download,
  Filter,
  Eye,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { PrintPreviewModal } from './PrintPreviewModal';

// Templates
import { StudentProfilePdf } from './templates/StudentProfilePdf';
import { StudentListPdf } from './templates/StudentListPdf';
import { AttendanceReportPdf } from './templates/AttendanceReportPdf';
import { StudentMonthlyAttendanceReportPdf } from './templates/StudentMonthlyAttendanceReportPdf';
import { FeeReceiptPdf } from './templates/FeeReceiptPdf';
import { FeeCollectionReportPdf } from './templates/FeeCollectionReportPdf';
import { FeeDuesReportPdf } from './templates/FeeDuesReportPdf';
import { ExamResultLedgerPdf } from './templates/ExamResultLedgerPdf';
import { MarksheetReportCardPdf } from './templates/MarksheetReportCardPdf';
import { TeacherStaffReportPdf } from './templates/TeacherStaffReportPdf';
import { StaffAttendanceReportPdf } from './templates/StaffAttendanceReportPdf';
import { StaffMonthlyAttendanceReportPdf } from './templates/StaffMonthlyAttendanceReportPdf';
import { SalarySlipPdf } from './templates/SalarySlipPdf';
import { CertificatePdf } from './templates/CertificatePdf';
import { AllClassesDailyAttendanceReportPdf } from './templates/AllClassesDailyAttendanceReportPdf';
import { AllClassesMonthlyAttendanceReportPdf } from './templates/AllClassesMonthlyAttendanceReportPdf';

export type ReportType =
  | 'all_classes_daily_attendance'
  | 'all_classes_monthly_attendance'
  | 'student_profile'
  | 'student_list'
  | 'attendance'
  | 'student_monthly_attendance'
  | 'staff_attendance'
  | 'staff_monthly_attendance'
  | 'fee_receipt'
  | 'fee_collection'
  | 'fee_dues'
  | 'exam_result'
  | 'marksheet'
  | 'teacher_report'
  | 'salary_slip'
  | 'certificate';

interface ReportCenterProps {
  onNavigate?: (module: string) => void;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ onNavigate }) => {
  const { students, teachers, classes, feePayments, exams, examMarks, salaries, certificates, settings } = useSchool();

  const [selectedReport, setSelectedReport] = useState<ReportType>('marksheet');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-01');
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 1 - 12
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>(feePayments[0]?.id || '');
  const [selectedSalaryId, setSelectedSalaryId] = useState<string>(salaries[0]?.id || '');
  const [selectedCertificateId, setSelectedCertificateId] = useState<string>(certificates[0]?.id || '');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const reportItems = [
    {
      id: 'marksheet' as ReportType,
      title: 'Student Marksheet / Report Card',
      desc: 'CBSE-standard academic grade sheet with scholastic & co-scholastic scores, attendance, rank & remarks.',
      icon: GraduationCap,
      category: 'Academic',
      badge: 'CBSE Standard',
      color: 'from-blue-600 to-indigo-700',
    },
    {
      id: 'student_profile' as ReportType,
      title: 'Student Profile & Bio-Data',
      desc: 'Complete student dossier with photo, parents, contact, blood group, admission history and clearance.',
      icon: FileText,
      category: 'Students',
      badge: 'Individual',
      color: 'from-indigo-600 to-cyan-700',
    },
    {
      id: 'student_list' as ReportType,
      title: 'Class-Wise Student List',
      desc: 'Master enrolled students register filtered by class and section with roll numbers and parent contacts.',
      icon: Users,
      category: 'Students',
      badge: 'Class Master',
      color: 'from-sky-600 to-blue-700',
    },
    {
      id: 'all_classes_daily_attendance' as ReportType,
      title: 'All Classes Daily Attendance (One PDF)',
      desc: 'Institutional consolidated daily register with all classes master summary, strength KPIs, and student rosters in 1 document.',
      icon: CalendarCheck,
      category: 'Attendance',
      badge: '⚡ All Classes (One PDF)',
      color: 'from-blue-900 to-indigo-950',
    },
    {
      id: 'all_classes_monthly_attendance' as ReportType,
      title: 'All Classes Monthly Attendance (One PDF)',
      desc: 'Complete institutional monthly muster roll with all classes comparative evaluation matrix and 31-day CBSE registers in 1 PDF.',
      icon: CalendarCheck,
      category: 'Attendance',
      badge: '⚡ All Classes (A4 Landscape)',
      color: 'from-indigo-900 to-slate-950',
    },
    {
      id: 'attendance' as ReportType,
      title: 'Student Daily Attendance Register',
      desc: 'Daily student attendance register with present, absent, leaves, Sunday/Holiday, and percentages.',
      icon: CalendarCheck,
      category: 'Attendance',
      badge: 'Daily Register',
      color: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'student_monthly_attendance' as ReportType,
      title: 'Student Monthly Attendance Register (CBSE Matrix)',
      desc: 'Full-month student attendance matrix (Days 1 to 31) with P, A, L, Sun, Hol, Half-Day, total counts, and % in landscape.',
      icon: CalendarCheck,
      category: 'Attendance',
      badge: 'Monthly Matrix (A4 Landscape)',
      color: 'from-emerald-700 to-teal-800',
    },
    {
      id: 'staff_attendance' as ReportType,
      title: 'Staff Daily Attendance Register',
      desc: 'Official daily staff duty ledger with in-time, designation, present, leave, Sunday/Holiday, and signature columns.',
      icon: UserCheck,
      category: 'Staff',
      badge: 'Daily Ledger',
      color: 'from-teal-700 to-emerald-900',
    },
    {
      id: 'staff_monthly_attendance' as ReportType,
      title: 'Staff Monthly Attendance Muster Roll',
      desc: 'Institutional monthly muster roll with faculty daily duty records, leaves, payable duty days, and official sign-offs.',
      icon: UserCheck,
      category: 'Staff',
      badge: 'Muster Roll (A4 Landscape)',
      color: 'from-teal-800 to-cyan-900',
    },
    {
      id: 'fee_receipt' as ReportType,
      title: 'Fee Payment Receipt Voucher',
      desc: 'Itemized fee invoice with student copy, receipt serial no, fine, discount, and authentication seal.',
      icon: Receipt,
      category: 'Finance',
      badge: 'Voucher',
      color: 'from-emerald-700 to-green-800',
    },
    {
      id: 'fee_collection' as ReportType,
      title: 'Fee Collection & Revenue Report',
      desc: 'Detailed income register categorized by date, cash, UPI, bank transfer, and total deposits.',
      icon: TrendingUp,
      category: 'Finance',
      badge: 'Revenue',
      color: 'from-amber-600 to-orange-700',
    },
    {
      id: 'fee_dues' as ReportType,
      title: 'Class-Wise Outstanding Fee & Dues List (PDF)',
      desc: 'Class-wise student dues register, executive defaulters matrix, father names, phone numbers, and subtotal ledgers.',
      icon: AlertTriangle,
      category: 'Finance',
      badge: 'Class-Wise PDF',
      color: 'from-rose-600 to-red-700',
    },
    {
      id: 'exam_result' as ReportType,
      title: 'Exam Result Gazette & Ledger',
      desc: 'Full class result compilation with total marks, subject matrix, pass percentage, and top rankers.',
      icon: Award,
      category: 'Academic',
      badge: 'Gazette',
      color: 'from-purple-600 to-indigo-800',
    },
    {
      id: 'teacher_report' as ReportType,
      title: 'Teacher & Staff Directory',
      desc: 'Institutional staff list with designations, qualifications, subjects, phone numbers, and pay bands.',
      icon: UserCheck,
      category: 'Staff',
      badge: 'Directory',
      color: 'from-teal-600 to-cyan-800',
    },
    {
      id: 'salary_slip' as ReportType,
      title: 'Staff Salary Slip / Payslip',
      desc: 'Official monthly pay slip with basic earnings, allowances, PF/tax deductions, and net disbursed salary.',
      icon: CreditCard,
      category: 'Payroll',
      badge: 'Confidential',
      color: 'from-blue-700 to-slate-800',
    },
    {
      id: 'certificate' as ReportType,
      title: 'Transfer & Character Certificates',
      desc: 'Government recognized Transfer Certificates (TC), Character Certificates, and Bonafide letters with QR code.',
      icon: Scroll,
      category: 'Certificates',
      badge: 'Official Seal',
      color: 'from-amber-700 to-yellow-900',
    },
  ];

  // Current entity lookups
  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const selectedReceipt = feePayments.find((p) => p.id === selectedReceiptId) || feePayments[0];
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  const selectedSalary = salaries.find((s) => s.id === selectedSalaryId) || salaries[0];
  const selectedCertificate = certificates.find((c) => c.id === selectedCertificateId) || certificates[0];

  const studentExamMark =
    examMarks.find((m) => m.examId === selectedExam?.id && m.studentId === selectedStudent?.id) ||
    examMarks.find((m) => m.studentId === selectedStudent?.id) ||
    examMarks[0];

  // Render active report component
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'marksheet':
        return studentExamMark ? (
          <MarksheetReportCardPdf examMark={studentExamMark} exam={selectedExam} />
        ) : (
          <div className="p-8 text-center text-slate-500">No mark record found for this student.</div>
        );
      case 'student_profile':
        return selectedStudent ? (
          <StudentProfilePdf student={selectedStudent} />
        ) : null;
      case 'student_list':
        const filteredList = students
          .filter((s) => {
            if (selectedClassId && s.classId !== selectedClassId) return false;
            if (selectedSection && s.section !== selectedSection) return false;
            return true;
          })
          .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
        return (
          <StudentListPdf
            students={filteredList.length > 0 ? filteredList : students}
            selectedClass={selectedClass}
            section={selectedSection}
          />
        );
      case 'all_classes_daily_attendance':
        return <AllClassesDailyAttendanceReportPdf date={selectedDate} />;
      case 'all_classes_monthly_attendance':
        return (
          <AllClassesMonthlyAttendanceReportPdf
            year={selectedYear}
            month={selectedMonth}
          />
        );
      case 'attendance':
        return (
          <AttendanceReportPdf
            date={selectedDate}
            selectedClass={selectedClass}
            section={selectedSection}
          />
        );
      case 'student_monthly_attendance':
        return (
          <StudentMonthlyAttendanceReportPdf
            year={selectedYear}
            month={selectedMonth}
            selectedClass={selectedClass}
            section={selectedSection}
          />
        );
      case 'staff_attendance':
        return <StaffAttendanceReportPdf date={selectedDate} />;
      case 'staff_monthly_attendance':
        return (
          <StaffMonthlyAttendanceReportPdf
            year={selectedYear}
            month={selectedMonth}
          />
        );
      case 'fee_receipt':
        return selectedReceipt ? <FeeReceiptPdf payment={selectedReceipt} /> : null;
      case 'fee_collection':
        return <FeeCollectionReportPdf />;
      case 'fee_dues':
        return <FeeDuesReportPdf selectedClass={selectedClass} initialClassId={selectedClass?.id} />;
      case 'exam_result':
        return selectedExam ? (
          <ExamResultLedgerPdf exam={selectedExam} selectedClass={selectedClass} />
        ) : null;
      case 'teacher_report':
        return <TeacherStaffReportPdf teachers={teachers} />;
      case 'salary_slip':
        return selectedSalary ? <SalarySlipPdf salaryRecord={selectedSalary} /> : null;
      case 'certificate':
        return selectedCertificate ? <CertificatePdf certificate={selectedCertificate} /> : null;
      default:
        return null;
    }
  };

  const getReportFileName = () => {
    return `SBSC-${selectedReport.toUpperCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Printer className="w-3.5 h-3.5" />
            <span>Complete A4 PDF Printing & Export Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Official School Reports & Documents</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Generate and export crisp, high-resolution A4 printable documents for {settings.schoolName}, formatted with official headers, seal, barcodes, and principal signatures.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-2 bg-blue-900/90 hover:bg-blue-800 text-white font-semibold px-4 py-3 rounded-xl border border-blue-700/60 shadow-md text-xs transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import Mass Sheets</span>
            </button>
          )}

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-lg transition active:scale-95"
          >
            <Eye className="w-5 h-5" />
            <span>Full A4 Preview & Download PDF</span>
          </button>
        </div>
      </div>

      {/* Grid of 11 Report Types */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-900" />
          <span>Select Document Type to Generate (11 Official Reports Available)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {reportItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedReport === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedReport(item.id)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-900 bg-blue-50/70 shadow-md ring-2 ring-blue-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${item.color} shadow-xs`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">{item.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-400 uppercase">{item.category}</span>
                  <span className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>
                    {isSelected ? '✓ Active Report' : 'Click to Load'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Filter Controls Bar for Active Report */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-900" />
          <span>Report Filters & Generation Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Class Filter */}
          {(selectedReport === 'student_list' ||
            selectedReport === 'attendance' ||
            selectedReport === 'student_monthly_attendance' ||
            selectedReport === 'fee_dues' ||
            selectedReport === 'exam_result') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Class:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section Filter */}
          {(selectedReport === 'student_list' || selectedReport === 'attendance' || selectedReport === 'student_monthly_attendance') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Section:</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
          )}

          {/* Month Selector */}
          {(selectedReport === 'student_monthly_attendance' ||
            selectedReport === 'staff_monthly_attendance' ||
            selectedReport === 'all_classes_monthly_attendance') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
          )}

          {/* Year Selector */}
          {(selectedReport === 'student_monthly_attendance' ||
            selectedReport === 'staff_monthly_attendance' ||
            selectedReport === 'all_classes_monthly_attendance') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}

          {/* Student Selector */}
          {(selectedReport === 'marksheet' || selectedReport === 'student_profile') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Student:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.admissionNo} - Roll #{s.rollNo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exam Selector */}
          {(selectedReport === 'marksheet' || selectedReport === 'exam_result') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Exam:</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.session})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Selector */}
          {(selectedReport === 'attendance' ||
            selectedReport === 'staff_attendance' ||
            selectedReport === 'all_classes_daily_attendance') && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Register Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              />
            </div>
          )}

          {/* Fee Receipt Selector */}
          {selectedReport === 'fee_receipt' && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Fee Receipt:</label>
              <select
                value={selectedReceiptId}
                onChange={(e) => setSelectedReceiptId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                {feePayments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.receiptNo} - {p.studentName} (₹{p.amountPaid})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Salary Selector */}
          {selectedReport === 'salary_slip' && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Staff Payslip:</label>
              <select
                value={selectedSalaryId}
                onChange={(e) => setSelectedSalaryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                {salaries.map((sal) => (
                  <option key={sal.id} value={sal.id}>
                    {sal.teacherName} ({sal.month} {sal.year} - ₹{sal.netSalary})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Certificate Selector */}
          {selectedReport === 'certificate' && (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Issued Certificate:</label>
              <select
                value={selectedCertificateId}
                onChange={(e) => setSelectedCertificateId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
              >
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.certificateNo} - {cert.studentName} ({cert.certificateType})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold p-2 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Preview & Print PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Live Report Preview Canvas */}
      {(() => {
        const isLandscape =
          selectedReport === 'student_monthly_attendance' ||
          selectedReport === 'staff_monthly_attendance' ||
          selectedReport === 'all_classes_monthly_attendance' ||
          selectedReport === 'exam_result';

        return (
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 sm:p-8 overflow-auto shadow-inner">
            <div
              className={`${
                isLandscape ? 'max-w-[1150px]' : 'max-w-[850px]'
              } mx-auto bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200`}
            >
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                  Live Document Render Preview ({isLandscape ? 'Landscape A4 Format' : 'Portrait A4 Format'})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download / Print PDF
                  </button>
                </div>
              </div>
              <div className="p-2 sm:p-6">{renderReportContent()}</div>
            </div>
          </div>
        );
      })()}

      {/* Printable Modal Container */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={reportItems.find((r) => r.id === selectedReport)?.title || 'Official Document'}
        fileName={getReportFileName()}
        orientation={
          selectedReport === 'student_monthly_attendance' ||
          selectedReport === 'staff_monthly_attendance' ||
          selectedReport === 'all_classes_monthly_attendance' ||
          selectedReport === 'exam_result'
            ? 'landscape'
            : 'portrait'
        }
      >
        {renderReportContent()}
      </PrintPreviewModal>
    </div>
  );
};
