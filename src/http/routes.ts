import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../database/pool.js';
import { env } from '../config/env.js';
import { signAccessToken } from '../security/tokens.js';
import {
  authenticateProject,
  createProject,
  listProjects,
  rotateProjectCredential,
} from '../services/project-service.js';
import { addManualKnowledge } from '../services/knowledge-service.js';
import { parseBasicCredentials, requireAdmin } from './middleware.js';

const tokenBodySchema = z.object({
  external_user_id: z.string().trim().min(1).max(191).optional(),
}).default({});
const projectSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(150),
  assistant_name: z.string().trim().min(2).max(80).default('Sabito'),
  system_prompt: z.string().trim().min(20).max(20000),
});
const knowledgeSchema = z.object({
  title: z.string().trim().min(2).max(255),
  content: z.string().trim().min(20).max(1_000_000),
});
const idSchema = z.string().uuid();

export const routes = Router();
const sensitiveLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true });

routes.get('/health', async (_request, response) => {
  await db.query('SELECT 1');
  response.json({
    success: true,
    service: 'sabito-bca',
    status: 'healthy',
    public_url: env.PUBLIC_URL,
  });
});

routes.post('/v1/auth/token', sensitiveLimiter, async (request, response) => {
  const credentials = parseBasicCredentials(request.header('authorization'));
  const body = tokenBodySchema.safeParse(request.body);
  if (!credentials || !body.success) {
    response.status(400).json({
      success: false,
      message: 'Valid Basic client credentials are required.',
    });
    return;
  }

  const project = await authenticateProject(credentials.clientId, credentials.clientSecret);
  if (!project) {
    response.status(401).json({ success: false, message: 'Invalid client credentials.' });
    return;
  }

  const generatedGuest = !body.data.external_user_id;
  const externalUserId = body.data.external_user_id ?? `guest:${randomUUID()}`;
  const accessToken = signAccessToken({
    sub: project.id,
    clientId: project.client_id,
    externalUserId,
    scope: ['chat:connect'],
  });
  response.setHeader('Cache-Control', 'no-store');
  response.json({
    success: true,
    data: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: env.JWT_TTL_SECONDS,
      socket_url: env.PUBLIC_URL,
      socket_path: '/socket.io',
      external_user_id: externalUserId,
      identity_type: generatedGuest ? 'guest' : 'platform_user',
    },
  });
});

routes.use('/v1/admin', sensitiveLimiter, requireAdmin);

routes.get('/v1/admin/projects', async (_request, response) => {
  response.json({ success: true, data: await listProjects() });
});

routes.post('/v1/admin/projects', async (request, response) => {
  const parsed = projectSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ success: false, message: 'Invalid project.', errors: parsed.error.flatten() });
    return;
  }
  const result = await createProject({
    slug: parsed.data.slug,
    name: parsed.data.name,
    assistantName: parsed.data.assistant_name,
    systemPrompt: parsed.data.system_prompt,
  });
  response.status(201).setHeader('Cache-Control', 'no-store').json({
    success: true,
    message: 'Store the client secret now; it will not be shown again.',
    data: result,
  });
});

routes.post('/v1/admin/projects/:projectId/credentials/rotate', async (request, response) => {
  const projectId = idSchema.safeParse(request.params.projectId);
  if (!projectId.success) {
    response.status(422).json({ success: false, message: 'Invalid project ID.' });
    return;
  }
  const credentials = await rotateProjectCredential(projectId.data);
  if (!credentials) {
    response.status(404).json({ success: false, message: 'Project not found.' });
    return;
  }
  response.setHeader('Cache-Control', 'no-store').json({
    success: true,
    message: 'Previous credentials were revoked. Store the new secret now.',
    data: credentials,
  });
});

routes.post('/v1/admin/projects/:projectId/knowledge', async (request, response) => {
  const projectId = idSchema.safeParse(request.params.projectId);
  const body = knowledgeSchema.safeParse(request.body);
  if (!projectId.success || !body.success) {
    response.status(422).json({ success: false, message: 'Invalid knowledge document.' });
    return;
  }
  const document = await addManualKnowledge(projectId.data, body.data.title, body.data.content);
  response.status(201).json({ success: true, data: document });
});
