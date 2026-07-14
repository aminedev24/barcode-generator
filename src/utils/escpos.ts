const THERMAL_DPI = 203;

export interface EscposOptions {
  copies: number;
  labelWidthMM: number;
  labelHeightMM: number;
  speed?: number;
  darkness?: number;
}

function createEscposImage(dataUrl: string, widthMM: number, heightMM: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const pxW = Math.round((widthMM / 25.4) * THERMAL_DPI);
      const pxH = Math.round((heightMM / 25.4) * THERMAL_DPI);

      const c = document.createElement('canvas');
      c.width = pxW;
      c.height = pxH;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, pxW, pxH);

      const imageData = ctx.getImageData(0, 0, pxW, pxH);
      const bytes = new Uint8Array(pxH * Math.ceil(pxW / 8));

      for (let y = 0; y < pxH; y++) {
        for (let x = 0; x < pxW; x++) {
          const idx = (y * pxW + x) * 4;
          const gray =
            imageData.data[idx] * 0.299 +
            imageData.data[idx + 1] * 0.587 +
            imageData.data[idx + 2] * 0.114;
          const bit = gray < 128 ? 1 : 0;
          const byteIdx = y * Math.ceil(pxW / 8) + Math.floor(x / 8);
          bytes[byteIdx] |= bit << (7 - (x % 8));
        }
      }

      resolve(buildRasterCommand(bytes, pxW, pxH, widthMM, heightMM));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function buildRasterCommand(
  imageData: Uint8Array,
  widthPx: number,
  heightPx: number,
  _widthMM: number,
  _heightMM: number
): Uint8Array {
  const xBytes = Math.ceil(widthPx / 8);
  const header = new Uint8Array([
    0x1b, 0x40, // ESC @ - Initialize
    0x1d, 0x76, 0x30, // GS v 0
    0x00, // m = normal
    xBytes & 0xff, (xBytes >> 8) & 0xff, // xL, xH
    heightPx & 0xff, (heightPx >> 8) & 0xff, // yL, yH
  ]);

  const result = new Uint8Array(header.length + imageData.length + 4);
  result.set(header);
  result.set(imageData, header.length);
  result[result.length - 4] = 0x1d; // GS
  result[result.length - 3] = 0x56; // V
  result[result.length - 2] = 0x41; // A
  result[result.length - 1] = 0x00; // m=0 (full cut)

  return result;
}

export async function printViaWebUSB(
  dataUrl: string,
  options: EscposOptions
): Promise<string> {
  if (!navigator.usb) {
    throw new Error('WebUSB not supported. Use browser print instead.');
  }

  const device = await navigator.usb.requestDevice({
    filters: [
      { vendorId: 0x0483 }, // STMicroelectronics (common for Xprinter)
      { vendorId: 0x0416 }, // Winbond (another common controller)
      { vendorId: 0x1a86 }, // QinHeng
      { vendorId: 0x067b }, // Prolific
    ],
  });

  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);

  const outEndpoint = device.configuration!.interfaces[0].alternate.endpoints.find(
    (ep: USBEndpoint) => ep.direction === 'out'
  );
  if (!outEndpoint) {
    await device.close();
    throw new Error('No output endpoint found on printer');
  }

  const commands = await createEscposImage(dataUrl, options.labelWidthMM, options.labelHeightMM);

  const chunkSize = 512;
  for (let i = 0; i < options.copies; i++) {
    for (let offset = 0; offset < commands.length; offset += chunkSize) {
      const chunk = commands.slice(offset, offset + chunkSize);
      await device.transferOut(outEndpoint.endpointNumber, chunk);
    }
  }

  await device.close();
  return 'Printed successfully via WebUSB';
}

export function isWebUSBSupported(): boolean {
  return !!navigator.usb;
}
