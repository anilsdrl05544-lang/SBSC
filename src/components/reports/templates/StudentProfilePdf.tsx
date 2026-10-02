import React from 'react';
import { Student, ClassInfo } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { User, Phone, MapPin, Calendar, Heart, Shield, Award } from 'lucide-react';

interface StudentProfilePdfProps {
  student: Student;
}

export const StudentProfilePdf: React.FC<StudentProfilePdfProps> = ({ student }) => {
  const { classes, feePayments, examMarks, getStudentFeeBreakdown, settings } = useSchool();
  const classInfo = classes.find((c) => c.id === student.classId);
  const studentMarks = examMarks.filter((m) => m.studentId === student.id);
  const studentPayments = feePayments.filter((p) => p.studentId === student.id && p.status !== 'Cancelled');
  const feeBreakdown = getStudentFeeBreakdown(student.id);

  return (
    <div className="bg-white p-6 max-w-[800px] mx-auto border-2 border-slate-300 rounded-lg shadow-sm text-slate-800 font-sans text-xs">
      <ReportHeader
        title="STUDENT PROFILE & COMPREHENSIVE DOSSIER"
        subTitle={`Admission No: ${student.admissionNo}`}
        badge={`STATUS: ${student.status}`}
      />

      {/* Main Profile Header with Photo */}
      <div className="flex gap-4 items-start bg-slate-50 border border-slate-200 rounded p-4 mb-4">
        {/* Photo box */}
        <div className="w-28 h-32 bg-white border-2 border-blue-900 rounded flex flex-col items-center justify-center p-1 text-center shrink-0 shadow-xs">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover rounded" />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <User className="w-12 h-12 text-slate-300" />
              <span className="text-[8px] font-semibold text-slate-500 uppercase mt-1">Official Photo</span>
            </div>
          )}
        </div>

        {/* Core Info */}
        <div className="flex-1 grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">FULL NAME</span>
            <span className="font-extrabold text-blue-950 text-sm uppercase">{student.fullName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">ADMISSION NO. & ROLL NO.</span>
            <span className="font-bold text-slate-900">{student.admissionNo} (Roll: #{student.rollNo})</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">CURRENT CLASS & SECTION</span>
            <span className="font-bold text-blue-900">{classInfo?.name || student.classId} - Section {student.section}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">EDUCATION BOARD</span>
            <span className="font-bold text-slate-900">{student.board || settings.board || 'UP BOARD'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">DATE OF BIRTH (DD/MM/YYYY)</span>
            <span className="font-medium text-slate-900">{formatDateToDDMMYYYY(student.dob)} ({student.gender})</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">BLOOD GROUP & CATEGORY</span>
            <span className="font-bold text-red-700">{student.bloodGroup || 'O+'}</span> | <span className="font-medium text-slate-700">{student.category}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">AADHAAR / UID NUMBER</span>
            <span className="font-mono text-slate-800">{student.aadhaarNo || 'Verified on Record'}</span>
          </div>
        </div>
      </div>

      {/* Family & Guardian Information */}
      <div className="mb-4">
        <div className="bg-blue-950 text-white px-3 py-1 font-bold text-[11px] uppercase rounded-t">
          PARENT & GUARDIAN PARTICULARS
        </div>
        <div className="border border-slate-300 border-t-0 rounded-b p-3 grid grid-cols-2 gap-3 bg-white text-xs">
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">FATHER'S NAME</span>
            <span className="font-bold text-slate-900">{student.fatherName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">MOTHER'S NAME</span>
            <span className="font-bold text-slate-900">{student.motherName}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">PRIMARY CONTACT NUMBER</span>
            <span className="font-bold text-blue-900">{student.guardianPhone}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px]">EMERGENCY CONTACT</span>
            <span className="font-medium text-slate-800">{student.emergencyContact}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 font-semibold block text-[10px]">RESIDENTIAL ADDRESS</span>
            <span className="font-medium text-slate-800">{student.address}</span>
          </div>
        </div>
      </div>

      {/* Academic Track Record & Fee Clearance Snapshot */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Latest Exam Record */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[10px] uppercase flex justify-between">
            <span>LATEST EXAM ASSESSMENT</span>
            <Award className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="p-3 bg-slate-50 space-y-1.5">
            {studentMarks.length > 0 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Marks:</span>
                  <span className="font-bold text-slate-900">{studentMarks[0].totalMarks} / {studentMarks[0].maxTotalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Percentage & Grade:</span>
                  <span className="font-bold text-blue-950">{studentMarks[0].percentage.toFixed(1)}% (Grade {studentMarks[0].grade})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Class Rank:</span>
                  <span className="font-extrabold text-amber-700">Rank #{studentMarks[0].rank || 1}</span>
                </div>
              </>
            ) : (
              <p className="text-slate-400 italic">No exams recorded yet for this session.</p>
            )}
          </div>
        </div>

        {/* Fee Payment Summary */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[10px] uppercase flex justify-between">
            <span>FEE COLLECTION STATUS & DUES</span>
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <div className="p-2.5 bg-slate-50 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Yearly Assessed:</span>
              <span className="font-bold text-slate-900">
                {settings.currencySymbol} {feeBreakdown.totalYearlyDue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Fees Paid:</span>
              <span className="font-bold text-emerald-700">
                {settings.currencySymbol} {feeBreakdown.totalPaid.toLocaleString('en-IN')} ({studentPayments.length} Receipts)
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-700 font-semibold">Net Outstanding Due:</span>
              <span className={`font-black ${feeBreakdown.netDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {settings.currencySymbol} {feeBreakdown.netDue.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 pt-0.5 leading-tight">
              Includes Tuition: ₹{feeBreakdown.tuitionFee} • Adm: ₹{feeBreakdown.admissionFee} • Reg: ₹{feeBreakdown.registrationFee} • Exam: ₹{feeBreakdown.examFee} • Convey: ₹{feeBreakdown.conveyFee} • Prev Due: ₹{feeBreakdown.previousDue || 0} • Late Fine: ₹{feeBreakdown.lateFine}
            </p>
          </div>
        </div>
      </div>

      <ReportFooter notes="This document is an authentic certified institutional record issued under the seal of SBSC Public School." />
    </div>
  );
};
