import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('RSVP reuses mounted disclosure without replacing concurrency/idempotency handling',()=>{
 const page=read('../src/app/invitation/[id]/page.tsx');
 assert.match(page,/<GuestDisclosure id=\{`response-/);assert.match(page,/openResponse\(item.id\)/);
 assert.match(page,/retry\?\.payload===payload\?retry.key:crypto.randomUUID\(\)/);
 assert.match(page,/if\(submitting.current\)return/);assert.match(page,/event.response_version,event.status,event.total_people,event.note/);
});
test('CTA opens native disclosure before focus, without delayed motion',()=>{
 const source=read('../src/features/invitation/open-response.ts');
 assert.ok(source.indexOf('disclosure.open=true')<source.indexOf('target?.focus'));
 assert.match(source,/preventScroll:true/);assert.match(source,/behavior:'instant'/);
});
test('wish duplicate submit is guarded synchronously and busy clears on completion',()=>{
 const source=read('../src/features/invitation/wish-book.tsx');
 assert.match(source,/if\(submitting.current\)return;submitting.current=true/);
 assert.match(source,/finally\{submitting.current=false;setBusy\(false\)/);
});