import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../api/client';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  stock: number;
}

export interface ScanRecord {
  value: string;
  timestamp: number;
}

interface ProductState {
  products: Product[];
  counts: Record<string, number>;
  history: ScanRecord[];

  addProduct: (name: string, barcode: string) => void;
  updateProduct: (id: string, name: string, barcode: string) => void;
  removeProduct: (id: string) => void;
  addStock: (barcode: string, qty: number) => void;
  setStock: (id: string, qty: number) => void;
  registerScan: (value: string) => void;
  resetCounts: () => void;
  findProduct: (barcode: string) => Product | undefined;

  syncFromApi: () => Promise<void>;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      counts: {},
      history: [],

      addProduct: (name, barcode) => {
        const clean = barcode.trim();
        if (!clean) return;
        const product: Product = {
          id: uuidv4(),
          name: name.trim() || clean,
          barcode: clean,
          stock: 0,
        };
        set((s) => ({ products: [...s.products, product] }));
        api.products.create(product).catch((e) => console.warn('[API] addProduct failed:', e));
      },

      updateProduct: (id, name, barcode) => {
        const patch = {
          name: name.trim() || undefined,
          barcode: barcode.trim() || undefined,
        };
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id
              ? { ...p, name: patch.name || p.name, barcode: patch.barcode || p.barcode }
              : p
          ),
        }));
        api.products.update(id, patch).catch((e) => console.warn('[API] updateProduct failed:', e));
      },

      removeProduct: (id) => {
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
        api.products.remove(id).catch((e) => console.warn('[API] removeProduct failed:', e));
      },

      addStock: (barcode, qty) => {
        set((s) => ({
          products: s.products.map((p) => {
            if (p.barcode.trim() !== barcode.trim()) return p;
            const newStock = (p.stock ?? 0) + qty;
            api.products.update(p.id, { stock: newStock }).catch((e) => console.warn('[API] addStock failed:', e));
            return { ...p, stock: newStock };
          }),
        }));
      },

      setStock: (id, qty) => {
        const stock = Math.max(0, Math.floor(qty || 0));
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, stock } : p)),
        }));
        api.products.update(id, { stock }).catch((e) => console.warn('[API] setStock failed:', e));
      },

      registerScan: (value) => {
        if (!value) return;
        const now = Date.now();
        set((s) => ({
          counts: { ...s.counts, [value]: (s.counts[value] ?? 0) + 1 },
          history: [...s.history, { value, timestamp: now }].slice(-500),
        }));
      },

      resetCounts: () => set({ counts: {}, history: [] }),

      findProduct: (barcode) =>
        get().products.find((p) => p.barcode.trim() === barcode.trim()),

      syncFromApi: async () => {
        try {
          const rows = await api.products.list();
          const products: Product[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            barcode: r.barcode,
            stock: r.stock,
          }));
          set({ products });
        } catch (e) {
          console.warn('[API] syncFromApi failed:', e);
        }
      },
    }),
    { name: 'barcode-product-catalog' }
  )
);
