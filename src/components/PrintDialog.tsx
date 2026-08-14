import { useEffect, useState } from 'react';
import { useLabelStore } from '../store/labelStore';
import { useProductStore } from '../store/productStore';
import { printViaWebUSB, isWebUSBSupported } from '../utils/escpos';
import { renderElementsToDataUrl } from '../utils/renderPreview';
import type { BarcodeElement } from '../types/label';

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
  const [catalogEnabled, setCatalogEnabled] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [paperW, setPaperW] = useState(150);
  const [paperH, setPaperH] = useState(100);
  const [labelMargin, setLabelMargin] = useState(2);

  const template = useLabelStore((s) => s.template);
  const canvasDataUrl = useLabelStore((s) => s.canvasDataUrl);
  const setLabelSize = useLabelStore((s) => s.setLabelSize);
  const previewProductId = useLabelStore((s) => s.previewProductId);
  const products = useProductStore((s) => s.products);
  const addStock = useProductStore((s) => s.addStock);

  useEffect(() => {
    setSelectedProductIds(products.map((p) => p.id));
  }, [products]);

  useEffect(() => {
    let cancelled = false;
    const els = useLabelStore.getState().template.elements;
    const update = async () => {
      let url: string | null = null;
      if (serialEnabled) {
        url = await renderElementsToDataUrl(els, serialStart, serialFormat);
      } else if (catalogEnabled && products.length > 0) {
        const pick = products.find((p) => p.id === previewProductId) ?? products[0];
        url = await renderElementsToDataUrl(els, undefined, undefined, {
          PRODUCT: pick.barcode,
          PRODUCT_NAME: pick.name,
        });
      } else {
        url = useLabelStore.getState().canvasDataUrl;
      }
      if (!cancelled) setPreviewUrl(url);
    };
    update();
    return () => {
      cancelled = true;
    };
  }, [serialEnabled, serialStart, serialFormat, catalogEnabled, canvasDataUrl, products, previewProductId]);

  if (!open) return null;

  const preset = XPRINTER_PRESETS[selectedPreset];
  const labelW = preset.w > 0 ? preset.w : customW;
  const labelH = preset.h > 0 ? preset.h : customH;

  const handleApplySize = () => {
    setLabelSize(labelW, labelH);
  };

  const handleBrowserPrint = async () => {
    if (!canvasDataUrl && !serialEnabled && !catalogEnabled) {
      setStatus('No label content to print.');
      return;
    }
    setStatus('Preparing print...');

    try {
      let pageDataUrls: string[];
      if (catalogEnabled) {
        pageDataUrls = [];
        const selected = products.filter((p) => selectedProductIds.includes(p.id));
        if (selected.length === 0) {
          setStatus('Select at least one product to print.');
          return;
        }
        const els = useLabelStore.getState().template.elements;
        for (const product of selected) {
          for (let c = 0; c < copies; c++) {
            const url = await renderElementsToDataUrl(els, undefined, undefined, {
              PRODUCT: product.barcode,
              PRODUCT_NAME: product.name,
            });
            if (!url) {
              setStatus('Failed to render label.');
              return;
            }
            pageDataUrls.push(url);
          }
        }
      } else if (serialEnabled) {
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

      const mm = labelMargin;
      const labelWmm = labelW + mm;
      const labelHmm = labelH + mm;
      const cols = Math.max(1, Math.floor(paperW / labelWmm));
      const rows = Math.max(1, Math.floor(paperH / labelHmm));
      const labelsPerPage = cols * rows;
      const totalPages = Math.ceil(pageDataUrls.length / labelsPerPage);

      const pageStyle = `
        @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
        html, body { margin: 0; padding: 0; width: ${paperW}mm; height: ${paperH}mm; overflow: hidden; }
        .page {
          width: ${paperW}mm; height: ${paperH}mm;
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          grid-template-rows: repeat(${rows}, 1fr);
          gap: ${mm}mm;
          padding: 0;
          page-break-after: always;
          box-sizing: border-box;
          align-content: start;
        }
        .page:last-child { page-break-after: auto; }
        .cell {
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .cell img {
          width: 100%; height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
        }
      `;

      let pagesHtml = '';
      for (let p = 0; p < totalPages; p++) {
        const start = p * labelsPerPage;
        const end = Math.min(start + labelsPerPage, pageDataUrls.length);
        const cellsHtml = pageDataUrls
          .slice(start, end)
          .map((url) => `<div class="cell"><img src="${url}" /></div>`)
          .join('');
        pagesHtml += `<div class="page">${cellsHtml}</div>`;
      }

      const win = window.open('', '_blank');
      if (!win) {
        setStatus('Popup blocked. Allow popups for printing.');
        return;
      }

      if (catalogEnabled) {
        for (const product of products) {
          if (selectedProductIds.includes(product.id)) {
            addStock(product.barcode, copies);
          }
        }
      }

      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>${template.name}</title>
        <style>${pageStyle}</style>
        </head>
        <body>
          ${pagesHtml}
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
    if (catalogEnabled) {
      setStatus('Catalog printing uses Browser Print only.');
      return;
    }
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

  const barcodeTexts = template.elements
    .filter((e) => e.type === 'barcode' && e.visible)
    .map((e) => (e as BarcodeElement).text);
  const serialHasN = barcodeTexts.some((t) => /\{N/.test(t));
  const catalogHasProduct = barcodeTexts.some((t) => t.includes('{PRODUCT}'));

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
              <h3>Label Preview</h3>
              <div className="label-preview">
                {previewUrl ? (
                  <img src={previewUrl} alt="Label preview" />
                ) : (
                  <small style={{ color: '#888' }}>
                    No label yet. Add barcode/text elements to the design.
                  </small>
                )}
              </div>
              {serialEnabled && serialPreview !== null && (
                <small style={{ display: 'block', marginTop: 4, color: '#888' }}>
                  Previewing serial #{serialPreview}
                </small>
              )}
              {catalogEnabled && products.length > 0 && (
                <small style={{ display: 'block', marginTop: 4, color: '#888' }}>
                  Previewing "{products[0].name}" — one label per product will print
                </small>
              )}
            </section>

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

              <section style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <h4 style={{ margin: '0 0 6px' }}>Paper Size &amp; Layout</h4>
                <small style={{ color: '#888', display: 'block', marginBottom: 6 }}>
                  Labels: {labelW}×{labelH}mm &middot; Fits{' '}
                  {Math.max(1, Math.floor(paperW / (labelW + labelMargin)))}×
                  {Math.max(1, Math.floor(paperH / (labelH + labelMargin)))} ={' '}
                  {Math.max(1, Math.floor(paperW / (labelW + labelMargin))) *
                    Math.max(1, Math.floor(paperH / (labelH + labelMargin)))} per page
                </small>
                <div className="pos-row">
                  <label>
                    Paper W (mm)
                    <input type="number" min={50} max={1000} value={paperW}
                      onChange={(e) => setPaperW(Math.max(50, Number(e.target.value)))} />
                  </label>
                  <label>
                    Paper H (mm)
                    <input type="number" min={50} max={1000} value={paperH}
                      onChange={(e) => setPaperH(Math.max(50, Number(e.target.value)))} />
                  </label>
                  <label>
                    Gap (mm)
                    <input type="number" min={0} max={20} value={labelMargin}
                      onChange={(e) => setLabelMargin(Math.max(0, Number(e.target.value)))} />
                  </label>
                </div>
              </section>

              <section style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <h4 style={{ margin: 0 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={serialEnabled}
                      onChange={(e) => {
                        setSerialEnabled(e.target.checked);
                        if (e.target.checked) setCatalogEnabled(false);
                      }} />
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
                    {serialEnabled && !serialHasN && (
                      <small style={{ color: '#ffb020', fontWeight: 600 }}>
                        Warning: your barcode Text field does not contain {'{N}'}. Change it to{' '}
                        <code>{'{N:6}'}</code> or serial numbers won't appear.
                      </small>
                    )}
                  </div>
                )}
              </section>

              <section style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <h4 style={{ margin: 0 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={catalogEnabled}
                      onChange={(e) => {
                        setCatalogEnabled(e.target.checked);
                        if (e.target.checked) setSerialEnabled(false);
                      }} />
                    Print One Label Per Product (Catalog)
                  </label>
                </h4>
                {catalogEnabled ? (
                  <div style={{ marginTop: 8 }}>
                    {(() => {
                      const selected = products.filter((p) => selectedProductIds.includes(p.id));
                      return (
                        <small style={{ color: '#888' }}>
                          Uses <code>{'{PRODUCT}'}</code> / <code>{'{PRODUCT_NAME}'}</code>{' '}
                          placeholders. Prints {selected.length} of {products.length}{' '}
                          product{products.length !== 1 ? 's' : ''} × {copies} copy
                          {copies !== 1 ? 's' : ''} via Browser Print, and adds {copies} to each
                          selected product's In Stock count.
                        </small>
                      );
                    })()}
                    <div className="product-select-list">
                      {products.map((p) => {
                        const checked = selectedProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={checked ? 'product-select-item checked' : 'product-select-item'}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds((prev) =>
                                    prev.includes(p.id) ? prev : [...prev, p.id]
                                  );
                                } else {
                                  setSelectedProductIds((prev) =>
                                    prev.filter((id) => id !== p.id)
                                  );
                                }
                              }}
                            />
                            {p.name} ({p.barcode})
                          </label>
                        );
                      })}
                    </div>
                    {!catalogHasProduct && (
                      <small style={{ color: '#ffb020', fontWeight: 600, display: 'block', marginTop: 4 }}>
                        Warning: your barcode Text field does not contain{' '}
                        <code>{'{PRODUCT}'}</code>. Change it to <code>{'{PRODUCT}'}</code> or
                        product barcodes won't appear.
                      </small>
                    )}
                  </div>
                ) : (
                  products.length === 0 && (
                    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>
                      Add products in the Product Catalog first.
                    </small>
                  )
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
