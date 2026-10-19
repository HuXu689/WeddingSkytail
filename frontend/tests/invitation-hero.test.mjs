import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');
const component=readFileSync(new URL('../src/features/invitation/design.tsx',import.meta.url),'utf8');
const hero=css.slice(css.indexOf('/* HERO-001:'),css.indexOf('/* ALBUM-001:')===-1?undefined:css.indexOf('/* ALBUM-001:'));
const rule=selector=>{
 const start=hero.indexOf(`${selector}{`);
 assert.notEqual(start,-1,`Missing ${selector}`);
 return hero.slice(start+selector.length+1,hero.indexOf('}',start));
};

test('HERO-001: split applies only to ELEGANT with a photo, leaving other covers intact',()=>{
 assert.match(component,/design.theme==='ELEGANT'&&design.heroUrl\?'hero-split':''/);
 assert.match(component,/design.heroUrl&&<div className="cover-photo">/);
 assert.doesNotMatch(hero,/\.theme-modern|\.theme-traditional/);
 assert.match(rule('.theme-elegant .wedding-cover.hero-split'),/grid-template-columns:minmax\(0,1.05fr\) minmax\(0,1fr\)/);
});
test('HERO-001: photograph occupies its own grid cell, not a background under text',()=>{
 const photo=rule('.theme-elegant .hero-split .cover-photo');
 assert.match(photo,/position:relative;inset:auto;z-index:auto/);
 assert.match(photo,/min-height:560px;aspect-ratio:4\/5/);
 assert.match(rule('.theme-elegant .hero-split .cover-content'),/color:var\(--inv-ink\);text-shadow:none/);
 assert.match(rule('.theme-elegant .hero-split .cover-photo::after,.theme-elegant .hero-split .cover-content::before'),/display:none/);
});
test('HERO-001: original focal point and high-priority hero loading are retained',()=>{
 assert.match(component,/const heroPosition=design.heroPosition\|\|'50% 50%'/);
 assert.match(component,/style=\{\{objectPosition:heroPosition\}\} fetchPriority="high"/);
 assert.match(rule('.theme-elegant .hero-split .cover-photo img'),/filter:none;animation:none;transform:none/);
 assert.match(css,/object-fit:cover/);
});
test('HERO-001: narrow containers stack image first and copy second, including desktop preview',()=>{
 const mobile=hero.slice(hero.indexOf('@container (max-width:760px)'));
 assert.match(mobile,/\.theme-elegant \.wedding-cover.hero-split\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(mobile,/\.cover-photo\{min-height:0;aspect-ratio:4\/3;max-height:560px\}/);
 assert.match(mobile,/\.cover-content\{padding:32px 24px 40px;text-align:center\}/);
 assert.ok(component.indexOf('className="cover-photo"')<component.indexOf('className="cover-content"'));
 assert.doesNotMatch(mobile,/order:|position:absolute/);
});
test('HERO-001: public wrapper and narrow route cannot restore legacy hero sizing',()=>{
 // The three-class selectors override the legacy two-class public wrapper rules.
 assert.match(rule('.theme-elegant .wedding-cover.hero-split'),/min-height:0/);
 assert.match(rule('.theme-elegant .hero-split .cover-content'),/min-width:0;max-width:none/);
 assert.match(rule('.theme-elegant .hero-split .couple-names'),/font-size:clamp\(36px,4.5cqw,68px\)/);
 assert.match(rule('.theme-elegant .hero-split .cover-content .eyebrow'),/color:var\(--wedding-accent\)/);
 assert.doesNotMatch(hero,/transition:|@keyframes|!important/);
});