# XMLTools — Agent Usage Guide

How an AI agent drives XMLTools, either over **MCP** (preferred — structured, cheap) or
through the **web UI with Playwright** (when you need to verify what a human sees).

Base URL for a running instance: `http://localhost:3000`
Health check: `GET /health` → `{"status":"ok","mcp":"sse"}`

---

## Which interface to use

| Situation | Use |
|---|---|
| Transform, validate, query, or inspect XML programmatically | **MCP** |
| Batch work, large documents, piping results into other reasoning | **MCP** |
| Verifying the UI itself works, or reproducing a user's click-path | **Playwright** |
| User asks "is it working in the browser?" | **Playwright** |

Prefer MCP. It returns text you can parse directly, with no DOM in the way. Reach for
Playwright only when the browser is the thing under test.

---

## Option A — MCP

Two transports expose the **same 11 tools**. Pick by how you're running:

| Transport | When | How |
|---|---|---|
| **stdio** | Local process you can spawn (Claude Desktop, CLI) | `node mcp-server.js` |
| **SSE** | Containerised / remote, can't spawn a subprocess | `GET /mcp/sse`, then `POST /mcp/messages?sessionId=<id>` |

### stdio

```bash
node mcp-server.js
```
Newline-delimited JSON-RPC on stdin/stdout. No SDK needed.

```jsonc
// request
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lint_xml","arguments":{"xml":"<a/>"}}}
```

Claude Desktop / `.mcp.json` registration:
```json
{
  "mcpServers": {
    "xmltools": { "command": "node", "args": ["/absolute/path/to/xmltools/mcp-server.js"] }
  }
}
```

### SSE

1. `GET /mcp/sse` — opens the stream. First event tells you where to post:
   `event: endpoint` / `data: /mcp/messages?sessionId=<uuid>`
2. `POST` JSON-RPC to that path. The HTTP response is just `202 Accepted`; the
   **actual result arrives on the SSE stream** as `event: message`.

That split is the thing agents get wrong — do not wait on the POST body for your answer.

### The 11 tools

| Tool | Arguments | Returns |
|---|---|---|
| `lint_xml` | `xml` | `✓ Well-formed XML`, or `✗ Line N, Col N: msg` per error (`isError: true`) |
| `format_xml` | `xml` | pretty-printed XML |
| `parse_xml_tree` | `xml` | nested JSON tree — `{tag, attributes, text, children}` |
| `flatten_xml` | `xml` | one `xpath = value` per line (see below) |
| `xpath_query` | `xml`, `xpath` | matching nodes, one per line, or `No results` |
| `validate_schema` | `xml`, `schema` | `✓ Valid` or error list |
| `transform_xslt` | `xml`, `xsl` | transformed output |
| `convert_xml_to_json` | `xml` | JSON (attributes as `@attr`, text as `#text`) |
| `convert_json_to_xml` | `json` | XML |
| `diff_xml` | `xml_a`, `xml_b` | added / removed / changed line counts |
| `generate_xsd` | `xml` | generated XSD |

**`flatten_xml` vs `parse_xml_tree`** — prefer `flatten_xml` when you want to *find* or
*compare* values; it is far cheaper to scan and greppable:
```
/Invoice/cbc:ID = 3110579091
/Invoice/cac:InvoiceLine[1]/cbc:ID = 1
/Invoice/cac:InvoiceLine[1]/cbc:InvoicedQuantity = 40
/Invoice/cac:InvoiceLine[2]/cbc:ID = 2
```
Positional predicates (`[n]`) appear only where a tag actually repeats among its
siblings, so every path is a valid XPath you can feed straight back into `xpath_query`.
Use `parse_xml_tree` only when you genuinely need the hierarchy.

### Errors

Tool failures come back as normal results with `isError: true` and the message as text —
not as JSON-RPC errors. Always check `isError` before trusting `content[0].text`.

---

## Option B — Playwright (web UI)

Ten tabs, one per tool. Selectors below are stable; prefer them over generated refs.

### Loading a document

| Goal | Action |
|---|---|
| Load XML into every tab | click `#openBtn` → file chooser → upload |
| Load XML into the XSLT tab only | click `#xslt-tab button:has-text("Load XML")` |
| Load the stylesheet | click `#xslt-tab button:has-text("Load XSL")` |
| Load XML into the Grid tab only | click `#grid-tab button:has-text("Load XML")` |
| Paste XML into the Grid tab | click `#grid-tab button:has-text("Paste XML")`, fill `#grid-paste`, then `renderPastedXml()` |

All three open a **native file chooser**, so handle it with your Playwright MCP's
file-upload call, not by typing into the field. `#xslt-xsl` is `readonly` — `fill()` on
it fails; use the button or set `.value` via `evaluate`.

### Switching tabs

```js
await page.click('.tab-btn[data-tab="grid"]');   // lint | format | tree | xpath |
                                                 // schema | xslt | xml-json | diff |
                                                 // xsd-gen | grid
```

### Running a tool and reading the result

Click handlers are `async` and **not awaited by the click**, so clicking and immediately
reading gives you a stale pane. Call the page function directly and await it:

```js
await page.evaluate(async () => {
  await runTransform();                                   // XSLT tab
  return {
    status: document.getElementById('statusbar').textContent,
    out: document.getElementById('xslt-output').value.slice(0, 500)
  };
});
```

Equivalent entry points per tab: `runLint()`, `runFormat()`, `loadTree()`,
`runXPath()`, `runValidation()` (Schema), `runTransform()`, `generateXSD()`, `loadGrid()`.
File pickers: `loadSchema()`, `loadXSL()`, `loadXsltXml()`.

`#statusbar` is the single source of truth for success/failure — `✓ Transformed`,
`✓ Grid loaded`, `❌ Transform failed`, etc. Assert on it.

### Reading big results

**Do not call `browser_snapshot` on real documents** — a 169KB file blows the tool's
token limit. Return a small summary object from `evaluate` instead:

```js
await page.evaluate(() => {
  const t = document.querySelector('table.grid-table');
  return {
    tables: document.querySelectorAll('table.grid-table').length,
    rows: t?.querySelectorAll('tbody tr').length,
    cols: [...(t?.querySelectorAll('thead th') ?? [])].map(th => th.textContent)
  };
});
```

### Grid tab specifics

- Repeating siblings become a table; columns are the union of those repeats'
  attributes (`@name`) and child element names.
- Complex children render as `▶ expand` cells — click `.grid-toggle` to open, and note
  nested blocks start **collapsed** below `GRID_OPEN_DEPTH` (2).
- `📥 From XSLT Output` grids the last transform without touching the filesystem.
- Input precedence: an explicit source (Grid's own **Load XML**, **Paste XML**, or
  **From XSLT Output**) is remembered and re-used by `▶ Load Grid` and by the Grid/Paths
  toggle. The global `#openBtn` clears it, so a newly opened document takes over. The
  Grid's own picker deliberately does **not** populate the other tabs.
- `Paths` mode (`#grid-mode-paths`) lists `xpath = value` rows — the same data
  `flatten_xml` returns, if you'd rather read it over MCP.
- Toggling Grid/Paths fast is safe; renders are sequence-guarded.

---

## Gotchas that cost real debugging time

1. **XSLT output with no tags is usually not a bug.** If the stylesheet's `match`
   patterns don't fit the input, XSLT's built-in default rules copy text content with no
   markup. Check that the stylesheet's root `match` actually exists in the document
   before reporting a broken transform. Reproduce with `xsltproc style.xsl doc.xml` — if
   the CLI agrees, the tool is fine and the input is mismatched.
2. **`transform_xslt` needs `xsltproc` on PATH** (libxslt). Present in the Docker image;
   install `libxslt` if running bare on a machine without it.
3. **XSLT 1.0 only** — that's what libxslt supports.
4. **XML↔JSON is lossy**: comments and processing instructions are dropped.
5. **XSD generation is heuristic**, not spec-complete. Treat it as a starting point.
6. **Schema validation is basic**; remote schema URLs are not fetched.
7. The repo's `test/inputpayload.xml` and `test/transformation-FIXED.xsl` are
   **deliberately mismatched** (UBL Invoice payload vs a stylesheet expecting SAP IDOC).
   `test/idoc-sample.xml` is the fixture that actually matches the stylesheet.

---

## End-to-end example: transform, then inspect the output

**Over MCP** (preferred):
```jsonc
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
  "name":"transform_xslt","arguments":{"xml":"<...>","xsl":"<...>"}}}
// then feed result text back in:
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
  "name":"flatten_xml","arguments":{"xml":"<transformed output>"}}}
```

**Through the UI**:
1. `.tab-btn[data-tab="xslt"]`
2. `📂 Load XML` → upload payload · `📂 Load XSL` → upload stylesheet
3. `await page.evaluate(() => runTransform())`, assert `#statusbar` is `✓ Transformed`
4. click `#xslt-tab button:has-text("View in Grid")` — jumps to the Grid tab with the
   output already loaded
5. summarise `table.grid-table` row/column counts via `evaluate`
