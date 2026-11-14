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

  // Mark button as active. Looked up by data-tab rather than the implicit global
  // `event.target`, so switchTab() also works when called programmatically.
  const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (tabBtn) tabBtn.classList.add('active');

  // Load XML in new tabs
  if (currentXml) {
    if (tabName === 'lint') document.getElementById('lint-input').value = currentXml;
    if (tabName === 'format') document.getElementById('format-input').value = currentXml;
    if (tabName === 'xpath') document.getElementById('xpath-input').value = currentXml;
    if (tabName === 'schema') document.getElementById('schema-input').value = currentXml;
    if (tabName === 'xslt') document.getElementById('xslt-xml').value = currentXml;
    if (tabName === 'xml-json') document.getElementById('xml-input').value = currentXml;
    if (tabName === 'tree') loadTree();
  }

  // Grid loads even with no currentXml, so it can render a pending XSLT output.
  if (tabName === 'grid') {
    const pending = gridPendingXml;
    gridPendingXml = null;
    loadGrid(pending || undefined);
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
      gridSourceXml = ''; // a newly opened file supersedes the grid's own source
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
let treeData = null;
let selectedTreeNode = null;

function openTreeFile() {
  document.getElementById('tree-file').click();
}

document.getElementById('tree-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const text = await file.text();
    currentXml = text;
    document.getElementById('xpath-input').value = text;
    await loadTree();
    setStatus(`Tree file loaded: ${file.name}`);
  }
});

// Drag and drop
const treeView = document.getElementById('tree-view');
treeView.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  treeView.classList.add('drag-over');
});

treeView.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  treeView.classList.remove('drag-over');
});

treeView.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  treeView.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
      const text = await file.text();
      currentXml = text;
      document.getElementById('xpath-input').value = text;
      await loadTree();
      setStatus(`✓ Dropped: ${file.name}`);
    } else {
      setStatus('❌ Only XML files allowed');
    }
  }
});

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
    treeData = result.tree;

    const treeView = document.getElementById('tree-view');
    treeView.innerHTML = buildTreeHtml(result.tree);
    addTreeListeners();
    setStatus('✓ Tree loaded');
  } catch (err) {
    setStatus('❌ Error');
  }
}

// Store node data for editing
let nodeDataMap = {};

function buildTreeHtml(node, depth = 0, path = '') {
  if (!node) return '';
  const nodeId = `node-${depth}-${Math.random().toString(36).slice(2)}`;

  // Store node data for later access
  nodeDataMap[nodeId] = node;

  const attrs = node.attributes ? Object.entries(node.attributes).map(([k, v]) => `${k}="${v}"`).join(' ') : '';
  const attrStr = attrs ? ` ${attrs}` : '';
  const hasChildren = node.children && node.children.length > 0;
  const hasText = node.text && node.text.trim();
  const toggleIcon = hasChildren ? '▼' : '';

  let contentStr = '';
  if (hasText) {
    const displayText = node.text.trim().length > 50 ? node.text.trim().substring(0, 50) + '...' : node.text.trim();
    contentStr = ` <span style="color: #666; margin-left: 5px;">"${displayText}"</span>`;
  }

  return `<div class="tree-item" id="${nodeId}" style="margin-left: ${depth * 20}px; cursor: pointer; padding: 2px 4px; border-radius: 3px;">
    <span class="tree-toggle" style="display: ${hasChildren ? 'inline' : 'none'}; margin-right: 5px;">${toggleIcon}</span>
    <strong onclick="selectTreeNode('${nodeId}', this)">&lt;${node.tag}${attrStr}&gt;</strong>${contentStr}
    <span class="tree-children" style="display: block;">
      ${(node.children || []).map((child, i) => buildTreeHtml(child, depth + 1, `${path}/${node.tag}[${i}]`)).join('')}
    </span>
  </div>`;
}

function addTreeListeners() {
  document.querySelectorAll('.tree-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const children = toggle.parentElement.querySelector('.tree-children');
      if (children) {
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? 'block' : 'none';
        toggle.textContent = isHidden ? '▼' : '▶';
      }
    });
  });

  document.querySelectorAll('.tree-item').forEach(item => {
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, item);
    });
  });
}

function selectTreeNode(nodeId, element) {
  document.querySelectorAll('.tree-item').forEach(el => el.style.backgroundColor = 'transparent');
  element.parentElement.style.backgroundColor = '#e3f2fd';
  selectedTreeNode = nodeId;

  const nodeData = nodeDataMap[nodeId];
  if (!nodeData) {
    document.getElementById('tree-details').innerHTML = '<div style="padding: 10px; color: #999;">Node data not found</div>';
    return;
  }

  const tag = nodeData.tag;
  const attrsObj = nodeData.attributes || {};
  const attrsStr = Object.entries(attrsObj).map(([k, v]) => `${k}="${v}"`).join('\n');
  const textContent = nodeData.text || '';

  const details = document.getElementById('tree-details');
  details.innerHTML = `
    <div style="padding: 10px;">
      <h4>Edit Element: &lt;${tag}&gt;</h4>
      <div style="margin: 10px 0;">
        <label><strong>Tag Name:</strong></label>
        <input type="text" id="edit-tag" value="${tag}" style="width: 100%; padding: 5px; margin: 5px 0;" />
      </div>
      <div style="margin: 10px 0;">
        <label><strong>Attributes:</strong></label>
        <textarea id="edit-attrs" style="width: 100%; height: 80px; padding: 5px; margin: 5px 0; font-family: monospace; font-size: 12px;" placeholder="key="value"&#10;key2="value2">${escapeHtml(attrsStr)}</textarea>
      </div>
      <div style="margin: 10px 0;">
        <label><strong>Text Content:</strong></label>
        <textarea id="edit-content" style="width: 100%; height: 80px; padding: 5px; margin: 5px 0;" placeholder="Enter text content...">${escapeHtml(textContent)}</textarea>
      </div>
      <button class="btn-small" onclick="applyNodeEdit()">✓ Apply Changes</button>
      <button class="btn-small" onclick="deleteNode()">🗑️ Delete Node</button>
      <button class="btn-small" onclick="addChildNode()">➕ Add Child</button>
    </div>
  `;
}

function showContextMenu(e, element) {
  selectedTreeNode = element.id;
  const menu = document.getElementById('context-menu');
  const items = document.getElementById('context-menu-items');

  const tag = element.querySelector('strong').textContent.match(/&lt;(\w+)/)[1];

  items.innerHTML = `
    <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="editNodeFromMenu(); closeContextMenu();">
      ✏️ Edit "${tag}"
    </div>
    <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="addChildFromMenu(); closeContextMenu();">
      ➕ Add Child Element
    </div>
    <div style="padding: 8px; cursor: pointer; color: #d32f2f;" onclick="deleteNode(); closeContextMenu();">
      🗑️ Delete Node
    </div>
  `;

  menu.style.display = 'block';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
}

function closeContextMenu() {
  document.getElementById('context-menu').style.display = 'none';
}

function editNodeFromMenu() {
  const element = document.getElementById(selectedTreeNode);
  if (element) {
    element.querySelector('strong').click();
  }
}

function addChildFromMenu() {
  const tagName = prompt('Enter new tag name:', 'newElement');
  if (tagName) {
    const element = document.getElementById(selectedTreeNode);
    if (element) {
      const newHtml = buildTreeHtml({ tag: tagName, attributes: {}, children: [] }, 1);
      const childrenDiv = element.querySelector('.tree-children');
      if (childrenDiv) {
        childrenDiv.innerHTML += newHtml;
        addTreeListeners();
        setStatus(`Added child: ${tagName}`);
      }
    }
  }
}

function addChildNode() {
  addChildFromMenu();
}

function applyNodeEdit() {
  const newTag = document.getElementById('edit-tag').value.trim();
  const attrsText = document.getElementById('edit-attrs').value.trim();
  const content = document.getElementById('edit-content').value;

  if (!newTag) {
    setStatus('❌ Tag name required');
    return;
  }

  const nodeData = nodeDataMap[selectedTreeNode];
  if (!nodeData) {
    setStatus('❌ Node not found');
    return;
  }

  // Update node data
  nodeData.tag = newTag;
  nodeData.text = content;

  // Parse attributes
  const attrs = {};
  if (attrsText) {
    attrsText.split('\n').forEach(line => {
      const match = line.match(/(\w+)="([^"]*)"/);
      if (match) attrs[match[1]] = match[2];
    });
  }
  nodeData.attributes = attrs;

  // Update DOM display
  const element = document.getElementById(selectedTreeNode);
  if (element) {
    const strong = element.querySelector('strong');
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    const contentStr = content && content.trim() ? ` <span style="color: #666; margin-left: 5px;">"${content.trim().length > 50 ? content.trim().substring(0, 50) + '...' : content.trim()}"</span>` : '';
    strong.outerHTML = `<strong onclick="selectTreeNode('${selectedTreeNode}', this)">&lt;${newTag}${attrStr ? ' ' + attrStr : ''}&gt;</strong>${contentStr}`;
    setStatus('✓ Node updated');
  }
}

function deleteNode() {
  if (confirm('Delete this node and all its children?')) {
    const element = document.getElementById(selectedTreeNode);
    if (element) {
      element.remove();
      document.getElementById('tree-details').innerHTML = '';
      setStatus('✓ Node deleted');
    }
  }
}

function expandTree() {
  document.querySelectorAll('.tree-children').forEach(el => el.style.display = 'block');
  document.querySelectorAll('.tree-toggle').forEach(el => el.textContent = '▼');
}

function collapseTree() {
  document.querySelectorAll('.tree-children').forEach((el, i) => {
    if (i > 0) el.style.display = 'none';
  });
  document.querySelectorAll('.tree-toggle').forEach(el => el.textContent = '▶');
}

document.addEventListener('click', () => {
  closeContextMenu();
});

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

// Load the input payload straight into the XSLT tab, without going via 📂 Open.
function loadXsltXml() {
  document.getElementById('xslt-xml-file').click();
}

document.getElementById('xslt-xml-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const text = await file.text();
    document.getElementById('xslt-xml').value = text;
    currentXml = text;
    setStatus(`XML loaded: ${file.name}`);
  }
});

function viewXsltOutputInGrid() {
  const out = document.getElementById('xslt-output').value.trim();
  if (!out) {
    setStatus('❌ No XSLT output — run Transform first');
    return;
  }
  gridPendingXml = out;
  switchTab('grid');
}

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

// ============ GRID (XMLSpy-style) ============
let gridData = null;
let gridMode = 'grid';
let gridPendingXml = null;
// The document the grid is currently showing — set by file load, paste, or XSLT output.
let gridSourceXml = '';
// Bumped on every render request; a fetch that resolves after a newer request
// started is discarded, so fast Grid/Paths toggling can't leave stale content.
let gridRenderSeq = 0;

// Depth up to which nested blocks start expanded. Keeps big documents responsive.
const GRID_OPEN_DEPTH = 2;

/**
 * Source precedence: an explicit override (file / paste / XSLT output) wins and is
 * remembered as the grid's source; with no override we re-render that remembered
 * source, and only fall back to the globally-opened document if there isn't one.
 * The global 📂 Open clears gridSourceXml, so a newly opened file takes over.
 */
async function loadGrid(xmlOverride) {
  const xml = (xmlOverride || gridSourceXml || currentXml || '').trim();
  if (!xml) {
    document.getElementById('grid-view').innerHTML = '<div class="grid-empty">No XML loaded. Use 📂 Open, or 📥 From XSLT Output.</div>';
    setStatus('❌ Empty input');
    return;
  }

  gridSourceXml = xml;
  const seq = ++gridRenderSeq;

  if (gridMode === 'paths') return renderPaths(seq);

  try {
    const response = await fetch('/api/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml })
    });
    const result = await response.json();
    if (seq !== gridRenderSeq) return; // superseded by a newer render

    if (result.error) {
      document.getElementById('grid-view').innerHTML = `<div class="grid-empty">Error: ${escapeHtml(result.error)}</div>`;
      setStatus('❌ Parse failed');
      return;
    }

    gridData = result.tree;
    document.getElementById('grid-view').innerHTML =
      `<div class="grid-root"><div class="grid-root-tag">&lt;${escapeHtml(gridData.tag)}&gt;</div>${buildGridHtml(gridData, 0)}</div>`;
    addGridListeners();
    setStatus('✓ Grid loaded');
  } catch (err) {
    setStatus('❌ Error');
  }
}

// Grid gets its own file picker so you can inspect a document without
// pushing it into every other tab via the global 📂 Open.
function loadGridXmlFile() {
  document.getElementById('grid-xml-file').click();
}

document.getElementById('grid-xml-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  setStatus(`Loaded: ${file.name}`);
  loadGrid(text);
  e.target.value = ''; // let the same file be re-picked
});

function toggleGridPaste() {
  const wrap = document.getElementById('grid-paste-wrap');
  const showing = wrap.style.display !== 'none';
  wrap.style.display = showing ? 'none' : 'block';
  if (!showing) document.getElementById('grid-paste').focus();
}

function renderPastedXml() {
  const text = document.getElementById('grid-paste').value.trim();
  if (!text) {
    setStatus('❌ Nothing pasted');
    return;
  }
  loadGrid(text);
}

function clearGridPaste() {
  document.getElementById('grid-paste').value = '';
  document.getElementById('grid-paste').focus();
}

function gridFromXsltOutput() {
  const out = document.getElementById('xslt-output').value.trim();
  if (!out) {
    setStatus('❌ No XSLT output — run Transform first');
    return;
  }
  loadGrid(out);
}

function setGridMode(mode) {
  gridMode = mode;
  document.getElementById('grid-mode-grid').classList.toggle('active-mode', mode === 'grid');
  document.getElementById('grid-mode-paths').classList.toggle('active-mode', mode === 'paths');
  loadGrid(gridSourceXml);
}

async function renderPaths(seq) {
  try {
    const response = await fetch('/api/flatten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml: gridSourceXml })
    });
    const result = await response.json();
    if (seq !== undefined && seq !== gridRenderSeq) return; // superseded

    if (result.error) {
      document.getElementById('grid-view').innerHTML = `<div class="grid-empty">Error: ${escapeHtml(result.error)}</div>`;
      setStatus('❌ Parse failed');
      return;
    }

    document.getElementById('grid-view').innerHTML =
      `<div class="grid-paths">${result.rows.map(r =>
        `<div class="grid-path-row"><span class="grid-path">${escapeHtml(r.path)}</span><span class="grid-path-val">${escapeHtml(r.value)}</span></div>`
      ).join('')}</div>`;
    setStatus(`✓ ${result.rows.length} paths`);
  } catch (err) {
    setStatus('❌ Error');
  }
}

// Group a node's children by tag, preserving first-appearance order.
function groupChildren(children) {
  const groups = [];
  const index = {};
  for (const child of children) {
    if (index[child.tag] === undefined) {
      index[child.tag] = groups.length;
      groups.push({ tag: child.tag, items: [] });
    }
    groups[index[child.tag]].items.push(child);
  }
  return groups;
}

const isLeaf = node => !node.children || node.children.length === 0;
const nodeText = node => (node.text != null ? String(node.text).trim() : '');

function buildGridHtml(node, depth) {
  const out = [];

  const attrs = Object.entries(node.attributes || {});
  if (attrs.length) {
    out.push(`<div class="grid-attrs">${attrs.map(([k, v]) =>
      `<span class="grid-attr"><span class="grid-attr-key">@${escapeHtml(k)}</span>${escapeHtml(String(v))}</span>`
    ).join('')}</div>`);
  }

  const text = nodeText(node);
  if (text && (node.children || []).length) {
    out.push(`<div class="grid-row"><span class="grid-name">(text)</span><span class="grid-val">${escapeHtml(text)}</span></div>`);
  }

  for (const group of groupChildren(node.children || [])) {
    out.push(group.items.length >= 2
      ? buildRepeatTable(group, depth)
      : buildSingleRow(group.items[0], depth));
  }

  return out.join('');
}

function buildSingleRow(child, depth) {
  if (isLeaf(child)) {
    return `<div class="grid-row"><span class="grid-name">${escapeHtml(child.tag)}</span><span class="grid-val">${escapeHtml(nodeText(child))}</span></div>`;
  }

  const open = depth + 1 < GRID_OPEN_DEPTH;
  return `<div class="grid-block">
    <div class="grid-block-head"><span class="grid-toggle">${open ? '▼' : '▶'}</span><span class="grid-name">${escapeHtml(child.tag)}</span></div>
    <div class="grid-block-body" style="display: ${open ? 'block' : 'none'}">${buildGridHtml(child, depth + 1)}</div>
  </div>`;
}

/**
 * The XMLSpy move: repeating siblings become one table.
 * Columns are the union of the repeats' attributes and child element names,
 * in first-seen order; each repetition is a row.
 */
function buildRepeatTable(group, depth) {
  const columns = [];
  const seen = new Set();
  for (const item of group.items) {
    for (const name of Object.keys(item.attributes || {})) {
      const col = `@${name}`;
      if (!seen.has(col)) { seen.add(col); columns.push(col); }
    }
    for (const child of item.children || []) {
      if (!seen.has(child.tag)) { seen.add(child.tag); columns.push(child.tag); }
    }
  }

  // All repeats are simple text leaves — one value column is enough.
  const valueOnly = columns.length === 0;
  const cols = valueOnly ? ['value'] : columns;

  const header = `<tr><th class="grid-idx">#</th>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;

  const body = group.items.map((item, i) => {
    const cells = cols.map(col => {
      if (valueOnly) return `<td>${escapeHtml(nodeText(item))}</td>`;
      if (col.startsWith('@')) {
        const v = (item.attributes || {})[col.slice(1)];
        return `<td>${v == null ? '' : escapeHtml(String(v))}</td>`;
      }
      const matches = (item.children || []).filter(c => c.tag === col);
      if (matches.length === 0) return '<td class="grid-empty-cell"></td>';
      if (matches.length === 1 && isLeaf(matches[0])) {
        return `<td>${escapeHtml(nodeText(matches[0]))}</td>`;
      }
      // Complex or repeated grandchild: expandable nested grid inside the cell.
      const label = matches.length > 1 ? `${matches.length} items` : 'expand';
      const inner = matches.length > 1
        ? buildRepeatTable({ tag: col, items: matches }, depth + 1)
        : buildGridHtml(matches[0], depth + 1);
      return `<td><div class="grid-block">
        <div class="grid-block-head"><span class="grid-toggle">▶</span><span class="grid-nested-label">${label}</span></div>
        <div class="grid-block-body" style="display: none">${inner}</div>
      </div></td>`;
    }).join('');
    return `<tr><td class="grid-idx">${i + 1}</td>${cells}</tr>`;
  }).join('');

  return `<div class="grid-table-wrap">
    <div class="grid-table-title">${escapeHtml(group.tag)} <span class="grid-count">· ${group.items.length} rows</span></div>
    <table class="grid-table"><thead>${header}</thead><tbody>${body}</tbody></table>
  </div>`;
}

function addGridListeners() {
  document.querySelectorAll('#grid-view .grid-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const body = toggle.closest('.grid-block').querySelector('.grid-block-body');
      if (!body) return;
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      toggle.textContent = hidden ? '▼' : '▶';
    });
  });
}

function expandGrid() {
  document.querySelectorAll('#grid-view .grid-block-body').forEach(el => el.style.display = 'block');
  document.querySelectorAll('#grid-view .grid-toggle').forEach(el => el.textContent = '▼');
}

function collapseGrid() {
  document.querySelectorAll('#grid-view .grid-block-body').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#grid-view .grid-toggle').forEach(el => el.textContent = '▶');
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
