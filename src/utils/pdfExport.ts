import { jsPDF } from 'jspdf';

function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function exportToPDF(_template: unknown, dataUrl: string) {
  const { w, h } = await getImageSize(dataUrl);
  const dpr = 2;
  const mmW = (w / dpr) * 0.264583;
  const mmH = (h / dpr) * 0.264583;

  const pdf = new jsPDF({
    orientation: mmW > mmH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [mmW + 2, mmH + 2],
  });

  pdf.addImage(dataUrl, 'PNG', 1, 1, mmW, mmH);
  pdf.save('barcode.pdf');
}

export async function printLabel(dataUrl: string) {
  const { w, h } = await getImageSize(dataUrl);

  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup blocked. Please allow popups for printing.');
    return;
  }

  const mmW = (w / 2) * 0.264583;
  const mmH = (h / 2) * 0.264583;

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Print Label</title>
    <style>
      @page { size: ${mmW}mm ${mmH}mm; margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
      }
      @media print {
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      }
    </style>
    </head>
    <body>
      <img src="${dataUrl}" />
      <script>
        window.onload = function() { window.print(); window.close(); };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}
