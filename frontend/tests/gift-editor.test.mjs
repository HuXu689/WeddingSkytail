import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('gift editor retains both recipients and requires saved, complete, owner-confirmed publication',()=>{
 const source=read('../src/features/admin/gift-editor.tsx');
 assert.match(source,/\.\.\.values,expectedRevision:revision/);
 assert.match(source,/expectedPublishedRevision:published.revision/);
 assert.match(source,/saved.enabled&&confirmed/);
 assert.match(source,/busy\|\|dirty\|\|!changed\|\|conflict\|\|incomplete/);
 assert.match(source,/Cấu hình người nhận thứ hai được giữ lại/);
 assert.match(source,/setConfirmed\(false\)/);
});
test('gift upload keeps PNG, gated preview and error drafts; reload is explicit',()=>{
 const source=read('../src/features/admin/gift-editor.tsx');
 assert.match(source,/file.type!=='image\/png'/);assert.match(source,/5\*1024\*1024/);
 assert.match(source,/uploadFile<\{id:string\}>\('\/admin\/gifts\/assets'/);
 assert.match(source,/\/api\/v1\/admin\/gifts\/assets\/\$\{encodeURIComponent/);
 assert.doesNotMatch(source,/\/media\/|localStorage|console\.log/);
 assert.match(source,/status===409\)setConflict\(true\)/);
 assert.match(source,/<Confirm title="Tải lại cấu hình quà mừng\?"/);
 assert.match(source,/beforeunload/);assert.match(source,/if\(submitting.current\)return/);
});
test('gift menu is owner-only and route uses existing configuration endpoint',()=>{
 assert.match(read('../src/features/admin/shell.tsx'),/\['\/admin\/gifts','Quà mừng','◇','OWNER'\]/);
 assert.match(read('../src/app/admin/gifts/page.tsx'),/useAdmin<GiftConfiguration>\('\/admin\/gifts'\)/);
});