import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observeInvitation} from '../src/features/invitation/motion.ts';

function fixture({reduced=false,fail=false}={}){
 const preference={matches:reduced,addEventListener(_,fn){this.listener=fn;},removeEventListener(_,fn){assert.equal(fn,this.listener);this.removed=true;}};
 const instances=[];
 class Observer {
  constructor(callback){if(fail)throw new Error('unsupported');this.callback=callback;this.items=[];this.removed=[];instances.push(this);}
  observe(item){this.items.push(item);}unobserve(item){this.removed.push(item);}disconnect(){this.disconnected=true;}
 }
 const root={ownerDocument:{activeElement:null},querySelectorAll:()=>items};
 const item=(kind='plain')=>{const classes=new Set();return {kind,classes,classList:{contains:name=>classes.has(name),add:name=>classes.add(name)},matches:()=>kind==='form',closest:()=>kind==='inside'?{}:null,querySelector:()=>kind==='parent'?{}:null,contains:element=>element===kind};};
 const items=['plain','form','inside','parent','focused'].map(item);
 const environment={matchMedia:()=>preference,IntersectionObserver:Observer};
 return {root,items,preference,instances,environment};
}
test('MOTION-001: form, form ancestors and form descendants are not observed',()=>{
 const f=fixture(),stop=observeInvitation(f.root,f.environment);
 assert.deepEqual(f.instances[0].items,[f.items[0],f.items[4]]);stop();
 assert.equal(f.instances[0].disconnected,true);assert.equal(f.preference.removed,true);
});
test('MOTION-001: reveal is one-shot and does not move the focused region',()=>{
 const f=fixture();f.root.ownerDocument.activeElement='focused';
 const stop=observeInvitation(f.root,f.environment),observer=f.instances[0];
 observer.callback([{target:f.items[0],isIntersecting:false}]);assert.equal(f.items[0].classes.size,0);
 observer.callback([{target:f.items[0],isIntersecting:true},{target:f.items[4],isIntersecting:true}]);
 assert.equal(f.items[0].classes.has('is-visible'),true);assert.equal(f.items[4].classes.size,0);
 assert.deepEqual(observer.removed,[f.items[0],f.items[4]]);stop();
});
test('MOTION-001: reduced motion skips observer and live preference changes disconnect it',()=>{
 const f=fixture({reduced:true}),stop=observeInvitation(f.root,f.environment);
 assert.equal(f.instances.length,0);f.preference.matches=false;f.preference.listener();assert.equal(f.instances.length,1);
 f.preference.matches=true;f.preference.listener();assert.equal(f.instances[0].disconnected,true);stop();
});
test('MOTION-001: unavailable or broken observer leaves content unchanged',()=>{
 const f=fixture({fail:true});assert.doesNotThrow(()=>observeInvitation(f.root,f.environment)());
 assert.ok(f.items.every(item=>item.classes.size===0));
 assert.doesNotThrow(()=>observeInvitation(f.root,{})());
 const g=fixture();delete g.environment.IntersectionObserver;assert.doesNotThrow(()=>observeInvitation(g.root,g.environment)());
});
test('MOTION-001: durations, stagger, displacement and reduced-motion stay bounded',()=>{
 const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');
 assert.match(css,/animation:cardIn var\(--motion-reveal,650ms\)/);
 assert.match(css,/animation:heroReveal 650ms/);
 assert.doesNotMatch(css,/heroReveal 1\.4s/);
 assert.match(css,/translateY\(20px\)/);
 assert.match(css,/animation-delay:40ms/);assert.match(css,/animation-delay:80ms/);
 assert.match(css,/\.reveal:has\(form\)\{animation:none\}/);
 assert.match(css,/\.album-side:hover img\{transform:none\}/);
 assert.doesNotMatch(css,/transition:all|scroll-behavior:smooth/);
});