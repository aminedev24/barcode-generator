import bwipjs from 'bwip-js';
import type { BarcodeFormat } from '../types/label';

export async function generateBarcodeCanvas(
  format: BarcodeFormat,
  text: string,
  scale: number,
  height: number,
  includeText: boolean,
  background: string
): Promise<HTMLCanvasElement | null> {
  if (!text) return null;

  try {
    const canvas = document.createElement('canvas');
    await bwipjs.toCanvas(canvas, {
      bcid: format,
      text,
      scale,
      height,
      includetext: includeText,
      backgroundcolor: background,
      textxalign: 'center',
    });
    return canvas;
  } catch (err) {
    console.error('Barcode generation error:', err);
    return null;
  }
}

export async function generateBarcode(
  format: BarcodeFormat,
  text: string,
  scale: number,
  height: number,
  includeText: boolean,
  background: string
): Promise<string> {
  const canvas = await generateBarcodeCanvas(format, text, scale, height, includeText, background);
  return canvas ? canvas.toDataURL('image/png') : '';
}
