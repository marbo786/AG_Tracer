import { useMemo } from 'react';

export interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// Global singleton to guarantee acquireVsCodeApi is only ever called once per webview session
let vscodeApiSingleton: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi | null {
  if (!vscodeApiSingleton) {
    if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
      try {
        // @ts-ignore
        vscodeApiSingleton = acquireVsCodeApi();
      } catch {
        // Fallback for development/testing environments
        vscodeApiSingleton = null;
      }
    }
  }
  return vscodeApiSingleton;
}

export function useVsCodeApi(): VsCodeApi | null {
  return useMemo(() => getVsCodeApi(), []);
}
