import React from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { Award, GraduationCap } from 'lucide-react';

interface ReportHeaderProps {
  title: string;
  subTitle?: string;
  reportDate?: string;
  badge?: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subTitle,
  reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  badge,
}) => {
  const { settings } = useSchool();

  return (
    <div className="border-b-2 border-blue-900 pb-3 mb-4 text-center relative font-sans">
      {/* Top Strip */}
      <div className="flex justify-between items-center text-[10px] text-slate-600 font-semibold border-b border-slate-200 pb-1 mb-2 px-1">
        <span>AFFILIATION NO: {settings.affiliationNo}</span>
        <span className="bg-blue-900 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">
          {settings.board}
        </span>
        <span>SCHOOL CODE: {settings.schoolCode}</span>
      </div>

      {/* Main School Title & Logo Header */}
      <div className="flex items-center justify-between gap-4 px-2">
        {/* Left Emblem / School Logo */}
        {settings.logoUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-1 shadow-xs">
            <img
              src={settings.logoUrl}
              alt="School Logo"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-900 text-amber-300 flex flex-col items-center justify-center border-2 border-amber-400 shrink-0 shadow-sm">
            <GraduationCap className="w-7 h-7" />
            <span className="text-[7px] font-extrabold tracking-tighter text-white">ESTD. 2012</span>
          </div>
        )}

        {/* Center Text */}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold text-blue-950 tracking-wide uppercase font-serif">
            {settings.schoolName}
          </h1>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            {settings.address}, {settings.district}, {settings.state} - {settings.pinCode}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-center gap-3">
            <span>📞 {settings.phone}</span>
            <span>✉️ {settings.email}</span>
            <span>🌐 {settings.website}</span>
          </p>
        </div>

        {/* Right Seal Badge / School Stamp */}
        {settings.stampUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-300 bg-white p-1 shadow-xs">
            <img
              src={settings.stampUrl}
              alt="Official Seal"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-blue-900 flex flex-col items-center justify-center text-blue-950 shrink-0 shadow-sm">
            <Award className="w-6 h-6 text-amber-600" />
            <span className="text-[7px] font-bold uppercase tracking-tight">ISO 9001</span>
          </div>
        )}
      </div>

      {/* Document Title Banner */}
      <div className="mt-3 pt-2 border-t border-dashed border-blue-200 flex items-center justify-between px-2">
        <div className="text-left">
          <span className="text-[11px] font-semibold text-slate-500">ACADEMIC SESSION:</span>{' '}
          <span className="text-xs font-bold text-blue-900">{settings.academicSession}</span>
        </div>

        <div className="text-center">
          <span className="inline-block bg-blue-950 text-white font-bold px-4 py-1 rounded text-xs tracking-wider uppercase shadow-xs">
            {title}
          </span>
          {subTitle && <div className="text-[11px] text-slate-600 font-medium mt-0.5">{subTitle}</div>}
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-500">DATE:</span>{' '}
          <span className="text-xs font-bold text-slate-800">{reportDate}</span>
          {badge && <span className="ml-2 text-[10px] bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded font-mono">{badge}</span>}
        </div>
      </div>
    </div>
  );
};

export const ReportFooter: React.FC<{ showSignatures?: boolean; notes?: string }> = ({
  showSignatures = true,
  notes,
}) => {
  const { settings } = useSchool();

  return (
    <div className="mt-8 pt-4 border-t border-slate-300 font-sans">
      {notes && <p className="text-[10px] text-slate-500 italic mb-4">* {notes}</p>}

      {showSignatures && (
        <div className="flex justify-between items-end text-center pt-6 px-4">
          <div>
            <div className="w-36 border-b border-slate-800 mb-1"></div>
            <p className="text-[11px] font-bold text-slate-800">Class Teacher / Prepared By</p>
            <p className="text-[9px] text-slate-500">Sign & Date</p>
          </div>

          <div className="flex flex-col items-center">
            {settings.stampUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center p-0.5">
                <img
                  src={settings.stampUrl}
                  alt="Official Seal"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full border border-dashed border-blue-800 flex items-center justify-center text-[9px] font-bold text-blue-900 text-center uppercase p-1">
                Official Seal & Stamp
              </div>
            )}
          </div>

          <div>
            <div className="w-40 border-b border-slate-800 mb-1"></div>
            <p className="text-[11px] font-bold text-slate-800">{settings.principalName || 'Vijendra Pal'}</p>
            <p className="text-[9px] font-semibold text-blue-950">Principal / Head of Institution</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-1">
        Generated electronically via SBSC Public School ERP Portal • Bairwa Nankar, Siddharthnagar, UP
      </div>
    </div>
  );
};
