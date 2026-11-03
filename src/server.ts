import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DictionaryStore, DEMO_NOTICE, parseCsv, validateLimit, validateWord } from "./dictionary.js";

const text = (obj: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }],
});

export function createArthoServer(store = new DictionaryStore()): McpServer {
  const server = new McpServer({ name: "artho-mcp", version: "1.0.0" });

  server.registerTool(
    "lookup_assamese_to_english",
    {
      title: "Assamese to English lookup",
      description: "Look up an Assamese word and get its English meanings and examples. DEMO dataset.",
      inputSchema: { word: z.string().describe("Assamese word, e.g. ঘৰ") },
    },
    async ({ word }) => {
      try {
        const w = validateWord(word, "word");
        const entry = store.lookupAssamese(w);
        if (!entry) return text({ found: false, word: w, notice: DEMO_NOTICE, message: "No entry found in the demo dataset." });
        return text({ found: true, notice: DEMO_NOTICE, entry });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "lookup_english_to_assamese",
    {
      title: "English to Assamese lookup",
      description: "Look up an English word and get matching Assamese entries. DEMO dataset.",
      inputSchema: { word: z.string().describe("English word, e.g. house") },
    },
    async ({ word }) => {
      try {
        const w = validateWord(word, "word");
        const entries = store.lookupEnglish(w);
        return text({ found: entries.length > 0, word: w, count: entries.length, notice: DEMO_NOTICE, entries });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "search_dictionary",
    {
      title: "Partial dictionary search",
      description: "Partial / substring search in Assamese, English, or both directions.",
      inputSchema: {
        query: z.string().describe("Partial text to search for"),
        direction: z.enum(["assamese", "english", "both"]).default("both"),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ query, direction, limit }) => {
      try {
        const q = validateWord(query, "query");
        const entries = store.search(q, direction, validateLimit(limit));
        return text({ query: q, direction, count: entries.length, notice: DEMO_NOTICE, entries });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  server.registerTool(
    "dictionary_info",
    {
      title: "Dictionary information",
      description: "Get dataset size, directions, and the demo-data notice.",
      inputSchema: {},
    },
    async () => text(store.info()),
  );

  server.registerTool(
    "import_dictionary_data",
    {
      title: "Import dictionary data",
      description:
        "Import entries from JSON (array) or CSV text (header: assamese,english,meanings). " +
        "Data lives in memory for this server process only; restart resets it to the demo dataset. Max 10,000 entries per call.",
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
        return text({ ...result, totalEntries: store.info().totalEntries, notice: DEMO_NOTICE });
      } catch (e) { return text({ error: (e as Error).message }); }
    },
  );

  return server;
}
