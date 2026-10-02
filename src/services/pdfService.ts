import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  elementId?: string;
  element?: HTMLElement | null;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  onProgress?: (status: string) => void;
}

/**
 * Robust Multi-Engine PDF Exporter
 * - Handles large multi-page documents (like all-classes attendance reports) safely
 * - Slices canvas into discrete A4 pages to prevent browser memory exhaustion
 * - Guarantees direct file download via Blob URL
 * - Fallbacks between html2canvas and html-to-image
 */
export const exportElementToPdf = async (
  elementIdOrOptions: string | PdfExportOptions,
  fileNameParam?: string,
  orientationParam?: 'portrait' | 'landscape'
): Promise<boolean> => {
  let targetElement: HTMLElement | null = null;
  let fileName = 'SBSC-Official-Document.pdf';
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let onProgress: ((status: string) => void) | undefined;

  if (typeof elementIdOrOptions === 'string') {
    targetElement = document.getElementById(elementIdOrOptions);
    if (fileNameParam) fileName = fileNameParam;
    if (orientationParam) orientation = orientationParam;
  } else {
    targetElement =
      elementIdOrOptions.element ||
      (elementIdOrOptions.elementId ? document.getElementById(elementIdOrOptions.elementId) : null);
    if (elementIdOrOptions.fileName) fileName = elementIdOrOptions.fileName;
    if (elementIdOrOptions.orientation) orientation = elementIdOrOptions.orientation;
    onProgress = elementIdOrOptions.onProgress;
  }

  if (!targetElement) {
    console.error('Target element for PDF export was not found in the DOM');
    return false;
  }

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    fileName += '.pdf';
  }

  // Temporarily reset CSS transform on parent (zoom scaling inside PrintPreviewModal)
  const parent = targetElement.parentElement;
  const originalTransform = parent ? parent.style.transform : '';
  const originalTransformOrigin = parent ? parent.style.transformOrigin : '';
  if (parent && originalTransform) {
    parent.style.transform = 'none';
  }

  try {
    onProgress?.('Preparing document render...');

    const scrollWidth = Math.max(targetElement.scrollWidth, targetElement.offsetWidth, 1100);
    const scrollHeight = Math.max(targetElement.scrollHeight, targetElement.offsetHeight, 800);

    // Calculate safe scale factor so canvas height/width never exceeds browser limits (8192px max)
    const maxDimension = Math.max(scrollWidth, scrollHeight);
    let scale = 1.5;
    if (maxDimension * scale > 7200) {
      scale = Math.max(1, 7200 / maxDimension);
    }

    let sourceCanvas: HTMLCanvasElement | null = null;

    // Strategy 1: html2canvas (most resilient for complex multi-class data tables)
    try {
      onProgress?.('Capturing document pages...');
      sourceCanvas = await html2canvas(targetElement, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (el) =>
          el.classList?.contains('no-print') || el.getAttribute('aria-hidden') === 'true',
        logging: false,
        windowWidth: scrollWidth + 40,
      });
    } catch (h2cErr) {
      console.warn('html2canvas capture had an issue, attempting html-to-image fallback:', h2cErr);
    }

    // Strategy 2: html-to-image (fast SVG foreignObject renderer with skipFonts)
    if (!sourceCanvas) {
      onProgress?.('Rendering fallback document image...');
      const dataUrl = await toPng(targetElement, {
        quality: 0.95,
        pixelRatio: scale,
        backgroundColor: '#ffffff',
        skipFonts: true, // Prevents CORS errors on external fonts
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList?.contains('no-print')) {
            return false;
          }
          return true;
        },
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
      });

      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      const ctx = sourceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
        ctx.drawImage(img, 0, 0);
      }
    }

    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      throw new Error('Canvas render produced an empty image');
    }

    onProgress?.('Composing A4 document pages...');

    // Initialize jsPDF document
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    // Mathematical page slicing: calculate slice height in canvas pixels based on A4 ratio
    const a4Ratio = pdfHeight / pdfWidth;
    const pageCanvasHeight = Math.floor(sourceCanvas.width * a4Ratio);

    // Check if the document is close to 1 page (up to 25% over)
    // For official school documents (timetables, date sheets, admit cards, fee receipts, marksheets),
    // fitting onto 1 single clean page prevents ugly splits where a row or signatures are cut in half.
    const isCloseToSinglePage = sourceCanvas.height <= pageCanvasHeight * 1.25;

    if (isCloseToSinglePage) {
      onProgress?.('Fitting document cleanly to single A4 page...');
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = sourceCanvas.width;
      pageCanvas.height = Math.max(sourceCanvas.height, pageCanvasHeight);
      const pageCtx = pageCanvas.getContext('2d');

      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(sourceCanvas, 0, 0);

        const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        // Calculate proportional height in mm so nothing is stretched or distorted
        const renderHeightMm = Math.min(
          pdfHeight,
          (sourceCanvas.height / pageCanvas.width) * pdfWidth
        );
        pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, renderHeightMm, undefined, 'FAST');
      }
    } else {
      // Smart Multi-Page Slicing: Prevents cutting through table rows or text!
      onProgress?.('Calculating clean page breaks...');

      // Find all DOM elements that should not be sliced in the middle
      const avoidBreakRanges: { top: number; bottom: number }[] = [];
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const avoidEls = targetElement.querySelectorAll(
          'tr, .avoid-break, .break-inside-avoid, header, footer, .signature-block, .rules-block, table thead, table tbody'
        );
        avoidEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 0) {
            const top = Math.floor((r.top - targetRect.top) * scale);
            const bottom = Math.ceil((r.bottom - targetRect.top) * scale);
            avoidBreakRanges.push({ top, bottom });
          }
        });
      }

      let currentSourceY = 0;
      let pageIdx = 0;

      while (currentSourceY < sourceCanvas.height) {
        onProgress?.(`Composing page ${pageIdx + 1}...`);
        const remainingHeight = sourceCanvas.height - currentSourceY;
        let sliceHeight = Math.min(pageCanvasHeight, remainingHeight);

        // If not the last page, adjust sliceHeight so it does NOT cut through an avoidBreak element
        if (currentSourceY + sliceHeight < sourceCanvas.height) {
          const proposedSplitY = currentSourceY + sliceHeight;

          // Look for any element that straddles proposedSplitY
          const straddlingRange = avoidBreakRanges.find(
            (rng) => rng.top < proposedSplitY && rng.bottom > proposedSplitY
          );

          if (straddlingRange) {
            // Cut right before this element starts (with a tiny 4px buffer)
            const safeSplitY = straddlingRange.top - Math.floor(4 * scale);
            // Ensure this doesn't backtrack too much (must make at least 45% of page progress)
            if (safeSplitY > currentSourceY + pageCanvasHeight * 0.45) {
              sliceHeight = safeSplitY - currentSourceY;
            }
          }
        }

        // Draw this slice on an A4 page canvas
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = sourceCanvas.width;
        pageCanvas.height = pageCanvasHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvasHeight);
          pageCtx.drawImage(
            sourceCanvas,
            0,
            currentSourceY,
            sourceCanvas.width,
            sliceHeight,
            0,
            0,
            sourceCanvas.width,
            sliceHeight
          );

          const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.93);
          if (pageIdx > 0) {
            pdf.addPage('a4', orientation);
          }
          const renderHeightMm = (sliceHeight / pageCanvasHeight) * pdfHeight;
          pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, renderHeightMm, undefined, 'FAST');
        }

        currentSourceY += sliceHeight;
        pageIdx++;
      }
    }

    onProgress?.('Finalizing PDF download...');

    // Direct, reliable file download via Blob URL
    try {
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 2500);
    } catch {
      // Fallback to jsPDF internal save
      pdf.save(fileName);
    }

    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    // Fallback: trigger print dialog for Save as PDF
    printReportDirectly(targetElement, orientation);
    return false;
  } finally {
    // Restore parent transform
    if (parent && originalTransform) {
      parent.style.transform = originalTransform;
      parent.style.transformOrigin = originalTransformOrigin;
    }
  }
};

/**
 * Dedicated Print Helper
 * Sets proper landscape/portrait print classes and triggers browser print
 */
export const printReportDirectly = async (
  elementOrId?: HTMLElement | string | null,
  orientation: 'portrait' | 'landscape' = 'portrait'
) => {
  if (orientation === 'landscape') {
    document.body.classList.add('landscape-print');
  } else {
    document.body.classList.remove('landscape-print');
  }

  // Find target element
  let targetElement: HTMLElement | null = null;
  if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  } else if (elementOrId instanceof HTMLElement) {
    targetElement = elementOrId;
  } else {
    targetElement = document.getElementById('printable-document-content');
  }

  // If a specific printable document container exists, print through a dedicated clean frame
  if (targetElement) {
    try {
      const existingIframe = document.getElementById('sbsc-pdf-print-iframe');
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'sbsc-pdf-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-99999';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((s) => s.outerHTML)
          .join('\n');

        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Print Document - SBSC</title>
              ${styleTags}
              <style>
                @page { size: A4 ${orientation}; margin: 8mm; }
                *, *::before, *::after {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body { background: white !important; padding: 0 !important; margin: 0 !important; color: black !important; }
                .no-print { display: none !important; }
                .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                tr, tbody tr, .avoid-break, .break-inside-avoid, .signature-block, .rules-block, table {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
                table { border-collapse: collapse !important; }
                thead { display: table-header-group !important; }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${targetElement.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        await new Promise((r) => setTimeout(r, 400));
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            iframe.remove();
          }, 2500);
          return;
        }
      }
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
    }
  }

  // Fallback: temporary print style in main window
  const styleId = 'sbsc-a4-temporary-print-style';
  let tempStyle = document.getElementById(styleId);
  if (!tempStyle) {
    tempStyle = document.createElement('style');
    tempStyle.id = styleId;
    document.head.appendChild(tempStyle);
  }
  tempStyle.innerHTML = `
    @page { size: A4 ${orientation}; margin: 8mm; }
    @media print {
      body * { visibility: hidden !important; }
      #printable-document-content, #printable-document-content * { visibility: visible !important; }
      #printable-document-content {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `;
  try {
    window.print();
  } finally {
    setTimeout(() => tempStyle?.remove(), 2000);
  }
};

/**
 * Opens report in a clean standalone window/tab for foolproof printing
 */
export const openReportInNewWindow = (
  elementId = 'printable-document-content',
  orientation: 'portrait' | 'landscape' = 'portrait',
  title = 'SBSC Official Document'
): boolean => {
  const el = document.getElementById(elementId);
  if (!el) return false;

  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((s) => s.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank', 'width=900,height=800,menubar=no,toolbar=no,location=no');
  if (!printWindow) {
    alert('Pop-up window was blocked. Please allow popups to open the print view.');
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styleTags}
        <style>
          @page { size: A4 ${orientation}; margin: 8mm; }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff !important;
            padding: 16px !important;
            margin: 0 !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return true;
};

export const exportTableToCsv = (filename: string, rows: (string | number)[][]) => {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        const str = String(val ?? '');
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(processRow).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
