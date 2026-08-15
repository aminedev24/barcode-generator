import { jsPDF } from 'jspdf';

interface PageComposeOptions {
  pageDataUrls: string[];
  cols: number;
  rows: number;
  paperWmm: number;
  paperHmm: number;
  labelWmm: number;
  labelHmm: number;
  gapMm: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const DPI = 200;

export async function composePagesToPdf(opts: PageComposeOptions): Promise<string> {
  const { pageDataUrls, cols, rows, paperWmm, paperHmm, labelWmm, labelHmm, gapMm } = opts;
  const pageW = Math.round((paperWmm / 25.4) * DPI);
  const pageH = Math.round((paperHmm / 25.4) * DPI);
  const cellWmm = (paperWmm - (cols - 1) * gapMm) / cols;
  const cellHmm = (paperHmm - (rows - 1) * gapMm) / rows;
  const labelsPerPage = cols * rows;
  const totalPages = Math.ceil(pageDataUrls.length / labelsPerPage);

  const pdf = new jsPDF({
    orientation: paperWmm > paperHmm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paperWmm, paperHmm],
    compress: true,
  });

  for (let p = 0; p < totalPages; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = pageW;
    canvas.height = pageH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageW, pageH);

    const start = p * labelsPerPage;
    const end = Math.min(start + labelsPerPage, pageDataUrls.length);
    for (let i = start; i < end; i++) {
      const idx = i - start;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const img = await loadImage(pageDataUrls[i]);
      const xmm = col * (labelWmm + gapMm) + (cellWmm - labelWmm) / 2;
      const ymm = row * (labelHmm + gapMm) + (cellHmm - labelHmm) / 2;
      const x = (xmm / 25.4) * DPI;
      const y = (ymm / 25.4) * DPI;
      const w = (labelWmm / 25.4) * DPI;
      const h = (labelHmm / 25.4) * DPI;
      ctx.drawImage(img, x, y, w, h);
    }

    if (p > 0) {
      pdf.addPage(
        [paperWmm, paperHmm],
        paperWmm > paperHmm ? 'landscape' : 'portrait'
      );
    }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, paperWmm, paperHmm);
  }

  return pdf.output('datauristring');
}
