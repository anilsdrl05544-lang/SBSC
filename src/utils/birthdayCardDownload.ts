import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Captures an HTML element into a Canvas using html2canvas with fallback to html-to-image
 */
export async function renderElementToCanvas(
  element: HTMLElement,
  scale: number = 2.5
): Promise<HTMLCanvasElement> {
  // Strategy 1: html2canvas
  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (el) =>
        el.classList?.contains('no-print') ||
        el.classList?.contains('print:hidden') ||
        el.getAttribute('aria-hidden') === 'true',
    });
    return canvas;
  } catch (err) {
    console.warn('html2canvas rendering failed, attempting html-to-image fallback:', err);
  }

  // Strategy 2: html-to-image
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: scale,
    backgroundColor: '#ffffff',
    skipFonts: true,
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains('no-print') ||
          node.classList.contains('print:hidden') ||
          node.getAttribute('aria-hidden') === 'true'
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Downloads greeting card element as PNG or JPEG image
 */
export async function downloadCardImage(
  element: HTMLElement,
  fileName: string,
  format: 'png' | 'jpeg' = 'png',
  scale: number = 2.5
): Promise<boolean> {
  try {
    const canvas = await renderElementToCanvas(element, scale);
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? 0.92 : 1.0);

    const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
    const finalName = safeFileName.toLowerCase().endsWith(`.${format}`)
      ? safeFileName
      : `${safeFileName}.${format}`;

    const link = document.createElement('a');
    link.download = finalName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Failed to download card image:', error);
    throw error;
  }
}

/**
 * Copies the card element image to the user's clipboard
 */
export async function copyCardImageToClipboard(
  element: HTMLElement,
  scale: number = 2
): Promise<boolean> {
  try {
    const canvas = await renderElementToCanvas(element, scale);

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Copy card image to clipboard failed:', err);
    return false;
  }
}

/**
 * Generates and downloads a clean A4/Letter PDF of the greeting card
 */
export async function downloadCardPdf(
  element: HTMLElement,
  fileName: string,
  celebrantName: string,
  schoolName: string = 'SBSC Public School'
): Promise<boolean> {
  try {
    const canvas = await renderElementToCanvas(element, 2.5);

    // Standard A4 portrait: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12; // 12mm margins
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    let targetWidth = printableWidth;
    let targetHeight = targetWidth / ratio;

    if (targetHeight > printableHeight) {
      targetHeight = printableHeight;
      targetWidth = targetHeight * ratio;
    }

    // Center on page
    const posX = margin + (printableWidth - targetWidth) / 2;
    const posY = margin + (printableHeight - targetHeight) / 2;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', posX, posY, targetWidth, targetHeight, undefined, 'FAST');

    // Add metadata
    pdf.setProperties({
      title: `Birthday Greeting Card - ${celebrantName}`,
      subject: `Official Birthday Felicitations from ${schoolName}`,
      author: schoolName,
      keywords: 'birthday, greeting, congratulations, school',
      creator: `${schoolName} Management Portal`,
    });

    const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
    const finalName = safeFileName.toLowerCase().endsWith('.pdf')
      ? safeFileName
      : `${safeFileName}.pdf`;

    pdf.save(finalName);
    return true;
  } catch (error) {
    console.error('Failed to download card PDF:', error);
    throw error;
  }
}
