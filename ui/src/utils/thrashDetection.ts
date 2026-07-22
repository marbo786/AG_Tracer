import type { FileAccessRecord } from '@ag-tracer/shared';

export interface ThrashEvent {
  stepIndex: number;
  filePath: string;
  writeCount: number;
}

export function detectThrashing(fileAccesses: FileAccessRecord[]): Set<number> {
  const thrashingSteps = new Set<number>();
  
  // Only care about writes
  const writes = fileAccesses.filter(fa => fa.accessType === 'write');
  if (writes.length === 0) return thrashingSteps;

  // Group writes by filePath
  const writesByFile = new Map<string, number[]>();
  for (const w of writes) {
    const existing = writesByFile.get(w.filePath) || [];
    existing.push(w.stepIndex);
    writesByFile.set(w.filePath, existing);
  }

  // For each file, check if there are 3+ writes within a 10-step window
  for (const [filePath, stepIndices] of writesByFile.entries()) {
    // Sort step indices (they should be roughly sorted, but let's be sure)
    stepIndices.sort((a, b) => a - b);

    // We use a sliding window approach
    for (let i = 0; i < stepIndices.length - 2; i++) {
      const firstStep = stepIndices[i];
      if (firstStep === undefined) continue;
      
      // Check if the step 2 indexes ahead is within 10 steps of the first step
      // Since it's sorted, if i+2 is within 10 steps, it means we have 3 writes in <= 10 steps.
      const thirdStep = stepIndices[i + 2];
      
      if (thirdStep !== undefined && (thirdStep - firstStep) <= 10) {
        // We found a thrash! Mark all steps in this window as thrashing
        let j = i;
        while (j < stepIndices.length && (stepIndices[j]! - firstStep) <= 10) {
          thrashingSteps.add(stepIndices[j]!);
          j++;
        }
      }
    }
  }

  return thrashingSteps;
}

export function getThrashInsights(fileAccesses: FileAccessRecord[]): ThrashEvent[] {
  // Similar logic, but returns distinct events for the Analytics panel
  const writes = fileAccesses.filter(fa => fa.accessType === 'write');
  if (writes.length === 0) return [];

  const writesByFile = new Map<string, number[]>();
  for (const w of writes) {
    const existing = writesByFile.get(w.filePath) || [];
    existing.push(w.stepIndex);
    writesByFile.set(w.filePath, existing);
  }

  const events: ThrashEvent[] = [];

  for (const [filePath, stepIndices] of writesByFile.entries()) {
    stepIndices.sort((a, b) => a - b);

    let i = 0;
    while (i < stepIndices.length - 2) {
      const firstStep = stepIndices[i]!;
      const thirdStep = stepIndices[i + 2];
      
      if (thirdStep !== undefined && (thirdStep - firstStep) <= 10) {
        // Found a window. Expand it as much as possible to capture the full thrash
        let j = i + 2;
        while (j + 1 < stepIndices.length && (stepIndices[j + 1]! - firstStep) <= 10) {
          j++;
        }
        
        events.push({
          stepIndex: firstStep, // start of thrash
          filePath,
          writeCount: (j - i) + 1
        });
        
        // Skip past this window
        i = j + 1;
      } else {
        i++;
      }
    }
  }

  return events;
}
