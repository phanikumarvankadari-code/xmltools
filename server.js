#!/usr/bin/env node
/**
 * XMLTools Express Server
 * Comprehensive XML toolkit web application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/lint', require('./routes/lint'));
app.use('/api/format', require('./routes/format'));
app.use('/api/tree', require('./routes/tree'));
app.use('/api/xpath', require('./routes/xpath'));
app.use('/api/schema', require('./routes/schema'));
app.use('/api/xslt', require('./routes/xslt'));
app.use('/api/xml-json', require('./routes/xml-json'));
app.use('/api/diff', require('./routes/diff'));
app.use('/api/xsd-generate', require('./routes/xsd-generate'));

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 XMLTools running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
});
