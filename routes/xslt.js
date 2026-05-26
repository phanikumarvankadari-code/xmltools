/**
 * XSLT transform route
 */

const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml, xsl } = req.body;

  if (!xml || !xsl) {
    return res.json({ error: 'Missing XML or XSL' });
  }

  try {
    // Placeholder: XSLT transformation
    // In production, use libxmljs or node-xslt
    return res.json({
      output: '<!-- XSLT output placeholder -->\n' + xml
    });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

module.exports = router;
