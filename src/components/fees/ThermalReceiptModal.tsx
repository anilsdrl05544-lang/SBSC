import React, { useState, useEffect } from 'react';
import { FeePayment } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import { FeeReceiptThermal } from '../reports/templates/FeeReceiptThermal';
import {
  printThermalReceiptById,
  generateThermalPlainText,
  printViaRawBt,
  printViaWebBluetooth,
  printViaWebSerial,
  openThermalPrintWindow,
  directBodyPrintThermal,
  exportThermalSlipAsImage,
} from '../../services/thermalPrintService';
import { exportElementToPdf } from '../../services/pdfService';
import {
  X,
  Printer,
  Copy,
  Download,
  Check,
  Smartphone,
  FileText,
  ZoomIn,
  ZoomOut,
  Info,
  Bluetooth,
  Cable,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import {
  formatFeeReceiptWhatsAppMessage,
  generateFeeReceiptWhatsAppUrl,
  dispatchSafeMessage,
} from '../../services/whatsappService';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: FeePayment | null;
  onSwitchToA4?: (payment: FeePayment) => void;
  autoPrint?: boolean;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSwitchToA4,
  autoPrint = false,
}) => {
  const { students, classes, settings } = useSchool();
  // Default to 58mm for TVS MP-280 Lite mobile printer (remember in localStorage)
  const [paperWidth, setPaperWidth] = useState<80 | 58>(() => {
    const saved = localStorage.getItem('sbsc_thermal_paper_width');
    return saved === '80' ? 80 : 58;
  });
  const [copyType, setCopyType] = useState<'STUDENT COPY' | 'OFFICE COPY' | 'BOTH'>('STUDENT COPY');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopyingText, setIsCopyingText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [isSerialPrinting, setIsSerialPrinting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [zoom, setZoom] = useState(100);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const student = payment ? students.find((s) => s.id === payment.studentId) : null;
  const classInfo = payment ? classes.find((c) => c.id === payment.classId) : null;

  const handleSetWidth = (width: 80 | 58) => {
    setPaperWidth(width);
    localStorage.setItem('sbsc_thermal_paper_width', String(width));
  };

  // Direct print to Thermal Printer (with intelligent multi-stage fallback)
  const handlePrintThermal = async () => {
    setIsPrinting(true);
    setStatusMessage({ text: 'Sending receipt to printer spooler...', type: 'info' });
    try {
      const res = await printThermalReceiptById('thermal-receipt-printable-slip', paperWidth);
      if (res.success) {
        setStatusMessage({
          text: 'Print dialog opened! Please select TVS MP-280 or Thermal Printer.',
          type: 'success',
        });
      } else {
        // Fallback directly
        const fallbackRes = directBodyPrintThermal('thermal-receipt-printable-slip', paperWidth);
        if (fallbackRes.success) {
          setStatusMessage({
            text: 'Triggered direct system print dialog.',
            type: 'info',
          });
        } else {
          setStatusMessage({
            text: 'Print blocked by browser. Click "Open in New Window" to print.',
            type: 'warning',
          });
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        text: 'Printer error. Try "Open in New Window" or "USB Cable".',
        type: 'error',
      });
    } finally {
      setIsPrinting(false);
      setTimeout(() => {
        setStatusMessage((prev) => (prev?.type === 'info' ? null : prev));
      }, 7000);
    }
  };

  // Open in standalone print window / new tab (bypasses iframe restrictions)
  const handleOpenPrintWindow = () => {
    const success = openThermalPrintWindow('thermal-receipt-printable-slip', paperWidth);
    if (success) {
      setStatusMessage({
        text: 'Opened in dedicated print window.',
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: 'Pop-up was blocked. Please allow popups or use "Print TVS MP-280".',
        type: 'warning',
      });
    }
  };

  // Auto-trigger print when opened with autoPrint=true
  useEffect(() => {
    if (isOpen && payment && autoPrint) {
      const timer = setTimeout(() => {
        handlePrintThermal();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, payment, autoPrint]);

  if (!isOpen || !payment) return null;

  // Print via USB Serial Cable (for TVS MP-280 Lite on PC/Laptop)
  const handleUsbSerialPrint = async () => {
    setIsSerialPrinting(true);
    setStatusMessage({ text: 'Connecting to USB Serial Printer (TVS MP-280)...', type: 'info' });
    const rawText = generateThermalPlainText(
      payment,
      student,
      classInfo,
      settings,
      copyType === 'BOTH' ? 'STUDENT COPY' : copyType,
      paperWidth
    );

    const res = await printViaWebSerial(rawText);
    setStatusMessage({
      text: res.message,
      type: res.success ? 'success' : 'warning',
    });
    setIsSerialPrinting(false);
  };

  // Print via Android RawBT Mobile App
  const handleRawBtPrint = () => {
    const rawText = generateThermalPlainText(
      payment,
      student,
      classInfo,
      settings,
      copyType === 'BOTH' ? 'STUDENT COPY' : copyType,
      paperWidth
    );
    const ok = printViaRawBt(rawText);
    if (ok) {
      setStatusMessage({ text: 'Opening RawBT Mobile Print App...', type: 'info' });
    }
  };

  // Print via Web Bluetooth (for TVS MP-280 Lite)
  const handleBluetoothPrint = async () => {
    setIsBtPrinting(true);
    setStatusMessage({ text: 'Searching for TVS MP-280 Lite via Bluetooth...', type: 'info' });
    const rawText = generateThermalPlainText(
      payment,
      student,
      classInfo,
      settings,
      copyType === 'BOTH' ? 'STUDENT COPY' : copyType,
      paperWidth
    );

    const res = await printViaWebBluetooth(rawText);
    setStatusMessage({
      text: res.message,
      type: res.success ? 'success' : 'warning',
    });
    setIsBtPrinting(false);
  };

  // Copy Plain Text for ESC/POS or Bluetooth Mobile Thermal Printers
  const handleCopyRawText = () => {
    const rawText = generateThermalPlainText(
      payment,
      student,
      classInfo,
      settings,
      copyType === 'BOTH' ? 'STUDENT COPY' : copyType,
      paperWidth
    );

    navigator.clipboard.writeText(rawText).then(() => {
      setIsCopyingText(true);
      setStatusMessage({ text: 'ESC/POS text copied to clipboard!', type: 'success' });
      setTimeout(() => setIsCopyingText(false), 2500);
    });
  };

  // Save receipt as high-res PNG image
  const handleSaveImage = async () => {
    setIsSavingImage(true);
    try {
      const ok = await exportThermalSlipAsImage(
        'thermal-receipt-printable-slip',
        `Receipt-${payment.receiptNo}-${payment.studentName}`
      );
      if (ok) {
        setStatusMessage({ text: 'Receipt image downloaded successfully!', type: 'success' });
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await exportElementToPdf(
        'thermal-receipt-printable-slip',
        `SBSC-ThermalSlip-${payment.receiptNo}.pdf`,
        'portrait'
      );
      setStatusMessage({ text: 'PDF slip downloaded!', type: 'success' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!payment) return;
    const student = students.find((s) => s.id === payment.studentId);
    const classObj = classes.find((c) => c.id === payment.classId);
    const targetPhone = student?.guardianPhone || student?.emergencyContact || '';
    if (!targetPhone) {
      alert(`No parent contact phone number found for student ${payment.studentName}.`);
      return;
    }
    const params = {
      receiptNo: payment.receiptNo,
      studentName: payment.studentName,
      admissionNo: payment.admissionNo,
      rollNo: student?.rollNo,
      className: classObj?.name || payment.classId,
      section: payment.section,
      fatherName: student?.fatherName,
      guardianPhone: targetPhone,
      amountPaid: payment.amountPaid,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.transactionRef,
      date: payment.date,
      monthsPaid: payment.monthsPaid,
      discount: payment.discount,
      fine: payment.fine,
      totalDueBefore: payment.totalDueBefore,
      balanceRemaining: payment.balanceRemaining,
      feeHeadBreakdown: payment.feeHeadBreakdown,
      schoolName: settings.schoolName,
      schoolPhone: settings.phone,
      schoolUpi: settings.schoolUpi,
    };
    const url = generateFeeReceiptWhatsAppUrl(targetPhone, params);
    const msg = formatFeeReceiptWhatsAppMessage(params);
    dispatchSafeMessage(url, 'whatsapp', msg);
    setStatusMessage({ text: `WhatsApp receipt sent to ${targetPhone}!`, type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Toolbar */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm sm:text-base">
                  POS Thermal Fee Receipt
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  {paperWidth === 58 ? 'TVS MP-280 Lite (58mm)' : '80mm POS Roll'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Receipt #{payment.receiptNo} • {payment.studentName} ({payment.admissionNo})
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Paper Width Selector */}
            <div className="flex items-center bg-slate-700/70 p-1 rounded-xl border border-slate-600 text-xs">
              <button
                onClick={() => handleSetWidth(58)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 cursor-pointer ${
                  paperWidth === 58
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="TVS MP-280 Lite / 2-inch Bluetooth mobile thermal printer roll (58mm)"
              >
                <span>TVS MP-280 (58mm 2")</span>
              </button>
              <button
                onClick={() => handleSetWidth(80)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                  paperWidth === 80
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Standard 3-inch POS printer roll (80mm)"
              >
                80mm (3")
              </button>
            </div>

            {/* Copy Type Selector */}
            <div className="hidden sm:flex items-center bg-slate-700/70 p-1 rounded-xl border border-slate-600 text-xs">
              <button
                onClick={() => setCopyType('STUDENT COPY')}
                className={`px-2 py-1 rounded-lg font-medium transition text-xs cursor-pointer ${
                  copyType === 'STUDENT COPY'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setCopyType('OFFICE COPY')}
                className={`px-2 py-1 rounded-lg font-medium transition text-xs cursor-pointer ${
                  copyType === 'OFFICE COPY'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Office
              </button>
              <button
                onClick={() => setCopyType('BOTH')}
                className={`px-2 py-1 rounded-lg font-medium transition text-xs cursor-pointer ${
                  copyType === 'BOTH'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Continuous roll with cut line between Student and Office copies"
              >
                Both Copies
              </button>
            </div>

            {/* Primary Print Button */}
            <button
              onClick={handlePrintThermal}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 ring-2 ring-emerald-400/40"
              title="Send to TVS MP-280 Lite / System Print Spooler"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Opening...' : paperWidth === 58 ? 'Print TVS MP-280' : 'Print Thermal'}</span>
            </button>

            {/* WhatsApp Send Button */}
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer border border-emerald-500/40"
              title="Send Fee Receipt & Remaining Due Balance to Parent via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
              <span>WhatsApp</span>
            </button>

            {/* Dedicated Print Window (Bypasses iframe sandboxes) */}
            <button
              onClick={handleOpenPrintWindow}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-white font-semibold text-xs transition cursor-pointer border border-emerald-500/30"
              title="Open in a standalone clean print window (best if print dialog doesn't appear in preview)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Window</span>
            </button>

            {/* USB Serial Cable Print */}
            <button
              onClick={handleUsbSerialPrint}
              disabled={isSerialPrinting}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Direct print to TVS MP-280 via USB Cable (Chrome / Edge on PC)"
            >
              <Cable className="w-3.5 h-3.5 text-amber-200" />
              <span>{isSerialPrinting ? 'Connecting...' : 'USB Cable'}</span>
            </button>

            {/* Bluetooth Direct Print */}
            <button
              onClick={handleBluetoothPrint}
              disabled={isBtPrinting}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Direct Bluetooth connect & print to TVS MP-280 Lite"
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-200" />
              <span>{isBtPrinting ? 'Connecting...' : 'Bluetooth'}</span>
            </button>

            {/* RawBT App Print */}
            <button
              onClick={handleRawBtPrint}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="One-tap Print via RawBT Android App for TVS MP-280 Lite"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden sm:inline">RawBT</span>
            </button>

            {/* Save Image (PNG) */}
            <button
              onClick={handleSaveImage}
              disabled={isSavingImage}
              className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition cursor-pointer"
              title="Download as PNG Image (for WhatsApp / Sharing)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition cursor-pointer"
              title="Download Thermal Slip PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Troubleshooting Help */}
            <button
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                showTroubleshoot
                  ? 'bg-amber-500 text-slate-900 font-bold'
                  : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
              }`}
              title="Printer troubleshooting guide (प्रिंटर नहीं चल रहा?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Switch to A4 format */}
            {onSwitchToA4 && (
              <button
                onClick={() => {
                  onClose();
                  onSwitchToA4(payment);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-xs transition cursor-pointer"
                title="Switch to Full A4 3-Copy Format"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">A4 Sheet</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            className={`border-b px-4 py-2 text-xs flex items-center justify-between transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
                : statusMessage.type === 'warning'
                ? 'bg-amber-900/90 border-amber-700 text-amber-100'
                : statusMessage.type === 'error'
                ? 'bg-red-900/90 border-red-700 text-red-100'
                : 'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : statusMessage.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-300 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-300 hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Informative Help Banner for Preview iFrame */}
        {isInIframe && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 text-[11px] text-amber-200/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Preview Tip:</strong> यदि इस प्रीव्यू विंडो में प्रिंटर डायलॉग न खुले, तो ऊपर दिए <strong>"New Window"</strong> बटन को दबाएं या ऐप को नए टैब में खोलें।
              </span>
            </div>
            <button
              onClick={handleOpenPrintWindow}
              className="underline text-amber-300 hover:text-white font-bold shrink-0 cursor-pointer"
            >
              Open in New Window
            </button>
          </div>
        )}

        {/* Troubleshooting Accordion */}
        {showTroubleshoot && (
          <div className="bg-slate-800/95 border-b border-amber-500/40 p-4 text-xs text-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>TVS MP-280 Lite प्रिंटर ट्रबलशूटिंग गाइड (Quick Solutions)</span>
              </h4>
              <button
                onClick={() => setShowTroubleshoot(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                बंद करें ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-[11px]">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <div className="font-bold text-emerald-400 mb-1">1. कागज़ उल्टा तो नहीं?</div>
                <p className="text-slate-300 leading-relaxed">
                  थर्मल रोल में केवल एक तरफ कोटिंग होती है। यदि प्रिंटर सिर्फ खाली सादा कागज़ निकाल रहा है, तो <strong>रोल को निकाल कर पलटें</strong> (Thermal coated side printhead की तरफ होना चाहिए)।
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <div className="font-bold text-blue-400 mb-1">2. प्रिंट डायलॉग सेटिंग्स (PC/Laptop)</div>
                <p className="text-slate-300 leading-relaxed">
                  प्रिंट डायलॉग में Destination: <strong>TVS MP-280</strong> चुनें। Paper Size: <strong>58mm</strong> या Roll Paper चुनें। Margins: <strong>None</strong> रखें और Headers & Footers को <strong>बंद</strong> करें।
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <div className="font-bold text-amber-400 mb-1">3. USB या Bluetooth कनेक्शन</div>
                <p className="text-slate-300 leading-relaxed">
                  • कंप्यूटर से USB जुड़ी है: ऊपर <strong>"USB Cable"</strong> दबाएं。<br />
                  • ब्लूटूथ पेयरिंग पिन: सामान्यतः <strong>0000</strong> या <strong>1234</strong> होती है。<br />
                  • मोबाइल पर: <strong>RawBT</strong> ऐप इस्तेमाल करें।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Paper Preview Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/90 flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-200"
          >
            {/* Thermal Roll Paper Simulation Container */}
            <div className="relative shadow-2xl rounded-sm">
              {/* Jagged Top Tear Effect */}
              <div
                className="h-2 w-full bg-repeat-x"
                style={{
                  background:
                    'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                  backgroundSize: '8px 8px',
                }}
              ></div>

              {/* White Thermal Receipt Body */}
              <div
                id="thermal-receipt-printable-slip"
                className="bg-white border-x border-slate-300 text-black shadow-inner"
              >
                <FeeReceiptThermal
                  payment={payment}
                  paperWidthMm={paperWidth}
                  copyType={copyType}
                  showCutLine={copyType === 'BOTH'}
                />
              </div>

              {/* Jagged Bottom Tear Effect */}
              <div
                className="h-2 w-full bg-repeat-x rotate-180"
                style={{
                  background:
                    'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                  backgroundSize: '8px 8px',
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Footer Toolbar */}
        <div className="bg-slate-800/90 border-t border-slate-700 px-4 py-2.5 text-xs text-slate-400 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px]">Ready for TVS MP-280 Lite (58mm 203 DPI)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 font-medium text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>प्रिंट नहीं हुआ? (Help)</span>
            </button>

            <button
              onClick={handleOpenPrintWindow}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition flex items-center gap-1 cursor-pointer"
              title="Open standalone print tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open in New Tab</span>
            </button>

            <button
              onClick={handleCopyRawText}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs transition flex items-center gap-1 cursor-pointer"
              title="Copy ESC/POS plain text"
            >
              {isCopyingText ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{isCopyingText ? 'Copied' : 'Text'}</span>
            </button>

            <button
              onClick={handleRawBtPrint}
              className="px-3 py-1.5 rounded-lg bg-teal-800/80 hover:bg-teal-700 text-teal-100 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-300" />
              <span>RawBT Mobile</span>
            </button>

            <button
              onClick={handleUsbSerialPrint}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-semibold text-xs transition cursor-pointer"
              title="USB Serial cable direct print"
            >
              <Cable className="w-3.5 h-3.5 text-amber-300" />
              <span>USB Cable</span>
            </button>

            <button
              onClick={handlePrintThermal}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer ring-1 ring-emerald-400/50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print TVS MP-280 ({paperWidth}mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
