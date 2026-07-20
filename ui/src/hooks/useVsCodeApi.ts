import { useMemo } from 'react';

export function useVsCodeApi(): VsCodeApi | null {
  return useMemo(() => {
    try {
      return acquireVsCodeApi();
    } catch {
      // Running outside VS Code (e.g., in a browser during development)
      return null;
    }
  }, []);
}
