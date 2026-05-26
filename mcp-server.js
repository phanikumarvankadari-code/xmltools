#!/usr/bin/env node
/**
 * XMLTools MCP Server — stdio transport
 * Use this when running locally without Docker (e.g. Claude Desktop direct spawn).
 * For container deployments use the SSE endpoint in server.js instead.
 */

const tools = require('./tools/xml-tools');

const MCP_TOOLS = [
  { name: 'lint_xml',           description: 'Validate XML well-formedness and report errors with line numbers',      inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } },
  { name: 'format_xml',         description: 'Pretty-print and indent XML with consistent formatting',               inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } },
  { name: 'parse_xml_tree',     description: 'Parse XML and return its tree structure with elements and attributes',  inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } },
  { name: 'xpath_query',        description: 'Execute an XPath expression against XML and return matching nodes',     inputSchema: { type: 'object', properties: { xml: { type: 'string' }, xpath: { type: 'string' } }, required: ['xml', 'xpath'] } },
  { name: 'validate_schema',    description: 'Validate XML against XSD schema',                                       inputSchema: { type: 'object', properties: { xml: { type: 'string' }, schema: { type: 'string' } }, required: ['xml', 'schema'] } },
  { name: 'convert_xml_to_json',description: 'Convert XML to JSON with attributes as @attr and text as #text',       inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } },
  { name: 'convert_json_to_xml',description: 'Convert JSON to XML (reverse of convert_xml_to_json)',                 inputSchema: { type: 'object', properties: { json: { type: 'string' } }, required: ['json'] } },
  { name: 'diff_xml',           description: 'Compare two XML documents and report additions, deletions, and changes',inputSchema: { type: 'object', properties: { xml_a: { type: 'string' }, xml_b: { type: 'string' } }, required: ['xml_a', 'xml_b'] } },
  { name: 'generate_xsd',       description: 'Generate XSD schema from a sample XML document',                       inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } },
];

async function callTool(name, args) {
  switch (name) {
    case 'lint_xml': {
      const r = await tools.lintXml(args.xml);
      const text = r.valid ? '✓ Well-formed XML' : r.errors.map(e => `✗ Line ${e.line}, Col ${e.col}: ${e.message}`).join('\n');
      return { content: [{ type: 'text', text }], isError: !r.valid };
    }
    case 'format_xml': {
      const r = await tools.formatXml(args.xml);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: r.formatted }] };
    }
    case 'parse_xml_tree': {
      const r = await tools.buildTree(args.xml);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: JSON.stringify(r.tree, null, 2) }] };
    }
    case 'xpath_query': {
      const r = await tools.xpathQuery(args.xml, args.xpath);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: r.results.length ? r.results.join('\n') : 'No results' }] };
    }
    case 'validate_schema': {
      const r = await tools.validateSchema(args.xml, args.schema);
      return { content: [{ type: 'text', text: r.valid ? '✓ Valid' : r.errors.map(e => e.message).join('\n') }], isError: !r.valid };
    }
    case 'convert_xml_to_json': {
      const r = await tools.xmlToJson(args.xml);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: JSON.stringify(r.json, null, 2) }] };
    }
    case 'convert_json_to_xml': {
      const r = tools.jsonToXml(args.json);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: r.xml }] };
    }
    case 'diff_xml': {
      const r = tools.diffXml(args.xml_a, args.xml_b);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: `Added: ${r.added} lines\nRemoved: ${r.removed} lines\nChanged: ${r.changed} lines` }] };
    }
    case 'generate_xsd': {
      const r = await tools.generateXsd(args.xml);
      return r.error ? { content: [{ type: 'text', text: r.error }], isError: true } : { content: [{ type: 'text', text: r.xsd }] };
    }
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}

// Minimal JSON-RPC over stdio — no SDK dependency
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    handleLine(trimmed);
  }
});

async function handleLine(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  const { method, id, params } = msg;
  let response;

  if (method === 'initialize') {
    response = { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'xmltools', version: '1.0.0' } } };
  } else if (method === 'tools/list') {
    response = { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  } else if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments);
      response = { jsonrpc: '2.0', id, result };
    } catch (err) {
      response = { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } };
    }
  } else if (method === 'notifications/initialized') {
    return; // notification — no response
  } else {
    response = { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }

  if (response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

process.stderr.write('[XMLTools MCP Server] Started on stdio\n');
