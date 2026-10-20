/**
 * Đo contrast bằng PIXEL THẬT cho chữ nằm trên nền ảnh/alpha — phần mà computed style không
 * kết luận được. Cách làm: chụp vùng chữ khi đã ẩn chữ (chỉ còn nền đã composite), giải mã PNG,
 * rồi lấy pixel cho contrast XẤU NHẤT so với màu chữ (bảo thủ, giống cách xử lý stop gradient).
 *
 * Không phụ thuộc thư viện ngoài: chỉ dùng `node:zlib` để giải nén IDAT.
 */
import {inflateSync} from 'node:zlib';

/** PNG 2×1: pixel trái đen tuyệt đối, pixel phải trắng tuyệt đối (đối chứng cho bộ giải mã). */
export const CONTROL_PNG_BLACK_WHITE='iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGNgYGD4//8/AAYBAv4CsjmuAAAAAElFTkSuQmCC';
/** PNG 1×1 xám #767676 — contrast 4.54:1 với trắng (đối chứng cho nhánh ĐẠT ngưỡng). */
export const CONTROL_PNG_GRAY='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMoKysDAALIAWOvKYJGAAAAAElFTkSuQmCC';

const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);

/** Giải mã PNG 8-bit, không interlace, color type 0/2/4/6 → RGBA. */
export function decodePng(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<8||!buffer.subarray(0,8).equals(SIGNATURE))throw Error('Không phải PNG');
  let offset=8,width=0,height=0,bitDepth=0,colorType=0,interlace=0;
  const chunks=[];
  while(offset+8<=buffer.length){
    const length=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8);
    const data=buffer.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12];
    }else if(type==='IDAT')chunks.push(data);
    else if(type==='IEND')break;
    offset+=12+length;
  }
  if(!width||!height)throw Error('PNG thiếu IHDR');
  if(bitDepth!==8||interlace!==0)throw Error(`PNG không hỗ trợ bitDepth=${bitDepth} interlace=${interlace}`);
  const channels={0:1,2:3,4:2,6:4}[colorType];
  if(!channels)throw Error(`PNG không hỗ trợ colorType=${colorType}`);
  const raw=inflateSync(Buffer.concat(chunks));
  const stride=width*channels;
  if(raw.length<height*(stride+1))throw Error('Dữ liệu PNG bị thiếu');
  const pixels=new Uint8Array(width*height*4);
  let previous=Buffer.alloc(stride);
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];
    const line=Buffer.from(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
    unfilter(filter,line,previous,channels);
    for(let x=0;x<width;x++){
      const source=x*channels,target=(y*width+x)*4;
      if(channels>=3){
        pixels[target]=line[source];pixels[target+1]=line[source+1];pixels[target+2]=line[source+2];
        pixels[target+3]=channels===4?line[source+3]:255;
      }else{
        const value=line[source];
        pixels[target]=pixels[target+1]=pixels[target+2]=value;
        pixels[target+3]=channels===2?line[source+1]:255;
      }
    }
    previous=line;
  }
  return {width,height,pixels};
}

function unfilter(filter,line,previous,bpp){
  for(let i=0;i<line.length;i++){
    const left=i>=bpp?line[i-bpp]:0,up=previous[i],upLeft=i>=bpp?previous[i-bpp]:0;
    if(filter===1)line[i]=(line[i]+left)&255;
    else if(filter===2)line[i]=(line[i]+up)&255;
    else if(filter===3)line[i]=(line[i]+((left+up)>>1))&255;
    else if(filter===4){
      const estimate=left+up-upLeft,toLeft=Math.abs(estimate-left),toUp=Math.abs(estimate-up),toUpLeft=Math.abs(estimate-upLeft);
      line[i]=(line[i]+(toLeft<=toUp&&toLeft<=toUpLeft?left:toUp<=toUpLeft?up:upLeft))&255;
    }else if(filter!==0)throw Error(`PNG filter không hỗ trợ: ${filter}`);
  }
}

function channelLuminance(value){
  const channel=value/255;
  return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;
}
function luminance(red,green,blue){ return channelLuminance(red)*.2126+channelLuminance(green)*.7152+channelLuminance(blue)*.0722; }
function ratio(first,second){ return (Math.max(first,second)+.05)/(Math.min(first,second)+.05); }

/**
 * Contrast xấu nhất giữa màu chữ và từng pixel nền. `opacity` < 1 mô phỏng chữ được vẽ bán trong
 * suốt: màu chữ thực tế là hỗn hợp của màu khai báo với chính pixel nền đó.
 * Trả `{ratio,pixels,minLuminance,maxLuminance}` — `pixels` là số pixel đã dùng để đối chiếu.
 */
export function worstPixelContrast(image,foreground,opacity=1){
  const {width,height,pixels}=image;
  const total=width*height;
  if(!total)throw Error('Ảnh rỗng');
  const step=Math.max(1,Math.ceil(total/250000));
  const alpha=Math.min(1,Math.max(0,Number(opacity)||0));
  let worst=Infinity,minLuminance=1,maxLuminance=0,sampled=0;
  for(let index=0;index<total;index+=step){
    const offset=index*4;
    const pixelAlpha=pixels[offset+3]/255;
    if(pixelAlpha===0)continue;
    // Ảnh chụp màn hình là RGBA đục; nếu có alpha thì composite lên trắng như trang in.
    const red=pixels[offset]*pixelAlpha+255*(1-pixelAlpha);
    const green=pixels[offset+1]*pixelAlpha+255*(1-pixelAlpha);
    const blue=pixels[offset+2]*pixelAlpha+255*(1-pixelAlpha);
    const background=luminance(red,green,blue);
    const text=luminance(
      foreground[0]*alpha+red*(1-alpha),
      foreground[1]*alpha+green*(1-alpha),
      foreground[2]*alpha+blue*(1-alpha));
    const value=ratio(text,background);
    if(value<worst)worst=value;
    if(background<minLuminance)minLuminance=background;
    if(background>maxLuminance)maxLuminance=background;
    sampled++;
  }
  if(!sampled)throw Error('Không có pixel đục để đo');
  return {ratio:Math.round(worst*100)/100,pixels:sampled,minLuminance:Math.round(minLuminance*1000)/1000,maxLuminance:Math.round(maxLuminance*1000)/1000};
}
