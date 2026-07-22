import { watch, type FSWatcher } from 'chokidar';
import { basename, dirname } from 'node:path';


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
    // Watch the brain directory recursively instead of using a glob pattern,
    // which avoids Windows glob parsing bugs in chokidar
    this.watcher = watch(this.brainPath, {
      ignoreInitial: false, 
      persistent: true,
      depth: 4
    });

    this.watcher.on('add', (filePath) => {
      // Ensure we only process transcript_full.jsonl
      if (!filePath.endsWith('transcript_full.jsonl')) {
        return;
      }

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
