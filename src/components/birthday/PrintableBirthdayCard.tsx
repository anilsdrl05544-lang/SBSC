import React, { useState, useRef } from 'react';
import { BirthdayCelebrant } from '../../types/birthday';
import { SchoolSettings } from '../../types/school';
import {
  X,
  Printer,
  Sparkles,
  Download,
  FileText,
  Image as ImageIcon,
  Copy,
  CheckCircle2,
  Share2,
  Palette,
  Languages,
  Edit3,
  Loader2,
  ChevronDown,
  Phone,
  Maximize2,
  Square,
  Cake,
  GraduationCap,
  Star,
  Award,
} from 'lucide-react';
import {
  downloadCardImage,
  downloadCardPdf,
  copyCardImageToClipboard,
} from '../../utils/birthdayCardDownload';
import { generateBirthdayWhatsAppUrl } from '../../utils/birthdayUtils';

interface PrintableBirthdayCardProps {
  celebrant: BirthdayCelebrant;
  settings: SchoolSettings;
  onClose: () => void;
}

export type CardThemeId = 'royal_gold' | 'sapphire_blue' | 'ruby_rose' | 'emerald_green' | 'imperial_purple';
export type CardLanguage = 'hindi' | 'english' | 'sanskrit' | 'custom';
export type CardAspect = 'certificate' | 'square';

interface CardThemeConfig {
  id: CardThemeId;
  name: string;
  hindiName: string;
  borderOuter: string;
  borderInner: string;
  bgGradient: string;
  cardBg: string;
  headerBadgeBg: string;
  headerBadgeText: string;
  accentText: string;
  primaryTextColor: string;
  highlightBoxBg: string;
  highlightBoxBorder: string;
  sealColor: string;
  sealBorder: string;
  ringColor: string;
}

const THEMES: Record<CardThemeId, CardThemeConfig> = {
  royal_gold: {
    id: 'royal_gold',
    name: 'Royal Gold & Amber',
    hindiName: 'राजसी स्वर्ण व केसरिया',
    borderOuter: 'border-amber-500',
    borderInner: 'border-amber-300',
    bgGradient: 'from-amber-50/60 via-amber-50/20 to-orange-50/50',
    cardBg: 'bg-white',
    headerBadgeBg: 'bg-amber-100',
    headerBadgeText: 'text-amber-900 border-amber-300',
    accentText: 'text-amber-700',
    primaryTextColor: 'text-amber-950',
    highlightBoxBg: 'bg-amber-50/70',
    highlightBoxBorder: 'border-amber-200',
    sealColor: 'text-amber-800',
    sealBorder: 'border-amber-400',
    ringColor: 'ring-amber-200',
  },
  sapphire_blue: {
    id: 'sapphire_blue',
    name: 'Sapphire Blue & Azure',
    hindiName: 'शाही नीला व रजत',
    borderOuter: 'border-blue-600',
    borderInner: 'border-sky-300',
    bgGradient: 'from-blue-50/60 via-sky-50/20 to-indigo-50/50',
    cardBg: 'bg-white',
    headerBadgeBg: 'bg-blue-100',
    headerBadgeText: 'text-blue-900 border-blue-300',
    accentText: 'text-blue-700',
    primaryTextColor: 'text-blue-950',
    highlightBoxBg: 'bg-blue-50/70',
    highlightBoxBorder: 'border-blue-200',
    sealColor: 'text-blue-800',
    sealBorder: 'border-blue-400',
    ringColor: 'ring-blue-200',
  },
  ruby_rose: {
    id: 'ruby_rose',
    name: 'Ruby Rose & Crimson',
    hindiName: 'गुलाबी व स्वर्णिम',
    borderOuter: 'border-rose-500',
    borderInner: 'border-pink-300',
    bgGradient: 'from-rose-50/60 via-pink-50/20 to-red-50/50',
    cardBg: 'bg-white',
    headerBadgeBg: 'bg-rose-100',
    headerBadgeText: 'text-rose-900 border-rose-300',
    accentText: 'text-rose-700',
    primaryTextColor: 'text-rose-950',
    highlightBoxBg: 'bg-rose-50/70',
    highlightBoxBorder: 'border-rose-200',
    sealColor: 'text-rose-800',
    sealBorder: 'border-rose-400',
    ringColor: 'ring-rose-200',
  },
  emerald_green: {
    id: 'emerald_green',
    name: 'Emerald Prosperity',
    hindiName: 'पन्ना हरा व सुवर्ण',
    borderOuter: 'border-emerald-600',
    borderInner: 'border-emerald-300',
    bgGradient: 'from-emerald-50/60 via-teal-50/20 to-green-50/50',
    cardBg: 'bg-white',
    headerBadgeBg: 'bg-emerald-100',
    headerBadgeText: 'text-emerald-900 border-emerald-300',
    accentText: 'text-emerald-700',
    primaryTextColor: 'text-emerald-950',
    highlightBoxBg: 'bg-emerald-50/70',
    highlightBoxBorder: 'border-emerald-200',
    sealColor: 'text-emerald-800',
    sealBorder: 'border-emerald-400',
    ringColor: 'ring-emerald-200',
  },
  imperial_purple: {
    id: 'imperial_purple',
    name: 'Imperial Violet',
    hindiName: 'राजसी जामुनी',
    borderOuter: 'border-purple-600',
    borderInner: 'border-purple-300',
    bgGradient: 'from-purple-50/60 via-violet-50/20 to-fuchsia-50/50',
    cardBg: 'bg-white',
    headerBadgeBg: 'bg-purple-100',
    headerBadgeText: 'text-purple-900 border-purple-300',
    accentText: 'text-purple-700',
    primaryTextColor: 'text-purple-950',
    highlightBoxBg: 'bg-purple-50/70',
    highlightBoxBorder: 'border-purple-200',
    sealColor: 'text-purple-800',
    sealBorder: 'border-purple-400',
    ringColor: 'ring-purple-200',
  },
};

export const PrintableBirthdayCard: React.FC<PrintableBirthdayCardProps> = ({
  celebrant,
  settings,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // States
  const [currentTheme, setCurrentTheme] = useState<CardThemeId>('royal_gold');
  const [language, setLanguage] = useState<CardLanguage>('hindi');
  const [aspectRatio, setAspectRatio] = useState<CardAspect>('certificate');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('cake');
  const [isEditingMessage, setIsEditingMessage] = useState<boolean>(false);
  const [downloadingAction, setDownloadingAction] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const adminName = settings.adminName || 'Anil Singh';
  const adminPhone = settings.adminPhone || settings.phone || '9452305199';
  const schoolName = settings.schoolName || 'SBSC PUBLIC SCHOOL';
  const address = settings.address || 'Bairwa Nankar, Naugarh Road';
  const district = settings.district || 'Siddharthnagar';
  const schoolCode = settings.schoolCode || '71092';

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Default Messages based on Language
  const defaultMessages: Record<CardLanguage, string> = {
    hindi:
      celebrant.type === 'student'
        ? `प्रिय ${celebrant.name}, आपके जन्मदिवस के पावन अवसर पर ${schoolName} परिवार एवं प्रशासक ${adminName} की ओर से अनंत मंगलकामनाएँ व स्नेहपूर्ण शुभाशीष। ईश्वर आपको उत्तम स्वास्थ्य, दीर्घायु एवं विद्या के सर्वोच्च शिखर पर पहुँचने का सामर्थ्य प्रदान करें। आप सदैव अपने माता-पिता व विद्यालय का नाम रोशन करें।`
        : `आदरणीय ${celebrant.name} जी, विद्यालय प्रबंधन एवं प्रशासक ${adminName} की ओर से आपको जन्मदिवस की हार्दिक शुभकामनाएं। शिक्षा एवं छात्र निर्माण में आपकी अनवरत सेवा व समर्पण हेतु विद्यालय परिवार सदैव आभारी है। ईश्वर आपको उत्तम स्वास्थ्य, प्रसन्नचित्त एवं दीर्घायु प्रदान करें।`,
    english:
      celebrant.type === 'student'
        ? `Dear ${celebrant.name}, on the joyous occasion of your birthday, the management, faculty, and Administrator ${adminName} of ${schoolName} convey our heartfelt congratulations and blessings! May this year bring you wisdom, glowing health, and outstanding scholastic success.`
        : `Respected ${celebrant.name}, the management, staff, and Administrator ${adminName} of ${schoolName} extend sincere birthday felicitations and gratitude for your distinguished dedication to academic excellence and nurturing young minds.`,
    sanskrit:
      celebrant.type === 'student'
        ? `॥ ॐ जीवन्तः सन्तु मे पुत्राः जीवन्तः सन्तु मे सुहृदः। शतमानं भवति शतायुः पुरुषः शतेन्द्रिय आयुष्येवेन्द्रिये प्रतितिष्ठति ॥\n\nप्रिय ${celebrant.name}, भगवतः कृपाकटाक्षेण भवतः जीवनं सुख-शान्ति-विद्या-समृद्धिभिः परिपूर्णं स्यात् इति ${schoolName} परिवारस्य प्रशासकस्य च ${adminName} महोदयस्य हार्दाः शुभाशयाः।`
        : `॥ सर्वस्तरतु दुर्गाणि सर्वो भद्राणि पश्यतु। सर्वः कामानवाप्नोतु सर्वः सर्वत्र नन्दतु ॥\n\nआदरणीय ${celebrant.name} महोदय, विद्यालयप्रबन्धनस्य प्रशासकस्य च ${adminName} महोदयस्य पक्षतः भवते जन्मदिवसस्य शुभाशयाः। भवान् शतायुः भूत्वा विद्यादानेन समाजमुज्ज्वलं करोतु।`,
    custom: '',
  };

  const [customWish, setCustomWish] = useState<string>(defaultMessages[language]);

  const activeMessage =
    language === 'custom'
      ? customWish
      : customWish || defaultMessages[language];

  // Handle Language Change
  const handleLanguageChange = (lang: CardLanguage) => {
    setLanguage(lang);
    if (lang !== 'custom') {
      setCustomWish(defaultMessages[lang]);
    }
  };

  // Safe file base name
  const celebrantCleanName = celebrant.name.replace(/\s+/g, '_');
  const baseFileName = `Birthday_Greeting_${celebrantCleanName}_${celebrant.admissionNo || celebrant.type}`;

  // Notification helper
  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 4000);
  };

  // Actions
  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadingAction('png');
      showFeedback('Generating High-Resolution PNG (2.5x HD)...');
      await downloadCardImage(cardRef.current, `${baseFileName}.png`, 'png', 2.5);
      showFeedback('✅ Greeting card PNG downloaded successfully!');
    } catch (err) {
      console.error(err);
      showFeedback('❌ Failed to download PNG image. Please try again.');
    } finally {
      setDownloadingAction(null);
    }
  };

  const handleDownloadJpeg = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadingAction('jpeg');
      showFeedback('Generating Compact JPEG image...');
      await downloadCardImage(cardRef.current, `${baseFileName}.jpg`, 'jpeg', 2.2);
      showFeedback('✅ Greeting card JPEG downloaded successfully!');
    } catch (err) {
      console.error(err);
      showFeedback('❌ Failed to download JPEG. Please try again.');
    } finally {
      setDownloadingAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadingAction('pdf');
      showFeedback('Generating Official Printable PDF Document...');
      await downloadCardPdf(cardRef.current, `${baseFileName}.pdf`, celebrant.name, schoolName);
      showFeedback('✅ Official Greeting card PDF downloaded successfully!');
    } catch (err) {
      console.error(err);
      showFeedback('❌ Failed to generate PDF document.');
    } finally {
      setDownloadingAction(null);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadingAction('copy');
      showFeedback('Copying greeting card to clipboard...');
      const success = await copyCardImageToClipboard(cardRef.current, 2);
      if (success) {
        showFeedback('📋 Card image copied to clipboard! Paste it directly into WhatsApp or docs.');
      } else {
        // Fallback to downloading PNG if browser doesn't support clipboard image
        await downloadCardImage(cardRef.current, `${baseFileName}.png`, 'png', 2);
        showFeedback('💾 Clipboard not supported in this browser, downloaded PNG instead!');
      }
    } catch (err) {
      console.error(err);
      showFeedback('❌ Could not copy image to clipboard.');
    } finally {
      setDownloadingAction(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const { url } = generateBirthdayWhatsAppUrl(
      celebrant,
      settings,
      language === 'english' ? 'english_formal_academic' : 'hindi_warm_blessing',
      activeMessage
    );
    window.open(url, '_blank');
  };

  const theme = THEMES[currentTheme];

  const avatarIcons: Record<string, React.ReactNode> = {
    cake: <Cake className="w-10 h-10 text-amber-900" />,
    grad: <GraduationCap className="w-10 h-10 text-amber-900" />,
    star: <Star className="w-10 h-10 text-amber-900 fill-amber-400" />,
    trophy: <Award className="w-10 h-10 text-amber-900" />,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:inset-auto print:bg-white print:overflow-visible print:block">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden relative flex flex-col max-h-[96vh] print:shadow-none print:border-none print:m-0 print:max-w-none print:max-h-none print:rounded-none">
        {/* Top Header & Status Banner (Hidden on Print) */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>Official Birthday Greeting Card</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {celebrant.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Download as High-Res PNG, PDF Document, or Print for Framing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close Greeting Card"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback / Notification Bar */}
        {statusFeedback && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-inner print:hidden shrink-0 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{statusFeedback}</span>
            </div>
            <button
              onClick={() => setStatusFeedback(null)}
              className="text-slate-900 hover:text-black font-extrabold text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action & Customization Controls Bar (Hidden on Print) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 print:hidden space-y-3 shrink-0">
          {/* Main Primary Download Options Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Download Buttons Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Download PNG Button */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={downloadingAction !== null}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-xs shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
                title="Download as 2.5x High-Resolution PNG image"
              >
                {downloadingAction === 'png' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                <span>Download PNG (Image)</span>
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingAction !== null}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl font-black text-xs shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
                title="Download as Official A4 PDF Document"
              >
                {downloadingAction === 'pdf' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>Download PDF</span>
              </button>

              {/* Download JPEG Button */}
              <button
                type="button"
                onClick={handleDownloadJpeg}
                disabled={downloadingAction !== null}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs border border-slate-300 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Download lightweight JPEG format"
              >
                {downloadingAction === 'jpeg' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>JPEG</span>
              </button>

              {/* Copy Image Button */}
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={downloadingAction !== null}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs border border-slate-300 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Copy Card Image to Clipboard to paste in WhatsApp / Word"
              >
                {downloadingAction === 'copy' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span className="hidden md:inline">Copy Image</span>
              </button>

              {/* Browser Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
                title="Print Greeting Card directly"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>

            {/* Quick Share via WhatsApp */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
                title="Send personalized greetings with WhatsApp link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Greeting</span>
              </button>
            </div>
          </div>

          {/* Secondary Customization Tabs (Theme, Language, Aspect, Edit Text) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/80 text-xs">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-600 text-[11px] mr-1">Theme:</span>
              <div className="flex items-center gap-1">
                {(Object.keys(THEMES) as CardThemeId[]).map((tId) => (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => setCurrentTheme(tId)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      currentTheme === tId
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                    }`}
                    title={THEMES[tId].name}
                  >
                    {tId === 'royal_gold' && '🌟 Gold'}
                    {tId === 'sapphire_blue' && '💎 Blue'}
                    {tId === 'ruby_rose' && '🌹 Rose'}
                    {tId === 'emerald_green' && '🌿 Emerald'}
                    {tId === 'imperial_purple' && '👑 Purple'}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-600 text-[11px] mr-1">Language:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hindi')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    language === 'hindi'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('english')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    language === 'english'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('sanskrit')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    language === 'sanskrit'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                  }`}
                >
                  संस्कृत
                </button>
              </div>

              {/* Edit Message Toggle */}
              <button
                type="button"
                onClick={() => setIsEditingMessage(!isEditingMessage)}
                className={`ml-2 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  isEditingMessage
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Edit message on the card"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingMessage ? 'Done' : 'Edit Text'}</span>
              </button>
            </div>

            {/* Aspect Ratio Toggle (Classic vs Square) */}
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="font-bold text-slate-600 text-[11px]">Format:</span>
              <button
                type="button"
                onClick={() => setAspectRatio('certificate')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  aspectRatio === 'certificate'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
                title="Standard Certificate Format (A4)"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('square')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  aspectRatio === 'square'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
                title="Square Post 1:1 (WhatsApp & Social Status)"
              >
                <Square className="w-3 h-3" />
                <span>Square (1:1)</span>
              </button>
            </div>
          </div>

          {/* Editable Text Area Drawer */}
          {isEditingMessage && (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Custom Greeting Message (Updates card immediately):
                </span>
                <button
                  type="button"
                  onClick={() => setCustomWish(defaultMessages[language])}
                  className="text-[11px] text-amber-700 hover:underline font-semibold"
                >
                  Reset to default template
                </button>
              </div>
              <textarea
                rows={3}
                value={customWish}
                onChange={(e) => {
                  setCustomWish(e.target.value);
                  setLanguage('custom');
                }}
                className="w-full text-xs p-2.5 font-sans border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900"
                placeholder="Type personalized congratulatory message..."
              />
            </div>
          )}
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center items-center print:p-0 print:bg-white print:overflow-visible print:block">
          {/* The Target Card Container to Capture & Print */}
          <div
            ref={cardRef}
            id="printable-birthday-card"
            className={`w-full ${
              aspectRatio === 'square' ? 'max-w-xl aspect-square' : 'max-w-2xl'
            } bg-gradient-to-b ${theme.bgGradient} p-6 sm:p-9 relative rounded-2xl shadow-xl border-4 ${
              theme.borderOuter
            } print:shadow-none print:border-4 print:m-0 print:max-w-none print:rounded-none`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* Double Ornamental Inner Border */}
            <div
              className={`border-2 border-dashed ${theme.borderInner} rounded-xl p-5 sm:p-7 relative ${theme.cardBg} bg-opacity-95 shadow-xs`}
            >
              {/* Corner Accents */}
              <div
                className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 ${theme.borderOuter}`}
              />
              <div
                className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 ${theme.borderOuter}`}
              />
              <div
                className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 ${theme.borderOuter}`}
              />
              <div
                className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 ${theme.borderOuter}`}
              />

              {/* Top Ornamental Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-slate-200">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full ${theme.headerBadgeBg} ${theme.headerBadgeText} border text-[10px] font-black uppercase tracking-widest mb-1 shadow-2xs`}
                >
                  <Sparkles className="w-3 h-3 fill-current" />
                  <span>
                    {language === 'english'
                      ? 'Official Birthday Felicitations'
                      : language === 'sanskrit'
                      ? 'जन्मदिनोत्सव-मंगलकामना-पत्रम्'
                      : 'जन्मदिन मंगलकामना व शुभाशीष पत्र'}
                  </span>
                  <Sparkles className="w-3 h-3 fill-current" />
                </div>

                <h1
                  className={`text-2xl sm:text-3xl font-black ${theme.primaryTextColor} tracking-tight font-serif uppercase`}
                >
                  {schoolName}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {address}, {district}, Uttar Pradesh
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                  <span>Affiliated to CBSE / UP Board</span>
                  <span>•</span>
                  <span>School Code: {schoolCode}</span>
                </div>
              </div>

              {/* Celebrant Central Highlight */}
              <div className="py-5 text-center space-y-3.5">
                {/* Photo or Celebratory Avatar */}
                <div className="flex justify-center">
                  {celebrant.photoUrl ? (
                    <img
                      src={celebrant.photoUrl}
                      alt={celebrant.name}
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 ${theme.borderOuter} shadow-md ring-4 ${theme.ringColor}`}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-100 flex items-center justify-center border-4 ${theme.borderOuter} shadow-md ring-4 ${theme.ringColor}`}
                    >
                      {avatarIcons[selectedAvatar] || avatarIcons.cake}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-serif text-slate-500 italic">
                    {language === 'english'
                      ? 'Warm Birthday Blessings Bestowed Upon'
                      : language === 'sanskrit'
                      ? 'शुभाशीषभाजनम्'
                      : 'सस्नेह मंगलकामना एवं शुभाशीष'}
                  </p>
                  <h2
                    className={`text-2xl sm:text-3xl font-black ${theme.primaryTextColor} tracking-tight mt-0.5 font-serif`}
                  >
                    {celebrant.name}
                  </h2>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs font-bold">
                    {celebrant.type === 'student' ? (
                      <>
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                          Class: {celebrant.className} ({celebrant.section || 'A'})
                        </span>
                        {celebrant.admissionNo && (
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                            Adm No: {celebrant.admissionNo}
                          </span>
                        )}
                        {celebrant.rollNo && (
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                            Roll: {celebrant.rollNo}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="bg-purple-100 text-purple-900 px-3 py-0.5 rounded-md border border-purple-200 font-bold">
                        Designation: {celebrant.designation || 'Faculty Member'}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-md border ${theme.headerBadgeBg} ${theme.headerBadgeText} font-black`}
                    >
                      Turning {celebrant.age} Years Today 🎂
                    </span>
                  </div>
                </div>

                {/* Congratulatory Text Card */}
                <div
                  className={`max-w-lg mx-auto ${theme.highlightBoxBg} p-3.5 sm:p-4 rounded-xl border ${theme.highlightBoxBorder} text-xs text-slate-800 leading-relaxed font-sans text-center shadow-2xs`}
                >
                  <p className="font-medium whitespace-pre-line">{activeMessage}</p>
                </div>

                {/* Particulars Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">
                      Birth Date
                    </span>
                    <span className="font-bold text-slate-900">{celebrant.dobFormatted}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">
                      {celebrant.type === 'student' ? 'Guardian / Parent' : 'Department'}
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {celebrant.fatherName || celebrant.designation || 'Guardian'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">
                      Celebration Date
                    </span>
                    <span className="font-bold text-slate-900">{todayFormatted}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="block text-[9px] text-slate-400 uppercase font-bold">
                      School Contact
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{adminPhone}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Signature & Seal Row */}
              <div className="pt-4 border-t-2 border-slate-200 flex items-end justify-between text-xs">
                {/* Seal */}
                <div className="text-left space-y-1">
                  <div
                    className={`w-16 h-16 rounded-full border-2 border-dashed ${theme.sealBorder} flex items-center justify-center text-[8px] font-black ${theme.sealColor} uppercase tracking-widest text-center leading-tight shadow-inner`}
                  >
                    <span>
                      OFFICIAL
                      <br />
                      SEAL
                      <br />
                      SBSC
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Dated: {todayFormatted}
                  </span>
                </div>

                {/* Administrator Signature */}
                <div className="text-right space-y-1">
                  <div
                    className={`font-serif italic text-base sm:text-lg font-black ${theme.primaryTextColor}`}
                  >
                    {adminName}
                  </div>
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    {adminName} (Administrator / Manager)
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {schoolName}, Siddharthnagar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer / Quick Download Summary (Hidden on Print) */}
        <div className="p-3 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Quick Download File:</span>
            <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200 truncate max-w-xs">
              {baseFileName}.png / .pdf
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloadingAction !== null}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingAction !== null}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
