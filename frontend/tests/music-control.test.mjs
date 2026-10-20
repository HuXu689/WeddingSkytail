import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('music is mounted only for an open invitation with an enabled track',()=>{
 const canvas=read('../src/features/invitation/design.tsx');
 assert.match(canvas,/opened&&design.musicUrl&&normalizedLayout\(design.layout\).some\(item=>item.section==='MUSIC'&&item.enabled\)/);
 assert.match(canvas,/autoplay=\{design.music_autoplay\?\?false\}/);
 assert.match(canvas,/MUSIC:null/);
});
test('music stays fixed outside canvas containment and previews stay inside the canvas',()=>{
 const source=read('../src/features/invitation/music-control.tsx'),css=read('../src/features/invitation/design.css');
 assert.match(source,/createPortal\(control,host\)/);
 assert.match(source,/ownerDocument.body/);
 assert.match(css,/\.invitation-music\{position:fixed;[^}]*safe-area-inset-bottom/);
 assert.match(css,/\.invitation-music.is-preview\{position:absolute\}/);
 assert.match(source,/aria-label=\{label\}[^>]*aria-pressed=\{playing\}/);
 assert.match(source,/if\(autoplay&&!preview\)/);
 assert.match(source,/\[src,autoplay,preview,host\]/);
 assert.match(source,/cancelAutoplay.current\?\.\(\)/);
 assert.match(source,/waiting&&<button type="button" className="invitation-music-prompt" onClick=\{toggleMusic\}/);
});
test('autoplay setting is saved and published independently for private and public payloads',()=>{
 const backend='../..'+'/backend/src/main/';
 const controller=read(backend+'java/vn/wedding/invitation/wedding/DesignController.java');
 assert.match(controller,/Boolean musicAutoplay/);
 assert.match(controller,/draft_music_autoplay=\?/);
 assert.match(controller,/Boolean.TRUE.equals\(input.musicAutoplay\(\)\)/);
 assert.match(read(backend+'java/vn/wedding/invitation/admin/AdminService.java'),/music_autoplay=draft_music_autoplay/);
 assert.equal((read(backend+'java/vn/wedding/invitation/invitations/GuestService.java').match(/show_countdown,music_autoplay FROM wedding/g)||[]).length,2);
 assert.equal((read(backend+'resources/db/migration/V21__music_autoplay.sql').match(/NOT NULL DEFAULT false/g)||[]).length,2);
 const editor=read('../src/features/admin/design-editor.tsx');
 assert.match(editor,/musicAutoplay:design.music_autoplay\?\?false/);
 assert.match(editor,/Tự động phát nhạc khi mở thiệp/);
});