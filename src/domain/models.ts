import type { RowDataPacket } from 'mysql2';

export interface ProjectRow extends RowDataPacket {
  id: string;
  slug: string;
  name: string;
  assistant_name: string;
  system_prompt: string;
  status: 'active' | 'disabled';
  settings: string | Record<string, unknown> | null;
}

export interface CredentialProjectRow extends ProjectRow {
  credential_id: string;
  client_id: string;
  secret_hash: string;
  credential_status: 'active' | 'revoked';
  expires_at: Date | null;
}

export interface ConversationRow extends RowDataPacket {
  id: string;
  project_id: string;
  external_user_id: string;
}

export interface MessageRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  reply_to_message_id: string | null;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  status: 'accepted' | 'streaming' | 'completed' | 'failed';
  idempotency_key: string | null;
  error_code: string | null;
  created_at: Date;
}
