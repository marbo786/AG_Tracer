import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { TracerDatabase } from '../storage/database.js';
import { SpanRepository } from '../storage/span-repository.js';
import { ToolCallRepository } from '../storage/tool-call-repository.js';
import { FileAccessRepository } from '../storage/file-access-repository.js';
import { BrainWatcher } from './brain-watcher.js';
import { TranscriptTailer } from './transcript-tailer.js';
import { normalizeStep } from '../normalizer/normalizer.js';

export interface CollectorEvents {
  onSpansIngested: (conversationId: string, spans: Span[], toolCalls: ToolCallRecord[], fileAccesses: FileAccessRecord[]) => void;
}

export class Collector {
  private database: TracerDatabase;
  private spanRepo: SpanRepository;
  private toolCallRepo: ToolCallRepository;
  private fileAccessRepo: FileAccessRepository;
  private brainWatcher: BrainWatcher;
  private tailers: Map<string, TranscriptTailer> = new Map();  // conversationId -> tailer
  private pollIntervalMs: number = 1000;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private events: CollectorEvents;

  constructor(brainPath: string, databasePath: string, events: CollectorEvents) {
    this.database = new TracerDatabase(databasePath);
    this.spanRepo = new SpanRepository(this.database);
    this.toolCallRepo = new ToolCallRepository(this.database);
    this.fileAccessRepo = new FileAccessRepository(this.database);
    this.events = events;

    this.brainWatcher = new BrainWatcher(brainPath, {
      onConversationFound: (folder) => {
        if (!this.tailers.has(folder.conversationId)) {
          const tailer = new TranscriptTailer(folder.transcriptPath, 0);
          this.tailers.set(folder.conversationId, tailer);
          // Optional: Do an immediate initial read here if desired, or let the poll loop handle it.
          // We will let the poll loop handle it naturally to avoid blocking the watcher event.
        }
      }
    });
  }

  public async start(): Promise<void> {
    await this.brainWatcher.start();
    
    this.pollTimer = setInterval(() => {
      this.pollAll();
    }, this.pollIntervalMs);
  }

  public stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.brainWatcher.stop();
    this.database.close();
  }

  public getConversationIds(): string[] {
    return this.spanRepo.getConversationIds();
  }

  public getSpansByConversation(conversationId: string): { spans: Span[]; toolCalls: ToolCallRecord[]; fileAccesses: FileAccessRecord[] } {
    return {
      spans: this.spanRepo.getSpansByConversation(conversationId),
      toolCalls: this.toolCallRepo.getToolCallsByConversation(conversationId),
      fileAccesses: this.fileAccessRepo.getFileAccessByConversation(conversationId)
    };
  }

  private pollAll(): void {
    for (const [conversationId, tailer] of this.tailers.entries()) {
      try {
        const results = tailer.readNewLines();
        if (results.length === 0) continue;

        const newSpans: Span[] = [];
        const newToolCalls: ToolCallRecord[] = [];
        const newFileAccesses: FileAccessRecord[] = [];

        for (const result of results) {
          if (!result.success) {
            console.warn(`[Collector] Failed to parse line in ${conversationId}: ${result.error}`, result.rawLine);
            continue;
          }

          const normalized = normalizeStep(conversationId, result.step);
          newSpans.push(normalized.span);
          newToolCalls.push(...normalized.toolCalls);
          newFileAccesses.push(...normalized.fileAccesses);
        }

        if (newSpans.length > 0) {
          // Process in a transaction
          const db = this.database.getDatabase();
          const transaction = db.transaction(() => {
            this.spanRepo.insertSpans(newSpans);
            this.toolCallRepo.insertToolCalls(newToolCalls);
            this.fileAccessRepo.insertFileAccessRecords(newFileAccesses);
          });
          
          transaction();

          // Emit event for the extension
          this.events.onSpansIngested(conversationId, newSpans, newToolCalls, newFileAccesses);
        }

      } catch (error) {
        console.error(`[Collector] Error polling conversation ${conversationId}:`, error);
        // Continue with other tailers even if one fails
      }
    }
  }
}
