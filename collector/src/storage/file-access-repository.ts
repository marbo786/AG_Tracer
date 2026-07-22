import type { Database as SqlJsDatabase } from 'sql.js';
import type { FileAccessRecord } from '@ag-tracer/shared';
import type { TracerDatabase } from './database.js';

interface FileAccessRow {
  id: number;
  conversation_id: string;
  step_index: number;
  tool_call_index: number;
  file_path: string;
  access_type: 'read' | 'write' | 'search' | 'list';
  tool_name: string;
}

export class FileAccessRepository {
  private db: SqlJsDatabase;
  
  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
  }

  public insertFileAccess(record: FileAccessRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO file_access (
        conversation_id, step_index, tool_call_index,
        file_path, access_type, tool_name
      ) VALUES (
        $conversationId, $stepIndex, $toolCallIndex,
        $filePath, $accessType, $toolName
      )
    `);
    stmt.run({
      $conversationId: record.conversationId,
      $stepIndex: record.stepIndex,
      $toolCallIndex: record.toolCallIndex,
      $filePath: record.filePath,
      $accessType: record.accessType,
      $toolName: record.toolName
    });
    stmt.free();
  }

  public insertFileAccessRecords(records: FileAccessRecord[]): void {
    if (records.length === 0) return;
    const stmt = this.db.prepare(`
      INSERT INTO file_access (
        conversation_id, step_index, tool_call_index,
        file_path, access_type, tool_name
      ) VALUES (
        $conversationId, $stepIndex, $toolCallIndex,
        $filePath, $accessType, $toolName
      )
    `);
    for (const record of records) {
      stmt.run({
        $conversationId: record.conversationId,
        $stepIndex: record.stepIndex,
        $toolCallIndex: record.toolCallIndex,
        $filePath: record.filePath,
        $accessType: record.accessType,
        $toolName: record.toolName
      });
    }
    stmt.free();
  }

  public getFileAccessByConversation(conversationId: string): FileAccessRecord[] {
    const rows: FileAccessRow[] = [];
    const stmt = this.db.prepare(`
      SELECT * FROM file_access 
      WHERE conversation_id = $conversationId 
      ORDER BY step_index ASC, tool_call_index ASC
    `);
    stmt.bind({ $conversationId: conversationId });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as FileAccessRow);
    }
    stmt.free();
    return rows.map(row => this.mapRowToRecord(row));
  }

  public getFileAccessByPath(filePath: string): FileAccessRecord[] {
    const rows: FileAccessRow[] = [];
    const stmt = this.db.prepare(`
      SELECT * FROM file_access 
      WHERE file_path = $filePath 
      ORDER BY conversation_id ASC, step_index ASC
    `);
    stmt.bind({ $filePath: filePath });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as FileAccessRow);
    }
    stmt.free();
    return rows.map(row => this.mapRowToRecord(row));
  }

  public getDistinctFilePaths(conversationId: string): string[] {
    const rows: { file_path: string }[] = [];
    const stmt = this.db.prepare(`
      SELECT DISTINCT file_path 
      FROM file_access 
      WHERE conversation_id = $conversationId
    `);
    stmt.bind({ $conversationId: conversationId });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as { file_path: string });
    }
    stmt.free();
    return rows.map(row => row.file_path);
  }

  private mapRowToRecord(row: FileAccessRow): FileAccessRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      stepIndex: row.step_index,
      toolCallIndex: row.tool_call_index,
      filePath: row.file_path,
      accessType: row.access_type,
      toolName: row.tool_name
    };
  }
}
