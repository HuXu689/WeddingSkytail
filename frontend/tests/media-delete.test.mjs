import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('music deletion preserves live references and exposes API errors inside the modal',()=>{
 const music=read('../src/features/admin/music-library.tsx');
 assert.match(music,/row\.draft_music\|\|row\.published_music/);
 assert.match(music,/disabled=\{busy\|\|inUse\}/);
 assert.match(music,/error=\{error\}/);
 assert.match(music,/setPending\(null\)/);
 assert.match(music,/await api\(`\/admin\/media\/\$\{pending.id\}`,'DELETE'\)/);
 assert.doesNotMatch(music,/'PUT'|'POST'|publishWedding/);
 assert.match(read('../src/features/admin/ui.tsx'),/error&&<div className="error" role="alert">\{error\}<\/div>/);
 assert.match(read('../src/app/admin/media/page.tsx'),/<MusicLibrary music=\{music\} busy=\{state.busy\} run=\{run\}\/>/);
});