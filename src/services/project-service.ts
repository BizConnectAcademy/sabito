import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../database/pool.js';
import type { CredentialProjectRow, ProjectRow } from '../domain/models.js';
import { env } from '../config/env.js';
import { issueCredentials, verifyClientSecret } from '../security/credentials.js';

export type CreateProjectInput = {
  slug: string;
  name: string;
  assistantName: string;
  systemPrompt: string;
};

export type PublicProject = {
  id: string;
  slug: string;
  name: string;
  assistantName: string;
  status: 'active' | 'disabled';
  createdAt?: Date;
};

function publicProject(row: ProjectRow & { created_at?: Date }): PublicProject {
  const result: PublicProject = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    assistantName: row.assistant_name,
    status: row.status,
  };
  if (row.created_at) result.createdAt = row.created_at;
  return result;
}

export async function createProject(input: CreateProjectInput) {
  const projectId = randomUUID();
  const credentialId = randomUUID();
  const credentials = issueCredentials(env.CLIENT_SECRET_PEPPER);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO projects (id, slug, name, assistant_name, system_prompt)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, input.slug, input.name, input.assistantName, input.systemPrompt],
    );
    await connection.execute(
      `INSERT INTO project_credentials
       (id, project_id, client_id, secret_hash, secret_hint)
       VALUES (?, ?, ?, ?, ?)`,
      [credentialId, projectId, credentials.clientId, credentials.secretHash, credentials.secretHint],
    );
    await connection.execute(
      `INSERT INTO audit_logs (project_id, actor_type, action, metadata)
       VALUES (?, 'admin', 'project.created', ?)`,
      [projectId, JSON.stringify({ slug: input.slug, clientId: credentials.clientId })],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    project: {
      id: projectId,
      slug: input.slug,
      name: input.name,
      assistantName: input.assistantName,
      status: 'active' as const,
    },
    credentials: {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    },
  };
}

export async function listProjects(): Promise<PublicProject[]> {
  const [rows] = await db.query<(ProjectRow & { created_at: Date })[]>(
    `SELECT id, slug, name, assistant_name, status, created_at
     FROM projects ORDER BY created_at DESC`,
  );
  return rows.map(publicProject);
}

export async function getProject(projectId: string): Promise<ProjectRow | null> {
  const [rows] = await db.execute<ProjectRow[]>(
    `SELECT id, slug, name, assistant_name, system_prompt, status, settings
     FROM projects WHERE id = ? LIMIT 1`,
    [projectId],
  );
  return rows[0] ?? null;
}

export async function getProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const [rows] = await db.execute<ProjectRow[]>(
    `SELECT id, slug, name, assistant_name, system_prompt, status, settings
     FROM projects WHERE slug = ? LIMIT 1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function rotateProjectCredential(projectId: string) {
  const credentials = issueCredentials(env.CLIENT_SECRET_PEPPER);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [project] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
      [projectId],
    );
    if (project.length === 0) {
      await connection.rollback();
      return null;
    }

    await connection.execute(
      `UPDATE project_credentials
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP(3)
       WHERE project_id = ? AND status = 'active'`,
      [projectId],
    );
    await connection.execute(
      `INSERT INTO project_credentials
       (id, project_id, client_id, secret_hash, secret_hint)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), projectId, credentials.clientId, credentials.secretHash, credentials.secretHint],
    );
    await connection.execute(
      `INSERT INTO audit_logs (project_id, actor_type, action, metadata)
       VALUES (?, 'admin', 'credential.rotated', ?)`,
      [projectId, JSON.stringify({ clientId: credentials.clientId })],
    );
    await connection.commit();
    return { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function authenticateProject(
  clientId: string,
  clientSecret: string,
): Promise<CredentialProjectRow | null> {
  const [rows] = await db.execute<CredentialProjectRow[]>(
    `SELECT p.*, c.id AS credential_id, c.client_id, c.secret_hash,
            c.status AS credential_status, c.expires_at
     FROM project_credentials c
     INNER JOIN projects p ON p.id = c.project_id
     WHERE c.client_id = ? LIMIT 1`,
    [clientId],
  );
  const record = rows[0];
  if (!record || record.status !== 'active' || record.credential_status !== 'active') return null;
  if (record.expires_at && record.expires_at.getTime() <= Date.now()) return null;
  if (!verifyClientSecret(clientSecret, record.secret_hash, env.CLIENT_SECRET_PEPPER)) return null;

  await db.execute<ResultSetHeader>(
    'UPDATE project_credentials SET last_used_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [record.credential_id],
  );
  return record;
}
