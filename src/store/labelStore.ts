import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  LabelElement,
  LabelTemplate,
  BarcodeElement,
  TextElement,
  ShapeElement,
  BarcodeFormat,
} from '../types/label';

interface LabelState {
  template: LabelTemplate;
  selectedElementId: string | null;
  zoom: number;
  canvasDataUrl: string | null;
  previewProductId: string | null;

  setZoom: (zoom: number) => void;
  setCanvasDataUrl: (url: string | null) => void;
  setPreviewProductId: (id: string | null) => void;

  setTemplateName: (name: string) => void;
  setLabelSize: (width: number, height: number) => void;
  setUnit: (unit: 'mm' | 'in') => void;

  selectElement: (id: string | null) => void;

  addBarcode: (format?: BarcodeFormat) => void;
  addText: () => void;
  addShape: () => void;

  updateElement: (id: string, updates: Partial<LabelElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElementUp: (id: string) => void;
  moveElementDown: (id: string) => void;

  loadTemplate: (template: LabelTemplate) => void;
  getNewTemplate: () => LabelTemplate;
}

function createDefaultTemplate(): LabelTemplate {
  return {
    id: uuidv4(),
    name: 'Untitled Label',
    width: 100,
    height: 50,
    unit: 'mm',
    orientation: 'landscape',
    elements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useLabelStore = create<LabelState>((set) => ({
  template: createDefaultTemplate(),
  selectedElementId: null,
  zoom: 1.5,
  canvasDataUrl: null,
  previewProductId: null,

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(5, zoom)) }),
  setCanvasDataUrl: (url) => set({ canvasDataUrl: url }),
  setPreviewProductId: (id) => set({ previewProductId: id }),

  setTemplateName: (name) =>
    set((s) => ({
      template: { ...s.template, name, updatedAt: new Date().toISOString() },
    })),

  setLabelSize: (width, height) =>
    set((s) => ({
      template: {
        ...s.template,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        updatedAt: new Date().toISOString(),
      },
    })),

  setUnit: (unit) =>
    set((s) => ({
      template: { ...s.template, unit, updatedAt: new Date().toISOString() },
    })),

  selectElement: (id) => set({ selectedElementId: id }),

  addBarcode: (format = 'code128') =>
    set((s) => {
      const defaultTexts: Record<string, string> = {
        code128: 'SN-{N:6}',
        code39: 'ABC-123',
        code93: 'ABC-123',
        ean13: '5901234123457',
        ean8: '12345670',
        upca: '123456789012',
        upce: '123456',
        itf14: '12345678901231',
        qrcode: 'https://example.com',
        datamatrix: 'DM-2024-001',
        pdf417: 'PDF417 data',
        gs1128: '(01)12345678901231',
      };
      const el: BarcodeElement = {
        id: uuidv4(),
        type: 'barcode',
        left: 10,
        top: 10,
        width: 80,
        height: 30,
        rotation: 0,
        zIndex: s.template.elements.length,
        locked: false,
        visible: true,
        format,
        text: defaultTexts[format] || 'ABC-12345',
        scale: 2,
        barHeight: 15,
        includeText: true,
        background: '#ffffff',
      };
      return {
        template: {
          ...s.template,
          elements: [...s.template.elements, el],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: el.id,
      };
    }),

  addText: () =>
    set((s) => {
      const el: TextElement = {
        id: uuidv4(),
        type: 'text',
        left: 10,
        top: 10,
        width: 80,
        height: 20,
        rotation: 0,
        zIndex: s.template.elements.length,
        locked: false,
        visible: true,
        content: 'Sample Text',
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        fill: '#000000',
        underline: false,
      };
      return {
        template: {
          ...s.template,
          elements: [...s.template.elements, el],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: el.id,
      };
    }),

  addShape: () =>
    set((s) => {
      const el: ShapeElement = {
        id: uuidv4(),
        type: 'shape',
        left: 10,
        top: 10,
        width: 60,
        height: 40,
        rotation: 0,
        zIndex: s.template.elements.length,
        locked: false,
        visible: true,
        shapeType: 'rectangle',
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        rx: 0,
        ry: 0,
      };
      return {
        template: {
          ...s.template,
          elements: [...s.template.elements, el],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: el.id,
      };
    }),

  updateElement: (id, updates) =>
    set((s) => ({
      template: {
        ...s.template,
        elements: s.template.elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as LabelElement) : el
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  removeElement: (id) =>
    set((s) => ({
      template: {
        ...s.template,
        elements: s.template.elements
          .filter((el) => el.id !== id)
          .map((el, i) => ({ ...el, zIndex: i })),
        updatedAt: new Date().toISOString(),
      },
      selectedElementId:
        s.selectedElementId === id ? null : s.selectedElementId,
    })),

  duplicateElement: (id) =>
    set((s) => {
      const source = s.template.elements.find((el) => el.id === id);
      if (!source) return s;
      const copy = {
        ...source,
        id: uuidv4(),
        left: source.left + 5,
        top: source.top + 5,
        zIndex: s.template.elements.length,
      };
      return {
        template: {
          ...s.template,
          elements: [...s.template.elements, copy],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: copy.id,
      };
    }),

  moveElementUp: (id) =>
    set((s) => {
      const elements = [...s.template.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx < elements.length - 1) {
        const tmp = elements[idx].zIndex;
        elements[idx] = { ...elements[idx], zIndex: elements[idx + 1].zIndex };
        elements[idx + 1] = { ...elements[idx + 1], zIndex: tmp };
        elements.sort((a, b) => a.zIndex - b.zIndex);
      }
      return {
        template: {
          ...s.template,
          elements,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  moveElementDown: (id) =>
    set((s) => {
      const elements = [...s.template.elements];
      const idx = elements.findIndex((el) => el.id === id);
      if (idx > 0) {
        const tmp = elements[idx].zIndex;
        elements[idx] = { ...elements[idx], zIndex: elements[idx - 1].zIndex };
        elements[idx - 1] = { ...elements[idx - 1], zIndex: tmp };
        elements.sort((a, b) => a.zIndex - b.zIndex);
      }
      return {
        template: {
          ...s.template,
          elements,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  loadTemplate: (template) =>
    set({
      template,
      selectedElementId: null,
      zoom: 1.5,
      canvasDataUrl: null,
    }),

  getNewTemplate: () => createDefaultTemplate(),
}));
