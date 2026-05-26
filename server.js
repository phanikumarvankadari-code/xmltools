#!/usr/bin/env node
/**
 * XMLTools Express Server
 * Serves the web UI on HTTP and exposes MCP tools over SSE on the same port.
 *
 * Web UI:  http://localhost:3000
 * MCP SSE: http://localhost:3000/mcp/sse  (GET to open stream)
 *          http://localhost:3000/mcp/messages?sessionId=<id>  (POST to send messages)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const tools = require('./tools/xml-tools');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Web API routes ────────────────────────────────────────────────────────────
app.use('/api/lint',         require('./routes/lint'));
app.use('/api/format',       require('./routes/format'));
app.use('/api/tree',         require('./routes/tree'));
app.use('/api/xpath',        require('./routes/xpath'));
app.use('/api/schema',       require('./routes/schema'));
app.use('/api/xslt',         require('./routes/xslt'));
app.use('/api/xml-json',     require('./routes/xml-json'));
app.use('/api/diff',         require('./routes/diff'));
app.use('/api/xsd-generate', require('./routes/xsd-generate'));

// ── MCP over SSE ──────────────────────────────────────────────────────────────
// Sessions keyed by sessionId → SSE response object
const mcpSessions = new Map();

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

// SSE connection endpoint — client GETs this to open the stream
app.get('/mcp/sse', (req, res) => {
  const sessionId = crypto.randomUUID();

  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Tell the client where to POST its messages
  res.write(`event: endpoint\ndata: /mcp/messages?sessionId=${sessionId}\n\n`);

  mcpSessions.set(sessionId, res);

  req.on('close', () => {
    mcpSessions.delete(sessionId);
  });
});

// Message endpoint — client POSTs JSON-RPC here; response goes back via SSE
app.post('/mcp/messages', async (req, res) => {
  const { sessionId } = req.query;
  const sseRes = mcpSessions.get(sessionId);

  if (!sseRes) {
    return res.status(400).json({ error: 'Unknown sessionId' });
  }

  const message = req.body;
  let response;

  try {
    response = await handleMcpMessage(message);
  } catch (err) {
    response = { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32603, message: err.message } };
  }

  sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
  res.status(202).end('Accepted');
});

async function handleMcpMessage(msg) {
  const { method, id, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'xmltools', version: '1.0.0' },
      },
    };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    const result = await callTool(name, args);
    return { jsonrpc: '2.0', id, result };
  }

  if (method === 'notifications/initialized') {
    return null; // notification — no response
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', mcp: 'sse' }));

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 XMLTools running at http://localhost:${PORT}`);
  console.log(`🔌 MCP SSE endpoint: http://localhost:${PORT}/mcp/sse`);
  console.log('Press Ctrl+C to stop\n');
});
