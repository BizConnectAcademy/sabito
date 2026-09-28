import type { KnowledgeMatch } from '../services/knowledge-service.js';

const stopWords = new Set([
  'about', 'after', 'again', 'also', 'been', 'before', 'being', 'could', 'from',
  'have', 'into', 'more', 'other', 'should', 'that', 'their', 'there', 'these',
  'they', 'this', 'those', 'what', 'when', 'where', 'which', 'with', 'would',
]);

function keywords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
      .filter((word) => !stopWords.has(word)),
  );
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20 && sentence.length <= 600);
}

export function buildKnowledgeAnswer(question: string, matches: KnowledgeMatch[]): string {
  if (matches.length === 0) {
    return 'I do not have enough approved platform knowledge to answer that question yet.';
  }

  const terms = keywords(question);
  const ranked = matches.flatMap((match, sourceIndex) =>
    sentences(match.content).map((sentence, sentenceIndex) => {
      const sentenceTerms = keywords(sentence);
      const score = [...terms].reduce(
        (total, term) => total + (sentenceTerms.has(term) ? 1 : 0),
        0,
      );
      return { sentence, title: match.title, score, sourceIndex, sentenceIndex };
    }),
  ).sort((left, right) =>
    right.score - left.score ||
    left.sourceIndex - right.sourceIndex ||
    left.sentenceIndex - right.sentenceIndex,
  );

  const relevant = ranked.filter((item) => item.score > 0).slice(0, 5);
  const useful = relevant.length > 0 ? relevant : ranked.slice(0, 3);
  if (useful.length === 0) {
    return 'I found related knowledge, but it does not contain enough information to answer safely.';
  }
  return useful.map((item) => `${item.sentence} [Source: ${item.title}]`).join('\n\n');
}

export function streamParts(content: string, size = 28): string[] {
  return content.match(new RegExp(`.{1,${size}}`, 'gs')) ?? [];
}
