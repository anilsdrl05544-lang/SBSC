import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Users,
  Search,
  Filter,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Zap,
  RotateCcw,
  Receipt,
  Layers,
  UserPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSchool } from '../../context/SchoolContext';
import { Student } from '../../types/school';
import {
  parseDueExcelFile,
  downloadDueExcelTemplate,
  DueExcelParseResult,
  ProcessedDueRow,
  DueHeadBreakdown,
} from '../../utils/studentFeeMatcher';

interface DueExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const DueExcelUploadModal: React.FC<DueExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { students, classes, bulkSetIndividualFeeDues, getStudentFeeBreakdown, bulkAddStudents } = useSchool();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState<DueExcelParseResult | null>(null);

  // Filter view: 'all' | 'matched' | 'unmatched'
  const [filterView, setFilterView] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: 'exactSheetTotal' | 'previousDueOnly' | 'registrationFeeOnly' | 'replace' | 'add'
  const [updateMode, setUpdateMode] = useState<
    'exactSheetTotal' | 'replace' | 'add' | 'previousDueOnly' | 'registrationFeeOnly'
  >('exactSheetTotal');

  // Checkbox: reset dues of students in the school who are not present in this Excel sheet to 0
  const [resetNonSheetStudentsDues, setResetNonSheetStudentsDues] = useState<boolean>(true);

  // Manual matching modal / popover state
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [manualSearch, setManualSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    try {
      const result = await parseDueExcelFile(uploadedFile, students, classes);
      setParseResult(result);
      const hasPrevDue = result.rows.some((r) => r.heads.previousDue > 0);
      const hasRegFee = result.rows.some((r) => r.heads.registrationFee > 0);
      const hasTuition = result.rows.some((r) => r.heads.tuitionFee > 0);
      const hasAdmission = result.rows.some((r) => r.heads.admissionFee > 0);
      const hasExam = result.rows.some((r) => r.heads.examFee > 0);
      const hasConvey = result.rows.some((r) => r.heads.conveyFee > 0);

      const activeHeadTypes = [
        hasTuition,
        hasAdmission,
        hasRegFee,
        hasExam,
        hasConvey,
        hasPrevDue,
      ].filter(Boolean).length;

      if (hasRegFee && activeHeadTypes === 1) {
        // Only registration fee in sheet
        setUpdateMode('registrationFeeOnly');
      } else if (hasPrevDue && activeHeadTypes === 1) {
        // Only previous due in sheet
        setUpdateMode('previousDueOnly');
      } else {
        // Default to exactSheetTotal to guarantee full Excel total is applied
        setUpdateMode('exactSheetTotal');
      }
    } catch (err: any) {
      console.error('Error parsing Due Excel file:', err);
      alert(`Failed to parse Excel file: ${err?.message || 'Invalid format'}`);
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRow = (index: number) => {
    if (!parseResult) return;
    const newRows = [...parseResult.rows];
    newRows[index].isSelected = !newRows[index].isSelected;
    setParseResult({ ...parseResult, rows: newRows });
  };

  const handleSelectAllMatched = () => {
    if (!parseResult) return;
    const newRows = parseResult.rows.map((r) => ({
      ...r,
      isSelected: r.matchedStudent !== null,
    }));
    setParseResult({ ...parseResult, rows: newRows });
  };

  const handleDeselectAll = () => {
    if (!parseResult) return;
    const newRows = parseResult.rows.map((r) => ({
      ...r,
      isSelected: false,
    }));
    setParseResult({ ...parseResult, rows: newRows });
  };

  const handleManualAssign = (rowIndex: number, student: Student) => {
    if (!parseResult) return;
    const newRows = [...parseResult.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      matchedStudent: student,
      matchConfidence: 'exact',
      matchScore: 100,
      matchReason: `Manually linked to ${student.fullName} (${student.admissionNo})`,
      isSelected: true,
    };
    setParseResult({ ...parseResult, rows: newRows });
    setEditingRowIndex(null);
    setManualSearch('');
  };

  const handleUpdateHeadAmount = (
    rowIndex: number,
    head: keyof DueHeadBreakdown,
    amount: number
  ) => {
    if (!parseResult) return;
    const newRows = [...parseResult.rows];
    const row = newRows[rowIndex];
    const sanitizedAmount = Math.max(0, amount);
    const effectiveAmount = head === 'conveyFee' && sanitizedAmount === 600 ? 0 : sanitizedAmount;
    const newHeads = { ...row.heads, [head]: effectiveAmount };

    // Recalculate total if head was changed
    if (head !== 'totalDue') {
      const effConv = newHeads.conveyFee === 600 ? 0 : newHeads.conveyFee;
      newHeads.totalDue =
        newHeads.tuitionFee +
        newHeads.admissionFee +
        newHeads.registrationFee +
        newHeads.examFee +
        effConv +
        newHeads.previousDue +
        newHeads.lateFine;
    }

    newRows[rowIndex] = { ...row, heads: newHeads };
    const newTotalDueAmount = newRows.reduce((sum, r) => sum + r.heads.totalDue, 0);
    setParseResult({ ...parseResult, rows: newRows, totalDueAmount: newTotalDueAmount });
  };

  // Auto-fill Previous Due from system database records for all matched students
  const handleAutoFillPreviousDueFromSystem = () => {
    if (!parseResult) return;
    let filledCount = 0;
    const newRows = parseResult.rows.map((row) => {
      if (row.matchedStudent) {
        const student = row.matchedStudent;
        const currentBreakdown = getStudentFeeBreakdown(student.id);
        const sysPrevDue =
          typeof student.previousDue === 'number' && student.previousDue > 0
            ? student.previousDue
            : (currentBreakdown.previousDue || 0);

        if (sysPrevDue > 0 && row.heads.previousDue !== sysPrevDue) {
          filledCount++;
          const effConv = row.heads.conveyFee === 600 ? 0 : row.heads.conveyFee;
          const newHeads = {
            ...row.heads,
            previousDue: sysPrevDue,
            totalDue:
              row.heads.tuitionFee +
              row.heads.admissionFee +
              row.heads.registrationFee +
              row.heads.examFee +
              effConv +
              sysPrevDue +
              row.heads.lateFine,
          };
          return { ...row, heads: newHeads };
        }
      }
      return row;
    });

    const newTotalDueAmount = newRows.reduce((sum, r) => sum + r.heads.totalDue, 0);
    setParseResult({
      ...parseResult,
      rows: newRows,
      totalDueAmount: newTotalDueAmount,
    });
    alert(`Auto-filled Previous Due for ${filledCount} matched student(s) from system database records.`);
  };

  // Dedicated one-click action: Fill Previous Due from Excel sheet for all matched students
  const handleFillPreviousDueToMatched = () => {
    if (!parseResult) return;

    // Filter matched students that have Previous Due in Excel sheet
    const targetRows = parseResult.rows.filter(
      (r) => r.matchedStudent && r.heads.previousDue > 0
    );

    // If none with > 0 specifically, fallback to selected matched students
    const rowsToApply =
      targetRows.length > 0
        ? targetRows
        : parseResult.rows.filter((r) => r.isSelected && r.matchedStudent);

    if (rowsToApply.length === 0) {
      alert('कोई भी सुमेलित (Matched) विद्यार्थी नहीं मिला जिसमें Excel का Previous Due हो। कृपया पहले विद्यार्थियों को मैच करें।');
      return;
    }

    const totalPrevDueToApply = rowsToApply.reduce((sum, r) => sum + (r.heads.previousDue || 0), 0);
    const confirmMsg = `क्या आप Excel शीट से ${rowsToApply.length} सुमेलित विद्यार्थियों में Previous Due (कुल ₹${totalPrevDueToApply.toLocaleString('en-IN')}) भरना चाहते हैं?\n\n• चालू सत्र का Tuition, Admission व Exam शुल्क सुरक्षित रहेगा।\n• केवल Previous Due अपडेट होगा।`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updates = rowsToApply.map((row) => {
        const student = row.matchedStudent!;
        const currentBreakdown = getStudentFeeBreakdown(student.id);
        const previousDue = row.heads.previousDue;
        const tuitionFee = currentBreakdown.tuitionFee;
        const admissionFee = currentBreakdown.admissionFee;
        const registrationFee = currentBreakdown.registrationFee;
        const examFee = currentBreakdown.examFee;
        const conveyFee = currentBreakdown.conveyFee === 600 ? 0 : currentBreakdown.conveyFee;
        const lateFine = currentBreakdown.lateFine;
        const totalYearlyDue =
          tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

        return {
          studentId: student.id,
          tuitionFee,
          admissionFee,
          registrationFee,
          examFee,
          conveyFee,
          previousDue,
          lateFine,
          totalYearlyDue,
        };
      });

      const updatedCount = bulkSetIndividualFeeDues(updates);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      const msg = `सफलतापूर्वक Excel शीट से ${updatedCount} विद्यार्थियों में Previous Due (पिछला बकाया) भर दिया गया!`;
      if (onSuccess) onSuccess(msg);
      else alert(msg);

      onClose();
    } catch (err: any) {
      console.error('Failed to fill previous due:', err);
      alert(`Error updating dues: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Dedicated one-click action: Fill Registration Fee from Excel sheet for all matched students
  const handleFillRegistrationFeeToMatched = () => {
    if (!parseResult) return;

    // Filter matched students that have Registration Fee in Excel sheet
    const targetRows = parseResult.rows.filter(
      (r) => r.matchedStudent && r.heads.registrationFee > 0
    );

    const rowsToApply =
      targetRows.length > 0
        ? targetRows
        : parseResult.rows.filter((r) => r.isSelected && r.matchedStudent);

    if (rowsToApply.length === 0) {
      alert('कोई भी सुमेलित (Matched) विद्यार्थी नहीं मिला जिसमें Excel का Registration Fee हो। कृपया पहले विद्यार्थियों को मैच करें।');
      return;
    }

    const totalRegFeeToApply = rowsToApply.reduce((sum, r) => sum + (r.heads.registrationFee || 0), 0);
    const confirmMsg = `क्या आप Excel शीट से ${rowsToApply.length} सुमेलित विद्यार्थियों (Name, Class, Father Match) में Registration Fee (कुल ₹${totalRegFeeToApply.toLocaleString('en-IN')}) भरना चाहते हैं?\n\n• चालू सत्र का Tuition, Admission, Exam व Previous Due शुल्क सुरक्षित रहेगा।\n• केवल Registration Fee अपडेट होगी।`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updates = rowsToApply.map((row) => {
        const student = row.matchedStudent!;
        const currentBreakdown = getStudentFeeBreakdown(student.id);
        const registrationFee = row.heads.registrationFee;
        const tuitionFee = currentBreakdown.tuitionFee;
        const admissionFee = currentBreakdown.admissionFee;
        const examFee = currentBreakdown.examFee;
        const conveyFee = currentBreakdown.conveyFee === 600 ? 0 : currentBreakdown.conveyFee;
        const previousDue = currentBreakdown.previousDue;
        const lateFine = currentBreakdown.lateFine;
        const totalYearlyDue =
          tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

        return {
          studentId: student.id,
          tuitionFee,
          admissionFee,
          registrationFee,
          examFee,
          conveyFee,
          previousDue,
          lateFine,
          totalYearlyDue,
        };
      });

      const updatedCount = bulkSetIndividualFeeDues(updates);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      const msg = `सफलतापूर्वक Excel शीट से ${updatedCount} विद्यार्थियों में Registration Fee (पंजीकरण शुल्क) भर दिया गया!`;
      if (onSuccess) onSuccess(msg);
      else alert(msg);

      onClose();
    } catch (err: any) {
      console.error('Failed to fill registration fee:', err);
      alert(`Error updating registration fees: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Dedicated one-click action: Fill All Fee Heads (Head-Wise) for all matched students
  const handleFillAllHeadsToMatched = () => {
    if (!parseResult) return;

    // Target matched students
    const rowsToApply = parseResult.rows.filter((r) => r.matchedStudent);

    if (rowsToApply.length === 0) {
      alert('कोई भी सुमेलित (Matched) विद्यार्थी नहीं मिला। कृपया पहले विद्यार्थियों को मैच करें।');
      return;
    }

    const totalDuesToApply = rowsToApply.reduce((sum, r) => sum + (r.heads.totalDue || 0), 0);
    const confirmMsg = `क्या आप Excel शीट से सभी ${rowsToApply.length} सुमेलित विद्यार्थियों (Student, Class & Father Name Match) में सभी फीस हेड (Tuition, Adm, Reg, Exam, Convey, Previous Due, Fine) कुल ₹${totalDuesToApply.toLocaleString('en-IN')} सेट करना चाहते हैं?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    try {
      const updates = rowsToApply.map((row) => {
        const student = row.matchedStudent!;
        const effConv = row.heads.conveyFee === 600 ? 0 : row.heads.conveyFee;
        const totalYearlyDue =
          row.heads.tuitionFee +
          row.heads.admissionFee +
          row.heads.registrationFee +
          row.heads.examFee +
          effConv +
          row.heads.previousDue +
          row.heads.lateFine;
        return {
          studentId: student.id,
          tuitionFee: row.heads.tuitionFee,
          admissionFee: row.heads.admissionFee,
          registrationFee: row.heads.registrationFee,
          examFee: row.heads.examFee,
          conveyFee: effConv,
          previousDue: row.heads.previousDue,
          lateFine: row.heads.lateFine,
          totalYearlyDue,
        };
      });

      const updatedCount = bulkSetIndividualFeeDues(updates);

      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });

      const msg = `सफलतापूर्वक Excel शीट से ${updatedCount} विद्यार्थियों में सभी हेड-वाइज फीस (All Fee Heads) सेट कर दी गई!`;
      if (onSuccess) onSuccess(msg);
      else alert(msg);

      onClose();
    } catch (err: any) {
      console.error('Failed to fill all fee heads:', err);
      alert(`Error updating fee heads: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-fill Registration Fee from system database records for all matched students
  const handleAutoFillRegistrationFeeFromSystem = () => {
    if (!parseResult) return;
    let filledCount = 0;
    const newRows = parseResult.rows.map((row) => {
      if (row.matchedStudent) {
        const student = row.matchedStudent;
        const currentBreakdown = getStudentFeeBreakdown(student.id);
        const sysRegFee =
          typeof student.registrationFee === 'number' && student.registrationFee > 0
            ? student.registrationFee
            : (currentBreakdown.registrationFee || 0);

        if (sysRegFee > 0 && row.heads.registrationFee !== sysRegFee) {
          filledCount++;
          const effConv = row.heads.conveyFee === 600 ? 0 : row.heads.conveyFee;
          const newHeads = {
            ...row.heads,
            registrationFee: sysRegFee,
            totalDue:
              row.heads.tuitionFee +
              row.heads.admissionFee +
              sysRegFee +
              row.heads.examFee +
              effConv +
              row.heads.previousDue +
              row.heads.lateFine,
          };
          return { ...row, heads: newHeads };
        }
      }
      return row;
    });

    const newTotalDueAmount = newRows.reduce((sum, r) => sum + r.heads.totalDue, 0);
    setParseResult({
      ...parseResult,
      rows: newRows,
      totalDueAmount: newTotalDueAmount,
    });
    alert(`Auto-filled Registration Fee for ${filledCount} matched student(s) from system database records.`);
  };

  const handleAutoEnrollAllUnmatched = () => {
    if (!parseResult) return;
    const unmatchedRows = parseResult.rows.filter((r) => !r.matchedStudent);
    if (unmatchedRows.length === 0) {
      alert('All students in this Excel sheet are already matched!');
      return;
    }

    const studentsToCreate = unmatchedRows.map((r, idx) => {
      const clsName = (r.rawClassName || '').toLowerCase().replace(/[^a-z0-9]/gi, '');
      const matchedCls =
        classes.find((c) => {
          const cName = c.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
          return cName === clsName || cName.includes(clsName) || clsName.includes(cName);
        }) || classes[0];

      return {
        fullName: r.rawStudentName,
        fatherName: r.rawFatherName || '',
        classId: matchedCls ? matchedCls.id : (classes[0]?.id || '1'),
        admissionNo: r.rawAdmissionNo || `ADM-${Date.now().toString().slice(-4)}-${idx + 1}`,
        rollNo: r.rawRollNo || '',
        gender: 'Male' as const,
        guardianPhone: '',
        emergencyContact: '',
        address: 'Bairwa Nankar, Siddharthnagar',
        status: 'Active' as const,
        tuitionFee: r.heads.tuitionFee,
        admissionFee: r.heads.admissionFee,
        registrationFee: r.heads.registrationFee,
        examFee: r.heads.examFee,
        conveyFee: r.heads.conveyFee,
        previousDue: r.heads.previousDue > 0 ? r.heads.previousDue : r.heads.totalDue,
        lateFine: r.heads.lateFine,
        totalYearlyDue: r.heads.totalDue,
        scholarshipStatus: 'Regular' as const,
      };
    });

    bulkAddStudents(studentsToCreate);

    // Refresh parseResult with simulated student entries so user can immediately apply
    const updatedRows = parseResult.rows.map((row) => {
      if (row.matchedStudent) return row;
      const fakeStudent: Student = {
        id: `s-enrolled-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        fullName: row.rawStudentName,
        fatherName: row.rawFatherName || '',
        motherName: '',
        dob: '2015-01-01',
        section: 'A',
        bloodGroup: 'B+',
        admissionDate: '2024-04-01',
        category: 'General',
        classId: row.rawClassName || '1',
        admissionNo: row.rawAdmissionNo || `ADM-${Date.now()}`,
        rollNo: row.rawRollNo || '',
        gender: 'Male',
        guardianPhone: '',
        emergencyContact: '',
        address: 'Bairwa Nankar, Siddharthnagar',
        status: 'Active',
        totalYearlyDue: row.heads.totalDue,
        previousDue: row.heads.totalDue,
      };
      return {
        ...row,
        matchedStudent: fakeStudent,
        matchConfidence: 'exact' as const,
        isSelected: true,
      };
    });

    const matchedCount = updatedRows.length;
    const matchedDue = updatedRows.reduce((acc, r) => acc + r.heads.totalDue, 0);

    setParseResult({
      ...parseResult,
      exactMatchesCount: matchedCount,
      unmatchedCount: 0,
      ambiguousCount: 0,
      matchedDueAmount: matchedDue,
      unmatchedDueAmount: 0,
      rows: updatedRows,
    });

    alert(
      `Successfully enrolled ${studentsToCreate.length} students! 100% of rows are now matched and ready to apply.`
    );
  };

  const handleCommitDues = () => {
    if (!parseResult) return;

    const selectedRows = parseResult.rows.filter((r) => r.isSelected && r.matchedStudent);
    if (selectedRows.length === 0) {
      alert('Please select at least one matched student to apply fee dues.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = selectedRows.map((row) => {
        const student = row.matchedStudent!;
        const currentBreakdown = getStudentFeeBreakdown(student.id);

        if (updateMode === 'exactSheetTotal') {
          // Exact Sheet Total: set totalYearlyDue directly from the Excel row
          const tuitionFee = row.heads.tuitionFee;
          const admissionFee = row.heads.admissionFee;
          const registrationFee = row.heads.registrationFee;
          const examFee = row.heads.examFee;
          const conveyFee = row.heads.conveyFee;
          const lateFine = row.heads.lateFine;
          const totalYearlyDue = row.heads.totalDue;
          const otherHeadsSum = tuitionFee + admissionFee + registrationFee + examFee + conveyFee + lateFine;
          const previousDue = Math.max(0, totalYearlyDue - otherHeadsSum);

          return {
            studentId: student.id,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee,
            previousDue: previousDue > 0 ? previousDue : (totalYearlyDue > 0 ? totalYearlyDue : 0),
            lateFine,
            totalYearlyDue,
          };
        } else if (updateMode === 'registrationFeeOnly') {
          // Fill only Registration Fee from Excel sheet for matched students, keeping other fees intact
          const registrationFee = row.heads.registrationFee;
          const tuitionFee = currentBreakdown.tuitionFee;
          const admissionFee = currentBreakdown.admissionFee;
          const examFee = currentBreakdown.examFee;
          const conveyFee = currentBreakdown.conveyFee;
          const previousDue = currentBreakdown.previousDue;
          const lateFine = currentBreakdown.lateFine;
          const totalYearlyDue =
            tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

          return {
            studentId: student.id,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee,
            previousDue,
            lateFine,
            totalYearlyDue,
          };
        } else if (updateMode === 'previousDueOnly') {
          // Fill only Previous Due from Excel sheet for matched students, keeping current tuition/admission/exam/convey fees intact
          const previousDue = row.heads.previousDue;
          const tuitionFee = currentBreakdown.tuitionFee;
          const admissionFee = currentBreakdown.admissionFee;
          const registrationFee = currentBreakdown.registrationFee;
          const examFee = currentBreakdown.examFee;
          const conveyFee = currentBreakdown.conveyFee;
          const lateFine = currentBreakdown.lateFine;
          const totalYearlyDue =
            tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

          return {
            studentId: student.id,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee,
            previousDue,
            lateFine,
            totalYearlyDue,
          };
        } else if (updateMode === 'add') {
          // Add to current dues
          const tuitionFee = currentBreakdown.tuitionFee + row.heads.tuitionFee;
          const admissionFee = currentBreakdown.admissionFee + row.heads.admissionFee;
          const registrationFee = currentBreakdown.registrationFee + row.heads.registrationFee;
          const examFee = currentBreakdown.examFee + row.heads.examFee;
          const conveyFee = currentBreakdown.conveyFee + row.heads.conveyFee;
          const previousDue = (currentBreakdown.previousDue || 0) + row.heads.previousDue;
          const lateFine = currentBreakdown.lateFine + row.heads.lateFine;
          const totalYearlyDue =
            tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

          return {
            studentId: student.id,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee,
            previousDue,
            lateFine,
            totalYearlyDue,
          };
        } else {
          // Replace / set exact head dues
          // If individual fee heads were NOT present anywhere in the Excel sheet, preserve the student's existing fee head
          const hasTuitionInSheet = parseResult?.rows.some((r) => r.heads.tuitionFee > 0);
          const hasAdmissionInSheet = parseResult?.rows.some((r) => r.heads.admissionFee > 0);
          const hasRegFeeInSheet = parseResult?.rows.some((r) => r.heads.registrationFee > 0);
          const hasExamInSheet = parseResult?.rows.some((r) => r.heads.examFee > 0);
          const hasConveyInSheet = parseResult?.rows.some((r) => r.heads.conveyFee > 0);

          const tuitionFee = hasTuitionInSheet ? row.heads.tuitionFee : currentBreakdown.tuitionFee;
          const admissionFee = hasAdmissionInSheet ? row.heads.admissionFee : currentBreakdown.admissionFee;
          const registrationFee = hasRegFeeInSheet ? row.heads.registrationFee : currentBreakdown.registrationFee;
          const examFee = hasExamInSheet ? row.heads.examFee : currentBreakdown.examFee;
          const conveyFee = hasConveyInSheet ? row.heads.conveyFee : currentBreakdown.conveyFee;
          let previousDue = row.heads.previousDue;
          const lateFine = row.heads.lateFine;

          let totalYearlyDue =
            tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

          if (totalYearlyDue === 0 && row.heads.totalDue > 0) {
            totalYearlyDue = row.heads.totalDue;
            previousDue = row.heads.totalDue;
          }

          return {
            studentId: student.id,
            tuitionFee,
            admissionFee,
            registrationFee,
            examFee,
            conveyFee,
            previousDue,
            lateFine,
            totalYearlyDue,
          };
        }
      });

      const updatedCount = bulkSetIndividualFeeDues(updates, {
        resetOthersToZero: resetNonSheetStudentsDues,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      const msg = `Successfully applied Excel sheet dues for ${updatedCount} students (Total: ₹${totalSelectedDueAmount.toLocaleString('en-IN')})!${resetNonSheetStudentsDues ? ' Non-sheet students reset to ₹0.' : ''}`;
      if (onSuccess) onSuccess(msg);
      else alert(msg);

      onClose();
    } catch (err: any) {
      console.error('Failed to commit fee dues:', err);
      alert(`Error updating dues: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered rows for display
  const displayRows = (parseResult?.rows || []).filter((row) => {
    // Tab filter
    if (filterView === 'matched' && !row.matchedStudent) return false;
    if (filterView === 'unmatched' && row.matchedStudent) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = row.rawStudentName.toLowerCase().includes(q);
      const matchFather = row.rawFatherName.toLowerCase().includes(q);
      const matchClass = row.rawClassName.toLowerCase().includes(q);
      const matchDbName = row.matchedStudent?.fullName.toLowerCase().includes(q);
      const matchDbFather = row.matchedStudent?.fatherName.toLowerCase().includes(q);
      const matchAdm = row.matchedStudent?.admissionNo.toLowerCase().includes(q);
      if (!matchName && !matchFather && !matchClass && !matchDbName && !matchDbFather && !matchAdm) {
        return false;
      }
    }

    return true;
  });

  const selectedCount = (parseResult?.rows || []).filter(
    (r) => r.isSelected && r.matchedStudent
  ).length;

  const totalPreviousDueInSheet = (parseResult?.rows || []).reduce(
    (sum, r) => sum + (r.heads.previousDue || 0),
    0
  );

  const matchedWithPrevDueCount = (parseResult?.rows || []).filter(
    (r) => r.matchedStudent && (r.heads.previousDue || 0) > 0
  ).length;

  const totalRegistrationFeeInSheet = (parseResult?.rows || []).reduce(
    (sum, r) => sum + (r.heads.registrationFee || 0),
    0
  );

  const matchedWithRegFeeCount = (parseResult?.rows || []).filter(
    (r) => r.matchedStudent && (r.heads.registrationFee || 0) > 0
  ).length;

  const totalAllDuesInSheet = (parseResult?.rows || []).reduce(
    (sum, r) => sum + (r.heads.totalDue || 0),
    0
  );

  const matchedAllCount = (parseResult?.rows || []).filter(
    (r) => r.matchedStudent !== null
  ).length;

  const totalTuitionInSheet = (parseResult?.rows || []).reduce(
    (sum, r) => sum + (r.heads.tuitionFee || 0),
    0
  );

  const hasMultipleFeeHeads =
    [
      totalTuitionInSheet > 0,
      totalRegistrationFeeInSheet > 0,
      totalPreviousDueInSheet > 0,
      (parseResult?.rows || []).some((r) => r.heads.admissionFee > 0),
      (parseResult?.rows || []).some((r) => r.heads.examFee > 0),
      (parseResult?.rows || []).some((r) => r.heads.conveyFee > 0),
    ].filter(Boolean).length >= 2 || totalTuitionInSheet > 0;

  const totalSelectedDueAmount = (parseResult?.rows || [])
    .filter((r) => r.isSelected && r.matchedStudent)
    .reduce(
      (sum, r) =>
        sum +
        (updateMode === 'registrationFeeOnly'
          ? r.heads.registrationFee
          : updateMode === 'previousDueOnly'
          ? r.heads.previousDue
          : r.heads.totalDue),
      0
    );

  // Filter candidates for manual student picker
  const filteredDbStudents = manualSearch.trim()
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
          s.fatherName.toLowerCase().includes(manualSearch.toLowerCase()) ||
          s.admissionNo.toLowerCase().includes(manualSearch.toLowerCase())
      )
    : students.slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 text-white px-6 py-4.5 flex items-center justify-between border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                  Excel Due Register & Matcher
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Name + Class + Father Matching
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Upload Student Due Excel List (Head-Wise)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Download Sample Templates & File Uploader */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Quick Templates */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                <Download className="w-4 h-4 text-blue-700" /> Download Templates:
              </span>
              <button
                type="button"
                onClick={() => downloadDueExcelTemplate(students, classes, true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-900 font-bold border border-blue-300 shadow-2xs transition cursor-pointer"
                title="Download sheet pre-populated with active students"
              >
                <Users className="w-3.5 h-3.5 text-blue-700" />
                <span>With Current Students ({students.length})</span>
              </button>
              <button
                type="button"
                onClick={() => downloadDueExcelTemplate(students, classes, false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 shadow-2xs transition cursor-pointer"
                title="Download empty formatted sheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>Blank Head-Wise Template</span>
              </button>
            </div>

            {/* Upload action or Reset */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{file ? 'Upload Different File' : 'Select Excel / CSV File'}</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Area if no file parsed yet */}
          {!parseResult && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/60 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/30'
              }`}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100/70 text-blue-800 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-800">
                Drop your Due Excel or CSV sheet here
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The sheet should contain columns for <strong>Student Name</strong>,{' '}
                <strong>Class</strong>, <strong>Father Name</strong>, and head-wise fees (Tuition,
                Admission, Reg, Exam, Conveyance, Previous Due).
              </p>
              <span className="inline-block mt-3 text-[11px] font-bold text-blue-800 bg-blue-100/70 px-3 py-1 rounded-full">
                Supports .xlsx, .xls, and .csv
              </span>
            </div>
          )}
        </div>

        {/* Middle Content Area: Summary Stats & Interactive Head-wise Table */}
        {parseResult && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 space-y-4">
            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                  Excel Sheet Total (शीट का कुल)
                </span>
                <span className="text-xl font-black text-blue-950">
                  ₹{(parseResult.totalSheetDueAmount || parseResult.totalDueAmount).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-blue-800 font-bold block mt-0.5">
                  {parseResult.totalRows} कुल पंक्तियाँ
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Matched Dues (सुमेलित)
                </span>
                <span className="text-xl font-black text-emerald-900">
                  ₹{parseResult.matchedDueAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-emerald-800 font-bold block mt-0.5">
                  {parseResult.exactMatchesCount + parseResult.fuzzyMatchesCount} छात्र सुमेलित
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Unmatched Dues (असुमेलित)
                </span>
                <span className="text-xl font-black text-amber-900">
                  ₹{parseResult.unmatchedDueAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-amber-800 font-bold block mt-0.5">
                  {parseResult.unmatchedCount + parseResult.ambiguousCount} पंक्तियाँ असुमेलित
                </span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 block">
                  Selected to Apply (लागू करने हेतु)
                </span>
                <span className="text-xl font-black text-purple-950">
                  ₹{totalSelectedDueAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-purple-800 font-bold block mt-0.5">
                  {selectedCount} छात्र चयनित
                </span>
              </div>
            </div>

            {/* Auto-Enroll Unmatched Students Banner to guarantee 100% of Excel due is applied */}
            {(parseResult.unmatchedCount > 0 || parseResult.unmatchedDueAmount > 0) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-amber-950 flex flex-wrap items-center gap-2">
                      <span>शीट में {parseResult.unmatchedCount} असुमेलित विद्यार्थी हैं (बकाया: ₹{parseResult.unmatchedDueAmount.toLocaleString('en-IN')})</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        पूरा ₹{(parseResult.totalSheetDueAmount || parseResult.totalDueAmount).toLocaleString('en-IN')} लागू करने हेतु
                      </span>
                    </div>
                    <div className="text-xs text-amber-900 mt-0.5">
                      यदि ये छात्र स्कूल में नए हैं, तो एक क्लिक में इन्हें जोड़ें ताकि एक्सेल शीट का पूरा <strong>₹{(parseResult.totalSheetDueAmount || parseResult.totalDueAmount).toLocaleString('en-IN')}</strong> बकाया ऐप में दिखने लगे।
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoEnrollAllUnmatched}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition shrink-0 active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-amber-200" />
                  <span>असुमेलित छात्रों को जोड़ें व सुमेलित करें ({parseResult.unmatchedCount})</span>
                </button>
              </div>
            )}

            {/* All Heads / Full Fee Roster Alert & 1-Click Action Banner */}
            {hasMultipleFeeHeads && totalAllDuesInSheet > 0 && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-emerald-950 flex flex-wrap items-center gap-2">
                      <span>Excel शीट में All Fee Heads (सभी हेड शुल्क): ₹{totalAllDuesInSheet.toLocaleString('en-IN')}</span>
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {matchedAllCount} मैचिंग विद्यार्थी
                      </span>
                    </div>
                    <div className="text-xs text-emerald-900 mt-0.5">
                      नाम, कक्षा व पिता के नाम से मैचिंग छात्रों में सभी फीस हेड (Tuition, Admission, Reg, Exam, Conveyance, Previous Due) भरने के लिए नीचे बटन दबाएं।
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFillAllHeadsToMatched}
                  disabled={matchedAllCount === 0 || isSaving}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition shrink-0 active:scale-95"
                >
                  <Layers className="w-4 h-4 text-emerald-200" />
                  <span>मैचिंग छात्रों में सभी फीस हेड भरें ({matchedAllCount})</span>
                </button>
              </div>
            )}

            {/* Registration Fee Alert & 1-Click Action Banner */}
            {totalRegistrationFeeInSheet > 0 && (
              <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-cyan-950 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-cyan-950 flex flex-wrap items-center gap-2">
                      <span>Excel शीट में Registration Fee (पंजीकरण शुल्क): ₹{totalRegistrationFeeInSheet.toLocaleString('en-IN')}</span>
                      <span className="bg-cyan-200 text-cyan-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {matchedWithRegFeeCount} मैचिंग विद्यार्थी
                      </span>
                    </div>
                    <div className="text-xs text-cyan-900 mt-0.5">
                      नाम, कक्षा व पिता के नाम से मैचिंग छात्रों में केवल Registration Fee भरने के लिए नीचे बटन दबाएं।
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFillRegistrationFeeToMatched}
                  disabled={matchedWithRegFeeCount === 0 || isSaving}
                  className="px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition shrink-0 active:scale-95"
                >
                  <Receipt className="w-4 h-4 text-cyan-200" />
                  <span>मैचिंग छात्रों में Registration Fee भरें ({matchedWithRegFeeCount})</span>
                </button>
              </div>
            )}

            {/* Previous Due Alert & 1-Click Action Banner */}
            {totalPreviousDueInSheet > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-amber-950 flex flex-wrap items-center gap-2">
                      <span>Excel शीट में Previous Due (पिछला बकाया): ₹{totalPreviousDueInSheet.toLocaleString('en-IN')}</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {matchedWithPrevDueCount} मैचिंग विद्यार्थी
                      </span>
                    </div>
                    <div className="text-xs text-amber-900 mt-0.5">
                      चालू सत्र का ट्यूशन व अन्य शुल्क सुरक्षित रखते हुए सिर्फ पिछला बकाया भरने के लिए नीचे बटन दबाएं।
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFillPreviousDueToMatched}
                  disabled={matchedWithPrevDueCount === 0 || isSaving}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition shrink-0 active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>मैचिंग छात्रों में Previous Due भरें ({matchedWithPrevDueCount})</span>
                </button>
              </div>
            )}

            {/* Controls Ribbon: Filter, Search, Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Tabs */}
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFilterView('all')}
                    className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                      filterView === 'all' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    All Rows ({parseResult.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('matched')}
                    className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                      filterView === 'matched'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Matched Only (
                    {parseResult.exactMatchesCount + parseResult.fuzzyMatchesCount}
                    )
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('unmatched')}
                    className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                      filterView === 'unmatched'
                        ? 'bg-white text-amber-800 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Unmatched / Ambiguous (
                    {parseResult.unmatchedCount + parseResult.ambiguousCount}
                    )
                  </button>
                </div>

                {/* Selection helper buttons */}
                <button
                  type="button"
                  onClick={handleSelectAllMatched}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Select All Matched
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleFillRegistrationFeeToMatched}
                  disabled={matchedWithRegFeeCount === 0 || isSaving}
                  className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  title="Excel शीट का Registration Fee सभी मैचिंग छात्रों के प्रोफाइल में भरें"
                >
                  <Receipt className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Excel से Reg Fee भरें ({matchedWithRegFeeCount})</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillPreviousDueToMatched}
                  disabled={matchedWithPrevDueCount === 0 || isSaving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  title="Excel शीट का Previous Due सभी मैचिंग छात्रों के प्रोफाइल में भरें"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Excel से Previous Due भरें ({matchedWithPrevDueCount})</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFillRegistrationFeeFromSystem}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="डेटाबेस से सभी सुमेलित विद्यार्थियों का Registration Fee ऑटो-भरें"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Auto Reg Fee</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFillPreviousDueFromSystem}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="डेटाबेस से सभी सुमेलित विद्यार्थियों का पिछला बकाया ऑटो-भरें"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Auto Prev Due</span>
                </button>
              </div>

              {/* Search & Mode */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, class, father..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-48 focus:w-60 transition-all"
                  />
                </div>

                {/* Update Mode Selector */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-1">
                    Apply Mode:
                  </span>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('exactSheetTotal')}
                    className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                      updateMode === 'exactSheetTotal'
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'text-blue-950 hover:bg-blue-50'
                    }`}
                    title="Excel शीट का कुल बकाया (Exact Sheet Total) हूबहू लागू करें"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-200" />
                    <span>Exact Sheet Total (कुल बकाया)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('registrationFeeOnly')}
                    className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                      updateMode === 'registrationFeeOnly'
                        ? 'bg-cyan-700 text-white shadow-2xs'
                        : 'text-cyan-950 hover:bg-cyan-50'
                    }`}
                    title="Only update Registration Fee from Excel; keep tuition, admission, exam & other fees intact"
                  >
                    <Receipt className="w-3 h-3 text-cyan-200" />
                    <span>Reg Fee Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('previousDueOnly')}
                    className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                      updateMode === 'previousDueOnly'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-950 hover:bg-amber-50'
                    }`}
                    title="Only update Previous Due from Excel; keep current year tuition & fees intact"
                  >
                    <Zap className="w-3 h-3 text-amber-200 fill-amber-200" />
                    <span>Previous Due Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('replace')}
                    className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                      updateMode === 'replace'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-emerald-950 hover:bg-emerald-50'
                    }`}
                    title="Excel शीट के सभी हेड (Tuition, Adm, Reg, Exam, Convey, Previous Due, Fine) सेट करें"
                  >
                    <Layers className="w-3 h-3 text-emerald-200" />
                    <span>All Fee Heads (Head-Wise)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateMode('add')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      updateMode === 'add'
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Add sheet amounts on top of current fees (Arrears/Additional charges)"
                  >
                    + Add to Current
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Grid of Head-Wise Records */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-extrabold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="p-2.5 w-52">Excel Record (Name/Class/Father)</th>
                    <th className="p-2.5 w-56">Database Match Status</th>
                    <th className="p-2.5 text-right w-22">Adm (₹)</th>
                    <th className="p-2.5 text-right w-22 font-black text-cyan-950 bg-cyan-50/70 border-x border-cyan-100">Reg Fee (₹)</th>
                    <th className="p-2.5 text-right w-24">Tuition (₹)</th>
                    <th className="p-2.5 text-right w-20">Exam (₹)</th>
                    <th className="p-2.5 text-right w-22">Convey (₹)</th>
                    <th className="p-2.5 text-right w-20 text-rose-900">Fine (₹)</th>
                    <th className="p-2.5 text-right w-24 text-amber-900 bg-amber-50/50">Prev Due (₹)</th>
                    <th className="p-2.5 text-right w-24 font-black text-blue-950">
                      Total Due (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        No rows found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row) => {
                      const actualIdx = parseResult.rows.indexOf(row);
                      const isMatched = row.matchedStudent !== null;

                      return (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-slate-50 transition ${
                            !row.isSelected ? 'opacity-60 bg-slate-50/50' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.isSelected}
                              disabled={!isMatched}
                              onChange={() => handleToggleRow(actualIdx)}
                              className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* Excel Record */}
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">
                              {row.rawStudentName || (
                                <span className="text-red-500 italic">Empty Name</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap gap-1">
                              <span>Class: {row.rawClassName || '—'}</span>
                              <span>•</span>
                              <span>F: {row.rawFatherName || '—'}</span>
                            </div>
                            {row.rawAdmissionNo && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Adm: {row.rawAdmissionNo}
                              </span>
                            )}
                          </td>

                          {/* Database Match Status */}
                          <td className="p-2.5">
                            {row.matchedStudent ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      row.matchConfidence === 'exact'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    {row.matchConfidence === 'exact'
                                      ? '100% Exact Match'
                                      : 'Fuzzy Matched'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRowIndex(actualIdx)}
                                    className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                                  >
                                    Change
                                  </button>
                                </div>
                                <div className="text-xs font-bold text-blue-950">
                                  {row.matchedStudent.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight">
                                  F: {row.matchedStudent.fatherName} • Adm:{' '}
                                  {row.matchedStudent.admissionNo} • Roll: #
                                  {row.matchedStudent.rollNo}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                  <AlertCircle className="w-3 h-3" />
                                  Not Found in DB
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  No student matched Name, Class & Father.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingRowIndex(actualIdx)}
                                  className="text-[11px] font-bold text-blue-800 hover:text-blue-950 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Search className="w-3 h-3" /> Link Manually
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Head-wise numeric inputs / cells: Adm, Reg, Tuition, Exam, Convey, Fine, Prev Due, Total Due */}
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={row.heads.admissionFee}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'admissionFee',
                                  Number(e.target.value)
                                )
                              }
                              className="w-18 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-right bg-cyan-50/30 border-x border-cyan-100">
                            <input
                              type="number"
                              value={row.heads.registrationFee}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'registrationFee',
                                  Number(e.target.value)
                                )
                              }
                              className="w-18 text-right bg-cyan-50/50 hover:bg-white focus:bg-white border border-cyan-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-cyan-900"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={row.heads.tuitionFee}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'tuitionFee',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={row.heads.examFee}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'examFee',
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={row.heads.conveyFee}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'conveyFee',
                                  Number(e.target.value)
                                )
                              }
                              className="w-18 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={row.heads.lateFine}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'lateFine',
                                  Number(e.target.value)
                                )
                              }
                              className="w-18 text-right bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-semibold text-rose-700"
                            />
                          </td>
                          <td className="p-2.5 text-right bg-amber-50/30">
                            <input
                              type="number"
                              value={row.heads.previousDue}
                              onChange={(e) =>
                                handleUpdateHeadAmount(
                                  actualIdx,
                                  'previousDue',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 text-right bg-amber-50/50 hover:bg-white focus:bg-white border border-amber-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-amber-900"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <span className="font-extrabold text-blue-950 font-mono text-xs">
                              ₹{row.heads.totalDue.toLocaleString('en-IN')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer / Action Commit Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5 text-xs text-slate-600">
            {parseResult ? (
              <>
                <span>
                  <strong>{selectedCount}</strong> students selected for update • Total:{' '}
                  <strong>₹{totalSelectedDueAmount.toLocaleString('en-IN')}</strong> (
                  {updateMode === 'exactSheetTotal'
                    ? '⚡ Exact Sheet Total (शीट का कुल बकाया हूबहू लागू होगा)'
                    : updateMode === 'registrationFeeOnly'
                    ? '⚡ Registration Fee Only (चालू सत्र का ट्यूशन व अन्य शुल्क सुरक्षित)'
                    : updateMode === 'previousDueOnly'
                    ? '⚡ Previous Due Only (चालू सत्र का शुल्क सुरक्षित)'
                    : updateMode === 'replace'
                    ? 'Set Exact Assessment'
                    : 'Add to Existing Dues'}
                  )
                </span>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={resetNonSheetStudentsDues}
                    onChange={(e) => setResetNonSheetStudentsDues(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    Reset dues of other school students not in this sheet to ₹0 (शीट से बाहर के छात्रों का बकाया ₹0 करें ताकि ऐप का कुल ठीक ₹{(parseResult.totalSheetDueAmount || parseResult.totalDueAmount).toLocaleString('en-IN')} रहे)
                  </span>
                </label>
              </>
            ) : (
              <span>Upload an Excel spreadsheet to preview matching and head-wise dues.</span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            {parseResult && (
              <button
                type="button"
                disabled={selectedCount === 0 || isSaving}
                onClick={handleCommitDues}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition cursor-pointer active:scale-95 ${
                  updateMode === 'exactSheetTotal'
                    ? 'bg-blue-900 hover:bg-blue-800'
                    : updateMode === 'registrationFeeOnly'
                    ? 'bg-cyan-700 hover:bg-cyan-800'
                    : updateMode === 'previousDueOnly'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-600'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Dues...</span>
                  </>
                ) : (
                  <>
                    {updateMode === 'exactSheetTotal' ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-200" />
                    ) : updateMode === 'registrationFeeOnly' ? (
                      <Receipt className="w-4 h-4 text-cyan-200" />
                    ) : updateMode === 'previousDueOnly' ? (
                      <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>
                      {updateMode === 'exactSheetTotal'
                        ? `शीट का कुल बकाया लागू करें / Apply Sheet Due (₹${totalSelectedDueAmount.toLocaleString('en-IN')})`
                        : updateMode === 'registrationFeeOnly'
                        ? `Registration Fee भरें (${selectedCount})`
                        : updateMode === 'previousDueOnly'
                        ? `Previous Due भरें (${selectedCount})`
                        : updateMode === 'replace'
                        ? `सभी फीस हेड भरें / Apply All Heads (${selectedCount})`
                        : `Apply & Add Due Fees (${selectedCount})`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Match Selector Dialog */}
      {editingRowIndex !== null && parseResult && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Manually Link Excel Row to Student
              </h4>
              <button
                onClick={() => setEditingRowIndex(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs mb-3">
              <span className="font-bold text-blue-900 block">Excel Row Data:</span>
              <div className="text-slate-700 mt-1">
                Name: <strong>{parseResult.rows[editingRowIndex].rawStudentName}</strong> • Class:{' '}
                <strong>{parseResult.rows[editingRowIndex].rawClassName}</strong> • Father:{' '}
                <strong>{parseResult.rows[editingRowIndex].rawFatherName}</strong>
              </div>
            </div>

            {/* Potential Candidate recommendations */}
            {parseResult.rows[editingRowIndex].candidateMatches.length > 0 && (
              <div className="mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Suggested Matches:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {parseResult.rows[editingRowIndex].candidateMatches.map((cand) => (
                    <div
                      key={cand.student.id}
                      onClick={() => handleManualAssign(editingRowIndex, cand.student)}
                      className="p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {cand.student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          F: {cand.student.fatherName} • Adm: {cand.student.admissionNo} • Score:{' '}
                          {cand.score}%
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded">
                        Link
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search All Students */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Search Any Student in School:
              </span>
              <input
                type="text"
                placeholder="Search by student name, father name, or admission no..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs mb-2"
                autoFocus
              />
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredDbStudents.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleManualAssign(editingRowIndex, st)}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{st.fullName}</div>
                      <div className="text-[10px] text-slate-500">
                        Father: {st.fatherName} • Adm: {st.admissionNo} • Roll: #{st.rollNo}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-100"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingRowIndex(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
