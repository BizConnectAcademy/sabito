import { buildKnowledgeAnswer, streamParts } from './knowledge-answer.js';
import {
  beginAssistantMessage,
  completeAssistantMessage,
  failAssistantMessage,
  failUserMessage,
  getConversationMessages,
  markUserMessageCompleted,
} from '../services/conversation-service.js';
import { searchKnowledge } from '../services/knowledge-service.js';
import { getProject } from '../services/project-service.js';

export type StreamCallbacks = {
  onStarted(messageId: string): void;
  onDelta(messageId: string, delta: string): void;
  onCompleted(messageId: string, content: string): void;
  onError(messageId: string | null, code: string): void;
};

export async function answerMessage(
  input: {
    projectId: string;
    conversationId: string;
    userMessageId: string;
    content: string;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  let assistantMessageId: string | null = null;
  try {
    const project = await getProject(input.projectId);
    if (!project || project.status !== 'active') throw new Error('PROJECT_UNAVAILABLE');

    const history = await getConversationMessages(input.conversationId);
    const priorQuestions = history
      .filter((message) => message.role === 'user')
      .slice(-2)
      .map((message) => message.content)
      .join(' ');
    const knowledge = await searchKnowledge(
      input.projectId,
      `${priorQuestions} ${input.content}`.trim(),
    );

    assistantMessageId = await beginAssistantMessage(
      input.projectId,
      input.conversationId,
      input.userMessageId,
    );
    callbacks.onStarted(assistantMessageId);

    const complete = buildKnowledgeAnswer(input.content, knowledge);
    for (const delta of streamParts(complete)) {
      callbacks.onDelta(assistantMessageId, delta);
    }

    await Promise.all([
      completeAssistantMessage(assistantMessageId, complete),
      markUserMessageCompleted(input.userMessageId),
    ]);
    callbacks.onCompleted(assistantMessageId, complete);
  } catch (error) {
    const rawCode = error instanceof Error
      ? (error.message.split(':')[0] ?? 'UNKNOWN_ERROR')
      : 'UNKNOWN_ERROR';
    const code = rawCode.replace(/[^A-Z0-9_]/gi, '_').toUpperCase().slice(0, 80);
    await Promise.all([
      assistantMessageId ? failAssistantMessage(assistantMessageId, code) : Promise.resolve(),
      failUserMessage(input.userMessageId, code),
    ]);
    callbacks.onError(assistantMessageId, code);
  }
}
