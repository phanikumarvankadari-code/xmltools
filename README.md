# XMLTools — Comprehensive XML Toolkit for macOS

A native desktop application for XML manipulation and analysis, built entirely in Python with zero external dependencies for core functionality.

## Features

XMLTools consolidates 9 specialized XML tools into one unified interface:

| Tool | Purpose |
|------|---------|
| **Lint** | Validate XML well-formedness; highlight parsing errors with line numbers |
| **Format** | Pretty-print and indent XML; reformat minified documents |
| **Tree** | Visual navigation of XML structure; drill down to elements and attributes |
| **XPath** | Execute XPath 1.0 queries with result highlighting; save query history |
| **Schema** | Validate XML against XSD or DTD schemas; error line highlighting |
| **XSLT** | Apply XSL transformations; auto-detect output format (XML/HTML/text) |
| **XML↔JSON** | Bidirectional conversion with standard conventions (@attr, #text, arrays) |
| **Diff** | Visual comparison of two XML files; color-coded additions/deletions |
| **Gen XSD** | Auto-generate XSD schema from sample XML; infer types and cardinality |

## Prerequisites

- **macOS** 10.15 or later
- **Python 3.9** or later
- `xmllint` and `xsltproc` (pre-installed on macOS via libxml2)

### Optional
- **lxml** (for enhanced XPath 2.0 support) — install via `pip3 install lxml`

## Installation

```bash
git clone https://github.com/yourusername/xmltools.git
cd xmltools
python3 main.py
```

No external packages required for core functionality.

### Enable Optional Features

```bash
pip3 install lxml
```

The app detects lxml availability and shows status in the toolbar.

## Usage Guide

### Opening Files
- **Toolbar**: Click **[Open]** button or use **Cmd+O**
- **File Menu**: **File > Open...**
- Files are automatically broadcast to all tabs

### Lint Tab
1. Paste or open XML
2. Click **[Run Lint]**
3. View errors in the error panel
4. Error lines are highlighted in red

**Example**: Detect unclosed tags, attribute mismatches, encoding issues.

### Format Tab
1. Paste XML in the input pane
2. Click **[Format]**
3. Formatted output appears in the right pane
4. Use **[Copy Output]** or **[Save Output]** to export

**Example**: Convert `<root><a>1</a></root>` → properly indented 4-line document.

### Tree Tab
1. XML loads automatically into the tree structure
2. Click nodes to drill down; see attributes in the detail panel
3. Use **[Expand All]** / **[Collapse All]** to navigate large documents

**Example**: Explore a catalog of 1000 items without writing code.

### XPath Tab
1. XML displayed in editor
2. Enter an XPath expression (e.g., `//book[@category='fiction']/title`)
3. Click **[Query]** or press Enter
4. Results listed and highlighted in the editor
5. Query history saved in the dropdown

**Example Queries**:
- `//title` — all title elements
- `/root/item[position()=1]` — first item
- `count(//book)` — number of books
- `//book[@price > 20]` — books over $20 (with lxml)

### Schema Tab
1. Click **[Load Schema]** and select an `.xsd` or `.dtd` file
2. Paste XML to validate
3. Click **[Validate]**
4. Error lines highlighted; validation result shown

**Example**: Validate a SOAP message against a W3C schema.

### XSLT Tab
1. Click **[Load XSL]** and select an `.xsl` or `.xslt` file
2. XML editor shows your source
3. XSL preview (read-only) displayed in middle pane
4. Click **[Transform]** to apply
5. Output auto-formatted in right pane

**Example**: Transform a legacy XML inventory to modern format.

### XML↔JSON Tab
1. **XML → JSON**: Paste XML, click **[XML → JSON]**
   - Attributes become `@attr` keys
   - Text content becomes `#text`
   - Arrays auto-detected from repeated elements
2. **JSON → XML**: Paste JSON, click **[JSON → XML]**
   - Reverse transformation; not fully lossless

**Conventions**:
```json
{
  "book": {
    "@id": "1",
    "#text": "Title here",
    "author": ["Author 1", "Author 2"]
  }
}
```

### Diff Tab
1. Click **[Load File A]** and **[Load File B]**
2. Click **[Compare]**
3. Deleted lines highlighted in File A (red); added lines in File B (green)
4. Summary shows line counts
5. Click **[Export Diff]** to save comparison

**Example**: Track XML changes across data exports.

### Gen XSD Tab
1. Paste sample XML
2. Click **[Generate XSD]**
3. Generated XSD appears in bottom pane
4. Cardinality automatically detected (e.g., `maxOccurs="unbounded"` for repeated elements)
5. Types inferred (integer, decimal, string)
6. Click **[Save XSD]** to export

**Example**: Create a schema from 100 representative records to validate new data.

## Toolbar & Menu

**Toolbar** (Top bar):
- `[Open]` — open a file
- `[Save]` — save current XML to disk
- `[Clear]` — clear all tabs
- lxml status indicator (✓ or ✗)

**File Menu**:
- **Open...** (Cmd+O)
- **Save...** (Cmd+S)
- **Exit**

**Help Menu**:
- **About** — version and feature summary

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+O | File > Open |
| Cmd+S | File > Save |
| Enter | XPath Query (in XPath tab) |

## Performance Notes

- **Large files (> 1 MB)**: Syntax highlighting is viewport-limited; queries may take 2–5 seconds
- **Tree navigation**: Tested up to 10,000 elements; expand/collapse is instant
- **Diff**: Linear in file size; 5 MB files diff in ~2 seconds

**Tip**: For processing files > 100 MB, use command-line tools (`xmllint`, `xsltproc`).

## Known Limitations

1. **XML↔JSON Conversion**
   - Round-trip is lossy: XML comments, processing instructions, and namespaces are dropped
   - DTDs are not preserved during conversion

2. **XPath**
   - Without lxml: XPath 1.0 only (xmllint via subprocess)
   - With lxml: Full XPath 2.0 support available

3. **XSD Generation**
   - Heuristic-based; intended as a starting point, not production-ready
   - Recursive elements flagged with `<!-- REVIEW: recursive element -->` comments
   - Mixed content detected but not fully optimized in the XSD
   - Type inference is simplistic: tries int, float, then defaults to string

4. **Schema Validation**
   - DTD validation requires local file paths; no remote schema support
   - Only libxml2 schemas are supported (`.xsd`, `.dtd`)

## Troubleshooting

### "xmllint not found"
Ensure you have Xcode Command Line Tools installed:
```bash
xcode-select --install
```

### lxml installation fails
```bash
pip3 install lxml --user
```

If that fails, you can still use the app with XPath 1.0 support via xmllint.

### Large file hangs
The app may become unresponsive on files > 5 MB. Workaround:
- Use the command-line tools directly
- Split large files and process separately

## Architecture

- **UI**: Python `tkinter` with macOS native theme (`ttk`)
- **Core parsing**: `xml.etree.ElementTree` (stdlib)
- **External tools**: `/usr/bin/xmllint`, `/usr/bin/xsltproc`
- **Syntax highlighting**: Regex-based with debounced updates
- **Conversion**: `json` + `xml.etree` (stdlib)

All tools communicate via `AppState` and `SharedActions` for live XML broadcasting across tabs.

## Development

### Project Structure
```
xmltools/
├── main.py                      # Entry point; app window & tabs
├── app.py                       # AppState, SharedActions
├── utils/
│   ├── subprocess_runner.py     # External tool wrappers
│   ├── xml_io.py                # XML parsing & pretty-printing
│   └── highlight.py             # Syntax highlighting
└── tools/                       # One module per tab
    ├── lint.py
    ├── pretty_print.py
    ├── tree_view.py
    ├── xpath_query.py
    ├── schema_validate.py
    ├── xslt_transform.py
    ├── xml_json.py
    ├── diff_compare.py
    └── xsd_generate.py
```

### Adding a New Tool
1. Create `tools/my_tool.py` with a class inheriting `ttk.Frame`
2. Implement `setup_ui()` and handlers
3. Register for XML broadcasts: `self.actions.register_broadcaster(self.on_xml_loaded)`
4. Add to `main.py` notebook

## License

MIT — see LICENSE file

## Contributing

PRs welcome! Areas for enhancement:
- Remote schema validation (XSD/DTD from URLs)
- Real-time collaboration (diff sync across machines)
- Additional XPath functions (string manipulation, date parsing)
- Performance tuning for very large files
- Dark mode support

## Contact

Report issues on GitHub. For feature requests, open a discussion.

---

**Enjoy! Happy XML hacking.** 🎉
