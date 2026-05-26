/**
 * Format route - Pretty-print XML
 */

const express = require('express');
const xml2js = require('xml2js');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ error: 'Empty input' });
  }

  try {
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ headless: false, rootName: 'root' });

    const parsed = await parser.parseStringPromise(xml);

    // If root exists in parsed, use it; otherwise use the whole parsed object
    const root = parsed.root || parsed;
    const formatted = builder.buildObject(root);

    // Custom formatting with proper indentation
    const pretty = formatXml(formatted);

    return res.json({ formatted: pretty });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

function formatXml(xml) {
  let formatted = '';
  let indent = 0;
  const lines = xml.split(/>\s*</);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith('/')) {
      indent--;
    }

    formatted += '  '.repeat(Math.max(0, indent)) + '<' + line + '>\n';

    if (!line.endsWith('/') && !line.startsWith('/') && !line.includes('!')) {
      indent++;
    }
  }

  return formatted.replace(/\n$/, '');
}

module.exports = router;
