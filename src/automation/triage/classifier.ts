import { TicketCategory, SupportTicket } from '../types';

interface ClassificationResult {
  category: TicketCategory;
  confidence: number;
  matchedKeywords: string[];
}

const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  [TicketCategory.BUG]: [
    'error', 'bug', 'crash', 'broken', 'fail', 'not working',
    'exception', 'unexpected', 'regression', 'defect', 'issue',
    'stack trace', 'null pointer', 'undefined', 'timeout',
    '500', '404', '503', 'http error', 'fatal',
  ],
  [TicketCategory.USER_ERROR]: [
    'how do i', 'how to', 'can\'t find', 'where is', 'help me',
    'don\'t understand', 'confused', 'what does', 'unable to login',
    'password reset', 'permission denied', 'access denied',
    'configuration', 'setup help', 'getting started',
  ],
  [TicketCategory.FEATURE_REQUEST]: [
    'feature request', 'would be nice', 'suggestion', 'enhancement',
    'could you add', 'please add', 'new feature', 'improvement',
    'wish list', 'roadmap', 'integrate', 'support for',
    'would like', 'can we have', 'missing feature',
  ],
  [TicketCategory.DOCUMENTATION_GAP]: [
    'documentation', 'docs', 'unclear', 'not documented',
    'missing documentation', 'outdated docs', 'wrong documentation',
    'api reference', 'example needed', 'tutorial',
    'readme', 'guide', 'instructions unclear',
  ],
  [TicketCategory.INFRASTRUCTURE]: [
    'server down', 'outage', 'latency', 'slow performance',
    'deployment', 'scaling', 'memory leak', 'cpu', 'disk space',
    'database', 'network', 'dns', 'ssl', 'certificate',
    'kubernetes', 'docker', 'aws', 'cloud', 'infrastructure',
  ],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function countKeywordMatches(text: string, keywords: string[]): { count: number; matched: string[] } {
  const normalized = normalizeText(text);
  const matched: string[] = [];
  let count = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      count++;
      matched.push(keyword);
    }
  }

  return { count, matched };
}

export function classifyTicket(ticket: SupportTicket): ClassificationResult {
  const combinedText = `${ticket.title} ${ticket.description}`;
  const scores: { category: TicketCategory; score: number; matched: string[] }[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const { count, matched } = countKeywordMatches(combinedText, keywords);
    const titleMatch = countKeywordMatches(ticket.title, keywords);
    const titleBoost = titleMatch.count * 1.5;
    scores.push({
      category: category as TicketCategory,
      score: count + titleBoost,
      matched,
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0];
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const confidence = totalScore > 0 ? Math.min(topScore.score / totalScore, 1) : 0;

  if (topScore.score === 0) {
    return {
      category: TicketCategory.BUG,
      confidence: 0.1,
      matchedKeywords: [],
    };
  }

  return {
    category: topScore.category,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords: topScore.matched,
  };
}

export { CATEGORY_KEYWORDS };
