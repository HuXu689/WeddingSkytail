import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectContrast} from '../../scripts/contrast-audit.mjs';
function fixture({color='rgb(0, 0, 0)',background='rgb(255, 255, 255)',image='none',opacity='1',size='16px',weight='400',disabled=false}={}){
 const style={color,backgroundColor:background,backgroundImage:image,opacity,fontSize:size,fontWeight:weight,visibility:'visible'};
 const element={childNodes:[{nodeType:3,textContent:'Nội dung'}],textContent:'Nội dung',tagName:'P',parentElement:null,getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:20,width:100,height:20}),closest:selector=>disabled&&selector.includes(':disabled')?element:null,classList:{contains:()=>false}};
 return {root:{querySelectorAll:()=>[element]},style};
}
/** `textBox`/`effectiveOpacity` chỉ chạy trong browser; test tĩnh stub phần DOM tối thiểu cần dùng. */
function stubDom(){
 const range={selectNodeContents(){},getClientRects:()=>[{left:0,top:0,right:80,bottom:16,width:80,height:16}]};
 globalThis.document={createRange:()=>range};
 globalThis.window={scrollX:0,scrollY:0};
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
test('contrast audit sends uncertain backgrounds to pixel measurement instead of certifying them',()=>{
 const previousGet=globalThis.getComputedStyle,previousDocument=globalThis.document,previousWindow=globalThis.window;
 try{
  stubDom();
  for(const config of [{image:'linear-gradient(red, blue)'},{opacity:'.5'},{background:'rgba(255, 255, 255, 0.5)'},{image:'url(photo.png)'}]){
   const f=fixture(config);globalThis.getComputedStyle=()=>f.style;
   const result=inspectContrast(f.root);
   assert.equal(result.samples.length,0,'Nền không chắc chắn không được chứng nhận bằng computed style');
   assert.equal(result.pending.length,1,'Nền không chắc chắn phải chuyển sang hàng đợi đo pixel');
   assert.equal(result.skipped.length,0);
   assert.deepEqual(result.pending[0].rect,{x:0,y:0,width:80,height:16},'Hộp chữ phải kẹp trong rect phần tử');
  }
 }finally{globalThis.getComputedStyle=previousGet;globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
test('contrast audit skips transparent text and disabled controls',()=>{
 const previousGet=globalThis.getComputedStyle,previousDocument=globalThis.document,previousWindow=globalThis.window;
 try{
  stubDom();
  let f=fixture({color:'rgba(0, 0, 0, 0.4)'});globalThis.getComputedStyle=()=>f.style;
  assert.equal(inspectContrast(f.root).skipped.length,1);
  f=fixture({disabled:true,background:'rgba(255, 255, 255, 0.5)'});globalThis.getComputedStyle=()=>f.style;
  const result=inspectContrast(f.root);
  assert.equal(result.skipped.length,1,'Nút disabled được WCAG miễn trừ, không đưa vào hàng đợi đo pixel');
  assert.equal(result.pending.length,0);
 }finally{globalThis.getComputedStyle=previousGet;globalThis.document=previousDocument;globalThis.window=previousWindow;}
});