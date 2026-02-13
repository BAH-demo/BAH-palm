import { TicketResolution, RecurringIssue, TicketCategory } from '../types';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractKeyPhrases(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return phrases;
}

export function findRecurringIssues(
  resolutions: TicketResolution[],
  minOccurrences: number = 3,
): RecurringIssue[] {
  const phraseCount: Record<string, { count: number; category: TicketCategory }> = {};

  for (const resolution of resolutions) {
    const phrases = extractKeyPhrases(resolution.resolutionNotes);
    const seen = new Set<string>();

    for (const phrase of phrases) {
      if (!seen.has(phrase)) {
        seen.add(phrase);
        if (!phraseCount[phrase]) {
          phraseCount[phrase] = { count: 0, category: resolution.category };
        }
        phraseCount[phrase].count++;
      }
    }
  }

  const recurring: RecurringIssue[] = [];

  for (const [pattern, data] of Object.entries(phraseCount)) {
    if (data.count >= minOccurrences) {
      recurring.push({
        pattern,
        occurrences: data.count,
        category: data.category,
        suggestedKBTitle: generateKBTitle(pattern, data.category),
      });
    }
  }

  recurring.sort((a, b) => b.occurrences - a.occurrences);

  return recurring;
}

function generateKBTitle(pattern: string, category: TicketCategory): string {
  const titleCase = pattern
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const categoryLabels: Record<TicketCategory, string> = {
    [TicketCategory.BUG]: 'Troubleshooting',
    [TicketCategory.USER_ERROR]: 'How-To Guide',
    [TicketCategory.FEATURE_REQUEST]: 'Feature Guide',
    [TicketCategory.DOCUMENTATION_GAP]: 'Reference',
    [TicketCategory.INFRASTRUCTURE]: 'Infrastructure Guide',
  };

  return `${categoryLabels[category]}: ${titleCase}`;
}

export function groupResolutionsByCategory(
  resolutions: TicketResolution[],
): Record<string, TicketResolution[]> {
  const grouped: Record<string, TicketResolution[]> = {};

  for (const resolution of resolutions) {
    if (!grouped[resolution.category]) {
      grouped[resolution.category] = [];
    }
    grouped[resolution.category].push(resolution);
  }

  return grouped;
}
