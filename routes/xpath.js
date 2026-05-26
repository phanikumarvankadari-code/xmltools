/**
 * XPath route - Query XML with XPath expressions
 */

const express = require('express');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml, xpath: xpathExpr } = req.body;

  if (!xml || !xpathExpr) {
    return res.json({ error: 'Missing input', results: [] });
  }

  try {
    const doc = new DOMParser().parseFromString(xml);
    const results = xpath.select(xpathExpr, doc);

    const resultStrings = results.map(node => {
      if (node.nodeType === 3) { // TEXT_NODE
        return node.nodeValue;
      } else if (node.nodeType === 1) { // ELEMENT_NODE
        return node.toString();
      } else if (node.nodeType === 2) { // ATTRIBUTE_NODE
        return node.value;
      }
      return String(node);
    });

    return res.json({ results: resultStrings });
  } catch (err) {
    return res.json({ error: err.message, results: [] });
  }
});

module.exports = router;
