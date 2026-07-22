import { useEffect } from 'react';
import { useTracerStore } from '../store/useTracerStore';

export function useKeyboardNav() {
  const spans = useTracerStore(state => state.spans);
  const selectedIndex = useTracerStore(state => state.selectedIndex);
  const setSelectedIndex = useTracerStore(state => state.setSelectedIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable ||
        (e.target as HTMLElement).closest('.monaco-editor')
      ) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex === null) {
          setSelectedIndex(spans.length > 0 ? 0 : null);
        } else {
          setSelectedIndex(Math.min(selectedIndex + 1, spans.length - 1));
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex === null) {
          setSelectedIndex(spans.length > 0 ? spans.length - 1 : null);
        } else {
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spans.length, selectedIndex, setSelectedIndex]);
}
