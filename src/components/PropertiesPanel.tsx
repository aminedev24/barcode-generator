import { useLabelStore } from '../store/labelStore';
import { PiTextAlignLeft, PiTextAlignCenter, PiTextAlignRight } from 'react-icons/pi';
import type {
  BarcodeElement,
  TextElement,
  ShapeElement,
  LabelElement,
} from '../types/label';

function BarcodeProperties({ el }: { el: BarcodeElement }) {
  const updateElement = useLabelStore((s) => s.updateElement);

  const formats = [
    'code128', 'code39', 'code93', 'ean13', 'ean8',
    'upca', 'upce', 'itf14', 'qrcode', 'datamatrix',
    'pdf417', 'gs1128',
  ];

  return (
    <div className="properties-section">
      <h3>Barcode</h3>
      <label>
        Format
        <select
          value={el.format}
          onChange={(e) =>
            updateElement(el.id, { format: e.target.value } as Partial<BarcodeElement>)
          }
        >
          {formats.map((f) => (
            <option key={f} value={f}>{f.toUpperCase()}</option>
          ))}
        </select>
      </label>
      <label>
        Data
        <input
          type="text"
          value={el.text}
          onChange={(e) =>
            updateElement(el.id, { text: e.target.value } as Partial<BarcodeElement>)
          }
        />
      </label>
      <label>
        Scale
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={el.scale}
          onChange={(e) =>
            updateElement(el.id, { scale: Number(e.target.value) } as Partial<BarcodeElement>)
          }
        />
      </label>
      <label>
        Bar Height
        <input
          type="number"
          min={5}
          max={100}
          value={el.barHeight}
          onChange={(e) =>
            updateElement(el.id, { barHeight: Number(e.target.value) } as Partial<BarcodeElement>)
          }
        />
      </label>
      <label>
        Show Text
        <input
          type="checkbox"
          checked={el.includeText}
          onChange={(e) =>
            updateElement(el.id, { includeText: e.target.checked } as Partial<BarcodeElement>)
          }
        />
      </label>
      <label>
        Background
        <input
          type="color"
          value={el.background}
          onChange={(e) =>
            updateElement(el.id, { background: e.target.value } as Partial<BarcodeElement>)
          }
        />
      </label>
    </div>
  );
}

function TextProperties({ el }: { el: TextElement }) {
  const updateElement = useLabelStore((s) => s.updateElement);

  return (
    <div className="properties-section">
      <h3>Text</h3>
      <label>
        Content
        <textarea
          rows={2}
          value={el.content}
          onChange={(e) =>
            updateElement(el.id, { content: e.target.value } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Font Size
        <input
          type="number"
          min={6}
          max={200}
          value={el.fontSize}
          onChange={(e) =>
            updateElement(el.id, { fontSize: Number(e.target.value) } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Font
        <select
          value={el.fontFamily}
          onChange={(e) =>
            updateElement(el.id, { fontFamily: e.target.value } as Partial<TextElement>)
          }
        >
          {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'].map(
            (f) => (
              <option key={f} value={f}>{f}</option>
            )
          )}
        </select>
      </label>
      <label>
        Weight
        <select
          value={el.fontWeight}
          onChange={(e) =>
            updateElement(el.id, { fontWeight: e.target.value } as Partial<TextElement>)
          }
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </label>
      <label>
        Style
        <select
          value={el.fontStyle}
          onChange={(e) =>
            updateElement(el.id, { fontStyle: e.target.value } as Partial<TextElement>)
          }
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </select>
      </label>
      <label>
        Align
        <div className="align-btn-group">
          <button
            className={`align-btn ${el.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => updateElement(el.id, { textAlign: 'left' } as Partial<TextElement>)}
            title="Align Left"
          >
            <PiTextAlignLeft />
          </button>
          <button
            className={`align-btn ${el.textAlign === 'center' ? 'active' : ''}`}
            onClick={() => updateElement(el.id, { textAlign: 'center' } as Partial<TextElement>)}
            title="Align Center"
          >
            <PiTextAlignCenter />
          </button>
          <button
            className={`align-btn ${el.textAlign === 'right' ? 'active' : ''}`}
            onClick={() => updateElement(el.id, { textAlign: 'right' } as Partial<TextElement>)}
            title="Align Right"
          >
            <PiTextAlignRight />
          </button>
        </div>
      </label>
      <label>
        Color
        <input
          type="color"
          value={el.fill}
          onChange={(e) =>
            updateElement(el.id, { fill: e.target.value } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Underline
        <input
          type="checkbox"
          checked={el.underline}
          onChange={(e) =>
            updateElement(el.id, { underline: e.target.checked } as Partial<TextElement>)
          }
        />
      </label>
    </div>
  );
}

function ShapeProperties({ el }: { el: ShapeElement }) {
  const updateElement = useLabelStore((s) => s.updateElement);

  return (
    <div className="properties-section">
      <h3>Shape</h3>
      <label>
        Type
        <select
          value={el.shapeType}
          onChange={(e) =>
            updateElement(el.id, { shapeType: e.target.value } as Partial<ShapeElement>)
          }
        >
          <option value="rectangle">Rectangle</option>
        </select>
      </label>
      <label>
        Fill
        <input
          type="color"
          value={el.fill === 'transparent' ? '#ffffff' : el.fill}
          onChange={(e) =>
            updateElement(el.id, { fill: e.target.value } as Partial<ShapeElement>)
          }
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={el.fill === 'transparent'}
            onChange={(e) =>
              updateElement(el.id, {
                fill: e.target.checked ? 'transparent' : '#ffffff',
              } as Partial<ShapeElement>)
            }
          />
          Transparent
        </label>
      </label>
      <label>
        Stroke
        <input
          type="color"
          value={el.stroke}
          onChange={(e) =>
            updateElement(el.id, { stroke: e.target.value } as Partial<ShapeElement>)
          }
        />
      </label>
      <label>
        Stroke Width
        <input
          type="number"
          min={0}
          max={20}
          value={el.strokeWidth}
          onChange={(e) =>
            updateElement(el.id, { strokeWidth: Number(e.target.value) } as Partial<ShapeElement>)
          }
        />
      </label>
      <label>
        Corner Radius
        <input
          type="number"
          min={0}
          max={50}
          value={el.rx}
          onChange={(e) =>
            updateElement(el.id, {
              rx: Number(e.target.value),
              ry: Number(e.target.value),
            } as Partial<ShapeElement>)
          }
        />
      </label>
    </div>
  );
}

function PositionProperties({ el }: { el: LabelElement }) {
  const updateElement = useLabelStore((s) => s.updateElement);

  return (
    <div className="properties-section">
      <h3>Position</h3>
      <div className="pos-row">
        <label>
          X
          <input
            type="number"
            value={Math.round(el.left)}
            onChange={(e) =>
              updateElement(el.id, { left: Number(e.target.value) } as Partial<LabelElement>)
            }
          />
        </label>
        <label>
          Y
          <input
            type="number"
            value={Math.round(el.top)}
            onChange={(e) =>
              updateElement(el.id, { top: Number(e.target.value) } as Partial<LabelElement>)
            }
          />
        </label>
      </div>
      <div className="pos-row">
        <label>
          W
          <input
            type="number"
            value={Math.round(el.width)}
            onChange={(e) =>
              updateElement(el.id, { width: Number(e.target.value) } as Partial<LabelElement>)
            }
          />
        </label>
        <label>
          H
          <input
            type="number"
            value={Math.round(el.height)}
            onChange={(e) =>
              updateElement(el.id, { height: Number(e.target.value) } as Partial<LabelElement>)
            }
          />
        </label>
      </div>
      <label>
        Rotation
        <input
          type="number"
          min={-360}
          max={360}
          value={Math.round(el.rotation)}
          onChange={(e) =>
            updateElement(el.id, { rotation: Number(e.target.value) } as Partial<LabelElement>)
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={el.locked}
          onChange={(e) =>
            updateElement(el.id, { locked: e.target.checked } as Partial<LabelElement>)
          }
        />
        Locked
      </label>
      <label>
        <input
          type="checkbox"
          checked={el.visible}
          onChange={(e) =>
            updateElement(el.id, { visible: e.target.checked } as Partial<LabelElement>)
          }
        />
        Visible
      </label>
    </div>
  );
}

export default function PropertiesPanel() {
  const selectedElementId = useLabelStore((s) => s.selectedElementId);
  const elements = useLabelStore((s) => s.template.elements);
  const template = useLabelStore((s) => s.template);
  const setLabelSize = useLabelStore((s) => s.setLabelSize);
  const setUnit = useLabelStore((s) => s.setUnit);
  const setTemplateName = useLabelStore((s) => s.setTemplateName);

  const selectedEl = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="properties-panel">
      <div className="properties-section">
        <h3>Label</h3>
        <label>
          Name
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </label>
        <div className="pos-row">
          <label>
            Width
            <input
              type="number"
              min={10}
              max={1000}
              value={template.width}
              onChange={(e) =>
                setLabelSize(Number(e.target.value), template.height)
              }
            />
          </label>
          <label>
            Height
            <input
              type="number"
              min={10}
              max={1000}
              value={template.height}
              onChange={(e) =>
                setLabelSize(template.width, Number(e.target.value))
              }
            />
          </label>
        </div>
        <label>
          Unit
          <select
            value={template.unit}
            onChange={(e) => setUnit(e.target.value as 'mm' | 'in')}
          >
            <option value="mm">mm</option>
            <option value="in">inches</option>
          </select>
        </label>
      </div>

      {selectedEl && (
        <>
          <PositionProperties el={selectedEl} />
          {selectedEl.type === 'barcode' && (
            <BarcodeProperties el={selectedEl as BarcodeElement} />
          )}
          {selectedEl.type === 'text' && (
            <TextProperties el={selectedEl as TextElement} />
          )}
          {selectedEl.type === 'shape' && (
            <ShapeProperties el={selectedEl as ShapeElement} />
          )}
        </>
      )}

      {!selectedEl && (
        <div className="properties-section">
          <p className="hint">Select an element to edit its properties</p>
        </div>
      )}
    </div>
  );
}
