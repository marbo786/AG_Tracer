interface FileTouchBadgeProps {
  filePath: string;
  accessType: string;
}

export function FileTouchBadge({ filePath, accessType }: FileTouchBadgeProps) {
  // Extract just the filename for display
  const fileName = getBasename(filePath);
  
  // Choose an icon based on access type
  const icon = accessType === 'write' ? '✏️' : accessType === 'read' ? '👁' : accessType === 'search' ? '🔍' : '📁';
  
  return (
    <span className="file-badge" title={filePath}>
      <span>{icon}</span>
      <span>{fileName}</span>
    </span>
  );
}

function getBasename(filePath: string): string {
  // Handle both Unix and Windows paths
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] ?? filePath;
}
