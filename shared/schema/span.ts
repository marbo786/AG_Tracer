export interface RawToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RawStep {
  step_index: number;
  source: string;
  type: string;
  status: string;
  created_at: string;
  content?: string;
  thinking?: string;
  tool_calls?: RawToolCall[];
  truncated_fields?: string[];
}

export interface Span {
  conversationId: string;
  stepIndex: number;
  source: string;
  type: string;
  status: string;
  createdAt: string; // ISO 8601
  content: string | null;
  thinking: string | null;
  truncatedFields: string[]; // which fields were truncated
  schemaVersion: number;
}

export interface ToolCallRecord {
  id?: number; // auto-increment
  conversationId: string;
  stepIndex: number; // FK to span
  toolCallIndex: number; // position within the step's tool_calls array
  toolName: string;
  toolArgs: Record<string, unknown>;
  targetFile: string | null; // extracted via file-path-extractor
}

export type AccessType = 'read' | 'write' | 'search' | 'list';

export interface FileAccessRecord {
  id?: number;
  conversationId: string;
  stepIndex: number;
  toolCallIndex: number;
  filePath: string;
  accessType: AccessType;
  toolName: string;
}

export const TOOL_ACCESS_TYPE: Record<string, AccessType> = {
  'write_to_file': 'write',
  'replace_file_content': 'write',
  'multi_replace_file_content': 'write',
  'view_file': 'read',
  'grep_search': 'search',
  'list_dir': 'list'
};
