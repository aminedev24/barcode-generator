import { useState } from 'react';
import { useLabelStore } from '../store/labelStore';
import { printViaWebUSB, isWebUSBSupported } from '../utils/escpos';
import { renderElementsToDataUrl } from '../utils/renderPreview';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
}

const XPRINTER_PRESETS = [
  { name: 'Xprinter 40x30mm', w: 40, h: 30 },
  { name: 'Xprinter 50x30mm', w: 50, h: 30 },
  { name: 'Xprinter 60x40mm', w: 60, h: 40 },
  { name: 'Xprinter 80x50mm', w: 80, h: 50 },
  { name: 'Xprinter 100x70mm', w: 100, h: 70 },
  { name: 'Custom', w: 0, h: 0 },
];

export default function PrintDialog({ open, onClose }: PrintDialogProps) {
  const [copies, setCopies] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customW, setCustomW] = useState(80);
  const [customH, setCustomH] = useState(50);
  const [status, setStatus] = useState<string | null>(null);
  const [serialEnabled, setSerialEnabled] = useState(false);
  const [serialStart, setSerialStart] = useState(1);
  const [serialFormat, setSerialFormat] = useState('{N:6}');

  const template = useLabelStore((s) => s.template);
  const canvasDataUrl = useLabelStore((s) => s.canvasDataUrl);
  const setLabelSize = useLabelStore((s) => s.setLabelSize);

  if (!open) return null;

  const preset = XPRINTER_PRESETS[selectedPreset];
  const labelW = preset.w > 0 ? preset.w : customW;
  const labelH = preset.h > 0 ? preset.h : customH;

  const handleApplySize = () => {
    setLabelSize(labelW, labelH);
  };

  const handleBrowserPrint = async () => {
    if (!canvasDataUrl && !serialEnabled) {
      setStatus('No label content to print.');
      return;
    }
    setStatus('Preparing print...');

    try {
      let pageDataUrls: string[];
      if (serialEnabled) {
        pageDataUrls = [];
        const els = useLabelStore.getState().template.elements;
        for (let i = 0; i < copies; i++) {
          const sn = serialStart + i;
          const url = await renderElementsToDataUrl(els, sn, serialFormat);
          if (!url) {
            setStatus('Failed to render serial label.');
            return;
          }
          pageDataUrls.push(url);
        }
      } else {
        if (!canvasDataUrl) {
          setStatus('No label content to print.');
          return;
        }
        pageDataUrls = Array(copies).fill(canvasDataUrl);
      }

      const img = new Image();
      img.src = pageDataUrls[0];
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const mmW = ((iw / 2) / 96) * 25.4;
      const mmH = ((ih / 2) / 96) * 25.4;

      const win = window.open('', '_blank');
      if (!win) {
        setStatus('Popup blocked. Allow popups for printing.');
        return;
      }

      const copiesHtml = pageDataUrls.map((url, i) => {
        const sep = i < copies - 1 ? ' page-break-after: always;' : '';
        return `<img src="${url}" style="display:block;width:100%;height:auto;image-rendering:pixelated;${sep}" />`;
      }).join('\n');

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>${template.name}</title>
        <style>
          @page { size: ${mmW}mm ${mmH}mm; margin: 0; }
          body { margin: 0; padding: 0; }
        </style>
        </head>
        <body>
          ${copiesHtml}
          <script>
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 500);
          <\/script>
        </body>
        </html>
      `);
      win.document.close();
      setStatus(null);
      onClose();
    } catch (e: any) {
      setStatus(e.message || 'Print failed');
    }
  };

  const handleWebUSBPrint = async () => {
    if (!canvasDataUrl) {
      setStatus('No label content to print.');
      return;
    }
    setStatus('Connecting to printer via USB...');
    try {
      const msg = await printViaWebUSB(canvasDataUrl, {
        copies,
        labelWidthMM: labelW,
        labelHeightMM: labelH,
      });
      setStatus(msg);
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setStatus(err.message || 'Print failed');
    }
  };

  const ws = isWebUSBSupported();

  const serialPreview = serialEnabled && canvasDataUrl
    ? serialFormat.replace(/\{N(?::([^}]+))?\}/g, (_, fmt) => {
        return fmt ? String(serialStart).padStart(parseInt(fmt) || 6, '0') : String(serialStart);
      })
    : null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Print &amp; Export</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-tabs">
          <div className="dialog-tab-content">
            <section>
              <h3>Label Size Presets (Xprinter)</h3>
              <div className="preset-grid">
                {XPRINTER_PRESETS.map((p, i) => (
                  <button
                    key={p.name}
                    className={`preset-btn ${i === selectedPreset ? 'active' : ''}`}
                    onClick={() => setSelectedPreset(i)}
                  >
                    {p.name}
                    {p.w > 0 && <small>{p.w}×{p.h}mm</small>}
                  </button>
                ))}
              </div>
              {selectedPreset === XPRINTER_PRESETS.length - 1 && (
                <div className="pos-row" style={{ marginTop: 8 }}>
                  <label>
                    Width (mm)
                    <input type="number" value={customW} min={10} max={300}
                      onChange={(e) => setCustomW(Number(e.target.value))} />
                  </label>
                  <label>
                    Height (mm)
                    <input type="number" value={customH} min={10} max={300}
                      onChange={(e) => setCustomH(Number(e.target.value))} />
                  </label>
                </div>
              )}
              <button className="action-btn secondary" onClick={handleApplySize}>
                Apply Label Size
              </button>
            </section>

            <section>
              <h3>Print Options</h3>
              <label>
                Copies
                <input type="number" min={1} max={999} value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} />
              </label>

              <section style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <h4 style={{ margin: 0 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={serialEnabled}
                      onChange={(e) => setSerialEnabled(e.target.checked)} />
                    Serial Number Batch Printing
                  </label>
                </h4>
                {serialEnabled && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <small>Use <code>{'{N}'}</code> or <code>{'{N:6}'}</code> (padding) in barcode text.</small>
                    <div className="pos-row">
                      <label>
                        Start #
                        <input type="number" value={serialStart} min={1}
                          onChange={(e) => setSerialStart(Math.max(1, Number(e.target.value)))} />
                      </label>
                      <label>
                        Format
                        <input type="text" value={serialFormat}
                          onChange={(e) => setSerialFormat(e.target.value)}
                          placeholder="{N:6}" />
                      </label>
                    </div>
                    {serialPreview !== null && (
                      <small>Preview: <code>{serialPreview}</code></small>
                    )}
                    <small style={{ color: '#888' }}>
                      {copies} copies from {serialStart} to {serialStart + copies - 1}
                    </small>
                  </div>
                )}
              </section>

              <div className="print-buttons">
                <button className="action-btn primary" onClick={handleBrowserPrint}>
                  🖨 Browser Print
                </button>
                <small>Works with any installed printer (Xprinter driver required)</small>

                {ws && (
                  <>
                    <button className="action-btn secondary" onClick={handleWebUSBPrint}>
                      ⚡ Direct USB (ESC/POS)
                    </button>
                    <small>WebUSB — direct thermal printing, no driver needed</small>
                  </>
                )}
                {!ws && (
                  <small style={{ color: '#888' }}>
                    WebUSB not available in this browser. Use Chrome/Edge for direct USB.
                  </small>
                )}
              </div>
            </section>

            {status && (
              <div className="status-msg">{status}</div>
            )}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="action-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
