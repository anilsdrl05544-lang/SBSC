import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Search, X, Users, GraduationCap, Receipt, Award, BookOpen, Scroll, FileText, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { students, teachers, classes, feePayments, exams, notices } = useSchool();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const matchedStudents = query.trim()
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query.toLowerCase()) ||
          s.admissionNo.toLowerCase().includes(query.toLowerCase()) ||
          s.rollNo.includes(query) ||
          s.fatherName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  const matchedTeachers = query.trim()
    ? teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.empId.toLowerCase().includes(query.toLowerCase()) ||
          t.subjects.some((sub) => sub.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 3)
    : [];

  const matchedClasses = query.trim()
    ? classes.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const matchedReceipts = query.trim()
    ? feePayments.filter(
        (p) =>
          p.receiptNo.toLowerCase().includes(query.toLowerCase()) ||
          p.studentName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3)
    : [];

  const handleSelect = (module: string) => {
    onNavigate(module);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-900 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search students, teachers, classes, receipts, circulars..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">
              Clear
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-4 text-xs">
          {!query.trim() ? (
            <div className="py-6 text-center text-slate-400 space-y-2">
              <p className="text-xs">Type anything to quickly find student admissions, teacher profiles, or fee receipts.</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-[11px]">
                <button onClick={() => handleSelect('students')} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium">
                  Students
                </button>
                <button onClick={() => handleSelect('fees')} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium">
                  Fee Receipts
                </button>
                <button onClick={() => handleSelect('reports')} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium">
                  A4 PDF Center
                </button>
                <button onClick={() => handleSelect('exams')} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium">
                  Exams & Marks
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Students Results */}
              {matchedStudents.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Students ({matchedStudents.length})
                  </span>
                  <div className="space-y-1">
                    {matchedStudents.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleSelect('students')}
                        className="w-full text-left p-2 rounded-lg hover:bg-blue-50 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-900" />
                          <span className="font-bold text-slate-900 uppercase group-hover:text-blue-950">
                            {st.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({st.admissionNo} • Roll #{st.rollNo})
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-900" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teachers Results */}
              {matchedTeachers.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Faculty & Staff ({matchedTeachers.length})
                  </span>
                  <div className="space-y-1">
                    {matchedTeachers.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelect('teachers')}
                        className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-indigo-900" />
                          <span className="font-bold text-slate-900 uppercase group-hover:text-indigo-950">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {t.designation} ({t.empId})
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-900" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipts Results */}
              {matchedReceipts.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Fee Receipts ({matchedReceipts.length})
                  </span>
                  <div className="space-y-1">
                    {matchedReceipts.map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => handleSelect('fees')}
                        className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-emerald-800" />
                          <span className="font-mono font-bold text-slate-900">{rec.receiptNo}</span>
                          <span className="text-[10px] text-slate-500">
                            {rec.studentName} (₹{rec.amountPaid})
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-900" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedStudents.length === 0 &&
                matchedTeachers.length === 0 &&
                matchedClasses.length === 0 &&
                matchedReceipts.length === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    No results found for "{query}". Try a different keyword.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 border-t flex justify-between items-center">
          <span>Press ESC to close</span>
          <span>SBSC Public School ERP</span>
        </div>
      </div>
    </div>
  );
};
