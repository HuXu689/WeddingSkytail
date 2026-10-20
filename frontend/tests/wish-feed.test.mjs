import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('shared cursor feed guards scope, stale responses and duplicate requests',()=>{
 const source=read('../src/features/invitation/wish-feed.tsx');
 assert.match(source,/key=\{path\}/);assert.match(source,/request!==sequence.current/);
 assert.match(source,/if\(loading.current\)return/);assert.match(source,/new Map/);
 assert.match(source,/encodeURIComponent\(after\)/);assert.match(source,/load\(retryCursor.current\)/);
 assert.match(source,/role="alert"/);assert.match(source,/aria-busy=\{busy\}/);
});
test('public and guest use scoped feeds rather than capped legacy payloads',()=>{
 const book=read('../src/features/invitation/wish-book.tsx');
 const publicView=read('../src/features/invitation/approved-wishes.tsx');
 assert.match(book,/kind:'guest',invitationId:id/);assert.match(publicView,/kind:'public',slug/);
 assert.doesNotMatch(book,/approved.slice/);assert.doesNotMatch(publicView,/wishes.slice/);
 const backend=read('../../backend/src/main/java/vn/wedding/invitation/invitations/GuestService.java');
 assert.doesNotMatch(backend,/wishes.approved/);
});
test('admin pagination resets with filters and SQL uses a deterministic tie breaker',()=>{
 const page=read('../src/app/admin/wishes/page.tsx');
 assert.match(page,/page=\$\{page\}/);assert.match(page,/setPage\(0\)/);
 assert.match(page,/state.data.total/);
 const service=read('../../backend/src/main/java/vn/wedding/invitation/wishes/WishService.java');
 assert.match(service,/w.created_at DESC,w.id DESC LIMIT 50/);
 assert.match(service,/answer.put\("total"/);
});