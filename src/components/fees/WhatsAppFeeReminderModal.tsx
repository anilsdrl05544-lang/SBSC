import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, ClassInfo, SchoolSettings } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Phone,
  Calendar,
  AlertTriangle,
  FileText,
  Users,
  User,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  CreditCard,
  Building2,
  RefreshCw,
  Share2,
  QrCode,
  Smartphone,
  Laptop,
  Zap,
  Globe,
  AlertCircle,
  Info,
  Layers,
  Receipt,
  Download,
} from 'lucide-react';
import { exportTableToCsv } from '../../services/pdfService';
import {
  WHATSAPP_FEE_TEMPLATES,
  WhatsAppTemplateId,
  SMS_FEE_TEMPLATES,
  SmsTemplateId,
  cleanPhoneNumber,
  formatFeeReminderMessage,
  formatSmsMessage,
  generateWhatsAppUrl,
  generateWhatsAppAppUrl,
  generateWhatsAppWebUrl,
  generateWhatsAppShortUrl,
  generateSmsUrl,
  generateGroupSmsUrl,
  generateUpiPayUrl,
  FeeReminderParams,
  dispatchSafeMessage,
  formatPhoneForSms,
  isMobileDevice,
} from '../../services/whatsappService';

export interface DueRangeOption {
  id: string;
  label: string;
  min: number;
  max: number | '';
  tag?: string;
  hindiLabel?: string;
}

export const DUE_RANGE_PRESETS: DueRangeOption[] = [
  { id: 'all', label: 'All Dues (> ₹0)', min: 0, max: '', tag: 'All', hindiLabel: 'सभी बकाया' },
  { id: '1-1000', label: '₹1 – ₹1,000', min: 1, max: 1000, tag: 'Small', hindiLabel: 'कम बकाया' },
  { id: '1001-3000', label: '₹1,001 – ₹3,000', min: 1001, max: 3000, tag: 'Moderate', hindiLabel: 'मध्यम' },
  { id: '3001-5000', label: '₹3,001 – ₹5,000', min: 3001, max: 5000, tag: 'Medium', hindiLabel: 'सामान्य' },
  { id: '5001-10000', label: '₹5,001 – ₹10,000', min: 5001, max: 10000, tag: 'High', hindiLabel: 'अधिक बकाया' },
  { id: '10000+', label: '₹10,000+', min: 10001, max: '', tag: 'Critical', hindiLabel: 'गंभीर बकाया' },
  { id: 'custom', label: 'Custom Range ⚙️', min: 0, max: '', tag: 'Custom', hindiLabel: 'कस्टम रेंज' },
];

export const formatDueRangeLabel = (min: number, max: number | ''): string => {
  if (min <= 0 && (max === '' || max === undefined)) return 'All Amounts (> ₹0)';
  if (min > 0 && (max === '' || max === undefined)) return `> ₹${min.toLocaleString('en-IN')}`;
  if (min <= 0 && max !== '') return `Up to ₹${Number(max).toLocaleString('en-IN')}`;
  return `₹${min.toLocaleString('en-IN')} – ₹${Number(max).toLocaleString('en-IN')}`;
};

export const safeFormatDate = (dateStr?: string): string => {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return dateStr;
    }
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

interface WhatsAppFeeReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, starts in single mode for this specific student
  initialStudent?: Student | null;
  // If opened from dues list, can pass the full array of defaulters
  initialDefaultersList?: { student: Student; dueAmount: number; classObj?: ClassInfo }[];
  // If multiple students were selected on the Dues table
  initialSelectedStudentIds?: string[];
  // Initial channel: WhatsApp or SMS
  initialChannel?: 'whatsapp' | 'sms';
  // Optional pre-selected class
  initialClassId?: string;
  // Optional pre-selected due range
  initialMinDue?: number;
  initialMaxDue?: number;
  initialDueRangePreset?: string;
}

export const WhatsAppFeeReminderModal: React.FC<WhatsAppFeeReminderModalProps> = ({
  isOpen,
  onClose,
  initialStudent,
  initialDefaultersList,
  initialSelectedStudentIds,
  initialChannel = 'whatsapp',
  initialClassId = '',
  initialMinDue = 0,
  initialMaxDue,
  initialDueRangePreset,
}) => {
  const { students, classes, settings, getStudentDueAmount, getStudentFeeBreakdown } = useSchool();

  // Channel: WhatsApp vs SMS
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'sms'>(initialChannel);

  // Mode: Single student or Bulk Campaign
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>(
    initialStudent ? 'single' : 'bulk'
  );

  // Single Student State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || ''
  );

  // WhatsApp & SMS Template State (Default to all heads & head-wise dues)
  const [selectedWhatsAppTemplateId, setSelectedWhatsAppTemplateId] = useState<WhatsAppTemplateId>('headwise_reminder');
  const [selectedSmsTemplateId, setSelectedSmsTemplateId] = useState<SmsTemplateId>('sms_headwise');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  // Default to anilsingh636-2@oksbi
  const [schoolUpiId, setSchoolUpiId] = useState<string>(settings.upiId || 'anilsingh636-2@oksbi');
  const [customHelpline, setCustomHelpline] = useState<string>(settings.phone || '+91 94150 00000');

  // Bulk Campaign State - Class & Due Range Filtering
  const [bulkClassFilter, setBulkClassFilter] = useState<string>(initialClassId || '');
  const [bulkSearchTerm, setBulkSearchTerm] = useState<string>('');
  const [dueRangePreset, setDueRangePreset] = useState<string>(() => {
    if (initialDueRangePreset) return initialDueRangePreset;
    if ((initialMinDue && initialMinDue > 0) || (initialMaxDue !== undefined && initialMaxDue !== '')) return 'custom';
    return 'all';
  });
  const [minDueFilter, setMinDueFilter] = useState<number>(initialMinDue || 0);
  const [maxDueFilter, setMaxDueFilter] = useState<number | ''>(initialMaxDue !== undefined ? initialMaxDue : '');
  const [selectedStudentIdsForBulk, setSelectedStudentIdsForBulk] = useState<string[]>([]);
  const [currentBulkIndex, setCurrentBulkIndex] = useState<number>(0);
  const [sentStudentIds, setSentStudentIds] = useState<Set<string>>(new Set());
  const [isQueueCompleted, setIsQueueCompleted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState<boolean>(false);
  // Default to Direct WhatsApp App mode for instant opening on phones without landing pages
  const [whatsAppMode, setWhatsAppMode] = useState<'direct' | 'web'>('direct');

  // Copy Feedback
  const [hasCopiedText, setHasCopiedText] = useState<boolean>(false);
  const [hasCopiedLink, setHasCopiedLink] = useState<boolean>(false);
  const [hasCopiedPhones, setHasCopiedPhones] = useState<boolean>(false);
  const [hasCopiedAllMessages, setHasCopiedAllMessages] = useState<boolean>(false);
  const [hasCopiedUpi, setHasCopiedUpi] = useState<boolean>(false);

  // Build Full Defaulters List - Always computed from active students so user can freely switch classes
  const allDefaulters = useMemo(() => {
    return students
      .filter((s) => s.status === 'Active')
      .map((s) => ({
        student: s,
        dueAmount: getStudentDueAmount(s.id),
        classObj: classes.find((c) => c.id === s.classId),
      }))
      .filter((item) => item.dueAmount > 0)
      .sort((a, b) => (a.student?.fullName || '').localeCompare(b.student?.fullName || '', undefined, { sensitivity: 'base' }));
  }, [students, classes, getStudentDueAmount]);

  // Pre-calculate count of defaulters per class
  const defaulterCountByClass = useMemo(() => {
    const map: Record<string, number> = {};
    allDefaulters.forEach((d) => {
      map[d.student.classId] = (map[d.student.classId] || 0) + 1;
    });
    return map;
  }, [allDefaulters]);

  // Filtered Defaulters for Bulk View by Class, Due Range, and Search Term
  const filteredDefaulters = useMemo(() => {
    return allDefaulters.filter((item) => {
      // 1. Class Filter
      if (bulkClassFilter && item.student.classId !== bulkClassFilter) return false;

      // 2. Due Range Filter (Min Due)
      if (minDueFilter > 0 && item.dueAmount < minDueFilter) return false;

      // 3. Due Range Filter (Max Due)
      if (maxDueFilter !== '' && Number(maxDueFilter) > 0 && item.dueAmount > Number(maxDueFilter)) return false;

      // 4. Search Filter
      if (bulkSearchTerm) {
        const q = bulkSearchTerm.toLowerCase();
        const fullName = (item.student?.fullName || '').toLowerCase();
        const admNo = (item.student?.admissionNo || '').toLowerCase();
        const phone = item.student?.guardianPhone || item.student?.emergencyContact || '';
        const father = (item.student?.fatherName || '').toLowerCase();

        const matches =
          fullName.includes(q) ||
          admNo.includes(q) ||
          phone.includes(bulkSearchTerm) ||
          father.includes(q);

        if (!matches) return false;
      }
      return true;
    });
  }, [allDefaulters, bulkClassFilter, minDueFilter, maxDueFilter, bulkSearchTerm]);

  // Total Dues for current filtered set
  const filteredTotalDue = useMemo(() => {
    return filteredDefaulters.reduce((sum, curr) => sum + curr.dueAmount, 0);
  }, [filteredDefaulters]);

  // Handler for Due Range Preset selection
  const handleSelectDueRangePreset = (presetId: string) => {
    setDueRangePreset(presetId);
    const preset = DUE_RANGE_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      setMinDueFilter(preset.min);
      setMaxDueFilter(preset.max);
    }
  };

  // Handler for selecting ONLY the currently filtered students
  const handleSelectOnlyFiltered = () => {
    const ids = filteredDefaulters.map((d) => d.student.id);
    setSelectedStudentIdsForBulk(ids);
    setCurrentBulkIndex(0);
    if (ids.length > 0) {
      setSelectedStudentId(ids[0]);
    }
    const clsName = classes.find((c) => c.id === bulkClassFilter)?.name || 'All Classes';
    const rangeText = formatDueRangeLabel(minDueFilter, maxDueFilter);
    setToastMessage(`✓ Selected only ${ids.length} student${ids.length !== 1 ? 's' : ''} in ${clsName} (${rangeText})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync initial parameters only when the modal opens (avoids resetting queue while sending)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (initialChannel) {
        setActiveChannel(initialChannel);
      }
      if (initialClassId !== undefined) {
        setBulkClassFilter(initialClassId);
      }
      if (initialMinDue !== undefined || initialMaxDue !== undefined) {
        setMinDueFilter(initialMinDue || 0);
        setMaxDueFilter(initialMaxDue !== undefined ? initialMaxDue : '');
        setDueRangePreset('custom');
      } else if (initialDueRangePreset) {
        setDueRangePreset(initialDueRangePreset);
        const preset = DUE_RANGE_PRESETS.find((p) => p.id === initialDueRangePreset);
        if (preset && preset.id !== 'custom') {
          setMinDueFilter(preset.min);
          setMaxDueFilter(preset.max);
        }
      }
      setIsQueueCompleted(false);
      setToastMessage(null);

      if (initialSelectedStudentIds && initialSelectedStudentIds.length > 0) {
        setSelectedStudentIdsForBulk(initialSelectedStudentIds);
        setCurrentBulkIndex(0);
        setSelectedStudentId(initialSelectedStudentIds[0]);
        setActiveMode('bulk');
      } else if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
        setActiveMode('single');
        // When opened for a single student, queue ONLY this student so sending doesn't unexpectedly jump or advance
        setSelectedStudentIdsForBulk([initialStudent.id]);
        setCurrentBulkIndex(0);
      } else {
        const allIds = filteredDefaulters.map((d) => d.student.id);
        setSelectedStudentIdsForBulk(allIds);
        setCurrentBulkIndex(0);
        if (allIds.length > 0) {
          setSelectedStudentId(allIds[0]);
        }
      }

      if (settings.upiId) {
        setSchoolUpiId(settings.upiId);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [
    isOpen,
    initialStudent,
    initialSelectedStudentIds,
    initialChannel,
    initialClassId,
    initialMinDue,
    initialMaxDue,
    initialDueRangePreset,
    settings.upiId,
  ]);

  // Unified Target Student Resolution with safe index clamping
  const safeBulkIndex =
    selectedStudentIdsForBulk.length > 0
      ? Math.max(0, Math.min(currentBulkIndex, selectedStudentIdsForBulk.length - 1))
      : 0;

  const activeStudentId =
    (selectedStudentIdsForBulk.length > 0 ? selectedStudentIdsForBulk[safeBulkIndex] : null) ||
    selectedStudentId ||
    initialStudent?.id ||
    allDefaulters[0]?.student.id ||
    students[0]?.id;

  const targetStudent = students.find((s) => s.id === activeStudentId) || initialStudent || students[0];
  const targetClass = classes.find((c) => c.id === targetStudent?.classId);
  const targetBreakdown = targetStudent ? getStudentFeeBreakdown(targetStudent.id) : null;
  const targetDueAmount = targetBreakdown ? targetBreakdown.netDue : (targetStudent ? getStudentDueAmount(targetStudent.id) : 0);

  // Next student in queue
  const nextStudentId =
    currentBulkIndex < selectedStudentIdsForBulk.length - 1
      ? selectedStudentIdsForBulk[currentBulkIndex + 1]
      : null;
  const nextStudent = nextStudentId ? students.find((s) => s.id === nextStudentId) : null;

  // Formatted parameters for template engine with All Heads & Head-Wise data
  const reminderParams: FeeReminderParams = {
    studentName: targetStudent?.fullName || 'Student',
    admissionNo: targetStudent?.admissionNo || 'N/A',
    rollNo: targetStudent?.rollNo || 'N/A',
    className: targetClass?.name || targetStudent?.classId || 'Class',
    section: targetStudent?.section || 'A',
    fatherName: targetStudent?.fatherName || 'Parent',
    guardianPhone: targetStudent?.guardianPhone || '',
    dueAmount: targetDueAmount,
    dueDate: safeFormatDate(dueDate),
    schoolName: settings.schoolName || 'SBSC Public School',
    schoolPhone: customHelpline,
    schoolUpi: schoolUpiId || 'anilsingh636-2@oksbi',
    bankAccountNo: '38942948293',
    bankIfsc: 'SBIN0001234',
    bankName: 'State Bank of India',

    // All Fee Heads Breakdown Components
    tuitionFee: targetBreakdown?.tuitionFee || 0,
    admissionFee: targetBreakdown?.admissionFee || 0,
    registrationFee: targetBreakdown?.registrationFee || 0,
    examFee: targetBreakdown?.examFee || 0,
    conveyFee: targetBreakdown?.conveyFee || 0,
    previousDue: targetBreakdown?.previousDue || 0,
    lateFine: targetBreakdown?.lateFine || 0,
    totalYearlyDue: targetBreakdown?.totalYearlyDue,
    totalPaid: targetBreakdown?.totalPaid || 0,
  };

  // WhatsApp Message
  const activeWhatsAppTemplateObj = WHATSAPP_FEE_TEMPLATES.find((t) => t.id === selectedWhatsAppTemplateId);
  const rawWhatsAppText = isEditingTemplate && customMessageText ? customMessageText : activeWhatsAppTemplateObj?.templateText || '';
  const finalWhatsAppMessage = formatFeeReminderMessage(rawWhatsAppText, reminderParams);

  // SMS Message
  const activeSmsTemplateObj = SMS_FEE_TEMPLATES.find((t) => t.id === selectedSmsTemplateId);
  const rawSmsText = isEditingTemplate && customMessageText ? customMessageText : activeSmsTemplateObj?.templateText || '';
  const finalSmsMessage = formatSmsMessage(rawSmsText, reminderParams);

  // Unified Active Final Message
  const finalMessage = activeChannel === 'whatsapp' ? finalWhatsAppMessage : finalSmsMessage;

  // URLs
  const phoneToUse = targetStudent?.guardianPhone || targetStudent?.emergencyContact || '';
  const cleanPhone = cleanPhoneNumber(phoneToUse);
  const whatsAppUrl = generateWhatsAppUrl(phoneToUse, finalWhatsAppMessage);
  const whatsAppAppUrl = generateWhatsAppAppUrl(phoneToUse, finalWhatsAppMessage);
  const whatsAppWebUrl = generateWhatsAppWebUrl(phoneToUse, finalWhatsAppMessage);
  const whatsAppShortUrl = generateWhatsAppShortUrl(phoneToUse, finalWhatsAppMessage);
  // Dynamically select the WhatsApp URL based on user preference or mobile device
  const activeWhatsAppUrl = whatsAppMode === 'direct' ? whatsAppAppUrl : whatsAppUrl;
  const smsUrl = generateSmsUrl(phoneToUse, finalSmsMessage);
  const upiPayUrl = generateUpiPayUrl(schoolUpiId, settings.schoolName || 'SBSC Public School', targetDueAmount, `Fee for ${targetStudent?.fullName || 'Student'}`);

  // All selected phones for group SMS or export
  const selectedDefaultersList = filteredDefaulters.filter((d) => selectedStudentIdsForBulk.includes(d.student.id));
  const allSelectedPhones = selectedDefaultersList.map((d) => d.student.guardianPhone || d.student.emergencyContact);
  const groupSmsUrl = generateGroupSmsUrl(allSelectedPhones, finalSmsMessage);

  if (!isOpen) return null;

  // Handlers
  const handleSelectWhatsAppTemplate = (tId: string) => {
    setSelectedWhatsAppTemplateId(tId as WhatsAppTemplateId);
    const tmpl = WHATSAPP_FEE_TEMPLATES.find((t) => t.id === tId);
    if (tmpl) {
      setCustomMessageText(tmpl.templateText);
    }
  };

  const handleSelectSmsTemplate = (tId: string) => {
    setSelectedSmsTemplateId(tId as SmsTemplateId);
    const tmpl = SMS_FEE_TEMPLATES.find((t) => t.id === tId);
    if (tmpl) {
      setCustomMessageText(tmpl.templateText);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(finalMessage);
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeChannel === 'whatsapp' ? whatsAppUrl : smsUrl);
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy URL', err);
    }
  };

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(schoolUpiId);
      setHasCopiedUpi(true);
      setTimeout(() => setHasCopiedUpi(false), 2500);
    } catch (err) {
      console.error('Failed to copy UPI', err);
    }
  };

  const handleCopyAllPhones = async () => {
    try {
      const phones = allSelectedPhones.map(cleanPhoneNumber).filter(Boolean).join(', ');
      await navigator.clipboard.writeText(phones);
      setHasCopiedPhones(true);
      setTimeout(() => setHasCopiedPhones(false), 2500);
    } catch (err) {
      console.error('Failed to copy phones', err);
    }
  };

  const handleCopyAllMessages = async () => {
    try {
      const blastSummary = selectedDefaultersList
        .map((item, idx) => {
          const b = getStudentFeeBreakdown(item.student.id);
          const p: FeeReminderParams = {
            studentName: item.student.fullName,
            admissionNo: item.student.admissionNo,
            rollNo: item.student.rollNo,
            className: item.classObj?.name || item.student.classId,
            section: item.student.section,
            fatherName: item.student.fatherName,
            guardianPhone: item.student.guardianPhone,
            dueAmount: item.dueAmount,
            dueDate: safeFormatDate(dueDate),
            schoolName: settings.schoolName || 'SBSC Public School',
            schoolPhone: customHelpline,
            schoolUpi: schoolUpiId,
            tuitionFee: b.tuitionFee,
            admissionFee: b.admissionFee,
            registrationFee: b.registrationFee,
            examFee: b.examFee,
            conveyFee: b.conveyFee,
            previousDue: b.previousDue,
            lateFine: b.lateFine,
            totalYearlyDue: b.totalYearlyDue,
            totalPaid: b.totalPaid,
          };
          const msg = activeChannel === 'whatsapp'
            ? formatFeeReminderMessage(rawWhatsAppText, p)
            : formatSmsMessage(rawSmsText, p);
          return `[${idx + 1}] To: ${item.student.guardianPhone} (${item.student.fullName})\n${msg}\n--------------------------`;
        })
        .join('\n\n');

      await navigator.clipboard.writeText(blastSummary);
      setHasCopiedAllMessages(true);
      setTimeout(() => setHasCopiedAllMessages(false), 2500);
    } catch (err) {
      console.error('Failed to copy all messages', err);
    }
  };

  /**
   * Safe dispatcher that delegates to dispatchSafeMessage.
   * Directly triggers WhatsApp app via native scheme or browser tab without reloading the SPA.
   */
  const dispatchMessageSafely = (
    url: string,
    channel: 'whatsapp' | 'sms' = 'whatsapp',
    e?: React.MouseEvent | React.SyntheticEvent,
    forcedMode?: 'direct-app' | 'browser'
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage(null);

    // Pre-emptively copy message text
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && finalMessage) {
        navigator.clipboard.writeText(finalMessage).catch(() => {});
      }
    } catch {}

    const result = dispatchSafeMessage(url, channel, finalMessage, {
      forceMode: forcedMode || (whatsAppMode === 'direct' ? 'direct-app' : 'browser'),
    });

    if (result.popupBlocked) {
      setIsPopupBlocked(true);
      if (channel === 'sms') {
        setToastMessage('📋 SMS message & numbers copied to clipboard! (On PC, use Google Messages Web or paste into SMS portal).');
      } else {
        setToastMessage('⚠️ Automatic launch was interrupted. Tap the direct WhatsApp button below.');
      }
    } else {
      setIsPopupBlocked(false);
      if (channel === 'sms') {
        setToastMessage('✓ SMS launched! Message text copied to clipboard as backup.');
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage(
          whatsAppMode === 'direct'
            ? `⚡ Direct WhatsApp app launched for ${targetStudent?.fullName || 'student'}!`
            : `✓ WhatsApp web opened for ${targetStudent?.fullName || 'student'}!`
        );
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  };

  /**
   * Primary Action: Dispatches WhatsApp/SMS and advances to the next student in the queue.
   */
  const handleSendAndNext = () => {
    setErrorMessage(null);
    if (!cleanPhone) {
      setErrorMessage(`Guardian phone number is missing or invalid for ${targetStudent?.fullName || 'student'}. Click "Next Student" to skip to the next parent.`);
      return;
    }

    if (targetStudent) {
      setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
    }

    const currentUrl = activeChannel === 'whatsapp' ? activeWhatsAppUrl : smsUrl;
    dispatchMessageSafely(currentUrl, activeChannel, undefined, whatsAppMode === 'direct' ? 'direct-app' : 'browser');

    const totalStudents = selectedStudentIdsForBulk.length;
    if (currentBulkIndex < totalStudents - 1) {
      const nextIdx = currentBulkIndex + 1;
      const nextId = selectedStudentIdsForBulk[nextIdx];
      const nextStudentObj = students.find((s) => s.id === nextId);

      setCurrentBulkIndex(nextIdx);
      setSelectedStudentId(nextId);
      setToastMessage(
        `✓ Dispatched to ${targetStudent?.fullName || 'Student'}! Ready for ${nextStudentObj?.fullName || 'Next Student'} (${nextIdx + 1} of ${totalStudents}).`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } else {
      setIsQueueCompleted(true);
      setToastMessage(`🎉 All ${totalStudents} dues reminders have been processed!`);
    }
  };

  /**
   * Secondary Action: Sends to current student without advancing index.
   */
  const handleSendCurrentOnly = () => {
    setErrorMessage(null);
    if (!cleanPhone) {
      setErrorMessage(`Guardian phone number is missing or invalid for ${targetStudent?.fullName || 'student'}.`);
      return;
    }

    if (targetStudent) {
      setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
    }

    const currentUrl = activeChannel === 'whatsapp' ? activeWhatsAppUrl : smsUrl;
    dispatchMessageSafely(currentUrl, activeChannel, undefined, whatsAppMode === 'direct' ? 'direct-app' : 'browser');
    setToastMessage(`✓ Dispatched ${activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to ${targetStudent?.fullName}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Manual Next Navigation
   */
  const handleNextStudent = () => {
    setErrorMessage(null);
    setIsPopupBlocked(false);
    if (currentBulkIndex < selectedStudentIdsForBulk.length - 1) {
      const nextIdx = currentBulkIndex + 1;
      setCurrentBulkIndex(nextIdx);
      setSelectedStudentId(selectedStudentIdsForBulk[nextIdx]);
      setIsQueueCompleted(false);
    }
  };

  /**
   * Manual Previous Navigation
   */
  const handlePrevStudent = () => {
    setErrorMessage(null);
    setIsPopupBlocked(false);
    if (currentBulkIndex > 0) {
      const prevIdx = currentBulkIndex - 1;
      setCurrentBulkIndex(prevIdx);
      setSelectedStudentId(selectedStudentIdsForBulk[prevIdx]);
      setIsQueueCompleted(false);
    }
  };

  /**
   * Group SMS Broadcast (All Selected Parents at Once)
   */
  const handleSendGroupSms = () => {
    setErrorMessage(null);
    if (allSelectedPhones.length === 0) {
      setErrorMessage('No valid guardian phone numbers found for group SMS.');
      return;
    }
    // Mark all selected students as sent
    setSentStudentIds((prev) => new Set([...prev, ...selectedStudentIdsForBulk]));
    dispatchMessageSafely(groupSmsUrl, 'sms');
    
    // Copy all phone numbers to clipboard so user has them readily available
    const commaSeparated = Array.from(new Set(allSelectedPhones.map((p) => formatPhoneForSms(p)).filter(Boolean))).join(', ');
    if (commaSeparated && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        navigator.clipboard.writeText(commaSeparated).catch(() => {});
      } catch {}
    }
    
    setToastMessage(`✓ Group SMS opened for ${allSelectedPhones.length} parents! (${allSelectedPhones.length} numbers copied to clipboard)`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const handleSendWhatsApp = () => {
    handleSendAndNext();
  };

  const handleSendSms = () => {
    handleSendAndNext();
  };

  const isAllFilteredSelected =
    filteredDefaulters.length > 0 &&
    filteredDefaulters.every((d) => selectedStudentIdsForBulk.includes(d.student.id));

  const handleToggleBulkSelectAll = () => {
    if (isAllFilteredSelected) {
      // Remove all filtered students from selection
      const filteredIdSet = new Set(filteredDefaulters.map((d) => d.student.id));
      setSelectedStudentIdsForBulk((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Add all filtered students to selection
      const filteredIds = filteredDefaulters.map((d) => d.student.id);
      setSelectedStudentIdsForBulk((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleBulkStudent = (studentId: string) => {
    setSelectedStudentIdsForBulk((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const insertVariablePlaceholder = (tag: string) => {
    setIsEditingTemplate(true);
    const current = customMessageText || (activeChannel === 'whatsapp' ? activeWhatsAppTemplateObj?.templateText : activeSmsTemplateObj?.templateText) || '';
    setCustomMessageText(current + ' ' + tag);
  };

  const getReminderParamsForStudent = (studentId: string): FeeReminderParams => {
    const s = students.find((item) => item.id === studentId);
    const cls = classes.find((c) => c.id === s?.classId);
    const b = s ? getStudentFeeBreakdown(s.id) : null;
    const due = b ? b.netDue : (s ? getStudentDueAmount(s.id) : 0);

    return {
      studentName: s?.fullName || 'Student',
      admissionNo: s?.admissionNo || 'N/A',
      rollNo: s?.rollNo || 'N/A',
      className: cls?.name || s?.classId || 'Class',
      section: s?.section || 'A',
      fatherName: s?.fatherName || 'Parent',
      guardianPhone: s?.guardianPhone || '',
      dueAmount: due,
      dueDate: safeFormatDate(dueDate),
      schoolName: settings.schoolName || 'SBSC Public School',
      schoolPhone: customHelpline,
      schoolUpi: schoolUpiId || 'anilsingh636-2@oksbi',
      bankAccountNo: '38942948293',
      bankIfsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      tuitionFee: b?.tuitionFee || 0,
      admissionFee: b?.admissionFee || 0,
      registrationFee: b?.registrationFee || 0,
      examFee: b?.examFee || 0,
      conveyFee: b?.conveyFee || 0,
      previousDue: b?.previousDue || 0,
      lateFine: b?.lateFine || 0,
      totalYearlyDue: b?.totalYearlyDue,
      totalPaid: b?.totalPaid || 0,
    };
  };

  const getStudentMessage = (studentId: string, channel: 'whatsapp' | 'sms' = 'whatsapp'): string => {
    const params = getReminderParamsForStudent(studentId);
    if (channel === 'whatsapp') {
      const activeObj = WHATSAPP_FEE_TEMPLATES.find((t) => t.id === selectedWhatsAppTemplateId);
      const rawText = isEditingTemplate && customMessageText ? customMessageText : activeObj?.templateText || '';
      return formatFeeReminderMessage(rawText, params);
    } else {
      const activeObj = SMS_FEE_TEMPLATES.find((t) => t.id === selectedSmsTemplateId);
      const rawText = isEditingTemplate && customMessageText ? customMessageText : activeObj?.templateText || '';
      return formatSmsMessage(rawText, params);
    }
  };

  const handleSendSpecificStudent = (studentId: string) => {
    setErrorMessage(null);
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const phone = student.guardianPhone || student.emergencyContact || '';
    const clean = cleanPhoneNumber(phone);
    if (!clean) {
      setErrorMessage(`Guardian phone number is missing or invalid for ${student.fullName}.`);
      return;
    }

    const msg = getStudentMessage(studentId, 'whatsapp');
    const url = generateWhatsAppUrl(clean, msg);
    dispatchSafeMessage(url, 'whatsapp', msg);
    setSentStudentIds((prev) => new Set([...prev, studentId]));
    setSelectedStudentId(studentId);
    const idx = selectedStudentIdsForBulk.indexOf(studentId);
    if (idx !== -1) {
      setCurrentBulkIndex(idx);
    }
    setToastMessage(`✓ Dispatched WhatsApp to ${student.fullName}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportWhatsAppCsv = () => {
    const headers = [
      'Student Name',
      'Admission No',
      'Roll No',
      'Class',
      'Section',
      'Father Name',
      'Phone Number',
      'Pending Dues (Rs)',
      'Tuition Fee',
      'Admission Fee',
      'Conveyance / Transport',
      'Previous Due',
      'Late Fine',
      'Due Date',
      'School UPI',
      'Direct Click-to-Send WhatsApp Link',
      'Full WhatsApp Message Text',
    ];

    const rows = selectedDefaultersList.map((item) => {
      const s = item.student;
      const b = getStudentFeeBreakdown(s.id);
      const phone = cleanPhoneNumber(s.guardianPhone || s.emergencyContact);
      const msg = getStudentMessage(s.id, 'whatsapp');
      const waLink = phone ? generateWhatsAppUrl(phone, msg) : 'No valid phone';
      return [
        s.fullName,
        s.admissionNo,
        s.rollNo,
        item.classObj?.name || s.classId,
        s.section,
        s.fatherName,
        s.guardianPhone,
        item.dueAmount,
        b.tuitionFee,
        b.admissionFee,
        b.conveyFee,
        b.previousDue,
        b.lateFine,
        safeFormatDate(dueDate),
        schoolUpiId,
        waLink,
        `"${msg.replace(/"/g, '""')}"`,
      ];
    });

    exportTableToCsv(`WhatsApp-Due-Blast-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
    setToastMessage(`✓ Exported WhatsApp blast sheet for ${rows.length} students!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Total Dues for Selected in Bulk (computed across all selected, regardless of active filter)
  const totalSelectedDues = allDefaulters
    .filter((d) => selectedStudentIdsForBulk.includes(d.student.id))
    .reduce((sum, curr) => sum + curr.dueAmount, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Modal Top Header with WhatsApp & SMS Channel Switcher */}
        <div
          className={`text-white px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors ${
            activeChannel === 'whatsapp'
              ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900'
              : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border ${
                activeChannel === 'whatsapp'
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-blue-600 text-white border-blue-400'
              }`}
            >
              {activeChannel === 'whatsapp' ? (
                <MessageSquare className="w-5 h-5 fill-current" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Student Due Fee {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Dispatch Hub
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    activeChannel === 'whatsapp'
                      ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-blue-400/20 text-blue-200 border-blue-400/30'
                  }`}
                >
                  UPI: {schoolUpiId}
                </span>
              </div>
              <p className="text-xs text-slate-200/90">
                Send personalized fee due notifications, UPI payment link (<span className="font-mono font-bold text-amber-300">{schoolUpiId}</span>), and clearance alerts via WhatsApp & SMS.
              </p>
            </div>
          </div>

          {/* Channel Selector, Mode Switcher & Close */}
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp vs SMS Channel Toggle */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('whatsapp');
                  setIsEditingTemplate(false);
                  setCustomMessageText('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeChannel === 'whatsapp'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel('sms');
                  setIsEditingTemplate(false);
                  setCustomMessageText('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeChannel === 'sms'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>SMS Text</span>
              </button>
            </div>

            {/* Single vs Bulk Mode Switcher */}
            <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'single'
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('bulk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'bulk'
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Bulk ({selectedStudentIdsForBulk.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          {/* Left Column: Student Select, Templates & Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Quick UPI Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-950 block">Active School Fee UPI ID:</span>
                  <span className="font-mono font-extrabold text-xs text-blue-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {schoolUpiId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  {hasCopiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedUpi ? 'Copied UPI!' : 'Copy UPI'}</span>
                </button>
                <a
                  href={upiPayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test UPI Link</span>
                </a>
              </div>
            </div>

            {/* If Single Mode: Student Picker & Quick Dossier Card */}
            {activeMode === 'single' ? (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Select Student with Due Fees:</span>
                  </label>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Outstanding Due: {settings.currencySymbol} {targetDueAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedStudentId(newId);
                      const idx = selectedStudentIdsForBulk.indexOf(newId);
                      if (idx !== -1) {
                        setCurrentBulkIndex(idx);
                      }
                      setIsQueueCompleted(false);
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-800"
                  >
                    {allDefaulters.map((d) => (
                      <option key={d.student.id} value={d.student.id}>
                        {d.student.fullName} (Adm: {d.student.admissionNo}, Class: {d.classObj?.name || d.student.classId}-{d.student.section}, Dues: ₹{d.dueAmount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevStudent}
                      disabled={currentBulkIndex <= 0}
                      className="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                      title="Previous Defaulter"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStudent}
                      disabled={currentBulkIndex >= selectedStudentIdsForBulk.length - 1}
                      className="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                      title="Next Defaulter"
                    >
                      ➔
                    </button>
                  </div>
                </div>

                {/* Selected Student Information Ribbon */}
                {targetStudent && (
                  <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-extrabold text-emerald-300 text-sm">
                        {targetStudent.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm block uppercase tracking-wide">
                          {targetStudent.fullName}
                        </span>
                        <span className="text-[11px] text-slate-300">
                          Class: <b>{targetClass?.name || targetStudent.classId}-{targetStudent.section}</b> • Roll #{targetStudent.rollNo} • Adm: {targetStudent.admissionNo}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Parent Contact</span>
                      <span className="font-bold text-emerald-300 text-xs flex items-center gap-1 justify-end">
                        <Phone className="w-3 h-3" />
                        {targetStudent.guardianPhone}
                      </span>
                      <span className="text-[10px] text-slate-300 font-medium">({targetStudent.fatherName})</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Bulk Mode: Defaulters Queue & Dispatch Navigator */
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Selected Students Queue ({selectedStudentIdsForBulk.length} Selected)
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    Total Dues: {settings.currencySymbol} {totalSelectedDues.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Filter Toolbar: Class & Due Range Selection Engine */}
                <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-blue-900" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Filter by Class & Due Range
                      </span>
                      <span className="text-[10px] text-blue-800 bg-blue-100 font-bold px-1.5 py-0.5 rounded">
                        कक्षा व बकाया रेंज फ़िल्टर
                      </span>
                    </div>

                    {/* Reset Filters button if any filter is active */}
                    {(bulkClassFilter || minDueFilter > 0 || maxDueFilter !== '' || bulkSearchTerm) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkClassFilter('');
                          setMinDueFilter(0);
                          setMaxDueFilter('');
                          setDueRangePreset('all');
                          setBulkSearchTerm('');
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Reset All Filters (फ़िल्टर हटाएं)</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Filter Row: Class, Due Range Preset, Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    {/* 1. Class Selector */}
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase">
                        Select Class (कक्षा चुनें)
                      </label>
                      <select
                        value={bulkClassFilter}
                        onChange={(e) => setBulkClassFilter(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-emerald-800 shadow-2xs"
                      >
                        <option value="">🏫 All Classes ({allDefaulters.length} Defaulters)</option>
                        {classes.map((c) => {
                          const count = defaulterCountByClass[c.id] || 0;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} ({count} {count === 1 ? 'defaulter' : 'defaulters'})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 2. Due Range Preset Selector */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase">
                        Select Due Range (बकाया सीमा)
                      </label>
                      <select
                        value={dueRangePreset}
                        onChange={(e) => handleSelectDueRangePreset(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-emerald-800 shadow-2xs"
                      >
                        {DUE_RANGE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label} {p.hindiLabel ? `(${p.hindiLabel})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Search Filter */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase">
                        Search Student / Phone
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Name, Adm, Phone..."
                          value={bulkSearchTerm}
                          onChange={(e) => setBulkSearchTerm(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-emerald-800 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Due Range Quick Select Chips */}
                  <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Quick Ranges:</span>
                    {DUE_RANGE_PRESETS.map((p) => {
                      const isSelected = dueRangePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectDueRangePreset(p.id)}
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Range Exact Number Inputs */}
                  {dueRangePreset === 'custom' && (
                    <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-[10px] font-black text-blue-900 uppercase">Exact Due Range Limits:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 font-bold text-xs">Min ₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="0"
                          value={minDueFilter || ''}
                          onChange={(e) => setMinDueFilter(e.target.value ? Math.max(0, Number(e.target.value)) : 0)}
                          className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-blue-800"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 font-bold text-xs">Max ₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="No upper limit"
                          value={maxDueFilter}
                          onChange={(e) => setMaxDueFilter(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                          className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-blue-800"
                        />
                      </div>
                      <span className="text-[11px] text-blue-900 font-medium italic">
                        (Active: dues from ₹{minDueFilter.toLocaleString('en-IN')} {maxDueFilter !== '' ? `to ₹${Number(maxDueFilter).toLocaleString('en-IN')}` : 'and higher'})
                      </span>
                    </div>
                  )}

                  {/* Active Match Banner & One-Click Selection Button */}
                  <div className="bg-white rounded-xl p-2.5 border-2 border-emerald-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                        ✓
                      </div>
                      <div className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {filteredDefaulters.length} Student{filteredDefaulters.length !== 1 ? 's' : ''} Match Criteria
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-700">
                            Class: <b className="text-blue-900">{classes.find((c) => c.id === bulkClassFilter)?.name || 'All Classes'}</b>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-700">
                            Range: <b className="text-rose-700">{formatDueRangeLabel(minDueFilter, maxDueFilter)}</b>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-extrabold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Total Due: ₹{filteredTotalDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Single-Click Select Only Filtered Students */}
                    <button
                      type="button"
                      onClick={handleSelectOnlyFiltered}
                      disabled={filteredDefaulters.length === 0}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                      title="Select strictly these matching students for reminder dispatch"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Select Only These ({filteredDefaulters.length}) Students</span>
                    </button>
                  </div>
                </div>

                {/* Queue Selection Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleBulkSelectAll}
                      className="text-xs font-bold text-blue-900 hover:text-blue-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isAllFilteredSelected ? 'Deselect All Filtered' : 'Select All Filtered'}
                      </span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIdsForBulk([])}
                      disabled={selectedStudentIdsForBulk.length === 0}
                      className="text-xs font-bold text-slate-600 hover:text-rose-700 disabled:opacity-40 cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Dispatched: {sentStudentIds.size} / {selectedStudentIdsForBulk.length}
                    </span>

                    {activeChannel === 'whatsapp' && selectedStudentIdsForBulk.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExportWhatsAppCsv}
                        title="Export spreadsheet with direct click-to-send WhatsApp links for all selected students"
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export WhatsApp Excel/CSV</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyAllPhones}
                      title="Copy all selected phone numbers as comma separated list"
                      className="text-[11px] font-bold text-slate-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{hasCopiedPhones ? 'Copied All Phones!' : 'Copy All Phones'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar for Bulk Queue */}
                {selectedStudentIdsForBulk.length > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((sentStudentIds.size / Math.max(1, selectedStudentIdsForBulk.length)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                )}

                {/* Queue Scroll List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {filteredDefaulters.length === 0 ? (
                    <p className="text-center text-slate-400 py-4 text-xs italic">No defaulters matching criteria.</p>
                  ) : (
                    filteredDefaulters.map((item, idx) => {
                      const isSelected = selectedStudentIdsForBulk.includes(item.student.id);
                      const isSent = sentStudentIds.has(item.student.id);
                      const isCurrent = targetStudent?.id === item.student.id;

                      return (
                        <div
                          key={item.student.id}
                          onClick={() => {
                            const indexInSelected = selectedStudentIdsForBulk.indexOf(item.student.id);
                            if (indexInSelected >= 0) {
                              setCurrentBulkIndex(indexInSelected);
                              setSelectedStudentId(item.student.id);
                              setIsQueueCompleted(false);
                            } else {
                              setSelectedStudentIdsForBulk((prev) => [...prev, item.student.id]);
                              setCurrentBulkIndex(selectedStudentIdsForBulk.length);
                              setSelectedStudentId(item.student.id);
                              setIsQueueCompleted(false);
                            }
                          }}
                          className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                            isCurrent
                              ? 'bg-blue-950 text-white shadow-xs'
                              : isSelected
                              ? 'bg-white hover:bg-emerald-50 text-slate-800'
                              : 'opacity-50 bg-slate-100 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleBulkStudent(item.student.id);
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-bold uppercase block text-[11px]">
                                {item.student.fullName}
                              </span>
                              <span className={`text-[10px] ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                                {item.classObj?.name || item.student.classId}-{item.student.section} • {item.student.guardianPhone}
                              </span>
                              {(() => {
                                const b = getStudentFeeBreakdown(item.student.id);
                                const parts: string[] = [];
                                if (b.previousDue > 0) parts.push(`Prev: ₹${b.previousDue}`);
                                if (b.tuitionFee > 0) parts.push(`Tuit: ₹${b.tuitionFee}`);
                                if (b.admissionFee > 0) parts.push(`Adm: ₹${b.admissionFee}`);
                                if (b.registrationFee > 0) parts.push(`Reg: ₹${b.registrationFee}`);
                                if (b.examFee > 0) parts.push(`Exam: ₹${b.examFee}`);
                                if (b.conveyFee > 0) parts.push(`Transport: ₹${b.conveyFee}`);
                                if (b.lateFine > 0) parts.push(`Fine: ₹${b.lateFine}`);
                                if (parts.length === 0) return null;
                                return (
                                  <div className={`text-[9px] font-medium mt-0.5 flex flex-wrap gap-1 ${isCurrent ? 'text-blue-200' : 'text-slate-600'}`}>
                                    {parts.slice(0, 3).map((p, pIdx) => (
                                       <span key={pIdx} className={`px-1 py-0.2 rounded ${isCurrent ? 'bg-blue-900/60 text-amber-200' : 'bg-slate-200/80 text-slate-700'}`}>
                                         {p}
                                       </span>
                                    ))}
                                    {parts.length > 3 && (
                                      <span className="text-[9px] opacity-75">+{parts.length - 3} more</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`font-black text-xs ${
                                isCurrent ? 'text-amber-300' : 'text-rose-700'
                              }`}
                            >
                              ₹{item.dueAmount.toLocaleString('en-IN')}
                            </span>
                            {isSent ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                isCurrent
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                <Check className="w-3 h-3" />
                                <span>Sent ✓</span>
                              </span>
                            ) : activeChannel === 'whatsapp' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendSpecificStudent(item.student.id);
                                }}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition"
                                title={`Send WhatsApp message to ${item.student.fullName}`}
                              >
                                <Send className="w-2.5 h-2.5 fill-current" />
                                <span>Send</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Stepper controls */}
                {selectedStudentIdsForBulk.length > 0 && (
                  <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs">
                    <span className="font-bold text-slate-900">
                      Target ({currentBulkIndex + 1} of {selectedStudentIdsForBulk.length}):{' '}
                      <b className="uppercase text-blue-950">{targetStudent?.fullName}</b> (₹{targetDueAmount.toLocaleString('en-IN')})
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevStudent}
                        disabled={currentBulkIndex === 0}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-800 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStudent}
                        disabled={currentBulkIndex >= selectedStudentIdsForBulk.length - 1}
                        className="px-2.5 py-1 bg-blue-950 text-white rounded font-bold hover:bg-blue-900 disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Student All Heads & Head-Wise Dues Dossier */}
            {targetStudent && targetBreakdown && (
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span>All Fee Heads & Head-Wise Due Breakdown</span>
                        <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-1.5 py-0.5 rounded">मद-वार देय</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Ward: <b className="text-slate-800">{targetStudent.fullName}</b> ({targetClass?.name || targetStudent.classId}-{targetStudent.section} • Roll #{targetStudent.rollNo})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Total Net Due</span>
                    <span className="text-sm font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ₹{targetDueAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 7 Itemized Fee Head Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* Tuition */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Tuition Fee</span>
                      <span className="text-[9px] text-slate-400">शिक्षण</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.tuitionFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Admission */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Admission</span>
                      <span className="text-[9px] text-slate-400">प्रवेश</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.admissionFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Registration */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Registration</span>
                      <span className="text-[9px] text-slate-400">पंजीकरण</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.registrationFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Exam Fee */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Exam Fee</span>
                      <span className="text-[9px] text-slate-400">परीक्षा</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.examFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Conveyance / Transport */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Conveyance</span>
                      <span className="text-[9px] text-slate-400">वाहन</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.conveyFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Previous Due */}
                  <div className={`p-2.5 rounded-xl border shadow-2xs ${
                    targetBreakdown.previousDue > 0
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-400/50'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="text-[10px] font-bold flex items-center justify-between">
                      <span className={targetBreakdown.previousDue > 0 ? 'text-amber-900' : 'text-slate-500'}>
                        Previous Due
                      </span>
                      <span className="text-[9px] text-amber-700">पिछला</span>
                    </div>
                    <div className={`text-sm font-black mt-0.5 ${
                      targetBreakdown.previousDue > 0 ? 'text-amber-950' : 'text-slate-900'
                    }`}>
                      ₹{(targetBreakdown.previousDue || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Late Fine */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-between">
                      <span>Late Fine</span>
                      <span className="text-[9px] text-slate-400">विलंब</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      ₹{(targetBreakdown.lateFine || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Total Paid */}
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                    <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                      <span>Paid Fee</span>
                      <span className="text-[9px] text-emerald-700">जमा</span>
                    </div>
                    <div className="text-sm font-black text-emerald-950 mt-0.5">
                      ₹{(targetBreakdown.totalPaid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Ledger reconciliation line */}
                <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100 flex flex-wrap items-center justify-between text-xs gap-2">
                  <span className="text-[11px] text-slate-600">
                    Gross Annual Assessment: <b className="text-slate-900">₹{(targetBreakdown.totalYearlyDue || 0).toLocaleString('en-IN')}</b> • Total Paid: <b className="text-emerald-700">₹{(targetBreakdown.totalPaid || 0).toLocaleString('en-IN')}</b>
                  </span>
                  <span className="text-[11px] font-extrabold text-blue-900 flex items-center gap-1">
                    <span>Includes 7 School Heads in reminder message</span>
                  </span>
                </div>
              </div>
            )}

            {/* Template Selector Carousel */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Choose {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Notification Format:
                  </span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {activeChannel === 'whatsapp' ? WHATSAPP_FEE_TEMPLATES.length : SMS_FEE_TEMPLATES.length} pre-approved formats
                </span>
              </div>

              {activeChannel === 'whatsapp' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WHATSAPP_FEE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectWhatsAppTemplate(tmpl.id)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                        selectedWhatsAppTemplateId === tmpl.id
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{tmpl.name}</span>
                        <span className="text-[9px] font-extrabold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SMS_FEE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectSmsTemplate(tmpl.id)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                        selectedSmsTemplateId === tmpl.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{tmpl.name}</span>
                        <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Parameter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Message Parameters & Payment Channels:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Clearance Due Date:</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">School UPI ID:</label>
                  <input
                    type="text"
                    value={schoolUpiId}
                    onChange={(e) => setSchoolUpiId(e.target.value)}
                    placeholder="e.g. anilsingh636-2@oksbi"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-900 focus:outline-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Accounts Phone:</label>
                  <input
                    type="text"
                    value={customHelpline}
                    onChange={(e) => setCustomHelpline(e.target.value)}
                    placeholder="Helpline Number"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-emerald-800"
                  />
                </div>
              </div>

              {/* Message Template Editor / Placeholder Chips */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Dynamic Variable Chips (Click to insert):</span>
                  <button
                    onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    {isEditingTemplate ? 'Restore Default Template' : 'Edit Template Text'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <button
                    onClick={() => insertVariablePlaceholder('{fee_head_breakdown}')}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-400 rounded px-2 py-0.5 font-mono font-bold transition cursor-pointer shadow-2xs"
                    title="Insert full itemized 7-head fee breakdown"
                  >
                    +📋{'{fee_head_breakdown}'}
                  </button>
                  {[
                    '{student_name}',
                    '{admission_no}',
                    '{roll_no}',
                    '{class_name}',
                    '{section}',
                    '{father_name}',
                    '{due_amount}',
                    '{due_date}',
                    '{tuition_fee}',
                    '{admission_fee}',
                    '{registration_fee}',
                    '{exam_fee}',
                    '{convey_fee}',
                    '{previous_due}',
                    '{late_fine}',
                    '{total_yearly_due}',
                    '{total_paid}',
                    '{school_upi}',
                    '{school_phone}',
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => insertVariablePlaceholder(chip)}
                      className="bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-300 rounded px-2 py-0.5 font-mono font-semibold transition cursor-pointer"
                      title="Insert variable"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>

                {isEditingTemplate && (
                  <textarea
                    rows={4}
                    value={customMessageText || (activeChannel === 'whatsapp' ? activeWhatsAppTemplateObj?.templateText : activeSmsTemplateObj?.templateText) || ''}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    placeholder="Enter custom template message with placeholders..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-emerald-800"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Phone Mockup & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3.5">
            {/* Active Queue Stepper & Progress Tracker */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>
                    Queue Student: <b className="text-blue-900">{currentBulkIndex + 1} of {selectedStudentIdsForBulk.length}</b>
                  </span>
                </span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  Sent: <b className="text-emerald-700 font-extrabold">{sentStudentIds.size}</b> / {selectedStudentIdsForBulk.length}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((sentStudentIds.size / Math.max(1, selectedStudentIdsForBulk.length)) * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="truncate max-w-[210px]">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Current Recipient</span>
                  <span className="font-extrabold text-slate-900 uppercase truncate block">
                    {targetStudent?.fullName} (₹{targetDueAmount.toLocaleString('en-IN')})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={currentBulkIndex === 0}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs disabled:opacity-40 cursor-pointer"
                    title="Previous student in queue"
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={currentBulkIndex >= selectedStudentIdsForBulk.length - 1}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
                    title="Next student in queue"
                  >
                    Next ➔
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Toast Alert */}
            {toastMessage && (
              <div className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-md transition-all animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-white/80 hover:text-white text-xs cursor-pointer ml-2 p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Queue Finished Celebration Card */}
            {isQueueCompleted && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 text-center space-y-2 shadow-md animate-in fade-in">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-emerald-950">Queue Reminders Completed!</h4>
                <p className="text-xs text-emerald-800">
                  All {selectedStudentIdsForBulk.length} students have been processed in this session.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentBulkIndex(0);
                      setSelectedStudentId(selectedStudentIdsForBulk[0]);
                      setIsQueueCompleted(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Restart from Student 1
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}

            {/* Phone Mockup Frame */}
            <div className="bg-slate-900 rounded-[28px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col flex-1">
              {/* App Bar (WhatsApp vs SMS) */}
              {activeChannel === 'whatsapp' ? (
                <div className="bg-[#075E54] text-white px-3 py-2.5 rounded-t-2xl flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white">
                      {targetStudent?.fullName.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white truncate max-w-[170px]">
                        {targetStudent?.fatherName ? `${targetStudent.fatherName} (P/O ${targetStudent.fullName})` : targetStudent?.fullName}
                      </h5>
                      <p className="text-[9px] text-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        +{cleanPhone || '91XXXXXXXXXX'} • online
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-white/90">
                    <MessageSquare className="w-3.5 h-3.5 fill-current text-emerald-300" />
                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">WhatsApp</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 text-white px-3 py-2.5 rounded-t-2xl flex items-center justify-between shadow-md border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center font-bold text-xs text-white">
                      {targetStudent?.fullName.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white truncate max-w-[170px]">
                        {targetStudent?.fullName}
                      </h5>
                      <p className="text-[9px] text-slate-300 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        +{cleanPhone || '91XXXXXXXXXX'} • Cellular SMS
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-white/90">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded border border-blue-400/30">
                      SMS Text
                    </span>
                  </div>
                </div>
              )}

              {/* Chat Canvas (WhatsApp Background pattern vs SMS clean canvas) */}
              <div
                className={`flex-1 p-3 sm:p-4 rounded-b-2xl overflow-y-auto space-y-2 min-h-[280px] max-h-[420px] flex flex-col justify-start ${
                  activeChannel === 'whatsapp' ? 'bg-[#ECE5DD]' : 'bg-slate-900/90'
                }`}
                style={
                  activeChannel === 'whatsapp'
                    ? {
                        backgroundImage: `radial-gradient(#d3c9bf 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                      }
                    : undefined
                }
              >
                {/* Date stamp pill */}
                <div
                  className={`self-center text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-2xs ${
                    activeChannel === 'whatsapp'
                      ? 'bg-white/80 text-slate-600'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  TODAY • {activeChannel === 'whatsapp' ? 'WHATSAPP' : 'TEXT MESSAGE (SMS)'}
                </div>

                {/* Speech Bubble */}
                {activeChannel === 'whatsapp' ? (
                  <div className="self-end max-w-[92%] bg-[#DCF8C6] text-slate-800 rounded-2xl rounded-tr-xs p-3.5 shadow-sm space-y-2 border border-[#C5E1A5] text-xs">
                    <div className="whitespace-pre-line leading-relaxed text-[11px] text-slate-900 font-sans">
                      {finalWhatsAppMessage}
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 pt-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-sky-600 font-bold">✓✓</span>
                    </div>
                  </div>
                ) : (
                  <div className="self-end max-w-[92%] bg-blue-600 text-white rounded-2xl rounded-tr-xs p-3.5 shadow-md space-y-2 text-xs">
                    <div className="whitespace-pre-line leading-relaxed text-[11px] text-white font-sans">
                      {finalSmsMessage}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-blue-200 pt-1 border-t border-blue-500/40">
                      <span>{finalSmsMessage.length} characters ({Math.ceil(finalSmsMessage.length / 160)} SMS)</span>
                      <span>Delivered via SIM</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {isPopupBlocked && activeChannel === 'whatsapp' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-950 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Automatic popup was blocked by browser. Tap below to open WhatsApp:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppUrl);
                      }}
                      className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp Web / App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppWebUrl);
                      }}
                      className="py-2.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>WhatsApp Web (PC)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-800 font-medium">
                    ✓ Notice text copied to clipboard. Single Page App remains open and on this page.
                  </p>
                </div>
              )}

              {activeChannel === 'whatsapp' ? (
                /* WhatsApp Mode Toggle & Dispatch Buttons */
                <div className="space-y-2">
                  {/* WhatsApp Mode Selector (Direct App vs Browser) */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <span>WhatsApp Send Mode:</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            whatsAppMode === 'direct' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {whatsAppMode === 'direct' ? '⚡ Direct App' : '🌐 Web Browser'}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-800 font-medium">
                          {whatsAppMode === 'direct'
                            ? 'सीधे फ़ोन के WhatsApp ऐप में खुलेगा (No Chrome landing page)'
                            : 'ब्राउज़र / WhatsApp Web के माध्यम से खुलेगा'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setWhatsAppMode('direct')}
                        className={`px-2.5 py-1 rounded-md text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                          whatsAppMode === 'direct'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-emerald-800'
                        }`}
                        title="Directly launch WhatsApp mobile app without opening intermediate browser page"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Direct App</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWhatsAppMode('web')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          whatsAppMode === 'web'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-emerald-800'
                        }`}
                        title="Open via web browser link"
                      >
                        <Laptop className="w-3 h-3" />
                        <span>Web</span>
                      </button>
                    </div>
                  </div>

                  {selectedStudentIdsForBulk.length > 1 ? (
                    /* Bulk Queue Mode: Next button + Stay on current button */
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleSendAndNext}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600 active:scale-98 text-white font-black text-sm shadow-md transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border border-emerald-400/40"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 fill-current text-amber-300" />
                          <span>
                            {currentBulkIndex < selectedStudentIdsForBulk.length - 1
                              ? `⚡ Direct WhatsApp & Next Student ➔ (${currentBulkIndex + 1}/${selectedStudentIdsForBulk.length})`
                              : `⚡ Direct WhatsApp to ${targetStudent?.fullName || 'Student'} (Finish Queue)`}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </div>
                        <span className="text-[10px] text-emerald-100 font-normal">
                          {whatsAppMode === 'direct'
                            ? 'सीधे WhatsApp ऐप में खुलेगा • कोई ब्राउज़र री-डायरेक्ट नहीं'
                            : 'WhatsApp वेब लिंक खुलेगा'}
                        </span>
                        {nextStudent && currentBulkIndex < selectedStudentIdsForBulk.length - 1 && (
                          <span className="text-[10px] text-emerald-200 font-normal">
                            Next: {nextStudent.fullName} (₹{getStudentDueAmount(nextStudent.id).toLocaleString('en-IN')})
                          </span>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleSendCurrentOnly}
                          className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Send to {targetStudent?.fullName || 'Current'} (Stay Here)</span>
                        </button>

                        {currentBulkIndex < selectedStudentIdsForBulk.length - 1 && (
                          <button
                            type="button"
                            onClick={handleNextStudent}
                            className="py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Skip to next student without sending"
                          >
                            <span>Skip ➔</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single Student Mode: Direct unblockable native link to WhatsApp */
                    <div className="space-y-2">
                      {cleanPhone ? (
                        <button
                          type="button"
                          onClick={handleSendCurrentOnly}
                          className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm shadow-md transition flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-98 border border-emerald-400/40 ${
                            sentStudentIds.has(targetStudent?.id || '')
                              ? 'bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 hover:from-teal-600 hover:to-emerald-600'
                              : 'bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 fill-current text-amber-300" />
                            <span>
                              {sentStudentIds.has(targetStudent?.id || '')
                                ? `✓ WhatsApp Sent! Tap to Resend to ${targetStudent?.fullName || 'Student'}`
                                : `⚡ Send Direct WhatsApp to ${targetStudent?.fullName || 'Student'}`}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          </div>
                          <span className="text-[10px] text-emerald-100 font-normal">
                            {whatsAppMode === 'direct'
                              ? 'सीधे फ़ोन के WhatsApp ऐप में खुलेगा • No "Continue to WhatsApp" page'
                              : 'ब्राउज़र लिंक के ज़रिए खुलेगा'}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendCurrentOnly}
                          className="w-full py-3 px-4 rounded-xl bg-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <AlertCircle className="w-4 h-4 text-amber-700" />
                          <span>Guardian Phone Missing - Click to review</span>
                        </button>
                      )}

                      {allDefaulters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = filteredDefaulters.map((d) => d.student.id);
                            setSelectedStudentIdsForBulk(allIds);
                            setActiveMode('bulk');
                            setCurrentBulkIndex(0);
                            if (allIds.length > 0) setSelectedStudentId(allIds[0]);
                            setToastMessage(`Switched to Bulk Queue for all ${allIds.length} defaulters.`);
                          }}
                          className="w-full py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Switch to Bulk Queue (All {filteredDefaulters.length} Defaulters)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : activeChannel === 'sms' && selectedStudentIdsForBulk.length > 1 ? (
                /* One-Click SMS Hero for Multiple Selected Students */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSendGroupSms}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-blue-700/20 transition flex flex-col items-center justify-center gap-1 cursor-pointer border border-blue-400/40"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>⚡ Send SMS to All {allSelectedPhones.length} Selected Students (1-Click)</span>
                    </div>
                    <span className="text-[11px] text-blue-100 font-normal">
                      Opens SMS app with all {allSelectedPhones.length} parents' numbers & fee reminder filled at once!
                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500">Or send one-by-one:</span>
                    <button
                      type="button"
                      onClick={handleSendAndNext}
                      className="py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {currentBulkIndex < selectedStudentIdsForBulk.length - 1
                          ? `Send to ${targetStudent?.fullName || 'Current'} & Next (${currentBulkIndex + 1}/${selectedStudentIdsForBulk.length})`
                          : `Send to ${targetStudent?.fullName || 'Student'} (Finish)`}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Blue SMS Dispatch Button (Single Student) */
                <button
                  type="button"
                  onClick={handleSendCurrentOnly}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 active:scale-98 text-white font-black text-sm shadow-md transition flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-200" />
                    <span>
                      {sentStudentIds.has(targetStudent?.id || '')
                        ? `✓ SMS Sent! Tap to Resend to ${targetStudent?.fullName || 'Student'}`
                        : `Send SMS to ${targetStudent?.fullName || 'Student'}`}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </div>
                </button>
              )}

              {/* Quick Stepper Controls */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={currentBulkIndex === 0}
                  className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Previous student in queue"
                >
                  <span>◀ Prev</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendCurrentOnly}
                  className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Send to this student without advancing"
                >
                  <span>Stay & Send</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={currentBulkIndex >= selectedStudentIdsForBulk.length - 1}
                  className="py-1.5 px-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Skip to next student"
                >
                  <span>Skip ➔</span>
                </button>
              </div>

              {/* Direct Unblockable Fallback Links */}
              <div className="pt-2 text-center border-t border-slate-100 space-y-1">
                {activeChannel === 'whatsapp' ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">Quick Links:</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppAppUrl, 'whatsapp', undefined, 'direct-app');
                      }}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md border border-emerald-300 inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Open directly in phone's WhatsApp app without landing page"
                    >
                      <Zap className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                      <span>⚡ Direct WhatsApp App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppUrl, 'whatsapp', undefined, 'browser');
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Universal Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppWebUrl, 'whatsapp', undefined, 'browser');
                      }}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Laptop className="w-3 h-3" />
                      <span>WhatsApp Web (PC)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText();
                        if (targetStudent) setSentStudentIds((prev) => new Set([...prev, targetStudent.id]));
                        dispatchMessageSafely(whatsAppShortUrl, 'whatsapp', undefined, 'browser');
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>wa.me Link</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => dispatchSafeMessage(smsUrl, 'sms', finalSmsMessage)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Launch Phone SMS App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open('https://messages.google.com/web', '_blank', 'noopener,noreferrer')}
                      className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-slate-300 inline-flex items-center gap-1 transition cursor-pointer"
                      title="For PC / Laptop: Open Google Messages Web"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Messages Web (PC)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Utility Buttons (Copy, Link, Direct Call) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    hasCopiedText
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedText ? 'Copied Text!' : `Copy ${activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Text`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    hasCopiedLink
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{hasCopiedLink ? 'Copied URL!' : 'Copy Direct URL'}</span>
                </button>
              </div>

              {/* Bulk Blast Copy All Option */}
              {activeMode === 'bulk' && selectedStudentIdsForBulk.length > 1 && (
                <button
                  type="button"
                  onClick={handleCopyAllMessages}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    hasCopiedAllMessages
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {hasCopiedAllMessages ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                  <span>
                    {hasCopiedAllMessages
                      ? 'Copied All Defaulters Messages!'
                      : `Copy Complete Blast Text for All ${selectedStudentIdsForBulk.length} Students`}
                  </span>
                </button>
              )}

              {/* Direct Phone Call */}
              {targetStudent?.guardianPhone && (
                <a
                  href={`tel:${targetStudent.guardianPhone}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-900" />
                  <span>Call Guardian ({targetStudent.guardianPhone})</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex flex-wrap justify-between items-center gap-3 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              {settings.schoolName} Fee Notification Hub • UPI: <b className="font-mono text-slate-800">{schoolUpiId}</b>
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline">
              Selected: <b>{selectedStudentIdsForBulk.length} students</b> (₹{totalSelectedDues.toLocaleString('en-IN')})
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            Close Reminder Hub
          </button>
        </div>
      </div>
    </div>
  );
};
