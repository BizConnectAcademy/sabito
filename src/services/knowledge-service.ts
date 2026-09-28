import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { db } from '../database/pool.js';

export function chunkText(text: string, maximumLength = 1400, overlap = 150): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(cursor + maximumLength, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(
        normalized.lastIndexOf('\n', end),
        normalized.lastIndexOf('. ', end),
        normalized.lastIndexOf(' ', end),
      );
      if (boundary > cursor + maximumLength / 2) end = boundary + 1;
    }
    chunks.push(normalized.slice(cursor, end).trim());
    if (end >= normalized.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }
  return chunks.filter(Boolean);
}

export async function addManualKnowledge(
  projectId: string,
  title: string,
  content: string,
): Promise<{ documentId: string; chunks: number }> {
  const documentId = randomUUID();
  const chunks = chunkText(content);
  if (chunks.length === 0) throw new Error('Knowledge content cannot be empty.');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO knowledge_documents (id, project_id, title, source_type, status)
       VALUES (?, ?, ?, 'manual', 'ready')`,
      [documentId, projectId, title],
    );
    for (const [index, chunk] of chunks.entries()) {
      await connection.execute(
        `INSERT INTO knowledge_chunks (id, project_id, document_id, chunk_index, content)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), projectId, documentId, index, chunk],
      );
    }
    await connection.execute(
      `INSERT INTO audit_logs (project_id, actor_type, action, metadata)
       VALUES (?, 'admin', 'knowledge.created', ?)`,
      [projectId, JSON.stringify({ documentId, title, chunks: chunks.length })],
    );
    await connection.commit();
    return { documentId, chunks: chunks.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function upsertFileKnowledge(
  projectId: string,
  title: string,
  content: string,
  sourceUri: string,
): Promise<{ documentId: string; chunks: number; updated: boolean }> {
  const chunks = chunkText(content);
  if (chunks.length === 0) throw new Error('Knowledge content cannot be empty.');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>(
      `SELECT id FROM knowledge_documents
       WHERE project_id = ? AND source_type = 'file' AND source_uri = ?
       LIMIT 1 FOR UPDATE`,
      [projectId, sourceUri],
    );
    const updated = existing.length > 0;
    const documentId = existing[0]?.id ?? randomUUID();

    if (updated) {
      await connection.execute(
        `UPDATE knowledge_documents
         SET title = ?, status = 'ready', updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [title, documentId],
      );
      await connection.execute('DELETE FROM knowledge_chunks WHERE document_id = ?', [documentId]);
    } else {
      await connection.execute(
        `INSERT INTO knowledge_documents
         (id, project_id, title, source_type, source_uri, status)
         VALUES (?, ?, ?, 'file', ?, 'ready')`,
        [documentId, projectId, title, sourceUri],
      );
    }

    for (const [index, chunk] of chunks.entries()) {
      await connection.execute(
        `INSERT INTO knowledge_chunks (id, project_id, document_id, chunk_index, content)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), projectId, documentId, index, chunk],
      );
    }
    await connection.execute(
      `INSERT INTO audit_logs (project_id, actor_type, action, metadata)
       VALUES (?, 'admin', 'knowledge.file_imported', ?)`,
      [projectId, JSON.stringify({ documentId, title, sourceUri, chunks: chunks.length, updated })],
    );
    await connection.commit();
    return { documentId, chunks: chunks.length, updated };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

interface KnowledgeRow extends RowDataPacket {
  content: string;
  title: string;
}

export type KnowledgeMatch = {
  title: string;
  content: string;
};

export async function searchKnowledge(
  projectId: string,
  query: string,
  limit = 5,
): Promise<KnowledgeMatch[]> {
  const [rows] = await db.execute<KnowledgeRow[]>(
    `SELECT kc.content, kd.title,
            MATCH(kc.content) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance
     FROM knowledge_chunks kc
     INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
     WHERE kc.project_id = ? AND kd.status = 'ready'
       AND MATCH(kc.content) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY relevance DESC
     LIMIT ?`,
    [query, projectId, query, limit],
  );
  if (rows.length > 0) return rows.map(({ title, content }) => ({ title, content }));

  const keywords = query
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g)
    ?.filter((word, index, all) => all.indexOf(word) === index)
    .slice(0, 4) ?? [];
  if (keywords.length === 0) return [];

  const conditions = keywords.map(() => 'LOWER(kc.content) LIKE ?').join(' OR ');
  const [fallback] = await db.execute<KnowledgeRow[]>(
    `SELECT kc.content, kd.title
     FROM knowledge_chunks kc
     INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
     WHERE kc.project_id = ? AND kd.status = 'ready' AND (${conditions})
     ORDER BY kc.created_at DESC LIMIT ?`,
    [projectId, ...keywords.map((word) => `%${word}%`), limit],
  );
  return fallback.map(({ title, content }) => ({ title, content }));
}
