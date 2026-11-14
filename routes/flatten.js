/**
 * Flatten route - XML to path/value rows
 */

const express = require('express');
const router = express.Router();
const tools = require('../tools/xml-tools');

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ rows: [] });
  }

  const result = await tools.flattenXml(xml);
  return res.json(result);
});

module.exports = router;
