/**
 * Tree route - Build XML tree structure
 */

const express = require('express');
const router = express.Router();
const tools = require('../tools/xml-tools');

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ tree: null });
  }

  const result = await tools.buildTree(xml);
  return res.json(result);
});

module.exports = router;
