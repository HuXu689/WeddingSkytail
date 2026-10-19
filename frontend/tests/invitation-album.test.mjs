import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageIndex,secondaryImages} from '../src/features/invitation/album-window.ts';

test('ALBUM-001: index wraps in both directions and handles an empty album',()=>{
 assert.equal(imageIndex(-1,6),5);assert.equal(imageIndex(6,6),0);
 assert.equal(imageIndex(15,6),3);assert.equal(imageIndex(12,0),0);
});
test('ALBUM-001: secondary photographs never repeat the main image or each other',()=>{
 for(let length=0;length<=30;length++)for(let active=0;active<Math.max(1,length);active++){
  const secondary=secondaryImages(active,length);
  assert.equal(secondary.length,Math.min(4,Math.max(0,length-1)));
  assert.equal(new Set(secondary).size,secondary.length);
  assert.equal(secondary.includes(active),false);
  assert.ok(secondary.every(index=>index>=0&&index<length));
 }
 assert.deepEqual(secondaryImages(4,5),[0,1,2,3]);
});
const album=readFileSync(new URL('../src/features/invitation/album.tsx',import.meta.url),'utf8');
const canvas=readFileSync(new URL('../src/features/invitation/design.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');
test('ALBUM-001: native modal handles focus containment and all close paths restore opener',()=>{
 assert.match(album,/<dialog ref=\{dialog\}/);
 assert.match(album,/node.showModal\(\);closeButton.current\?\.focus\(\)/);
 assert.match(album,/onCancel=\{event=>\{event.preventDefault\(\);onClose\(\);\}\}/);
 assert.match(album,/return\(\)=>\{node.close\(\);ownerDocument.body.style.overflow=overflow;if\(opener\?\.isConnected\)opener.focus\(\)/);
 assert.match(album,/event.target===event.currentTarget/);
 assert.match(album,/createPortal\(/);assert.match(album,/,ownerDocument.body\)/);
 assert.doesNotMatch(canvas,/previousFocus|setLightbox|lightbox-nav/);
});
test('ALBUM-001: localized live index, keyboard navigation, lazy thumbnails and no autoplay',()=>{
 assert.match(album,/event.key==='ArrowLeft'\|\|event.key==='ArrowRight'/);
 assert.match(album,/figcaption role="status" aria-live="polite"/);
 assert.match(album,/loading="lazy" decoding="async"/);
 assert.match(canvas,/<WeddingAlbum urls=\{design.albumUrls\?\?\[\]\}/);
 assert.doesNotMatch(album,/setInterval|setTimeout|autoPlay|album-dots/);
});
test('ALBUM-001: narrow container retains every secondary photo and large main image',()=>{
 const styles=css.slice(css.indexOf('/* ALBUM-001:'));
 assert.match(styles,/@container \(max-width:760px\)/);
 assert.match(styles,/grid-template-rows:minmax\(280px,80cqw\);grid-auto-rows:160px/);
 assert.match(styles,/\.album-gallery \.album-side\{display:block/);
 assert.match(styles,/dialog.album-lightbox:not\(\[open\]\)\{display:none\}/);
 assert.match(styles,/\.lightbox-close\{min-width:44px;min-height:44px\}/);
});