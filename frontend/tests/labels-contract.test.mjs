import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const labelsSource = fs.readFileSync(path.resolve('src/shared/labels.ts'), 'utf8');
const required = [
  'DRAFT','PUBLISHED','CANCELLED','INHERIT','MANUAL_OPEN','MANUAL_CLOSED','SCHEDULED',
  'ATTENDING','DECLINED','READY','EXPIRED','REVOKED','CSV','PDF',
  'PREVIEW','COMMITTED','FAILED','ACTIVE','INACTIVE','ARCHIVED','SENT','NOT_SENT',
  'GUEST_IMPORT','RSVP_OWNER_UPDATE','EXPORT_CREATE','EXPORT_REVOKE','MEDIA_UPLOAD','MEDIA_DELETE'
];

function valueFor(key) {
  const match = labelsSource.match(new RegExp(`\\b${key}:\\s*'([^']+)'`));
  return match?.[1] ?? null;
}

test('mọi trạng thái nghiệp vụ bắt buộc đều có nhãn tiếng Việt', () => {
  for (const key of required) {
    const value = valueFor(key);
    assert.ok(value, `Thiếu nhãn cho mã ${key}`);
    assert.notEqual(value, key, `Nhãn của ${key} vẫn là mã kỹ thuật`);
    assert.match(value, /[À-ỹ]/u, `Nhãn của ${key} chưa có dấu tiếng Việt`);
  }
});

test('fallback nhãn không làm lộ mã kỹ thuật', () => {
  assert.match(labelsSource, /return labels\[value\] \|\| 'Trạng thái chưa xác định'/);
});