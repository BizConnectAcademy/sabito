import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKnowledgeAnswer, streamParts } from '../src/ai/knowledge-answer.js';

test('knowledge answers prioritize question terms and include the source', () => {
  const answer = buildKnowledgeAnswer('How do I reset my password?', [
    {
      title: 'BCA Account Guide',
      content:
        'Courses are visible from the learner dashboard. ' +
        'To reset your password, open the login page and select Forgot Password.',
    },
  ]);
  assert.match(answer, /reset your password/i);
  assert.match(answer, /\[Source: BCA Account Guide\]/);
});

test('knowledge engine refuses unsupported answers', () => {
  assert.equal(
    buildKnowledgeAnswer('What is my balance?', []),
    'I do not have enough approved platform knowledge to answer that question yet.',
  );
});

test('completed answers can be emitted as socket-sized deltas', () => {
  const parts = streamParts('A response that will be split.', 8);
  assert.equal(parts.join(''), 'A response that will be split.');
  assert.ok(parts.every((part) => part.length <= 8));
});
