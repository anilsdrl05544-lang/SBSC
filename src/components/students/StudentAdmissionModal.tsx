import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Student } from '../../types/school';
import { formatDateToDDMMYYYY, normalizeDateToYYYYMMDD, isValidDDMMYYYY } from '../../utils/dateUtils';
import {
  X,
  Save,
  User,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Shield,
  BookOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
  Calculator,
  RotateCcw,
  Sparkles,
  Zap,
  Bus,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { LOCAL_STOPPAGE_VILLAGES } from '../../data/conveyanceData';
import { getStudentPasswordBreakdown } from '../../utils/studentAuthUtils';

interface StudentAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: Student | null;
  onDelete?: (student: Student) => void;
}

export const StudentAdmissionModal: React.FC<StudentAdmissionModalProps> = ({
  isOpen,
  onClose,
  studentToEdit,
  onDelete,
}) => {
  const { addStudent, updateStudent, classes, students, settings, feePayments, getStudentFeeBreakdown } = useSchool();

  const [autoSumTotal, setAutoSumTotal] = useState(true);

  // Compute fee breakdown for student to edit or initial defaults
  const initialFeeData = useMemo(() => {
    if (studentToEdit) {
      const breakdown = getStudentFeeBreakdown(studentToEdit.id);
      return {
        tuitionFee: breakdown.tuitionFee,
        admissionFee: breakdown.admissionFee,
        registrationFee: breakdown.registrationFee,
        examFee: breakdown.examFee,
        conveyFee: breakdown.conveyFee === 600 ? 0 : breakdown.conveyFee,
        previousDue: breakdown.previousDue ?? 0,
        lateFine: breakdown.lateFine,
        totalYearlyDue: breakdown.conveyFee === 600 && breakdown.totalYearlyDue >= 600 ? breakdown.totalYearlyDue - 600 : breakdown.totalYearlyDue,
        totalPaid: breakdown.totalPaid,
      };
    }
    const targetClass = classes[0];
    const defaultTuition = (targetClass?.monthlyFee || 1500) * 12;
    const defaultAdm = 2000;
    const defaultReg = 1000;
    const defaultExam = 1500;
    const defaultConvey = 0;
    const defaultPreviousDue = 0;
    const defaultFine = 0;
    return {
      tuitionFee: defaultTuition,
      admissionFee: defaultAdm,
      registrationFee: defaultReg,
      examFee: defaultExam,
      conveyFee: defaultConvey,
      previousDue: defaultPreviousDue,
      lateFine: defaultFine,
      totalYearlyDue: defaultTuition + defaultAdm + defaultReg + defaultExam + defaultConvey + defaultPreviousDue + defaultFine,
      totalPaid: 0,
    };
  }, [studentToEdit, classes, getStudentFeeBreakdown]);

  const [formData, setFormData] = useState<Omit<Student, 'id'>>(() => {
    if (studentToEdit) {
      const { id, ...rest } = studentToEdit;
      return {
        ...rest,
        password: rest.password || '',
        dob: normalizeDateToYYYYMMDD(rest.dob) || rest.dob,
        tuitionFee: rest.tuitionFee ?? initialFeeData.tuitionFee,
        admissionFee: rest.admissionFee ?? initialFeeData.admissionFee,
        registrationFee: rest.registrationFee ?? initialFeeData.registrationFee,
        examFee: rest.examFee ?? initialFeeData.examFee,
        conveyFee: rest.conveyFee === 600 ? 0 : (rest.conveyFee ?? initialFeeData.conveyFee),
        previousDue: rest.previousDue ?? initialFeeData.previousDue,
        lateFine: rest.lateFine ?? initialFeeData.lateFine,
        totalYearlyDue:
          rest.conveyFee === 600 && typeof rest.totalYearlyDue === 'number' && rest.totalYearlyDue >= 600
            ? rest.totalYearlyDue - 600
            : (rest.totalYearlyDue ?? initialFeeData.totalYearlyDue),
      };
    }
    const count = students.length + 1;
    const currentYear = new Date().getFullYear();
    return {
      admissionNo: `SBSC/${currentYear}/${String(count + 1040).padStart(4, '0')}`,
      rollNo: String(count + 100),
      fullName: '',
      gender: 'Male',
      dob: '2012-05-15',
      classId: classes[0]?.id || 'c-10',
      section: 'A',
      bloodGroup: 'B+',
      aadhaarNo: '',
      fatherName: '',
      motherName: '',
      guardianPhone: '',
      email: '',
      address: 'Bairwa Nankar, Siddharthnagar, UP',
      admissionDate: new Date().toISOString().slice(0, 10),
      status: 'Active',
      category: 'General',
      emergencyContact: '',
      previousSchool: '',
      board: studentToEdit?.board || 'UP BOARD',
      password: '',
      tuitionFee: initialFeeData.tuitionFee,
      admissionFee: initialFeeData.admissionFee,
      registrationFee: initialFeeData.registrationFee,
      examFee: initialFeeData.examFee,
      conveyFee: initialFeeData.conveyFee,
      previousDue: initialFeeData.previousDue,
      lateFine: initialFeeData.lateFine,
      totalYearlyDue: initialFeeData.totalYearlyDue,
    };
  });

  const [dobTextInput, setDobTextInput] = useState(() => formatDateToDDMMYYYY(formData.dob));
  const [dobError, setDobError] = useState<string | null>(null);
  const [registrationDateTextInput, setRegistrationDateTextInput] = useState(() =>
    formatDateToDDMMYYYY(formData.admissionDate)
  );
  const [registrationDateError, setRegistrationDateError] = useState<string | null>(null);
  const [copiedLoginPass, setCopiedLoginPass] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Auto-calculated student portal login password
  const studentPortalPassword = useMemo(() => {
    return getStudentPasswordBreakdown(formData.fullName, formData.guardianPhone);
  }, [formData.fullName, formData.guardianPhone]);

  useEffect(() => {
    if (studentToEdit) {
      const { id, ...rest } = studentToEdit;
      const normalizedDob = normalizeDateToYYYYMMDD(rest.dob) || rest.dob;
      const normalizedAdmDate =
        normalizeDateToYYYYMMDD(rest.admissionDate) || rest.admissionDate || new Date().toISOString().slice(0, 10);
      const breakdown = getStudentFeeBreakdown(studentToEdit.id);
      const tuitionFee = rest.tuitionFee ?? breakdown.tuitionFee;
      const admissionFee = rest.admissionFee ?? breakdown.admissionFee;
      const registrationFee = rest.registrationFee ?? breakdown.registrationFee;
      const examFee = rest.examFee ?? breakdown.examFee;
      const rawConv = rest.conveyFee ?? breakdown.conveyFee;
      const conveyFee = rawConv === 600 ? 0 : (rawConv ?? 0);
      const previousDue = rest.previousDue ?? breakdown.previousDue ?? 0;
      const lateFine = rest.lateFine ?? breakdown.lateFine;
      const computedHeadsSum =
        tuitionFee + admissionFee + registrationFee + examFee + conveyFee + previousDue + lateFine;

      const rawSavedTotal =
        (rawConv === 600 || breakdown.conveyFee === 600) &&
        typeof (rest.totalYearlyDue ?? breakdown.totalYearlyDue) === 'number' &&
        (rest.totalYearlyDue ?? breakdown.totalYearlyDue)! >= 600
          ? (rest.totalYearlyDue ?? breakdown.totalYearlyDue)! - 600
          : (rest.totalYearlyDue ?? breakdown.totalYearlyDue);

      const isCustomOverride =
        typeof rawSavedTotal === 'number' && rawSavedTotal !== computedHeadsSum;

      setFormData({
        ...rest,
        password: studentToEdit.password || '',
        board: studentToEdit.board || 'UP BOARD',
        dob: normalizedDob,
        admissionDate: normalizedAdmDate,
        tuitionFee,
        admissionFee,
        registrationFee,
        examFee,
        conveyFee,
        previousDue,
        lateFine,
        totalYearlyDue: isCustomOverride ? rawSavedTotal : computedHeadsSum,
      });
      setAutoSumTotal(!isCustomOverride);
      setDobTextInput(formatDateToDDMMYYYY(normalizedDob));
      setDobError(null);
      setRegistrationDateTextInput(formatDateToDDMMYYYY(normalizedAdmDate));
      setRegistrationDateError(null);
      setFormError(null);
      setFormSuccess(null);
    } else {
      const count = students.length + 1;
      const currentYear = new Date().getFullYear();
      const defaultDob = '2012-05-15';
      const defaultAdmDate = new Date().toISOString().slice(0, 10);
      const targetClass = classes[0];
      const defaultTuition = (targetClass?.monthlyFee || 1500) * 12;
      const defaultAdm = 2000;
      const defaultReg = 1000;
      const defaultExam = 1500;
      const defaultConvey = 0;
      const defaultPreviousDue = 0;
      const defaultFine = 0;
      const defaultTotal = defaultTuition + defaultAdm + defaultReg + defaultExam + defaultConvey + defaultPreviousDue + defaultFine;

      setFormData({
        admissionNo: `SBSC/${currentYear}/${String(count + 1040).padStart(4, '0')}`,
        rollNo: String(count + 100),
        fullName: '',
        gender: 'Male',
        dob: defaultDob,
        classId: classes[0]?.id || 'c-10',
        section: 'A',
        bloodGroup: 'B+',
        aadhaarNo: '',
        fatherName: '',
        motherName: '',
        guardianPhone: '',
        email: '',
        address: 'Riwa Nankar, Siddharthnagar, UP',
        admissionDate: defaultAdmDate,
        status: 'Active',
        category: 'General',
        emergencyContact: '',
        previousSchool: '',
        board: 'UP BOARD',
        password: '',
        tuitionFee: defaultTuition,
        admissionFee: defaultAdm,
        registrationFee: defaultReg,
        examFee: defaultExam,
        conveyFee: defaultConvey,
        previousDue: defaultPreviousDue,
        lateFine: defaultFine,
        totalYearlyDue: defaultTotal,
      });
      setAutoSumTotal(true);
      setDobTextInput(formatDateToDDMMYYYY(defaultDob));
      setDobError(null);
      setRegistrationDateTextInput(formatDateToDDMMYYYY(defaultAdmDate));
      setRegistrationDateError(null);
      setFormError(null);
      setFormSuccess(null);
    }
  }, [studentToEdit, isOpen, classes, getStudentFeeBreakdown]);

  const handleFeeFieldChange = (
    field: 'tuitionFee' | 'admissionFee' | 'registrationFee' | 'examFee' | 'conveyFee' | 'previousDue' | 'lateFine',
    val: number
  ) => {
    setFormData((prev) => {
      const sanitizedVal = Math.max(0, val);
      const next = { ...prev, [field]: sanitizedVal };
      if (autoSumTotal) {
        const tuition = field === 'tuitionFee' ? sanitizedVal : (next.tuitionFee ?? 0);
        const adm = field === 'admissionFee' ? sanitizedVal : (next.admissionFee ?? 0);
        const reg = field === 'registrationFee' ? sanitizedVal : (next.registrationFee ?? 0);
        const ex = field === 'examFee' ? sanitizedVal : (next.examFee ?? 0);
        const rawConv = field === 'conveyFee' ? sanitizedVal : (next.conveyFee ?? 0);
        const conv = rawConv === 600 ? 0 : rawConv;
        const prevDue = field === 'previousDue' ? sanitizedVal : (next.previousDue ?? 0);
        const fine = field === 'lateFine' ? sanitizedVal : (next.lateFine ?? 0);
        next.totalYearlyDue = tuition + adm + reg + ex + conv + prevDue + fine;
      }
      return next;
    });
  };

  const handleSelectVillage = (villageName: string) => {
    const vMaster = LOCAL_STOPPAGE_VILLAGES.find((v) => v.village === villageName);
    if (!vMaster) return;

    setFormData((prev) => ({
      ...prev,
      conveyVillage: vMaster.village,
      conveyRoute: vMaster.defaultRoute,
      conveyVehicle: vMaster.defaultVehicle,
      conveyStop: vMaster.stoppages[0] || vMaster.village,
    }));
  };

  const handleResetToClassStandard = () => {
    const curClass = classes.find((c) => c.id === formData.classId) || classes[0];
    const stdTuition = (curClass?.monthlyFee || 1500) * 12;
    const stdAdm = 2000;
    const stdReg = 1000;
    const stdExam = 1500;
    const stdConvey = formData.conveyFee && formData.conveyFee > 0 && formData.conveyFee !== 600 ? formData.conveyFee : 0;
    const stdPrevDue = formData.previousDue || 0;
    const stdFine = 0;
    const stdTotal = stdTuition + stdAdm + stdReg + stdExam + stdConvey + stdPrevDue + stdFine;

    setFormData((prev) => ({
      ...prev,
      tuitionFee: stdTuition,
      admissionFee: stdAdm,
      registrationFee: stdReg,
      examFee: stdExam,
      conveyFee: stdConvey,
      previousDue: stdPrevDue,
      lateFine: stdFine,
      totalYearlyDue: stdTotal,
    }));
  };

  const studentPayments = studentToEdit
    ? feePayments.filter((f) => f.studentId === studentToEdit.id && f.status !== 'Cancelled')
    : [];
  const paidAmount = studentPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const discountAmount = studentPayments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0);

  const currentOutstanding = Math.max(0, (formData.totalYearlyDue || 0) - (paidAmount + discountAmount));

  const getCalculatedAge = (dobIso: string) => {
    if (!dobIso) return null;
    const birth = new Date(dobIso);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (years < 0) return null;
    return `${years} yrs ${months > 0 ? `${months} mos` : ''}`;
  };

  const handleDobTextChange = (value: string) => {
    setDobTextInput(value);
    const clean = value.trim();
    if (!clean) {
      setDobError('Date of birth is required');
      return;
    }
    if (/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.test(clean)) {
      if (isValidDDMMYYYY(clean)) {
        const standard = normalizeDateToYYYYMMDD(clean);
        const today = new Date().toISOString().slice(0, 10);
        if (standard > today) {
          setDobError('Date of birth cannot be in the future');
        } else {
          setFormData((prev) => {
            if (prev.admissionDate && standard > prev.admissionDate) {
              setDobError('Date of birth cannot be after registration date');
            } else {
              setDobError(null);
            }
            return { ...prev, dob: standard };
          });
        }
      } else {
        setDobError('Invalid calendar date (e.g. check days in month)');
      }
    } else if (/^\d{8}$/.test(clean)) {
      const formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
      if (isValidDDMMYYYY(formatted)) {
        const standard = normalizeDateToYYYYMMDD(formatted);
        setDobTextInput(formatted);
        setFormData((prev) => ({ ...prev, dob: standard }));
        setDobError(null);
      }
    } else if (clean.length >= 10) {
      setDobError('Please use DD/MM/YYYY format');
    } else {
      setDobError(null);
    }
  };

  const handleDatePickerChange = (isoDate: string) => {
    if (!isoDate) return;
    const today = new Date().toISOString().slice(0, 10);
    if (isoDate > today) {
      setDobError('Date of birth cannot be in the future');
      return;
    }
    setFormData((prev) => {
      if (prev.admissionDate && isoDate > prev.admissionDate) {
        setDobError('Date of birth cannot be after registration date');
      } else {
        setDobError(null);
      }
      return { ...prev, dob: isoDate };
    });
    setDobTextInput(formatDateToDDMMYYYY(isoDate));
  };

  const handleRegistrationDateTextChange = (value: string) => {
    setRegistrationDateTextInput(value);
    const clean = value.trim();
    if (!clean) {
      setRegistrationDateError('Registration date is required');
      return;
    }
    if (/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.test(clean)) {
      if (isValidDDMMYYYY(clean)) {
        const standard = normalizeDateToYYYYMMDD(clean);
        setFormData((prev) => {
          if (prev.dob && standard < prev.dob) {
            setRegistrationDateError('Registration date cannot be before Date of Birth');
          } else {
            setRegistrationDateError(null);
          }
          return { ...prev, admissionDate: standard };
        });
      } else {
        setRegistrationDateError('Invalid calendar date');
      }
    } else if (/^\d{8}$/.test(clean)) {
      const formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
      if (isValidDDMMYYYY(formatted)) {
        const standard = normalizeDateToYYYYMMDD(formatted);
        setRegistrationDateTextInput(formatted);
        setFormData((prev) => ({ ...prev, admissionDate: standard }));
        setRegistrationDateError(null);
      }
    } else if (clean.length >= 10) {
      setRegistrationDateError('Please use DD/MM/YYYY format');
    } else {
      setRegistrationDateError(null);
    }
  };

  const handleRegistrationDatePickerChange = (isoDate: string) => {
    if (!isoDate) return;
    setFormData((prev) => {
      if (prev.dob && isoDate < prev.dob) {
        setRegistrationDateError('Registration date cannot be before Date of Birth');
      } else {
        setRegistrationDateError(null);
      }
      return { ...prev, admissionDate: isoDate };
    });
    setRegistrationDateTextInput(formatDateToDDMMYYYY(isoDate));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.fullName.trim() || !formData.fatherName.trim() || !formData.guardianPhone.trim()) {
      setFormError('कृपया सभी आवश्यक विवरण भरें: छात्र का नाम, पिता का नाम और अभिभावक का मोबाइल नंबर।');
      return;
    }

    // Validate DOB
    if (!formData.dob || !isValidDDMMYYYY(formatDateToDDMMYYYY(formData.dob))) {
      setDobError('Valid Date of Birth (DD/MM/YYYY) is required.');
      setFormError('कृपया वैध जन्म तिथि (DD/MM/YYYY) दर्ज करें।');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (formData.dob > today) {
      setDobError('Date of Birth cannot be in the future.');
      setFormError('जन्म तिथि भविष्य की तारीख नहीं हो सकती।');
      return;
    }

    // Validate Registration Date
    if (!formData.admissionDate || !isValidDDMMYYYY(formatDateToDDMMYYYY(formData.admissionDate))) {
      setRegistrationDateError('Valid Registration Date (DD/MM/YYYY) is required.');
      setFormError('कृपया वैध प्रवेश / पंजीकरण तिथि दर्ज करें।');
      return;
    }
    if (formData.dob > formData.admissionDate) {
      setRegistrationDateError('Registration Date cannot be earlier than Date of Birth.');
      setFormError('प्रवेश तिथि जन्म तिथि से पहले नहीं हो सकती।');
      return;
    }

    if (dobError) {
      setFormError(`Date of Birth error: ${dobError}`);
      return;
    }
    if (registrationDateError) {
      setFormError(`Registration Date error: ${registrationDateError}`);
      return;
    }

    if (studentToEdit) {
      const isPhoneChanged =
        formData.guardianPhone &&
        studentToEdit.guardianPhone &&
        formData.guardianPhone.trim() !== studentToEdit.guardianPhone.trim();

      const updatedPreviousPhones = Array.from(
        new Set([
          ...(studentToEdit.previousPhones || []),
          ...(isPhoneChanged ? [studentToEdit.guardianPhone.trim()] : []),
        ])
      ).filter(Boolean);

      const updatedData: Partial<Student> = {
        ...formData,
        password: formData.password && formData.password.trim() ? formData.password.trim() : undefined,
        previousPhones: updatedPreviousPhones,
        oldPhone: isPhoneChanged ? studentToEdit.guardianPhone.trim() : studentToEdit.oldPhone,
      };

      updateStudent(studentToEdit.id, updatedData);
      setFormSuccess('✓ छात्र विवरण सफलतापूर्वक संशोधित (अपडेट) कर दिया गया!');
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      addStudent({
        ...formData,
        emergencyContact: formData.emergencyContact || formData.guardianPhone,
      });
      setFormSuccess('✓ नवीन छात्र प्रवेश सफलतापूर्वक दर्ज कर लिया गया!');
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
              {studentToEdit && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  संशोधन मोड (Edit Record)
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold mt-0.5">
              {studentToEdit
                ? 'Edit Student Details (छात्र का गलत विवरण सुधारें / संशोधन)'
                : 'New Student Admission Entry (नवीन छात्र प्रवेश)'}
            </h3>
            {studentToEdit && (
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                वर्तमान छात्र: <span className="font-bold text-white uppercase">{studentToEdit.fullName}</span> • अनुक्रमांक: #{studentToEdit.rollNo} • प्रवेश सं: {studentToEdit.admissionNo}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner when editing */}
        {studentToEdit && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-950 font-medium">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              छात्र के नाम, पिता का नाम, माता का नाम, जन्म तिथि (DOB), मोबाइल नंबर, रोल नंबर, कक्षा, सेक्शन, बोर्ड या पते में कोई भी गलत विवरण दर्ज हो गया हो, तो नीचे आवश्यक सुधार करके <strong>'बदलाव सुरक्षित करें'</strong> पर क्लिक करें।
            </span>
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Success Alert */}
        {formSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Section 1: Basic Particulars */}
          <div>
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b pb-1">
              <User className="w-4 h-4 text-blue-900" />
              <span>1. Basic Student Particulars</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Admission No. *</label>
                <input
                  type="text"
                  required
                  value={formData.admissionNo}
                  onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-950 focus:outline-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Roll No. *</label>
                <input
                  type="text"
                  required
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Singh"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold uppercase text-slate-900 focus:outline-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Class *</label>
                <select
                  value={formData.classId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    const newCls = classes.find((c) => c.id === newClassId);
                    const newTuition = (newCls?.monthlyFee || 1500) * 12;
                    setFormData((prev) => {
                      const next = { ...prev, classId: newClassId };
                      if (autoSumTotal && !studentToEdit) {
                        next.tuitionFee = newTuition;
                        const rawConv = next.conveyFee || 0;
                        const effConv = rawConv === 600 ? 0 : rawConv;
                        next.totalYearlyDue =
                          newTuition +
                          (next.admissionFee || 0) +
                          (next.registrationFee || 0) +
                          (next.examFee || 0) +
                          effConv +
                          (next.previousDue || 0) +
                          (next.lateFine || 0);
                      }
                      return next;
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-blue-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Section *</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-blue-900"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Education Board (शिक्षा बोर्ड)</label>
                <select
                  value={formData.board || 'UP BOARD'}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:outline-blue-900"
                >
                  <option value="UP BOARD">UP BOARD (उत्तर प्रदेश माध्यमिक शिक्षा परिषद्)</option>
                  <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Recognized">UP State Recognized</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs uppercase tracking-wide">
                  Gender / लिंग *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'Male' })}
                    className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      formData.gender === 'Male'
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs ring-2 ring-blue-500/30'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900'
                    }`}
                  >
                    <span className="text-base leading-none">👦</span>
                    <div className="text-left">
                      <span className="block font-extrabold leading-tight">Male</span>
                      <span className="text-[10px] opacity-80 leading-tight block">लड़का (Boy)</span>
                    </div>
                    {formData.gender === 'Male' && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-amber-300 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'Female' })}
                    className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      formData.gender === 'Female'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400/30'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-900'
                    }`}
                  >
                    <span className="text-base leading-none">👧</span>
                    <div className="text-left">
                      <span className="block font-extrabold leading-tight">Female</span>
                      <span className="text-[10px] opacity-80 leading-tight block">लड़की (Girl)</span>
                    </div>
                    {formData.gender === 'Female' && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-amber-300 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <label className="block text-slate-700 font-bold text-xs uppercase tracking-wide">
                      Date of Birth *
                    </label>
                    <span className="text-[10px] text-slate-500 font-normal">जन्म तिथि</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getCalculatedAge(formData.dob) && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                        {getCalculatedAge(formData.dob)}
                      </span>
                    )}
                    <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                      {formatDateToDDMMYYYY(formData.dob)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={dobTextInput}
                      onChange={(e) => handleDobTextChange(e.target.value)}
                      maxLength={10}
                      className={`w-full bg-slate-50 border ${
                        dobError ? 'border-rose-400 focus:outline-rose-600 ring-1 ring-rose-200' : 'border-slate-300 focus:outline-blue-900'
                      } rounded-lg p-2 text-xs font-mono font-bold text-slate-800`}
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Type DD/MM/YYYY</span>
                  </div>

                  <div>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={normalizeDateToYYYYMMDD(formData.dob)}
                      onChange={(e) => handleDatePickerChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-blue-900"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Or calendar pick</span>
                  </div>
                </div>

                {dobError ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{dobError}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Selected DOB: <b>{formatDateToDDMMYYYY(formData.dob)}</b></span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-red-700 focus:outline-blue-900"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-blue-900"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Parent & Guardian Details */}
          <div>
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b pb-1">
              <Phone className="w-4 h-4 text-blue-900" />
              <span>2. Parent & Contact Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Father's Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Anil Kumar Singh"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mother's Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Rekha Singh"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Guardian Phone (SMS Alerts) *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 94151 88990"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-blue-950 focus:outline-blue-900"
                />

                {/* Auto-Created Student Portal Login Password Card */}
                <div className="mt-2.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Student Portal Login Password (लॉगिन पासवर्ड)</span>
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                      {formData.password ? 'Custom Password' : 'Auto-Formula'}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-2 border border-emerald-200/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">
                        {formData.password ? 'Active Custom Password (कस्टम पासवर्ड)' : 'Login Password (नाम के 4 अक्षर + मोबाइल के 4 अंक)'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-950 font-mono tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-300">
                          {formData.password || studentPortalPassword.password}
                        </span>
                        {!formData.password && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({studentPortalPassword.namePart} + {studentPortalPassword.phonePart})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const passToCopy = formData.password || studentPortalPassword.password;
                        try {
                          await navigator.clipboard.writeText(passToCopy);
                          setCopiedLoginPass(true);
                          setTimeout(() => setCopiedLoginPass(false), 2000);
                        } catch {
                          window.prompt('Student Password:', passToCopy);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer shrink-0"
                      title="Copy student password"
                    >
                      {copiedLoginPass ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Custom Password Input / Reset */}
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700">
                        गलत पासवर्ड बदलें / नया पासवर्ड सेट करें:
                      </span>
                      {formData.password ? (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: '' })}
                          className="text-[9.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                          title="Reset to default Name+Mobile formula"
                        >
                          डिफ़ॉल्ट फॉर्मूला पर रीसेट करें
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      placeholder="खाली छोड़ें डिफ़ॉल्ट फॉर्मूला के लिए, अथवा नया पासवर्ड लिखें"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-blue-950 focus:outline-blue-900"
                    />
                  </div>

                  <p className="text-[10px] text-emerald-900 mt-1.5 leading-tight">
                    लॉगिन विवरण: ID: <strong className="font-mono">{formData.admissionNo || 'Admission No'}</strong> या मोबाइल नंबर • पासवर्ड: <strong className="font-mono">{formData.password || studentPortalPassword.password}</strong>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Aadhaar Card No.</label>
                <input
                  type="text"
                  placeholder="XXXX XXXX XXXX"
                  value={formData.aadhaarNo || ''}
                  onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-800 focus:outline-blue-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <label className="block text-slate-700 font-bold text-xs uppercase tracking-wide">
                      Registration Date *
                    </label>
                    <span className="text-[10px] text-slate-500 font-normal">पंजीकरण तिथि</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                    {formatDateToDDMMYYYY(formData.admissionDate)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={registrationDateTextInput}
                      onChange={(e) => handleRegistrationDateTextChange(e.target.value)}
                      maxLength={10}
                      className={`w-full bg-slate-50 border ${
                        registrationDateError ? 'border-rose-400 focus:outline-rose-600 ring-1 ring-rose-200' : 'border-slate-300 focus:outline-blue-900'
                      } rounded-lg p-2 text-xs font-mono font-bold text-slate-800`}
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Type DD/MM/YYYY</span>
                  </div>

                  <div>
                    <input
                      type="date"
                      required
                      value={normalizeDateToYYYYMMDD(formData.admissionDate)}
                      onChange={(e) => handleRegistrationDatePickerChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-blue-900"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Or calendar pick</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      handleRegistrationDatePickerChange(today);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
                  >
                    📅 Today (आज)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const year = new Date().getFullYear();
                      handleRegistrationDatePickerChange(`${year}-04-01`);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer"
                  >
                    🏫 1 April (सत्र आरंभ)
                  </button>
                </div>

                {registrationDateError ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{registrationDateError}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Confirmed: <b>{formatDateToDDMMYYYY(formData.admissionDate)}</b></span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Enrollment Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-emerald-800 focus:outline-blue-900"
                >
                  <option value="Active">Active (Currently Studying)</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Transferred">Transferred (TC Issued)</option>
                  <option value="Alumni">Alumni / Passed Out</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Full Residential Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Village/Mohalla, Post, District, PIN"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-blue-900"
                />
              </div>

              {/* School Transport / Conveyance Section */}
              <div className="sm:col-span-3 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-300 rounded-xl p-3 space-y-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-emerald-950">
                        School Transport / Conveyance (वाहन सुविधा)
                      </h5>
                      <p className="text-[11px] text-emerald-700">
                        Select village/stoppage or route (Optional)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Village / Belt (गाँव / क्षेत्र)
                    </label>
                    <select
                      value={formData.conveyVillage || ''}
                      onChange={(e) => handleSelectVillage(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 font-bold text-emerald-950 focus:outline-emerald-800"
                    >
                      <option value="">-- Select Village / Area --</option>
                      {LOCAL_STOPPAGE_VILLAGES.map((v) => (
                        <option key={v.village} value={v.village}>
                          {v.village} ({v.hindiName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Route & Vehicle (मार्ग व वाहन)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Riwa Nankar Belt"
                      value={formData.conveyRoute || ''}
                      onChange={(e) => setFormData({ ...formData, conveyRoute: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Assigned Stoppage (स्टॉपेज)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Primary School Mod"
                      value={formData.conveyStop || ''}
                      onChange={(e) => setFormData({ ...formData, conveyStop: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-emerald-800"
                    />
                  </div>
                </div>

                {(formData.conveyVehicle || formData.conveyRoute) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-900 bg-white/90 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                    <span className="font-bold">🚌 Assigned:</span>
                    <span>{formData.conveyVehicle || 'School Transport'}</span>
                    {formData.conveyDriverName && <span>• Driver: {formData.conveyDriverName} ({formData.conveyDriverPhone})</span>}
                    {formData.conveyFee ? (
                      <span className="ml-auto font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded">
                        Convey Fee: ₹{formData.conveyFee}/mo
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Yearly Fee Due Assessment & Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>3. Total Due Fees & Annual Breakdown</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Specify exact annual fees including Tuition, Admission, Registration, Exam, Conveyance, and Late Fine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer select-none bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                  <input
                    type="checkbox"
                    checked={autoSumTotal}
                    onChange={(e) => {
                      setAutoSumTotal(e.target.checked);
                      if (e.target.checked) {
                        const rawConv = formData.conveyFee || 0;
                        const effConv = rawConv === 600 ? 0 : rawConv;
                        const sum =
                          (formData.tuitionFee || 0) +
                          (formData.admissionFee || 0) +
                          (formData.registrationFee || 0) +
                          (formData.examFee || 0) +
                          effConv +
                          (formData.previousDue || 0) +
                          (formData.lateFine || 0);
                        setFormData((prev) => ({ ...prev, totalYearlyDue: sum }));
                      }
                    }}
                    className="rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
                  />
                  <span>Auto-sum Total</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setAutoSumTotal(true);
                    setFormData((prev) => ({
                      ...prev,
                      tuitionFee: 0,
                      admissionFee: 0,
                      registrationFee: 0,
                      examFee: 0,
                      conveyFee: 0,
                      previousDue: 0,
                      lateFine: 0,
                      totalYearlyDue: 0,
                      scholarshipStatus: '100% Fee Concession / Zero Fee',
                    }));
                  }}
                  className="inline-flex items-center gap-1 text-xs text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 shadow-xs font-bold transition cursor-pointer"
                  title="Zero out all fees (100% Free / Scholarship)"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Zero Fee (₹0)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToClassStandard}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-xs font-medium transition cursor-pointer"
                  title="Reset to default fee rate for this class"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Class Standard</span>
                </button>
              </div>
            </div>

            {/* 6 Fee Breakdown Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Tuition Fees */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tuition Fees (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.tuitionFee ?? ''}
                  onChange={(e) => handleFeeFieldChange('tuitionFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ~₹{Math.round((formData.tuitionFee || 0) / 12)}/mo
                </span>
              </div>

              {/* Admission Fees */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Admission (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.admissionFee ?? ''}
                  onChange={(e) => handleFeeFieldChange('admissionFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">One-time / yearly</span>
              </div>

              {/* Registration Fees */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registration (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.registrationFee ?? ''}
                  onChange={(e) => handleFeeFieldChange('registrationFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Enrolment fee</span>
              </div>

              {/* Exam Fees */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Exam Fees (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.examFee ?? ''}
                  onChange={(e) => handleFeeFieldChange('examFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Annual exams</span>
              </div>

              {/* Convey Fees */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Convey Fees (₹)
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.conveyFee ?? ''}
                  onChange={(e) => handleFeeFieldChange('conveyFee', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block truncate">
                  {formData.conveyRoute ? `🚌 ${formData.conveyRoute}` : 'Bus / Transport (Optional)'}
                </span>
              </div>

              {/* Previous Due / Arrears */}
              <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-300 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold text-amber-950">
                    Previous Due (₹)
                  </label>
                  <div className="flex items-center gap-1">
                    {studentToEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const breakdown = getStudentFeeBreakdown(studentToEdit.id);
                          const amt =
                            typeof studentToEdit.previousDue === 'number' && studentToEdit.previousDue > 0
                              ? studentToEdit.previousDue
                              : (breakdown.previousDue > 0 ? breakdown.previousDue : breakdown.netDue);
                          handleFeeFieldChange('previousDue', amt);
                        }}
                        className="text-[9px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                        title="विद्यार्थी के पिछले बकाया को स्वतः भरें"
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-800" />
                        <span>ऑटो भरें (Auto-Fill)</span>
                      </button>
                    )}
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200/80 px-1 rounded">
                      पिछला बकाया
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.previousDue ?? ''}
                  onChange={(e) => handleFeeFieldChange('previousDue', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-300 rounded-md p-1.5 text-xs font-extrabold text-amber-950 focus:bg-white focus:outline-amber-800"
                  placeholder="0"
                />
                <span className="text-[10px] text-amber-800 font-medium mt-1 block">Past year balance</span>
              </div>

              {/* Late Fine */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Late Fine (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.lateFine ?? ''}
                  onChange={(e) => handleFeeFieldChange('lateFine', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 text-xs font-bold text-rose-700 focus:bg-white focus:outline-blue-900"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Penalties/Fines</span>
              </div>
            </div>

            {/* Total Yearly Due & Outstanding Banner */}
            <div className="p-3 rounded-lg bg-emerald-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-800/80 flex items-center justify-center shrink-0 border border-emerald-700">
                  <Calculator className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                      Total Yearly Due Fees
                    </span>
                    {autoSumTotal && (
                      <span className="text-[9px] bg-emerald-800 text-emerald-200 font-bold px-1.5 py-0.5 rounded">
                        Auto Sum Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-black text-white">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.totalYearlyDue ?? ''}
                      onChange={(e) => {
                        setAutoSumTotal(false);
                        setFormData({ ...formData, totalYearlyDue: parseFloat(e.target.value) || 0 });
                      }}
                      className="bg-emerald-900 border border-emerald-700 rounded-md px-2.5 py-1 text-base font-black text-white w-36 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="0"
                    />
                    {!autoSumTotal && (
                      <button
                        type="button"
                        onClick={() => {
                          setAutoSumTotal(true);
                          const rawConv = formData.conveyFee || 0;
                          const effConv = rawConv === 600 ? 0 : rawConv;
                          const sum =
                            (formData.tuitionFee || 0) +
                            (formData.admissionFee || 0) +
                            (formData.registrationFee || 0) +
                            (formData.examFee || 0) +
                            effConv +
                            (formData.previousDue || 0) +
                            (formData.lateFine || 0);
                          setFormData((prev) => ({ ...prev, totalYearlyDue: sum }));
                        }}
                        className="text-[10px] font-bold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-2 py-1 rounded border border-emerald-600 transition flex items-center gap-1 cursor-pointer"
                        title="सभी 7 मदों को जोड़कर कुल तय करें (Auto-Sum All Heads)"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Auto-sum</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-emerald-800/80 pt-2 md:pt-0 md:pl-4 w-full md:w-auto justify-between md:justify-end">
                <div>
                  <span className="text-[10px] text-emerald-300 block">Total Paid So Far</span>
                  <span className="font-bold text-emerald-100 text-sm">
                    ₹{paidAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-300 block">Net Outstanding Due</span>
                  <span className="font-black text-amber-300 text-sm">
                    ₹{currentOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t flex items-center justify-between gap-3">
            {studentToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(studentToEdit);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Delete Student</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md transition active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{studentToEdit ? 'बदलाव सुरक्षित करें (Save Changes)' : 'Complete Admission'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
