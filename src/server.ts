import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DictionaryStore, parseCsv, validateLimit, validateWord } from "./dictionary.js";
import { arthoSearch, arthoWord } from "./arthoApi.js";

const text = (obj: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }],
});

const SOURCE = "artho-live (https://arthoo.vercel.app/api) — Saurabh's Artho dictionary";

export function createArthoServer(store = new DictionaryStore()): McpServer {
  const server = new McpServer({ name: "artho-mcp", version: "2.0.0" });

  server.registerTool(
    "lookup_assamese_to_english",
    {
      title: "Assamese to English lookup",
      description: "Look up an Assamese word in the real Artho dictionary (live API). Falls back to the local demo dataset only if the Artho API is unreachable, and says so.",
      inputSchema: { word: z.string().describe("Assamese word, e.g. ঘৰ") },
    },
    async ({ word }) => {
      try {
        const w = validateWord(word, "word");
        try {
          const live = await arthoWord(w, "as");
          return text({ found: live.found, word: w, source: SOURCE, results: live.results });
        } catch {
          const entry = store.lookupAssamese(w);
          return text({ found: !!entry, word: w, source: "demo-fallback (Artho API unreachable)", entry: entry ?? null });
        }
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "lookup_english_to_assamese",
    {
      title: "English to Assamese lookup",
      description: "Look up an English word in the real Artho dictionary (live API). The Artho meanings are Assamese words.",
      inputSchema: { word: z.string().describe("English word, e.g. house") },
    },
    async ({ word }) => {
      try {
        const w = validateWord(word, "word");
        try {
          const live = await arthoWord(w, "en");
          const assameseWords = [...new Set(live.results.flatMap((r) => r.meanings))];
          return text({ found: live.found, word: w, source: SOURCE, assameseWords, results: live.results });
        } catch {
          const entries = store.lookupEnglish(w);
          return text({ found: entries.length > 0, word: w, source: "demo-fallback (Artho API unreachable)", entries });
        }
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "search_dictionary",
    {
      title: "Partial dictionary search",
      description:
        "Partial search in the real Artho dictionary. Assamese partial search uses the live Artho search API (returns matching words; look each word up for meanings). " +
        "The Artho API has no English partial search, so direction=english does an exact English lookup instead.",
      inputSchema: {
        query: z.string().describe("Partial text to search for"),
        direction: z.enum(["assamese", "english", "both"]).default("both"),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ query, direction, limit }) => {
      try {
        const q = validateWord(query, "query");
        const n = validateLimit(limit);
        if (direction === "english") {
          const live = await arthoWord(q, "en");
          return text({ query: q, direction, source: SOURCE, note: "Artho API has no English partial search; this is an exact English lookup.", count: live.results.length, results: live.results });
        }
        const words = await arthoSearch(q, n);
        return text({ query: q, direction, source: SOURCE, count: words.length, words, note: "Use lookup_assamese_to_english on a word for its meanings." });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "dictionary_info",
    {
      title: "Dictionary information",
      description: "Get the live Artho dictionary source and dataset details.",
      inputSchema: {},
    },
    async () =>
      text({
        name: "Artho MCP — Assamese Dictionary",
        source: SOURCE,
        dataset: "Real Artho dictionary, served live from arthoo.vercel.app/api (not the demo sample).",
        recordedDatasetSizes: { assameseEntries: 48928, englishEntries: 24226, note: "Counts from Artho's own dictionary data files as recorded 2026-11-01; the live API serves this data." },
        directions: ["assamese-to-english", "english-to-assamese", "assamese partial search"],
        limitation: "Artho API has no English partial search and no example sentences; examples are not invented.",
        localImportedEntries: store.info().importedEntries,
        demoFallback: "A small demo dataset is kept only as a fallback if the Artho API is unreachable.",
      }),
  );

  server.registerTool(
    "import_dictionary_data",
    {
      title: "Import dictionary data",
      description:
        "Import custom entries (JSON array or CSV: assamese,english,meanings) into this server's local store only. " +
        "They do NOT change the real Artho dictionary. Stored in memory for this server process; on serverless, they do not persist across invocations. Max 10,000 entries / 2 MB per call.",
      inputSchema: {
        format: z.enum(["json", "csv"]),
        data: z.string().describe("JSON array string, or CSV text"),
      },
    },
    async ({ format, data }) => {
      try {
        if (typeof data !== "string" || !data.trim()) throw new Error("data is required.");
        if (data.length > 2_000_000) throw new Error("data is too large (max 2 MB per call).");
        const entries = format === "csv" ? parseCsv(data) : JSON.parse(data);
        const result = store.importEntries(entries);
        return text({ ...result, localTotal: store.info().totalEntries, note: "Local import only; the real Artho dictionary is unchanged." });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  return server;
}
