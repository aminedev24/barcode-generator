import {
  MultiFormatReader,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  DecodeHintType,
  BarcodeFormat as ZXingFormat,
} from '@zxing/library';

export interface ScannedItem {
  value: string;
  count: number;
}

const DECODABLE_FORMATS = [
  ZXingFormat.QR_CODE,
  ZXingFormat.DATA_MATRIX,
  ZXingFormat.CODE_128,
  ZXingFormat.CODE_39,
  ZXingFormat.CODE_93,
  ZXingFormat.EAN_13,
  ZXingFormat.EAN_8,
  ZXingFormat.UPC_A,
  ZXingFormat.UPC_E,
  ZXingFormat.ITF,
  ZXingFormat.PDF_417,
];

function rgbaToGrayscale(imageData: ImageData): Uint8ClampedArray {
  const w = imageData.width;
  const h = imageData.height;
  const gray = new Uint8ClampedArray(w * h);
  const d = imageData.data;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    gray[j] =
      (d[i] * 306 + d[i + 1] * 601 + d[i + 2] * 117 + 0x200) >> 10;
  }
  return gray;
}

export function decodeImageData(imageData: ImageData): string[] {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, DECODABLE_FORMATS);

  const reader = new MultiFormatReader();
  reader.setHints(hints);

  const w = imageData.width;
  const h = imageData.height;
  const data = rgbaToGrayscale(imageData);
  const values: string[] = [];
  const MAX_BARCODES = 8;

  for (let iter = 0; iter < MAX_BARCODES; iter++) {
    const luminance = new RGBLuminanceSource(data, w, h);
    const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
    let result;
    try {
      result = reader.decode(bitmap);
    } catch {
      break;
    }
    const text = result.getText().trim();
    if (text && !values.includes(text)) values.push(text);

    const points = result.getResultPoints();
    if (!points || points.length === 0) break;
    const xs = points.map((p) => p.getX());
    const ys = points.map((p) => p.getY());
    const minX = Math.max(0, Math.floor(Math.min(...xs)) - 10);
    const maxX = Math.min(w, Math.ceil(Math.max(...xs)) + 10);
    const minY = Math.max(0, Math.floor(Math.min(...ys)) - 10);
    const maxY = Math.min(h, Math.ceil(Math.max(...ys)) + 10);
    for (let y = minY; y < maxY; y++) {
      data.fill(255, y * w + minX, y * w + maxX);
    }
  }

  return values;
}

export async function decodeFromImageUrl(url: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const base = document.createElement('canvas');
        base.width = img.naturalWidth;
        base.height = img.naturalHeight;
        const bctx = base.getContext('2d');
        if (!bctx) {
          resolve([]);
          return;
        }
        bctx.drawImage(img, 0, 0);

        const found = new Set<string>();
        const attempts: { scale: number }[] = [{ scale: 1 }];
        if (img.naturalWidth > 3200 || img.naturalHeight > 3200) {
          attempts.push({ scale: 0.5 });
        }
        if (img.naturalWidth < 1600) {
          attempts.push({ scale: 2 });
          attempts.push({ scale: 3 });
        }

        for (const { scale } of attempts) {
          const w = Math.round(base.width * scale);
          const h = Math.round(base.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(base, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          for (const value of decodeImageData(imageData)) {
            found.add(value);
          }
        }

        resolve([...found]);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export function exportScanCSV(
  items: ScannedItem[],
  productNames: Map<string, string>
): void {
  const header = 'Product Name,Barcode Value,Occurrences';
  const rows = items.map((it) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      escape(productNames.get(it.value) ?? ''),
      escape(it.value),
      it.count,
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode-scan-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
