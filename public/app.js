/**
 * XMLTools Frontend - Tab management and API calls
 */

// Global state
let currentXml = '';
let schemaFile = null;
let xslFile = null;
let fileAContent = '';
let fileBContent = '';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabContent = document.getElementById(`${tabName}-tab`);
  if (tabContent) {
    tabContent.classList.add('active');
  }

  // Mark button as active
  event.target.classList.add('active');

  // Load XML in new tabs
  if (currentXml) {
    if (tabName === 'lint') document.getElementById('lint-input').value = currentXml;
    if (tabName === 'format') document.getElementById('format-input').value = currentXml;
    if (tabName === 'xpath') document.getElementById('xpath-input').value = currentXml;
    if (tabName === 'schema') document.getElementById('schema-input').value = currentXml;
    if (tabName === 'xslt') document.getElementById('xslt-xml').value = currentXml;
    if (tabName === 'xml-json') document.getElementById('xml-input').value = currentXml;
  }
}

// Status helper
function setStatus(msg) {
  document.getElementById('status').textContent = msg;
  document.getElementById('statusbar').textContent = msg;
}

// File operations
document.getElementById('openBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xml';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      currentXml = text;
      document.getElementById('lint-input').value = text;
      document.getElementById('format-input').value = text;
      document.getElementById('xpath-input').value = text;
      document.getElementById('schema-input').value = text;
      document.getElementById('xslt-xml').value = text;
      document.getElementById('xml-input').value = text;
      setStatus(`Opened: ${file.name}`);
    }
  };
  input.click();
});

document.getElementById('saveBtn').addEventListener('click', () => {
  if (!currentXml) {
    setStatus('❌ Nothing to save');
    return;
  }
  const blob = new Blob([currentXml], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.xml';
  a.click();
  setStatus('✓ Saved');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  currentXml = '';
  document.querySelectorAll('textarea').forEach(ta => ta.value = '');
  setStatus('Cleared');
});

// ============ LINT ============
async function runLint() {
  const xml = document.getElementById('lint-input').value.trim();
  if (!xml) {
    setStatus('❌ Empty input');
    return;
  }

  try {
    const response = await fetch('/api/lint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();

    const panel = document.getElementById('lint-errors');
    if (result.valid) {
      panel.innerHTML = '<div class="success">✓ Well-formed XML</div>';
      setStatus('✓ Valid XML');
    } else {
      panel.innerHTML = result.errors.map(err =>
        `<div class="error-line"><strong>${err.line}:${err.col}</strong> ${err.message}</div>`
      ).join('');
      setStatus(`❌ ${result.errors.length} error(s)`);
    }
  } catch (err) {
    document.getElementById('lint-errors').innerHTML = `<div class="error-line">Error: ${err.message}</div>`;
    setStatus('❌ Error');
  }
}

// ============ FORMAT ============
async function runFormat() {
  const xml = document.getElementById('format-input').value.trim();
  if (!xml) {
    setStatus('❌ Empty input');
    return;
  }

  try {
    const response = await fetch('/api/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();

    if (result.error) {
      document.getElementById('format-output').value = `Error: ${result.error}`;
      setStatus('❌ Format failed');
    } else {
      document.getElementById('format-output').value = result.formatted;
      setStatus('✓ Formatted');
    }
  } catch (err) {
    document.getElementById('format-output').value = `Error: ${err.message}`;
    setStatus('❌ Error');
  }
}

function copyFormatOutput() {
  navigator.clipboard.writeText(document.getElementById('format-output').value);
  setStatus('📋 Copied');
}

function saveFormatOutput() {
  const text = document.getElementById('format-output').value;
  const blob = new Blob([text], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'formatted.xml';
  a.click();
  setStatus('💾 Saved');
}

// ============ TREE ============
async function loadTree() {
  const xml = document.getElementById('xpath-input').value || currentXml;
  if (!xml) return;

  try {
    const response = await fetch('/api/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();

    const treeView = document.getElementById('tree-view');
    treeView.innerHTML = buildTreeHtml(result.tree);
    setStatus('✓ Tree loaded');
  } catch (err) {
    setStatus('❌ Error');
  }
}

function buildTreeHtml(node, depth = 0) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  const attrs = node.attributes ? Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(' ') : '';
  const attrStr = attrs ? ` ${attrs}` : '';
  return `<div class="tree-item" style="margin-left: ${depth * 20}px"><strong>&lt;${node.tag}${attrStr}&gt;</strong></div>` +
    (node.children || []).map(child => buildTreeHtml(child, depth + 1)).join('');
}

function expandTree() {
  document.querySelectorAll('.tree-item').forEach(el => el.style.display = 'block');
}

function collapseTree() {
  document.querySelectorAll('.tree-item').forEach((el, i) => {
    if (i > 0) el.style.display = 'none';
  });
}

// ============ XPATH ============
async function runXPath() {
  const xml = document.getElementById('xpath-input').value.trim();
  const xpath = document.getElementById('xpath-query').value.trim();

  if (!xml || !xpath) {
    setStatus('❌ Empty input');
    return;
  }

  try {
    const response = await fetch('/api/xpath', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml, xpath })
    });
    const result = await response.json();

    const panel = document.getElementById('xpath-results');
    if (result.error) {
      panel.innerHTML = `<div class="error-line">Error: ${result.error}</div>`;
      setStatus('❌ Query failed');
    } else {
      panel.innerHTML = result.results.map((r, i) =>
        `<div class="result-item" onclick="highlightResult('${escapeHtml(r)}')">${i+1}. ${escapeHtml(r)}</div>`
      ).join('');
      setStatus(`✓ ${result.results.length} result(s)`);
    }
  } catch (err) {
    document.getElementById('xpath-results').innerHTML = `<div class="error-line">Error: ${err.message}</div>`;
    setStatus('❌ Error');
  }
}

// ============ SCHEMA ============
function loadSchema() {
  document.getElementById('schema-file').click();
}

document.getElementById('schema-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    schemaFile = file;
    setStatus(`Schema loaded: ${file.name}`);
  }
});

async function runValidation() {
  const xml = document.getElementById('schema-input').value.trim();
  if (!xml || !schemaFile) {
    setStatus('❌ Missing XML or schema');
    return;
  }

  try {
    const schemaText = await schemaFile.text();
    const response = await fetch('/api/schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml, schema: schemaText, schemaType: schemaFile.name.endsWith('.dtd') ? 'dtd' : 'xsd' })
    });
    const result = await response.json();

    const panel = document.getElementById('schema-results');
    if (result.valid) {
      panel.innerHTML = '<div class="success">✓ Valid XML</div>';
      setStatus('✓ Validation passed');
    } else {
      panel.innerHTML = result.errors.map(err =>
        `<div class="error-line"><strong>${err.line || 'N/A'}</strong> ${escapeHtml(err.message)}</div>`
      ).join('');
      setStatus(`❌ ${result.errors.length} error(s)`);
    }
  } catch (err) {
    document.getElementById('schema-results').innerHTML = `<div class="error-line">Error: ${err.message}</div>`;
    setStatus('❌ Error');
  }
}

// ============ XSLT ============
function loadXSL() {
  document.getElementById('xslt-file').click();
}

document.getElementById('xslt-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    xslFile = file;
    const text = await file.text();
    document.getElementById('xslt-xsl').value = text;
    setStatus(`XSL loaded: ${file.name}`);
  }
});

async function runTransform() {
  const xml = document.getElementById('xslt-xml').value.trim();
  const xsl = document.getElementById('xslt-xsl').value.trim();

  if (!xml || !xsl) {
    setStatus('❌ Missing XML or XSL');
    return;
  }

  try {
    const response = await fetch('/api/xslt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml, xsl })
    });
    const result = await response.json();

    if (result.error) {
      document.getElementById('xslt-output').value = `Error: ${result.error}`;
      setStatus('❌ Transform failed');
    } else {
      document.getElementById('xslt-output').value = result.output;
      setStatus('✓ Transformed');
    }
  } catch (err) {
    document.getElementById('xslt-output').value = `Error: ${err.message}`;
    setStatus('❌ Error');
  }
}

function copyXSLTOutput() {
  navigator.clipboard.writeText(document.getElementById('xslt-output').value);
  setStatus('📋 Copied');
}

// ============ XML↔JSON ============
async function xmlToJson() {
  const xml = document.getElementById('xml-input').value.trim();
  if (!xml) {
    setStatus('❌ Empty XML');
    return;
  }

  try {
    const response = await fetch('/api/xml-json/to-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();

    if (result.error) {
      document.getElementById('json-input').value = `Error: ${result.error}`;
      setStatus('❌ Conversion failed');
    } else {
      document.getElementById('json-input').value = JSON.stringify(result.json, null, 2);
      setStatus('✓ Converted');
    }
  } catch (err) {
    document.getElementById('json-input').value = `Error: ${err.message}`;
    setStatus('❌ Error');
  }
}

async function jsonToXml() {
  const json = document.getElementById('json-input').value.trim();
  if (!json) {
    setStatus('❌ Empty JSON');
    return;
  }

  try {
    const response = await fetch('/api/xml-json/to-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json })
    });
    const result = await response.json();

    if (result.error) {
      document.getElementById('xml-input').value = `Error: ${result.error}`;
      setStatus('❌ Conversion failed');
    } else {
      document.getElementById('xml-input').value = result.xml;
      setStatus('✓ Converted');
    }
  } catch (err) {
    document.getElementById('xml-input').value = `Error: ${err.message}`;
    setStatus('❌ Error');
  }
}

function copyLeft() {
  navigator.clipboard.writeText(document.getElementById('xml-input').value);
  setStatus('📋 Copied');
}

function copyRight() {
  navigator.clipboard.writeText(document.getElementById('json-input').value);
  setStatus('📋 Copied');
}

// ============ DIFF ============
function loadFileA() {
  document.getElementById('file-a').click();
}

function loadFileB() {
  document.getElementById('file-b').click();
}

document.getElementById('file-a').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    fileAContent = await file.text();
    document.getElementById('diff-a').value = fileAContent;
    setStatus(`File A loaded: ${file.name}`);
  }
});

document.getElementById('file-b').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    fileBContent = await file.text();
    document.getElementById('diff-b').value = fileBContent;
    setStatus(`File B loaded: ${file.name}`);
  }
});

async function runDiff() {
  if (!fileAContent || !fileBContent) {
    setStatus('❌ Load both files');
    return;
  }

  try {
    const response = await fetch('/api/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: fileAContent, b: fileBContent })
    });
    const result = await response.json();

    document.getElementById('diff-summary').innerHTML = `
      <strong>Added:</strong> ${result.added} | <strong>Removed:</strong> ${result.removed} | <strong>Changed:</strong> ${result.changed}
    `;
    setStatus('✓ Diff complete');
  } catch (err) {
    setStatus('❌ Error');
  }
}

function exportDiff() {
  const a = document.getElementById('diff-a').value;
  const b = document.getElementById('diff-b').value;
  const report = `=== File A ===\n${a}\n\n=== File B ===\n${b}`;
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diff_report.txt';
  link.click();
  setStatus('💾 Exported');
}

// ============ XSD GENERATION ============
async function generateXSD() {
  const xml = document.getElementById('xsd-input').value.trim();
  if (!xml) {
    setStatus('❌ Empty XML');
    return;
  }

  try {
    const response = await fetch('/api/xsd-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();

    if (result.error) {
      document.getElementById('xsd-output').value = `Error: ${result.error}`;
      setStatus('❌ Generation failed');
    } else {
      document.getElementById('xsd-output').value = result.xsd;
      setStatus('✓ Generated');
    }
  } catch (err) {
    document.getElementById('xsd-output').value = `Error: ${err.message}`;
    setStatus('❌ Error');
  }
}

function saveXSD() {
  const text = document.getElementById('xsd-output').value;
  const blob = new Blob([text], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'generated.xsd';
  a.click();
  setStatus('💾 Saved');
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightResult(text) {
  // Placeholder for highlighting in editor
  setStatus(`Selected: ${text.substring(0, 50)}...`);
}

// Initialize
setStatus('Ready');
