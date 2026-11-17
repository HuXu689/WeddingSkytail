import {oneLine} from '@/shared/text';

export const FALLBACK_HERO_BY_THEME:Record<'ELEGANT'|'TRADITIONAL'|'MODERN',string>={
  ELEGANT:'/fallback/hero.jpg',
  TRADITIONAL:'/fallback/traditional.jpg',
  MODERN:'/fallback/portrait.jpg',
};

export const FALLBACK_ALBUM=[
  '/fallback/hero.jpg',
  '/fallback/portrait.jpg',
  '/fallback/traditional.jpg',
  '/fallback/detail.jpg',
  '/fallback/reception.jpg',
] as const;

export function fallbackAlbumUrl(index:number):string{
  const len=FALLBACK_ALBUM.length;
  return FALLBACK_ALBUM[((index%len)+len)%len];
}

/**
 * Xử lý chuỗi URL bản đồ người dùng dán vào: tự bóc tách nếu lỡ dán cú pháp Markdown
 * `[Tên địa điểm](https://...)` hoặc chuỗi bị lặp `https://...](https://...`.
 */
export function cleanMapUrlInput(raw:string):string{
  const trimmed=raw.trim();
  if(!trimmed)return '';
  const md=trimmed.match(/^\[[^\]]*]\((https:\/\/[^)\s]+)\)$/);
  if(md)return md[1];
  const splitIdx=trimmed.indexOf('](https://');
  if(splitIdx>0)return trimmed.slice(0,splitIdx).trim();
  return trimmed;
}

export function friendlyTimezone(tz:string):string{
  if(tz==='Asia/Ho_Chi_Minh'||tz==='Asia/Saigon')return 'Giờ Việt Nam (GMT+7)';
  if(tz==='UTC')return 'Giờ quốc tế (UTC)';
  return tz;
}

function toGoogleUtcStamp(iso:string,offsetMs=0):string{
  const d=new Date(new Date(iso).getTime()+offsetMs);
  if(Number.isNaN(d.getTime()))return '';
  return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
}

export function googleCalendarUrl(params:{title:string;start:string;venue:string;address:string}):string{
  const startUtc=toGoogleUtcStamp(params.start,0);
  const endUtc=toGoogleUtcStamp(params.start,3*3600*1000);
  const query=new URLSearchParams({
    action:'TEMPLATE',
    text:oneLine(params.title),
    dates:startUtc&&endUtc?`${startUtc}/${endUtc}`:'',
    location:`${oneLine(params.venue)} — ${oneLine(params.address)}`,
    details:'Sự kiện cưới trân trọng kính mời bạn tham dự.',
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}
