import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createArthoServer } from "./server.js";
import { DictionaryStore } from "./dictionary.js";

// One shared store per process, so imported entries survive across
// requests in the Node server. (Stateless transport = no MCP session;
// on Workers, each isolate is its own process, so treat imports there
// as per-isolate, not durable storage — see README.)
const store = new DictionaryStore();
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Mobile-friendly testing dashboard (static, no build step).
const here = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(here, "..", "public")));

app.get("/health", (_req, res) => res.json({ ok: true, server: "artho-mcp", transport: "streamable-http", endpoint: "/mcp" }));

// Remote MCP endpoint: stateless Streamable HTTP, so every request is
// independent — no session storage, which also keeps Workers deployment simple.
app.post("/mcp", async (req, res) => {
  try {
    const server = createArthoServer(store);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST with JSON-RPC to /mcp. Open / for the testing dashboard." });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Artho MCP listening on http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`Dashboard:    http://localhost:${port}/`);
});

// Keep the dashboard HTML in the repo even if dist/ is rebuilt elsewhere.
void readFileSync;
