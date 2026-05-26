/**
 * Tree route - Build XML tree structure
 */

const express = require('express');
const { parseStringPromise } = require('xml2js');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ tree: null });
  }

  try {
    const parser = new xml2js.Parser({ attrkey: '@' });
    const parsed = await parser.parseStringPromise(xml);
    const tree = buildTree(parsed);

    return res.json({ tree });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

function buildTree(obj, tag = 'root') {
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;

  const firstKey = keys[0];
  const content = obj[firstKey];

  if (Array.isArray(content)) {
    return {
      tag: firstKey,
      attributes: {},
      children: content.map((item, idx) => {
        if (typeof item === 'object') {
          return buildTree(item, firstKey);
        }
        return { tag: firstKey, text: item, attributes: {}, children: [] };
      })
    };
  } else if (typeof content === 'object') {
    const attrs = {};
    const children = [];

    for (const [key, value] of Object.entries(content)) {
      if (key === '@') {
        Object.assign(attrs, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object') {
            children.push(buildTree({ [key]: item }));
          } else {
            children.push({ tag: key, text: item, attributes: {}, children: [] });
          }
        });
      } else if (typeof value === 'object') {
        children.push(buildTree({ [key]: value }));
      } else {
        children.push({ tag: key, text: value, attributes: {}, children: [] });
      }
    }

    return { tag: firstKey, attributes: attrs, children };
  }

  return { tag: firstKey, text: content, attributes: {}, children: [] };
}

const xml2js = require('xml2js');

module.exports = router;
