export const KNOWN_STEP_TYPES = [
  'ASK_QUESTION',
  'CHECKPOINT',
  'CODE_ACTION',
  'CONVERSATION_HISTORY',
  'EPHEMERAL_MESSAGE',
  'ERROR_MESSAGE',
  'GENERATE_IMAGE',
  'GENERIC',
  'GREP_SEARCH',
  'INVOKE_SUBAGENT',
  'LIST_DIRECTORY',
  'PLANNER_RESPONSE',
  'RUN_COMMAND',
  'SEARCH_WEB',
  'SYSTEM_MESSAGE',
  'USER_INPUT',
  'VIEW_FILE'
] as const;

export const KNOWN_SOURCES = [
  'MODEL',
  'SYSTEM',
  'USER_EXPLICIT'
] as const;

// Branded pattern for forward compatibility
export type StepType = typeof KNOWN_STEP_TYPES[number] | (string & {});
export type StepSource = typeof KNOWN_SOURCES[number] | (string & {});

export const SCHEMA_VERSION = 1;
