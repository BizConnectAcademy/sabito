import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { closeDatabase } from '../database/pool.js';
import { getProjectBySlug } from '../services/project-service.js';
import { upsertFileKnowledge } from '../services/knowledge-service.js';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectSlug = argument('project');
const directory = resolve(process.cwd(), argument('path') ?? 'knowledge/bca');

if (!projectSlug) {
  console.error('Usage: npm run knowledge:import -- --project bca [--path knowledge/bca]');
  process.exitCode = 1;
} else {
  try {
    const project = await getProjectBySlug(projectSlug);
    if (!project) throw new Error(`Project "${projectSlug}" does not exist.`);

    const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
    if (files.length === 0) throw new Error(`No Markdown knowledge files found in ${directory}.`);

    let totalChunks = 0;
    for (const file of files) {
      const absolutePath = resolve(directory, file);
      const content = await readFile(absolutePath, 'utf8');
      const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file.replace(/\.md$/i, '');
      const sourceUri = relative(process.cwd(), absolutePath).replace(/\\/g, '/');
      const result = await upsertFileKnowledge(project.id, title, content, sourceUri);
      totalChunks += result.chunks;
      console.log(`${result.updated ? 'Updated' : 'Imported'} ${sourceUri} (${result.chunks} chunks)`);
    }
    console.log(`Knowledge import complete: ${files.length} documents, ${totalChunks} chunks.`);
  } finally {
    await closeDatabase();
  }
}
