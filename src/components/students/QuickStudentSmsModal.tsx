import React, { useState } from 'react';
import { Student } from '../../types/school';
import { useSchool } from '../../context/SchoolContext';
import {
  X,
  Smartphone,
  Zap,
  MessageSquare,
  Copy,
  Check,
  Users,
  Send,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  cleanPhoneNumber,
  formatPhoneForSms,
  generateGroupSmsUrl,
  generateWhatsAppUrl,
  dispatchSafeMessage,
} from '../../services/whatsappService';

interface QuickStudentSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: Student[];
}

interface SmsPreset {
  id: string;
  name: string;
  badge: string;
  text: string;
}

export const QuickStudentSmsModal: React.FC<QuickStudentSmsModalProps> = ({
  isOpen,
  onClose,
  selectedStudents,
}) => {
  const { settings, classes } = useSchool();
  const [copied, setCopied] = useState(false);
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);

  // Phone numbers extraction with emergency contact fallback
  const rawPhones = selectedStudents.map((s) => s.guardianPhone || s.emergencyContact);
  const validPhones: string[] = Array.from(
    new Set(rawPhones.map((p) => formatPhoneForSms(p)).filter((p): p is string => Boolean(p)))
  );
  const invalidCount = selectedStudents.length - validPhones.length;

  const schoolName = settings.name || settings.schoolName || 'SBSC Public School';
  const schoolPhone = settings.phone || settings.contactNumber || '9876543210';
  const schoolUpi = settings.upiId || 'anilsingh636-2@oksbi';

  const presets: SmsPreset[] = [
    {
      id: 'notice',
      name: '📢 School Notice',
      badge: 'General',
      text: `Dear Parent, this is an important announcement from ${schoolName}. Please check your ward's school diary for details. Helpline: ${schoolPhone}.`,
    },
    {
      id: 'holiday',
      name: '🌴 Holiday Alert',
      badge: 'Holiday',
      text: `Dear Parent, please be informed that ${schoolName} will remain closed tomorrow due to official holiday. Regular classes will resume on the next working day. Principal.`,
    },
    {
      id: 'fee',
      name: '💰 Fee Due Reminder',
      badge: 'Fees',
      text: `Dear Parent, gentle reminder from ${schoolName}: School fee dues are pending for your ward. Kindly clear the dues via UPI: ${schoolUpi} or visit the fee counter. Contact: ${schoolPhone}.`,
    },
    {
      id: 'exam',
      name: '📝 Exam Datesheet',
      badge: 'Exams',
      text: `Dear Parent, examination / periodic test will commence shortly at ${schoolName}. Please ensure your ward arrives on time with complete admit card and stationery. Exam Dept.`,
    },
    {
      id: 'ptm',
      name: '🤝 PTM Meeting',
      badge: 'Meeting',
      text: `Dear Parent, Parent-Teacher Meeting (PTM) is scheduled at ${schoolName}. You are cordially invited to discuss your ward's academic progress with teachers. Contact: ${schoolPhone}.`,
    },
  ];

  const [selectedPresetId, setSelectedPresetId] = useState<string>('notice');
  const [message, setMessage] = useState<string>(presets[0].text);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: SmsPreset) => {
    setSelectedPresetId(preset.id);
    setMessage(preset.text);
  };

  const groupSmsUrl = generateGroupSmsUrl(validPhones, message);

  const handleSendOneClickSms = (textToSend?: string) => {
    const text = textToSend || message;
    if (validPhones.length === 0) {
      alert('None of the selected students have a valid phone number for SMS.');
      return;
    }
    if (!text.trim()) {
      alert('Please enter an SMS message.');
      return;
    }
    const targetUrl = textToSend ? generateGroupSmsUrl(validPhones, textToSend) : groupSmsUrl;
    dispatchSafeMessage(targetUrl, 'sms', text);
    
    // Automatically copy all formatted numbers to clipboard as well
    try {
      navigator.clipboard.writeText(validPhones.join(', '));
    } catch {}

    setIsDispatched(true);
    setTimeout(() => {
      setIsDispatched(false);
    }, 4000);
  };

  const handleSendPresetDirectly = (preset: SmsPreset) => {
    setSelectedPresetId(preset.id);
    setMessage(preset.text);
    handleSendOneClickSms(preset.text);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyNumbers = () => {
    navigator.clipboard.writeText(validPhones.join(', '));
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  // SMS length calculation (standard GSM 160 chars)
  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>1-Click SMS to Selected Students</span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Dispatch cellular SMS to {validPhones.length} parents at once with a single tap.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Target Audience Summary & Instant 1-Click Action Hero */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-2 border-blue-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-700" />
                  <span>{selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''} Selected</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-xs border border-emerald-300">
                  {validPhones.length} Valid Phone{validPhones.length > 1 ? 's' : ''}
                </span>
                {invalidCount > 0 && (
                  <span className="font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px] border border-amber-300">
                    {invalidCount} missing phone
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                One click opens your device's SMS app with all {validPhones.length} parents' numbers pre-filled in recipient list.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                id="btn-copy-all-phones"
                onClick={handleCopyNumbers}
                disabled={validPhones.length === 0}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Copy all valid phone numbers comma-separated to clipboard"
              >
                {copiedNumbers ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedNumbers ? 'Copied Numbers!' : 'Copy Numbers'}</span>
              </button>

              <button
                type="button"
                id="btn-quick-sms-top-hero"
                onClick={() => handleSendOneClickSms()}
                disabled={validPhones.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-blue-400/40"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>⚡ Send in 1-Click ({validPhones.length})</span>
              </button>
            </div>
          </div>

          {/* Quick SMS Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Choose Quick Message Template (Click to Load or Send):</span>
              </label>
              <span className="text-[11px] text-slate-500">5 School Presets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {presets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-2.5 rounded-xl border text-xs transition flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 text-blue-950 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => handleSelectPreset(preset)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate">{preset.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                        {preset.text}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                      >
                        {isSelected ? '✓ Loaded' : 'Load text'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendPresetDirectly(preset)}
                        disabled={validPhones.length === 0}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-black cursor-pointer shadow-2xs"
                        title="Send this preset immediately to all selected in 1 click"
                      >
                        <Zap className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                        <span>⚡ Send 1-Click</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-700" />
                <span>SMS Message Body (Editable):</span>
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-slate-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
                <span className="text-slate-300">|</span>
                <span
                  className={`font-mono font-bold ${
                    charCount > 160 ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  {charCount} chars • {smsSegments} SMS
                </span>
              </div>
            </div>

            <textarea
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSelectedPresetId('');
              }}
              className="w-full p-3 text-xs sm:text-sm font-sans rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 resize-y"
              placeholder="Type your SMS message to all selected students' parents..."
            />
          </div>

          {/* Selected Students Preview Pill List */}
          <div className="border-t border-slate-200 pt-3">
            <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Recipients ({selectedStudents.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {selectedStudents.map((st) => {
                const cls = classes.find((c) => c.id === st.classId);
                const phone = st.guardianPhone || st.emergencyContact;
                const hasPhone = !!cleanPhoneNumber(phone);
                return (
                  <span
                    key={st.id}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                      hasPhone
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-red-50 border-red-200 text-red-700 line-through'
                    }`}
                  >
                    <span>{st.fullName}</span>
                    <span className="text-slate-400">({cls?.name || 'Class'})</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Feedback Banner if Dispatched */}
          {isDispatched && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>SMS App Opened!</strong> All {validPhones.length} parent phone numbers and the message body have been pre-filled in your SMS messenger. Just hit send in your phone!
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Opens SMS app with all recipients filled.</span>
            </div>
            <button
              type="button"
              onClick={handleCopyNumbers}
              className="text-blue-700 hover:text-blue-900 font-bold underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedNumbers ? '✓ Numbers Copied!' : `Copy All ${validPhones.length} Numbers`}</span>
            </button>
            <a
              href="https://messages.google.com/web"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 underline inline-flex items-center gap-1"
              title="Send via Web on PC/Laptop"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Google Messages Web (PC)</span>
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer flex-1 sm:flex-none text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendOneClickSms}
              disabled={validPhones.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>⚡ Send SMS to All ({validPhones.length} Parents) in 1-Click</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
