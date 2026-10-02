import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  AlertCircle,
  IndianRupee,
  Printer,
  Calendar,
  CreditCard,
  Shield,
  FileText,
  CheckCircle2,
  Phone,
  Undo2,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceFineStatus } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';

interface AttendanceFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  targetRecords?: AttendanceRecord[]; // Specific records, or defaults to all student absent records
  selectedDate?: string;
}

export const AttendanceFineModal: React.FC<AttendanceFineModalProps> = ({
  isOpen,
  onClose,
  student,
  targetRecords,
  selectedDate,
}) => {
  const {
    attendance,
    classes,
    settings,
    markAttendanceFinePaid,
    waiveAttendanceFine,
    resetAttendanceFineToUnpaid,
  } = useSchool();

  const [activeAction, setActiveAction] = useState<'pay' | 'waive' | 'details'>('pay');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Fee Receipt'>('Cash');
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState<string>(
    `AF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [customFineRate, setCustomFineRate] = useState<number>(settings.absentFinePerDay ?? 5);
  const [waiverReason, setWaiverReason] = useState<string>('Medical Certificate Submitted');
  const [customWaiverNotes, setCustomWaiverNotes] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('Attendance fine collected at counter');
  const [isPrintReceipt, setIsPrintReceipt] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Find student's class
  const studentClass = useMemo(() => {
    if (!student) return null;
    return classes.find((c) => c.id === student.classId);
  }, [classes, student]);

  // Determine relevant absent records for this student
  const studentAbsentRecords = useMemo(() => {
    if (!student) return [];
    if (targetRecords && targetRecords.length > 0) {
      return targetRecords;
    }
    // Otherwise gather all absent records for this student
    return attendance
      .filter((a) => a.type === 'student' && a.targetId === student.id && a.status === 'Absent')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, student, targetRecords]);

  // Selected individual record IDs to pay/waive (defaults to all unpaid)
  const unpaidRecordIds = useMemo(() => {
    return studentAbsentRecords
      .filter((r) => r.fineStatus !== 'Paid' && r.fineStatus !== 'Waived')
      .map((r) => r.id);
  }, [studentAbsentRecords]);

  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Update selected IDs when modal opens or studentAbsentRecords changes
  React.useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        const match = studentAbsentRecords.find((r) => r.date === selectedDate);
        if (match) {
          setSelectedRecordIds([match.id]);
          return;
        }
      }
      setSelectedRecordIds(unpaidRecordIds.length > 0 ? unpaidRecordIds : studentAbsentRecords.map((r) => r.id));
    }
  }, [isOpen, selectedDate, studentAbsentRecords, unpaidRecordIds]);

  if (!isOpen || !student) return null;

  const fineRate = customFineRate;
  const selectedCount = selectedRecordIds.length;
  const totalFineToCollect = selectedCount * fineRate;

  // Calculation summaries for all student records
  const totalAbsentCount = studentAbsentRecords.length;
  const paidCount = studentAbsentRecords.filter((r) => r.fineStatus === 'Paid').length;
  const waivedCount = studentAbsentRecords.filter((r) => r.fineStatus === 'Waived').length;
  const unpaidCount = totalAbsentCount - paidCount - waivedCount;

  const totalIncurred = totalAbsentCount * fineRate;
  const totalPaid = studentAbsentRecords
    .filter((r) => r.fineStatus === 'Paid')
    .reduce((acc, r) => acc + (r.fineAmount || fineRate), 0);
  const totalPendingDue = unpaidCount * fineRate;

  const handleToggleRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnpaid = () => {
    setSelectedRecordIds(unpaidRecordIds);
  };

  const handleConfirmPayment = () => {
    if (selectedRecordIds.length === 0) {
      setNotificationMsg({ text: 'Please select at least one absent record to mark as paid.', type: 'error' });
      return;
    }

    markAttendanceFinePaid(selectedRecordIds, {
      paidDate,
      paymentMode,
      receiptNo,
      fineAmount: fineRate,
    });

    setNotificationMsg({
      text: `Successfully collected ₹${totalFineToCollect} for ${selectedCount} absent day(s)! Receipt #${receiptNo}`,
      type: 'success',
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleConfirmWaiver = () => {
    if (selectedRecordIds.length === 0) {
      setNotificationMsg({ text: 'Please select at least one absent record to waive.', type: 'error' });
      return;
    }

    const fullReason = customWaiverNotes.trim()
      ? `${waiverReason} (${customWaiverNotes.trim()})`
      : waiverReason;

    waiveAttendanceFine(selectedRecordIds, fullReason);

    setNotificationMsg({
      text: `Successfully waived fine for ${selectedCount} absent day(s)!`,
      type: 'success',
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleResetToUnpaid = (id: string) => {
    resetAttendanceFineToUnpaid([id]);
    setNotificationMsg({ text: 'Record reset to unpaid status.', type: 'success' });
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-md">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Attendance Fine Collection
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  अनुपस्थिति अर्थदंड
                </span>
              </div>
              <p className="text-xs text-blue-200">
                {student.fullName} • Class {studentClass?.name || student.classId} (Sec {student.section}) • Roll #{student.rollNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Quick KPI Bar */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Absents</span>
            <span className="text-sm font-black text-slate-800">{totalAbsentCount} Days</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-rose-200 bg-rose-50/40">
            <span className="text-[10px] font-bold text-rose-600 uppercase block">Pending Due</span>
            <span className="text-sm font-black text-rose-700">₹{totalPendingDue} ({unpaidCount})</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-emerald-200 bg-emerald-50/40">
            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Fine Paid</span>
            <span className="text-sm font-black text-emerald-700">₹{totalPaid} ({paidCount})</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Waived</span>
            <span className="text-sm font-black text-slate-700">{waivedCount} Days</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {notificationMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* Action Tabs: Pay / Waive / History */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveAction('pay')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeAction === 'pay'
                ? 'border-blue-900 text-blue-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Mark as Paid (जुर्माना जमा)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveAction('waive')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeAction === 'waive'
                ? 'border-amber-600 text-amber-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Waive Fine (माफ करें)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveAction('details')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeAction === 'details'
                ? 'border-slate-800 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Absent Dates & History</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {/* Select Absent Dates to apply action */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>Select Absent Date(s) to Process:</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({selectedCount} of {studentAbsentRecords.length} selected)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllUnpaid}
                  className="text-[11px] text-blue-700 hover:underline font-bold"
                >
                  Select All Unpaid ({unpaidRecordIds.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds([])}
                  className="text-[11px] text-slate-500 hover:underline font-bold"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {studentAbsentRecords.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-bold text-slate-700">No Absent Records Found</p>
                <p className="text-[11px]">This student has not been marked absent on any official session dates.</p>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {studentAbsentRecords.map((r) => {
                  const isSelected = selectedRecordIds.includes(r.id);
                  const isPaid = r.fineStatus === 'Paid';
                  const isWaived = r.fineStatus === 'Waived';
                  const isUnpaid = !isPaid && !isWaived;

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleToggleRecord(r.id)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-800"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {formatDateToDDMMYYYY(r.date)}
                            </span>
                            {r.remarks && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                ({r.remarks})
                              </span>
                            )}
                          </div>
                          {isPaid && (
                            <span className="text-[10px] text-emerald-700">
                              Receipt: {r.fineReceiptNo || 'N/A'} • {r.finePaymentMode || 'Cash'} • Paid on {formatDateToDDMMYYYY(r.finePaidDate || r.date)}
                            </span>
                          )}
                          {isWaived && (
                            <span className="text-[10px] text-slate-500">
                              Reason: {r.fineWaivedReason || 'Waived by school'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-slate-700">
                          ₹{r.fineAmount || fineRate}
                        </span>
                        {isPaid && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Paid ✓
                          </span>
                        )}
                        {isWaived && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                            Waived
                          </span>
                        )}
                        {isUnpaid && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            Unpaid
                          </span>
                        )}

                        {/* Reset button if already paid or waived */}
                        {(isPaid || isWaived) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetToUnpaid(r.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Reset to Unpaid"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Action Specific Controls */}
          {activeAction === 'pay' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Fine Rate per Day */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fine Rate / Day (रु प्रति दिन)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={customFineRate}
                      onChange={(e) => setCustomFineRate(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Payment Date (जमा तिथि)
                  </label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Receipt # (रसीद संख्या)
                  </label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payment Mode */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Payment Mode (भुगतान का माध्यम)
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white"
                  >
                    <option value="Cash">Cash (नकद)</option>
                    <option value="UPI">UPI / QR Code (GooglePay / PhonePe / Paytm)</option>
                    <option value="Fee Receipt">Added to Monthly Fee Receipt</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Remarks / Notes (विवरण)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Paid at school cash counter"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-blue-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-200 block">Total Fine Amount To Collect:</span>
                  <span className="text-xs text-blue-300">
                    {selectedCount} absent day(s) × ₹{fineRate} / day
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono text-amber-300">
                    ₹{totalFineToCollect}
                  </span>
                  <span className="text-[10px] text-blue-200 block">
                    Mode: {paymentMode}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeAction === 'waive' && (
            <div className="space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <div>
                <label className="font-bold text-amber-950 block mb-1">
                  Reason for Fine Waiver (जुर्माना माफी का कारण)
                </label>
                <select
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 font-bold text-xs bg-white text-slate-800"
                >
                  <option value="Medical Certificate Submitted">Medical Certificate Submitted (चिकित्सा प्रमाण पत्र प्रस्तुत)</option>
                  <option value="Principal / Authority Discretion">Principal Discretion (प्रधानाचार्य द्वारा विशेष छूट)</option>
                  <option value="Pre-approved Sick Leave">Pre-approved Sick Leave (पूर्व स्वीकृत बीमारी अवकाश)</option>
                  <option value="Family Bereavement / Emergency">Family Emergency (पारिवारिक आपातकाल)</option>
                  <option value="Poor Financial Condition">Concession / Poor Financial Condition (आर्थिक छूट)</option>
                  <option value="Other Legitimate Reason">Other (अन्य उचित कारण)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-amber-950 block mb-1">
                  Additional Notes (वैकल्पिक टिप्पणी)
                </label>
                <textarea
                  rows={2}
                  value={customWaiverNotes}
                  onChange={(e) => setCustomWaiverNotes(e.target.value)}
                  placeholder="e.g. Doctor slip checked, verified by class teacher"
                  className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                />
              </div>

              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Fine Waiver Policy:</p>
                  <p className="text-[11px] text-amber-800">
                    Waiving fines exempts {selectedCount} selected absent day(s) totaling ₹{totalFineToCollect}. No fine balance will remain pending for these dates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeAction === 'details' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-800 mb-2">Student Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Father's Name:</span>
                    <strong className="text-slate-800">{student.fatherName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contact Mobile:</span>
                    <strong className="text-slate-800">{student.mobile || student.fatherMobile || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Admission No:</span>
                    <strong className="text-slate-800 font-mono">{student.admissionNo}</strong>
                  </div>
                </div>
              </div>

              {/* Printable Fine Receipt Preview */}
              <div className="p-4 bg-white border border-slate-300 rounded-xl font-mono text-[11px] space-y-2">
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <p className="font-black text-xs text-slate-900">{settings.schoolName || 'SBSC PUBLIC SCHOOL'}</p>
                  <p className="text-[10px] text-slate-500">{settings.tagline || 'Attendance Fine Receipt'}</p>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Receipt: <strong>{receiptNo}</strong></span>
                  <span>Date: <strong>{formatDateToDDMMYYYY(paidDate)}</strong></span>
                </div>
                <div className="text-[10px]">
                  <span>Student: <strong>{student.fullName}</strong> (Cls: {studentClass?.name || student.classId})</span>
                </div>
                <div className="py-1 border-t border-b border-dashed border-slate-300 flex justify-between font-bold">
                  <span>Absent Fine ({selectedCount} days @ ₹{fineRate})</span>
                  <span>₹{totalFineToCollect}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Payment Mode: <strong>{paymentMode}</strong></span>
                  <span>Status: <strong>PAID</strong></span>
                </div>
                <div className="text-center pt-2 text-[9px] text-slate-400">
                  Printed via School Management System
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition"
          >
            Cancel (रद्द करें)
          </button>

          <div className="flex items-center gap-2">
            {activeAction === 'pay' && (
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Mark Paid (₹{totalFineToCollect} जमा करें)</span>
              </button>
            )}

            {activeAction === 'waive' && (
              <button
                type="button"
                onClick={handleConfirmWaiver}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Shield className="w-4 h-4" />
                <span>Waive Selected Fine ({selectedCount} दिन माफ करें)</span>
              </button>
            )}

            {activeAction === 'details' && (
              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-4 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-900 text-white transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Fine Slip</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
