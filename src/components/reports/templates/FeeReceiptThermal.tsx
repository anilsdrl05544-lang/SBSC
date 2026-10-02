import React from 'react';
import { FeePayment } from '../../../types/school';
import { useSchool } from '../../../context/SchoolContext';
import { numberToWordsIndian } from '../../../utils/numberToWords';
import { QrCode, CheckCircle2, Scissors } from 'lucide-react';

interface FeeReceiptThermalProps {
  payment: FeePayment;
  paperWidthMm?: 80 | 58;
  copyType?: 'STUDENT COPY' | 'OFFICE COPY' | 'BOTH';
  showCutLine?: boolean;
}

const SingleThermalSlip: React.FC<{
  payment: FeePayment;
  paperWidthMm: 80 | 58;
  copyTitle: string;
  showCutLine?: boolean;
}> = ({ payment, paperWidthMm, copyTitle, showCutLine = false }) => {
  const { students, classes, settings } = useSchool();
  const student = students.find((s) => s.id === payment.studentId);
  const classInfo = classes.find((c) => c.id === payment.classId);

  const is58 = paperWidthMm === 58;
  const containerWidthClass = is58
    ? 'w-[48mm] max-w-[48mm] px-1 py-1 text-[8.5px]'
    : 'w-[72mm] max-w-[72mm] p-3 text-[10.5px]';

  // Amount in words
  const amountInWords = numberToWordsIndian(payment.amountPaid);

  return (
    <div
      className={`bg-white text-black font-mono mx-auto ${containerWidthClass} select-text leading-tight`}
      style={{
        fontFamily: "'Courier New', Courier, monospace, system-ui, sans-serif",
      }}
    >
      {/* Thermal Header */}
      <div className="text-center space-y-0.5 pb-1">
        <h2 className={`font-extrabold tracking-tight uppercase leading-snug ${is58 ? 'text-[11px]' : 'text-[13px]'}`}>
          {settings.schoolName || 'S.B.S.C. PUBLIC SCHOOL'}
        </h2>
        <p className={`font-semibold text-gray-800 ${is58 ? 'text-[7.5px]' : 'text-[9px]'}`}>
          {settings.address || 'Bairwa Nankar, Shohratgarh'}
        </p>
        <p className={`text-gray-700 ${is58 ? 'text-[7px]' : 'text-[8.5px]'}`}>
          Dist: {settings.district || 'Siddharthnagar'}, {settings.state || 'U.P.'} - {settings.pinCode || '272205'}
        </p>
        <p className={`font-bold text-gray-900 ${is58 ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
          {settings.phone ? `Ph: ${settings.phone}` : ''}
          {settings.affiliationNo ? ` | Affil: ${settings.affiliationNo}` : ''}
        </p>
        {settings.schoolCode && (
          <p className={`text-gray-600 ${is58 ? 'text-[6.5px]' : 'text-[8px]'}`}>
            School Code: {settings.schoolCode} | CBSE New Delhi
          </p>
        )}
      </div>

      {/* Slip Title Divider */}
      <div className="border-t border-b border-dashed border-black py-0.5 my-1 text-center font-bold">
        <div className={`${is58 ? 'text-[9px]' : 'text-[10.5px]'} tracking-wider uppercase`}>
          FEE PAYMENT RECEIPT
        </div>
        <div className={`${is58 ? 'text-[7.5px]' : 'text-[9px]'} uppercase tracking-widest font-black text-gray-900`}>
          [{copyTitle}]
        </div>
      </div>

      {/* Meta Grid */}
      <div className={`space-y-0.5 py-1 border-b border-dashed border-black ${is58 ? 'text-[8px]' : 'text-[9.5px]'}`}>
        <div className="flex justify-between">
          <span className="text-gray-600">Receipt No:</span>
          <span className="font-extrabold">{payment.receiptNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date & Time:</span>
          <span className="font-bold">{payment.date} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Session:</span>
          <span>{payment.academicSession || settings.academicSession || '2025-2026'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Student:</span>
          <span className={`font-black uppercase truncate ${is58 ? 'max-w-[100px]' : 'max-w-[170px]'}`}>{payment.studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Adm No / Roll:</span>
          <span className="font-bold">{payment.admissionNo} / #{student?.rollNo || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Class & Sec:</span>
          <span className="font-bold">{classInfo?.name || payment.classId} - {payment.section}</span>
        </div>
        {student?.fatherName && (
          <div className="flex justify-between">
            <span className="text-gray-600">Father:</span>
            <span className={`truncate ${is58 ? 'max-w-[95px]' : 'max-w-[160px]'}`}>{student.fatherName}</span>
          </div>
        )}
        {payment.monthsPaid && payment.monthsPaid.length > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Period:</span>
            <span className={`font-bold truncate ${is58 ? 'max-w-[95px]' : 'max-w-[160px]'}`}>{payment.monthsPaid.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Particulars Table */}
      <div className="py-1">
        <div className={`flex justify-between font-bold border-b border-black pb-0.5 uppercase ${is58 ? 'text-[8px]' : 'text-[9.5px]'}`}>
          <span>Particulars / Head</span>
          <span>Amount (₹)</span>
        </div>

        <div className={`divide-y divide-dotted divide-gray-300 my-0.5 ${is58 ? 'text-[8px]' : 'text-[9.5px]'}`}>
          {payment.feeHeadBreakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between py-0.5">
              <span className="truncate pr-1">{item.head}</span>
              <span className="font-semibold whitespace-nowrap">{item.amount.toFixed(2)}</span>
            </div>
          ))}

          {payment.discount > 0 && (
            <div className="flex justify-between py-0.5 font-bold text-gray-800">
              <span>Less: Disc / Conc.</span>
              <span>- {payment.discount.toFixed(2)}</span>
            </div>
          )}

          {payment.fine > 0 && (
            <div className="flex justify-between py-0.5 font-bold">
              <span>Add: Late Surcharge</span>
              <span>+ {payment.fine.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Net Amount Highlight */}
      <div className="border-t-2 border-b-2 border-black py-1 my-1 text-center">
        <div className={`uppercase font-bold text-gray-700 ${is58 ? 'text-[8px]' : 'text-[10px]'}`}>NET RECEIVED AMOUNT</div>
        <div className={`font-black tracking-tight ${is58 ? 'text-[13px]' : 'text-[16px]'}`}>
          ₹ {payment.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Amount in words */}
      <div className={`italic text-center text-gray-800 border-b border-dashed border-black pb-1 mb-1 leading-tight ${is58 ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
        ({amountInWords})
      </div>

      {/* Settlement & Dues Details */}
      <div className={`space-y-0.5 py-1 border-b border-dashed border-black ${is58 ? 'text-[7.5px]' : 'text-[9px]'}`}>
        <div className="flex justify-between">
          <span className="text-gray-600">Mode:</span>
          <span className="font-black uppercase">{payment.paymentMethod}</span>
        </div>
        {payment.transactionRef && (
          <div className="flex justify-between">
            <span className="text-gray-600">Txn / Ref:</span>
            <span className="font-mono">{payment.transactionRef}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Remaining Dues:</span>
          <span>₹ {payment.balanceRemaining.toFixed(2)}</span>
        </div>
        {payment.remarks && (
          <div className="text-[7px] text-gray-600 italic mt-0.5">Note: {payment.remarks}</div>
        )}
      </div>

      {/* QR Verification & Signatures */}
      <div className="py-1.5 flex items-center justify-between border-b border-dashed border-black">
        <div className="flex flex-col items-center">
          <div className={`border border-black p-0.5 flex flex-col items-center justify-center bg-white ${is58 ? 'w-10 h-10' : 'w-14 h-14'}`}>
            <QrCode className={`${is58 ? 'w-8 h-8' : 'w-10 h-10'} text-black stroke-[1.5]`} />
          </div>
          <span className="text-[6px] font-mono mt-0.5 font-bold">SCAN TO VERIFY</span>
        </div>

        <div className="text-right space-y-0.5">
          <div className={`font-semibold text-gray-700 ${is58 ? 'text-[7px]' : 'text-[8px]'}`}>SBSC PUBLIC SCHOOL</div>
          <div className={`text-gray-500 ${is58 ? 'text-[6.5px]' : 'text-[7.5px]'}`}>Official Cash Counter</div>
          <div className={`border-b border-black ml-auto ${is58 ? 'w-16 pt-2' : 'w-24 pt-4'}`}></div>
          <div className={`font-bold ${is58 ? 'text-[7.5px]' : 'text-[8.5px]'}`}>{payment.receivedBy || 'Authorized Cashier'}</div>
        </div>
      </div>

      {/* Thermal Footer Disclaimers */}
      <div className={`text-center pt-1.5 pb-1 space-y-0.5 text-gray-800 ${is58 ? 'text-[7px]' : 'text-[8px]'}`}>
        <div className="flex items-center justify-center gap-1 font-bold">
          <CheckCircle2 className="w-2.5 h-2.5 text-black" />
          <span>PAYMENT VERIFIED & RECORDED</span>
        </div>
        <p className="font-medium text-[6.5px]">• Fees once deposited are non-refundable.</p>
        <p className="text-[6.5px] font-mono text-gray-500">Generated: {new Date().toLocaleTimeString('en-IN')}</p>
      </div>

      {/* Tear / Cut Guide */}
      {showCutLine && (
        <div className="pt-2 pb-1 border-b border-dashed border-gray-400 text-center text-gray-500 text-[7px] flex items-center justify-center gap-1">
          <Scissors className="w-2.5 h-2.5" />
          <span>- - - - - [ TEAR HERE ] - - - - -</span>
        </div>
      )}
    </div>
  );
};

export const FeeReceiptThermal: React.FC<FeeReceiptThermalProps> = ({
  payment,
  paperWidthMm = 80,
  copyType = 'STUDENT COPY',
  showCutLine = false,
}) => {
  if (copyType === 'BOTH') {
    return (
      <div className="thermal-continuous-roll bg-white flex flex-col items-center">
        <SingleThermalSlip
          payment={payment}
          paperWidthMm={paperWidthMm}
          copyTitle="STUDENT COPY"
          showCutLine={true}
        />
        <SingleThermalSlip
          payment={payment}
          paperWidthMm={paperWidthMm}
          copyTitle="OFFICE / COUNTER COPY"
          showCutLine={false}
        />
      </div>
    );
  }

  return (
    <SingleThermalSlip
      payment={payment}
      paperWidthMm={paperWidthMm}
      copyTitle={copyType}
      showCutLine={showCutLine}
    />
  );
};
