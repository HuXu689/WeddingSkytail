import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('src/features/admin/quick-actions.tsx','utf8');
const invitations=readFileSync('src/app/admin/invitations/page.tsx','utf8');
test('dashboard offers actionable shortcuts and hides export until owner role is known',()=>{
 assert.match(source,/invitations\?create=1#add-guest/);
 assert.match(source,/invitations\?openFilter=NO_OPEN/);
 assert.match(source,/href="\/admin\/reminders"/);
 assert.match(source,/me\.data\?\.role==='OWNER'&&/);
 assert.match(readFileSync('src/app/admin/page.tsx','utf8'),/<QuickActions\/>/);
});
test('invitation shortcuts open the form and apply the supported open filter',()=>{
 assert.match(invitations,/params.get\('create'\)==='1'/);
 assert.match(invitations,/id="add-guest" open=\{addOpen\}/);
 assert.match(invitations,/params.get\('openFilter'\)==='NO_OPEN'/);
});
test('test cleanup defaults to preview and backs up before applying',()=>{
 const script=readFileSync('../scripts/cleanup-test-data.ps1','utf8');
 const sql=readFileSync('../scripts/cleanup-test-data.sql','utf8');
 assert.match(script,/param\(\[switch\]\$Apply\)/);
 assert.ok(script.indexOf('pg_dump')<script.indexOf('cleanup-test-data.sql'));
 assert.match(sql,/\\if :apply/);
 assert.match(sql,/ROLLBACK;/);
 assert.match(sql,/AND NOT EXISTS/);
 assert.doesNotMatch(sql,/TRUNCATE|DELETE FROM (wedding|admin_users|media_assets|audit)\b/);
});