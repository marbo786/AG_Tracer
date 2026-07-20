import type { Database as SQLiteDatabase, Statement } from 'better-sqlite3';
import type { ToolCallRecord } from '@ag-tracer/shared';
import type { TracerDatabase } from './database.js';

interface ToolCallRow {
  id: number;
  conversation_id: string;
  step_index: number;
  tool_call_index: number;
  tool_name: string;
  tool_args: string; // JSON string
  target_file: string | null;
}

export class ToolCallRepository {
  private db: SQLiteDatabase;
  
  private insertStmt: Statement;
  private getByStepStmt: Statement;
  private getByConversationStmt: Statement;

  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
    
    this.insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO tool_calls (
        conversation_id, step_index, tool_call_index, tool_name, tool_args, target_file
      ) VALUES (
        @conversationId, @stepIndex, @toolCallIndex, @toolName, @toolArgs, @targetFile
      )
    `);

    this.getByStepStmt = this.db.prepare(`
      SELECT * FROM tool_calls 
      WHERE conversation_id = ? AND step_index = ?
      ORDER BY tool_call_index ASC
    `);

    this.getByConversationStmt = this.db.prepare(`
      SELECT * FROM tool_calls 
      WHERE conversation_id = ?
      ORDER BY step_index ASC, tool_call_index ASC
    `);
  }

  public insertToolCall(record: ToolCallRecord): void {
    this.insertStmt.run({
      conversationId: record.conversationId,
      stepIndex: record.stepIndex,
      toolCallIndex: record.toolCallIndex,
      toolName: record.toolName,
      toolArgs: JSON.stringify(record.toolArgs),
      targetFile: record.targetFile ?? null
    });
  }

  public insertToolCalls(records: ToolCallRecord[]): void {
    const transaction = this.db.transaction((recordsToInsert: ToolCallRecord[]) => {
      for (const record of recordsToInsert) {
        this.insertToolCall(record);
      }
    });
    transaction(records);
  }

  public getToolCallsByStep(conversationId: string, stepIndex: number): ToolCallRecord[] {
    const rows = this.getByStepStmt.all(conversationId, stepIndex) as ToolCallRow[];
    return rows.map(row => this.mapRowToToolCallRecord(row));
  }

  public getToolCallsByConversation(conversationId: string): ToolCallRecord[] {
    const rows = this.getByConversationStmt.all(conversationId) as ToolCallRow[];
    return rows.map(row => this.mapRowToToolCallRecord(row));
  }

  private mapRowToToolCallRecord(row: ToolCallRow): ToolCallRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      stepIndex: row.step_index,
      toolCallIndex: row.tool_call_index,
      toolName: row.tool_name,
      toolArgs: JSON.parse(row.tool_args) as Record<string, unknown>,
      targetFile: row.target_file
    };
  }
}
