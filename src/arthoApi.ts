/**
 * Live data source: Saurabh's own Artho dictionary API at arthoo.vercel.app.
 * No paid API, no key. Endpoints (verified live):
 *   GET /api/word?w=<word>              Assamese -> meanings
 *   GET /api/word?w=<word>&lang=en      English -> meanings (Assamese words)
 *   GET /api/search?q=<partial>&limit=n  Assamese partial search (words only)
 * The Artho API does not offer English partial search; for that direction
 * we do an exact English lookup instead (see server.ts).
 */

const BASE = "https://arthoo.vercel.app";

async function getJson(path: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Artho API returned HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface ArthoResult {
  word: string;
  pos?: string;
  posAssamese?: string;
  meanings: string[];
}

export async function arthoWord(word: string, lang: "as" | "en"): Promise<{ found: boolean; results: ArthoResult[] }> {
  const data = (await getJson(`/api/word?w=${encodeURIComponent(word)}${lang === "en" ? "&lang=en" : ""}`)) as {
    found?: boolean;
    results?: { word: string; pos?: string; posAssamese?: string; meanings?: string[] }[];
    error?: string;
  };
  if (data.error) throw new Error(`Artho API error: ${data.error}`);
  const results = (data.results ?? []).map((r) => ({
    word: r.word,
    pos: r.pos,
    posAssamese: r.posAssamese,
    meanings: Array.isArray(r.meanings) ? r.meanings : [],
  }));
  return { found: data.found === true && results.length > 0, results };
}

export async function arthoSearch(query: string, limit: number): Promise<string[]> {
  const data = (await getJson(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`)) as {
    words?: string[];
    error?: string;
  };
  if (data.error) throw new Error(`Artho API error: ${data.error}`);
  return Array.isArray(data.words) ? data.words : [];
}
