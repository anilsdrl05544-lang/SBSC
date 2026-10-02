import React from 'react';
import { AlertTriangle, Trash2, X, Users, UserMinus } from 'lucide-react';
import { Student, ClassInfo } from '../../types/school';

interface BulkDeleteStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedStudents: Student[];
  classes: ClassInfo[];
  onRemoveStudent: (id: string) => void;
}

export const BulkDeleteStudentsModal: React.FC<BulkDeleteStudentsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedStudents,
  classes,
  onRemoveStudent,
}) => {
  if (!isOpen) return null;

  const count = selectedStudents.length;

  return (
    <div
      id="bulk-delete-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="bulk-delete-modal-card"
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-950">
                Delete {count} Selected Student{count !== 1 ? 's' : ''}
              </h3>
              <p className="text-[11px] text-red-700 font-medium">
                Batch Record Removal • Permanent Database Purge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Warning Banner */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5 leading-relaxed">
            <UserMinus className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Irreversible Database Action</span>
              Are you sure you want to permanently delete these <b>{count}</b> student record
              {count !== 1 ? 's' : ''}? Associated student attendance, exam mark entries, and fee
              ledgers will be purged from active school records.
            </div>
          </div>

          {/* List of Selected Students with Exclude Option */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-900" />
                <span>Selected Students Review ({count}):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Click ✕ to exclude any student
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {selectedStudents.map((st) => {
                const classObj = classes.find((c) => c.id === st.classId);
                return (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-red-50/40 border border-slate-200 transition text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-800 font-black flex items-center justify-center text-xs shrink-0">
                        {st.fullName.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-900 uppercase truncate">
                          {st.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                          <span>Adm: {st.admissionNo}</span>
                          <span>•</span>
                          <span>Roll: #{st.rollNo}</span>
                          <span>•</span>
                          <span className="text-slate-700 font-semibold font-sans">
                            {classObj?.name || st.classId}-{st.section}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveStudent(st.id)}
                      title="Exclude from deletion"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {count} student{count !== 1 ? 's' : ''} queued
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={count === 0}
              onClick={onConfirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-red-500/20 transition cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {count} Student{count !== 1 ? 's' : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
