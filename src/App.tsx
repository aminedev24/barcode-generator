import { useState } from 'react';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import LabelCanvas from './components/LabelCanvas';
import PrintDialog from './components/PrintDialog';
import ScanDialog from './components/ScanDialog';
import ProductsDialog from './components/ProductsDialog';
import { useLabelStore } from './store/labelStore';
import { exportToPDF } from './utils/pdfExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

export default function App() {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);

  const template = useLabelStore((s) => s.template);
  const loadTemplate = useLabelStore((s) => s.loadTemplate);
  const canvasDataUrl = useLabelStore((s) => s.canvasDataUrl);

  const handleNew = () => {
    const newTemplate = useLabelStore.getState().getNewTemplate();
    loadTemplate(newTemplate);
  };

  const handleSave = () => {
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!canvasDataUrl) {
      alert('Render the label first by adding elements.');
      return;
    }
    await exportToPDF(template, canvasDataUrl);
  };

  const handlePrint = () => {
    if (!canvasDataUrl) {
      alert('Render the label first by adding elements.');
      return;
    }
    setPrintDialogOpen(true);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const loaded = JSON.parse(text);
        loadTemplate(loaded);
      } catch {
        alert('Failed to load template file.');
      }
    };
    input.click();
  };

  useKeyboardShortcuts({
    onNew: handleNew,
    onSave: handleSave,
    onPrint: handlePrint,
    onExportPdf: handleExportPdf,
  });

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onSave={handleSave}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        onScan={() => setScanDialogOpen(true)}
        onProducts={() => setProductsDialogOpen(true)}
      />
      <div className="main-area">
        <div className="sidebar-left">
          <div className="sidebar-section">
            <h3>Shortcuts</h3>
            <div className="shortcuts-list">
              <span><kbd>Ctrl+N</kbd> New</span>
              <span><kbd>Ctrl+S</kbd> Save</span>
              <span><kbd>Ctrl+P</kbd> Print</span>
              <span><kbd>Ctrl+E</kbd> PDF</span>
              <span><kbd>Del</kbd> Delete</span>
              <span><kbd>Esc</kbd> Deselect</span>
            </div>
          </div>
          <div className="sidebar-section">
            <h3>Load</h3>
            <button className="load-btn" onClick={handleLoad}>
              Load Template
            </button>
          </div>
          <div className="sidebar-section">
            <h3>Elements</h3>
            <div className="element-list">
              {template.elements
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((el, i) => (
                  <div
                    key={el.id}
                    className="element-item"
                    onClick={() =>
                      useLabelStore.getState().selectElement(el.id)
                    }
                  >
                    <span className="element-icon">
                      {el.type === 'barcode'
                        ? '〰'
                        : el.type === 'text'
                          ? 'T'
                          : '□'}
                    </span>
                    <span className="element-label">
                      {el.type.charAt(0).toUpperCase() + el.type.slice(1)} {i + 1}
                    </span>
                  </div>
                ))}
              {template.elements.length === 0 && (
                <p className="hint">No elements yet. Use the toolbar to add some.</p>
              )}
            </div>
          </div>
        </div>
        <LabelCanvas />
        <PropertiesPanel />
      </div>
      <PrintDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
      />
      <ScanDialog
        open={scanDialogOpen}
        onClose={() => setScanDialogOpen(false)}
      />
      <ProductsDialog
        open={productsDialogOpen}
        onClose={() => setProductsDialogOpen(false)}
        onPrintLabels={() => {
          setProductsDialogOpen(false);
          setPrintDialogOpen(true);
        }}
      />
    </div>
  );
}
