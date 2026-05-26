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
1. Click **📂 Load XSL** and select an `.xsl` or `.xslt` file
2. XML editor shows source
3. XSL preview displayed
4. Click **▶ Transform** to apply
5. Output auto-formatted in right pane

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

## Known Limitations

1. **Schema Validation**: Basic support; remote schemas not supported
2. **XSLT Transforms**: Currently returns placeholder output
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
- Full XSLT transformation support
- Schema validation with remote URLs
- Real-time collaboration
- Dark mode
- Additional XPath functions

## Contact

Report issues on GitHub or contact the maintainer.

---

**Enjoy! Happy XML hacking.** 🎉
