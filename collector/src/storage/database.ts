import Database, { type Database as SQLiteDatabase } from 'better-sqlite3';

export class TracerDatabase {
  private db: SQLiteDatabase;

  constructor(databasePath: string) {
    // SQLite exists for persistence across IDE restarts, session history, replay, search,
    // and overall robust state management - not just for the MVP single timeline.
    this.db = new Database(databasePath);
    
    // Enable WAL mode for better concurrent read/write performance
    this.db.pragma('journal_mode = WAL');
    
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spans (
        conversation_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        content TEXT,
        thinking TEXT,
        truncated_fields TEXT NOT NULL DEFAULT '[]',
        schema_version INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (conversation_id, step_index)
      );

      CREATE TABLE IF NOT EXISTS tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        tool_call_index INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        tool_args TEXT NOT NULL DEFAULT '{}',
        target_file TEXT,
        FOREIGN KEY (conversation_id, step_index) REFERENCES spans(conversation_id, step_index),
        UNIQUE(conversation_id, step_index, tool_call_index)
      );

      CREATE TABLE IF NOT EXISTS file_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        tool_call_index INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        access_type TEXT NOT NULL CHECK(access_type IN ('read', 'write', 'search', 'list')),
        tool_name TEXT NOT NULL,
        FOREIGN KEY (conversation_id, step_index) REFERENCES spans(conversation_id, step_index)
      );

      CREATE INDEX IF NOT EXISTS idx_spans_conversation ON spans(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation_step ON tool_calls(conversation_id, step_index);
      CREATE INDEX IF NOT EXISTS idx_file_access_conversation ON file_access(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_file_access_file_path ON file_access(file_path);
    `);
  }

  public getDatabase(): SQLiteDatabase {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}
