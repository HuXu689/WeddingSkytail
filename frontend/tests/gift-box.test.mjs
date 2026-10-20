import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('../src/features/invitation/gift-box.tsx');
test('gift scope paths encode identifiers and never use admin/public media images',()=>{
 assert.match(source,/encodeURIComponent\(scope.slug\)/);assert.match(source,/encodeURIComponent\(scope.invitationId\)/);
 assert.match(source,/key=\{path\}/);assert.doesNotMatch(source,/\/admin\/|\/media\/|localStorage/);
 assert.match(source,/opened&&<GiftDialog/);assert.match(source,/api<GiftView>\(path\)/);
});
test('native gift dialog has portal, labelled title, Escape/backdrop, focus restoration and cleanup',()=>{
 for(const contract of [/showModal\(\)/,/createPortal\(/,/aria-labelledby=\{title\}/,/aria-describedby=\{description\}/,/onCancel=/,/opener.focus\(\{preventScroll:true\}\)/,/body.style.overflow=overflow/])assert.match(source,contract);
 assert.match(source,/active=false/);assert.match(source,/alive.current=false/);
});
test('QR remains uncropped PNG with gated download, error and original-image fallback',()=>{
 assert.match(source,/cache:'no-store'/);assert.match(source,/credentials:'include'/);assert.match(source,/startsWith\('image\/png'\)/);
 assert.match(source,/URL.revokeObjectURL/);assert.match(source,/Mở ảnh gốc/);assert.match(source,/onError=/);
 const css=read('../src/features/invitation/design.css');assert.match(css,/\.gift-qr\{[^}]*object-fit:contain/);assert.match(css,/\.gift-qr\{[^}]*border-radius:0/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.gift-symbol/);
});
test('active recipient is a no-op and metadata retry clears stale image state',()=>{
 assert.match(source,/if\(index===selected\)return/);
 assert.match(source,/setView\(null\);setError\(''\);setImageReady\(false\);setImageError\(false\);setDownloadError\(''\)/);
 assert.match(source,/node.style.setProperty/);
 assert.doesNotMatch(source,/const accent=opener\?getComputedStyle/);
});