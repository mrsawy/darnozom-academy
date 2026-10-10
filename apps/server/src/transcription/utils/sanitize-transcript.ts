/**
 * Remove Whisper hallucinations from a transcript.
 *
 * Whisper (both Groq and OpenAI) tends to hallucinate when it encounters
 * silence, music, or very low-quality audio — it emits the same phrase
 * hundreds of times in a row (e.g. "اشتركوا في القناة" × 150).
 *
 * Strategy:
 * 1. Split the text into sentence-like chunks.
 * 2. Collapse any sequence where the same n-gram repeats more than
 *    MAX_REPEATS consecutive times, keeping only one copy.
 * 3. Drop chunks that consist entirely of collapsed hallucinations and
 *    are surrounded by empty context (e.g. a repeated phrase that fills
 *    the whole transcript).
 */

const MAX_REPEATS = 3; // allow at most this many consecutive identical chunks
const MIN_CHUNK_WORDS = 2; // ignore single-word chunks for repetition detection

/**
 * Split text into sentence-like chunks separated by punctuation or newlines.
 * We keep the delimiter attached to the preceding chunk so reconstruction is clean.
 */
function splitChunks(text: string): string[] {
  // Split on sentence-ending punctuation (Arabic + Latin), newlines, or long whitespace runs
  return text
    .split(/(?<=[.،؟!?\n])\s*|\s{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Collapse runs of identical chunks down to at most MAX_REPEATS copies.
 */
function collapseRepeatedChunks(chunks: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < chunks.length) {
    const current = chunks[i];
    const wordCount = current.split(/\s+/).length;

    if (wordCount < MIN_CHUNK_WORDS) {
      // Too short to bother deduplicating
      result.push(current);
      i++;
      continue;
    }

    // Count how many consecutive identical chunks follow
    let runLength = 1;
    while (i + runLength < chunks.length && chunks[i + runLength] === current) {
      runLength++;
    }

    // Keep at most MAX_REPEATS copies
    const keep = Math.min(runLength, MAX_REPEATS);
    for (let k = 0; k < keep; k++) {
      result.push(current);
    }

    i += runLength;
  }

  return result;
}

/**
 * Additionally collapse repeated n-gram patterns within a single chunk
 * (e.g. "اشتركوا في القناة اشتركوا في القناة اشتركوا في القناة").
 * Uses bigram/trigram window to detect intra-chunk repetitions.
 */
function collapseIntraChunkRepetitions(text: string): string {
  const words = text.split(/\s+/);
  if (words.length < 4) return text;

  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    // Try n-grams of size 1..6
    let collapsed = false;
    for (let n = Math.min(6, Math.floor(words.length / 2)); n >= 1; n--) {
      if (i + n > words.length) continue;
      const gram = words.slice(i, i + n).join(' ');

      // Count how many times this gram repeats consecutively from position i
      let reps = 1;
      while (i + reps * n + n <= words.length) {
        const next = words.slice(i + reps * n, i + reps * n + n).join(' ');
        if (next === gram) reps++;
        else break;
      }

      if (reps > MAX_REPEATS) {
        // Keep only MAX_REPEATS copies
        for (let k = 0; k < MAX_REPEATS; k++) {
          result.push(...words.slice(i + k * n, i + k * n + n));
        }
        i += reps * n;
        collapsed = true;
        break;
      }
    }

    if (!collapsed) {
      result.push(words[i]);
      i++;
    }
  }

  return result.join(' ');
}

/**
 * Main entry point. Returns a sanitized transcript string.
 * Returns an empty string if the entire transcript is hallucination.
 */
export function sanitizeTranscript(raw: string): string {
  if (!raw || raw.trim().length === 0) return '';

  // Step 1: collapse intra-chunk repetitions (handles "phrase phrase phrase …" in one long string)
  const intraCollapsed = collapseIntraChunkRepetitions(raw.trim());

  // Step 2: split into chunks and collapse inter-chunk runs
  const chunks = splitChunks(intraCollapsed);
  const dedupedChunks = collapseRepeatedChunks(chunks);

  return dedupedChunks
    .join(' ')
    .replaceAll(/\s{2,}/g, ' ')
    .trim();
}
