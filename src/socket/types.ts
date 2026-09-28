export type SocketAck =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string } };

export interface ClientToServerEvents {
  'conversation:start': (
    payload: { metadata?: Record<string, unknown> },
    acknowledge: (response: SocketAck) => void,
  ) => void;
  'message:send': (
    payload: {
      conversationId?: string;
      idempotencyKey: string;
      content: string;
      metadata?: Record<string, unknown>;
    },
    acknowledge: (response: SocketAck) => void,
  ) => void;
}

export interface ServerToClientEvents {
  'session:ready': (payload: { projectId: string; externalUserId: string }) => void;
  'message:started': (payload: {
    conversationId: string;
    userMessageId: string;
    messageId: string;
  }) => void;
  'message:delta': (payload: { messageId: string; delta: string }) => void;
  'message:complete': (payload: {
    conversationId: string;
    messageId: string;
    content: string;
    replayed?: boolean;
  }) => void;
  'message:error': (payload: {
    conversationId: string;
    messageId: string | null;
    code: string;
  }) => void;
}

export interface SocketData {
  projectId: string;
  clientId: string;
  externalUserId: string;
  messageTimestamps: number[];
}
