import React from 'react';
import { SalaryRecord, Teacher } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface SalarySlipPdfProps {
  salaryRecord: SalaryRecord;
}

export const SalarySlipPdf: React.FC<SalarySlipPdfProps> = ({ salaryRecord }) => {
  const { teachers, settings } = useSchool();
  const teacher = teachers.find((t) => t.empId === salaryRecord.empId);

  return (
    <div className="bg-white p-6 max-w-[800px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="CONFIDENTIAL STAFF SALARY & PAYSLIP"
        subTitle={`Month: ${salaryRecord.month} ${salaryRecord.year} | Emp ID: ${salaryRecord.empId}`}
        badge={`STATUS: ${salaryRecord.status}`}
      />

      {/* Staff Snapshot */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-xs">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Employee Name:</span>
            <span className="font-bold text-blue-950 uppercase">{salaryRecord.teacherName}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Employee ID:</span>
            <span className="font-mono font-bold text-slate-800">{salaryRecord.empId}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Designation:</span>
            <span className="font-medium text-slate-800">{salaryRecord.designation}</span>
          </div>
        </div>
        <div className="space-y-1 border-l border-slate-200 pl-4">
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Pay Period:</span>
            <span className="font-bold text-slate-900">{salaryRecord.month} {salaryRecord.year}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Payment Mode:</span>
            <span className="font-semibold text-emerald-800">{salaryRecord.paymentMode || 'Bank Transfer'}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Transaction Ref:</span>
            <span className="font-mono text-[10px] text-slate-700">{salaryRecord.transactionRef || 'NEFT-2025-08-31'}</span>
          </div>
        </div>
      </div>

      {/* Earnings vs Deductions Table */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Earnings */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-blue-950 text-white px-3 py-1 font-bold text-[11px] uppercase">
            EARNINGS / ALLOWANCES
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 pl-3 font-medium">Basic Pay Salary</td>
                <td className="p-2 text-right font-bold text-slate-900">
                  {settings.currencySymbol} {salaryRecord.basicPay.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 pl-3 font-medium">Dearness & Grade Allowance (DA)</td>
                <td className="p-2 text-right font-bold text-slate-900">
                  {settings.currencySymbol} {(salaryRecord.allowances * 0.6).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 pl-3 font-medium">House Rent Allowance (HRA) & Special</td>
                <td className="p-2 text-right font-bold text-slate-900">
                  {settings.currencySymbol} {(salaryRecord.allowances * 0.4).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="bg-slate-100 font-bold text-blue-950">
                <td className="p-2 pl-3 uppercase">Gross Earnings:</td>
                <td className="p-2 text-right">
                  {settings.currencySymbol} {(salaryRecord.basicPay + salaryRecord.allowances).toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase">
            DEDUCTIONS
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-2 pl-3 font-medium">Provident Fund (EPF / Staff Contribution)</td>
                <td className="p-2 text-right font-bold text-slate-900">
                  {settings.currencySymbol} {(salaryRecord.deductions * 0.7).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="p-2 pl-3 font-medium">Professional Tax / TDS Deduction</td>
                <td className="p-2 text-right font-bold text-slate-900">
                  {settings.currencySymbol} {(salaryRecord.deductions * 0.3).toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-2 pl-3 font-medium">Other Adjustments / Leaves</td>
                <td className="p-2 text-right text-slate-400 font-mono">₹0</td>
              </tr>
              <tr className="bg-slate-100 font-bold text-red-700">
                <td className="p-2 pl-3 uppercase">Total Deductions:</td>
                <td className="p-2 text-right">
                  {settings.currencySymbol} {salaryRecord.deductions.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Salary Payable Banner */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded p-4 flex justify-between items-center mb-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase block">NET SALARY CREDITED</span>
          <span className="text-2xl font-extrabold text-emerald-950">
            {settings.currencySymbol} {salaryRecord.netSalary.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-emerald-700 mt-0.5">Amount credited directly to staff bank account.</p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-full font-bold text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>SALARY DISBURSED</span>
        </div>
      </div>

      <ReportFooter />
    </div>
  );
};
