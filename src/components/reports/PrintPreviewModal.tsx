import React, { useState, useEffect } from 'react';
import { X, Printer, Download, ZoomIn, ZoomOut, Check, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { exportElementToPdf, printReportDirectly, openReportInNewWindow } from '../../services/pdfService';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  onSwitchToThermal?: () => void;
  autoPrint?: boolean;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName = 'SBSC-Official-Document.pdf',
  orientation = 'portrait',
  onSwitchToThermal,
  autoPrint = false,
  children,
}) => {
  const [zoom, setZoom] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setErrorMessage(null);
    setExportStatus('Starting PDF export...');

    try {
      const success = await exportElementToPdf({
        elementId: 'printable-document-content',
        fileName,
        orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        onProgress: (status) => setExportStatus(status),
      });

      if (success) {
        setExportSuccess(true);
        setExportStatus('PDF Downloaded successfully!');
        setTimeout(() => {
          setExportSuccess(false);
          setExportStatus('');
        }, 4000);
      } else {
        setErrorMessage(
          'Direct canvas export was blocked by browser memory. We have opened the native Print dialog where you can select "Save as PDF".'
        );
      }
    } catch (err: unknown) {
      console.error('PDF export error:', err);
      setErrorMessage(
        'Export encountered an issue. Click "Print / Save PDF" to save directly using the system print dialog.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printReportDirectly('printable-document-content', orientation === 'landscape' ? 'landscape' : 'portrait');
  };

  const handleOpenNewWindow = () => {
    openReportInNewWindow('printable-document-content', orientation === 'landscape' ? 'landscape' : 'portrait', title);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Toolbar Header */}
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <h3 className="font-bold text-white text-xs sm:text-sm md:text-base flex items-center gap-2 truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-700/60 rounded-lg p-0.5 border border-slate-600">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-600 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-slate-300 min-w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(150, z + 10))}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-600 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal POS Button */}
            {onSwitchToThermal && (
              <button
                onClick={onSwitchToThermal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer"
                title="Switch to POS Thermal Receipt Slip (80mm/58mm)"
              >
                <Printer className="w-4 h-4 text-emerald-200" />
                <span>Thermal POS</span>
              </button>
            )}

            {/* Open in New Window / Tab for 100% Reliable Print */}
            <button
              onClick={handleOpenNewWindow}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-medium text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Open full page in standalone tab/window (bypasses iframe restrictions)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
              <span>New Window</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition active:scale-95 cursor-pointer"
              title="Print document or select 'Save as PDF' from browser print window"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4</span>
            </button>

            {/* Direct Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-60 cursor-pointer"
              title="Download consolidated PDF directly to your device"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : exportSuccess ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? exportStatus || 'Generating...' : exportSuccess ? 'Downloaded!' : 'Download PDF'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Notification Bar (Export Status & Fallback Alerts) */}
        {isExporting && (
          <div className="bg-blue-900/90 text-blue-100 px-4 py-2 text-xs flex items-center justify-between border-b border-blue-800 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
              <span className="font-semibold">{exportStatus || 'Generating high-resolution multi-page PDF...'}</span>
            </div>
            <span className="text-[11px] text-blue-300">Processing all class ledgers... Please wait</span>
          </div>
        )}

        {exportSuccess && (
          <div className="bg-emerald-900/90 text-emerald-100 px-4 py-2 text-xs flex items-center gap-2 border-b border-emerald-800">
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-bold">✓ PDF has been downloaded successfully to your downloads folder! ({fileName})</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-amber-950/90 text-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-2 border-b border-amber-800 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-blue-950 px-3 py-1 rounded font-bold text-xs"
            >
              Open Print / Save PDF
            </button>
          </div>
        )}

        {/* Paper Document Preview Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-950 flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-200"
          >
            <div id="printable-document-content" className="bg-white rounded-md shadow-2xl text-slate-900">
              {children}
            </div>
          </div>
        </div>

        {/* Modal Status Footer */}
        <div className="bg-slate-800/80 border-t border-slate-700 px-4 py-2 text-[11px] text-slate-400 flex justify-between items-center flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Official Institutional Document • SBSC Public School</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-400">Orientation: {orientation.toUpperCase()} (A4 Standard)</span>
            <span className="text-slate-500">|</span>
            <button
              onClick={handlePrint}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
            >
              Print / Save System Dialog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
