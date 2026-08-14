export type BarcodeFormat =
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf14'
  | 'qrcode'
  | 'datamatrix'
  | 'pdf417'
  | 'gs1128'
  | 'code93';

export type ElementType = 'barcode' | 'text' | 'shape';

export interface BaseElement {
  id: string;
  type: ElementType;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  format: BarcodeFormat;
  text: string;
  scale: number;
  barHeight: number;
  includeText: boolean;
  background: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
  underline: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx: number;
  ry: number;
}

export type LabelElement = BarcodeElement | TextElement | ShapeElement;

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'in';
  orientation: 'portrait' | 'landscape';
  elements: LabelElement[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintSettings {
  copies: number;
  dpi: number;
  pageSize: 'same' | 'a4' | 'letter';
  margin: number;
}
