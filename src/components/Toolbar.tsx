import { useEffect, useRef, useState } from 'react';
import { useLabelStore } from '../store/labelStore';
import { getAlignElements } from './LabelCanvas';
import {
  PiBarcode,
  PiTextT,
  PiSquare,
  PiTrash,
  PiCopy,
  PiArrowLineUp,
  PiArrowLineDown,
  PiMagnifyingGlassPlus,
  PiMagnifyingGlassMinus,
  PiFloppyDisk,
  PiPrinter,
  PiFilePdf,
  PiPlus,
  PiScan,
  PiListDashes,
  PiAlignLeft,
  PiAlignCenterHorizontal,
  PiAlignRight,
  PiAlignTop,
  PiAlignCenterVertical,
  PiAlignBottom,
} from 'react-icons/pi';

interface ToolbarProps {
  onSave?: () => void;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onNew?: () => void;
  onScan?: () => void;
  onProducts?: () => void;
}

const QUICK_FORMATS = [
  { label: 'QR Code', format: 'qrcode', icon: '▦' },
  { label: 'Code 128', format: 'code128', icon: '▌' },
  { label: 'EAN-13', format: 'ean13', icon: '▌' },
  { label: 'UPC-A', format: 'upca', icon: '▌' },
  { label: 'DataMatrix', format: 'datamatrix', icon: '▦' },
  { label: 'PDF417', format: 'pdf417', icon: '▌' },
];

export default function Toolbar({ onSave, onPrint, onExportPdf, onNew, onScan, onProducts }: ToolbarProps) {
  const [barcodeMenuOpen, setBarcodeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedElementId = useLabelStore((s) => s.selectedElementId);
  const addBarcode = useLabelStore((s) => s.addBarcode);
  const addText = useLabelStore((s) => s.addText);
  const addShape = useLabelStore((s) => s.addShape);
  const removeElement = useLabelStore((s) => s.removeElement);
  const duplicateElement = useLabelStore((s) => s.duplicateElement);
  const moveElementUp = useLabelStore((s) => s.moveElementUp);
  const moveElementDown = useLabelStore((s) => s.moveElementDown);
  const zoom = useLabelStore((s) => s.zoom);
  const setZoom = useLabelStore((s) => s.setZoom);

  useEffect(() => {
    if (!barcodeMenuOpen) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBarcodeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [barcodeMenuOpen]);

  return (
    <div className="toolbar flex min-h-10 shrink-0 flex-wrap items-center gap-1 border-b border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 max-md:gap-2">
      <div className="toolbar-group shrink-0">
        <button onClick={onNew} title="New Label (Ctrl+N)">
          <PiPlus /> New
        </button>
      </div>

      <div className="toolbar-separator shrink-0 max-md:hidden" />

      <div className="toolbar-group shrink-0">
        <div className="toolbar-dropdown" ref={dropdownRef}>
          <button
            className="dropdown-trigger"
            title="Add Barcode"
            onClick={() => setBarcodeMenuOpen((v) => !v)}
            aria-expanded={barcodeMenuOpen}
          >
            <PiBarcode /> Barcode ▾
          </button>
          <div className={`dropdown-menu${barcodeMenuOpen ? ' open' : ''}`}>
            {QUICK_FORMATS.map((f) => (
              <button
                key={f.format}
                onClick={() => {
                  addBarcode(f.format as any);
                  setBarcodeMenuOpen(false);
                }}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={addText} title="Add Text (T)">
          <PiTextT /> Text
        </button>
        <button onClick={addShape} title="Add Rectangle (R)">
          <PiSquare /> Shape
        </button>
      </div>

      <div className="toolbar-separator shrink-0 max-md:hidden" />

      <div className="toolbar-group shrink-0">
        <button
          onClick={() => selectedElementId && duplicateElement(selectedElementId)}
          disabled={!selectedElementId}
          title="Duplicate (Ctrl+D)"
        >
          <PiCopy />
        </button>
        <button
          onClick={() => selectedElementId && moveElementUp(selectedElementId)}
          disabled={!selectedElementId}
          title="Bring Forward"
        >
          <PiArrowLineUp />
        </button>
        <button
          onClick={() => selectedElementId && moveElementDown(selectedElementId)}
          disabled={!selectedElementId}
          title="Send Backward"
        >
          <PiArrowLineDown />
        </button>
        <button
          onClick={() => selectedElementId && removeElement(selectedElementId)}
          disabled={!selectedElementId}
          title="Delete (Del)"
          className="danger"
        >
          <PiTrash />
        </button>
      </div>

      <div className="toolbar-separator shrink-0 max-md:hidden" />

      <div className="toolbar-group shrink-0">
        <button onClick={() => getAlignElements()?.('left')} disabled={!selectedElementId} title="Align Left">
          <PiAlignLeft />
        </button>
        <button onClick={() => getAlignElements()?.('center')} disabled={!selectedElementId} title="Align Center">
          <PiAlignCenterHorizontal />
        </button>
        <button onClick={() => getAlignElements()?.('right')} disabled={!selectedElementId} title="Align Right">
          <PiAlignRight />
        </button>
        <button onClick={() => getAlignElements()?.('top')} disabled={!selectedElementId} title="Align Top">
          <PiAlignTop />
        </button>
        <button onClick={() => getAlignElements()?.('middle')} disabled={!selectedElementId} title="Align Middle">
          <PiAlignCenterVertical />
        </button>
        <button onClick={() => getAlignElements()?.('bottom')} disabled={!selectedElementId} title="Align Bottom">
          <PiAlignBottom />
        </button>
      </div>

      <div className="toolbar-separator shrink-0 max-md:hidden" />

      <div className="toolbar-group shrink-0">
        <button onClick={() => setZoom(zoom - 0.25)} title="Zoom Out">
          <PiMagnifyingGlassMinus />
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom + 0.25)} title="Zoom In">
          <PiMagnifyingGlassPlus />
        </button>
      </div>

      <div className="toolbar-spacer max-md:hidden" />

      <div className="toolbar-group shrink-0">
        <button onClick={onSave} title="Save Template (Ctrl+S)">
          <PiFloppyDisk /> Save
        </button>
        <button onClick={onExportPdf} title="Export PDF (Ctrl+E)">
          <PiFilePdf /> PDF
        </button>
        <button onClick={onPrint} title="Print (Ctrl+P)">
          <PiPrinter /> Print
        </button>
        <button onClick={onScan} title="Scan & Count Barcodes">
          <PiScan /> Scan
        </button>
        <button onClick={onProducts} title="Manage Products & Stock">
          <PiListDashes /> Products
        </button>
      </div>
    </div>
  );
}
