/**
 * XPath route - Query XML with XPath expressions
 */

const express = require('express');
const libxmljs = require('libxmljs');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml, xpath } = req.body;

  if (!xml || !xpath) {
    return res.json({ error: 'Missing input', results: [] });
  }

  try {
    const doc = libxmljs.parseXml(xml);
    const results = doc.find(xpath);

    const resultStrings = results.map(node => {
      if (node.type() === 'text') {
        return node.text();
      } else if (node.type() === 'element') {
        return node.toString();
      } else if (node.type() === 'attribute') {
        return node.value();
      }
      return node.toString();
    });

    return res.json({ results: resultStrings });
  } catch (err) {
    return res.json({ error: err.message, results: [] });
  }
});

module.exports = router;
