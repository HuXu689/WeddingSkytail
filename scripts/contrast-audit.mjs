/**
 * Conservative contrast sampling, not a substitute for a complete WCAG audit.
 *
 * Nền gradient: nếu lớp nền gần nhất là linear/radial/conic-gradient với các stop ĐẶC, mẫu được
 * đo theo stop cho contrast XẤU NHẤT (bảo thủ) vì không biết chữ nằm ở đoạn nào của dải màu.
 * Trường hợp có ảnh (`url(...)`), stop trong suốt, alpha hoặc opacity < 1 thì computed style không
 * kết luận được: mẫu được trả trong `pending` để script QA đo bằng pixel thật (contrast-pixels.mjs).
 * `skipped` chỉ còn trường hợp không thể đo: màu chữ trong suốt, không có hộp chữ, hoặc nền video.
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
/** Hộp bao của các đoạn chữ TRỰC TIẾP, toạ độ tài liệu (CSS px); null nếu không có chữ hiển thị.
 * Hộp được kẹp vào chính rect của phần tử để không chụp nhầm viền/đốm trang trí nằm sát bên ngoài
 * (ví dụ viền accent của khối lịch trình) — thứ không phải nền của chữ. */
function textBox(element){
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const node of element.childNodes){
  if(node.nodeType!==3||!node.textContent.trim())continue;
  const range=document.createRange();
  range.selectNodeContents(node);
  for(const box of range.getClientRects()){
   if(box.width<=0||box.height<=0)continue;
   left=Math.min(left,box.left);top=Math.min(top,box.top);right=Math.max(right,box.right);bottom=Math.max(bottom,box.bottom);
  }
 }
 if(!Number.isFinite(left)||right<=left||bottom<=top)return null;
 const own=element.getBoundingClientRect();
 left=Math.max(left,own.left);top=Math.max(top,own.top);right=Math.min(right,own.right);bottom=Math.min(bottom,own.bottom);
 if(right<=left||bottom<=top)return null;
 return {x:left+window.scrollX,y:top+window.scrollY,width:right-left,height:bottom-top};
}
/** opacity tích luỹ của phần tử và tổ tiên: chữ bán trong suốt có contrast thực thấp hơn màu khai báo. */
function effectiveOpacity(element){
 let value=1;
 for(let node=element;node;node=node.parentElement){value*=Number(getComputedStyle(node).opacity);if(value<=0)return 0;}
 return Math.round(value*1000)/1000;
}
export function inspectContrast(root=document){
 const samples=[],pending=[],skipped=[],elements=[];
 for(const element of root.querySelectorAll('h1,h2,h3,p,span,a,button,label,cite,time,strong,small,summary,dt,dd,li')){
  if(!Array.from(element.childNodes).some(node=>node.nodeType===3&&node.textContent.trim()))continue;
  const style=getComputedStyle(element),rect=element.getBoundingClientRect();
  if(rect.width===0||rect.height===0||style.visibility==='hidden'||element.closest('[aria-hidden="true"]'))continue;
  const text=element.textContent.trim().slice(0,100),foreground=parseColor(style.color);
  if(!foreground||foreground[3]<1){skipped.push(text);continue;}
  // WCAG 1.4.3 miễn trừ thành phần UI không hoạt động: nút disabled mờ đi là chủ ý, không phải lỗi contrast.
  if(element.closest(':disabled,[aria-disabled="true"]')){skipped.push(text);continue;}
  const size=parseFloat(style.fontSize),weight=parseInt(style.fontWeight,10),required=size>=24||(size>=18.66&&weight>=700)?3:4.5;
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
  if(background&&!uncertain){
   const value=contrast(luminance(foreground),luminance(background));
   samples.push({text,tag:element.tagName,className:typeof element.className==='string'?element.className:'',color:style.color,background:`rgb(${background.slice(0,3).join(',')})`,gradient,size,ratio:Math.round(value*100)/100,required,pass:value>=required});
   continue;
  }
  // Không xác định được nền từ computed style: chuyển sang đo pixel (trừ nền video/không có hộp chữ).
  if(element.closest('video,canvas')){skipped.push(text);continue;}
  const box=textBox(element);
  if(!box){skipped.push(text);continue;}
  elements.push(element);
  pending.push({index:elements.length-1,text,tag:element.tagName,className:typeof element.className==='string'?element.className:'',color:style.color,foreground:foreground.slice(0,3),opacity:effectiveOpacity(element),size,required,rect:box});
 }
 if(typeof window!=='undefined'){window.__contrastPending=elements;window.__contrastHelpers={textBox,effectiveOpacity};}
 return {samples,pending,skipped,failures:samples.filter(sample=>!sample.pass)};
}
