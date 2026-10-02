import { FeePayment, Student, ClassInfo, SchoolSettings } from '../types/school';
import { numberToWordsIndian } from '../utils/numberToWords';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';

export interface ThermalPrintOptions {
  paperWidthMm: 80 | 58;
  elementId?: string;
  autoClose?: boolean;
}

/**
 * Generate isolated HTML for the thermal receipt
 */
const buildThermalHtml = (sourceHtml: string, widthMm: 80 | 58): string => {
  const printableWidthMm = widthMm === 58 ? 48 : 72;
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>POS-Thermal-Receipt</title>
        ${styleTags}
        <style>
          @page {
            size: ${widthMm}mm auto;
            margin: 0mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: ${widthMm}mm !important;
            max-width: ${widthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, sans-serif !important;
          }
          .thermal-receipt-container {
            width: ${printableWidthMm}mm !important;
            max-width: ${printableWidthMm}mm !important;
            margin: 0 auto !important;
            padding: 1mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="thermal-receipt-container">
          ${sourceHtml}
        </div>
      </body>
    </html>
  `;
};

/**
 * Direct POS Thermal Printer dispatch.
 * Uses a non-hidden off-screen iframe, and falls back to window.print() or popup window
 * if the browser or iframe sandbox blocks child iframe printing.
 */
export const printThermalReceiptById = async (
  elementId: string,
  paperWidthMm: 80 | 58 = 58
): Promise<{ success: boolean; fallbackUsed?: string; message?: string }> => {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.error(`Thermal print target #${elementId} not found`);
    return { success: false, message: 'Receipt element not found in DOM' };
  }

  // Tier 1: Try printing via an off-screen iframe
  try {
    const existingIframe = document.getElementById('thermal-print-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    // Position within viewport but invisible, avoiding visibility:hidden or 0x0 size
    // which prevents modern browsers from rendering print content
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.zIndex = '-99999';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error('Failed to access iframe document');
    }

    doc.open();
    doc.write(buildThermalHtml(sourceEl.innerHTML, paperWidthMm));
    doc.close();

    await new Promise((r) => setTimeout(r, 300));

    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        iframe.remove();
      }, 2000);
      return { success: true };
    }
  } catch (err) {
    console.warn('Iframe print failed or was restricted, attempting direct print fallback:', err);
  }

  // Tier 2: Direct body print fallback (works even in sandboxed environments)
  return directBodyPrintThermal(elementId, paperWidthMm);
};

/**
 * Fallback direct print: Injects temporary CSS into current document to print ONLY the receipt
 */
export const directBodyPrintThermal = (
  elementId: string,
  paperWidthMm: 80 | 58 = 58
): { success: boolean; fallbackUsed: string; message: string } => {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    return { success: false, fallbackUsed: 'direct', message: 'Element not found' };
  }

  const styleId = 'thermal-direct-print-temporary-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const printableWidthMm = paperWidthMm === 58 ? 48 : 72;

  styleEl.innerHTML = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #${elementId}, #${elementId} * {
        visibility: visible !important;
      }
      #${elementId} {
        position: fixed !important;
        left: 50% !important;
        top: 0 !important;
        transform: translateX(-50%) !important;
        width: ${printableWidthMm}mm !important;
        max-width: ${printableWidthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        box-shadow: none !important;
        border: none !important;
      }
      @page {
        size: ${paperWidthMm}mm auto !important;
        margin: 0mm !important;
      }
    }
  `;

  try {
    window.print();
    setTimeout(() => {
      styleEl?.remove();
    }, 1500);
    return { success: true, fallbackUsed: 'direct-window-print', message: 'Triggered system print dialog' };
  } catch (printErr: unknown) {
    styleEl.remove();
    console.error('Direct window.print error:', printErr);
    return { success: false, fallbackUsed: 'direct-window-print', message: 'Direct print was blocked by browser' };
  }
};

/**
 * Open standalone Print Window / Tab (Bypasses iframe sandboxes)
 */
export const openThermalPrintWindow = (
  elementId: string,
  paperWidthMm: 80 | 58 = 58
): boolean => {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) return false;

  const html = buildThermalHtml(sourceEl.innerHTML, paperWidthMm);
  const printWindow = window.open('', '_blank', 'width=450,height=650,toolbar=no,location=no,status=no,menubar=no');
  if (!printWindow) {
    alert('Pop-up window was blocked. Please allow popups or use Direct Print.');
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  return true;
};

/**
 * Direct USB Serial Print for TVS MP-280 Lite (Chrome / Edge on Windows/Mac/Linux)
 */
export const printViaWebSerial = async (
  rawText: string
): Promise<{ success: boolean; message: string }> => {
  const nav = navigator as unknown as {
    serial?: {
      requestPort: () => Promise<{
        open: (opt: { baudRate: number }) => Promise<void>;
        writable: {
          getWriter: () => {
            write: (data: Uint8Array) => Promise<void>;
            releaseLock: () => void;
          };
        };
        close: () => Promise<void>;
      }>;
    };
  };

  if (!nav.serial) {
    return {
      success: false,
      message: 'Web Serial is not supported in this browser. Please use Google Chrome or Microsoft Edge on PC.',
    };
  }

  try {
    const port = await nav.serial.requestPort();
    // TVS MP-280 Lite default baud rate is usually 9600 (or 115200 for high-speed USB)
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const encoder = new TextEncoder();
    // ESC @ to initialize printer
    const initCmd = new Uint8Array([0x1b, 0x40]);
    await writer.write(initCmd);
    await writer.write(encoder.encode(rawText));
    // Cut feed
    await writer.write(new Uint8Array([0x1b, 0x64, 0x03]));
    writer.releaseLock();
    await port.close();

    return {
      success: true,
      message: 'Receipt sent directly to USB printer!',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'USB Serial print error';
    return {
      success: false,
      message: errMsg.includes('No port selected') ? 'No USB device selected' : errMsg,
    };
  }
};

/**
 * Print via Android RawBT Mobile App (Universal Bluetooth printer connector for TVS MP-280 Lite, etc.)
 */
export const printViaRawBt = (rawText: string): boolean => {
  try {
    const base64Data = btoa(unescape(encodeURIComponent(rawText)));
    const rawBtUrl = `rawbt:data:base64,${base64Data}`;

    const link = document.createElement('a');
    link.href = rawBtUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
    return true;
  } catch (err) {
    console.error('RawBT print error:', err);
    return false;
  }
};

/**
 * Direct Web Bluetooth ESC/POS Print for TVS MP-280 Lite & Bluetooth Thermal Printers
 */
export const printViaWebBluetooth = async (
  rawText: string
): Promise<{ success: boolean; message: string }> => {
  const nav = navigator as unknown as { bluetooth?: { requestDevice: (opt: unknown) => Promise<unknown> } };
  if (!nav.bluetooth) {
    return {
      success: false,
      message: 'Web Bluetooth is not supported in this browser. Please use Chrome/Edge or "Direct Print" / "RawBT".',
    };
  }

  try {
    const optionalServices = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000fff0-0000-1000-8000-00805f9b34fb',
    ];

    let device: {
      name?: string;
      gatt?: {
        connect: () => Promise<{
          getPrimaryServices: () => Promise<
            Array<{
              getCharacteristics: () => Promise<
                Array<{
                  properties: { write?: boolean; writeWithoutResponse?: boolean };
                  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
                  writeValue?: (data: BufferSource) => Promise<void>;
                }>
              >;
            }>
          >;
        }>;
      };
    };

    try {
      // First try acceptAllDevices so user can select any paired TVS or Bluetooth printer
      device = (await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      })) as typeof device;
    } catch {
      // Fallback with prefix filters if acceptAllDevices is rejected
      device = (await nav.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'MP' },
          { namePrefix: 'TVS' },
          { namePrefix: 'POS' },
          { namePrefix: 'MPT' },
          { namePrefix: 'RP' },
          { namePrefix: 'BT' },
          { namePrefix: 'Printer' },
        ],
        optionalServices,
      })) as typeof device;
    }

    if (!device.gatt) {
      throw new Error('Bluetooth GATT connection is not available on this printer.');
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let writeChar: {
      properties: { write?: boolean; writeWithoutResponse?: boolean };
      writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
      writeValue?: (data: BufferSource) => Promise<void>;
    } | null = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('Writable printer characteristic not found on TVS MP-280 Lite');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(rawText);
    const chunkSize = 80;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (writeChar.properties.writeWithoutResponse && writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else if (writeChar.writeValue) {
        await writeChar.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 25));
    }

    return {
      success: true,
      message: `Successfully printed to ${device.name || 'TVS MP-280 Lite'}!`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Bluetooth printing cancelled or failed.';
    console.error('Web Bluetooth error:', err);
    return {
      success: false,
      message: errMsg.includes('cancelled') ? 'Bluetooth pairing was cancelled.' : errMsg,
    };
  }
};

/**
 * Export receipt as high-resolution PNG image
 */
export const exportThermalSlipAsImage = async (
  elementId: string,
  fileName = 'Thermal-Receipt.png'
): Promise<boolean> => {
  const el = document.getElementById(elementId);
  if (!el) return false;

  try {
    let dataUrl: string;
    try {
      dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
    } catch {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      dataUrl = canvas.toDataURL('image/png');
    }

    const link = document.createElement('a');
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
    return true;
  } catch (err) {
    console.error('Export image error:', err);
    return false;
  }
};

/**
 * Formats ESC/POS raw text slip for 80mm (42 columns) or 58mm (32 columns).
 * Ideal for Bluetooth thermal mobile printers, RawBT, or USB serial printers.
 */
export const generateThermalPlainText = (
  payment: FeePayment,
  student?: Student | null,
  classInfo?: ClassInfo | null,
  settings?: SchoolSettings | null,
  copyType: 'STUDENT COPY' | 'OFFICE COPY' = 'STUDENT COPY',
  paperWidthMm: 80 | 58 = 80
): string => {
  const cols = paperWidthMm === 58 ? 32 : 44;
  const line = '-'.repeat(cols);
  const doubleLine = '='.repeat(cols);

  const center = (text: string): string => {
    const trimmed = text.slice(0, cols);
    const pad = Math.max(0, Math.floor((cols - trimmed.length) / 2));
    return ' '.repeat(pad) + trimmed;
  };

  const row = (left: string, right: string): string => {
    const space = Math.max(1, cols - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const schoolName = settings?.schoolName || 'S.B.S.C. PUBLIC SCHOOL';
  const branch = settings?.address || 'Bairwa Nankar, Shohratgarh, Siddharthnagar';
  const phone = settings?.phone ? `Mob: ${settings.phone}` : '';
  const aff = settings?.affiliationNo ? `CBSE Aff: ${settings.affiliationNo}` : '';

  const lines: string[] = [];

  // Header
  lines.push(doubleLine);
  lines.push(center(schoolName.toUpperCase()));
  if (branch) lines.push(center(branch));
  if (phone || aff) lines.push(center([phone, aff].filter(Boolean).join(' | ')));
  lines.push(line);
  lines.push(center(`FEE RECEIPT [${copyType}]`));
  lines.push(line);

  // Meta Info
  lines.push(row(`Receipt: ${payment.receiptNo}`, `Date: ${payment.date}`));
  lines.push(row(`Student: ${payment.studentName.toUpperCase()}`, `Roll: ${student?.rollNo || '-'}`));
  lines.push(row(`Adm No: ${payment.admissionNo}`, `Class: ${classInfo?.name || payment.classId}-${payment.section}`));
  if (student?.fatherName) {
    lines.push(`Father: ${student.fatherName}`);
  }
  if (payment.monthsPaid && payment.monthsPaid.length > 0) {
    lines.push(`Period: ${payment.monthsPaid.join(', ')}`);
  }
  lines.push(line);

  // Fee Breakdown
  lines.push(row('Particulars', 'Amount'));
  lines.push(line);
  payment.feeHeadBreakdown.forEach((item) => {
    lines.push(row(item.head, `Rs. ${item.amount.toFixed(2)}`));
  });

  if (payment.discount > 0) {
    lines.push(row('Concession / Disc.', `- Rs. ${payment.discount.toFixed(2)}`));
  }
  if (payment.fine > 0) {
    lines.push(row('Late Fine', `+ Rs. ${payment.fine.toFixed(2)}`));
  }

  lines.push(doubleLine);
  lines.push(row('TOTAL PAID:', `Rs. ${payment.amountPaid.toFixed(2)}`));
  lines.push(doubleLine);

  // Words
  lines.push(numberToWordsIndian(payment.amountPaid));
  lines.push(line);

  // Payment Mode
  lines.push(row('Payment Mode:', payment.paymentMethod.toUpperCase()));
  if (payment.transactionRef) {
    lines.push(row('Txn/UPI Ref:', payment.transactionRef));
  }
  lines.push(row('Balance Remaining:', `Rs. ${payment.balanceRemaining.toFixed(2)}`));
  lines.push(line);

  // Footer & Signatures
  lines.push('');
  lines.push(row('Seal / Stamp', 'Cashier / Acc.'));
  lines.push(row('', payment.receivedBy || 'Authorized Sign'));
  lines.push('');
  lines.push(center('** THANK YOU **'));
  lines.push(center('Fee once paid is not refundable.'));
  lines.push(center('Computer Generated Tax/Fee Slip'));
  lines.push(line);
  lines.push('');
  lines.push('\x1b\x64\x03'); // ESC/POS feed 3 lines & cut hint

  return lines.join('\n');
};
