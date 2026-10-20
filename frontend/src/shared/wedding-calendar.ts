import type {ContentSection} from '@/features/invitation/sections';
export interface CalendarItem {id:string;kind:'event'|'milestone';title:string;at:string;timezone:string;venue?:string;address?:string;cancelled?:boolean;tentative?:boolean;calendarUrl?:string}
export interface CalendarEvent {id:string;title:string;start_at:string;timezone:string;venue:string;address:string;state:string}
export function localDay(at:string,timezone:string):string|null{
 try{
  const date=new Date(at);if(!Number.isFinite(date.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type)?.value).join('-');
 }catch{return null;}
}
export function guestCalendar(events:CalendarEvent[],invitationId:string):CalendarItem[]{
 return events.filter(event=>['PUBLISHED','CANCELLED'].includes(event.state)).map(event=>({id:`event:${event.id}`,kind:'event',title:event.title,at:event.start_at,timezone:event.timezone,venue:event.venue,address:event.address,cancelled:event.state==='CANCELLED',calendarUrl:event.state==='PUBLISHED'?`/api/v1/guest/invitations/${encodeURIComponent(invitationId)}/events/${encodeURIComponent(event.id)}/calendar.ics`:undefined}));
}
/** Input already server-projected; this extra filter is not an authorization boundary. */
export function publicCalendar(sections:ContentSection[]):CalendarItem[]{
 return sections.flatMap((section,index)=>{
  if(!section.enabled||section.kind!=='TIMELINE'||section.audience!=='PUBLIC')return [];
  const rows=section.payload?.timeline;
  if(rows?.length)return rows.filter(item=>item.audience==='PUBLIC').map((item,n)=>({id:`milestone:${index}:${n}`,kind:'milestone' as const,title:item.title,at:item.at,timezone:'Asia/Ho_Chi_Minh',venue:item.venue,tentative:item.tentative}));
  return section.startsAt?[{id:`milestone:${index}:legacy`,kind:'milestone' as const,title:section.title,at:section.startsAt,timezone:'Asia/Ho_Chi_Minh'}]:[];
 });
}
export function defaultCalendarItem(items:CalendarItem[],now:number):CalendarItem|undefined{
 const sorted=items.filter(item=>!item.cancelled&&localDay(item.at,item.timezone)).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return sorted.find(item=>Date.parse(item.at)>=now)??sorted.at(-1)??items.find(item=>localDay(item.at,item.timezone));
}
/** UTC is only used for Gregorian arithmetic on numeric year/month, never to parse a local day string. */
export function monthCells(month:string):(number|null)[]{
 const [year,m]=month.split('-').map(Number);const first=new Date(Date.UTC(year,m-1,1));
 const offset=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const cells:(number|null)[]=Array(offset).fill(null);for(let day=1;day<=days;day++)cells.push(day);
 while(cells.length%7)cells.push(null);return cells;
}
export function adjacentMonth(month:string,delta:number):string{
 const [year,m]=month.split('-').map(Number),date=new Date(Date.UTC(year,m-1+delta,1));
 return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
}