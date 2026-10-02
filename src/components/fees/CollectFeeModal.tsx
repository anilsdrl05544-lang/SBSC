import React, { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { FeePayment, Student } from '../../types/school';
import {
  X,
  Receipt,
  Printer,
  FileText,
  RotateCcw,
  Zap,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  DollarSign,
  GraduationCap,
  Calendar,
  MessageSquare,
  Scissors,
  Send,
  Phone,
} from 'lucide-react';
import {
  formatFeeReceiptWhatsAppMessage,
  generateFeeReceiptWhatsAppUrl,
  dispatchSafeMessage,
} from '../../services/whatsappService';

interface FeeHeadItem {
  id: string;
  name: string;
  hindiName?: string;
  category: 'tuition' | 'admission' | 'registration' | 'exam' | 'transport' | 'previousDue' | 'fine' | 'custom' | 'computer' | 'annual';
  fedAmount: number; // Admin द्वारा तय कुल शुल्क (Session Lump-Sum)
  alreadyPaid: number; // पूर्व में जमा की गई राशि
  currentDue: number; // वर्तमान एक मुश्त बकाया (fedAmount - alreadyPaid)
  amount: number; // अब जमा की जाने वाली राशि (Editable)
  description?: string;
  isCustom?: boolean;
}

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudent?: Student | null;
  onPaymentSuccess?: (
    payment: FeePayment,
    format: 'thermal' | 'a4' | 'a4-half',
    shouldAutoPrint?: boolean
  ) => void;
}

const MONTHS_LIST = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

export const CollectFeeModal: React.FC<CollectFeeModalProps> = ({
  isOpen,
  onClose,
  initialStudent,
  onPaymentSuccess,
}) => {
  const {
    students,
    classes,
    addFeePayment,
    feePayments,
    getStudentDueAmount,
    getStudentFeeBreakdown,
    settings,
  } = useSchool();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || students[0]?.id || ''
  );
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['August']);
  const [feeHeads, setFeeHeads] = useState<FeeHeadItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'UPI' | 'Card' | 'Cheque' | 'Net Banking'
  >('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>(
    'Monthly institutional and tuition fee cleared.'
  );
  const [printFormatPreference, setPrintFormatPreference] = useState<'thermal' | 'a4' | 'a4-half'>('a4-half');
  const [autoPrintAfterCollect, setAutoPrintAfterCollect] = useState<boolean>(true);
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState<boolean>(true);
  const [parentWhatsAppNumber, setParentWhatsAppNumber] = useState<string>(
    initialStudent?.guardianPhone || initialStudent?.emergencyContact || ''
  );

  // Custom fee head addition state
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [newCustomHeadName, setNewCustomHeadName] = useState<string>('');
  const [newCustomHeadAmount, setNewCustomHeadAmount] = useState<number>(0);
  const [autoFillNotice, setAutoFillNotice] = useState<boolean>(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const studentClass = classes.find((c) => c.id === selectedStudent?.classId);

  // Sync parent phone for WhatsApp when student changes
  useEffect(() => {
    if (selectedStudent) {
      setParentWhatsAppNumber(
        selectedStudent.guardianPhone || selectedStudent.emergencyContact || ''
      );
    }
  }, [selectedStudent]);

  // Set of months already paid by this student
  const paidMonthsForStudent = useMemo(() => {
    if (!selectedStudentId) return new Set<string>();
    const activePayments = feePayments.filter(
      (p) => p.studentId === selectedStudentId && p.status !== 'Cancelled'
    );
    const paidSet = new Set<string>();
    activePayments.forEach((p) => {
      (p.monthsPaid || []).forEach((m) => {
        const pureMonth = m.trim().split(' ')[0];
        paidSet.add(pureMonth);
      });
    });
    return paidSet;
  }, [selectedStudentId, feePayments]);

  // Function to calculate exact lump-sum auto-filled fee heads from admin-fed student record
  const getAutoFilledHeads = (studentId: string): FeeHeadItem[] => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return [];

    const breakdown = getStudentFeeBreakdown(student.id);
    const cls = classes.find((c) => c.id === student.classId);

    // Calculate previous payments made by this student head-wise
    const payments = feePayments.filter(
      (p) =>
        (p.studentId === student.id ||
          (student.admissionNo &&
            p.admissionNo &&
            p.admissionNo.trim().toLowerCase() === student.admissionNo.trim().toLowerCase())) &&
        p.status !== 'Cancelled'
    );
    let paidTuition = 0;
    let paidAdmission = 0;
    let paidRegistration = 0;
    let paidExam = 0;
    let paidTransport = 0;
    let paidPreviousDue = 0;
    let paidFine = 0;
    let paidComputer = 0;
    let paidAnnual = 0;
    let unallocatedPaid = 0;

    payments.forEach((p) => {
      const discountVal = Number(p.discount) || 0;
      if (discountVal > 0) {
        unallocatedPaid += discountVal;
      }
      if (p.feeHeadBreakdown && p.feeHeadBreakdown.length > 0) {
        p.feeHeadBreakdown.forEach((h) => {
          const name = (h.head || '').toLowerCase();
          const amt = Number(h.amount) || 0;
          if (name.includes('tuition') || name.includes('मासिक शिक्षण') || name.includes('शिक्षण')) {
            paidTuition += amt;
          } else if (name.includes('admission') || name.includes('प्रवेश')) {
            paidAdmission += amt;
          } else if (name.includes('registration') || name.includes('पंजीकरण') || name.includes('form')) {
            paidRegistration += amt;
          } else if (name.includes('exam') || name.includes('परीक्षा')) {
            paidExam += amt;
          } else if (name.includes('transport') || name.includes('convey') || name.includes('वाहन')) {
            paidTransport += amt;
          } else if (name.includes('previous') || name.includes('arrears') || name.includes('बकाया') || name.includes('पिछला')) {
            paidPreviousDue += amt;
          } else if (name.includes('fine') || name.includes('विलंब')) {
            paidFine += amt;
          } else if (name.includes('computer') || name.includes('लैब')) {
            paidComputer += amt;
          } else if (name.includes('annual') || name.includes('वार्षिक')) {
            paidAnnual += amt;
          } else {
            paidTuition += amt;
          }
        });
      } else {
        // Lump sum receipt without itemized breakdown
        unallocatedPaid += Number(p.amountPaid) || 0;
      }
    });

    const isZeroFeeStudent = breakdown.totalYearlyDue === 0;

    // 1. Tuition Fee - Full session lump-sum as fed by admin
    const fedTuition = isZeroFeeStudent
      ? 0
      : typeof student.tuitionFee === 'number'
      ? student.tuitionFee
      : (cls?.monthlyFee || 1500) * 12;

    // 2. Admission Fee
    const fedAdmission = isZeroFeeStudent
      ? 0
      : typeof student.admissionFee === 'number'
      ? student.admissionFee
      : (breakdown.admissionFee || 0);

    // 3. Registration Fee
    const fedRegistration = isZeroFeeStudent
      ? 0
      : typeof student.registrationFee === 'number'
      ? student.registrationFee
      : (breakdown.registrationFee || 0);

    // 4. Examination Fee
    const fedExam = isZeroFeeStudent
      ? 0
      : typeof student.examFee === 'number'
      ? student.examFee
      : (breakdown.examFee || 0);

    // 5. Transport / Conveyance Fee (strictly from student profile, 0 if not opted or 600)
    const rawTransport =
      typeof student.conveyFee === 'number'
        ? student.conveyFee
        : (breakdown.conveyFee || 0);
    const fedTransport = isZeroFeeStudent || rawTransport === 600 ? 0 : rawTransport;

    // 6. Previous Due / Arrears
    const fedPreviousDue = isZeroFeeStudent
      ? 0
      : typeof student.previousDue === 'number'
      ? student.previousDue
      : (breakdown.previousDue || 0);

    // 7. Late Fine
    const fedFine = isZeroFeeStudent
      ? 0
      : typeof student.lateFine === 'number'
      ? student.lateFine
      : (breakdown.lateFine || 0);

    // If head payments exceed fed amount, shift excess into unallocated pool
    if (paidTuition > fedTuition) {
      unallocatedPaid += (paidTuition - fedTuition);
      paidTuition = fedTuition;
    }
    if (paidAdmission > fedAdmission) {
      unallocatedPaid += (paidAdmission - fedAdmission);
      paidAdmission = fedAdmission;
    }
    if (paidRegistration > fedRegistration) {
      unallocatedPaid += (paidRegistration - fedRegistration);
      paidRegistration = fedRegistration;
    }
    if (paidExam > fedExam) {
      unallocatedPaid += (paidExam - fedExam);
      paidExam = fedExam;
    }
    if (paidTransport > fedTransport) {
      unallocatedPaid += (paidTransport - fedTransport);
      paidTransport = fedTransport;
    }
    if (paidPreviousDue > fedPreviousDue) {
      unallocatedPaid += (paidPreviousDue - fedPreviousDue);
      paidPreviousDue = fedPreviousDue;
    }
    if (paidFine > fedFine) {
      unallocatedPaid += (paidFine - fedFine);
      paidFine = fedFine;
    }

    // Apply unallocated paid amounts against remaining unpaid dues
    // Priority order: Previous Due -> Admission -> Registration -> Tuition -> Exam -> Transport -> Fine
    const headsAllocation = [
      { fed: fedPreviousDue, getPaid: () => paidPreviousDue, addPaid: (v: number) => { paidPreviousDue += v; } },
      { fed: fedAdmission, getPaid: () => paidAdmission, addPaid: (v: number) => { paidAdmission += v; } },
      { fed: fedRegistration, getPaid: () => paidRegistration, addPaid: (v: number) => { paidRegistration += v; } },
      { fed: fedTuition, getPaid: () => paidTuition, addPaid: (v: number) => { paidTuition += v; } },
      { fed: fedExam, getPaid: () => paidExam, addPaid: (v: number) => { paidExam += v; } },
      { fed: fedTransport, getPaid: () => paidTransport, addPaid: (v: number) => { paidTransport += v; } },
      { fed: fedFine, getPaid: () => paidFine, addPaid: (v: number) => { paidFine += v; } },
    ];

    for (const h of headsAllocation) {
      if (unallocatedPaid <= 0) break;
      const rem = Math.max(0, h.fed - h.getPaid());
      if (rem > 0) {
        const credit = Math.min(unallocatedPaid, rem);
        h.addPaid(credit);
        unallocatedPaid -= credit;
      }
    }

    // Head-wise remaining dues (auto-sum = total due minus paid amount)
    const dueTuition = Math.max(0, fedTuition - paidTuition);
    const dueAdmission = Math.max(0, fedAdmission - paidAdmission);
    const dueRegistration = Math.max(0, fedRegistration - paidRegistration);
    const dueExam = Math.max(0, fedExam - paidExam);
    const dueTransport = Math.max(0, fedTransport - paidTransport);
    const duePreviousDue = Math.max(0, fedPreviousDue - paidPreviousDue);
    const dueFine = Math.max(0, fedFine - paidFine);

    const heads: FeeHeadItem[] = [
      {
        id: 'tuition',
        name: 'Tuition Fee',
        hindiName: 'मासिक शिक्षण शुल्क (एक मुश्त सत्र)',
        category: 'tuition',
        fedAmount: fedTuition,
        alreadyPaid: paidTuition,
        currentDue: dueTuition,
        amount: dueTuition, // By default loaded with lump-sum due
        description:
          fedTuition > 0
            ? `सत्र कुल तय: ${settings.currencySymbol}${fedTuition.toLocaleString('en-IN')}${paidTuition > 0 ? ` (जमा: ${settings.currencySymbol}${paidTuition.toLocaleString('en-IN')})` : ''}`
            : '100% छात्रवृत्ति / ₹0 फीस',
      },
      {
        id: 'admission',
        name: 'Admission Fee',
        hindiName: 'प्रवेश शुल्क',
        category: 'admission',
        fedAmount: fedAdmission,
        alreadyPaid: paidAdmission,
        currentDue: dueAdmission,
        amount: dueAdmission,
        description:
          fedAdmission > 0
            ? `तय शुल्क: ${settings.currencySymbol}${fedAdmission.toLocaleString('en-IN')}${paidAdmission > 0 ? ` (जमा: ${settings.currencySymbol}${paidAdmission.toLocaleString('en-IN')})` : ''}`
            : 'प्रवेश शुल्क लागू नहीं (₹0)',
      },
      {
        id: 'registration',
        name: 'Registration Fee',
        hindiName: 'पंजीकरण शुल्क',
        category: 'registration',
        fedAmount: fedRegistration,
        alreadyPaid: paidRegistration,
        currentDue: dueRegistration,
        amount: dueRegistration,
        description:
          fedRegistration > 0
            ? `तय शुल्क: ${settings.currencySymbol}${fedRegistration.toLocaleString('en-IN')}${paidRegistration > 0 ? ` (जमा: ${settings.currencySymbol}${paidRegistration.toLocaleString('en-IN')})` : ''}`
            : 'पंजीकरण शुल्क लागू नहीं (₹0)',
      },
      {
        id: 'exam',
        name: 'Examination Fee',
        hindiName: 'परीक्षा शुल्क',
        category: 'exam',
        fedAmount: fedExam,
        alreadyPaid: paidExam,
        currentDue: dueExam,
        amount: dueExam,
        description:
          fedExam > 0
            ? `तय शुल्क: ${settings.currencySymbol}${fedExam.toLocaleString('en-IN')}${paidExam > 0 ? ` (जमा: ${settings.currencySymbol}${paidExam.toLocaleString('en-IN')})` : ''}`
            : 'परीक्षा शुल्क लागू नहीं (₹0)',
      },
      {
        id: 'transport',
        name: 'Transport / Conveyance Fee',
        hindiName: 'वाहन शुल्क',
        category: 'transport',
        fedAmount: fedTransport,
        alreadyPaid: paidTransport,
        currentDue: dueTransport,
        amount: dueTransport,
        description:
          fedTransport > 0
            ? `तय वाहन शुल्क: ${settings.currencySymbol}${fedTransport.toLocaleString('en-IN')}${paidTransport > 0 ? ` (जमा: ${settings.currencySymbol}${paidTransport.toLocaleString('en-IN')})` : ''}`
            : 'वाहन सुविधा नहीं (₹0)',
      },
      {
        id: 'previousDue',
        name: 'Previous Due / Arrears',
        hindiName: 'पिछला बकाया (पुराना सत्र)',
        category: 'previousDue',
        fedAmount: fedPreviousDue,
        alreadyPaid: paidPreviousDue,
        currentDue: duePreviousDue,
        amount: duePreviousDue,
        description:
          fedPreviousDue > 0
            ? `पिछला बकाया: ${settings.currencySymbol}${fedPreviousDue.toLocaleString('en-IN')}${paidPreviousDue > 0 ? ` (जमा: ${settings.currencySymbol}${paidPreviousDue.toLocaleString('en-IN')})` : ''}`
            : 'कोई पिछला बकाया नहीं (₹0)',
      },
      {
        id: 'fine',
        name: 'Late Fine / Surcharge',
        hindiName: 'विलंब शुल्क',
        category: 'fine',
        fedAmount: fedFine,
        alreadyPaid: paidFine,
        currentDue: dueFine,
        amount: dueFine,
        description:
          fedFine > 0
            ? `पेंडिंग लेट फाइन: ${settings.currencySymbol}${fedFine.toLocaleString('en-IN')}`
            : 'कोई विलंब शुल्क नहीं (₹0)',
      },
    ];

    if (paidComputer > 0) {
      heads.push({
        id: 'computer',
        name: 'Computer & Lab Fee',
        hindiName: 'कंप्यूटर / लैब शुल्क',
        category: 'computer',
        fedAmount: paidComputer,
        alreadyPaid: paidComputer,
        currentDue: 0,
        amount: 0,
        description: 'Previously recorded',
      });
    }

    if (paidAnnual > 0) {
      heads.push({
        id: 'annual',
        name: 'Annual / Sports Fee',
        hindiName: 'वार्षिक / खेल शुल्क',
        category: 'annual',
        fedAmount: paidAnnual,
        alreadyPaid: paidAnnual,
        currentDue: 0,
        amount: 0,
        description: 'Previously recorded',
      });
    }

    return heads;
  };

  // Set initial student when prop changes
  useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.id);
    }
  }, [initialStudent]);

  // Auto fill all fee heads as lump sum whenever selected student or modal opens
  useEffect(() => {
    if (!selectedStudentId || !isOpen) return;

    const autoHeads = getAutoFilledHeads(selectedStudentId);
    setFeeHeads(autoHeads);
    setDiscount(0);

    // Select unpaid months by default
    const unpaid = MONTHS_LIST.filter((m) => !paidMonthsForStudent.has(m));
    setSelectedMonths(unpaid.length > 0 ? unpaid : MONTHS_LIST);
  }, [selectedStudentId, isOpen]);

  if (!isOpen) return null;

  // Search filtered students for quick picker
  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const query = studentSearch.toLowerCase();
    const cls = classes.find((c) => c.id === s.classId)?.name || '';
    return (
      s.fullName.toLowerCase().includes(query) ||
      s.admissionNo.toLowerCase().includes(query) ||
      (s.rollNo && s.rollNo.toString().includes(query)) ||
      cls.toLowerCase().includes(query) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(query))
    );
  });

  // Calculate totals
  const totalDueBefore = feeHeads.reduce((sum, h) => sum + (Number(h.currentDue) || 0), 0);
  const subtotal = feeHeads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  const effectiveDiscount = Math.min(discount, subtotal);
  const totalAmount = Math.max(0, subtotal - effectiveDiscount);
  const currentDues = selectedStudent ? getStudentDueAmount(selectedStudent.id) : 0;
  // Dues cleared by this receipt = cash/online collected + concession/discount granted
  const newBalanceRemaining = Math.max(0, currentDues - (totalAmount + effectiveDiscount));
  const activeCount = feeHeads.filter((h) => (Number(h.amount) || 0) > 0).length;
  const zeroCount = feeHeads.filter((h) => (Number(h.amount) || 0) === 0).length;

  // Individual fee head actions
  const handleAmountChange = (id: string, val: number) => {
    setFeeHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, amount: Math.max(0, val) } : h))
    );
  };

  // Set a single head to ₹0 ("जो नही जमा होगा वह 0 कर दिया जाएगा")
  const handleSetSingleHeadZero = (id: string) => {
    setFeeHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, amount: 0 } : h))
    );
  };

  // Restore single head to its exact lump-sum due
  const handleRestoreSingleHead = (id: string) => {
    setFeeHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, amount: h.currentDue } : h))
    );
  };

  // Collect only this single head, and set all others to ₹0
  const handleCollectOnlyThisHead = (id: string) => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === id ? (h.amount > 0 ? h.amount : h.currentDue) : 0,
      }))
    );
  };

  // Toggle head between ₹0 and currentDue
  const handleToggleHead = (id: string) => {
    setFeeHeads((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const isCurrentlyZero = (Number(h.amount) || 0) === 0;
          return {
            ...h,
            amount: isCurrentlyZero ? (h.currentDue > 0 ? h.currentDue : 100) : 0,
          };
        }
        return h;
      })
    );
  };

  // Bulk Preset 1: "अगर सब मद का एक ही बार जमा हो रहा हैं, total जमा कर दिया जाएगा"
  const handleCollectAllFull = () => {
    setFeeHeads((prev) => prev.map((h) => ({ ...h, amount: h.currentDue })));
    const unpaid = MONTHS_LIST.filter((m) => !paidMonthsForStudent.has(m));
    setSelectedMonths(unpaid.length > 0 ? unpaid : MONTHS_LIST);
    setRemarks('All fee heads cleared in full (एक मुश्त संपूर्ण सत्र शुल्क भुगतान)।');
  };

  // Bulk Preset 2: "जो नही जमा होगा वह 0 कर दिया जाएगा" -> Clear all to 0
  const handleSetAllZero = () => {
    setFeeHeads((prev) => prev.map((h) => ({ ...h, amount: 0 })));
  };

  // Bulk Preset 3: Tuition Only
  const handleTuitionOnly = () => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === 'tuition' ? h.currentDue : 0,
      }))
    );
  };

  // Bulk Preset 4: Exam Only
  const handleExamOnly = () => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === 'exam' ? h.currentDue : 0,
      }))
    );
  };

  // Bulk Preset 5: Transport Only
  const handleTransportOnly = () => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === 'transport' ? h.currentDue : 0,
      }))
    );
  };

  // Bulk Preset 6: Admission & Reg Only
  const handleAdmissionOnly = () => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === 'admission' || h.id === 'registration' ? h.currentDue : 0,
      }))
    );
  };

  // Bulk Preset 7: Previous Due / Arrears Only
  const handlePreviousDueOnly = () => {
    setFeeHeads((prev) =>
      prev.map((h) => ({
        ...h,
        amount: h.id === 'previousDue' ? h.currentDue : 0,
      }))
    );
  };

  // Bulk Preset: Auto-Sum Standard Core Dues (Tuition + Registration + Admission + Exam + Conveyance (if due) + Arrears)
  const handleAutoSumCoreDues = () => {
    setFeeHeads((prev) =>
      prev.map((h) => {
        const isCoreHead = [
          'tuition',
          'registration',
          'admission',
          'exam',
          'transport',
          'previousDue',
          'fine',
        ].includes(h.id);
        return {
          ...h,
          amount: isCoreHead ? h.currentDue : 0,
        };
      })
    );
    const unpaid = MONTHS_LIST.filter((m) => !paidMonthsForStudent.has(m));
    setSelectedMonths(unpaid.length > 0 ? unpaid : MONTHS_LIST);
    setDiscount(0);
  };

  // Add custom fee head
  const handleAddCustomHead = () => {
    if (!newCustomHeadName.trim()) return;
    const amountVal = Math.max(0, newCustomHeadAmount);
    const newHead: FeeHeadItem = {
      id: `custom-${Date.now()}`,
      name: newCustomHeadName.trim(),
      hindiName: 'अन्य विशेष शुल्क',
      fedAmount: amountVal,
      alreadyPaid: 0,
      currentDue: amountVal,
      amount: amountVal,
      category: 'custom',
      description: 'Custom fee head added manually',
      isCustom: true,
    };
    setFeeHeads((prev) => [...prev, newHead]);
    setNewCustomHeadName('');
    setNewCustomHeadAmount(0);
    setShowAddCustom(false);
  };

  const handleRemoveCustomHead = (id: string) => {
    setFeeHeads((prev) => prev.filter((h) => h.id !== id));
  };

  // Reset to original admin-fed dues
  const handleAutoFillStudentFees = () => {
    if (!selectedStudentId) return;
    const autoHeads = getAutoFilledHeads(selectedStudentId);
    setFeeHeads(autoHeads);
    setDiscount(0);
    setAutoFillNotice(true);
    setTimeout(() => setAutoFillNotice(false), 3500);
  };

  // Toggle Month selection
  const handleToggleMonth = (m: string) => {
    let nextMonths: string[];
    if (selectedMonths.includes(m)) {
      if (selectedMonths.length > 1) {
        nextMonths = selectedMonths.filter((item) => item !== m);
      } else {
        nextMonths = selectedMonths;
      }
    } else {
      nextMonths = [...selectedMonths, m];
    }
    setSelectedMonths(nextMonths);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (subtotal <= 0) {
      alert('Please collect at least one fee head with an amount greater than ₹0.');
      return;
    }

    const receiptSerial = `REC-${new Date().getFullYear()}-${String(
      feePayments.length + 101
    ).padStart(4, '0')}`;

    // Filter fee heads that have amount > 0
    const activeBreakdown = feeHeads
      .filter((item) => (Number(item.amount) || 0) > 0)
      .map((item) => ({
        head: item.name,
        amount: Number(item.amount),
      }));

    const fineItem = feeHeads.find((h) => h.id === 'fine');
    const recordedFine = fineItem ? Number(fineItem.amount) || 0 : 0;

    const newPayment: Omit<FeePayment, 'id'> = {
      receiptNo: receiptSerial,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      admissionNo: selectedStudent.admissionNo,
      classId: selectedStudent.classId,
      section: selectedStudent.section,
      date: new Date().toISOString().slice(0, 10),
      monthsPaid: selectedMonths,
      amountPaid: totalAmount,
      paymentMethod,
      transactionRef: transactionRef || undefined,
      feeHeadBreakdown: activeBreakdown,
      discount: effectiveDiscount,
      fine: recordedFine,
      totalDueBefore: currentDues,
      balanceRemaining: newBalanceRemaining,
      remarks,
      receivedBy: 'Accountant (Cash Counter)',
      academicSession: settings.academicSession,
    };

    const savedPayment = addFeePayment({
      ...newPayment,
      status: 'Active',
    });

    // If WhatsApp receipt option is enabled, dispatch message to parent with receipt and due balance
    if (sendWhatsAppReceipt && parentWhatsAppNumber.trim()) {
      try {
        const classObj = classes.find((c) => c.id === selectedStudent.classId);
        const params = {
          receiptNo: receiptSerial,
          studentName: selectedStudent.fullName,
          admissionNo: selectedStudent.admissionNo,
          rollNo: selectedStudent.rollNo,
          className: classObj?.name || selectedStudent.classId,
          section: selectedStudent.section,
          fatherName: selectedStudent.fatherName,
          guardianPhone: parentWhatsAppNumber.trim(),
          amountPaid: totalAmount,
          paymentMethod,
          transactionRef: transactionRef || undefined,
          date: new Date().toISOString().slice(0, 10),
          monthsPaid: selectedMonths,
          discount: effectiveDiscount,
          fine: recordedFine,
          totalDueBefore: currentDues,
          balanceRemaining: newBalanceRemaining,
          feeHeadBreakdown: activeBreakdown,
          schoolName: settings.schoolName,
          schoolPhone: settings.phone,
          schoolUpi: settings.schoolUpi,
          remarks,
        };

        const url = generateFeeReceiptWhatsAppUrl(parentWhatsAppNumber.trim(), params);
        const msg = formatFeeReceiptWhatsAppMessage(params);
        dispatchSafeMessage(url, 'whatsapp', msg);
      } catch (err) {
        console.error('Failed to dispatch WhatsApp receipt:', err);
      }
    }

    // Trigger auto callback with completed object for instant receipt viewing
    if (onPaymentSuccess) {
      onPaymentSuccess(
        savedPayment,
        printFormatPreference,
        autoPrintAfterCollect
      );
    }

    onClose();
  };

  const studentBreakdown = selectedStudent
    ? getStudentFeeBreakdown(selectedStudent.id)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-amber-300 font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300 text-xs font-black uppercase tracking-wider">
                  Fee Collection Counter
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold">
                  All Fee Heads Enabled
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Collect Fee & Issue Official Receipt
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* Section 1: Student Selection & Info Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Student Dropdown / Search */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold text-xs">
                    Select Student (विद्यार्थी चुनें) *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {filteredStudents.length} of {students.length} students
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type name, roll, adm no..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-emerald-700 font-medium"
                    />
                  </div>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-emerald-800"
                  >
                    {filteredStudents.map((s) => {
                      const cls = classes.find((c) => c.id === s.classId)?.name || s.classId;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({cls}-{s.section} | Adm: {s.admissionNo})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Fee Month (शुल्क माह) *
                </label>
                <select
                  value={selectedMonths[0] || 'August'}
                  onChange={(e) => {
                    const val = [e.target.value];
                    setSelectedMonths(val);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-emerald-800"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m} value={m}>
                      {m} {settings.academicSession || new Date().getFullYear()} {paidMonthsForStudent.has(m) ? '(Paid ✓)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Multi-Month Selector Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                Selected Months for this receipt (एक या अधिक माह चुनें):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS_LIST.map((m) => {
                  const isSel = selectedMonths.includes(m);
                  const isPaid = paidMonthsForStudent.has(m);
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => handleToggleMonth(m)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        isSel
                          ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-500'
                          : isPaid
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isPaid ? `${m} is already paid by this student` : `Select ${m}`}
                    >
                      <span>{m.slice(0, 3)}</span>
                      {isPaid && <span className="text-[9px] font-black text-emerald-700">✓Paid</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Student Details Card with Profile Rates */}
            {selectedStudent && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 font-medium block">Student Name:</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedStudent.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Class & Section:</span>
                  <span className="font-bold text-slate-800">
                    {studentClass?.name || 'Class'} - Sec {selectedStudent.section} (Roll: {selectedStudent.rollNo || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Father's Name:</span>
                  <span className="font-bold text-slate-800">{selectedStudent.fatherName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Current Pending Due:</span>
                  <span
                    className={`font-black text-xs ${
                      currentDues > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {settings.currencySymbol} {currentDues.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Head-wise profile fees banner */}
                <div className="col-span-2 sm:col-span-4 mt-1 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-slate-700">Student Fed Rates (दर्ज फीस):</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                      Tuition:{' '}
                      {selectedStudent.totalYearlyDue === 0 || selectedStudent.tuitionFee === 0
                        ? `${settings.currencySymbol}0/mo`
                        : typeof selectedStudent.tuitionFee === 'number'
                        ? `${settings.currencySymbol}${Math.round(selectedStudent.tuitionFee / 12)}/mo`
                        : `${settings.currencySymbol}${studentClass?.monthlyFee || 0}/mo`}
                    </span>
                    {typeof selectedStudent.admissionFee === 'number' && selectedStudent.admissionFee > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                        Admission: {settings.currencySymbol}{selectedStudent.admissionFee}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 font-medium">
                        Admission: ₹0
                      </span>
                    )}
                    {typeof selectedStudent.registrationFee === 'number' && selectedStudent.registrationFee > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 font-bold">
                        Reg: {settings.currencySymbol}{selectedStudent.registrationFee}
                      </span>
                    ) : null}
                    {typeof selectedStudent.examFee === 'number' && selectedStudent.examFee > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
                        Exam: {settings.currencySymbol}{selectedStudent.examFee}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 font-medium">
                        Exam: ₹0
                      </span>
                    )}
                    {(() => {
                      const effConv =
                        selectedStudent.conveyFee && selectedStudent.conveyFee > 0 && selectedStudent.conveyFee !== 600
                          ? selectedStudent.conveyFee
                          : 0;
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-md border font-bold ${
                            effConv > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200 font-medium'
                          }`}
                        >
                          Transport: {effConv > 0 ? `${settings.currencySymbol}${effConv}/mo` : '₹0 (None)'}
                        </span>
                      );
                    })()}
                    {selectedStudent.lateFine && selectedStudent.lateFine > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200 font-bold">
                        Fine: {settings.currencySymbol}{selectedStudent.lateFine}
                      </span>
                    ) : null}
                    {(() => {
                      const prevDueAmt =
                        selectedStudent.previousDue && selectedStudent.previousDue > 0
                          ? selectedStudent.previousDue
                          : getStudentFeeBreakdown(selectedStudent.id).previousDue;
                      if (!prevDueAmt || prevDueAmt <= 0) return null;
                      return (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-extrabold flex items-center gap-0.5">
                          <span>Prev Due:</span>
                          <span>{settings.currencySymbol}{prevDueAmt.toLocaleString('en-IN')}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillStudentFees}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition active:scale-95 cursor-pointer shadow-xs"
                    title="विद्यार्थी की वास्तविक फीस को मदवार दोबारा ऑटो-फिल करें"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Auto-Fill Head Wise (ऑटो भरें)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: All Fee Heads Breakdown with Quick Actions */}
          <div className="space-y-3">
            {autoFillNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Previous Due (पिछला बकाया) सहित सभी शुल्क मद स्वतः भर दिए गए हैं! (All fee heads including Previous Due auto-filled)
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <h4 className="text-slate-900 font-extrabold text-sm flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-800" />
                  <span>Fee Heads Breakdown (सभी शुल्क मद)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Student's fed fees are auto-loaded. Keep or edit what to collect, and set unneeded heads to ₹0.
                  (छात्र की दर्ज फीस लोड है। जो लेना है एडिट करके रखें, बाकी को ₹0 कर दें)
                </p>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Collecting: {activeCount} {activeCount === 1 ? 'Head' : 'Heads'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  Set to ₹0: {zeroCount}
                </span>
              </div>
            </div>

            {/* Real Student Fed Fees Information & Hero Pay-All Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wide uppercase">
                    Lump-Sum Auto-Loaded (एक मुश्त दर्ज)
                  </span>
                  <span className="text-emerald-300 text-xs font-bold">
                    कुल वर्तमान बकाया: {settings.currencySymbol}{totalDueBefore.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  एडमिन द्वारा दर्ज कुल शुल्क एक मुश्त लोड है। जो जमा होगा वह मद से घट जाएगा, जो नहीं जमा होगा उसे <strong className="text-amber-300">₹0</strong> कर दें, या पूरा एक साथ जमा करें।
                </p>
              </div>

              {/* Hero Action: "अगर सब मद का एक ही बार जमा हो रहा हैं, total जमा कर दिया जाएगा" */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleCollectAllFull}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer border border-amber-300"
                  title="सभी मदों की पूरी बकाया राशि एक ही बार में जमा करें"
                >
                  <Zap className="w-4 h-4 text-emerald-950 fill-emerald-950" />
                  <span>⚡ सब मद एक मुश्त पूरा जमा करें ({settings.currencySymbol}{totalDueBefore.toLocaleString('en-IN')})</span>
                </button>
              </div>
            </div>

            {/* Quick Action Presets Toolbar */}
            <div className="bg-slate-100/95 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-700">त्वरित विकल्प (Presets):</span>

                {/* Clear All to Zero - "जो नही जमा होगा वह 0 कर दिया जाएगा" */}
                <button
                  type="button"
                  onClick={handleSetAllZero}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                  title="सभी शुल्क मदों को ₹0 करें ताकि केवल इच्छित मद भरी जा सके"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] font-black">✕</span>
                  <span>सब मद ₹0 करें (Clear All to ₹0)</span>
                </button>

                {/* Auto-Sum Core Dues */}
                <button
                  type="button"
                  onClick={handleAutoSumCoreDues}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 font-extrabold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                  title="Auto add Tuition, Registration, Admission, Exam + Conveyance (if due), subtracting paid amounts"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-800 fill-emerald-800" />
                  <span>Auto-Sum Heads (Tuition+Reg+Adm+Exam+Convey)</span>
                </button>

                {/* Reset to Admin Fed Dues */}
                <button
                  type="button"
                  onClick={handleAutoFillStudentFees}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs"
                  title="मूल एडमिन फीड बकाये पर रीसेट करें"
                >
                  <RotateCcw className="w-3 h-3 text-emerald-700" />
                  <span>रीसेट करें (Reset to Fed)</span>
                </button>
              </div>

              {/* Head-Specific Filters */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={handleTuitionOnly}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                  title="केवल ट्यूशन फीस रखें, बाकी सब ₹0 करें"
                >
                  केवल ट्यूशन (Tuition Only)
                </button>
                <button
                  type="button"
                  onClick={handleExamOnly}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                  title="केवल परीक्षा फीस रखें, बाकी सब ₹0 करें"
                >
                  केवल परीक्षा (Exam Only)
                </button>
                <button
                  type="button"
                  onClick={handleTransportOnly}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                  title="केवल वाहन शुल्क रखें, बाकी सब ₹0 करें"
                >
                  केवल वाहन (Transport Only)
                </button>
                <button
                  type="button"
                  onClick={handleAdmissionOnly}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                  title="केवल प्रवेश व पंजीकरण शुल्क रखें, बाकी सब ₹0 करें"
                >
                  प्रवेश/पंजीकरण (Adm/Reg)
                </button>
                <button
                  type="button"
                  onClick={handlePreviousDueOnly}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-[11px] transition cursor-pointer"
                  title="केवल पिछला बकाया रखें, बाकी सब ₹0 करें"
                >
                  पिछला बकाया (Prev Due)
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-emerald-200" />
                  <span>+ अन्य मद (Custom)</span>
                </button>
              </div>
            </div>

            {/* Inline Add Custom Fee Head Form */}
            {showAddCustom && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="शुल्क मद का नाम (उदा. Uniform Fee, Books, ID Card)..."
                  value={newCustomHeadName}
                  onChange={(e) => setNewCustomHeadName(e.target.value)}
                  className="flex-1 bg-white border border-emerald-300 rounded-lg p-2 font-semibold text-slate-800 text-xs focus:outline-emerald-800"
                />
                <div className="flex items-center gap-1 w-full sm:w-40">
                  <span className="font-bold text-slate-600">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    placeholder="राशि (Amount)"
                    value={newCustomHeadAmount || ''}
                    onChange={(e) => setNewCustomHeadAmount(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-emerald-800"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAddCustomHead}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    जोड़ें (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    रद्द करें
                  </button>
                </div>
              </div>
            )}

            {/* Fee Heads Desktop Table View (Clean, Ledger-style) */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] font-black border-b border-slate-200">
                    <th className="py-2.5 px-3">शुल्क मद (Fee Head)</th>
                    <th className="py-2.5 px-2 text-right">तय कुल (Fed)</th>
                    <th className="py-2.5 px-2 text-right">पूर्व जमा (Paid)</th>
                    <th className="py-2.5 px-2 text-right text-rose-700 font-black">एक मुश्त देय (Due)</th>
                    <th className="py-2.5 px-3 text-center min-w-[260px]">अब जमा राशि (Now Paying)</th>
                    <th className="py-2.5 px-3 text-right">नया शेष (Remaining)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeHeads.map((head) => {
                    const isZero = (Number(head.amount) || 0) === 0;
                    const remainingAfter = Math.max(0, head.currentDue - (Number(head.amount) || 0));
                    const isFullPaid = (Number(head.amount) || 0) >= head.currentDue && head.currentDue > 0;
                    const isPartialPaid = (Number(head.amount) || 0) > 0 && (Number(head.amount) || 0) < head.currentDue;

                    return (
                      <tr
                        key={head.id}
                        className={`transition-colors ${
                          isZero ? 'bg-slate-50/70 text-slate-500' : 'bg-white hover:bg-emerald-50/30'
                        }`}
                      >
                        {/* 1. Fee Head Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!isZero}
                              onChange={() => handleToggleHead(head.id)}
                              className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 border-slate-300 cursor-pointer shrink-0"
                              title={isZero ? 'इस मद को शामिल करें' : 'इस मद को ₹0 करें'}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${isZero ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {head.name}
                                </span>
                                {head.isCustom && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {head.hindiName && (
                                <span className="text-[10px] text-slate-400 block">{head.hindiName}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Fed Amount */}
                        <td className="py-2.5 px-2 text-right font-medium text-slate-600">
                          {settings.currencySymbol}{Number(head.fedAmount).toLocaleString('en-IN')}
                        </td>

                        {/* 3. Already Paid */}
                        <td className="py-2.5 px-2 text-right font-medium text-emerald-700">
                          {settings.currencySymbol}{Number(head.alreadyPaid).toLocaleString('en-IN')}
                        </td>

                        {/* 4. Current Lump-Sum Due */}
                        <td className="py-2.5 px-2 text-right font-black text-rose-700">
                          {settings.currencySymbol}{Number(head.currentDue).toLocaleString('en-IN')}
                        </td>

                        {/* 5. Now Paying (Editable Input with ₹0, Full, Only buttons) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="relative w-28">
                              <span className="absolute left-2 top-2 font-bold text-slate-400 text-xs">
                                {settings.currencySymbol}
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={head.currentDue > 0 ? undefined : undefined}
                                value={head.amount === 0 ? '' : head.amount}
                                placeholder="0"
                                onChange={(e) => handleAmountChange(head.id, Number(e.target.value) || 0)}
                                className={`w-full pl-5 pr-1.5 py-1.5 rounded-lg border font-mono font-bold text-xs text-right transition focus:outline-emerald-800 ${
                                  isZero
                                    ? 'bg-slate-100 border-slate-300 text-slate-400 placeholder:text-slate-400'
                                    : 'bg-white border-emerald-500 text-slate-900 font-extrabold ring-1 ring-emerald-400/50'
                                }`}
                              />
                            </div>

                            {/* "जो नही जमा होगा वह 0 कर दिया जाएगा" - Quick ₹0 button */}
                            {!isZero ? (
                              <button
                                type="button"
                                onClick={() => handleSetSingleHeadZero(head.id)}
                                className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-[11px] transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                                title="इस मद को ₹0 करें (नहीं जमा करना)"
                              >
                                ₹0
                              </button>
                            ) : head.currentDue > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleRestoreSingleHead(head.id)}
                                className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                                title={`पूरा देय भरें ₹${head.currentDue}`}
                              >
                                पूरा ({settings.currencySymbol}{head.currentDue})
                              </button>
                            ) : null}

                            {/* Only this head */}
                            <button
                              type="button"
                              onClick={() => handleCollectOnlyThisHead(head.id)}
                              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-[10px] transition active:scale-95 cursor-pointer shrink-0"
                              title="केवल इस मद को जमा करें, बाकी सभी को ₹0 करें"
                            >
                              Only
                            </button>

                            {/* Custom head delete */}
                            {head.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomHead(head.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Remove custom head"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Remaining Balance: "जो जमा होगा प्रत्येक मद से उतना घटा दिया जाएगा" */}
                        <td className="py-2.5 px-3 text-right font-medium">
                          {isFullPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                              ✓ ₹0 (पूर्ण चुकता)
                            </span>
                          ) : isPartialPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              {settings.currencySymbol}{remainingAfter.toLocaleString('en-IN')} शेष
                            </span>
                          ) : head.currentDue === 0 ? (
                            <span className="text-slate-400 text-[10px]">चुकता (₹0)</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                              {settings.currencySymbol}{head.currentDue.toLocaleString('en-IN')} (अपरिवर्तित)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fee Heads Mobile Cards View (Touch-friendly for small screens) */}
            <div className="md:hidden grid grid-cols-1 gap-2.5">
              {feeHeads.map((head) => {
                const isZero = (Number(head.amount) || 0) === 0;
                const remainingAfter = Math.max(0, head.currentDue - (Number(head.amount) || 0));
                const isFullPaid = (Number(head.amount) || 0) >= head.currentDue && head.currentDue > 0;
                const isPartialPaid = (Number(head.amount) || 0) > 0 && (Number(head.amount) || 0) < head.currentDue;

                return (
                  <div
                    key={head.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isZero
                        ? 'bg-slate-50/80 border-slate-200 opacity-80'
                        : 'bg-white border-emerald-400 ring-1 ring-emerald-300/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={!isZero}
                          onChange={() => handleToggleHead(head.id)}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-800 focus:ring-emerald-700 border-slate-300 cursor-pointer shrink-0"
                          title={isZero ? 'इस मद को शामिल करें' : 'इस मद को ₹0 करें'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => handleToggleHead(head.id)}
                              className={`font-bold text-xs cursor-pointer select-none ${
                                isZero ? 'text-slate-500 line-through' : 'text-slate-900 font-extrabold'
                              }`}
                            >
                              {head.name}
                            </span>
                            {head.isCustom && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                Custom
                              </span>
                            )}
                          </div>
                          {head.hindiName && (
                            <span className="text-[10px] text-slate-500 block">{head.hindiName}</span>
                          )}

                          {/* Fed and Due numbers */}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 mt-1">
                            <span>तय: <strong>{settings.currencySymbol}{(Number(head.fedAmount) || 0).toLocaleString('en-IN')}</strong></span>
                            <span>•</span>
                            <span>पूर्व जमा: <strong className="text-emerald-700">{settings.currencySymbol}{(Number(head.alreadyPaid) || 0).toLocaleString('en-IN')}</strong></span>
                            <span>•</span>
                            <span>एक मुश्त देय: <strong className="text-rose-700">{settings.currencySymbol}{(Number(head.currentDue) || 0).toLocaleString('en-IN')}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Remaining badge */}
                      <div className="text-right shrink-0">
                        {isFullPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-black border border-emerald-300">
                            ✓ ₹0 पूर्ण चुकता
                          </span>
                        ) : isPartialPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                            {settings.currencySymbol}{remainingAfter} शेष रहेगा
                          </span>
                        ) : isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                            ✕ ₹0 (नहीं जमा)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            देय: {settings.currencySymbol}{head.currentDue}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Input & Controls */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">
                          {settings.currencySymbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={head.amount === 0 ? '' : head.amount}
                          placeholder="0"
                          onChange={(e) => handleAmountChange(head.id, Number(e.target.value) || 0)}
                          className={`w-full pl-6 pr-2 py-1.5 rounded-lg border font-mono font-bold text-xs transition focus:outline-emerald-800 ${
                            isZero
                              ? 'bg-slate-100 border-slate-300 text-slate-400'
                              : 'bg-white border-emerald-400 text-slate-900 font-extrabold'
                          }`}
                        />
                      </div>

                      {/* Quick Zero button: "₹0" */}
                      {!isZero ? (
                        <button
                          type="button"
                          onClick={() => handleSetSingleHeadZero(head.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                          title="इस मद को ₹0 करें"
                        >
                          ₹0
                        </button>
                      ) : head.currentDue > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreSingleHead(head.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] transition active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center gap-0.5"
                          title={`पूरा देय भरें ₹${head.currentDue}`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>पूरा ₹{head.currentDue}</span>
                        </button>
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-bold text-slate-400 shrink-0 select-none">
                          देय ₹0
                        </span>
                      )}

                      {/* Only This Head shortcut */}
                      <button
                        type="button"
                        onClick={() => handleCollectOnlyThisHead(head.id)}
                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-[10px] transition active:scale-95 cursor-pointer shrink-0"
                        title="केवल इस मद को जमा करें, बाकी 0 करें"
                      >
                        Only
                      </button>

                      {/* Custom head delete */}
                      {head.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomHead(head.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove custom fee head"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Concession / Discount & Payment Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Concession / Discount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold text-xs">
                    Special Concession / Discount (छूट ₹)
                  </label>
                  {effectiveDiscount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      -{settings.currencySymbol}{effectiveDiscount.toLocaleString('en-IN')} छूट
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 font-bold text-slate-400 text-xs">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount || ''}
                    placeholder="0"
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-emerald-700 text-xs focus:outline-emerald-800"
                  />
                </div>
                {/* Quick Discount Presets */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[9px] text-slate-500 font-semibold">Quick:</span>
                  {[100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDiscount(amt)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition cursor-pointer"
                    >
                      +{settings.currencySymbol}{amt}
                    </button>
                  ))}
                  {subtotal > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDiscount(Math.round(subtotal * 0.1))}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 hover:bg-blue-200 transition cursor-pointer"
                        title="10% Concession"
                      >
                        10%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscount(Math.round(subtotal * 0.25))}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 hover:bg-purple-200 transition cursor-pointer"
                        title="25% Concession"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscount(subtotal)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-950 hover:bg-amber-200 transition cursor-pointer"
                        title="100% Full Waiver"
                      >
                        100% Free
                      </button>
                    </>
                  )}
                  {discount > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscount(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-1">
                  छूट छात्र के कुल बकाए से घटाई जाएगी व रसीद में स्पष्ट रूप से दर्ज होगी।
                </p>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Payment Mode (भुगतान माध्यम) *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-emerald-800"
                >
                  <option value="Cash">Cash at Counter (नकद)</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm / BHIM)</option>
                  <option value="Card">Debit / Credit Card (स्वाइप)</option>
                  <option value="Cheque">Bank Cheque / Demand Draft</option>
                  <option value="Net Banking">Net Banking / NEFT / IMPS</option>
                </select>
              </div>

              {/* Transaction Ref */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Transaction Ref / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder={
                    paymentMethod === 'Cash' ? 'Cash Counter Voucher' : 'UPI Ref: 4239849201'
                  }
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-emerald-800"
                />
              </div>
            </div>

            {/* Active School UPI info */}
            {paymentMethod === 'UPI' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950">Active School UPI ID:</span>
                  <span className="font-mono font-extrabold text-blue-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {settings.upiId || 'anilsingh636-2@oksbi'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(settings.upiId || 'anilsingh636-2@oksbi')
                  }
                  className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[11px] transition cursor-pointer"
                >
                  Copy UPI ID
                </button>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1 text-xs">
                Receipt Remarks & Notes (रसीद टिप्पणी)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-emerald-800"
              />
            </div>
          </div>

          {/* Section 4: Real-time Financial Summary & Print Format Selection */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">
                  NET AMOUNT TO COLLECT (कुल देय राशि):
                </span>
                <span className="text-[11px] text-slate-600 font-semibold">
                  Subtotal: {settings.currencySymbol}{subtotal.toLocaleString('en-IN')}
                  {effectiveDiscount > 0 && (
                    <span className="text-emerald-700 ml-1">
                      - Concession: {settings.currencySymbol}{effectiveDiscount.toLocaleString('en-IN')}
                    </span>
                  )}
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-950 tracking-tight">
                {settings.currencySymbol} {totalAmount.toLocaleString('en-IN')}
              </div>

              {/* Dues comparison */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
                <span>Before Payment Due: <strong>{settings.currencySymbol}{currentDues.toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>
                  After Payment Remaining: <strong className={newBalanceRemaining === 0 ? 'text-emerald-700' : 'text-slate-900'}>
                    {settings.currencySymbol}{newBalanceRemaining.toLocaleString('en-IN')}
                  </strong>
                </span>
                {effectiveDiscount > 0 && (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded">
                    (₹{effectiveDiscount.toLocaleString('en-IN')} छूट समायोजित)
                  </span>
                )}
              </div>

              {/* WhatsApp Receipt Toggle & Parent Phone */}
              <div className="flex flex-wrap items-center gap-3 mt-2 bg-emerald-50/90 px-3 py-2 rounded-xl border border-emerald-300/80">
                <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppReceipt}
                    onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 accent-emerald-800 cursor-pointer"
                  />
                  <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>रसीद बनते ही अभिभावक को WhatsApp भेजें (Send WhatsApp Receipt)</span>
                </label>
                {sendWhatsAppReceipt && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    <span className="text-[11px] font-bold text-slate-500">📱 WhatsApp:</span>
                    <input
                      type="tel"
                      value={parentWhatsAppNumber}
                      onChange={(e) => setParentWhatsAppNumber(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-32 text-xs font-bold font-mono text-slate-900 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Receipt Output Preference & Auto-Print toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 bg-emerald-100/70 p-1 rounded-xl border border-emerald-200 w-fit">
                  <button
                    type="button"
                    onClick={() => setPrintFormatPreference('a4-half')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printFormatPreference === 'a4-half'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-200'
                    }`}
                    title="Print single copy on Half A4 page / A5 format"
                  >
                    <Scissors className="w-3.5 h-3.5 text-amber-300" />
                    <span>A4 Half Page (आधा पेज)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormatPreference('a4')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printFormatPreference === 'a4'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-200'
                    }`}
                    title="Print multi-copy on full A4 sheet"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Full A4 (2/3-Copy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormatPreference('thermal')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printFormatPreference === 'thermal'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-200'
                    }`}
                    title="Print on mini thermal POS roll (58mm)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>TVS MP-280 (58mm)</span>
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-950 cursor-pointer select-none bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  <input
                    type="checkbox"
                    checked={autoPrintAfterCollect}
                    onChange={(e) => setAutoPrintAfterCollect(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-800 accent-emerald-800 cursor-pointer"
                  />
                  <span>जमा करते ही तुरंत प्रिंट डायलॉग खोलें (Auto-print)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                onClick={() => setPrintFormatPreference('a4-half')}
                disabled={totalAmount <= 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold shadow-lg transition active:scale-95 text-xs uppercase tracking-wider cursor-pointer ${
                  totalAmount > 0
                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white ring-2 ring-emerald-600/50'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
                title="Collect fee, send WhatsApp receipt, and print Half A4 receipt"
              >
                <Scissors className="w-4 h-4 text-amber-300" />
                <span>Add & Print Half A4</span>
              </button>

              <button
                type="submit"
                onClick={() => setPrintFormatPreference('a4')}
                disabled={totalAmount <= 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-bold transition active:scale-95 text-xs cursor-pointer ${
                  totalAmount > 0
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                    : 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
                title="Collect fee, send WhatsApp receipt, and print Full A4 sheet"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Add & Print A4</span>
              </button>

              <button
                type="submit"
                onClick={() => setPrintFormatPreference('thermal')}
                disabled={totalAmount <= 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border font-bold transition active:scale-95 text-xs cursor-pointer ${
                  totalAmount > 0
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
                title="Collect fee and print TVS MP-280 thermal slip"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Thermal</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

