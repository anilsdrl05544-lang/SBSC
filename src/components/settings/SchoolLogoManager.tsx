import React, { useState, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  Image,
  Upload,
  Link,
  CheckCircle,
  X,
  Trash2,
  Sparkles,
  Award,
  GraduationCap,
  Shield,
  FileCheck,
  RefreshCw,
  Eye,
  Camera,
} from 'lucide-react';

const svgToDataUrl = (svgString: string) => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

export const PRESET_LOGOS = [
  {
    id: 'sbsc-gold-crest',
    name: 'SBSC Royal Gold & Navy Crest',
    tag: 'Official Recommended',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDE047"/>
            <stop offset="50%" stop-color="#F59E0B"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E3A8A"/>
            <stop offset="100%" stop-color="#0B132B"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#blueGrad)" stroke="url(#goldGrad)" stroke-width="6"/>
        <circle cx="100" cy="100" r="82" fill="none" stroke="#FDE047" stroke-width="1.5" stroke-dasharray="4,2"/>
        <polygon points="100,48 148,72 100,96 52,72" fill="url(#goldGrad)"/>
        <polygon points="100,96 138,78 138,108 100,126 62,108 62,78" fill="#F59E0B" opacity="0.9"/>
        <line x1="144" y1="74" x2="144" y2="114" stroke="#FDE047" stroke-width="3"/>
        <circle cx="144" cy="117" r="4" fill="#FDE047"/>
        <path d="M68,128 Q100,120 100,138 Q100,120 132,128 L128,148 Q100,140 100,156 Q100,140 72,148 Z" fill="#FFFFFF"/>
        <rect x="36" y="158" width="128" height="22" rx="6" fill="url(#goldGrad)"/>
        <text x="100" y="173" font-size="12" font-weight="900" font-family="sans-serif" fill="#0B132B" text-anchor="middle" letter-spacing="1.5">SBSC PUBLIC</text>
      </svg>
    `),
  },
  {
    id: 'academic-shield',
    name: 'CBSE Academic Star Shield',
    tag: 'Modern Crest',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0284C7"/>
            <stop offset="100%" stop-color="#0369A1"/>
          </linearGradient>
        </defs>
        <path d="M100,20 L160,50 L160,110 Q160,170 100,190 Q40,170 40,110 L40,50 Z" fill="url(#shieldGrad)" stroke="#F8FAFC" stroke-width="5"/>
        <path d="M100,32 L148,56 L148,105 Q148,155 100,174 Q52,155 52,105 L52,56 Z" fill="#0F172A" stroke="#FACC15" stroke-width="2"/>
        <circle cx="100" cy="88" r="26" fill="#F59E0B"/>
        <polygon points="100,68 106,82 120,84 110,94 113,108 100,101 87,108 90,94 80,84 94,82" fill="#FFFFFF"/>
        <path d="M70,126 Q100,118 100,134 Q100,118 130,126 L126,144 Q100,136 100,150 Q100,136 74,144 Z" fill="#FFFFFF"/>
        <text x="100" y="166" font-size="10" font-weight="bold" font-family="sans-serif" fill="#FDE047" text-anchor="middle" letter-spacing="1">ESTD 2012</text>
      </svg>
    `),
  },
  {
    id: 'wisdom-flame',
    name: 'Vedic Knowledge Torch & Book',
    tag: 'Heritage Emblem',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="92" fill="#FFFBEB" stroke="#B45309" stroke-width="5"/>
        <circle cx="100" cy="100" r="82" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,2"/>
        <!-- Torch Flame -->
        <path d="M100,35 Q115,55 108,75 Q100,68 96,75 Q88,55 100,35 Z" fill="#EF4444"/>
        <path d="M100,45 Q110,60 105,72 Q100,68 97,72 Q92,60 100,45 Z" fill="#FBBF24"/>
        <polygon points="94,76 106,76 102,110 98,110" fill="#78350F"/>
        <!-- Open Knowledge Book -->
        <path d="M60,118 Q100,106 100,126 Q100,106 140,118 L136,146 Q100,134 100,154 Q100,134 64,146 Z" fill="#1E3A8A"/>
        <path d="M64,122 Q100,110 100,130 Q100,110 136,122 L133,142 Q100,130 100,150 Q100,130 67,142 Z" fill="#FFFFFF"/>
        <text x="100" y="174" font-size="11" font-weight="900" font-family="sans-serif" fill="#78350F" text-anchor="middle">SBSC VIDYALAYA</text>
      </svg>
    `),
  },
];

export const PRESET_STAMPS = [
  {
    id: 'sbsc-official-seal',
    name: 'SBSC Official Circular Stamp',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#1E3A8A" stroke-width="4"/>
        <circle cx="100" cy="100" r="85" fill="none" stroke="#1E3A8A" stroke-width="1.5" stroke-dasharray="3,2"/>
        <circle cx="100" cy="100" r="54" fill="none" stroke="#1E3A8A" stroke-width="2"/>
        <path id="sealTop" d="M 28,100 A 72,72 0 1,1 172,100" fill="none"/>
        <path id="sealBottom" d="M 172,100 A 72,72 0 0,1 28,100" fill="none"/>
        <text font-size="11" font-family="sans-serif" font-weight="bold" fill="#1E3A8A" letter-spacing="2">
          <textPath href="#sealTop" startOffset="50%" text-anchor="middle">SBSC PUBLIC SCHOOL</textPath>
        </text>
        <text font-size="8.5" font-family="sans-serif" font-weight="bold" fill="#1E3A8A" letter-spacing="1">
          <textPath href="#sealBottom" startOffset="50%" text-anchor="middle">BAIRWA NANKAR • SIDDHARTHNAGAR</textPath>
        </text>
        <text x="100" y="93" font-size="10" font-family="sans-serif" font-weight="bold" fill="#1E3A8A" text-anchor="middle">★ PRINCIPAL ★</text>
        <text x="100" y="107" font-size="9" font-family="sans-serif" font-weight="bold" fill="#1E3A8A" text-anchor="middle">OFFICIAL SEAL</text>
        <text x="100" y="122" font-size="8.5" font-family="sans-serif" font-weight="bold" fill="#B91C1C" text-anchor="middle">VERIFIED</text>
      </svg>
    `),
  },
];

interface SchoolLogoManagerProps {
  onSuccess?: () => void;
}

export const SchoolLogoManager: React.FC<SchoolLogoManagerProps> = ({ onSuccess }) => {
  const { settings, updateSettings } = useSchool();
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [stampUrl, setStampUrl] = useState(settings.stampUrl || '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [stampUrlInput, setStampUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'logo' | 'stamp'>('logo');
  const [isDragOver, setIsDragOver] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to compress and convert image file to optimized Base64
  const processImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    // Check size (max 5MB raw)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size is too large (maximum 5MB). Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // Optimize image through HTML5 canvas to keep size light in localStorage
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 400; // 400x400 max is more than enough for crisp A4 print & UI
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
          callback(compressed);
        } else {
          callback(result);
        }
      };
      img.onerror = () => {
        callback(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (base64) => {
        setLogoUrl(base64);
        updateSettings({ logoUrl: base64 });
        showNotification('✓ School Logo uploaded and saved successfully!');
      });
    }
  };

  const handleStampFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (base64) => {
        setStampUrl(base64);
        updateSettings({ stampUrl: base64 });
        showNotification('✓ Official School Seal uploaded and saved successfully!');
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (activeTab === 'logo') {
        processImageFile(file, (base64) => {
          setLogoUrl(base64);
          updateSettings({ logoUrl: base64 });
          showNotification('✓ School Logo uploaded and saved successfully!');
        });
      } else {
        processImageFile(file, (base64) => {
          setStampUrl(base64);
          updateSettings({ stampUrl: base64 });
          showNotification('✓ Official School Seal uploaded and saved successfully!');
        });
      }
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setLogoUrl(trimmed);
    updateSettings({ logoUrl: trimmed });
    setCustomUrlInput('');
    showNotification('✓ School Logo URL applied and saved!');
  };

  const handleApplyStampUrl = () => {
    const trimmed = stampUrlInput.trim();
    if (!trimmed) return;
    setStampUrl(trimmed);
    updateSettings({ stampUrl: trimmed });
    setStampUrlInput('');
    showNotification('✓ Official Stamp URL applied and saved!');
  };

  const handleSelectPresetLogo = (presetDataUrl: string) => {
    setLogoUrl(presetDataUrl);
    updateSettings({ logoUrl: presetDataUrl });
    showNotification('✓ Preset School Logo applied and saved!');
  };

  const handleSelectPresetStamp = (presetDataUrl: string) => {
    setStampUrl(presetDataUrl);
    updateSettings({ stampUrl: presetDataUrl });
    showNotification('✓ Preset Official Seal applied and saved!');
  };

  const handleRemoveLogo = () => {
    if (window.confirm('Are you sure you want to remove the custom school logo and revert to the default emblem?')) {
      setLogoUrl('');
      updateSettings({ logoUrl: '' });
      showNotification('School logo reset to default emblem.');
    }
  };

  const handleRemoveStamp = () => {
    if (window.confirm('Are you sure you want to remove the school stamp?')) {
      setStampUrl('');
      updateSettings({ stampUrl: '' });
      showNotification('Official stamp removed.');
    }
  };

  const showNotification = (msg: string) => {
    setFeedback(msg);
    onSuccess?.();
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Card Header with Tabs */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 border-b border-blue-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Image className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                  School Logo & Official Stamp Attach Options
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Live Sync
                </span>
              </div>
              <p className="text-blue-200/80 text-xs mt-0.5">
                Upload your official school logo & principal seal. Automatically stamped on all 17+ A4 PDF reports, fee receipts, marksheets, and dashboard header.
              </p>
            </div>
          </div>

          {/* Navigation Pill Switcher between Logo & Stamp */}
          <div className="inline-flex rounded-xl bg-blue-900/60 p-1 border border-blue-700/60 text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('logo')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'logo'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>School Logo</span>
              {logoUrl && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stamp')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'stamp'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Principal Seal / Stamp</span>
              {stampUrl && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
            </button>
          </div>
        </div>

        {/* Dynamic Toast Feedback */}
        {feedback && (
          <div className="mt-3 bg-emerald-500/90 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* TAB 1: SCHOOL LOGO UPLOADER & PRESETS */}
        {activeTab === 'logo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Upload & Presets Area (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                  isDragOver
                    ? 'border-blue-700 bg-blue-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-600 bg-slate-50/60 hover:bg-blue-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6 text-blue-900" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or Drag & Drop School Logo here
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports PNG, JPG, JPEG, SVG, WebP (Max 5MB)
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                    ✓ Recommended: Square (1:1)
                  </span>
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                    ✓ Transparent PNG supported
                  </span>
                </div>
              </div>

              {/* Paste Image URL Fallback */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-800" />
                  <span>Or Enter Direct Image Web URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/school-logo.png"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-blue-900"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
              </div>

              {/* 1-Click Institutional Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick 1-Click Educational Emblem Presets:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Instant High-Resolution SVGs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRESET_LOGOS.map((p) => {
                    const isSelected = logoUrl === p.dataUrl;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPresetLogo(p.dataUrl)}
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col items-center text-center gap-2 ${
                          isSelected
                            ? 'border-blue-900 bg-blue-50/80 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center">
                          <img src={p.dataUrl} alt={p.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">{p.name}</p>
                          <span className="text-[9px] text-blue-700 font-semibold bg-blue-100 px-1.5 py-0.5 rounded-full inline-block mt-1">
                            {p.tag}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active Logo
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Previews (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-900" />
                    <span>Real-Time Document Previews</span>
                  </span>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Remove custom logo and restore default emblem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                {/* Preview 1: Official PDF Report Header Mockup */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Preview in Official A4 Reports & Marksheets:
                  </span>
                  <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-blue-900 pb-2">
                      {/* Rendered Logo */}
                      {logoUrl ? (
                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src={logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-300 flex flex-col items-center justify-center text-[6px] font-black border border-amber-400 shrink-0">
                          <GraduationCap className="w-5 h-5" />
                          <span>ESTD. 2012</span>
                        </div>
                      )}

                      <div className="text-center flex-1 min-w-0">
                        <div className="font-extrabold text-blue-950 text-xs font-serif uppercase tracking-tight truncate">
                          {settings.schoolName || 'SBSC PUBLIC SCHOOL'}
                        </div>
                        <div className="text-[9px] text-slate-600 truncate">
                          {settings.address || 'Bairwa Nankar'}, {settings.district || 'Siddharthnagar'}
                        </div>
                        <div className="text-[8px] text-slate-500 font-mono mt-0.5">
                          CBSE AFFILIATION: {settings.affiliationNo || 'UP-CBSE/2130988'}
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-amber-50 border border-blue-900 flex flex-col items-center justify-center text-[6px] font-bold text-blue-950 shrink-0">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>ISO 9001</span>
                      </div>
                    </div>

                    <div className="bg-blue-950 text-white text-center py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                      Student Marksheet / Official Register Header
                    </div>
                  </div>
                </div>

                {/* Preview 2: Sidebar Brand Header Mockup */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Preview in App Sidebar & Mobile Navigation:
                  </span>
                  <div className="bg-blue-950 text-white rounded-xl p-3 border border-blue-900 flex items-center gap-3">
                    {logoUrl ? (
                      <div className="w-9 h-9 rounded-lg bg-white p-0.5 flex items-center justify-center shadow ring-2 ring-amber-400/50 shrink-0">
                        <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                        SBSC
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs leading-tight">{settings.schoolName || 'SBSC PUBLIC SCHOOL'}</h4>
                      <p className="text-[9px] text-amber-400 font-medium">Bairwa Nankar • Active ERP</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {logoUrl
                    ? 'Active custom logo is automatically rendered on all 17+ reports.'
                    : 'Currently using classic institutional vector emblem.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRINCIPAL OFFICIAL STAMP & SEAL */}
        {activeTab === 'stamp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              {/* Stamp Upload Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => stampFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                  isDragOver
                    ? 'border-blue-700 bg-blue-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-600 bg-slate-50/60 hover:bg-blue-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={stampFileInputRef}
                  onChange={handleStampFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center shadow-xs">
                  <FileCheck className="w-6 h-6 text-indigo-900" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Upload Official School Seal / Principal Stamp
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recommended: Transparent circular PNG image of institutional rubber stamp
                  </p>
                </div>
              </div>

              {/* Paste Stamp URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-blue-800" />
                  <span>Or Enter Stamp Image URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={stampUrlInput}
                    onChange={(e) => setStampUrlInput(e.target.value)}
                    placeholder="https://example.com/principal-stamp.png"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-blue-900"
                  />
                  <button
                    type="button"
                    onClick={handleApplyStampUrl}
                    className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Apply Stamp
                  </button>
                </div>
              </div>

              {/* 1-Click Official Stamp Preset */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  1-Click Generated SBSC Official Circular Stamp:
                </span>

                <div className="flex flex-wrap gap-3">
                  {PRESET_STAMPS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectPresetStamp(s.dataUrl)}
                      className={`p-3 rounded-xl border-2 flex items-center gap-3 transition cursor-pointer text-left ${
                        stampUrl === s.dataUrl
                          ? 'border-blue-950 bg-blue-50/80 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full border border-blue-900 bg-white p-0.5 flex items-center justify-center">
                        <img src={s.dataUrl} alt={s.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.name}</p>
                        <span className="text-[10px] text-blue-700 font-semibold">Click to activate stamp</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Stamp Preview in Signature Block */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-900" />
                    <span>Report Footer Signature Preview</span>
                  </span>
                  {stampUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveStamp}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Stamp</span>
                    </button>
                  )}
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-xs space-y-4">
                  <div className="flex justify-between items-end text-center pt-2">
                    <div>
                      <div className="w-24 border-b border-slate-600 mb-1"></div>
                      <p className="text-[9px] font-bold text-slate-800">Class Teacher</p>
                    </div>

                    {/* Official Stamp Placement */}
                    <div className="flex flex-col items-center">
                      {stampUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center p-0.5 border border-slate-300 shadow-2xs">
                          <img src={stampUrl} alt="Official Seal" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full border border-dashed border-blue-800 flex items-center justify-center text-[8px] font-bold text-blue-900 text-center uppercase p-1">
                          Official Seal & Stamp
                        </div>
                      )}
                      <span className="text-[8px] text-slate-400 mt-1">Institutional Seal</span>
                    </div>

                    <div>
                      <div className="w-28 border-b border-slate-600 mb-1"></div>
                      <p className="text-[9px] font-bold text-slate-800">{settings.principalName || 'Principal'}</p>
                      <p className="text-[8px] text-blue-900 font-semibold">Head of School</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 italic text-center pt-2 border-t border-slate-100">
                    * The stamp is dynamically positioned between teacher and principal signatures on all official certificates & report cards.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  {stampUrl
                    ? 'Official seal is actively stamped on certificates and reports.'
                    : 'Upload a stamp to affix it onto official certificates automatically.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
