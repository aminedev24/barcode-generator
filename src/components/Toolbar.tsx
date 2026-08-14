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

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onNew} title="New Label (Ctrl+N)">
          <PiPlus /> New
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <div className="toolbar-dropdown">
          <button className="dropdown-trigger" title="Add Barcode">
            <PiBarcode /> Barcode ▾
          </button>
          <div className="dropdown-menu">
            {QUICK_FORMATS.map((f) => (
              <button
                key={f.format}
                onClick={() => addBarcode(f.format as any)}
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

      <div className="toolbar-separator" />

      <div className="toolbar-group">
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

      <div className="toolbar-separator" />

      <div className="toolbar-group">
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

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={() => setZoom(zoom - 0.25)} title="Zoom Out">
          <PiMagnifyingGlassMinus />
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom + 0.25)} title="Zoom In">
          <PiMagnifyingGlassPlus />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
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
