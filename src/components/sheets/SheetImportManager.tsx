import React, { useState, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Users,
  CalendarCheck,
  Receipt,
  Award,
  GraduationCap,
  RefreshCw,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import {
  SheetEntityType,
  SheetParseResult,
  downloadXlsxTemplate,
  downloadCsvTemplate,
  parseSheetFile,
  exportDatasetToExcel,
} from '../../services/sheetService';
import { DueExcelUploadModal } from '../fees/DueExcelUploadModal';

interface SheetImportManagerProps {
  initialEntity?: SheetEntityType;
  onClose?: () => void;
  onNavigate?: (module: string) => void;
}

export const SheetImportManager: React.FC<SheetImportManagerProps> = ({
  initialEntity = 'students',
  onClose,
  onNavigate,
}) => {
  const {
    students,
    teachers,
    classes,
    exams,
    settings,
    bulkAddStudents,
    bulkAddTeachers,
    bulkMarkAttendance,
    bulkAddFeePayments,
    bulkSaveExamMarks,
  } = useSchool();

  const [activeEntity, setActiveEntity] = useState<SheetEntityType>(initialEntity);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<SheetParseResult<any> | null>(null);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid'>('all');
  const [updateDuplicates, setUpdateDuplicates] = useState(true);
  const [importSuccess, setImportSuccess] = useState<{ count: number; entity: string } | null>(null);
  const [isDueExcelModalOpen, setIsDueExcelModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityConfigs = [
    {
      id: 'students' as SheetEntityType,
      name: 'Students Master Sheet',
      desc: 'Import new admissions with Total Due Fees breakdown: Tuition fees, Admission, Registration, Exam, Convey (Transport) fees, and Late fine.',
      icon: Users,
      color: 'from-blue-600 to-indigo-700',
      badge: `${students.length} in System`,
    },
    {
      id: 'attendance' as SheetEntityType,
      name: 'Attendance Register Sheet',
      desc: 'Bulk import daily attendance records (Present, Absent, Leave, Sunday, Holiday, Half Day).',
      icon: CalendarCheck,
      color: 'from-emerald-600 to-teal-700',
      badge: 'Daily Roster',
    },
    {
      id: 'fees' as SheetEntityType,
      name: 'Fee Collections & Receipts',
      desc: 'Import paid fee vouchers, modes (UPI/Cash/Card/Net Banking), months, and remarks.',
      icon: Receipt,
      color: 'from-amber-600 to-orange-700',
      badge: 'Vouchers',
    },
    {
      id: 'marks' as SheetEntityType,
      name: 'Exam Marks & Grade Sheet',
      desc: 'Upload subject marks (Theory & Practical) across exams to generate CBSE report cards.',
      icon: Award,
      color: 'from-purple-600 to-indigo-800',
      badge: 'Marksheet',
    },
    {
      id: 'teachers' as SheetEntityType,
      name: 'Teachers & Staff Directory',
      desc: 'Import faculty credentials, designations, qualifications, subjects, and salaries.',
      icon: GraduationCap,
      color: 'from-teal-600 to-cyan-800',
      badge: `${teachers.length} Faculty`,
    },
  ];

  const currentConfig = entityConfigs.find((c) => c.id === activeEntity)!;

  const handleProcessFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsLoading(true);
    setImportSuccess(null);

    try {
      const result = await parseSheetFile(uploadedFile, activeEntity, {
        classes,
        students,
        teachers,
        exams,
      });
      setParseResult(result);
    } catch (err) {
      console.error('Error parsing sheet:', err);
      alert('Failed to parse spreadsheet file. Please make sure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleCommitImport = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setIsLoading(true);
    let importedCount = 0;

    try {
      if (activeEntity === 'students') {
        const studentItems = parseResult.validRows.map((r) => r.data);
        importedCount = bulkAddStudents(studentItems as any, updateDuplicates);
      } else if (activeEntity === 'attendance') {
        const attItems = parseResult.validRows.map((r) => r.data);
        bulkMarkAttendance(attItems as any);
        importedCount = attItems.length;
      } else if (activeEntity === 'fees') {
        const feeItems = parseResult.validRows.map((r) => r.data);
        importedCount = bulkAddFeePayments(feeItems as any);
      } else if (activeEntity === 'marks') {
        // Group marks by examId + studentId
        const markRecordsMap = new Map<string, any>();
        parseResult.validRows.forEach((r) => {
          const item = r.data;
          const key = `${item.examId}_${item.studentId}`;
          if (!markRecordsMap.has(key)) {
            markRecordsMap.set(key, {
              examId: item.examId,
              studentId: item.studentId,
              studentName: item.studentName,
              rollNo: item.rollNo,
              classId: item.classId,
              section: item.section,
              subjectMarks: [item.subjectMark],
              totalMarks: item.subjectMark.obtainedMarks,
              maxTotalMarks: item.subjectMark.maxMarks,
              percentage: Math.round((item.subjectMark.obtainedMarks / item.subjectMark.maxMarks) * 100),
              grade: item.subjectMark.grade,
              status: 'Published',
            });
          } else {
            const existing = markRecordsMap.get(key);
            existing.subjectMarks.push(item.subjectMark);
            const totalObt = existing.subjectMarks.reduce((sum: number, sm: any) => sum + sm.obtainedMarks, 0);
            const totalMax = existing.subjectMarks.reduce((sum: number, sm: any) => sum + sm.maxMarks, 0);
            existing.totalMarks = totalObt;
            existing.maxTotalMarks = totalMax;
            existing.percentage = Math.round((totalObt / totalMax) * 100);
            existing.grade =
              existing.percentage >= 90
                ? 'A1'
                : existing.percentage >= 80
                ? 'A2'
                : existing.percentage >= 70
                ? 'B1'
                : existing.percentage >= 60
                ? 'B2'
                : existing.percentage >= 50
                ? 'C1'
                : existing.percentage >= 40
                ? 'C2'
                : existing.percentage >= 33
                ? 'D'
                : 'E';
          }
        });

        const compiledMarks = Array.from(markRecordsMap.values());
        importedCount = bulkSaveExamMarks(compiledMarks);
      } else if (activeEntity === 'teachers') {
        const teacherItems = parseResult.validRows.map((r) => r.data);
        importedCount = bulkAddTeachers(teacherItems as any, updateDuplicates);
      }

      // Trigger celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      setImportSuccess({
        count: importedCount,
        entity: currentConfig.name,
      });
      setParseResult(null);
      setFile(null);
    } catch (err) {
      console.error('Failed to commit import:', err);
      alert('An error occurred while importing records. Please review the rows and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCurrentData = () => {
    if (activeEntity === 'students') {
      const rows = students.map((s) => {
        const cls = classes.find((c) => c.id === s.classId);
        return {
          'Admission No': s.admissionNo,
          'Roll No': s.rollNo,
          'Full Name': s.fullName,
          Class: cls?.name || s.classId,
          Section: s.section,
          Gender: s.gender,
          'DOB (DD/MM/YYYY)': formatDateToDDMMYYYY(s.dob),
          'Father Name': s.fatherName,
          'Mother Name': s.motherName,
          'Guardian Phone': s.guardianPhone,
          Address: s.address,
          Category: s.category,
          'Blood Group': s.bloodGroup,
          'Aadhaar No': s.aadhaarNo || '',
          Status: s.status,
        };
      });
      exportDatasetToExcel('SBSC_Students_Master_Export.xlsx', 'Students', rows);
    } else if (activeEntity === 'teachers') {
      const rows = teachers.map((t) => ({
        'Emp ID': t.empId,
        'Full Name': t.name,
        Designation: t.designation,
        Qualification: t.qualification,
        Subjects: t.subjects.join(', '),
        'Assigned Class': t.assignedClass || 'N/A',
        Email: t.email,
        Phone: t.phone,
        'Monthly Salary': t.salary,
        'Join Date': t.joinDate,
        Gender: t.gender,
        Experience: t.experienceYears,
        Status: t.status,
      }));
      exportDatasetToExcel('SBSC_Teachers_Directory_Export.xlsx', 'Teachers', rows);
    }
  };

  const visibleRows = parseResult
    ? filterView === 'valid'
      ? parseResult.validRows
      : filterView === 'invalid'
      ? parseResult.invalidRows
      : [...parseResult.validRows, ...parseResult.invalidRows].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx, .xls) & CSV (.csv) Importer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Spreadsheet Import & Data Center
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Import mass school records from Google Sheets, Microsoft Excel, or CSV files. Download sample templates, validate columns in real-time, and batch update system registers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDueExcelModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95"
            title="Upload Due Excel sheet and match students by Name, Class & Father Name"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Upload Due Excel (Head-Wise)</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-2 bg-blue-900/80 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl border border-blue-700/50 text-xs transition"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Official A4 Reports Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">
                Successfully Imported {importSuccess.count} Records!
              </h3>
              <p className="text-xs text-emerald-700">
                All records for <strong>{importSuccess.entity}</strong> have been validated and merged into the live database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => {
                  if (activeEntity === 'students') onNavigate('students');
                  else if (activeEntity === 'attendance') onNavigate('attendance');
                  else if (activeEntity === 'fees') onNavigate('fees');
                  else if (activeEntity === 'marks') onNavigate('exams');
                  else if (activeEntity === 'teachers') onNavigate('teachers');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition"
              >
                <span>View Updated Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setImportSuccess(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Special Feature Banner for Head-Wise Due Excel Upload */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-blue-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                New Head-Wise Due Matcher Engine
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                Name + Class + Father Matching
              </span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight mt-0.5">
              Upload Student Due Excel List & Match by Name, Class & Father
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly correlates student records, detects head-wise fees (Tuition, Admission, Exam, Transport, Previous Dues), and applies bulk fee updates.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDueExcelModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4 text-slate-950" />
          <span>Launch Due Excel Matcher</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-900" />
            <span>Select Sheet Category to Import or Export</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {entityConfigs.map((cfg) => {
            const Icon = cfg.icon;
            const isSelected = activeEntity === cfg.id;

            return (
              <button
                key={cfg.id}
                onClick={() => {
                  setActiveEntity(cfg.id);
                  setFile(null);
                  setParseResult(null);
                  setImportSuccess(null);
                }}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-900 bg-blue-50/80 shadow-md ring-2 ring-blue-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${cfg.color} shadow-xs`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {cfg.badge}
                    </span>
                  </div>
                  <h3 className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {cfg.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">{cfg.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                    {isSelected ? '✓ Selected' : 'Click to Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Workspace: Templates & Drag & Drop Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template Download & Guidance Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-900" />
              <span>Step 1: Download Sample Template</span>
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Download our standardized <strong>{currentConfig.name}</strong> template. Fill in your data using Excel or Google Sheets, then upload it on the right.
          </p>

          {/* Download Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => downloadXlsxTemplate(activeEntity, classes, exams)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel Template (.xlsx)</span>
            </button>

            <button
              onClick={() => downloadCsvTemplate(activeEntity, classes, exams)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Download CSV Template (.csv)</span>
            </button>

            {(activeEntity === 'students' || activeEntity === 'teachers') && (
              <button
                onClick={handleExportCurrentData}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold px-4 py-2 rounded-xl border border-blue-200 flex items-center justify-center gap-2 text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Current Database to Excel</span>
              </button>
            )}
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1.5">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Formatting Guidelines:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Keep header column names intact.</li>
              <li>Dates must be formatted as <code>YYYY-MM-DD</code> (e.g. 2026-09-01).</li>
              <li>Fields marked with <code>*</code> are mandatory.</li>
              <li>Classes must match system grades (e.g. Class 10, Class 9, Class 1).</li>
            </ul>
          </div>
        </div>

        {/* Right: Drag and Drop Upload Canvas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-900" />
              <span>Step 2: Upload Completed Spreadsheet</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv).
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[190px] ${
                isDragging
                  ? 'border-blue-900 bg-blue-50/70 scale-98'
                  : file
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-900/60 bg-slate-50/50 hover:bg-blue-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              {file ? (
                <div>
                  <span className="font-bold text-sm text-slate-900 block">{file.name}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Ready to inspect & parse
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-2">
                    <CheckCircle2 className="w-3 h-3" /> File Uploaded
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-sm text-slate-800 block">
                    Drag and drop your spreadsheet here, or <span className="text-blue-900 underline">Browse</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Accepts .xlsx, .xls, and .csv files up to 10MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Options & Action Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={updateDuplicates}
                onChange={(e) => setUpdateDuplicates(e.target.checked)}
                className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
              />
              <span>Update existing matching records if found in database</span>
            </label>

            {file && (
              <button
                onClick={() => {
                  setFile(null);
                  setParseResult(null);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear File</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Interactive Parse & Validation Table Preview */}
      {parseResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Spreadsheet Parsed: {parseResult.sheetName}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review data verification before importing into <strong>{settings.schoolName}</strong> database.
              </p>
            </div>

            {/* Validation Badges */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                Total Rows: {parseResult.totalRows}
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
                ✓ {parseResult.validRows.length} Valid
              </span>
              {parseResult.invalidRows.length > 0 && (
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-lg border border-rose-200">
                  ✗ {parseResult.invalidRows.length} Errors Detected
                </span>
              )}
            </div>
          </div>

          {/* Filter Bar & Commit Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" /> View:
              </span>
              <button
                onClick={() => setFilterView('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterView === 'all' ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                All ({parseResult.totalRows})
              </button>
              <button
                onClick={() => setFilterView('valid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterView === 'valid' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                Valid ({parseResult.validRows.length})
              </button>
              {parseResult.invalidRows.length > 0 && (
                <button
                  onClick={() => setFilterView('invalid')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    filterView === 'invalid' ? 'bg-rose-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  Errors ({parseResult.invalidRows.length})
                </button>
              )}
            </div>

            <button
              onClick={handleCommitImport}
              disabled={parseResult.validRows.length === 0 || isLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition active:scale-95"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Records...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Import {parseResult.validRows.length} Valid Records Now</span>
                </>
              )}
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[360px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Row #</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Primary Identifier</th>
                  <th className="py-2.5 px-3">Name / Details</th>
                  <th className="py-2.5 px-3">Class / Target</th>
                  <th className="py-2.5 px-3">Verification & Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {visibleRows.map((row) => {
                  const d: any = row.data;
                  return (
                    <tr
                      key={row.rowNumber}
                      className={`hover:bg-slate-50/80 ${
                        !row.isValid ? 'bg-rose-50/50' : row.warnings.length > 0 ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">#{row.rowNumber}</td>
                      <td className="py-2.5 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {d.admissionNo || d.empId || d.receiptNo || d.rollNo || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        <span className="font-semibold block">{d.fullName || d.name || d.studentName || d.teacherName || '—'}</span>
                        {d.guardianPhone && <span className="text-[10px] text-slate-500">📞 {d.guardianPhone}</span>}
                        {activeEntity === 'students' && (
                          <div className="mt-1">
                            {d.totalYearlyDue !== undefined ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                                  <span>Total Yearly Due:</span>
                                  <span>₹{Number(d.totalYearlyDue).toLocaleString('en-IN')}</span>
                                </span>
                                {(d.tuitionFee || d.admissionFee || d.registrationFee || d.examFee || d.conveyFee || d.lateFine) ? (
                                  <span className="text-[9px] text-slate-600 block leading-tight">
                                    Tuition: ₹{d.tuitionFee || 0} • Adm: ₹{d.admissionFee || 0} • Reg: ₹{d.registrationFee || 0} • Exam: ₹{d.examFee || 0} • Convey: ₹{d.conveyFee || 0} • Fine: ₹{d.lateFine || 0}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Standard Class Fee Applicable</span>
                            )}
                          </div>
                        )}
                        {d.amountPaid && <span className="text-[10px] text-emerald-700 font-bold">₹{d.amountPaid} ({d.paymentMethod})</span>}
                        {d.subjectMark && <span className="text-[10px] text-blue-900 font-bold">{d.subjectMark.subjectName}: {d.subjectMark.obtainedMarks}/{d.subjectMark.maxMarks}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {d.classId ? (
                          <span>
                            {classes.find((c) => c.id === d.classId)?.name || d.classId} - {d.section || 'A'}
                          </span>
                        ) : d.designation ? (
                          <span>{d.designation}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.errors.length > 0 && (
                          <div className="text-[10px] text-rose-700 font-semibold space-y-0.5">
                            {row.errors.map((err, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span>•</span> {err}
                              </div>
                            ))}
                          </div>
                        )}
                        {row.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-700 font-medium space-y-0.5">
                            {row.warnings.map((warn, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span>⚠</span> {warn}
                              </div>
                            ))}
                          </div>
                        )}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
                          <span className="text-[10px] text-emerald-600 font-medium">Ready for insertion</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Head-Wise Due Excel Upload Modal with Name, Class, Father Matching */}
      <DueExcelUploadModal
        isOpen={isDueExcelModalOpen}
        onClose={() => setIsDueExcelModalOpen(false)}
        onSuccess={(msg) => {
          setImportSuccess({ count: 1, entity: 'Student Dues (Head-Wise)' });
        }}
      />
    </div>
  );
};
