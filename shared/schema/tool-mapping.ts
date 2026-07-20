export const TOOL_PATH_ARGUMENT_KEYS: Record<string, string> = {
  'view_file': 'AbsolutePath',
  'write_to_file': 'TargetFile',
  'replace_file_content': 'TargetFile',
  'multi_replace_file_content': 'TargetFile',
  'grep_search': 'SearchPath',
  'list_dir': 'DirectoryPath'
};

export const FILE_WRITE_TOOLS = [
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content'
] as const;

export const FILE_READ_TOOLS = [
  'view_file',
  'grep_search',
  'list_dir'
] as const;

export function getFilePathFromToolArgs(toolName: string, toolArgs: Record<string, unknown>): string | null {
  const argKey = TOOL_PATH_ARGUMENT_KEYS[toolName];
  if (!argKey) {
    return null;
  }
  const value = toolArgs[argKey];
  return typeof value === 'string' ? value : null;
}
