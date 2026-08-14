# Barcode Label Designer

A web-based barcode label designer with WYSIWYG editing, built with React, Fabric.js, and bwip-js.

## Features

- **Visual label editor** — drag, resize, rotate elements on canvas
- **Barcode generation** — Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, QR Code, Data Matrix, PDF417, GS1-128
- **Text & shapes** — add text boxes (with font family/size/style/color/alignment) and rectangles/ellipses
- **Serial number batch printing** — use `{N}` or `{N:6}` placeholders in barcode text for auto-incrementing per copy
- **Alignment tools** — align left/center/right/top/middle/bottom (single element aligns to label edge, multi-selection to bounding box)
- **Print** — browser print with `@page` sizing, or direct USB (ESC/POS WebUSB) for thermal printers
- **Export** — PDF download
- **Label size presets** — Xprinter 40×30mm through 100×70mm, plus custom sizes

## Getting Started

```bash
npm install
npm run dev
```

## Usage

1. Add elements using the toolbar on top
2. Select and edit elements in the properties panel on the right
3. For serial batch printing, type `{N:6}` in the barcode text, then open Print → enable Serial Number
4. Print via browser (any printer) or WebUSB (thermal printer)

## Build

```bash
npm run build
```

## Stack

- React + TypeScript + Vite
- Fabric.js (canvas editor)
- bwip-js (barcode rendering)
- ESC/POS (WebUSB thermal printing)
