import test from 'node:test';
import assert from 'node:assert/strict';
import {startMusicAutoplay} from '../src/features/invitation/music-autoplay.ts';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(results){
 const listeners=new Map(),states=[];let calls=0;
 const doc={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}};
 const audio={play(){const result=results[calls++];return result instanceof Error?Promise.reject(result):result??Promise.resolve();}};
 const cancel=startMusicAutoplay(audio,doc,state=>states.push(state));
 return {cancel,states,listeners,get calls(){return calls;},gesture(type='click',extra={}){listeners.get(type)?.({type,isTrusted:true,target:{closest:()=>null},...extra});}};
}
const blocked=()=>new DOMException('Blocked','NotAllowedError');
test('autoplay succeeds once and leaves no interaction listeners',async()=>{
 const f=fixture([]);await flush();assert.equal(f.calls,1);assert.deepEqual(f.states,['playing']);assert.equal(f.listeners.size,0);
});
test('blocked autoplay retries synchronously on interaction, then stops listening',async()=>{
 const f=fixture([blocked()]);await flush();assert.deepEqual(f.states,['waiting']);assert.equal(f.listeners.size,3);
 f.gesture();assert.equal(f.calls,2);await flush();assert.deepEqual(f.states,['waiting','playing']);assert.equal(f.listeners.size,0);
 f.gesture();assert.equal(f.calls,2);
});
test('touch and keyboard unlock; irrelevant or synthetic interactions do not',async()=>{
 for(const type of ['touchend','keydown']){
  const f=fixture([blocked()]);await flush();
  f.gesture('click',{isTrusted:false});f.gesture('keydown',{key:'Tab'});f.gesture('keydown',{key:'Enter',repeat:true});
  f.gesture('click',{target:{closest:()=>({})}});assert.equal(f.calls,1);
  f.gesture(type,{key:'Enter'});assert.equal(f.calls,2);await flush();assert.equal(f.listeners.size,0);
 }
});
test('repeated policy blocks remain retryable without overlapping play calls',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});
 const f=fixture([blocked(),blocked(),pending]);await flush();f.gesture();await flush();f.gesture();f.gesture('touchend');assert.equal(f.calls,3);
 release();await flush();assert.equal(f.listeners.size,0);
});
test('manual override and unmount cancel pending retries and ignore late promises',async()=>{
 const f=fixture([blocked()]);await flush();f.cancel();f.gesture();assert.equal(f.calls,1);assert.equal(f.listeners.size,0);
 let reject;const pending=new Promise((_,r)=>{reject=r;});const g=fixture([pending]);g.cancel();reject(blocked());await flush();assert.deepEqual(g.states,[]);assert.equal(g.listeners.size,0);
});
test('media errors do not install automatic interaction retries',async()=>{
 const f=fixture([new DOMException('Unsupported','NotSupportedError')]);await flush();assert.deepEqual(f.states,['failed']);assert.equal(f.listeners.size,0);
});