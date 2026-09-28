import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { corsOrigins } from '../config/env.js';
import { verifyAccessToken } from '../security/tokens.js';
import {
  acceptUserMessage,
  createConversation,
  findAssistantReply,
} from '../services/conversation-service.js';
import { answerMessage } from '../ai/orchestrator.js';
import { logger } from '../logger.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from './types.js';

const metadataSchema = z.record(z.string(), z.unknown());
const startSchema = z.object({ metadata: metadataSchema.optional() });
const messageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  content: z.string().trim().min(1).max(20_000),
  metadata: metadataSchema.optional(),
});

function bearerToken(socket: { handshake: { auth: Record<string, unknown>; headers: Record<string, unknown> } }): string {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === 'string') return authToken;
  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
  return '';
}

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 64 * 1024,
      pingInterval: 25_000,
      pingTimeout: 20_000,
    },
  );

  io.use((socket, next) => {
    try {
      const claims = verifyAccessToken(bearerToken(socket));
      if (!claims.scope.includes('chat:connect')) throw new Error('Missing scope.');
      socket.data.projectId = claims.sub;
      socket.data.clientId = claims.clientId;
      socket.data.externalUserId = claims.externalUserId;
      socket.data.messageTimestamps = [];
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('session:ready', {
      projectId: socket.data.projectId,
      externalUserId: socket.data.externalUserId,
    });

    socket.on('conversation:start', async (payload, acknowledge) => {
      const parsed = startSchema.safeParse(payload);
      if (!parsed.success) {
        acknowledge({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid metadata.' } });
        return;
      }
      try {
        const conversationId = await createConversation(
          socket.data.projectId,
          socket.data.externalUserId,
          parsed.data.metadata ?? null,
        );
        acknowledge({ ok: true, data: { conversationId } });
      } catch (error) {
        logger.error({ err: error }, 'Could not create conversation');
        acknowledge({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Conversation could not be created.' } });
      }
    });

    socket.on('message:send', async (payload, acknowledge) => {
      const now = Date.now();
      socket.data.messageTimestamps = socket.data.messageTimestamps.filter(
        (timestamp) => timestamp > now - 60_000,
      );
      if (socket.data.messageTimestamps.length >= 20) {
        acknowledge({ ok: false, error: { code: 'RATE_LIMITED', message: 'Please wait before sending again.' } });
        return;
      }
      socket.data.messageTimestamps.push(now);

      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) {
        acknowledge({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid message payload.' } });
        return;
      }

      try {
        const accepted = await acceptUserMessage({
          projectId: socket.data.projectId,
          externalUserId: socket.data.externalUserId,
          ...(parsed.data.conversationId ? { conversationId: parsed.data.conversationId } : {}),
          content: parsed.data.content,
          idempotencyKey: parsed.data.idempotencyKey,
          ...(parsed.data.metadata ? { metadata: parsed.data.metadata } : {}),
        });
        if (accepted.conflict) {
          acknowledge({
            ok: false,
            error: { code: 'IDEMPOTENCY_CONFLICT', message: 'This key was used for another message.' },
          });
          return;
        }

        acknowledge({
          ok: true,
          data: {
            conversationId: accepted.conversationId,
            userMessageId: accepted.messageId,
            duplicate: !accepted.isNew,
            status: accepted.status,
          },
        });

        if (!accepted.isNew) {
          const reply = await findAssistantReply(accepted.messageId);
          if (reply?.status === 'completed') {
            socket.emit('message:complete', {
              conversationId: accepted.conversationId,
              messageId: reply.id,
              content: reply.content,
              replayed: true,
            });
          }
          return;
        }

        void answerMessage(
          {
            projectId: socket.data.projectId,
            conversationId: accepted.conversationId,
            userMessageId: accepted.messageId,
            content: parsed.data.content,
          },
          {
            onStarted(messageId) {
              socket.emit('message:started', {
                conversationId: accepted.conversationId,
                userMessageId: accepted.messageId,
                messageId,
              });
            },
            onDelta(messageId, delta) {
              socket.emit('message:delta', { messageId, delta });
            },
            onCompleted(messageId, content) {
              socket.emit('message:complete', {
                conversationId: accepted.conversationId,
                messageId,
                content,
              });
            },
            onError(messageId, code) {
              socket.emit('message:error', {
                conversationId: accepted.conversationId,
                messageId,
                code,
              });
            },
          },
        );
      } catch (error) {
        const code = error instanceof Error && error.message === 'CONVERSATION_NOT_FOUND'
          ? 'CONVERSATION_NOT_FOUND'
          : 'INTERNAL_ERROR';
        logger.error({ err: error, projectId: socket.data.projectId }, 'Could not accept message');
        acknowledge({ ok: false, error: { code, message: 'Message could not be accepted.' } });
      }
    });
  });

  return io;
}
