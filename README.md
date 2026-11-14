# XMLTools — Comprehensive XML Toolkit

A modern web-based XML toolkit built with Node.js + Express + Vanilla JavaScript. Provides 9 specialized XML tools in a unified, responsive interface.

## Features

| Tool | Purpose |
|------|---------|
| **Lint** | Validate XML well-formedness; highlight parsing errors |
| **Format** | Pretty-print and indent XML; reformat minified documents |
| **Tree** | Visual navigation of XML structure; drill down to elements |
| **XPath** | Execute XPath queries with result highlighting |
| **Schema** | Validate XML against XSD or DTD schemas |
| **XSLT** | Apply XSL transformations |
| **XML↔JSON** | Bidirectional conversion with standard conventions |
| **Diff** | Visual comparison of two XML files |
| **Gen XSD** | Auto-generate XSD schema from sample XML |
| **Grid** | XMLSpy-style grid: repeating elements collapse into tables; Paths mode lists `xpath = value` rows |

**Driving XMLTools from an AI agent?** See [AGENT_USAGE.md](AGENT_USAGE.md) — MCP tool
reference (both transports) and Playwright selectors/pitfalls for the web UI.

## Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR **Node.js 18+** (for local development)

## Quick Start (Docker)

### Using Docker Compose (Recommended)

```bash
docker-compose up
```

Then open http://localhost:3000 in your browser.

To stop:
```bash
docker-compose down
```

### Using Docker Directly

Build the image:
```bash
docker build -t xmltools .
```

Run the container:
```bash
docker run -p 3000:3000 xmltools
```

Then open http://localhost:3000 in your browser.

## Local Development (Node.js)

### Install Dependencies

```bash
npm install
```

### Start Server

```bash
npm start
```

Open http://localhost:3000

### Development Mode (with auto-reload)

```bash
npm run dev
```

(Requires `nodemon` to be installed)

## Usage

### Opening Files
- Click **📂 Open** button to load an XML file
- XML is automatically broadcast to all tabs

### Lint Tab
1. Paste or open XML
2. Click **▶ Run Lint**
3. View errors in the error panel

### Format Tab
1. Paste XML in the input pane
2. Click **▶ Format**
3. Formatted output appears on the right
4. Use **📋 Copy** or **💾 Save** to export

### Tree Tab
1. XML loads automatically into tree structure
2. Click nodes to view attributes in detail panel
3. Use **➕ Expand All** / **➖ Collapse All**

### XPath Tab
1. Enter an XPath expression (e.g., `//book[@category='fiction']/title`)
2. Click **▶ Query** or press Enter
3. Results listed and highlighted

**Example Queries**:
- `//title` — all title elements
- `/root/item[1]` — first item
- `count(//book)` — number of books

### Schema Tab
1. Click **📂 Load Schema** and select an `.xsd` or `.dtd` file
2. Paste XML to validate
3. Click **✓ Validate**
4. Error lines highlighted with details

### XSLT Tab
1. Click **📂 Load XML** to load the input payload (or paste it / use the global **📂 Open**)
2. Click **📂 Load XSL** and select an `.xsl` or `.xslt` file
3. Click **▶ Transform** to apply
4. Output appears in the right pane; **📋 Copy** it or hit **🔲 View in Grid** to inspect it as nodes

**Note**: the stylesheet's `match` patterns must fit the input document. If no template
matches, XSLT's built-in default rules copy text with no markup — that looks like a broken
transform but is correct behaviour for mismatched input.

### XML↔JSON Tab
**XML → JSON**:
- Paste XML, click **→ XML to JSON**
- Attributes become `@attr` keys
- Text content becomes `#text`

**JSON → XML**:
- Paste JSON, click **← JSON to XML**
- Reverse transformation

### Diff Tab
1. Click **📂 File A** and **📂 File B** to load files
2. Click **⚖️ Compare**
3. Deleted lines highlighted in red; added lines in green
4. Click **💾 Export** to save comparison

### Gen XSD Tab
1. Paste sample XML
2. Click **▶ Generate XSD**
3. Generated XSD appears in bottom pane
4. Repeated elements get `maxOccurs="unbounded"`
5. Click **💾 Save XSD** to export

### Grid Tab
Three ways to get XML in:
- **📂 Load XML** — the grid's own file picker (does *not* overwrite the other tabs)
- **📝 Paste XML** — opens a paste strip; paste, then **▶ Render**
- **📥 From XSLT Output** — grids the last transform result
- or the global **📂 Open**, which feeds every tab (and supersedes the grid's own source)

1. Load XML by any of the above — switching to the tab renders it automatically
2. Repeating sibling elements render as a **table**: one row per repetition, columns from
   the union of their attributes and child element names
3. Complex children show a **▶ expand** cell that opens a nested grid
4. **➕ Expand All** / **➖ Collapse All** to control depth
5. **📥 From XSLT Output** grids the last transform result without re-opening a file
6. Switch to **Paths** for a flat `xpath = value` listing — paths are pasteable straight
   into the XPath tab

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+O / Ctrl+O | Open file |
| Cmd+S / Ctrl+S | Save current XML |
| Enter | Run XPath query (in XPath tab) |

## Architecture

```
xmltools/
├── server.js              # Express entry point
├── package.json
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose configuration
├── .dockerignore          # Docker build exclusions
├── public/
│   ├── index.html         # Single-page app shell
│   ├── app.js             # Frontend JavaScript
│   └── style.css          # Responsive styling
└── routes/                # API endpoints
    ├── lint.js
    ├── format.js
    ├── tree.js
    ├── xpath.js
    ├── schema.js
    ├── xslt.js
    ├── xml-json.js
    ├── diff.js
    └── xsd-generate.js
```

## Dependencies

- **express**: Web framework
- **xml2js**: XML parsing and serialization
- **xpath**: XPath query execution
- **xmldom**: DOM parsing for XPath support
- **cors**: CORS middleware
- **uuid**: Unique ID generation

## API Endpoints

All endpoints accept POST requests with JSON bodies:

- `POST /api/lint` — Validate XML well-formedness
- `POST /api/format` — Pretty-print XML
- `POST /api/tree` — Build XML tree structure
- `POST /api/xpath` — Execute XPath query
- `POST /api/schema` — Validate against XSD/DTD
- `POST /api/xslt` — Apply XSLT transformation
- `POST /api/xml-json/to-json` — Convert XML to JSON
- `POST /api/xml-json/to-xml` — Convert JSON to XML
- `POST /api/diff` — Compare two XML documents
- `POST /api/xsd-generate` — Generate XSD from sample
- `POST /api/flatten` — Flatten XML into `path`/`value` rows

## Known Limitations

1. **Schema Validation**: Basic support; remote schemas not supported
2. **XSLT Transforms**: Shells out to `xsltproc` (libxslt); requires it on PATH (bundled in the Docker image via `apk add libxslt`, install separately for local `npm start` on macOS/Linux)
3. **XSD Generation**: Heuristic-based; intended as a starting point
4. **Round-trip Conversion**: XML↔JSON is lossy (comments, PIs dropped)

## Performance

- Tested with files up to 10 MB
- Large files (> 5 MB) may take 2-5 seconds for operations
- UI remains responsive due to client-side processing

## Troubleshooting

### Docker: Port 3000 already in use
```bash
docker-compose down
# OR
docker kill xmltools
```

Then try again:
```bash
docker-compose up
```

### Docker: Image not building
```bash
docker system prune -a
docker-compose build --no-cache
docker-compose up
```

### Local: Module not found
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Local: Port 3000 already in use (macOS/Linux)
```bash
lsof -i :3000
kill -9 <PID>
```

## Development

### Adding a New Tool

1. Create `routes/my-tool.js`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   
   router.post('/', (req, res) => {
     const { input } = req.body;
     // Process input
     res.json({ output: result });
   });
   
   module.exports = router;
   ```

2. Register in `server.js`:
   ```javascript
   app.use('/api/my-tool', require('./routes/my-tool'));
   ```

3. Add tab in `public/index.html` and handler in `public/app.js`

## License

MIT — see LICENSE file

## Contributing

PRs welcome! Areas for enhancement:
- XSLT 2.0/3.0 support
- Schema validation with remote URLs
- Real-time collaboration
- Dark mode
- Additional XPath functions

## Contact

Report issues on GitHub or contact the maintainer.

---

**Enjoy! Happy XML hacking.** 🎉
