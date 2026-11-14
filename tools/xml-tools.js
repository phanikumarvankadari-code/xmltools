/**
 * Shared XML tool implementations used by both the Express HTTP API and MCP server
 */

const { parseStringPromise } = require('xml2js');
const xml2js = require('xml2js');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

async function transformXslt(xml, xsl) {
  if (!xml || !xml.trim() || !xsl || !xsl.trim()) return { error: 'Missing XML or XSL' };

  const tmpId = crypto.randomUUID();
  const xmlPath = path.join(os.tmpdir(), `xmltools-${tmpId}.xml`);
  const xslPath = path.join(os.tmpdir(), `xmltools-${tmpId}.xsl`);

  try {
    await fs.writeFile(xmlPath, xml, 'utf8');
    await fs.writeFile(xslPath, xsl, 'utf8');

    const output = await new Promise((resolve, reject) => {
      execFile('xsltproc', [xslPath, xmlPath], { maxBuffer: 100 * 1024 * 1024, timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr.trim() || err.message));
        else resolve(stdout);
      });
    });

    return { output };
  } catch (err) {
    return { error: err.message };
  } finally {
    await Promise.all([xmlPath, xslPath].map(p => fs.unlink(p).catch(() => {})));
  }
}

async function lintXml(xml) {
  if (!xml || !xml.trim()) return { valid: false, errors: [{ message: 'Empty input' }] };
  try {
    await parseStringPromise(xml);
    return { valid: true, errors: [] };
  } catch (err) {
    const match = err.message.match(/line (\d+), col (\d+)/);
    const [line, col] = match ? [parseInt(match[1]), parseInt(match[2])] : ['?', '?'];
    return { valid: false, errors: [{ line, col, message: err.message }] };
  }
}

async function formatXml(xml) {
  if (!xml || !xml.trim()) return { error: 'Empty input' };
  try {
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({ headless: false });
    const parsed = await parser.parseStringPromise(xml);
    const formatted = builder.buildObject(parsed);
    return { formatted: prettyPrint(formatted) };
  } catch (err) {
    return { error: err.message };
  }
}

function prettyPrint(xml) {
  let formatted = '';
  let indent = 0;
  const lines = xml.split(/>\s*</);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('/')) indent--;
    formatted += '  '.repeat(Math.max(0, indent)) + '<' + line + '>\n';
    if (!line.endsWith('/') && !line.startsWith('/') && !line.includes('!')) indent++;
  }
  return formatted.replace(/\n$/, '');
}

async function buildTree(xml) {
  if (!xml || !xml.trim()) return { tree: null };
  try {
    const parser = new xml2js.Parser({ attrkey: '@' });
    const parsed = await parser.parseStringPromise(xml);
    return { tree: parseTree(parsed) };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Flatten XML into one `path = value` row per leaf element and per attribute.
 * Paths use XPath positional predicates only where a tag repeats among its
 * siblings, so they can be pasted straight into the XPath tool.
 */
async function flattenXml(xml) {
  const { tree, error } = await buildTree(xml);
  if (error) return { error };
  if (!tree) return { rows: [] };

  const rows = [];

  function walkNode(node, parentPath, suffix = '') {
    const path = `${parentPath}/${node.tag}${suffix}`;

    for (const [name, value] of Object.entries(node.attributes || {})) {
      rows.push({ path: `${path}/@${name}`, value: String(value) });
    }

    const children = node.children || [];
    const text = node.text != null ? String(node.text).trim() : '';

    if (children.length === 0) {
      rows.push({ path, value: text });
      return;
    }

    if (text) rows.push({ path, value: text });

    const counts = {};
    children.forEach(c => { counts[c.tag] = (counts[c.tag] || 0) + 1; });
    const seen = {};

    for (const child of children) {
      seen[child.tag] = (seen[child.tag] || 0) + 1;
      walkNode(child, path, counts[child.tag] > 1 ? `[${seen[child.tag]}]` : '');
    }
  }

  walkNode(tree, '');
  return { rows };
}

function parseTree(obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;
  const firstKey = keys[0];
  const content = obj[firstKey];
  if (Array.isArray(content)) {
    return { tag: firstKey, attributes: {}, children: content.map(item => typeof item === 'object' ? parseTree({ [firstKey]: item }) : { tag: firstKey, text: item, attributes: {}, children: [] }) };
  } else if (typeof content === 'object') {
    const attrs = {};
    const children = [];
    let text;
    for (const [key, value] of Object.entries(content)) {
      if (key === '@') { Object.assign(attrs, value); }
      // xml2js charkey: an element with both attributes and text yields { '@': {...}, '_': 'text' }.
      // Treat it as this node's text, not as a child element literally named "_".
      else if (key === '_') { text = Array.isArray(value) ? value.join('') : value; }
      else if (Array.isArray(value)) { value.forEach(item => children.push(typeof item === 'object' ? parseTree({ [key]: item }) : { tag: key, text: item, attributes: {}, children: [] })); }
      else if (typeof value === 'object') { children.push(parseTree({ [key]: value })); }
      else { children.push({ tag: key, text: value, attributes: {}, children: [] }); }
    }
    return { tag: firstKey, attributes: attrs, children, ...(text !== undefined ? { text } : {}) };
  }
  return { tag: firstKey, text: content, attributes: {}, children: [] };
}

async function xpathQuery(xml, xpathExpr) {
  if (!xml || !xpathExpr) return { error: 'Missing input', results: [] };
  try {
    const doc = new DOMParser().parseFromString(xml);
    const results = xpath.select(xpathExpr, doc);
    const resultStrings = results.map(node => {
      if (node.nodeType === 3) return node.nodeValue;
      if (node.nodeType === 1) return node.toString();
      if (node.nodeType === 2) return node.value;
      return String(node);
    });
    return { results: resultStrings };
  } catch (err) {
    return { error: err.message, results: [] };
  }
}

async function validateSchema(xml, schema) {
  if (!xml || !schema) return { valid: false, errors: [{ message: 'Missing XML or schema' }] };
  return { valid: true, errors: [] };
}

async function xmlToJson(xml) {
  if (!xml || !xml.trim()) return { error: 'Empty XML' };
  try {
    const parser = new xml2js.Parser({ attrkey: '@', charkey: '#text' });
    const json = await parser.parseStringPromise(xml);
    return { json };
  } catch (err) {
    return { error: err.message };
  }
}

function jsonToXml(json) {
  if (!json || !json.trim()) return { error: 'Empty JSON' };
  try {
    const data = JSON.parse(json);
    const builder = new xml2js.Builder({ attrkey: '@', charkey: '#text' });
    return { xml: builder.buildObject(data) };
  } catch (err) {
    return { error: err.message };
  }
}

function diffXml(a, b) {
  if (!a || !b) return { error: 'Missing files', added: 0, removed: 0, changed: 0 };
  try {
    const linesA = a.split('\n');
    const linesB = b.split('\n');
    const added = Math.max(0, linesB.length - linesA.length);
    const removed = Math.max(0, linesA.length - linesB.length);
    let changed = 0;
    for (let i = 0; i < Math.min(linesA.length, linesB.length); i++) {
      if (linesA[i] !== linesB[i]) changed++;
    }
    return { added, removed, changed };
  } catch (err) {
    return { error: err.message, added: 0, removed: 0, changed: 0 };
  }
}

async function generateXsd(xml) {
  if (!xml || !xml.trim()) return { error: 'Empty XML' };
  try {
    const parser = new xml2js.Parser({ attrkey: '@' });
    const parsed = await parser.parseStringPromise(xml);
    const schema = analyzeElement(parsed);
    return { xsd: emitXSD(schema) };
  } catch (err) {
    return { error: err.message };
  }
}

function analyzeElement(obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;
  const firstKey = keys[0];
  const content = obj[firstKey];
  const schema = { tag: firstKey, attributes: {}, children: {}, maxOccurs: 1 };
  if (Array.isArray(content)) {
    schema.maxOccurs = content.length > 1 ? 'unbounded' : 1;
    if (content.length > 0 && typeof content[0] === 'object') {
      const child = analyzeElement(content[0]);
      if (child) schema.children[firstKey] = child;
    }
  } else if (typeof content === 'object') {
    for (const [key, value] of Object.entries(content)) {
      if (key === '@') { schema.attributes = value || {}; }
      else { const child = analyzeElement({ [key]: value }); if (child) schema.children[key] = child; }
    }
  }
  return schema;
}

function emitXSD(schema) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">'];
  emitElement(schema, 1, lines);
  lines.push('</xs:schema>');
  return lines.join('\n');
}

function emitElement(schema, indent, lines) {
  const ind = '  '.repeat(indent);
  const maxAttr = schema.maxOccurs === 'unbounded' ? ' maxOccurs="unbounded"' : '';
  if (Object.keys(schema.children).length === 0) {
    lines.push(`${ind}<xs:element name="${schema.tag}" type="xs:string"${maxAttr}/>`);
  } else {
    lines.push(`${ind}<xs:element name="${schema.tag}"${maxAttr}>`);
    lines.push(`${ind}  <xs:complexType><xs:sequence>`);
    for (const child of Object.values(schema.children)) emitElement(child, indent + 2, lines);
    lines.push(`${ind}  </xs:sequence>`);
    for (const attrName of Object.keys(schema.attributes)) lines.push(`${ind}  <xs:attribute name="${attrName}" type="xs:string"/>`);
    lines.push(`${ind}  </xs:complexType>`);
    lines.push(`${ind}</xs:element>`);
  }
}

module.exports = { lintXml, formatXml, buildTree, flattenXml, xpathQuery, validateSchema, transformXslt, xmlToJson, jsonToXml, diffXml, generateXsd };
