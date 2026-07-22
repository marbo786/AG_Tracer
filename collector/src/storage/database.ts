import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export class TracerDatabase {
  private db!: SqlJsDatabase;
  private dbPath: string;

  constructor(databasePath: string) {
    this.dbPath = databasePath;
  }

  public async init(): Promise<void> {
    const sqlJsDir = require('path').dirname(require.resolve('sql.js'));
    const wasmPath = require('path').join(sqlJsDir, 'sql-wasm.wasm');
    
    const SQL = await initSqlJs({
      locateFile: file => file === 'sql-wasm.wasm' ? wasmPath : file
    });
    
    if (existsSync(this.dbPath)) {
      this.db = new SQL.Database(readFileSync(this.dbPath));
    } else {
      this.db = new SQL.Database();
    }
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.run(`
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

  public getDatabase(): SqlJsDatabase {
    return this.db;
  }
  
  public transaction(cb: () => void): void {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      cb();
      this.db.exec('COMMIT;');
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  public save(): void {
    if (this.db) {
      const data = this.db.export();
      writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  public close(): void {
    this.save();
    this.db.close();
  }
}
