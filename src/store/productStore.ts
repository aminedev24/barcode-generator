import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

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
        set((s) => ({
          products: [
            ...s.products,
            { id: uuidv4(), name: name.trim() || clean, barcode: clean, stock: 0 },
          ],
        }));
      },

      updateProduct: (id, name, barcode) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: name.trim() || p.name,
                  barcode: barcode.trim() || p.barcode,
                }
              : p
          ),
        })),

      removeProduct: (id) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
        })),

      addStock: (barcode, qty) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.barcode.trim() === barcode.trim()
              ? { ...p, stock: (p.stock ?? 0) + qty }
              : p
          ),
        })),

      setStock: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, Math.floor(qty || 0)) } : p
          ),
        })),

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
    }),
    { name: 'barcode-product-catalog' }
  )
);
