import { useEffect, useRef, useCallback } from 'react';
import { Canvas, Rect, Textbox, FabricImage } from 'fabric';
import { useLabelStore } from '../store/labelStore';
import { generateBarcode } from '../utils/barcode';
import { renderElementsToDataUrl } from '../utils/renderPreview';
import type {
  LabelElement,
  BarcodeElement,
  TextElement,
  ShapeElement,
} from '../types/label';

const MM_TO_PX = 3.779527;

function toPixels(value: number, unit: 'mm' | 'in'): number {
  return unit === 'mm' ? value * MM_TO_PX : value * 96;
}

function fabricColor(color: string): string {
  return color === 'transparent' ? 'rgba(0,0,0,0)' : color;
}

let _alignElements: ((type: string) => void) | null = null;
export function setAlignElements(fn: (type: string) => void) { _alignElements = fn; }
export function getAlignElements() { return _alignElements; }

export default function LabelCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const syncToStoreRef = useRef<(objs: any[]) => void>(() => {});
  const updatePreviewRef = useRef<() => void>(() => {});
  const fabricObjectsRef = useRef<Map<string, any>>(new Map());
  const suppressSelectionClear = useRef(false);
  const alignElementsRef = useRef<(type: string) => void>(() => {});

  const template = useLabelStore((s) => s.template);
  const zoom = useLabelStore((s) => s.zoom);
  const selectElement = useLabelStore((s) => s.selectElement);
  const updateElement = useLabelStore((s) => s.updateElement);
  const setCanvasDataUrl = useLabelStore((s) => s.setCanvasDataUrl);
  const elements = template.elements;

  const labelW = toPixels(template.width, template.unit);
  const labelH = toPixels(template.height, template.unit);

  const syncToStore = useCallback(
    (fabricObjs: any[]) => {
      if (fabricObjs.length === 0) return;
      for (const obj of fabricObjs) {
        const id = obj.get('customId') as string;
        if (!id) continue;
        const updates: any = {
          left: obj.left ?? 0,
          top: obj.top ?? 0,
          width: (obj.width ?? 0) * (obj.scaleX ?? 1),
          height: (obj.height ?? 0) * (obj.scaleY ?? 1),
          rotation: obj.angle ?? 0,
        };
        if (obj.type === 'textbox' || obj.type === 'i-text') {
          updates.content = obj.text;
        }
        updateElement(id, updates as Partial<LabelElement>);
      }
    },
    [updateElement]
  );

  const updateCanvasPreview = useCallback(async () => {
    const els = useLabelStore.getState().template.elements;
    const dataUrl = await renderElementsToDataUrl(els);
    if (dataUrl) setCanvasDataUrl(dataUrl);
    else setCanvasDataUrl(null);
  }, [setCanvasDataUrl]);

  const alignElements = useCallback((type: string) => {
    const fabric = fabricRef.current;
    if (!fabric) return;
    const activeObjs = fabric.getActiveObjects();
    if (!activeObjs || activeObjs.length === 0) return;

    const lw = toPixels(template.width, template.unit);
    const lh = toPixels(template.height, template.unit);

    if (activeObjs.length === 1) {
      const obj = activeObjs[0];
      const ow = (obj.width || 0) * (obj.scaleX || 1);
      const oh = (obj.height || 0) * (obj.scaleY || 1);
      switch (type) {
        case 'left':   obj.set('left', 0); break;
        case 'center': obj.set('left', (lw - ow) / 2); break;
        case 'right':  obj.set('left', lw - ow); break;
        case 'top':    obj.set('top', 0); break;
        case 'middle': obj.set('top', (lh - oh) / 2); break;
        case 'bottom': obj.set('top', lh - oh); break;
      }
      obj.setCoords();
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const obj of activeObjs) {
        const l = obj.left || 0;
        const t = obj.top || 0;
        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);
        minX = Math.min(minX, l);
        minY = Math.min(minY, t);
        maxX = Math.max(maxX, l + w);
        maxY = Math.max(maxY, t + h);
      }
      for (const obj of activeObjs) {
        const ow = (obj.width || 0) * (obj.scaleX || 1);
        const oh = (obj.height || 0) * (obj.scaleY || 1);
        switch (type) {
          case 'left':   obj.set('left', minX); break;
          case 'center': obj.set('left', (lw - ow) / 2); break;
          case 'right':  obj.set('left', maxX - ow); break;
          case 'top':    obj.set('top', minY); break;
          case 'middle': obj.set('top', (lh - oh) / 2); break;
          case 'bottom': obj.set('top', maxY - oh); break;
        }
        obj.setCoords();
      }
    }

    fabric.renderAll();
    syncToStoreRef.current(activeObjs);
    requestAnimationFrame(() => updatePreviewRef.current());
  }, [template, syncToStoreRef, updatePreviewRef]);

  syncToStoreRef.current = syncToStore;
  updatePreviewRef.current = updateCanvasPreview;
  alignElementsRef.current = alignElements;
  _alignElements = alignElements;

  useEffect(() => {
    if (!canvasElRef.current) return;
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    const container = canvasElRef.current.parentElement;
    const containerW = container?.clientWidth ?? 800;
    const containerH = container?.clientHeight ?? 600;

    const canvas = new Canvas(canvasElRef.current, {
      width: containerW,
      height: containerH,
      backgroundColor: '#e8e8e8',
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
    });

    fabricRef.current = canvas;

    canvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length > 0) {
        const id = e.selected[0].get('customId') as string;
        if (id) selectElement(id);
      }
    });

    canvas.on('selection:updated', (e) => {
      if (e.selected && e.selected.length > 0) {
        const id = e.selected[0].get('customId') as string;
        if (id) selectElement(id);
      }
    });

    canvas.on('selection:cleared', () => {
      if (!suppressSelectionClear.current) {
        selectElement(null);
      }
    });

    canvas.on('object:modified', (e) => {
      if (e.target) {
        syncToStoreRef.current([e.target]);
        requestAnimationFrame(() => updatePreviewRef.current());
      }
    });

    canvas.on('mouse:down', (e) => {
      if (!e.target) {
        selectElement(null);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      fabricObjectsRef.current.clear();
    };
  }, [selectElement]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setWidth(canvas.wrapperEl?.parentElement?.clientWidth ?? 800);
    canvas.setHeight(canvas.wrapperEl?.parentElement?.clientHeight ?? 600);
    canvas.renderAll();
  }, []);

  const rebuildBackground = useCallback((canvas: Canvas) => {
    const existing = canvas.getObjects().find(
      (o: any) => o.get('customId') === '__label_bg__'
    );
    if (existing) {
      existing.set({ width: labelW, height: labelH });
      return existing;
    }
    const rect = new Rect({
      left: 0,
      top: 0,
      width: labelW,
      height: labelH,
      fill: 'white',
      stroke: '#ccc',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      customId: '__label_bg__',
    } as any);
    canvas.add(rect);
    canvas.sendObjectToBack(rect);
    return rect;
  }, [labelW, labelH]);

  const syncBarcodeElement = useCallback(async (canvas: Canvas, el: BarcodeElement) => {
    const existing = fabricObjectsRef.current.get(el.id);
    const contentKey = `${el.format}_${el.text}_${el.scale}_${el.barHeight}_${el.includeText}`;

    if (existing && existing.type === 'image' && (existing as any).__barcodeKey === contentKey) {
      if (!el.visible) { existing.visible = false; existing.setCoords(); return; }
      existing.set({
        left: el.left, top: el.top, angle: el.rotation, locked: el.locked, visible: true,
      } as any);
      existing.set({
        scaleX: el.width / (existing.width || 1),
        scaleY: el.height / (existing.height || 1),
      } as any);
      existing.setCoords();
      return;
    }

    if (!el.visible) {
      if (existing) { canvas.remove(existing); fabricObjectsRef.current.delete(el.id); }
      return;
    }

    const dataUrl = await generateBarcode(
      el.format, el.text, el.scale, el.barHeight, el.includeText, el.background
    );

    suppressSelectionClear.current = true;
    try {
      if (existing) {
        canvas.remove(existing);
        fabricObjectsRef.current.delete(el.id);
      }

      if (dataUrl) {
        try {
          const img = await FabricImage.fromURL(dataUrl);
          img.set({
            left: el.left, top: el.top,
            scaleX: el.width / (img.width || 1),
            scaleY: el.height / (img.height || 1),
            angle: el.rotation,
            customId: el.id, customType: 'barcode', locked: el.locked,
          } as any);
          (img as any).__barcodeKey = contentKey;
          canvas.add(img);
          fabricObjectsRef.current.set(el.id, img);
        } catch {
          const rect = new Rect({
            left: el.left, top: el.top, width: el.width, height: el.height,
            fill: '#f0f0f0', stroke: '#999', strokeWidth: 1, rx: 2, ry: 2,
            angle: el.rotation,
            customId: el.id, customType: 'barcode', locked: el.locked,
          } as any);
          canvas.add(rect);
          fabricObjectsRef.current.set(el.id, rect);
        }
      } else {
        const rect = new Rect({
          left: el.left, top: el.top, width: el.width, height: el.height,
          fill: '#f0f0f0', stroke: '#999', strokeWidth: 1, rx: 2, ry: 2,
          angle: el.rotation,
          customId: el.id, customType: 'barcode', locked: el.locked,
        } as any);
        canvas.add(rect);
        fabricObjectsRef.current.set(el.id, rect);
      }

      const selId = useLabelStore.getState().selectedElementId;
      if (selId === el.id) {
        const obj = fabricObjectsRef.current.get(el.id);
        if (obj) canvas.setActiveObject(obj);
      }

      requestAnimationFrame(() => updatePreviewRef.current());
    } finally {
      suppressSelectionClear.current = false;
    }
  }, []);

  const syncTextElement = useCallback((_canvas: Canvas, el: TextElement) => {
    const existing = fabricObjectsRef.current.get(el.id);
    if (existing) {
      if (!el.visible) {
        existing.visible = false;
        existing.setCoords();
        return;
      }
      const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
      const needsPos = !same(existing.left, el.left) || !same(existing.top, el.top)
        || !same(existing.width, el.width) || !same(existing.height, el.height)
        || existing.angle !== el.rotation || existing.locked !== el.locked;
      if (needsPos) {
        existing.set({
          left: el.left, top: el.top, width: el.width, height: el.height,
          angle: el.rotation, locked: el.locked, visible: true,
        } as any);
      } else {
        existing.set({ visible: true } as any);
      }
      if (existing.text !== el.content) existing.text = el.content;
      const style = {
        fontSize: el.fontSize, fontFamily: el.fontFamily,
        fontWeight: el.fontWeight, fontStyle: el.fontStyle,
        textAlign: el.textAlign, fill: el.fill, underline: el.underline,
      } as any;
      const styleChanged = Object.keys(style).some(k => existing[k] !== style[k]);
      if (styleChanged) existing.set(style as any);
      existing.setCoords();
      return;
    }
    if (!el.visible) return;
    const textbox = new Textbox(el.content, {
      left: el.left, top: el.top, width: el.width, height: el.height,
      fontSize: el.fontSize, fontFamily: el.fontFamily,
      fontWeight: el.fontWeight, fontStyle: el.fontStyle,
      textAlign: el.textAlign, fill: el.fill, underline: el.underline,
      angle: el.rotation,
      customId: el.id, customType: 'text', locked: el.locked,
    } as any);
    _canvas.add(textbox);
    fabricObjectsRef.current.set(el.id, textbox);
  }, []);

  const syncShapeElement = useCallback((_canvas: Canvas, el: ShapeElement) => {
    const existing = fabricObjectsRef.current.get(el.id);
    if (existing) {
      if (!el.visible) {
        existing.visible = false;
        existing.setCoords();
        return;
      }
      const same = (a: number, b: number) => Math.abs(a - b) < 0.01;
      const needsPos = !same(existing.left, el.left) || !same(existing.top, el.top)
        || !same(existing.width, el.width) || !same(existing.height, el.height)
        || existing.angle !== el.rotation || existing.locked !== el.locked;
      if (needsPos) {
        existing.set({
          left: el.left, top: el.top, width: el.width, height: el.height,
          fill: fabricColor(el.fill), stroke: el.stroke,
          strokeWidth: el.strokeWidth, rx: el.rx, ry: el.ry,
          angle: el.rotation, locked: el.locked, visible: true,
        } as any);
      } else {
        existing.set({ visible: true } as any);
      }
      existing.setCoords();
      return;
    }
    if (!el.visible) return;
    const rect = new Rect({
      left: el.left, top: el.top, width: el.width, height: el.height,
      fill: fabricColor(el.fill), stroke: el.stroke,
      strokeWidth: el.strokeWidth, rx: el.rx, ry: el.ry,
      angle: el.rotation,
      customId: el.id, customType: 'shape', locked: el.locked,
    } as any);
    _canvas.add(rect);
    fabricObjectsRef.current.set(el.id, rect);
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const prevSelId = useLabelStore.getState().selectedElementId;

    if (elements.length === 0) {
      canvas.clear();
      fabricObjectsRef.current.clear();
      const bg = new Rect({
        left: 0, top: 0, width: labelW, height: labelH,
        fill: 'white', stroke: '#ccc', strokeWidth: 1,
        selectable: false, evented: false,
        customId: '__label_bg__',
      } as any);
      canvas.add(bg);
      canvas.backgroundColor = '#e8e8e8';
      canvas.renderAll();
      requestAnimationFrame(() => updatePreviewRef.current());
      return;
    }

    rebuildBackground(canvas);

    const currentIds = new Set(elements.map((e) => e.id));
    for (const [id] of fabricObjectsRef.current) {
      if (!currentIds.has(id)) {
        const obj = canvas.getObjects().find((o: any) => o.get('customId') === id);
        if (obj) canvas.remove(obj);
        fabricObjectsRef.current.delete(id);
      }
    }

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      try {
        if (el.type === 'barcode') {
          syncBarcodeElement(canvas, el as BarcodeElement);
        } else if (el.type === 'text') {
          syncTextElement(canvas, el as TextElement);
        } else if (el.type === 'shape') {
          syncShapeElement(canvas, el as ShapeElement);
        }
      } catch (err) {
        console.error('Error syncing element:', el.id, err);
      }
    }

    const objects = canvas.getObjects();
    const sortedObjs = objects.slice().sort((a: any, b: any) => {
      const aId = a.get('customId');
      const bId = b.get('customId');
      const aEl = elements.find((e) => e.id === aId);
      const bEl = elements.find((e) => e.id === bId);
      return (bEl?.zIndex ?? -1) - (aEl?.zIndex ?? -1);
    });
    for (const obj of sortedObjs) {
      canvas.sendObjectToBack(obj);
    }

    if (prevSelId) {
      const selObj = canvas.getObjects().find((o: any) => o.get('customId') === prevSelId);
      if (selObj && canvas.getActiveObject() !== selObj) {
        canvas.setActiveObject(selObj);
      }
    }

    canvas.renderAll();
    requestAnimationFrame(() => updatePreviewRef.current());
  }, [elements, labelW, labelH, rebuildBackground, syncBarcodeElement, syncTextElement, syncShapeElement]);

  return (
    <div className="canvas-container" style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
      <canvas ref={canvasElRef} />
    </div>
  );
}
