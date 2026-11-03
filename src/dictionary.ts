/**
 * Artho MCP — dictionary store.
 * DEMO DATA ONLY: the bundled entries are a small hand-written sample
 * for testing. They are NOT a complete Assamese dictionary.
 * Replace them with a licensed / complete dataset before production use.
 */

export interface DictionaryEntry {
  assamese: string;
  english: string;
  partOfSpeech?: string;
  meanings: string[];
  examples?: { assamese: string; english: string }[];
}

export const DEMO_NOTICE =
  "DEMO DATA: this server ships with a small sample dataset only. Results are for testing, not a complete dictionary.";

function clean(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export function validateWord(word: unknown, label: string): string {
  const w = clean(word);
  if (!w) throw new Error(`${label} is required and must be a non-empty string.`);
  if (w.length > 100) throw new Error(`${label} is too long (max 100 characters).`);
  return w;
}

export function validateLimit(limit: unknown): number {
  if (limit === undefined || limit === null) return 20;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  return n;
}

export const demoEntries: DictionaryEntry[] = [
  { assamese: "ঘৰ", english: "house", partOfSpeech: "noun", meanings: ["house", "home"], examples: [{ assamese: "মোৰ ঘৰ গুৱাহাটীত।", english: "My house is in Guwahati." }] },
  { assamese: "পানী", english: "water", partOfSpeech: "noun", meanings: ["water"], examples: [{ assamese: "মোক পানী দিয়া।", english: "Give me water." }] },
  { assamese: "কিতাপ", english: "book", partOfSpeech: "noun", meanings: ["book"], examples: [{ assamese: "এই কিতাপখন ভাল।", english: "This book is good." }] },
  { assamese: "বিদ্যালয়", english: "school", partOfSpeech: "noun", meanings: ["school"] },
  { assamese: "বন্ধু", english: "friend", partOfSpeech: "noun", meanings: ["friend"], examples: [{ assamese: "তেওঁ মোৰ বন্ধু।", english: "He/She is my friend." }] },
  { assamese: "সুন্দৰ", english: "beautiful", partOfSpeech: "adjective", meanings: ["beautiful", "lovely"], examples: [{ assamese: "অসম সুন্দৰ।", english: "Assam is beautiful." }] },
  { assamese: "খাদ্য", english: "food", partOfSpeech: "noun", meanings: ["food"] },
  { assamese: "ভাল", english: "good", partOfSpeech: "adjective", meanings: ["good", "fine"] },
  { assamese: "দিন", english: "day", partOfSpeech: "noun", meanings: ["day"] },
  { assamese: "ৰাতি", english: "night", partOfSpeech: "noun", meanings: ["night"] },
  { assamese: "মা", english: "mother", partOfSpeech: "noun", meanings: ["mother"] },
  { assamese: "দেউতা", english: "father", partOfSpeech: "noun", meanings: ["father"] },
  { assamese: "গছ", english: "tree", partOfSpeech: "noun", meanings: ["tree"] },
  { assamese: "নদী", english: "river", partOfSpeech: "noun", meanings: ["river"] },
  { assamese: "অসম", english: "Assam", partOfSpeech: "proper noun", meanings: ["Assam (a state in India)"] },
  { assamese: "অসমীয়া", english: "Assamese", partOfSpeech: "adjective", meanings: ["Assamese (language / of Assam)"] },
  { assamese: "ভাষা", english: "language", partOfSpeech: "noun", meanings: ["language"] },
  { assamese: "মৰম", english: "love", partOfSpeech: "noun", meanings: ["love", "affection"] },
  { assamese: "কাম", english: "work", partOfSpeech: "noun", meanings: ["work", "job"] },
  { assamese: "বজাৰ", english: "market", partOfSpeech: "noun", meanings: ["market", "bazaar"] },
];

export class DictionaryStore {
  private entries: DictionaryEntry[] = [...demoEntries];
  private imported = 0;

  info() {
    return {
      name: "Artho MCP — Assamese Dictionary",
      dataset: "DEMO dataset (bundled sample)",
      notice: DEMO_NOTICE,
      totalEntries: this.entries.length,
      demoEntries: demoEntries.length,
      importedEntries: this.imported,
      directions: ["assamese-to-english", "english-to-assamese"],
      source: "Hand-written demo sample. No paid API is used.",
    };
  }

  lookupAssamese(word: string): DictionaryEntry | null {
    return this.entries.find((e) => e.assamese === word) ?? null;
  }

  lookupEnglish(word: string): DictionaryEntry[] {
    const q = word.toLowerCase();
    return this.entries.filter(
      (e) => e.english.toLowerCase() === q || e.meanings.some((m) => m.toLowerCase() === q),
    );
  }

  search(query: string, direction: "assamese" | "english" | "both", limit: number): DictionaryEntry[] {
    const q = query.toLowerCase();
    const out: DictionaryEntry[] = [];
    for (const e of this.entries) {
      const inAssamese = e.assamese.includes(query) || e.assamese.toLowerCase().includes(q);
      const inEnglish =
        e.english.toLowerCase().includes(q) || e.meanings.some((m) => m.toLowerCase().includes(q));
      if ((direction === "assamese" && inAssamese) || (direction === "english" && inEnglish) || (direction === "both" && (inAssamese || inEnglish))) {
        out.push(e);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  importEntries(newEntries: unknown): { added: number; skipped: number; errors: string[] } {
    if (!Array.isArray(newEntries)) throw new Error("import data must be an array of entries.");
    if (newEntries.length > 10000) throw new Error("import is limited to 10,000 entries per call.");
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const [i, raw] of newEntries.entries()) {
      const r = raw as Record<string, unknown>;
      const assamese = clean(r?.assamese);
      const english = clean(r?.english);
      const meaningsRaw = Array.isArray(r?.meanings) ? r.meanings.map(clean).filter(Boolean) : [];
      const meanings = meaningsRaw.length ? meaningsRaw : english ? [english] : [];
      if (!assamese || !meanings.length) {
        skipped++;
        errors.push(`Row ${i + 1}: missing assamese word or meaning.`);
        continue;
      }
      if (assamese.length > 100 || meanings.some((m) => m.length > 200)) {
        skipped++;
        errors.push(`Row ${i + 1}: word or meaning too long.`);
        continue;
      }
      const existing = this.entries.find((e) => e.assamese === assamese);
      if (existing) {
        existing.meanings = [...new Set([...existing.meanings, ...meanings])];
        if (english) existing.english = english;
        skipped++;
      } else {
        this.entries.push({
          assamese,
          english: english || meanings[0],
          partOfSpeech: clean(r?.partOfSpeech) || undefined,
          meanings,
        });
        added++;
      }
    }
    this.imported += added;
    return { added, skipped, errors: errors.slice(0, 20) };
  }
}

/** Parse a small CSV: header row assamese,english,meanings (meanings separated by |). */
export function parseCsv(text: string): DictionaryEntry[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row.");
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const ai = header.indexOf("assamese");
  const ei = header.indexOf("english");
  if (ai === -1 || ei === -1) throw new Error("CSV header must include assamese and english columns.");
  const mi = header.indexOf("meanings");
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const meanings = mi >= 0 && cols[mi] ? cols[mi].split("|").map((s) => s.trim()).filter(Boolean) : [];
    return { assamese: cols[ai] ?? "", english: cols[ei] ?? "", meanings: meanings.length ? meanings : cols[ei] ? [cols[ei]] : [] };
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim()); cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
