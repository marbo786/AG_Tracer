import type { Database as SqlJsDatabase } from 'sql.js';
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
  private db: SqlJsDatabase;
  
  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
  }

  public insertToolCall(record: ToolCallRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tool_calls (
        conversation_id, step_index, tool_call_index,
        tool_name, tool_args, target_file
      ) VALUES (
        $conversationId, $stepIndex, $toolCallIndex,
        $toolName, $toolArgs, $targetFile
      )
    `);
    stmt.run({
      $conversationId: record.conversationId,
      $stepIndex: record.stepIndex,
      $toolCallIndex: record.toolCallIndex,
      $toolName: record.toolName,
      $toolArgs: JSON.stringify(record.toolArgs),
      $targetFile: record.targetFile
    });
    stmt.free();
  }

  public insertToolCalls(records: ToolCallRecord[]): void {
    if (records.length === 0) return;
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO tool_calls (
        conversation_id, step_index, tool_call_index,
        tool_name, tool_args, target_file
      ) VALUES (
        $conversationId, $stepIndex, $toolCallIndex,
        $toolName, $toolArgs, $targetFile
      )
    `);
    for (const record of records) {
      stmt.run({
        $conversationId: record.conversationId,
        $stepIndex: record.stepIndex,
        $toolCallIndex: record.toolCallIndex,
        $toolName: record.toolName,
        $toolArgs: JSON.stringify(record.toolArgs),
        $targetFile: record.targetFile
      });
    }
    stmt.free();
  }

  public getToolCallsByStep(conversationId: string, stepIndex: number): ToolCallRecord[] {
    const rows: ToolCallRow[] = [];
    const stmt = this.db.prepare(`
      SELECT * FROM tool_calls 
      WHERE conversation_id = $conversationId AND step_index = $stepIndex 
      ORDER BY tool_call_index ASC
    `);
    stmt.bind({ $conversationId: conversationId, $stepIndex: stepIndex });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as ToolCallRow);
    }
    stmt.free();
    return rows.map(row => this.mapRowToRecord(row));
  }

  public getToolCallsByConversation(conversationId: string): ToolCallRecord[] {
    const rows: ToolCallRow[] = [];
    const stmt = this.db.prepare(`
      SELECT * FROM tool_calls 
      WHERE conversation_id = $conversationId 
      ORDER BY step_index ASC, tool_call_index ASC
    `);
    stmt.bind({ $conversationId: conversationId });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as ToolCallRow);
    }
    stmt.free();
    return rows.map(row => this.mapRowToRecord(row));
  }

  private mapRowToRecord(row: ToolCallRow): ToolCallRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      stepIndex: row.step_index,
      toolCallIndex: row.tool_call_index,
      toolName: row.tool_name,
      toolArgs: JSON.parse(row.tool_args),
      targetFile: row.target_file
    };
  }
}
