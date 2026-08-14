import { generateBarcode } from './barcode';
import { useProductStore } from '../store/productStore';
import { useLabelStore } from '../store/labelStore';
import type { LabelElement, BarcodeElement, TextElement, ShapeElement } from '../types/label';

export function resolvePreviewText(raw: string): string {
  const products = useProductStore.getState().products;
  const previewId = useLabelStore.getState().previewProductId;
  const picked = previewId ? products.find((p) => p.id === previewId) : undefined;
  const first = picked ?? products[0];
  let t = raw;
  if (first) {
    t = t.split('{PRODUCT_NAME}').join(first.name);
    t = t.split('{PRODUCT}').join(first.barcode);
  } else {
    t = t.split('{PRODUCT_NAME}').join('Product Name');
    t = t.split('{PRODUCT}').join('123456');
  }
  t = t.replace(/\{N(?::([^}]+))?\}/g, (_, fmt) =>
    fmt ? String(1).padStart(parseInt(fmt) || 6, '0') : '1'
  );
  return t;
}

export async function renderElementsToDataUrl(
  elements: LabelElement[],
  serialNumber?: number,
  serialFormat?: string,
  variables?: Record<string, string>
): Promise<string | null> {
  const visible = elements.filter((e) => e.visible);
  if (visible.length === 0) return null;

  const sorted = [...visible].sort((a, b) => a.zIndex - b.zIndex);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of visible) {
    minX = Math.min(minX, el.left);
    minY = Math.min(minY, el.top);
    maxX = Math.max(maxX, el.left + el.width);
    maxY = Math.max(maxY, el.top + el.height);
  }
  const pad = 8;
  const cw = Math.round(maxX - minX + pad * 2);
  const ch = Math.round(maxY - minY + pad * 2);

  const offscreen = document.createElement('canvas');
  offscreen.width = cw * 2;
  offscreen.height = ch * 2;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, cw, ch);

  const ox = -minX + pad;
  const oy = -minY + pad;

  function resolveText(raw: string): string {
    let t = raw;
    if (serialNumber !== undefined && serialFormat) {
      t = t.replace(/\{N(?::([^}]+))?\}/g, (_, fmt) => {
        return fmt
          ? serialNumber.toString().padStart(parseInt(fmt) || 6, '0')
          : String(serialNumber);
      });
    }
    if (variables) {
      for (const [key, val] of Object.entries(variables)) {
        t = t.split(`{${key}}`).join(val);
      }
    }
    if (/\{/.test(t)) {
      t = resolvePreviewText(t);
    }
    return t;
  }

  for (const el of sorted) {
    try {
      const l = el.left + ox;
      const t = el.top + oy;
      const cx = l + el.width / 2;
      const cy = t + el.height / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      if (el.type === 'barcode') {
        const be = el as BarcodeElement;
        const barcodeText = resolveText(be.text);
        const dataUrl = await generateBarcode(be.format, barcodeText, be.scale, be.barHeight, be.includeText, be.background);
        if (dataUrl) {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = dataUrl;
          });
          ctx.drawImage(img, l, t, el.width, el.height);
        }
      } else if (el.type === 'text') {
        const te = el as TextElement;
        ctx.save();
        ctx.beginPath();
        ctx.rect(l, t, el.width, el.height);
        ctx.clip();
        ctx.fillStyle = te.fill;
        const ff = te.fontFamily.includes(' ') ? `"${te.fontFamily}"` : te.fontFamily;
        ctx.font = `${te.fontStyle} ${te.fontWeight} ${te.fontSize}px ${ff}`;
        ctx.textBaseline = 'top';

        const lines = resolveText(te.content).split('\n');
        const lh = te.fontSize * 1.2;
        for (let i = 0; i < lines.length; i++) {
          const lineY = t + i * lh;
          if (lineY + te.fontSize > t + el.height) break;
          const lineX = te.textAlign === 'center' ? l + el.width / 2
                      : te.textAlign === 'right' ? l + el.width : l;
          ctx.textAlign = te.textAlign || 'left';
          ctx.fillText(lines[i], lineX, lineY);
          if (te.underline) {
            const ulw = ctx.measureText(lines[i]).width;
            const ulx = te.textAlign === 'center' ? l + el.width / 2 - ulw / 2
                      : te.textAlign === 'right' ? l + el.width - ulw : l;
            ctx.fillRect(ulx, lineY + te.fontSize + 2, ulw, 1);
          }
        }
        ctx.restore();
      } else if (el.type === 'shape') {
        const se = el as ShapeElement;
        ctx.fillStyle = se.fill !== 'transparent' ? se.fill : 'rgba(0,0,0,0)';
        ctx.strokeStyle = se.stroke;
        ctx.lineWidth = se.strokeWidth;
        if (se.shapeType === 'rectangle') {
          if (se.rx || se.ry) {
            ctx.beginPath();
            const r = Math.max(se.rx || 0, se.ry || 0);
            if (ctx.roundRect) {
              ctx.roundRect(l, t, el.width, el.height, r);
            } else {
              ctx.rect(l, t, el.width, el.height);
            }
            if (se.fill !== 'transparent') ctx.fill();
            if (se.strokeWidth > 0) ctx.stroke();
          } else {
            if (se.fill !== 'transparent') ctx.fillRect(l, t, el.width, el.height);
            if (se.strokeWidth > 0) ctx.strokeRect(l, t, el.width, el.height);
          }
        } else if (se.shapeType === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(l + el.width / 2, t + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
          if (se.fill !== 'transparent') ctx.fill();
          if (se.strokeWidth > 0) ctx.stroke();
        }
      }
      ctx.restore();
    } catch (e) {
      console.error('Render error for element', el.id, e);
    }
  }

  return offscreen.toDataURL('image/png');
}
