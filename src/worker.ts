/**
 * Cloudflare Workers entry point (free tier compatible, no paid APIs).
 * Uses the SDK's Web Standard transport, which runs on Workers, Node, Deno, Bun.
 * Note: Workers isolates are stateless — imported entries live only in the
 * isolate that received them. For durable data, import a dataset at build
 * time (edit src/dictionary.ts) or front the worker with a KV/D1 store.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createArthoServer } from "./server.js";
import { DictionaryStore } from "./dictionary.js";

const store = new DictionaryStore();

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, server: "artho-mcp", transport: "streamable-http", endpoint: "/mcp" });
    }
    if (url.pathname !== "/mcp") {
      return new Response("Artho MCP. POST JSON-RPC to /mcp. See README for the dashboard and Inspector steps.", { status: 404 });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed. Use POST with JSON-RPC to /mcp." }, { status: 405 });
    }
    const server = createArthoServer(store);
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
