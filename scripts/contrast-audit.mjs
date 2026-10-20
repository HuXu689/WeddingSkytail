/**
 * Conservative computed-style contrast sampling, not a substitute for a complete WCAG audit.
 *
 * Nền gradient: nếu lớp nền gần nhất là linear/radial/conic-gradient với các stop ĐẶC, mẫu được
 * đo theo stop cho contrast XẤU NHẤT (bảo thủ) vì không biết chữ nằm ở đoạn nào của dải màu.
 * Trường hợp có ảnh (`url(...)`), stop trong suốt, hoặc hàm màu không nhận dạng thì vẫn bỏ qua
 * và ghi vào `skipped` — không kết luận thay cho việc đo thật.
 */
function parseColor(value){
 const match=String(value??'').match(/^rgba?\(([^)]+)\)$/);
 if(!match)return null;
 const parts=match[1].split(/[, /]+/).map(Number);
 return parts.length>=3&&parts.slice(0,3).every(part=>Number.isFinite(part))?parts:null;
}
function luminance(color){
 return color.slice(0,3).map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
}
function contrast(first,second){ return (Math.max(first,second)+.05)/(Math.min(first,second)+.05); }
/** Các stop đặc của gradient; null nếu là ảnh, có alpha, hoặc không phải gradient đã biết. */
function gradientStops(image){
 const value=String(image??'');
 if(!value||value==='none'||/url\(/i.test(value))return null;
 if(!/(?:linear|radial|conic)-gradient\(/i.test(value))return null;
 const stops=[];
 for(const match of value.matchAll(/rgba?\(([^)]+)\)/g)){
  const parts=match[1].split(/[, /]+/).map(Number);
  if(parts.length<3||parts.slice(0,3).some(part=>!Number.isFinite(part)))return null;
  if(parts.length>3&&parts[3]<1)return null;
  stops.push(parts);
 }
 return stops.length?stops:null;
}
/** Stop cho contrast xấu nhất so với màu chữ (bảo thủ), không lấy trung bình. */
function worstStop(stops,foreground){
 const text=luminance(foreground);
 return stops.reduce((worst,stop)=>contrast(text,luminance(stop))<contrast(text,luminance(worst))?stop:worst,stops[0]);
}
export function inspectContrast(root=document){
 const samples=[],skipped=[];
 for(const element of root.querySelectorAll('h1,h2,h3,p,span,a,button,label,cite,time,strong,small,summary,dt,dd,li')){
  if(!Array.from(element.childNodes).some(node=>node.nodeType===3&&node.textContent.trim()))continue;
  const style=getComputedStyle(element),rect=element.getBoundingClientRect();
  if(rect.width===0||rect.height===0||style.visibility==='hidden'||element.closest('[aria-hidden="true"]'))continue;
  const text=element.textContent.trim().slice(0,100),foreground=parseColor(style.color);
  let background=null,uncertain=false,gradient=false;
  for(let parent=element;parent;parent=parent.parentElement){
   const computed=getComputedStyle(parent);
   if(Number(computed.opacity)<1){uncertain=true;break;}
   const stops=gradientStops(computed.backgroundImage);
   if(stops){background=worstStop(stops,foreground);gradient=true;break;}
   if(computed.backgroundImage!=='none'){uncertain=true;break;}
   if(parent.classList.contains('wedding-cover')&&!parent.classList.contains('hero-split')&&parent.querySelector('.cover-photo')){uncertain=true;break;}
   const color=parseColor(computed.backgroundColor);
   if(color&&(color.length===3||color[3]===1)){background=color;break;}
   if(color&&color[3]>0){uncertain=true;break;}
  }
  if(!foreground||foreground[3]<1||!background||uncertain){skipped.push(text);continue;}
  const value=contrast(luminance(foreground),luminance(background));
  const size=parseFloat(style.fontSize),weight=parseInt(style.fontWeight,10),required=size>=24||(size>=18.66&&weight>=700)?3:4.5;
  samples.push({text,tag:element.tagName,className:typeof element.className==='string'?element.className:'',color:style.color,background:`rgb(${background.slice(0,3).join(',')})`,gradient,size,ratio:Math.round(value*100)/100,required,pass:value>=required});
 }
 return {samples,skipped,failures:samples.filter(sample=>!sample.pass)};
}