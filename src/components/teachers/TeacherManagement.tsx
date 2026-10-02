import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Teacher } from '../../types/school';
import {
  UserCheck,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Award,
  CreditCard,
  Briefcase,
  X,
  Save,
  KeyRound,
  GraduationCap,
  LogIn,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PrintPreviewModal } from '../reports/PrintPreviewModal';
import { TeacherStaffReportPdf } from '../reports/templates/TeacherStaffReportPdf';
import { SalarySlipPdf } from '../reports/templates/SalarySlipPdf';
import { TeacherCredentialsModal } from './TeacherCredentialsModal';
import { AdminTeacherPasswordConsoleModal } from './AdminTeacherPasswordConsoleModal';
import { TeacherPasswordModal } from './TeacherPasswordModal';
import { exportTableToCsv } from '../../services/pdfService';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface TeacherManagementProps {
  onNavigate?: (module: string) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigate }) => {
  const { teachers, classes, addTeacher, updateTeacher, deleteTeacher, salaries, settings, loginAsTeacher } = useSchool();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [selectedTeacherForCredentials, setSelectedTeacherForCredentials] = useState<Teacher | null>(null);
  const [isAdminPasswordConsoleOpen, setIsAdminPasswordConsoleOpen] = useState(false);
  const [teacherForPasswordChange, setTeacherForPasswordChange] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Print modals
  const [isStaffReportOpen, setIsStaffReportOpen] = useState(false);
  const [selectedTeacherForSlip, setSelectedTeacherForSlip] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState<Omit<Teacher, 'id'>>({
    empId: `TCH-${String(teachers.length + 1).padStart(3, '0')}`,
    name: '',
    designation: 'TGT Subject Teacher',
    qualification: 'M.Sc, B.Ed',
    subjects: ['Mathematics'],
    assignedClass: 'Class 10',
    email: '',
    phone: '',
    salary: 0,
    joinDate: new Date().toISOString().slice(0, 10),
    address: 'Bairwa Nankar, Siddharthnagar, UP',
    status: 'Active',
    gender: 'Male',
    experienceYears: 5,
  });

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subjects.some((sub) => sub.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setTeacherToEdit(null);
    setFormData({
      empId: `TCH-${String(teachers.length + 1).padStart(3, '0')}`,
      name: '',
      designation: 'PGT Senior Faculty',
      qualification: 'Post Graduate, B.Ed',
      subjects: ['Science'],
      assignedClass: 'Class 9',
      email: '',
      phone: '',
      salary: 0,
      joinDate: new Date().toISOString().slice(0, 10),
      address: 'Siddharthnagar, UP',
      status: 'Active',
      gender: 'Male',
      experienceYears: 5,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setTeacherToEdit(t);
    const { id, ...rest } = t;
    setFormData(rest);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Please fill in Teacher Name and Phone Number.');
      return;
    }

    if (teacherToEdit) {
      updateTeacher(teacherToEdit.id, formData);
      showToast(`✓ Updated profile for ${formData.name}`);
    } else {
      addTeacher(formData);
      showToast(`✓ Added new faculty member: ${formData.name}`);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!teacherToDelete) return;
    const name = teacherToDelete.name;
    const empId = teacherToDelete.empId;
    deleteTeacher(teacherToDelete.id);
    setTeacherToDelete(null);
    if (isModalOpen && teacherToEdit?.id === teacherToDelete.id) {
      setIsModalOpen(false);
    }
    showToast(`✓ Staff member "${name}" (${empId}) permanently removed.`);
  };

  const handleExportCsv = () => {
    const headers = ['Emp ID', 'Teacher Name', 'Designation', 'Qualification', 'Subjects', 'Class Incharge', 'Phone', 'Salary', 'Status'];
    const rows = filteredTeachers.map((t) => [
      t.empId,
      t.name,
      t.designation,
      t.qualification,
      t.subjects.join('; '),
      t.assignedClass || 'None',
      t.phone,
      t.salary,
      t.status,
    ]);
    exportTableToCsv(`SBSC-Staff-Directory-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="bg-emerald-900 text-emerald-100 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-lg border border-emerald-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Staff Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Faculty & Staff Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage teacher profiles, qualifications, class teacher assignments, and ERP login passwords.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('attendance')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>Staff Attendance</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import Sheet</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsStaffReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-900" />
            <span>Print Staff Directory</span>
          </button>

          <button
            onClick={() => setIsAdminPasswordConsoleOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Admin Anil Singh: View, reset and batch manage teacher passwords"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>Reset Passwords (Admin Only)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>

      {/* Staff KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">TOTAL FACULTY MEMBERS</span>
          <span className="text-xl font-extrabold text-blue-950">{teachers.length} Teachers</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">ACTIVE ON DUTY</span>
          <span className="text-xl font-extrabold text-emerald-700">
            {teachers.filter((t) => t.status === 'Active').length} Active
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">TOTAL MONTHLY PAYROLL</span>
          <span className="text-xl font-extrabold text-slate-900">
            {settings.currencySymbol} {teachers.reduce((s, t) => s + t.salary, 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">AVG EXPERIENCE</span>
          <span className="text-xl font-extrabold text-indigo-900">
            {(teachers.reduce((s, t) => s + t.experienceYears, 0) / (teachers.length || 1)).toFixed(1)} Years
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search teacher by name, Emp ID, designation, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-blue-900"
          />
        </div>
      </div>

      {/* Teacher Cards / Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const teacherSalaryRec = salaries.find((s) => s.empId === teacher.empId) || {
            id: `sal-${teacher.id}`,
            empId: teacher.empId,
            teacherName: teacher.name,
            designation: teacher.designation,
            month: 'August',
            year: 2026,
            basicPay: Math.round(teacher.salary * 0.8),
            allowances: Math.round(teacher.salary * 0.2),
            deductions: 1500,
            netSalary: teacher.salary - 1500,
            status: 'Paid' as const,
            paymentDate: '2026-08-31',
            paymentMode: 'Direct Bank Transfer',
          };

          return (
            <div
              key={teacher.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-sm shadow-xs">
                      {teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm uppercase">{teacher.name}</h3>
                      <span className="font-mono text-[10px] text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        {teacher.empId}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      teacher.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {teacher.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Designation:</span>
                    <span className="font-semibold text-slate-800">{teacher.designation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Qualification:</span>
                    <span className="font-medium text-slate-800">{teacher.qualification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Subjects:</span>
                    <span className="font-bold text-blue-900">{teacher.subjects.join(', ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Class In-Charge:</span>
                    {teacher.assignedClass ? (
                      <span className="font-extrabold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {teacher.assignedClass}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">Subject Teacher</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Monthly Pay:</span>
                    <span className="font-extrabold text-emerald-800">
                      {settings.currencySymbol} {teacher.salary.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Phone:</span>
                    <span className="font-mono font-medium text-slate-800">{teacher.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400 font-medium">ERP Password:</span>
                    <span className="font-mono font-bold text-blue-950 bg-slate-100 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {teacher.password ? '••••••••' : 'Set Password'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => setSelectedTeacherForCredentials(teacher)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold text-[11px] transition shadow-2xs"
                    title="Manage Login Password & Passkey"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Password & Passkey</span>
                  </button>

                  <button
                    onClick={() => setTeacherForPasswordChange(teacher)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition"
                    title="Teacher Create New Password"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
                    <span>Create Pass</span>
                  </button>

                  <button
                    onClick={() => setSelectedTeacherForSlip(teacher)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-[11px] transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Slip</span>
                  </button>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleOpenEdit(teacher)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit Teacher"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTeacherToDelete(teacher)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">{teacherToEdit ? 'Edit Faculty Profile' : 'Add New Teacher / Staff'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.empId}
                    onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-950"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior PGT Mathematics"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Qualifications *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M.Sc (Maths), B.Ed"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Subjects (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="Mathematics, Statistics"
                    value={formData.subjects.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Assigned Class In-Charge</label>
                  <select
                    value={formData.assignedClass || ''}
                    onChange={(e) => setFormData({ ...formData, assignedClass: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  >
                    <option value="">None (Subject Teacher Only)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98381 22334"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-blue-950"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Monthly Gross Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-extrabold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-emerald-800"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between gap-3">
                {teacherToEdit ? (
                  <button
                    type="button"
                    onClick={() => setTeacherToDelete(teacherToEdit)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Delete Faculty</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{teacherToEdit ? 'Update Profile' : 'Add Faculty'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Directory Print Modal */}
      <PrintPreviewModal
        isOpen={isStaffReportOpen}
        onClose={() => setIsStaffReportOpen(false)}
        title="Faculty & Staff Master Directory"
        fileName={`SBSC-Staff-Directory-${new Date().toISOString().slice(0, 10)}.pdf`}
      >
        <TeacherStaffReportPdf teachers={teachers} />
      </PrintPreviewModal>

      {/* Salary Slip Print Modal */}
      {selectedTeacherForSlip && (
        <PrintPreviewModal
          isOpen={!!selectedTeacherForSlip}
          onClose={() => setSelectedTeacherForSlip(null)}
          title={`Salary Slip - ${selectedTeacherForSlip.name}`}
          fileName={`SBSC-Salary-Slip-${selectedTeacherForSlip.empId}.pdf`}
        >
          <SalarySlipPdf
            salaryRecord={
              salaries.find((s) => s.empId === selectedTeacherForSlip.empId) || {
                id: `sal-${selectedTeacherForSlip.id}`,
                empId: selectedTeacherForSlip.empId,
                teacherName: selectedTeacherForSlip.name,
                designation: selectedTeacherForSlip.designation,
                month: 'August',
                year: 2026,
                basicPay: Math.round(selectedTeacherForSlip.salary * 0.8),
                allowances: Math.round(selectedTeacherForSlip.salary * 0.2),
                deductions: 1500,
                netSalary: selectedTeacherForSlip.salary - 1500,
                status: 'Paid',
                paymentDate: '2026-08-31',
                paymentMode: 'Direct Bank Transfer',
              }
            }
          />
        </PrintPreviewModal>
      )}

      {/* Teacher Credentials & Password Modal */}
      {selectedTeacherForCredentials && (
        <TeacherCredentialsModal
          isOpen={!!selectedTeacherForCredentials}
          teacher={selectedTeacherForCredentials}
          onClose={() => setSelectedTeacherForCredentials(null)}
          onLoginAsTeacher={(tId) => {
            loginAsTeacher(tId);
            if (onNavigate) onNavigate('class-teacher');
          }}
        />
      )}

      {/* Admin Master Password & Reset Console (Admin Only) */}
      <AdminTeacherPasswordConsoleModal
        isOpen={isAdminPasswordConsoleOpen}
        onClose={() => setIsAdminPasswordConsoleOpen(false)}
      />

      {/* Teacher Create New Password Modal */}
      {teacherForPasswordChange && (
        <TeacherPasswordModal
          isOpen={!!teacherForPasswordChange}
          teacher={teacherForPasswordChange}
          onClose={() => setTeacherForPasswordChange(null)}
          onSuccess={() => showToast('✓ New password saved successfully!')}
        />
      )}

      {/* Confirm Delete Staff Modal */}
      <ConfirmDeleteModal
        isOpen={!!teacherToDelete}
        onClose={() => setTeacherToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Faculty Member"
        itemName={teacherToDelete?.name}
        itemSubText={teacherToDelete ? `Employee ID: ${teacherToDelete.empId} • ${teacherToDelete.designation}` : undefined}
        message="Are you sure you want to permanently delete this faculty record from the staff register? All system allocations and portal login privileges for this teacher will be removed."
        confirmButtonText="Yes, Delete Staff Member"
      />
    </div>
  );
};
