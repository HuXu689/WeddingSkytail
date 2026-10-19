import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectContrast} from '../../scripts/contrast-audit.mjs';
function fixture({color='rgb(0, 0, 0)',background='rgb(255, 255, 255)',image='none',opacity='1',size='16px',weight='400'}={}){
 const style={color,backgroundColor:background,backgroundImage:image,opacity,fontSize:size,fontWeight:weight,visibility:'visible'};
 const element={childNodes:[{nodeType:3,textContent:'Nội dung'}],textContent:'Nội dung',tagName:'P',parentElement:null,getBoundingClientRect:()=>({width:100,height:20}),closest:()=>null,classList:{contains:()=>false}};
 return {root:{querySelectorAll:()=>[element]},style};
}
test('contrast audit checks normal and large text with WCAG AA thresholds',()=>{
 const previous=globalThis.getComputedStyle;
 try{
  let f=fixture();globalThis.getComputedStyle=()=>f.style;
  assert.equal(inspectContrast(f.root).samples[0].ratio,21);
  f=fixture({color:'rgb(125, 132, 123)'});assert.equal(inspectContrast(f.root).failures.length,1);
  f=fixture({color:'rgb(125, 132, 123)',size:'24px'});assert.equal(inspectContrast(f.root).failures.length,0);
 }finally{globalThis.getComputedStyle=previous;}
});
test('contrast audit does not certify image, gradient or translucent backgrounds',()=>{
 const previous=globalThis.getComputedStyle;
 try{
  for(const config of [{image:'linear-gradient(red, blue)'},{opacity:'.5'},{background:'rgba(255, 255, 255, 0.5)'}]){
   const f=fixture(config);globalThis.getComputedStyle=()=>f.style;
   assert.equal(inspectContrast(f.root).samples.length,0);assert.equal(inspectContrast(f.root).skipped.length,1);
  }
 }finally{globalThis.getComputedStyle=previous;}
});