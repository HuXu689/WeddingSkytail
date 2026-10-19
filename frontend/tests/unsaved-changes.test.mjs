import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/admin/use-unsaved-changes.ts',import.meta.url),'utf8');
test('unsaved guard cancels supported traversals without corrupting Next history',()=>{
 assert.match(source,/navigationType!=='traverse'\|\|!event.cancelable/);
 assert.match(source,/if\(!confirm\(\)\)event.preventDefault\(\)/);
 assert.doesNotMatch(source,/pushState|replaceState|history.go|popstate/);
 assert.match(source,/event.returnValue=''/);
});
test('all draft editors share the guard and modified/new-tab clicks are preserved',()=>{
 for(const file of ['design-editor','layout-editor','section-editor']){
  const editor=readFileSync(new URL(`../src/features/admin/${file}.tsx`,import.meta.url),'utf8');
  assert.match(editor,/useUnsavedChanges\(dirty,/);
  assert.doesNotMatch(editor,/addEventListener\('beforeunload'/);
 }
 assert.match(source,/event.ctrlKey\|\|event.metaKey\|\|event.shiftKey\|\|event.altKey/);
 assert.match(source,/anchor.download\|\|anchor.target==='_blank'/);
 assert.match(source,/removeEventListener\('navigate',traverse\)/);
});