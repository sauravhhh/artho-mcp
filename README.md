# Artho MCP — Assamese Dictionary MCP Server

**Live (Vercel, on the connected account):**
- Dashboard: https://artho-mcp.vercel.app/
- MCP endpoint (Streamable HTTP, for MCP Inspector / clients): https://artho-mcp.vercel.app/api/mcp
- Code: https://github.com/sauravhhh/artho-mcp
- Note: on Vercel serverless, imports do not persist across invocations — the demo dataset always works.

A complete, working MCP server for Assamese ↔ English dictionary lookup.
Built with **TypeScript** and the **official MCP SDK** (`@modelcontextprotocol/sdk` v1.32),
using the **remote Streamable HTTP transport at `/mcp`**.

> **REAL DATA:** lookups now use Saurabh's live Artho dictionary API (https://arthoo.vercel.app/api).
> A small demo dataset is kept only as a fallback if that API is unreachable, and responses say so.

**Free tier only. No paid APIs, no API keys, no sign-in.**

## What it does

| Tool | What it does |
|---|---|
| `lookup_assamese_to_english` | Exact Assamese word → English meanings + examples |
| `lookup_english_to_assamese` | English word → matching Assamese entries |
| `search_dictionary` | Partial (substring) search, direction `assamese` / `english` / `both`, limit 1–100 |
| `dictionary_info` | Dataset size, directions, demo-data notice |
| `import_dictionary_data` | Import JSON array or CSV (`assamese,english,meanings`, meanings separated by `\|`) |

Validation: empty words are rejected, words are capped at 100 chars,
limit must be 1–100, imports are capped at 10,000 entries / 2 MB per call.
Bad rows are reported, not silently dropped.

## Run it locally (beginner steps)

You need **Node.js 18 or newer** (free). No other software.

```bash
cd artho-mcp
npm install
npm run build
npm start
```

You should see:

```
Artho MCP listening on http://localhost:3000
MCP endpoint: http://localhost:3000/mcp
Dashboard:    http://localhost:3000/
```

Open **http://localhost:3000/** on your phone or computer — the dashboard
is mobile-friendly. Try: lookup `ঘৰ`, search `ঘ`, or import the sample:

```csv
assamese,english,meanings
বিদ্যা,knowledge,knowledge|learning
```

A ready sample file is in `data/sample-import.csv`.

For development with auto-reload: `npm run dev`.

## Test it with MCP Inspector (beginner steps)

MCP Inspector is the official free testing app for MCP servers.

1. Install it once (needs Node.js):
   ```bash
   npx @modelcontextprotocol/inspector
   ```
2. It opens in your browser (usually http://localhost:6274).
3. Set **Transport Type** to **Streamable HTTP**.
4. Set **URL** to `http://localhost:3000/mcp` (or your deployed URL + `/mcp`).
5. Click **Connect**. You should see the 5 tools listed.
6. Pick a tool, e.g. `lookup_assamese_to_english`, enter `{"word": "ঘৰ"}`,
   and click **Run Tool**. You get meanings + the demo-data notice.
7. Try `import_dictionary_data` with format `csv` and the sample above,
   then look up `বিদ্যা` — it will now be found.

If Inspector shows a connection error, check the server is still running
and the URL ends in `/mcp` (not just the homepage).

## Test it with curl (optional)

```bash
curl -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lookup_assamese_to_english","arguments":{"word":"ঘৰ"}}}'
```

## Deploy it — Cloudflare Workers (free tier)

The worker entry is `src/worker.ts`. It uses the SDK's Web Standard
transport, which is made for Workers — no Node-only server code in that path.

```bash
npm install -g wrangler   # free Cloudflare CLI, only if you don't have it
npm run build:worker
npx wrangler login        # opens Cloudflare in your browser, free account
npx wrangler deploy
```

Your endpoint becomes `https://artho-mcp.<your-subdomain>.workers.dev/mcp`.
Use that URL in MCP Inspector (Transport: Streamable HTTP) or in any
MCP client that supports remote servers.

**Important Workers note:** Workers isolates are stateless. Imported
entries live only in the isolate that received them and do not survive
a restart. For a durable dataset on Workers, either edit the demo data
in `src/dictionary.ts` at build time, or add a KV / D1 store in front
of the worker. On the Node server (`npm start`), imports last for the
life of that one server process.

## Project layout

```
src/dictionary.ts   demo dataset, store, search, CSV parser, validation
src/server.ts       MCP server + the 5 tools (official SDK, zod schemas)
src/http.ts         Node/Express server: POST /mcp + dashboard + /health
src/worker.ts       Cloudflare Workers entry (Web Standard transport)
public/index.html   mobile-friendly testing dashboard
data/sample-import.csv
wrangler.toml       Workers config
```

## Replacing the demo data

Edit `demoEntries` in `src/dictionary.ts`, or import a full dataset
with `import_dictionary_data` after starting the server. Keep the
licence of any real dictionary data you use — this project ships
only its own small sample.
