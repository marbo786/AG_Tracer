import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { TracerDatabase } from '../storage/database.js';
import { SpanRepository } from '../storage/span-repository.js';
import { ToolCallRepository } from '../storage/tool-call-repository.js';
import { FileAccessRepository } from '../storage/file-access-repository.js';
import { BrainWatcher } from './brain-watcher.js';
import { TranscriptTailer } from './transcript-tailer.js';
import { normalizeStep } from '../normalizer/normalizer.js';

export interface CollectorEvents {
  onConversationFound: (conversationId: string) => void;
  onSpansIngested: (conversationId: string, spans: Span[], toolCalls: ToolCallRecord[], fileAccesses: FileAccessRecord[]) => void;
}

export class Collector {
  private database: TracerDatabase;
  private spanRepo!: SpanRepository;
  private toolCallRepo!: ToolCallRepository;
  private fileAccessRepo!: FileAccessRepository;
  private brainWatcher: BrainWatcher;
  private tailers: Map<string, TranscriptTailer> = new Map();  // conversationId -> tailer
  private pollIntervalMs: number = 1000;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private events: CollectorEvents;
  private tailerLastActivity: Map<string, number> = new Map();
  private readonly TIMEOUT_MS = 30000;

  constructor(brainPath: string, databasePath: string, events: CollectorEvents) {
    this.database = new TracerDatabase(databasePath);
    this.events = events;

    this.brainWatcher = new BrainWatcher(brainPath, {
      onConversationFound: (folder) => {
        if (!this.tailers.has(folder.conversationId)) {
          const tailer = new TranscriptTailer(folder.transcriptPath, 0);
          this.tailers.set(folder.conversationId, tailer);
          this.events.onConversationFound(folder.conversationId);
        }
      }
    });
  }

  public async start(): Promise<void> {
    await this.database.init();
    
    // Repositories must be initialized AFTER database.init() 
    // because they prepare statements on the active sql.js db instance.
    this.spanRepo = new SpanRepository(this.database);
    this.toolCallRepo = new ToolCallRepository(this.database);
    this.fileAccessRepo = new FileAccessRepository(this.database);

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

  public getConversations(): { id: string, title: string }[] {
    const list: { id: string, title: string }[] = [];
    const db = this.database.getDatabase();
    
    // We prepare the statement once to query titles
    const stmt = db.prepare(`
      SELECT content FROM spans 
      WHERE conversation_id = $id AND type = 'USER_INPUT' 
      ORDER BY step_index ASC LIMIT 1
    `);

    for (const id of this.tailers.keys()) {
      stmt.bind({ $id: id });
      let title = id; // fallback to ID
      if (stmt.step()) {
        const obj = stmt.getAsObject() as { content: string | null };
        if (obj.content) {
           const match = obj.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
           const text = match && match[1] ? match[1] : obj.content;
           const cleanText = text.trim().replace(/\n/g, ' ');
           title = cleanText.length > 40 ? cleanText.substring(0, 40) + '...' : cleanText;
           if (!title) title = id;
        }
      }
      stmt.reset();
      list.push({ id, title });
    }
    stmt.free();
    
    return list;
  }

  public getSpansByConversation(conversationId: string): { spans: Span[]; toolCalls: ToolCallRecord[]; fileAccesses: FileAccessRecord[] } {
    if (!this.spanRepo) return { spans: [], toolCalls: [], fileAccesses: [] };
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
        if (results.length === 0) {
          const lastActivity = this.tailerLastActivity.get(conversationId) || Date.now();
          if (Date.now() - lastActivity > this.TIMEOUT_MS) {
            const latestSpan = this.spanRepo.getLatestSpan(conversationId);
            if (latestSpan && latestSpan.status === 'RUNNING') {
              this.database.transaction(() => {
                this.spanRepo.updateSpanStatus(conversationId, latestSpan.stepIndex, 'INTERRUPTED');
              });
              this.database.save();
              latestSpan.status = 'INTERRUPTED';
              this.events.onSpansIngested(conversationId, [latestSpan], [], []);
              this.tailerLastActivity.set(conversationId, Date.now());
            }
          }
          continue;
        }

        this.tailerLastActivity.set(conversationId, Date.now());

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
          this.database.transaction(() => {
            this.spanRepo.insertSpans(newSpans);
            this.toolCallRepo.insertToolCalls(newToolCalls);
            this.fileAccessRepo.insertFileAccessRecords(newFileAccesses);
          });
          
          // Save in-memory DB to disk
          this.database.save();

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
