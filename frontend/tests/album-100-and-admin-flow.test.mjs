import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {albumPageCount,albumPageSlice,albumThumbUrl,lightboxFilmstrip} from '../src/features/invitation/album-window.ts';

const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');

test('ALBUM-100: thumbnail URLs, pagination and lightbox filmstrip support 100+ photos cleanly',()=>{
 assert.equal(albumThumbUrl('/media/123e4567-e89b-12d3-a456-426614174000.jpg'),'/media/123e4567-e89b-12d3-a456-426614174000-thumb.jpg');
 assert.equal(albumThumbUrl('/api/v1/admin/media/123e4567-e89b-12d3-a456-426614174000/content'),'/api/v1/admin/media/123e4567-e89b-12d3-a456-426614174000/thumb');
 assert.equal(albumThumbUrl('https://example.com/photo.jpg'),'https://example.com/photo.jpg');

 assert.equal(albumPageCount(100,16),7);
 assert.equal(albumPageCount(0,16),0);
 assert.deepEqual(albumPageSlice(100,0,16),[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
 assert.deepEqual(albumPageSlice(100,6,16),[96,97,98,99]);

 const stripStart=lightboxFilmstrip(0,100,9);
 assert.equal(stripStart.length,9);
 assert.deepEqual(stripStart,[0,1,2,3,4,5,6,7,8]);
 const stripMid=lightboxFilmstrip(50,100,9);
 assert.deepEqual(stripMid,[46,47,48,49,50,51,52,53,54]);
 const stripEnd=lightboxFilmstrip(99,100,9);
 assert.deepEqual(stripEnd,[91,92,93,94,95,96,97,98,99]);
});

test('INFRA-MEDIA: Dockerfile copies public stickers and next.config rewrites /media',()=>{
 const dockerfile=read('../Dockerfile');
 assert.match(dockerfile,/COPY --from=build --chown=node:node \/app\/public \.\/public/);
 const nextConfig=read('../next.config.ts');
 assert.match(nextConfig,/source:\s*'\/media\/:path\*'/);
});

test('ADMIN-FLOW: media page supports batch upload, preserves draft album and caps at 200',()=>{
 const media=read('../src/app/admin/media/page.tsx');
 assert.match(media,/MAX_ALBUM=200/);
 assert.match(media,/type="file" multiple/);
 assert.match(media,/serverAlbumIds/);
 assert.match(media,/media-album-sorter/);
});

test('ADMIN-FLOW: wedding page gates owner actions and section editor supports deleting sections',()=>{
 const wedding=read('../src/app/admin/wedding/page.tsx');
 assert.match(wedding,/\/auth\/me/);
 assert.match(wedding,/isOwner&&<button/);
 assert.match(wedding,/has_unpublished_changes/);
 const sections=read('../src/features/admin/section-editor.tsx');
 assert.match(sections,/function removeSection/);
 assert.match(sections,/Xóa mục/);
});
