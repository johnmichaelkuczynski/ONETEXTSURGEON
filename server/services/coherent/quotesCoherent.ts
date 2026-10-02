import { callLLM } from "../../llm";
import { generateSkeleton, DocumentSkeletonData } from "./skeletonGenerator";
import { chunkText } from "./coherenceProcessor";
import { ProgressUpdate } from "./stateSchemas";
import {
  isCompleteVerbatimQuote,
  quoteLimitForDepth,
  STRIKING_QUOTE_CRITERIA,
} from "../quoteQuality";

export interface ExtractedQuote {
  quote: string;
  context: string;
  significance: string;
  sourceChunk?: number;
}

export interface QuoteExtractionResult {
  documentId: string;
  quotes: ExtractedQuote[];
  skeleton: DocumentSkeletonData;
  totalExtracted: number;
}

export async function quotesCoherent(
  text: string,
  options: { author?: string; depth?: number },
  provider: string,
  onProgress?: (progress: ProgressUpdate) => void,
  userId?: number
): Promise<QuoteExtractionResult> {
  onProgress?.({ phase: "skeleton", message: "Generating document skeleton..." });
  const skeleton = await generateSkeleton(text, provider, userId);

  const chunks = chunkText(text, 1500);
  const allQuotes: ExtractedQuote[] = [];
  const depth = options.depth || 5;
  const quoteLimit = quoteLimitForDepth(depth);

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({
      phase: "extraction",
      currentChunk: i + 1,
      totalChunks: chunks.length,
      message: `Extracting quotes from chunk ${i + 1} of ${chunks.length}...`
    });

    const sectionContext = skeleton.sections.find(s => s.index === i) || skeleton.sections[0];

    const prompt = `Extract the most significant verbatim quotes from this text.

DOCUMENT CONTEXT:
- Main Thesis: ${skeleton.mainThesis}
- Overarching Theme: ${skeleton.overarchingTheme}
- This Section's Role: ${sectionContext?.role || 'body'}

CHUNK ${i + 1} OF ${chunks.length}:
${chunks[i]}

TASK:
${STRIKING_QUOTE_CRITERIA}

Select at most ${quoteLimit} quotes from this chunk. This is a ceiling, not a target. Return an empty array if nothing qualifies.
Selections should also be representative of the document's argument and central to understanding the thesis: "${skeleton.mainThesis}"

Return JSON array:
[
  {
    "quote": "Exact verbatim quote from the text",
    "context": "Brief description of what the quote is about",
    "significance": "Why this quote matters to the overall argument"
  }
]`;

    try {
      const response = await callLLM(provider, prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const chunkQuotes = JSON.parse(jsonMatch[0]);
        allQuotes.push(...chunkQuotes
          .filter((q: any) => isCompleteVerbatimQuote(chunks[i], q?.quote))
          .slice(0, quoteLimit)
          .map((q: any) => ({ ...q, sourceChunk: i })));
      }
    } catch (e) {
      console.error(`Failed to extract quotes from chunk ${i}:`, e);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const uniqueQuotes = deduplicateQuotes(allQuotes);

  return {
    documentId: skeleton.documentId,
    quotes: uniqueQuotes,
    skeleton: skeleton,
    totalExtracted: allQuotes.length
  };
}

function deduplicateQuotes(quotes: ExtractedQuote[]): ExtractedQuote[] {
  const seen = new Set<string>();
  const unique: ExtractedQuote[] = [];

  for (const q of quotes) {
    const normalized = q.quote.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
    
    let isDuplicate = false;
    for (const seenQuote of Array.from(seen)) {
      if (seenQuote.includes(normalized) || normalized.includes(seenQuote)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      unique.push(q);
    }
  }

  return unique;
}
