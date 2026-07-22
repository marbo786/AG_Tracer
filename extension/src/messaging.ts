import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';

/**
 * Messages sent from the Extension to the Webview.
 */
export type ExtensionToWebviewMessage =
  | { type: 'spans:initial'; conversationId: string; spans: Span[]; toolCalls: ToolCallRecord[]; fileAccesses: FileAccessRecord[] }
  | { type: 'spans:update'; conversationId: string; spans: Span[]; toolCalls: ToolCallRecord[]; fileAccesses: FileAccessRecord[] }
  | { type: 'conversations:list'; conversations: { id: string; title: string }[] }
  | { type: 'conversation:changed'; conversationId: string }
  | { type: 'error'; message: string };

/**
 * Messages sent from the Webview to the Extension.
 */
export type WebviewToExtensionMessage =
  | { type: 'request:conversations' }
  | { type: 'request:spans'; conversationId: string }
  | { type: 'select:conversation'; conversationId: string };
