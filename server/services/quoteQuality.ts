const MIN_QUOTE_WORDS = 5;
const MAX_QUOTE_WORDS = 120;

export function isCompleteVerbatimQuote(source: string, candidate: unknown): candidate is string {
  if (typeof candidate !== "string") return false;

  const quote = candidate.trim();
  if (!quote || !source.includes(quote)) return false;

  const wordCount = quote.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_QUOTE_WORDS || wordCount > MAX_QUOTE_WORDS) return false;

  if (/^(?:\.{3}|…)|(?:\.{3}|…)$/.test(quote)) return false;
  return /[.!?]["'”’\)\]]*$/.test(quote);
}

export function quoteLimitForDepth(depth: number): number {
  const clampedDepth = Math.max(1, Math.min(10, Math.round(depth)));
  return Math.max(1, Math.ceil(clampedDepth / 2));
}

export const STRIKING_QUOTE_CRITERIA = `
SELECTION STANDARD:
- Select only passages that make a complete, self-contained point. A reader must understand the claim without needing the sentence before or after it.
- Prefer a striking insight, forceful claim, crisp definition, revealing conclusion, memorable formulation, paradox, or compressed argument.
- A merely grammatical sentence is not enough. It must say something worth quoting.
- Exclude setup, transitions, throat-clearing, procedural language, isolated facts, incomplete examples, and sentences whose meaning depends on unclear pronouns or missing context.
- Use one complete sentence or, only when necessary, two or three consecutive sentences that together make one complete point.
- Quality is mandatory; quantity is optional. Return fewer than the maximum, including zero, when the text contains no qualifying passage.`;
