import React from 'react';
import { FeePayment } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';

interface FeeCollectionReportPdfProps {
  startDate?: string;
  endDate?: string;
}

export const FeeCollectionReportPdf: React.FC<FeeCollectionReportPdfProps> = ({
  startDate = '2025-04-01',
  endDate = '2026-03-31',
}) => {
  const { feePayments, settings } = useSchool();

  const activePayments = feePayments.filter((p) => p.status !== 'Cancelled');
  const totalCollected = activePayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalFine = activePayments.reduce((acc, p) => acc + (p.fine || 0), 0);
  const totalDiscount = activePayments.reduce((acc, p) => acc + (p.discount || 0), 0);

  return (
    <div className="bg-white p-6 max-w-[850px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="FEE COLLECTION REGISTER & REVENUE SUMMARY"
        subTitle={`Period: ${startDate} to ${endDate} (Active Receipts: ${activePayments.length})`}
        badge={`TOTAL: ₹${totalCollected.toLocaleString('en-IN')}`}
      />

      <table className="w-full border-collapse border border-slate-400 text-left mb-4">
        <thead>
          <tr className="bg-blue-950 text-white text-[10px] font-bold">
            <th className="border border-slate-400 p-2 text-center w-8">#</th>
            <th className="border border-slate-400 p-2 w-28">Receipt No</th>
            <th className="border border-slate-400 p-2 w-20">Date</th>
            <th className="border border-slate-400 p-2">Student Name & Adm No</th>
            <th className="border border-slate-400 p-2 w-20">Class</th>
            <th className="border border-slate-400 p-2 w-24">Payment Mode</th>
            <th className="border border-slate-400 p-2 text-right w-24">Fine / Disc</th>
            <th className="border border-slate-400 p-2 text-right w-28">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          {activePayments.map((p, idx) => (
            <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-500">{idx + 1}</td>
              <td className="border border-slate-300 p-1.5 font-mono text-[10px] text-blue-900 font-semibold">{p.receiptNo}</td>
              <td className="border border-slate-300 p-1.5 text-slate-700">{p.date}</td>
              <td className="border border-slate-300 p-1.5">
                <span className="font-bold text-slate-900 uppercase block">{p.studentName}</span>
                <span className="text-[9px] text-slate-500 font-mono">{p.admissionNo}</span>
              </td>
              <td className="border border-slate-300 p-1.5 font-medium text-slate-700">Sec {p.section}</td>
              <td className="border border-slate-300 p-1.5 font-semibold text-emerald-800">{p.paymentMethod}</td>
              <td className="border border-slate-300 p-1.5 text-right text-[10px]">
                {p.fine > 0 && <span className="text-amber-700 block">+₹{p.fine}</span>}
                {p.discount > 0 && <span className="text-emerald-700 block">-₹{p.discount}</span>}
                {p.fine === 0 && p.discount === 0 && <span className="text-slate-400">-</span>}
              </td>
              <td className="border border-slate-300 p-1.5 text-right font-extrabold text-blue-950">
                {settings.currencySymbol} {p.amountPaid.toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
          {/* Summary Row */}
          <tr className="bg-slate-100 font-extrabold text-xs">
            <td colSpan={6} className="border border-slate-300 p-2 text-right uppercase">
              Consolidated Net Collection:
            </td>
            <td className="border border-slate-300 p-2 text-right text-[10px] text-slate-600">
              Fine: ₹{totalFine} | Disc: ₹{totalDiscount}
            </td>
            <td className="border border-slate-300 p-2 text-right text-emerald-800 text-sm">
              {settings.currencySymbol} {totalCollected.toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Mode breakdown */}
      <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-300 rounded p-3 text-center mb-4">
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">CASH COLLECTION</span>
          <span className="font-bold text-slate-800">
            ₹
            {activePayments
              .filter((p) => p.paymentMethod === 'Cash')
              .reduce((s, p) => s + p.amountPaid, 0)
              .toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">UPI / DIGITAL</span>
          <span className="font-bold text-slate-800">
            ₹
            {activePayments
              .filter((p) => p.paymentMethod === 'UPI')
              .reduce((s, p) => s + p.amountPaid, 0)
              .toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block">BANK TRANSFER / NEFT</span>
          <span className="font-bold text-slate-800">
            ₹
            {activePayments
              .filter((p) => p.paymentMethod === 'Net Banking' || p.paymentMethod === 'Cheque')
              .reduce((s, p) => s + p.amountPaid, 0)
              .toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-emerald-100 p-2 rounded border border-emerald-300">
          <span className="text-[10px] text-emerald-800 font-bold block">TOTAL REVENUE</span>
          <span className="font-extrabold text-emerald-950 text-sm">₹{totalCollected.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <ReportFooter />
    </div>
  );
};
