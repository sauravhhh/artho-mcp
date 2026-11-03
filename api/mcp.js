/**
 * Vercel Serverless Function for Artho MCP.
 * URL: POST /api/mcp (Streamable HTTP, stateless).
 * Note: serverless invocations are stateless — imported entries do not
 * persist across invocations. The demo dataset always works.
 */
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createArthoServer } from "../dist/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST with JSON-RPC to /api/mcp." });
    return;
  }
  try {
    const server = createArthoServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
}
