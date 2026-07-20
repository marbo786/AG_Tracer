import type { Database as SQLiteDatabase, Statement } from 'better-sqlite3';
import type { Span } from '@ag-tracer/shared';
import type { TracerDatabase } from './database.js';

interface SpanRow {
  conversation_id: string;
  step_index: number;
  source: string;
  type: string;
  status: string;
  created_at: string;
  content: string | null;
  thinking: string | null;
  truncated_fields: string; // JSON string
  schema_version: number;
}

export class SpanRepository {
  private db: SQLiteDatabase;
  
  private insertStmt: Statement;
  private getByConversationStmt: Statement;
  private getLatestStepIndexStmt: Statement;
  private getConversationIdsStmt: Statement;

  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
    
    this.insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO spans (
        conversation_id, step_index, source, type, status, 
        created_at, content, thinking, truncated_fields, schema_version
      ) VALUES (
        @conversationId, @stepIndex, @source, @type, @status,
        @createdAt, @content, @thinking, @truncatedFields, @schemaVersion
      )
    `);

    this.getByConversationStmt = this.db.prepare(`
      SELECT * FROM spans 
      WHERE conversation_id = ? 
      ORDER BY step_index ASC
    `);

    this.getLatestStepIndexStmt = this.db.prepare(`
      SELECT MAX(step_index) as max_step 
      FROM spans 
      WHERE conversation_id = ?
    `);

    this.getConversationIdsStmt = this.db.prepare(`
      SELECT DISTINCT conversation_id 
      FROM spans
    `);
  }

  public insertSpan(span: Span): void {
    this.insertStmt.run({
      conversationId: span.conversationId,
      stepIndex: span.stepIndex,
      source: span.source,
      type: span.type,
      status: span.status,
      createdAt: span.createdAt,
      content: span.content,
      thinking: span.thinking,
      truncatedFields: JSON.stringify(span.truncatedFields),
      schemaVersion: span.schemaVersion
    });
  }

  public insertSpans(spans: Span[]): void {
    const transaction = this.db.transaction((spansToInsert: Span[]) => {
      for (const span of spansToInsert) {
        this.insertSpan(span);
      }
    });
    transaction(spans);
  }

  public getSpansByConversation(conversationId: string): Span[] {
    const rows = this.getByConversationStmt.all(conversationId) as SpanRow[];
    return rows.map(row => this.mapRowToSpan(row));
  }

  public getLatestStepIndex(conversationId: string): number | null {
    const result = this.getLatestStepIndexStmt.get(conversationId) as { max_step: number | null } | undefined;
    if (!result || result.max_step === null) {
      return null;
    }
    return result.max_step;
  }

  public getConversationIds(): string[] {
    const rows = this.getConversationIdsStmt.all() as { conversation_id: string }[];
    return rows.map(row => row.conversation_id);
  }

  private mapRowToSpan(row: SpanRow): Span {
    return {
      conversationId: row.conversation_id,
      stepIndex: row.step_index,
      source: row.source,
      type: row.type,
      status: row.status,
      createdAt: row.created_at,
      content: row.content,
      thinking: row.thinking,
      truncatedFields: JSON.parse(row.truncated_fields),
      schemaVersion: row.schema_version
    };
  }
}
