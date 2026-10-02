import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Certificate, Student } from '../../types/school';
import {
  Scroll,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Award,
  ShieldCheck,
  Eye,
  Trash2,
  X,
  Save,
  QrCode,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { CertificatePdf } from '../reports/templates/CertificatePdf';
import { exportTableToCsv } from '../../services/pdfService';

export const CertificateManagement: React.FC = () => {
  const { certificates, issueCertificate, deleteCertificate, students, classes, settings } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedCertificateForPrint, setSelectedCertificateForPrint] = useState<Certificate | null>(null);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [certType, setCertType] = useState<Certificate['certificateType']>('Transfer Certificate');
  const [reason, setReason] = useState('Parent Transfer / Relocating to new city');
  const [conduct, setConduct] = useState('Exemplary & Diligent');

  const filteredCertificates = certificates.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.certificateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.admissionNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter ? c.certificateType === typeFilter : true;
    return matchesSearch && matchesType;
  });

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const classObj = classes.find((c) => c.id === student.classId);

    const newCert = issueCertificate({
      studentId: student.id,
      studentName: student.fullName,
      admissionNo: student.admissionNo,
      fatherName: student.fatherName,
      motherName: student.motherName,
      certificateType: certType,
      issueDate: new Date().toISOString().slice(0, 10),
      reason,
      conduct,
      duesCleared: true,
      classPassed: `${classObj?.name || student.classId} (${student.section})`,
    });

    setIsIssueModalOpen(false);
    setSelectedCertificateForPrint(newCert);
  };

  const handleDelete = (id: string, certNo: string) => {
    if (window.confirm(`Are you sure you want to revoke certificate "${certNo}"?`)) {
      deleteCertificate(id);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Certificate No', 'Type', 'Issue Date', 'Student Name', 'Admission No', 'Father Name', 'Class', 'Reason'];
    const rows = filteredCertificates.map((c) => [
      c.certificateNo,
      c.certificateType,
      c.issueDate,
      c.studentName,
      c.admissionNo,
      c.fatherName,
      c.classPassed,
      c.reason,
    ]);
    exportTableToCsv(`SBSC-Certificates-Register-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <Scroll className="w-4 h-4" />
            <span>Official Certificates & Institutional Credentials</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Certificate Generation & Register</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Issue Transfer Certificates (TC), Character Certificates, Bonafide Letters, and Merit Certificates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Register CSV</span>
          </button>

          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Issue Official Certificate</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cert no, student name, admission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-amber-800"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-amber-800"
          >
            <option value="">All Certificate Types</option>
            <option value="Transfer Certificate">Transfer Certificate (TC)</option>
            <option value="Character Certificate">Character Certificate</option>
            <option value="Bonafide Certificate">Bonafide Certificate</option>
            <option value="Merit Certificate">Merit Certificate</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Total Issued: <b className="text-slate-900">{certificates.length} Certificates</b>
        </span>
      </div>

      {/* Certificates Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-amber-950 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Certificate Serial No</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Student Full Name</th>
                <th className="py-3 px-3">Admission No</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-amber-50/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-blue-950">
                    {cert.certificateNo}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cert.certificateType === 'Transfer Certificate'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : cert.certificateType === 'Character Certificate'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {cert.certificateType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 uppercase block">{cert.studentName}</span>
                    <span className="text-[10px] text-slate-500">Father: {cert.fatherName}</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{cert.admissionNo}</td>
                  <td className="py-3 px-3 font-semibold text-slate-700">{cert.classPassed}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{cert.issueDate}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedCertificateForPrint(cert)}
                        title="Print A4 Certificate"
                        className="p-1.5 rounded-lg bg-amber-100 text-amber-950 hover:bg-amber-200 transition font-bold"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cert.id, cert.certificateNo)}
                        title="Revoke Certificate"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Certificate Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-amber-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">Issue Institutional Certificate</h3>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueCertificate} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select Student *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.admissionNo} - Roll #{s.rollNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Certificate Type *</label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-amber-950"
                >
                  <option value="Transfer Certificate">School Leaving / Transfer Certificate (TC)</option>
                  <option value="Character Certificate">Character & Conduct Certificate</option>
                  <option value="Bonafide Certificate">Bonafide Student Certificate</option>
                  <option value="Merit Certificate">Certificate of Academic Merit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reason for Issuance *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher studies / Relocation to another district"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Character & Moral Conduct Record</label>
                <input
                  type="text"
                  value={conduct}
                  onChange={(e) => setConduct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-800 hover:bg-amber-700 text-white font-bold shadow-md"
                >
                  Generate & Preview Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Print Preview Modal */}
      {selectedCertificateForPrint && (
        <PrintPreviewModal
          isOpen={!!selectedCertificateForPrint}
          onClose={() => setSelectedCertificateForPrint(null)}
          title={`Official Certificate - ${selectedCertificateForPrint.certificateNo}`}
          fileName={`SBSC-Certificate-${selectedCertificateForPrint.certificateNo.replace(/\//g, '-')}.pdf`}
        >
          <CertificatePdf certificate={selectedCertificateForPrint} />
        </PrintPreviewModal>
      )}
    </div>
  );
};
