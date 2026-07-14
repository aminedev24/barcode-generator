import { useEffect } from 'react';
import { useLabelStore } from '../store/labelStore';

interface ShortcutHandlers {
  onNew: () => void;
  onSave: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
}

export function useKeyboardShortcuts({
  onNew,
  onSave,
  onPrint,
  onExportPdf,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        onNew();
        return;
      }

      if (ctrl && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      if (ctrl && e.key === 'p') {
        e.preventDefault();
        onPrint();
        return;
      }

      if (ctrl && e.key === 'e') {
        e.preventDefault();
        onExportPdf();
        return;
      }

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !isInput
      ) {
        const selectedId = useLabelStore.getState().selectedElementId;
        if (selectedId) {
          e.preventDefault();
          useLabelStore.getState().removeElement(selectedId);
        }
        return;
      }

      if (e.key === 'Escape') {
        useLabelStore.getState().selectElement(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNew, onSave, onPrint, onExportPdf]);
}
