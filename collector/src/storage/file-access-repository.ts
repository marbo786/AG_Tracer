import type { Database as SQLiteDatabase, Statement } from 'better-sqlite3';
import type { FileAccessRecord, AccessType } from '@ag-tracer/shared';
import type { TracerDatabase } from './database.js';

interface FileAccessRow {
  id: number;
  conversation_id: string;
  step_index: number;
  tool_call_index: number;
  file_path: string;
  access_type: string;
  tool_name: string;
}

export class FileAccessRepository {
  private db: SQLiteDatabase;
  
  private insertStmt: Statement;
  private getByConversationStmt: Statement;
  private getByPathStmt: Statement;
  private getDistinctPathsStmt: Statement;

  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
    
    // Avoid duplicates by checking if the record already exists for this specific tool call
    this.insertStmt = this.db.prepare(`
      INSERT INTO file_access (
        conversation_id, step_index, tool_call_index, file_path, access_type, tool_name
      )
      SELECT @conversationId, @stepIndex, @toolCallIndex, @filePath, @accessType, @toolName
      WHERE NOT EXISTS (
        SELECT 1 FROM file_access
        WHERE conversation_id = @conversationId
          AND step_index = @stepIndex
          AND tool_call_index = @toolCallIndex
          AND file_path = @filePath
      )
    `);

    this.getByConversationStmt = this.db.prepare(`
      SELECT * FROM file_access 
      WHERE conversation_id = ? 
      ORDER BY step_index ASC
    `);

    this.getByPathStmt = this.db.prepare(`
      SELECT * FROM file_access 
      WHERE file_path = ? 
      ORDER BY conversation_id ASC, step_index ASC
    `);

    this.getDistinctPathsStmt = this.db.prepare(`
      SELECT DISTINCT file_path 
      FROM file_access 
      WHERE conversation_id = ?
      ORDER BY file_path ASC
    `);
  }

  public insertFileAccess(record: FileAccessRecord): void {
    this.insertStmt.run({
      conversationId: record.conversationId,
      stepIndex: record.stepIndex,
      toolCallIndex: record.toolCallIndex,
      filePath: record.filePath,
      accessType: record.accessType,
      toolName: record.toolName
    });
  }

  public insertFileAccessRecords(records: FileAccessRecord[]): void {
    const transaction = this.db.transaction((recordsToInsert: FileAccessRecord[]) => {
      for (const record of recordsToInsert) {
        this.insertFileAccess(record);
      }
    });
    transaction(records);
  }

  public getFileAccessByConversation(conversationId: string): FileAccessRecord[] {
    const rows = this.getByConversationStmt.all(conversationId) as FileAccessRow[];
    return rows.map(row => this.mapRowToFileAccessRecord(row));
  }

  public getFileAccessByPath(filePath: string): FileAccessRecord[] {
    const rows = this.getByPathStmt.all(filePath) as FileAccessRow[];
    return rows.map(row => this.mapRowToFileAccessRecord(row));
  }

  public getDistinctFilePaths(conversationId: string): string[] {
    const rows = this.getDistinctPathsStmt.all(conversationId) as { file_path: string }[];
    return rows.map(row => row.file_path);
  }

  private mapRowToFileAccessRecord(row: FileAccessRow): FileAccessRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      stepIndex: row.step_index,
      toolCallIndex: row.tool_call_index,
      filePath: row.file_path,
      accessType: row.access_type as AccessType,
      toolName: row.tool_name
    };
  }
}
