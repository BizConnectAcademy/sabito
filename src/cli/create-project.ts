import { closeDatabase } from '../database/pool.js';
import { createProject } from '../services/project-service.js';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const slug = argument('slug');
const name = argument('name');
const assistantName = argument('assistant') ?? 'Sabito';
const systemPrompt = argument('prompt');

if (!slug || !name || !systemPrompt) {
  console.error(
    'Usage: npm run project:create -- --slug bca --name "BizConnect Academy" ' +
    '--prompt "You are Sabito, the BCA assistant..." [--assistant Sabito]',
  );
  process.exitCode = 1;
} else {
  try {
    const result = await createProject({ slug, name, assistantName, systemPrompt });
    console.log(JSON.stringify(result, null, 2));
    console.error('Store the client secret securely. Sabito cannot display it again.');
  } finally {
    await closeDatabase();
  }
}
