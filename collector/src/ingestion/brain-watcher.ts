import { watch, type FSWatcher } from 'chokidar';
import { join, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export interface ConversationFolder {
  conversationId: string;
  transcriptPath: string;
}

export interface BrainWatcherEvents {
  onConversationFound: (folder: ConversationFolder) => void;
}

export class BrainWatcher {
  private brainPath: string;
  private watcher: FSWatcher | null = null;
  private events: BrainWatcherEvents;
  private knownConversations: Set<string> = new Set();

  constructor(brainPath: string, events: BrainWatcherEvents) {
    this.brainPath = brainPath;
    this.events = events;
  }

  /**
   * Scan existing conversations and start watching for new ones.
   */
  public async start(): Promise<void> {
    // Watch for transcript_full.jsonl files appearing under brainPath using a glob pattern
    // This handles both initial discovery and new files
    // format: <brainPath>/<conversation-id>/.system_generated/logs/transcript_full.jsonl
    const watchPattern = join(this.brainPath, '*', '.system_generated', 'logs', 'transcript_full.jsonl');
    
    this.watcher = watch(watchPattern, {
      ignoreInitial: false, 
      persistent: true 
    });

    this.watcher.on('add', (filePath) => {
      // The path looks like: brainPath / conversationId / .system_generated / logs / transcript_full.jsonl
      // dirname(filePath) is logs
      // dirname(dirname(filePath)) is .system_generated
      // dirname(dirname(dirname(filePath))) is conversationId
      const logsDir = dirname(filePath);
      const systemGeneratedDir = dirname(logsDir);
      const conversationFolder = dirname(systemGeneratedDir);
      const conversationId = basename(conversationFolder);

      if (!this.knownConversations.has(conversationId)) {
        this.knownConversations.add(conversationId);
        this.events.onConversationFound({
          conversationId,
          transcriptPath: filePath
        });
      }
    });

    this.watcher.on('error', (error) => {
      console.error(`BrainWatcher error:`, error);
    });
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
