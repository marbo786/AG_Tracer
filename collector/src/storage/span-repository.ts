import type { Database as SqlJsDatabase } from 'sql.js';
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
  private db: SqlJsDatabase;
  
  constructor(database: TracerDatabase) {
    this.db = database.getDatabase();
  }

  public insertSpan(span: Span): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO spans (
        conversation_id, step_index, source, type, status, 
        created_at, content, thinking, truncated_fields, schema_version
      ) VALUES (
        $conversationId, $stepIndex, $source, $type, $status,
        $createdAt, $content, $thinking, $truncatedFields, $schemaVersion
      )
    `);
    stmt.run({
      $conversationId: span.conversationId,
      $stepIndex: span.stepIndex,
      $source: span.source,
      $type: span.type,
      $status: span.status,
      $createdAt: span.createdAt,
      $content: span.content,
      $thinking: span.thinking,
      $truncatedFields: JSON.stringify(span.truncatedFields),
      $schemaVersion: span.schemaVersion
    });
    stmt.free();
  }

  public insertSpans(spans: Span[]): void {
    if (spans.length === 0) return;
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO spans (
        conversation_id, step_index, source, type, status, 
        created_at, content, thinking, truncated_fields, schema_version
      ) VALUES (
        $conversationId, $stepIndex, $source, $type, $status,
        $createdAt, $content, $thinking, $truncatedFields, $schemaVersion
      )
    `);
    for (const span of spans) {
      stmt.run({
        $conversationId: span.conversationId,
        $stepIndex: span.stepIndex,
        $source: span.source,
        $type: span.type,
        $status: span.status,
        $createdAt: span.createdAt,
        $content: span.content,
        $thinking: span.thinking,
        $truncatedFields: JSON.stringify(span.truncatedFields),
        $schemaVersion: span.schemaVersion
      });
    }
    stmt.free();
  }

  public getSpansByConversation(conversationId: string): Span[] {
    const rows: SpanRow[] = [];
    const stmt = this.db.prepare(`
      SELECT * FROM spans 
      WHERE conversation_id = $conversationId 
      ORDER BY step_index ASC
    `);
    stmt.bind({ $conversationId: conversationId });
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as SpanRow);
    }
    stmt.free();
    return rows.map(row => this.mapRowToSpan(row));
  }

  public getLatestStepIndex(conversationId: string): number | null {
    const stmt = this.db.prepare(`
      SELECT MAX(step_index) as max_step 
      FROM spans 
      WHERE conversation_id = $conversationId
    `);
    stmt.bind({ $conversationId: conversationId });
    let result: number | null = null;
    if (stmt.step()) {
      const obj = stmt.getAsObject() as { max_step: number | null };
      result = obj.max_step;
    }
    stmt.free();
    return result;
  }

  public getConversationIds(): string[] {
    const rows: { conversation_id: string }[] = [];
    const stmt = this.db.prepare(`SELECT DISTINCT conversation_id FROM spans`);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as { conversation_id: string });
    }
    stmt.free();
    return rows.map(row => row.conversation_id);
  }

  public getLatestSpan(conversationId: string): Span | null {
    const stmt = this.db.prepare(`
      SELECT * FROM spans 
      WHERE conversation_id = $conversationId 
      ORDER BY step_index DESC LIMIT 1
    `);
    stmt.bind({ $conversationId: conversationId });
    let result: Span | null = null;
    if (stmt.step()) {
      result = this.mapRowToSpan(stmt.getAsObject() as unknown as SpanRow);
    }
    stmt.free();
    return result;
  }

  public updateSpanStatus(conversationId: string, stepIndex: number, newStatus: string): void {
    const stmt = this.db.prepare(`
      UPDATE spans 
      SET status = $newStatus 
      WHERE conversation_id = $conversationId AND step_index = $stepIndex
    `);
    stmt.run({
      $conversationId: conversationId,
      $stepIndex: stepIndex,
      $newStatus: newStatus
    });
    stmt.free();
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
