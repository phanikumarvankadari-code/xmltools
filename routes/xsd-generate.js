/**
 * XSD generation from sample XML
 */

const express = require('express');
const { parseStringPromise } = require('xml2js');
const router = express.Router();

router.post('/', async (req, res) => {
  const { xml } = req.body;

  if (!xml || !xml.trim()) {
    return res.json({ error: 'Empty XML' });
  }

  try {
    const parser = new xml2js.Parser({ attrkey: '@' });
    const parsed = await parser.parseStringPromise(xml);

    const schema = analyzeElement(parsed);
    const xsd = emitXSD(schema);

    return res.json({ xsd });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

function analyzeElement(obj, tag = 'root') {
  const keys = Object.keys(obj);
  if (keys.length === 0) return null;

  const firstKey = keys[0];
  const content = obj[firstKey];

  const schema = {
    tag: firstKey,
    attributes: {},
    children: {},
    maxOccurs: 1,
    type: 'string'
  };

  if (Array.isArray(content)) {
    schema.maxOccurs = content.length > 1 ? 'unbounded' : 1;
    if (content.length > 0 && typeof content[0] === 'object') {
      const childSchema = analyzeElement(content[0], firstKey);
      if (childSchema) {
        schema.children[firstKey] = childSchema;
      }
    }
  } else if (typeof content === 'object') {
    for (const [key, value] of Object.entries(content)) {
      if (key === '@') {
        schema.attributes = value || {};
      } else {
        const childSchema = analyzeElement({ [key]: value });
        if (childSchema) {
          schema.children[key] = childSchema;
        }
      }
    }
  }

  return schema;
}

function emitXSD(schema) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">');
  emitElement(schema, 1, lines);
  lines.push('</xs:schema>');
  return lines.join('\n');
}

function emitElement(schema, indent, lines) {
  const ind = '  '.repeat(indent);
  const maxAttr = schema.maxOccurs > 1 ? ' maxOccurs="unbounded"' : '';

  if (Object.keys(schema.children).length === 0) {
    lines.push(`${ind}<xs:element name="${schema.tag}" type="xs:string"${maxAttr}/>`);
  } else {
    lines.push(`${ind}<xs:element name="${schema.tag}"${maxAttr}>`);
    lines.push(`${ind}  <xs:complexType>`);
    lines.push(`${ind}    <xs:sequence>`);

    for (const [childTag, childSchema] of Object.entries(schema.children)) {
      emitElement(childSchema, indent + 3, lines);
    }

    lines.push(`${ind}    </xs:sequence>`);

    for (const [attrName] of Object.entries(schema.attributes)) {
      lines.push(`${ind}    <xs:attribute name="${attrName}" type="xs:string"/>`);
    }

    lines.push(`${ind}  </xs:complexType>`);
    lines.push(`${ind}</xs:element>`);
  }
}

const xml2js = require('xml2js');

module.exports = router;
