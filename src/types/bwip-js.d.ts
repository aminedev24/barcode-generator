declare module 'bwip-js' {
  interface BwipJsOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    backgroundcolor?: string;
    textxalign?: string;
    padding?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: 'N' | 'R' | 'L' | 'I';
    alttext?: string;
  }

  function toCanvas(canvas: HTMLCanvasElement, opts: BwipJsOptions): Promise<void>;
  function toBuffer(opts: BwipJsOptions): Buffer;
  function toDataURL(opts: BwipJsOptions): string;

  const bwipjs: {
    toCanvas: typeof toCanvas;
    toBuffer: typeof toBuffer;
    toDataURL: typeof toDataURL;
  };

  export default bwipjs;
}
