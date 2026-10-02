import React from 'react';
import { Certificate, Student } from '../../../types/school';
import { ReportHeader, ReportFooter } from './ReportHeader';
import { useSchool } from '../../../context/SchoolContext';
import { formatDateToDDMMYYYY } from '../../../utils/dateUtils';
import { QrCode, Award, ShieldCheck } from 'lucide-react';

interface CertificatePdfProps {
  certificate: Certificate;
}

export const CertificatePdf: React.FC<CertificatePdfProps> = ({ certificate }) => {
  const { students, settings } = useSchool();
  const student = students.find((s) => s.id === certificate.studentId);

  const isTc = certificate.certificateType === 'Transfer Certificate';
  const isCc = certificate.certificateType === 'Character Certificate';
  const isBf = certificate.certificateType === 'Bonafide Certificate';

  return (
    <div className="bg-white p-8 max-w-[850px] mx-auto border-8 border-double border-blue-950 rounded-lg shadow-sm text-slate-800 font-sans text-xs relative">
      {/* Watermark in Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
        <div className="text-center">
          <h1 className="text-8xl font-black text-blue-950 tracking-widest uppercase">SBSC</h1>
          <p className="text-4xl font-bold text-blue-900">PUBLIC SCHOOL</p>
        </div>
      </div>

      <ReportHeader
        title={certificate.certificateType.toUpperCase()}
        subTitle={`Certificate Serial No: ${certificate.certificateNo}`}
        reportDate={certificate.issueDate}
      />

      {/* Main Certificate Body */}
      <div className="my-6 px-4 leading-relaxed text-sm text-slate-800 space-y-4">
        {isTc && (
          <div className="space-y-3 text-xs leading-6">
            <p className="text-center font-serif text-sm font-bold text-blue-950 uppercase tracking-widest border-b border-slate-300 pb-2 mb-4">
              SCHOOL LEAVING / TRANSFER CERTIFICATE
            </p>

            <table className="w-full border-collapse border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600 w-1/3">1. Admission & Registration No.:</td>
                  <td className="p-2 font-mono font-bold text-blue-950">{certificate.admissionNo}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="p-2 font-semibold text-slate-600">2. Name of the Pupil:</td>
                  <td className="p-2 font-bold text-blue-950 uppercase text-sm">{certificate.studentName}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600">3. Father's / Guardian's Name:</td>
                  <td className="p-2 font-medium text-slate-900">{certificate.fatherName}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="p-2 font-semibold text-slate-600">4. Mother's Name:</td>
                  <td className="p-2 font-medium text-slate-900">{certificate.motherName || 'Verified on Record'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600">5. Date of Birth (DD/MM/YYYY):</td>
                  <td className="p-2 font-bold text-slate-900">
                    {student?.dob ? formatDateToDDMMYYYY(student.dob) : 'Verified on Official Register'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="p-2 font-semibold text-slate-600">6. Nationality & Category:</td>
                  <td className="p-2 font-medium text-slate-900">Indian | {student?.category || 'General'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600">7. Class in which pupil last studied:</td>
                  <td className="p-2 font-bold text-blue-900">{certificate.classPassed}</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="p-2 font-semibold text-slate-600">8. School / Board Annual Examination Result:</td>
                  <td className="p-2 font-semibold text-emerald-800">Passed and Qualified for Promotion</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600">9. Whether School Dues are paid:</td>
                  <td className="p-2 font-bold text-emerald-700">YES, All Dues Cleared up to current term</td>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="p-2 font-semibold text-slate-600">10. Reason for leaving the school:</td>
                  <td className="p-2 font-medium text-slate-900 italic">{certificate.reason}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-semibold text-slate-600">11. General Conduct & Character:</td>
                  <td className="p-2 font-bold text-blue-950">{certificate.conduct || 'Good'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {isCc && (
          <div className="py-4 text-justify space-y-4">
            <p className="text-center font-serif text-sm font-bold text-blue-950 uppercase tracking-widest border-b border-slate-300 pb-2 mb-4">
              CHARACTER & CONDUCT CERTIFICATE
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              This is to certify that <b>{certificate.studentName}</b>, Son/Daughter of <b>{certificate.fatherName}</b>,
              bearing Admission No. <b>{certificate.admissionNo}</b>, has been a regular student of this institution
              studying in <b>{certificate.classPassed}</b> during the academic session <b>{settings.academicSession}</b>.
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              During his/her tenure at <b>{settings.schoolName}</b>, his/her general conduct, academic discipline, and moral
              character have been found to be <b>{certificate.conduct || 'Exemplary & Diligent'}</b>. He/She actively
              participated in school co-curricular activities and bore no disciplinary penalties on record.
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              This certificate is issued on request for <i>{certificate.reason || 'Higher Studies & Official Purposes'}</i>. We
              wish him/her the very best in all future academic pursuits.
            </p>
          </div>
        )}

        {isBf && (
          <div className="py-4 text-justify space-y-4">
            <p className="text-center font-serif text-sm font-bold text-blue-950 uppercase tracking-widest border-b border-slate-300 pb-2 mb-4">
              BONAFIDE STUDENT CERTIFICATE
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              This is to certify that <b>{certificate.studentName}</b>, Son/Daughter of <b>{certificate.fatherName}</b>,
              residing at <i>{student?.address || 'Bairwa Nankar, Siddharthnagar'}</i> is a bonafide regular student of{' '}
              <b>{settings.schoolName}, Bairwa Nankar, Siddharthnagar</b> enrolled in <b>{certificate.classPassed}</b> under
              Admission No. <b>{certificate.admissionNo}</b> for the Academic Session <b>{settings.academicSession}</b>.
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              As per official school records, his/her Date of Birth is <b>{student?.dob ? formatDateToDDMMYYYY(student.dob) : 'Verified on Record'}</b>.
            </p>
            <p className="indent-8 leading-7 text-slate-800">
              This bonafide certificate is issued for the purpose of <i>{certificate.reason}</i>.
            </p>
          </div>
        )}
      </div>

      {/* Verification QR & Signatures */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-slate-400 items-end">
        <div className="flex flex-col items-start">
          <div className="w-20 h-20 border border-slate-300 rounded flex flex-col items-center justify-center p-1 bg-white shadow-2xs">
            <QrCode className="w-12 h-12 text-slate-700" />
            <span className="text-[7px] font-mono text-slate-500">DIGITAL VERIFIED</span>
          </div>
          <span className="text-[8px] font-mono text-slate-500 mt-1">{certificate.certificateNo}</span>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-900 flex items-center justify-center text-[9px] font-bold text-blue-900 text-center uppercase mx-auto mb-1">
            OFFICIAL EMBOSS SEAL
          </div>
        </div>

        <div className="text-right">
          <div className="w-44 border-b-2 border-slate-900 ml-auto mb-1"></div>
          <p className="text-xs font-extrabold text-blue-950">{settings.principalName || 'Vijendra Pal'}</p>
          <p className="text-[10px] font-semibold text-slate-600">Principal & Head of School</p>
          <p className="text-[9px] text-slate-400 font-mono">SBSC Public School</p>
        </div>
      </div>
    </div>
  );
};
