import { openSync, readSync, fstatSync, closeSync } from 'node:fs';
import type { ParseResult } from '../parser/jsonl-parser.js';
import { parseJsonlLine } from '../parser/jsonl-parser.js';

export class TranscriptTailer {
  private filePath: string;
  private byteOffset: number = 0;

  constructor(filePath: string, startOffset: number = 0) {
    this.filePath = filePath;
    this.byteOffset = startOffset;
  }

  /**
   * Read new content from the file since the last read.
   * Returns an array of ParseResults for each complete line found.
   * Incomplete trailing lines are ignored until they are complete in the next read.
   */
  public readNewLines(): ParseResult[] {
    let fd: number | null = null;
    try {
      fd = openSync(this.filePath, 'r');
      const stats = fstatSync(fd);

      if (stats.size <= this.byteOffset) {
        return [];
      }

      const bytesToRead = stats.size - this.byteOffset;
      const buffer = Buffer.alloc(bytesToRead);
      const bytesRead = readSync(fd, buffer, 0, bytesToRead, this.byteOffset);

      if (bytesRead === 0) {
        return [];
      }

      const rawData = buffer.toString('utf-8', 0, bytesRead);
      const lines = rawData.split('\n');

      let incompleteLineBytes = 0;
      if (!rawData.endsWith('\n')) {
        const incompleteLine = lines.pop() ?? '';
        incompleteLineBytes = Buffer.byteLength(incompleteLine, 'utf-8');
      } else {
        // The string ends with \n, so split will produce an empty string at the end.
        lines.pop();
      }

      const results: ParseResult[] = [];
      for (const line of lines) {
        results.push(parseJsonlLine(line));
      }

      // Update the byte offset: advance by bytesRead, but don't advance past the incomplete line
      this.byteOffset += bytesRead - incompleteLineBytes;

      return results;
    } catch (error) {
      console.error(`Error reading ${this.filePath}:`, error);
      return [];
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch (e) {
          // Ignore close errors
        }
      }
    }
  }

  public getByteOffset(): number {
    return this.byteOffset;
  }

  public getFilePath(): string {
    return this.filePath;
  }
}

