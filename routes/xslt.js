/**
 * XSLT transform route
 */

const express = require('express');
const router = express.Router();
const tools = require('../tools/xml-tools');

router.post('/', async (req, res) => {
  const { xml, xsl } = req.body;

  if (!xml || !xsl) {
    return res.json({ error: 'Missing XML or XSL' });
  }

  const result = await tools.transformXslt(xml, xsl);
  return res.json(result);
});

module.exports = router;
