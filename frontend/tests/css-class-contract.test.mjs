import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/** Guards the regression found in review: components rendered with classes that no stylesheet defines. */
const sourceRoot = path.resolve('src');
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else files.push(full);
  }
}
collect(sourceRoot);

const stylesheets = files.filter(file => file.endsWith('.css')).map(file => fs.readFileSync(file,'utf8')).join('\n');
const components = files.filter(file => file.endsWith('.tsx'));

/** Class names written as literal attributes. */
function literalClasses(source) {
  return [...source.matchAll(/className="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/));
}
/** Static parts of template-literal class names; "${...}" segments are replaced with a space. */
function templateClasses(source) {
  return [...source.matchAll(/className=\{`([^`]*)`\}/g)]
    .flatMap(match => match[1].replace(/\$\{[^}]*\}/g,' ').split(/\s+/));
}
/** A token that is only the prefix of a dynamic name (e.g. "badge-") is not a class on its own. */
function isCompleteClass(token) {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(token) && !token.endsWith('-');
}

const used = new Set();
for (const file of components) {
  const source = fs.readFileSync(file,'utf8');
  for (const token of [...literalClasses(source), ...templateClasses(source)]) {
    if (isCompleteClass(token)) used.add(token);
  }
}

test('mọi lớp CSS dùng trong component đều có định nghĩa trong stylesheet', () => {
  const missing = [...used].filter(name => !new RegExp(`\\.${name}(?![A-Za-z0-9_-])`).test(stylesheets)).sort();
  assert.deepEqual(missing, [], `Thiếu định nghĩa CSS cho: ${missing.join(', ')}`);
});

test('trình chỉnh sửa thiết kế và thư viện ảnh có định nghĩa hiển thị', () => {
  // Danh sách bám theo lỗi đã phát hiện: các thành phần này từng render không có style nào.
  for (const required of ['design-editor','design-controls','design-preview','preview-toolbar','preview-stage','theme-option','color-option','color-dot','editor-savebar','media-upload','media-flags','history-item']) {
    assert.ok(new RegExp(`\\.${required}(?![A-Za-z0-9_-])`).test(stylesheets), `Thiếu định nghĩa CSS cho .${required}`);
  }
});

test('badge trạng thái chính có biến thể màu riêng, không dùng chung một màu', () => {
  for (const variant of ['badge-published','badge-active','badge-ready','badge-manual_open','badge-archived','badge-preview']) {
    assert.ok(new RegExp(`\\.${variant}(?![A-Za-z0-9_-])`).test(stylesheets), `Thiếu biến thể màu .${variant}`);
  }
});