import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../src/features/admin/use-unsaved-changes.ts',import.meta.url),'utf8');
// Execute the actual hook body, including its effect and cleanup, without a DOM library.
const compiled=ts.transpileModule(source.replace("import {useEffect} from 'react';",'').replace('export function','function'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
function fixture({dirty=true,accepted=false,navigation=true}={}){
 const location=new URL('https://wedding.test/admin/wedding');
 // Node's EventTarget does not model DOM capture propagation. Normalize options
 // for this isolated handler test; real capture behavior is covered by Chrome QA.
 class Target extends EventTarget {
  addEventListener(type,listener){super.addEventListener(type,listener);}
  removeEventListener(type,listener){super.removeEventListener(type,listener);}
 }
 const window=new Target(),document=new Target();
 let prompts=0,cleanup;
 window.confirm=()=>{prompts++;return accepted;};
 if(navigation)window.navigation=new EventTarget();
 class Element {
  constructor(href,attributes={}){this.href=new URL(href,location).href;this.target=attributes.target??'';this.attributes=attributes;}
  closest(){return this;}
  hasAttribute(name){return Object.hasOwn(this.attributes,name);}
 }
 const context=vm.createContext({window,document,location,URL,Element,useEffect:effect=>{cleanup=effect();}});
 vm.runInContext(`${compiled}\nuseUnsavedChanges(${dirty},'Unsaved draft');`,context);
 function click(href,attributes={},modifiers={}){
  const event=new Event('click',{cancelable:true});
  Object.defineProperties(event,Object.fromEntries(Object.entries({target:new Element(href,attributes),button:0,...modifiers}).map(([key,value])=>[key,{value}])));
  document.dispatchEvent(event);return event;
 }
 function traverse(url,{cancelable=true,type='traverse'}={}){
  const event=new Event('navigate',{cancelable});
  Object.assign(event,{navigationType:type,destination:{url}});
  window.navigation.dispatchEvent(event);return event;
 }
 return{window,click,traverse,cleanup:()=>cleanup?.(),prompts:()=>prompts};
}

test('dirty links are canceled on rejection and allowed on confirmation',()=>{
 const cancel=fixture();assert.equal(cancel.click('/admin/media').defaultPrevented,true);assert.equal(cancel.prompts(),1);
 const accept=fixture({accepted:true});assert.equal(accept.click('/admin/media').defaultPrevented,false);assert.equal(accept.prompts(),1);
});
test('downloads including empty attribute and other browsing contexts do not prompt',()=>{
 const f=fixture();
 for(const attributes of [{download:''},{download:'photo.jpg'},{target:'_blank'},{target:'_BLANK'},{target:'preview'},{target:'_parent'}]){
  assert.equal(f.click('/admin/media',attributes).defaultPrevented,false);
 }
 assert.equal(f.prompts(),0);
 assert.equal(f.click('/admin/media',{target:'_self'}).defaultPrevented,true);
});
test('modified clicks, same-page fragments and non-document protocols preserve their behavior',()=>{
 const f=fixture();
 for(const modifiers of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])f.click('/admin/media',{},modifiers);
 for(const href of ['#album','/admin/wedding','mailto:owner@example.test','tel:0123456789'])f.click(href);
 assert.equal(f.prompts(),0);
 assert.equal(f.click('/admin/wedding?tab=other').defaultPrevented,true);
});
test('already canceled links do not prompt again',()=>{
 const f=fixture();assert.equal(f.click('/admin/media',{}, {defaultPrevented:true}).defaultPrevented,true);assert.equal(f.prompts(),0);
});
test('Back/Forward checks origin, path and search but allows same-document fragments',()=>{
 const f=fixture();
 assert.equal(f.traverse('https://wedding.test/admin/wedding#album').defaultPrevented,false);
 for(const url of ['https://wedding.test/admin','https://wedding.test/admin/wedding?tab=other','https://other.test/admin/wedding'])assert.equal(f.traverse(url).defaultPrevented,true);
 assert.equal(f.prompts(),3);
 const accepted=fixture({accepted:true});assert.equal(accepted.traverse('https://wedding.test/admin').defaultPrevented,false);assert.equal(accepted.prompts(),1);
});
test('noncancelable and non-traversal navigation do not prompt',()=>{
 const f=fixture();f.traverse('https://wedding.test/admin',{cancelable:false});f.traverse('https://wedding.test/admin',{type:'push'});assert.equal(f.prompts(),0);
});
test('beforeunload is active only while dirty and every listener is cleaned up',()=>{
 const f=fixture();const unload=new Event('beforeunload',{cancelable:true});f.window.dispatchEvent(unload);assert.equal(unload.defaultPrevented,true);
 f.cleanup();
 assert.equal(f.click('/admin/media').defaultPrevented,false);
 assert.equal(f.traverse('https://wedding.test/admin').defaultPrevented,false);
 const cleanUnload=new Event('beforeunload',{cancelable:true});f.window.dispatchEvent(cleanUnload);assert.equal(cleanUnload.defaultPrevented,false);assert.equal(f.prompts(),0);
 const clean=fixture({dirty:false});assert.equal(clean.click('/admin/media').defaultPrevented,false);assert.equal(clean.prompts(),0);
});
test('unsupported Navigation API retains link and unload protection without throwing',()=>{
 const f=fixture({navigation:false});assert.equal(f.click('/admin/media').defaultPrevented,true);f.cleanup();assert.equal(f.click('/admin/media').defaultPrevented,false);
});