import { create } from 'zustand';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { detectThrashing } from '../utils/thrashDetection';

export interface TracerState {
  // Data
  conversations: { id: string, title: string }[];
  activeConversationId: string | null;
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
  thrashingSteps: Set<number>;
  
  // UI State
  selectedIndex: number | null;
  expandedClusters: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  viewMode: 'timeline' | 'flow' | 'files';
  isAnalyticsOpen: boolean;
  timelineFilters: Set<string>;

  // Actions
  setConversations: (conversations: { id: string, title: string }[]) => void;
  setActiveConversation: (id: string, data: { spans: Span[], toolCalls: ToolCallRecord[], fileAccesses: FileAccessRecord[] }) => void;
  appendData: (id: string, data: { spans: Span[], toolCalls: ToolCallRecord[], fileAccesses: FileAccessRecord[] }) => void;
  setSelectedIndex: (index: number | null) => void;
  toggleCluster: (clusterId: string) => void;
  setViewMode: (mode: 'timeline' | 'flow' | 'files') => void;
  setAnalyticsOpen: (open: boolean) => void;
  toggleTimelineFilter: (filter: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useTracerStore = create<TracerState>()((set, get) => ({
  conversations: [],
  activeConversationId: null,
  spans: [],
  toolCalls: [],
  fileAccesses: [],
  thrashingSteps: new Set(),
  
  selectedIndex: null,
  expandedClusters: {},
  isLoading: true,
  error: null,
  viewMode: 'timeline',
  isAnalyticsOpen: false,
  timelineFilters: new Set(['user', 'agent', 'read', 'write', 'cmd', 'error', 'system']),

  setConversations: (conversations) => set({ conversations, isLoading: false }),
  
  setActiveConversation: (id, data) => set({
    activeConversationId: id,
    spans: data.spans,
    toolCalls: data.toolCalls,
    fileAccesses: data.fileAccesses,
    thrashingSteps: detectThrashing(data.fileAccesses),
    selectedIndex: null, // Reset selection on change
    expandedClusters: {}, // Reset expanded state on change
    isLoading: false,
    error: null,
  }),

  appendData: (id, data) => {
    const state = get();
    // Only append if it's for the currently active conversation
    if (state.activeConversationId !== id) return;
    
    set((state) => {
      const newFileAccesses = [...state.fileAccesses, ...data.fileAccesses];
      
      const newSpans = [...state.spans];
      for (const span of data.spans) {
        const existingIdx = newSpans.findIndex(s => s.stepIndex === span.stepIndex);
        if (existingIdx !== -1) {
          newSpans[existingIdx] = span;
        } else {
          newSpans.push(span);
        }
      }

      return {
        spans: newSpans,
        toolCalls: [...state.toolCalls, ...data.toolCalls],
        fileAccesses: newFileAccesses,
        thrashingSteps: detectThrashing(newFileAccesses)
      };
    });
  },

  setSelectedIndex: (index) => set({ selectedIndex: index }),
  toggleCluster: (clusterId) => set((state) => ({
    expandedClusters: {
      ...state.expandedClusters,
      [clusterId]: !state.expandedClusters[clusterId]
    }
  })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setAnalyticsOpen: (open) => set({ isAnalyticsOpen: open }),
  toggleTimelineFilter: (filter) => set((state) => {
    const newFilters = new Set(state.timelineFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    return { timelineFilters: newFilters };
  }),
  setError: (error) => set({ error, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
