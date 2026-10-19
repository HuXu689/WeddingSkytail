/** Conservative computed-style contrast sampling, not a substitute for a complete WCAG audit. */
export function inspectContrast(root=document){
 const samples=[],skipped=[];
 const rgb=value=>{const match=value.match(/^rgba?\(([^)]+)\)$/);return match?match[1].split(/[, /]+/).map(Number):null;};
 const luminance=color=>color.slice(0,3).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 for(const element of root.querySelectorAll('h1,h2,h3,p,span,a,button,label,cite,time,strong,small,summary')){
  if(!Array.from(element.childNodes).some(node=>node.nodeType===3&&node.textContent.trim()))continue;
  const style=getComputedStyle(element),rect=element.getBoundingClientRect();
  if(rect.width===0||rect.height===0||style.visibility==='hidden'||element.closest('[aria-hidden="true"]'))continue;
  const text=element.textContent.trim().slice(0,100),foreground=rgb(style.color);
  let background=null,uncertain=false;
  for(let parent=element;parent;parent=parent.parentElement){
   const computed=getComputedStyle(parent),color=rgb(computed.backgroundColor);
   if(Number(computed.opacity)<1||computed.backgroundImage!=='none'){uncertain=true;break;}
   if(parent.classList.contains('wedding-cover')&&!parent.classList.contains('hero-split')&&parent.querySelector('.cover-photo')){uncertain=true;break;}
   if(color&&(color.length===3||color[3]===1)){background=color;break;}
   if(color&&color[3]>0){uncertain=true;break;}
  }
  if(!foreground||foreground[3]<1||!background||uncertain){skipped.push(text);continue;}
  const first=luminance(foreground),second=luminance(background),ratio=(Math.max(first,second)+.05)/(Math.min(first,second)+.05);
  const size=parseFloat(style.fontSize),weight=parseInt(style.fontWeight,10),required=size>=24||(size>=18.66&&weight>=700)?3:4.5;
  samples.push({text,tag:element.tagName,color:style.color,background:`rgb(${background.slice(0,3).join(',')})`,size,ratio:Math.round(ratio*100)/100,required,pass:ratio>=required});
 }
 return {samples,skipped,failures:samples.filter(sample=>!sample.pass)};
}