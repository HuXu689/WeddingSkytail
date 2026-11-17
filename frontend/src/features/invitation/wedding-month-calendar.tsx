'use client';
import {useId,useState} from 'react';
import {adjacentMonth,defaultCalendarItem,localDay,monthCells,type CalendarItem} from '@/shared/wedding-calendar';
import {oneLine} from '@/shared/text';
import {date} from '@/shared/api';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';
import {friendlyTimezone} from './media-fallback';

export function WeddingMonthCalendar({items}:{items:CalendarItem[]}){
 const valid=items.filter(item=>localDay(item.at,item.timezone));
 if(!valid.length)return null;
 return <CalendarContent key={valid.map(item=>`${item.id}:${item.at}:${item.timezone}:${item.cancelled}`).join('|')} items={valid}/>;
}
function CalendarContent({items}:{items:CalendarItem[]}){
 const [now]=useState(()=>Date.now());const initial=defaultCalendarItem(items,now)!;
 const initialDay=localDay(initial.at,initial.timezone)!;
 const [month,setMonth]=useState(initialDay.slice(0,7)),[selected,setSelected]=useState(initialDay),[dir,setDir]=useState(1);
 const heading=useId(),details=useId();
 const cells=monthCells(month),todayDay=localDay(new Date(now).toISOString(),initial.timezone);
 const byDay=new Map<string,CalendarItem[]>();
 for(const item of items){const day=localDay(item.at,item.timezone)!;byDay.set(day,[...(byDay.get(day)??[]),item]);}
 const [year,m]=month.split('-').map(Number);const selectedItems=[...(byDay.get(selected)??[])].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return <section className="wedding-month-calendar" aria-labelledby={heading}>
  <SectionCornerStickers compact/>
  <header>
   <StickerBadge sticker="wedding-rings" label="Lịch hồng ngày cưới"/>
   <p className="eyebrow">Những ngày chung vui</p>
   <h2 id={heading}>Lịch hẹn cùng bạn</h2>
   <div className="calendar-header-ornament" aria-hidden="true">
    <WeddingSticker kind="lovebirds" size={64}/>
   </div>
  </header>
  <div className="month-navigation"><button type="button" className="secondary" aria-label="Tháng trước" onClick={()=>{setDir(-1);setMonth(value=>adjacentMonth(value,-1));}}>←</button><h3 aria-live="polite">Tháng {m} · {year}</h3><button type="button" className="secondary" aria-label="Tháng sau" onClick={()=>{setDir(1);setMonth(value=>adjacentMonth(value,1));}}>→</button></div>
  <div className="calendar-grid" key={month} data-dir={dir}><table><caption className="sr-only">Tháng {m} năm {year}, tuần bắt đầu thứ Hai</caption><thead><tr>{['T2','T3','T4','T5','T6','T7','CN'].map((label,index)=><th scope="col" key={label}><abbr title={['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ nhật'][index]}>{label}</abbr></th>)}</tr></thead>
   <tbody>{Array.from({length:cells.length/7},(_,week)=><tr key={week}>{cells.slice(week*7,week*7+7).map((day,column)=>{
    if(!day)return <td key={column}/>;
    const key=`${month}-${String(day).padStart(2,'0')}`,events=byDay.get(key)??[],today=todayDay===key;
    return <td key={column}>{events.length?<button type="button" className="calendar-day" aria-current={today?'date':undefined} aria-pressed={selected===key} aria-controls={details} aria-label={`${day}/${m}/${year}, ${events.length} mốc${events.every(item=>item.cancelled)?', đã hủy':''}${today?', hôm nay':''}`} onClick={()=>setSelected(key)}><span>{day}</span><small>{events.length} mốc</small>{today&&<span className="sr-only">Hôm nay</span>}</button>:<span className="calendar-plain" aria-current={today?'date':undefined}>{day}</span>}</td>;
   })}</tr>)}</tbody>
  </table></div>
  <p className="field-hint">Chọn ngày được đánh dấu để xem chi tiết chương trình ({friendlyTimezone(initial.timezone)}). Ngày có viền mảnh là hôm nay.</p>
  <button type="button" className="secondary" onClick={()=>{setMonth(initialDay.slice(0,7));setSelected(initialDay);}}>Về ngày sự kiện</button>
  <div id={details} className="calendar-details" aria-live="polite"><h3>Chi tiết ngày {selected.split('-').reverse().join('/')}</h3><ul>{selectedItems.map(item=><li key={item.id}><strong>{oneLine(item.title)}</strong>{item.cancelled&&<p>Buổi tiệc đã hủy</p>}{item.tentative&&<p>Dự kiến</p>}<p><time dateTime={item.at}>{date(item.at,item.timezone)}</time> · {friendlyTimezone(item.timezone)}</p>{item.venue&&<p>{oneLine(item.venue)}</p>}{item.address&&<p>{oneLine(item.address)}</p>}{item.calendarUrl&&!item.cancelled&&<a className="button secondary" href={item.calendarUrl}>Thêm vào lịch</a>}</li>)}</ul></div>
 </section>;
}
