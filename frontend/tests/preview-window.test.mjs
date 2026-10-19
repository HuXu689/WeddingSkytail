import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const editor=readFileSync(new URL('../src/features/admin/design-editor.tsx',import.meta.url),'utf8');
const popup=readFileSync(new URL('../src/features/admin/preview.tsx',import.meta.url),'utf8');
test('EDITOR-002: popup is opened in the button handler, never in a deferred effect',()=>{
 assert.match(editor,/const popup=window.open\(/);
 assert.match(editor,/<PreviewWindow popup=\{separate\}/);
 assert.doesNotMatch(popup,/window.open\(/);
 assert.match(editor,/if\(!popup\)\{setPreviewError/);
});
test('EDITOR-002: external close and StrictMode cleanup do not leave stale preview state',()=>{
 assert.match(popup,/if\(popup.closed\)onClose\(\)/);
 assert.match(popup,/window.clearInterval\(closed\)/);
 assert.match(popup,/clearTimeout\(closing.current\)/);
 assert.match(popup,/host.remove\(\)/);
 assert.doesNotMatch(popup,/localStorage|sessionStorage|dangerouslySetInnerHTML|\/guest\//);
});