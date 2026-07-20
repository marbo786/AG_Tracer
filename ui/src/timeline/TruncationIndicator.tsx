interface TruncationIndicatorProps {
  truncatedFields: string[];
}

export function TruncationIndicator({ truncatedFields }: TruncationIndicatorProps) {
  if (truncatedFields.length === 0) return null;
  
  const label = truncatedFields.join(', ');
  
  return (
    <span className="truncation-indicator" title={`Truncated: ${label}`}>
      ⚠ truncated
    </span>
  );
}
