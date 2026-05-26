/**
 * XML ↔ JSON conversion route
 */

const express = require('express');
const xml2js = require('xml2js');
const router = express.Router();

// XML to JSON
router.post('/to-json', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ error: 'Empty XML' });
  }

  try {
    const parser = new xml2js.Parser({
      attrkey: '@',
      charkey: '#text',
      mergeAttrs: false
    });
    const json = await parser.parseStringPromise(xml);
    return res.json({ json });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

// JSON to XML
router.post('/to-xml', async (req, res) => {
  const { json } = req.body;

  if (!json || !json.trim()) {
    return res.json({ error: 'Empty JSON' });
  }

  try {
    const data = JSON.parse(json);
    const builder = new xml2js.Builder({
      attrkey: '@',
      charkey: '#text'
    });
    const xml = builder.buildObject(data);
    return res.json({ xml });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

module.exports = router;
