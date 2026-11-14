# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install deps
npm start             # run server (http://localhost:3000)
npm run dev           # run with nodemon (auto-reload)
npm run mcp           # run standalone MCP server over stdio (mcp-server.js)
docker-compose up     # run containerized (recommended for parity with prod)
```

No test suite or lint config exists in this repo.

## Architecture

Node.js + Express web app serving 10 XML tools through a single-page vanilla-JS frontend, plus an MCP server exposing 11 tools to AI clients. The counts differ because the single XML↔JSON tab maps to two MCP tools (`convert_xml_to_json` / `convert_json_to_xml`). `transform_xslt` is the MCP name for the XSLT tab's tool; `flatten_xml` backs the Grid tab's Paths mode.

- `server.js` — Express entry point. Serves `public/` statically, mounts one router per tool under `/api/<tool>`, and also hosts an **MCP-over-SSE** endpoint (`GET /mcp/sse` to open a stream, `POST /mcp/messages?sessionId=<id>` to send JSON-RPC) for container deployments where MCP clients can't spawn a subprocess.
- `mcp-server.js` — standalone MCP server using **stdio** transport (hand-rolled JSON-RPC framing, no SDK dependency) for local/Claude Desktop use where a subprocess can be spawned directly.
- `tools/xml-tools.js` — the actual XML logic (lint, format, tree, flatten, xpath, schema, xslt, xml/json conversion, diff, xsd-generate), shared by both the Express routes and both MCP servers. **This is the one place to change tool behavior.**
- `routes/*.js` — thin Express routers, one per tool, each just wiring `req.body` into a `tools/xml-tools.js` function and returning JSON.
- `public/` — static frontend (`index.html`, `app.js`, `style.css`); one tab per tool, calling the `/api/*` endpoints.

**Important duplication**: `server.js` and `mcp-server.js` each hardcode their own copy of the `MCP_TOOLS` schema array and `callTool()` dispatch switch. When adding/changing an MCP tool, update **both** files (and `tools/xml-tools.js` for the implementation) — there is no shared source of truth for the tool list.

### Adding a new tool

1. Implement the logic as a function in `tools/xml-tools.js`.
2. Create `routes/<tool>.js` (Express router, POST `/`, reads `req.body`, calls the tool function, returns JSON).
3. Register it in `server.js`: `app.use('/api/<tool>', require('./routes/<tool>'));`
4. If it should be exposed over MCP, add an entry to `MCP_TOOLS` and a case in `callTool()` in **both** `server.js` and `mcp-server.js`.
5. Add a tab in `public/index.html` and a handler in `public/app.js`.

### Grid tab (XMLSpy-style viewer)

`public/app.js`'s `buildGridHtml` / `buildRepeatTable` render a **read-only** grid from
the existing `POST /api/tree` response — there is no grid-specific backend. The defining
behaviour: children are grouped by tag, and any tag repeating 2+ times becomes one
`<table>` whose columns are the union of those repeats' attributes and child element
names. Complex grandchildren become expandable cells. `GRID_OPEN_DEPTH` controls how deep
blocks start expanded — keep it small, it's what keeps the 169KB fixture rendering in
~50ms. `loadGrid()` guards against stale renders with `gridRenderSeq`; keep that check if
you add async work, or fast Grid/Paths toggling will show the wrong pane's content.

### Known limitations (see README for full list)

- XSLT (`routes/xslt.js`, MCP `transform_xslt`) shells out to the system `xsltproc` binary (libxslt) via `execFile`, writing XML/XSL to temp files under `os.tmpdir()`. Requires `xsltproc` on PATH — installed via `apk add libxslt` in `Dockerfile`; on macOS/Linux dev machines it's typically already present. An earlier version used the pure-JS `xslt-processor` npm package but it took ~80s on a real 670-line/169KB stylesheet+doc (vs ~0.1s for `xsltproc`) — don't reintroduce a pure-JS XSLT engine without benchmarking against realistic (not toy) input first.
- XSD generation is heuristic, not spec-complete.
- XML↔JSON conversion is lossy (drops comments/PIs).
- `requirements.txt` (lxml) is a leftover from an earlier Python prototype; the app itself is pure Node — no Python code exists in this repo.

## Agent-facing docs

`AGENT_USAGE.md` documents how an AI agent drives this app over MCP (both transports) or
via Playwright, including the UI selectors and the async-handler/token-limit pitfalls.
Keep it in sync when tool names, tab IDs, or handler function names change.

## Git workflow

See `GIT_WORKFLOW.md` for the full branching/tagging model (`main`/`dev`/`feature/*`, milestone tags). Commit format: `<type>(<scope>): <subject>` — types are `feat`/`fix`/`refactor`/`test`/`docs`/`chore`, imperative subject, max ~50 chars.
