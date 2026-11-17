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
  '/fallback/groom-portrait.jpg',
  '/fallback/bride-portrait.jpg',
  '/fallback/love-story-1.jpg',
  '/fallback/love-story-2.jpg',
] as const;

export const FALLBACK_PORTRAITS={
  GROOM:'/fallback/groom-portrait.jpg',
  BRIDE:'/fallback/bride-portrait.jpg',
} as const;

export const FALLBACK_LOVE_STORY=[
  '/fallback/love-story-1.jpg',
  '/fallback/love-story-2.jpg',
  '/fallback/hero.jpg',
  '/fallback/reception.jpg',
] as const;

export const FALLBACK_AUDIO_URL='/fallback/wedding-melody.wav';

export function fallbackAlbumUrl(index:number):string{
  const len=FALLBACK_ALBUM.length;
  return FALLBACK_ALBUM[((index%len)+len)%len];
}

export function fallbackPortraitUrl(role:string|undefined,index:number):string{
  const lower=(role??'').toLowerCase();
  if(lower.includes('dâu')||lower.includes('nàng')||lower.includes('bride'))return FALLBACK_PORTRAITS.BRIDE;
  if(lower.includes('rể')||lower.includes('chàng')||lower.includes('groom'))return FALLBACK_PORTRAITS.GROOM;
  return index%2===0?FALLBACK_PORTRAITS.GROOM:FALLBACK_PORTRAITS.BRIDE;
}

export function fallbackMilestoneUrl(index:number):string{
  const len=FALLBACK_LOVE_STORY.length;
  return FALLBACK_LOVE_STORY[((index%len)+len)%len];
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

export function googleMapsSearchUrl(venue?:string|null,address?:string|null):string{
  const query=[oneLine(venue??''),oneLine(address??'')].filter(Boolean).join(', ');
  if(!query)return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

export function googleCalendarUrl(params:{title:string;start:string;venue?:string|null;address?:string|null}):string{
  const startUtc=toGoogleUtcStamp(params.start,0);
  const endUtc=toGoogleUtcStamp(params.start,3*3600*1000);
  const loc=[oneLine(params.venue??''),oneLine(params.address??'')].filter(Boolean).join(' — ');
  const query=new URLSearchParams({
    action:'TEMPLATE',
    text:oneLine(params.title),
    dates:startUtc&&endUtc?`${startUtc}/${endUtc}`:'',
    location:loc,
    details:'Sự kiện cưới trân trọng kính mời bạn tham dự.',
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function escapeIcsText(raw:string):string{
  return raw.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}

function foldIcsLine(line:string):string{
  const encoder=new TextEncoder();
  if(encoder.encode(line).length<=75)return line;
  const parts:string[]=[];
  let current='';
  for(const ch of line){
    const limit=parts.length===0?75:74;
    if(encoder.encode(current+ch).length>limit){
      parts.push(current);
      current=ch;
    }else{
      current+=ch;
    }
  }
  if(current)parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcsContent(params:{uid?:string;title:string;start:string;durationMinutes?:number;venue?:string|null;address?:string|null;description?:string|null}):string{
  const durationMs=(params.durationMinutes??180)*60*1000;
  const dtStart=toGoogleUtcStamp(params.start,0);
  const dtEnd=toGoogleUtcStamp(params.start,durationMs);
  const dtStamp=toGoogleUtcStamp(new Date().toISOString(),0)||dtStart;
  if(!dtStart||!dtEnd)return '';
  const location=[oneLine(params.venue??''),oneLine(params.address??'')].filter(Boolean).join(', ');
  const safeUid=(params.uid??`wedding-${dtStart}`).replace(/[^a-zA-Z0-9._@-]/g,'-');
  const lines=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//VN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${safeUid}@wedding.local`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(oneLine(params.title)||'Sự kiện cưới')}`,
  ];
  if(location)lines.push(`LOCATION:${escapeIcsText(location)}`);
  if(params.description?.trim())lines.push(`DESCRIPTION:${escapeIcsText(params.description.trim())}`);
  lines.push('END:VEVENT','END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n')+'\r\n';
}

export function downloadEventIcs(params:{uid?:string;title:string;start:string;venue?:string|null;address?:string|null;description?:string|null;filename?:string}):boolean{
  if(typeof document==='undefined')return false;
  const content=buildIcsContent(params);
  if(!content)return false;
  const blob=new Blob([content],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=params.filename||'lich-su-kien-cuoi.ics';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1200);
  return true;
}
