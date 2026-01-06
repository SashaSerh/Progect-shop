#!/usr/bin/env node
// Скрипт форматирования CSS: один селектор в строке, свойства на отдельных строках
// Использует PostCSS для парсинга и собственный генератор форматированного CSS

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const safeParser = require('postcss-safe-parser');

const filePath = path.resolve(__dirname, '../css/main.css');
const css = fs.readFileSync(filePath, 'utf8');

function formatSelectors(selector) {
  // Разбиваем селекторы по запятой и ставим каждый на новую строку
  const parts = selector.split(',').map(s => s.trim());
  return parts.join(',\n');
}

function fmtRule(rule) {
  const sel = formatSelectors(rule.selector);
  let out = `${sel} {\n`;
  rule.nodes.forEach(node => {
    if (node.type === 'decl') {
      out += `    ${node.prop}: ${node.value};\n`;
    } else if (node.type === 'comment') {
      out += `    /* ${node.text.trim()} */\n`;
    } else if (node.type === 'atrule') {
      out += `${fmtAtRule(node)}\n`;
    }
  });
  out += `}\n\n`;
  return out;
}

function fmtAtRule(at) {
  let out = `@${at.name} ${at.params} {\n`;
  if (at.nodes && at.nodes.length) {
    at.nodes.forEach(child => {
      if (child.type === 'rule') {
        out += fmtRule(child);
      } else if (child.type === 'decl') {
        out += `    ${child.prop}: ${child.value};\n`;
      }
    });
  }
  out += `}\n`;
  return out;
}

postcss()
  .process(css, { parser: safeParser })
  .then(result => {
    const root = result.root;
    let out = '';

    root.nodes.forEach(node => {
      if (node.type === 'rule') {
        out += fmtRule(node);
      } else if (node.type === 'atrule') {
        out += fmtAtRule(node) + '\n';
      } else if (node.type === 'comment') {
        out += `/* ${node.text.trim()} */\n\n`;
      }
    });

    // Убираем лишние пустые строки больше одной
    out = out.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(filePath, out, 'utf8');
    console.log('Файл css/main.css отформатирован.');
  })
  .catch(err => {
    console.error('Ошибка при парсинге CSS:', err);
    process.exit(1);
  });
