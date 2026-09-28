import { randomUUID } from 'node:crypto';
import type { ResultSetHeader } from 'mysql2';
import { db } from '../database/pool.js';
import type { ConversationRow, MessageRow } from '../domain/models.js';

export async function createConversation(
  projectId: string,
  externalUserId: string,
  metadata: Record<string, unknown> | null = null,
): Promise<string> {
  const id = randomUUID();
  await db.execute(
    `INSERT INTO conversations (id, project_id, external_user_id, metadata)
     VALUES (?, ?, ?, ?)`,
    [id, projectId, externalUserId, metadata ? JSON.stringify(metadata) : null],
  );
  return id;
}

export type AcceptedMessage = {
  conversationId: string;
  messageId: string;
  status: MessageRow['status'];
  isNew: boolean;
  conflict: boolean;
};

export async function acceptUserMessage(input: {
  projectId: string;
  externalUserId: string;
  conversationId?: string;
  content: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): Promise<AcceptedMessage> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let conversationId = input.conversationId;

    if (conversationId) {
      const [conversations] = await connection.execute<ConversationRow[]>(
        `SELECT id, project_id, external_user_id FROM conversations
         WHERE id = ? AND project_id = ? AND external_user_id = ? LIMIT 1 FOR UPDATE`,
        [conversationId, input.projectId, input.externalUserId],
      );
      if (conversations.length === 0) throw new Error('CONVERSATION_NOT_FOUND');
    } else {
      conversationId = randomUUID();
      await connection.execute(
        `INSERT INTO conversations (id, project_id, external_user_id)
         VALUES (?, ?, ?)`,
        [conversationId, input.projectId, input.externalUserId],
      );
    }

    const messageId = randomUUID();
    try {
      await connection.execute(
        `INSERT INTO messages
         (id, project_id, conversation_id, role, content, status, idempotency_key, metadata)
         VALUES (?, ?, ?, 'user', ?, 'accepted', ?, ?)`,
        [
          messageId,
          input.projectId,
          conversationId,
          input.content,
          input.idempotencyKey,
          input.metadata ? JSON.stringify(input.metadata) : null,
        ],
      );
      await connection.commit();
      return { conversationId, messageId, status: 'accepted', isNew: true, conflict: false };
    } catch (error) {
      const mysqlError = error as { code?: string };
      if (mysqlError.code !== 'ER_DUP_ENTRY') throw error;

      const [existing] = await connection.execute<MessageRow[]>(
        `SELECT id, conversation_id, content, status FROM messages
         WHERE project_id = ? AND idempotency_key = ? LIMIT 1`,
        [input.projectId, input.idempotencyKey],
      );
      const prior = existing[0];
      if (!prior) throw error;
      await connection.commit();
      return {
        conversationId: prior.conversation_id,
        messageId: prior.id,
        status: prior.status,
        isNew: false,
        conflict: prior.content !== input.content || prior.conversation_id !== conversationId,
      };
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getConversationMessages(conversationId: string, limit = 20): Promise<MessageRow[]> {
  const [rows] = await db.execute<MessageRow[]>(
    `SELECT * FROM (
       SELECT id, conversation_id, reply_to_message_id, role, content, status, created_at
       FROM messages
       WHERE conversation_id = ? AND status = 'completed'
       ORDER BY created_at DESC LIMIT ?
     ) recent ORDER BY created_at ASC`,
    [conversationId, limit],
  );
  return rows;
}

export async function findAssistantReply(userMessageId: string): Promise<MessageRow | null> {
  const [rows] = await db.execute<MessageRow[]>(
    `SELECT id, conversation_id, reply_to_message_id, role, content, status, error_code, created_at
     FROM messages WHERE reply_to_message_id = ? AND role = 'assistant'
     ORDER BY created_at DESC LIMIT 1`,
    [userMessageId],
  );
  return rows[0] ?? null;
}

export async function beginAssistantMessage(
  projectId: string,
  conversationId: string,
  userMessageId: string,
): Promise<string> {
  const id = randomUUID();
  await db.execute(
    `INSERT INTO messages
     (id, project_id, conversation_id, reply_to_message_id, role, content, status)
     VALUES (?, ?, ?, ?, 'assistant', '', 'streaming')`,
    [id, projectId, conversationId, userMessageId],
  );
  return id;
}

export async function completeAssistantMessage(messageId: string, content: string): Promise<void> {
  await db.execute<ResultSetHeader>(
    `UPDATE messages SET content = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [content, messageId],
  );
}

export async function failAssistantMessage(messageId: string, code: string): Promise<void> {
  await db.execute<ResultSetHeader>(
    `UPDATE messages SET status = 'failed', error_code = ?, completed_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [code, messageId],
  );
}

export async function markUserMessageCompleted(messageId: string): Promise<void> {
  await db.execute<ResultSetHeader>(
    `UPDATE messages SET status = 'completed', completed_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [messageId],
  );
}

export async function failUserMessage(messageId: string, code: string): Promise<void> {
  await db.execute<ResultSetHeader>(
    `UPDATE messages SET status = 'failed', error_code = ?, completed_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [code, messageId],
  );
}
