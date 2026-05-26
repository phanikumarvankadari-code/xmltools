/**
 * Lint route - XML well-formedness validation
 */

const express = require('express');
const { parseStringPromise } = require('xml2js');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ valid: false, errors: [{ message: 'Empty input' }] });
  }

  try {
    await parseStringPromise(xml);
    return res.json({ valid: true, errors: [] });
  } catch (err) {
    // Parse error - extract line and column
    const match = err.message.match(/line (\d+), col (\d+)/);
    const [line, col] = match
      ? [parseInt(match[1]), parseInt(match[2])]
      : ['?', '?'];

    return res.json({
      valid: false,
      errors: [{
        line,
        col,
        message: err.message
      }]
    });
  }
});

module.exports = router;
