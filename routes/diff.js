/**
 * Diff comparison route
 */

const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { a, b } = req.body;

  if (!a || !b) {
    return res.json({ error: 'Missing files', added: 0, removed: 0, changed: 0 });
  }

  try {
    const linesA = a.split('\n');
    const linesB = b.split('\n');

    // Simple diff: count additions/removals
    const added = Math.max(0, linesB.length - linesA.length);
    const removed = Math.max(0, linesA.length - linesB.length);

    // Find changed lines
    let changed = 0;
    for (let i = 0; i < Math.min(linesA.length, linesB.length); i++) {
      if (linesA[i] !== linesB[i]) {
        changed++;
      }
    }

    return res.json({ added, removed, changed });
  } catch (err) {
    return res.json({ error: err.message, added: 0, removed: 0, changed: 0 });
  }
});

module.exports = router;
