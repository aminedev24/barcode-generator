import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProductStore } from '../store/productStore';
import { decodeImageData, decodeFromImageUrl, exportScanCSV } from '../utils/barcodeScan';
import {
  PiCamera,
  PiImage,
  PiUsb,
  PiDownloadSimple,
  PiTrash,
  PiPlus,
} from 'react-icons/pi';

type ScanMode = 'camera' | 'image' | 'usb';

interface ScanDialogProps {
  open: boolean;
  onClose: () => void;
}

const CAMERA_COOLDOWN_MS = 1500;
const USB_SCAN_GAP_MS = 60;

export default function ScanDialog({ open, onClose }: ScanDialogProps) {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const products = useProductStore((s) => s.products);
  const counts = useProductStore((s) => s.counts);
  const history = useProductStore((s) => s.history);
  const registerScan = useProductStore((s) => s.registerScan);
  const resetCounts = useProductStore((s) => s.resetCounts);
  const addProduct = useProductStore((s) => s.addProduct);

  const handleScan = useCallback(
    (value: string) => {
      if (!value) return;
      registerScan(value);
      setLastScan(value);
    },
    [registerScan]
  );

  const closeDialog = useCallback(() => {
    setCameraActive(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setCameraActive(false);
      setCameraError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'camera' || !cameraActive) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not available in this browser.');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        video.srcObject = stream;
        await video.play();
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const cooldowns = new Map<string, number>();

        const loop = () => {
          if (cancelled) return;
          if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const values = decodeImageData(
              ctx.getImageData(0, 0, canvas.width, canvas.height)
            );
            const now = performance.now();
            for (const v of values) {
              if (now - (cooldowns.get(v) ?? 0) > CAMERA_COOLDOWN_MS) {
                cooldowns.set(v, now);
                handleScan(v);
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setCameraError('Camera access denied or unavailable.');
        setCameraActive(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open, mode, cameraActive, handleScan]);

  useEffect(() => {
    if (!open || mode !== 'usb') return;
    let buffer = '';
    let lastKeyTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (buffer) {
          handleScan(buffer);
          buffer = '';
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;
      const now = performance.now();
      if (buffer && now - lastKeyTime > USB_SCAN_GAP_MS) buffer = '';
      buffer += e.key;
      lastKeyTime = now;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, mode, handleScan]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageStatus('Decoding image...');
    try {
      const values = await decodeFromImageUrl(url);
      if (values.length === 0) {
        setImageStatus('No barcodes found in the image.');
      } else {
        values.forEach(handleScan);
        setImageStatus(`Found ${values.length} barcode${values.length > 1 ? 's' : ''}: ${values.join(', ')}`);
      }
    } catch (err: any) {
      setImageStatus(err.message || 'Failed to decode image.');
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = '';
    }
  };

  const items = useMemo<Array<{ value: string; count: number }>>(() => {
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [counts]);

  const productNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.barcode.trim(), p.name);
    return m;
  }, [products]);

  const productStocks = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.barcode.trim(), p.stock ?? 0);
    return m;
  }, [products]);

  const lastProduct = lastScan
    ? products.find((p) => p.barcode.trim() === lastScan.trim())
    : undefined;

  const totalScans = items.reduce((sum, i) => sum + i.count, 0);

  const addUnknownProduct = (value: string) => {
    const name = window.prompt(`Name for "${value}":`, value);
    if (name === null) return;
    addProduct(name, value);
  };

  if (!open) return null;

  const switchMode = (m: ScanMode) => {
    setMode(m);
    setCameraActive(false);
    setCameraError(null);
  };

  return (
    <div className="dialog-overlay" onClick={closeDialog}>
      <div className="dialog scan-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Scan &amp; Count Stock</h2>
          <button className="dialog-close" onClick={closeDialog}>×</button>
        </div>

        <div className="dialog-tab-content">
          <div className="scan-mode-tabs">
            <button
              className={`scan-mode-btn ${mode === 'camera' ? 'active' : ''}`}
              onClick={() => switchMode('camera')}
            >
              <PiCamera /> Camera
            </button>
            <button
              className={`scan-mode-btn ${mode === 'image' ? 'active' : ''}`}
              onClick={() => switchMode('image')}
            >
              <PiImage /> Upload Image
            </button>
            <button
              className={`scan-mode-btn ${mode === 'usb' ? 'active' : ''}`}
              onClick={() => switchMode('usb')}
            >
              <PiUsb /> USB Scanner
            </button>
          </div>

          {mode === 'camera' && (
            <section>
              {!cameraActive && (
                <button
                  className="action-btn primary"
                  onClick={() => { setCameraActive(true); setCameraError(null); }}
                >
                  ▶ Start Camera
                </button>
              )}
              {cameraActive && (
                <div className="camera-wrap">
                  <video ref={videoRef} className="scan-video" playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button
                    className="action-btn secondary"
                    onClick={() => setCameraActive(false)}
                  >
                    ■ Stop Camera
                  </button>
                </div>
              )}
              {cameraError && <p className="scan-error">{cameraError}</p>}
              <p className="hint">
                Point the camera at a barcode. Duplicate reads of the same code
                within {CAMERA_COOLDOWN_MS / 1000}s are ignored.
              </p>
            </section>
          )}

          {mode === 'image' && (
            <section>
              <label className="file-upload-btn">
                Choose Image…
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
              {imageStatus && <p className="scan-status">{imageStatus}</p>}
              <p className="hint">
                Upload a photo or screenshot containing one or more barcodes.
                All decoded values are added to the count table below.
              </p>
            </section>
          )}

          {mode === 'usb' && (
            <section>
              <p className="hint">
                Plug in a USB barcode scanner, focus this window, and scan.
                Codes typed by the scanner (ending with Enter) are counted.
              </p>
              <p className="hint">
                Manual keyboard typing is ignored while no scanner is being used.
              </p>
            </section>
          )}

          {lastScan && (
            <div className="last-scan">
              Last scan: <code>{lastScan}</code>
              {lastProduct && (
                <>
                  {' '}→ <strong>{lastProduct.name}</strong> —{' '}
                  <strong>{lastProduct.stock ?? 0}</strong> in stock
                </>
              )}
            </div>
          )}

          <section>
            <div className="scan-summary">
              <span><strong>{totalScans}</strong> total scans</span>
              <span><strong>{items.length}</strong> unique codes</span>
              <span>
                <button
                  className="link-btn"
                  onClick={resetCounts}
                  title="Reset counts"
                >
                  <PiTrash /> Reset
                </button>
                <button
                  className="link-btn"
                  onClick={() => exportScanCSV(items, productNames)}
                  disabled={items.length === 0}
                  title="Export CSV"
                >
                  <PiDownloadSimple /> CSV
                </button>
              </span>
            </div>
            {items.length === 0 ? (
              <p className="hint">No barcodes scanned yet.</p>
            ) : (
              <table className="scan-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Barcode Value</th>
                    <th>In Stock</th>
                    <th>Counted</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .slice()
                    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
                    .map((it, idx) => {
                      const name = productNames.get(it.value.trim());
                      return (
                        <tr key={it.value}>
                          <td>{idx + 1}</td>
                          <td className={name ? 'mapped' : 'unmapped'}>
                            {name || 'Unknown'}
                            {!name && (
                              <button
                                className="inline-add"
                                onClick={() => addUnknownProduct(it.value)}
                                title="Add to product catalog"
                              >
                                <PiPlus /> Add
                              </button>
                            )}
                          </td>
                          <td><code>{it.value}</code></td>
                          <td className="count-cell">
                            {productStocks.get(it.value.trim()) ?? ''}
                          </td>
                          <td className="count-cell">{it.count}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
            {history.length > 0 && (
              <details className="scan-history">
                <summary>Scan history ({history.length})</summary>
                <ul>
                  {history.slice().reverse().map((h, i) => (
                    <li key={i}>
                      <time>{new Date(h.timestamp).toLocaleTimeString()}</time> {h.value}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>

        <div className="dialog-footer">
          <button className="action-btn secondary" onClick={closeDialog}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
