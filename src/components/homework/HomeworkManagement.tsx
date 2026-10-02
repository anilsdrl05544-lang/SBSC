import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Homework } from '../../types/school';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Trash2,
  X,
  Save,
  Users,
} from 'lucide-react';

export const HomeworkManagement: React.FC = () => {
  const schoolContext = useSchool();
  const homeworks = schoolContext.homeworks;
  const homeworkList = schoolContext.homeworkList;
  const addHomework = schoolContext.addHomework;
  const deleteHomework = schoolContext.deleteHomework;
  const classes = Array.isArray(schoolContext.classes) ? schoolContext.classes : [];
  const teachers = Array.isArray(schoolContext.teachers) ? schoolContext.teachers : [];
  const settings = schoolContext.settings || { schoolName: 'SBSC School' };

  const allHomework: Homework[] = Array.isArray(homeworkList)
    ? homeworkList
    : Array.isArray(homeworks)
    ? homeworks
    : [];

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Omit<Homework, 'id'>>({
    classId: classes[0]?.id || 'c-10',
    section: 'A',
    subject: 'Mathematics',
    title: '',
    description: '',
    assignedDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    assignedBy: teachers[0]?.name || 'Subject Teacher',
    totalSubmissions: 0,
  });

  const filteredHomework = (Array.isArray(allHomework) ? allHomework : []).filter(
    (h) => (h && typeof h === 'object' && selectedClassId ? h.classId === selectedClassId : Boolean(h))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in title and homework description.');
      return;
    }

    addHomework(formData);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Delete homework assignment "${title}"?`)) {
      deleteHomework(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Digital Curriculum & Homework Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Homework & Class Assignments</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Assign homework tasks, track submission deadlines, and coordinate syllabus coverage.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              classId: classes[0]?.id || 'c-10',
              section: 'A',
              subject: 'Mathematics',
              title: '',
              description: '',
              assignedDate: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
              assignedBy: teachers[0]?.name || 'Faculty Member',
              totalSubmissions: 0,
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Homework</span>
        </button>
      </div>

      {/* Class Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Filter by Class:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-amber-700"
          >
            <option value="">All Classes ({allHomework.length} Tasks)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Homework Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHomework.map((hw) => {
          const cls = classes.find((c) => c.id === hw.classId);

          return (
            <div
              key={hw.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {hw.subject}
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {cls?.name || hw.classId} - {hw.section}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{hw.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">{hw.description}</p>

                <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>Assigned By:</span>
                    <span className="font-semibold text-slate-800">{hw.assignedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Date:</span>
                    <span className="font-medium text-slate-700">{hw.assignedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-semibold">Submission Deadline:</span>
                    <span className="font-bold text-rose-700">{hw.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  {hw.totalSubmissions || 28} Submissions Received
                </span>

                <button
                  onClick={() => handleDelete(hw.id, hw.title)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition"
                  title="Delete Homework"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Homework Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-amber-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">{settings.schoolName}</span>
                <h3 className="text-lg font-extrabold">Assign New Homework</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class *</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-amber-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Homework Topic / Chapter Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Quadratic Equations Ex 4.2"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Instructions & Problem Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Solve Questions 1 to 10 in fair notebook with step-by-step working..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assigned By (Faculty Name)</label>
                <input
                  type="text"
                  value={formData.assignedBy}
                  onChange={(e) => setFormData({ ...formData, assignedBy: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-800 hover:bg-amber-700 text-white font-bold shadow-md"
                >
                  Assign to Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
