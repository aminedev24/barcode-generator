import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import LabelCanvas from './components/LabelCanvas';
import PrintDialog from './components/PrintDialog';
import ScanDialog from './components/ScanDialog';
import ProductsDialog from './components/ProductsDialog';
import { useLabelStore } from './store/labelStore';
import { useProductStore } from './store/productStore';
import { exportToPDF, buildPdfDataUrl } from './utils/pdfExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

export default function App() {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);

  const template = useLabelStore((s) => s.template);
  const loadTemplate = useLabelStore((s) => s.loadTemplate);
  const canvasDataUrl = useLabelStore((s) => s.canvasDataUrl);

  useEffect(() => {
    useProductStore.getState().syncFromApi();
  }, []);

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
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const dataUrl = await buildPdfDataUrl(canvasDataUrl);
        const base64 = dataUrl.split(',')[1];
        await Filesystem.writeFile({
          path: 'barcode.pdf',
          data: base64,
          directory: Directory.Cache,
        });
        const uri = (
          await Filesystem.getUri({
            path: 'barcode.pdf',
            directory: Directory.Cache,
          })
        ).uri;
        await Share.share({
          title: 'Barcode PDF',
          files: [uri],
          dialogTitle: 'Export PDF',
        });
      } catch (e: any) {
        alert(e?.message || 'Failed to export PDF.');
      }
      return;
    }
    await exportToPDF(template, canvasDataUrl);
  };

  const handleExportImage = () => {
    if (!canvasDataUrl) {
      alert('Render the label first by adding elements.');
      return;
    }
    const a = document.createElement('a');
    a.href = canvasDataUrl;
    a.download = `${template.name.replace(/\s+/g, '_')}.png`;
    a.click();
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
    onExportImage: handleExportImage,
  });

  return (
    <div className="app flex h-screen flex-col max-md:h-auto max-md:min-h-screen max-md:overflow-y-auto">
      <Toolbar
        onNew={handleNew}
        onSave={handleSave}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        onExportImage={handleExportImage}
        onScan={() => setScanDialogOpen(true)}
        onProducts={() => setProductsDialogOpen(true)}
      />
      <div className="main-area flex flex-1 overflow-hidden max-md:flex-col max-md:flex-none max-md:overflow-visible">
        <div className="sidebar-left flex w-[180px] shrink-0 flex-col overflow-y-auto border-r border-[#3c3c3c] bg-[#252526] max-md:w-full max-md:max-h-52 max-md:border-r-0 max-md:border-b">
          <div className="sidebar-section hidden md:block">
            <h3>Shortcuts</h3>
            <div className="shortcuts-list">
              <span><kbd>Ctrl+N</kbd> New</span>
              <span><kbd>Ctrl+S</kbd> Save</span>
              <span><kbd>Ctrl+P</kbd> Print</span>
              <span><kbd>Ctrl+E</kbd> PDF</span>
              <span><kbd>Ctrl+I</kbd> Image</span>
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
