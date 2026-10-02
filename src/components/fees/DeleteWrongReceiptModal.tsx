import React, { useState } from 'react';
import { FeePayment } from '../../types/school';
import { formatDateToDDMMYYYY } from '../../utils/dateUtils';
import {
  AlertTriangle,
  X,
  Trash2,
  Ban,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  BookOpen,
  Info,
  RotateCcw,
} from 'lucide-react';

interface DeleteWrongReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: FeePayment | null;
  onConfirmCancel: (receiptId: string, reason: string, remarks: string) => void;
  onConfirmPermanentDelete: (receiptId: string) => void;
}

const COMMON_DELETION_REASONS = [
  'Wrong Student selected during billing',
  'Incorrect Amount / Typo in fee head breakdown',
  'Duplicate receipt entered by mistake',
  'Wrong Fee Months / Academic Session recorded',
  'Payment Failed / Cheque Bounced / UPI Chargeback',
  'Parent / Guardian requested immediate cancellation',
  'Clerical entry error on fee collection counter',
  'Other administrative correction',
];

export const DeleteWrongReceiptModal: React.FC<DeleteWrongReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onConfirmCancel,
  onConfirmPermanentDelete,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_DELETION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [deleteMode, setDeleteMode] = useState<'void' | 'permanent'>('void');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !receipt) return null;

  const effectiveReason = selectedReason === 'Other administrative correction' && customReason.trim()
    ? customReason.trim()
    : selectedReason;

  const handleAction = () => {
    setIsProcessing(true);
    try {
      if (deleteMode === 'void') {
        onConfirmCancel(receipt.id, effectiveReason, remarks);
      } else {
        onConfirmPermanentDelete(receipt.id);
      }
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="delete-wrong-receipt-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6 transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-800/90 border border-rose-400/30 flex items-center justify-center text-amber-300 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Delete / Cancel Wrong Fee Receipt
                </h2>
                <span className="bg-rose-400/25 text-rose-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-rose-300/30">
                  {receipt.receiptNo}
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-0.5">
                Correct clerical errors, reversed transactions, or mistakenly issued fee receipts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Target Receipt Information Card */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-rose-900" />
                <span className="font-extrabold text-slate-900 text-sm uppercase">
                  {receipt.studentName}
                </span>
                <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                  {receipt.admissionNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-rose-900 block">
                  ₹ {receipt.amountPaid.toLocaleString('en-IN')}
                </span>
                {receipt.discount > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 block">
                    + ₹ {receipt.discount.toLocaleString('en-IN')} Discount
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Class & Sec:</span>
                <span className="font-bold text-slate-800">
                  {receipt.classId}-{receipt.section}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Date:</span>
                <span className="font-bold text-slate-800">
                  {formatDateToDDMMYYYY(receipt.date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Mode:</span>
                <span className="font-bold text-slate-800">{receipt.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Months Paid:</span>
                <span className="font-bold text-slate-800 truncate block">
                  {receipt.monthsPaid?.join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Reason / Opinion for Cancellation/Deletion */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>Select Reason / Opinion for Deletion *</span>
              <span className="text-[10px] text-rose-700 font-semibold">Required for Audit</span>
            </label>

            <select
              id="select-deletion-reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-rose-800 focus:bg-white transition"
            >
              {COMMON_DELETION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            {selectedReason === 'Other administrative correction' && (
              <input
                type="text"
                placeholder="Specify administrative reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-rose-800 focus:bg-white transition"
              />
            )}

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_DELETION_REASONS.slice(0, 4).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition ${
                    selectedReason === r
                      ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {r.split(' ')[0]} {r.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Remarks */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 text-[11px]">
              Audit Remarks / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Receipt was entered for wrong student roll no; cashier re-issuing for correct student."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 focus:outline-rose-800 focus:bg-white transition"
            />
          </div>

          {/* Delete Mode Selection Options */}
          <div className="space-y-2 pt-1">
            <label className="block font-bold text-slate-800 text-xs">
              Select Deletion Option:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => setDeleteMode('void')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                  deleteMode === 'void'
                    ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Ban className={`w-4 h-4 shrink-0 mt-0.5 ${deleteMode === 'void' ? 'text-amber-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Cancel & Void Receipt
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                    Recommended. Retains an official audit record with the recorded reason in "Cancelled Receipts" and restores student dues.
                  </span>
                </div>
              </div>

              <div
                onClick={() => setDeleteMode('permanent')}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                  deleteMode === 'permanent'
                    ? 'bg-rose-50/70 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Trash2 className={`w-4 h-4 shrink-0 mt-0.5 ${deleteMode === 'permanent' ? 'text-rose-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Permanently Purge & Delete
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                    Completely removes the receipt record from the database and restores student dues balance.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Financial Reversal Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Automatic Dues Reversal:</span>
              <p className="text-amber-800 leading-relaxed">
                Confirming this action will immediately restore <b>₹ {(receipt.amountPaid + (receipt.discount || 0)).toLocaleString('en-IN')}</b>
                {receipt.discount > 0 ? ` (₹${receipt.amountPaid.toLocaleString('en-IN')} collected + ₹${receipt.discount.toLocaleString('en-IN')} concession)` : ''} back to{' '}
                <b>{receipt.studentName}</b>'s pending dues balance and deduct collected amounts from the school ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition"
          >
            Keep Receipt / Cancel
          </button>

          <button
            id="btn-confirm-delete-receipt"
            type="button"
            onClick={handleAction}
            disabled={isProcessing}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer ${
              deleteMode === 'void'
                ? 'bg-amber-700 hover:bg-amber-800 shadow-amber-900/20'
                : 'bg-rose-700 hover:bg-rose-800 shadow-rose-900/20'
            }`}
          >
            {deleteMode === 'void' ? (
              <>
                <Ban className="w-4 h-4" />
                <span>Confirm Void & Cancel Receipt</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Permanent Deletion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
