import React, { useState } from 'react';
import { FeePayment } from '../../../types/school';
import { useSchool } from '../../../context/SchoolContext';
import { CheckCircle2, QrCode, Scissors, Copy, Layers, FileText, MessageSquare, Check, Phone } from 'lucide-react';
import { numberToWordsIndian } from '../../../utils/numberToWords';
import {
  formatFeeReceiptWhatsAppMessage,
  generateFeeReceiptWhatsAppUrl,
  dispatchSafeMessage,
} from '../../../services/whatsappService';

interface FeeReceiptPdfProps {
  payment: FeePayment;
  copyType?: 'STUDENT COPY' | 'SCHOOL COPY' | 'BANK COPY';
  initialLayout?: '2-copy' | 'half-page' | 'single' | '3-copy';
}

export const FeeReceiptPdf: React.FC<FeeReceiptPdfProps> = ({
  payment,
  initialLayout = '2-copy',
}) => {
  const { students, classes, settings } = useSchool();
  const [layout, setLayout] = useState<'2-copy' | 'half-page' | 'single' | '3-copy'>(initialLayout);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  const student = students.find((s) => s.id === payment.studentId);
  const classInfo = classes.find((c) => c.id === payment.classId);
  const amountInWords = numberToWordsIndian(payment.amountPaid);
  const targetPhone = student?.guardianPhone || student?.emergencyContact || '';

  const handleSendWhatsApp = () => {
    const params = {
      receiptNo: payment.receiptNo,
      studentName: payment.studentName,
      admissionNo: payment.admissionNo,
      rollNo: student?.rollNo,
      className: classInfo?.name || payment.classId,
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
    setWhatsAppSent(true);
    setTimeout(() => setWhatsAppSent(false), 4000);
  };

  // Single copy sub-component designed for exact A4 fit
  const renderReceiptVoucher = (
    copyLabel: string,
    hindiLabel: string,
    isCompact: boolean = false
  ) => {
    return (
      <div className={`bg-white border-2 border-slate-800 rounded-lg text-slate-900 font-sans print:border-black print:text-black ${
        isCompact ? 'p-3 text-[10px]' : 'p-4 sm:p-5 text-xs'
      }`}>
        {/* Header Strip */}
        <div className="border-b-2 border-slate-800 pb-2 mb-2 print:border-black">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="School Logo"
                  className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} object-contain shrink-0`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`${isCompact ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm'} rounded-full bg-slate-900 text-amber-300 font-black flex items-center justify-center shrink-0 border border-slate-700`}>
                  SBSC
                </div>
              )}
              <div>
                <h1 className={`${isCompact ? 'text-sm font-black' : 'text-base sm:text-lg font-black'} uppercase text-blue-950 print:text-black leading-tight tracking-tight`}>
                  {settings.schoolName}
                </h1>
                <p className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} font-semibold text-slate-700 print:text-black leading-snug`}>
                  {settings.address}, {settings.district} ({settings.state}) - {settings.pinCode}
                </p>
                <p className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} text-slate-600 print:text-black`}>
                  Affiliation No: {settings.affiliationNo} | Phone: {settings.phone}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`inline-block px-2.5 py-0.5 rounded font-black uppercase tracking-wider border ${
                copyLabel.includes('STUDENT')
                  ? 'bg-blue-50 text-blue-900 border-blue-400 print:bg-transparent print:border-black'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-400 print:bg-transparent print:border-black'
              } ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
                {copyLabel} • {hindiLabel}
              </span>
              <div className="mt-1 font-mono font-bold text-slate-900 print:text-black text-[10px]">
                REC: <span className="text-blue-950 print:text-black font-extrabold">{payment.receiptNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student & Receipt Meta Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-50 border border-slate-300 rounded p-2 mb-2 print:bg-transparent print:border-black">
          <div className="space-y-0.5">
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Student Name:</span>
              <span className="font-extrabold text-blue-950 uppercase print:text-black">{payment.studentName}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Admission No:</span>
              <span className="font-bold text-slate-900 print:text-black font-mono">{payment.admissionNo}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Class & Sec:</span>
              <span className="font-bold text-slate-900 print:text-black">
                {classInfo?.name || payment.classId} - Sec {payment.section} {student?.rollNumber ? `(Roll: ${student.rollNumber})` : ''}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Father's Name:</span>
              <span className="font-semibold text-slate-800 print:text-black">{student?.fatherName || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-0.5 border-l border-slate-300 pl-3 print:border-black">
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Receipt Date:</span>
              <span className="font-bold text-slate-900 print:text-black">{payment.date}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Payment Mode:</span>
              <span className="font-bold text-emerald-800 print:text-black">{payment.paymentMethod}</span>
            </div>
            {payment.transactionRef && (
              <div className="flex">
                <span className="w-24 text-slate-500 font-semibold print:text-black">Txn / Ref ID:</span>
                <span className="font-mono text-slate-800 print:text-black truncate">{payment.transactionRef}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-24 text-slate-500 font-semibold print:text-black">Months Paid:</span>
              <span className="font-bold text-blue-900 print:text-black truncate">
                {payment.monthsPaid?.join(', ') || 'Current Month'}
              </span>
            </div>
          </div>
        </div>

        {/* Fee Particulars Itemized Table */}
        <table className="w-full border-collapse border border-slate-800 mb-2 print:border-black text-[11px] leading-tight">
          <thead>
            <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-black font-bold">
              <th className="border border-slate-700 print:border-black px-2 py-1 text-center w-10">#</th>
              <th className="border border-slate-700 print:border-black px-2 py-1 text-left">Fee Particulars / Head Description</th>
              <th className="border border-slate-700 print:border-black px-2 py-1 text-right w-32">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {payment.feeHeadBreakdown.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50 print:bg-transparent'}>
                <td className="border border-slate-300 print:border-black px-2 py-1 text-center font-medium">{idx + 1}</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 font-semibold">{item.head}</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 text-right font-bold">
                  ₹{item.amount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}

            {payment.discount > 0 && (
              <tr className="text-emerald-800 print:text-black bg-emerald-50/50 print:bg-transparent">
                <td className="border border-slate-300 print:border-black px-2 py-1 text-center">-</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 font-medium">Sibling / Concession Discount</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 text-right font-bold">
                  - ₹{payment.discount.toLocaleString('en-IN')}
                </td>
              </tr>
            )}

            {payment.fine > 0 && (
              <tr className="text-amber-800 print:text-black bg-amber-50/50 print:bg-transparent">
                <td className="border border-slate-300 print:border-black px-2 py-1 text-center">+</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 font-medium">Late Deposition Surcharge / Fine</td>
                <td className="border border-slate-300 print:border-black px-2 py-1 text-right font-bold">
                  + ₹{payment.fine.toLocaleString('en-IN')}
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="bg-slate-100 print:bg-slate-100 font-black border-t-2 border-slate-800 print:border-black">
              <td colSpan={2} className="border border-slate-400 print:border-black px-2 py-1 text-right uppercase tracking-wider text-slate-800 print:text-black">
                Net Amount Received (कुल जमा):
              </td>
              <td className="border border-slate-400 print:border-black px-2 py-1 text-right text-blue-950 print:text-black text-sm font-black">
                {settings.currencySymbol} {payment.amountPaid.toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words & Balance row */}
        <div className="bg-slate-50 border border-slate-300 rounded p-2 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 print:bg-transparent print:border-black">
          <div className="text-[10px] leading-tight">
            <span className="font-bold text-slate-700 print:text-black">In Words: </span>
            <span className="font-extrabold text-blue-950 print:text-black italic">{amountInWords}</span>
          </div>
          <div className="text-[10px] shrink-0">
            <span className="font-semibold text-slate-600 print:text-black">Remaining Balance: </span>
            <span className="font-bold text-slate-900 print:text-black">
              {settings.currencySymbol} {payment.balanceRemaining.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Footer verification & signatures */}
        <div className="flex items-end justify-between pt-1 border-t border-slate-300 print:border-black">
          <div className="flex items-center gap-2">
            <div className="border border-slate-400 p-0.5 rounded bg-white print:border-black">
              <QrCode className="w-8 h-8 text-slate-800 print:text-black" />
            </div>
            <div className="text-[8px] text-slate-500 print:text-black">
              <div>Secure Digital Verification</div>
              <div className="font-mono font-bold text-slate-700 print:text-black">{payment.receiptNo}</div>
            </div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-[7px] font-bold text-slate-700 print:text-black text-center mx-auto mb-0.5">
              SCHOOL SEAL
            </div>
            <p className="text-[8px] text-slate-500 print:text-black">Verified & Stamped</p>
          </div>

          <div className="text-right">
            <div className="w-28 border-b border-slate-800 ml-auto mb-0.5 print:border-black"></div>
            <p className="text-[9px] font-bold text-slate-900 print:text-black">{payment.receivedBy || 'Accountant'}</p>
            <p className="text-[8px] text-slate-500 print:text-black">Authorized Cashier / Cash Counter</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[850px] mx-auto">
      {/* On-screen Layout Selector (Excluded from Print) */}
      <div className="no-print bg-slate-100 border border-slate-300 rounded-xl p-2.5 mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-800" />
          <span className="text-xs font-extrabold text-slate-800">
            A4 Receipt Layout:
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => setLayout('2-copy')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
              layout === '2-copy'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Prints 2 copies on 1 A4 sheet: Student Copy + Office Copy with scissors cut-line"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>2-In-1 A4 (Student + School)</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('half-page')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
              layout === 'half-page'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Half A4 page (Single copy on top half of A4 or A5 paper format)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-300" />
            <span>A4 Half Page (आधा पेज)</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('single')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
              layout === 'single'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Single full page A4 copy"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Full A4 (Single Copy)</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout('3-copy')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
              layout === '3-copy'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Triplicate counterfoils on 1 A4: Student + School + Bank/Audit"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3-In-1 A4 (Triplicate)</span>
          </button>
        </div>

        {/* WhatsApp Send Action */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!targetPhone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
              whatsAppSent
                ? 'bg-emerald-700 text-white'
                : targetPhone
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={targetPhone ? `Send Receipt via WhatsApp to ${targetPhone}` : 'No phone number for student'}
          >
            {whatsAppSent ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp Sent!</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span>Send WhatsApp</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
            Standard A4 Sheet (210 × 297 mm)
          </span>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white print:p-0 print:m-0 space-y-4">
        {layout === '2-copy' && (
          <div className="space-y-3">
            {/* Top: Student Copy */}
            {renderReceiptVoucher('STUDENT COPY', 'छात्र प्रति', true)}

            {/* Perforation Scissors Divider Line */}
            <div className="relative my-2 flex items-center justify-center">
              <div className="w-full border-t-2 border-dashed border-slate-400 print:border-black"></div>
              <div className="absolute bg-white px-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-300 rounded-full py-0.5 print:border-black print:text-black">
                <Scissors className="w-3 h-3 rotate-90" />
                <span>Cut Along This Line • ✂ कैंची से यहाँ से काटें</span>
              </div>
            </div>

            {/* Bottom: School / Office Copy */}
            {renderReceiptVoucher('SCHOOL COPY', 'कार्यालय प्रति', true)}
          </div>
        )}

        {layout === 'half-page' && (
          <div className="space-y-4">
            {/* Single Half Page / A5 Voucher */}
            {renderReceiptVoucher('OFFICIAL FEE RECEIPT (HALF A4)', 'मूल शुल्क रसीद (आधा पृष्ठ)', true)}

            {/* Half-Page Cut Guide - visible on screen and print */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="w-full border-t-2 border-dashed border-slate-400 print:border-black"></div>
              <div className="absolute bg-white px-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-300 rounded-full py-0.5 print:border-black print:text-black">
                <Scissors className="w-3 h-3 rotate-90" />
                <span>A4 Half Page Boundary (148.5 mm) • ✂ शेष निचला भाग रिक्त रहेगा</span>
              </div>
            </div>
          </div>
        )}

        {layout === 'single' && (
          <div>
            {renderReceiptVoucher('OFFICIAL FEE RECEIPT', 'मूल शुल्क रसीद', false)}
          </div>
        )}

        {layout === '3-copy' && (
          <div className="space-y-2">
            {renderReceiptVoucher('STUDENT COPY', 'छात्र प्रति', true)}
            <div className="border-t border-dashed border-slate-400 print:border-black my-1 text-center">
              <span className="text-[8px] text-slate-400">✂ - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
            </div>
            {renderReceiptVoucher('SCHOOL OFFICE COPY', 'कार्यालय प्रति', true)}
            <div className="border-t border-dashed border-slate-400 print:border-black my-1 text-center">
              <span className="text-[8px] text-slate-400">✂ - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
            </div>
            {renderReceiptVoucher('BANK / ACCOUNTS AUDIT COPY', 'लेखा प्रति', true)}
          </div>
        )}
      </div>
    </div>
  );
};
