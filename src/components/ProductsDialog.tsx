import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useProductStore } from '../store/productStore';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { PiPlus, PiTrash, PiPrinter } from 'react-icons/pi';

interface ProductsDialogProps {
  open: boolean;
  onClose: () => void;
  onPrintLabels: () => void;
}

export default function ProductsDialog({ open, onClose, onPrintLabels }: ProductsDialogProps) {
  const products = useProductStore((s) => s.products);
  const counts = useProductStore((s) => s.counts);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const removeProduct = useProductStore((s) => s.removeProduct);
  const setStock = useProductStore((s) => s.setStock);

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const isNative = Capacitor.isNativePlatform();

  const nextBarcode = useMemo(() => {
    let max = 0;
    for (const p of products) {
      if (/^\d+$/.test(p.barcode.trim())) {
        max = Math.max(max, parseInt(p.barcode.trim(), 10));
      }
    }
    return max > 0 ? String(max + 1) : '100001';
  }, [products]);

  useEffect(() => {
    if (open) setBarcode(nextBarcode);
  }, [open, nextBarcode]);

  if (!open) return null;

  const handleAdd = () => {
    const code = barcode.trim() || nextBarcode;
    if (!code) return;
    addProduct(name, code);
    setName('');
    setBarcode(nextBarcode);
  };

  const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog product-dialog w-[92vw] max-w-[640px]" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Product Catalog</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-tab-content">
          <section>
            <h3>Add Product</h3>
            <div className="pos-row product-add-row">
              <label>
                Product Name
                <input
                  type="text"
                  value={name}
                  placeholder="e.g. Widget A"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </label>
              <label>
                Barcode Value
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </label>
              <button className="action-btn secondary add-btn" onClick={handleAdd}>
                <PiPlus /> Add
              </button>
            </div>
            <p className="hint" style={{ marginTop: 6 }}>
              Barcode is auto-filled with the next free number ({nextBarcode}). Type
              over it only if you want a custom code.
            </p>
          </section>

          <section>
            <h3>Products ({products.length})</h3>
            {products.length === 0 ? (
              <p className="hint">
                Add products above, or add unknown codes from the Scan dialog.
                Use <code>{'{PRODUCT}'}</code> as the barcode text and{' '}
                <code>{'{PRODUCT_NAME}'}</code> in text elements on your label to
                print one label per product.
              </p>
            ) : (
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Barcode Value</th>
                    <th>In Stock</th>
                    <th>Counted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={p.name}
                          onChange={(e) => updateProduct(p.id, e.target.value, p.barcode)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="table-input code-input"
                          value={p.barcode}
                          onChange={(e) => updateProduct(p.id, p.name, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input stock-input"
                          min={0}
                          value={p.stock ?? 0}
                          onChange={(e) => setStock(p.id, Number(e.target.value))}
                        />
                      </td>
                      <td className="count-cell">{counts[p.barcode.trim()] ?? 0}</td>
                      <td>
                        <button
                          className="link-btn danger"
                          onClick={() => removeProduct(p.id)}
                          title="Remove product"
                        >
                          <PiTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h3>Print</h3>
            <p className="hint">
              Design one label in the editor, set the barcode text to{' '}
              <code>{'{PRODUCT}'}</code> (add <code>{'{PRODUCT_NAME}'}</code> text
              for the name), then print one label per catalog product. Printing adds
              the copy count to each product's In Stock number.
            </p>
            <button
              className="action-btn primary"
              onClick={onPrintLabels}
              disabled={products.length === 0}
            >
              <PiPrinter /> Print Labels for {products.length} Products
            </button>
            {totalCounted > 0 && (
              <p className="hint" style={{ marginTop: 6 }}>
                {totalCounted} total items counted so far across the catalog.
              </p>
            )}
          </section>

          {isNative && (
            <section>
              <h3>Server Connection</h3>
              <p className="hint">
                Enter your computer's local IP so the app can reach the PHP API.
                Example: <code>http://192.168.1.50/barcode-generator/api</code>
              </p>
              <div className="pos-row">
                <label className="flex-1">
                  API URL
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://192.168.x.x/barcode-generator/api"
                  />
                </label>
                <button
                  className="action-btn secondary"
                  onClick={() => {
                    setApiBaseUrl(apiUrl);
                    useProductStore.getState().syncFromApi();
                  }}
                >
                  Save & Sync
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="dialog-footer">
          <button className="action-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
