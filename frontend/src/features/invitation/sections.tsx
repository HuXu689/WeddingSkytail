'use client';
import {useState} from 'react';
import {CalendarPlus,Check,Compass,Copy,ExternalLink,Heart,MapPin,Sparkles} from 'lucide-react';
import {date} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import {WeddingIllustration} from './wedding-illustration';
import {SectionCornerStickers,StickerBadge,type StickerKind} from './wedding-stickers';
import {downloadEventIcs,fallbackMilestoneUrl,fallbackPortraitUrl,googleCalendarUrl,googleMapsSearchUrl} from './media-fallback';

/**
 * Nội dung 5 phần tùy chọn của thiệp. `payload` là dữ liệu có cấu trúc (content schema 2);
 * hàng cũ không có payload vẫn render từ title/body/startsAt/color như trước.
 * Việc lọc audience=PRIVATE do server quyết định — component này chỉ hiển thị dữ liệu đã được cấp.
 */
export type WeddingSide='GROOM'|'BRIDE'|'JOINT';
export interface IntroPerson { name:string; role?:string; note?:string; quote?:string; avatarUrl?:string|null }
export interface LoveMilestone { dateLabel:string; title:string; description?:string; photoUrl?:string|null }
export interface FamilyMember { name:string; note?:string }
export interface FamilyGroup { label?:string; side?:WeddingSide; location?:string; welcomeNote?:string; members:FamilyMember[] }
export interface CeremonyItem { title:string; side?:WeddingSide; lead?:string; time?:string|null; venue?:string; address?:string; directions?:string; mapsUrl?:string|null; dressNote?:string }
export interface TimelineItem { at:string; title:string; note?:string; venue?:string; audience:'PUBLIC'|'PRIVATE'; tentative?:boolean; side?:WeddingSide; mapsUrl?:string|null }
export interface PaletteColor { name:string; color:string }
export interface GuestTip { title:string; detail:string }
export interface SectionPayload {
  people?:IntroPerson[];
  milestones?:LoveMilestone[];
  groups?:FamilyGroup[];
  items?:CeremonyItem[];
  timeline?:TimelineItem[];
  palette?:PaletteColor[];
  avoid?:string;
  tips?:GuestTip[];
}
export interface ContentSection {kind:'INTRO'|'FAMILY'|'CEREMONY'|'TIMELINE'|'DRESS_CODE';audience:'PUBLIC'|'PRIVATE';enabled:boolean;title:string;body:string;startsAt:string|null;color:string|null;payload?:SectionPayload|null}

/** Mốc lịch trình dùng giờ Việt Nam như ô nhập của editor; không tự suy ra múi giờ khác. */
const TIME_ZONE='Asia/Ho_Chi_Minh';
const dayFormat=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'long',timeZone:TIME_ZONE});
const timeFormat=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:TIME_ZONE});

const SIDE_LABELS:Record<WeddingSide,string>={
  GROOM:'Nhà Trai',
  BRIDE:'Nhà Gái',
  JOINT:'Chung Hai Gia Đình',
};

const CEREMONY_SIDE_LABELS:Record<WeddingSide,string>={
  GROOM:'Lễ Nhà Trai',
  BRIDE:'Lễ Nhà Gái',
  JOINT:'Lễ Chung Hai Gia Đình',
};

export function ContentSections({sections}:{sections:ContentSection[]}){
  return <>{sections.filter(section=>section.enabled).map((section,index)=>{
    const key=`${section.kind}-${index}`;
    switch(section.kind){
      case 'INTRO': return <IntroSection key={key} section={section}/>;
      case 'FAMILY': return <FamilySection key={key} section={section}/>;
      case 'CEREMONY': return <CeremonySection key={key} section={section}/>;
      case 'TIMELINE': return <TimelineSection key={key} section={section}/>;
      case 'DRESS_CODE': return <DressCodeSection key={key} section={section}/>;
      default: return null;
    }
  })}</>;
}

function SectionHeading({title,mark,sticker,badge}:{title:string;mark:string;sticker:StickerKind;badge:string}){
  return <header className="invitation-section-heading">
    <StickerBadge sticker={sticker} label={badge}/>
    <div className="invitation-section-title-row">
      <span className="invitation-section-mark" aria-hidden="true"><WeddingIllustration kind={mark==='❧'?'flower':mark==='✧'?'rings':mark==='✦'?'heart':'spark'}/></span>
      <h2>{oneLine(title)}</h2>
    </div>
  </header>;
}

/** Giới thiệu hai bạn: chân dung có khung vòm ảnh tùy chọn, trích dẫn riêng và cột mốc kỷ niệm tình yêu. */
function IntroSection({section}:{section:ContentSection}){
  const people=(section.payload?.people??[]).filter(person=>oneLine(person.name));
  const milestones=(section.payload?.milestones??[]).filter(item=>oneLine(item.dateLabel)&&oneLine(item.title));
  const lead=text(section.body).trim();
  if(!people.length&&!lead) return null;
  return <section className="content-section content-intro reveal">
    <SectionCornerStickers compact/>
    <SectionHeading title={section.title} mark="✦" sticker="lovebirds" badge="Nhân vật chính"/>
    {lead&&<p className="intro-lead">{text(section.body)}</p>}
    {people.length>0&&<div className={`intro-people count-${Math.min(people.length,2)}`}>
      {people.map((person,index)=>{
        const avatar=person.avatarUrl?.trim()||null;
        return <article className={`intro-person${avatar?' has-portrait':''}`} key={`${index}-${person.name}`}>
          {avatar&&<div className="intro-person-portrait">
            <img
              src={avatar}
              alt={`Chân dung ${oneLine(person.name)}`}
              loading="lazy"
              decoding="async"
              onError={e=>{
                const img=e.currentTarget;
                const fallback=fallbackPortraitUrl(person.role,index);
                if(!img.src.endsWith(fallback))img.src=fallback;
              }}
            />
          </div>}
          {person.role&&<p className="intro-person-role">{oneLine(person.role)}</p>}
          <h3 className="intro-person-name">{oneLine(person.name)}</h3>
          {person.note&&<p className="intro-person-note">{text(person.note)}</p>}
          {person.quote?.trim()&&<blockquote className="intro-person-quote">“{text(person.quote)}”</blockquote>}
        </article>;
      })}
    </div>}
    {milestones.length>0&&<div className="love-milestones" aria-label="Cột mốc kỷ niệm tình yêu">
      <div className="love-milestones-header">
        <span className="love-milestones-kicker"><Heart size={14} aria-hidden="true"/> Dấu ấn chặng đường yêu</span>
        <h3>Những cột mốc đáng nhớ</h3>
      </div>
      <ol className="love-milestones-track">
        {milestones.map((milestone,index)=>{
          const photo=milestone.photoUrl?.trim()||null;
          return <li className={`love-milestone-item${photo?' has-photo':''}`} key={`${index}-${milestone.dateLabel}-${milestone.title}`}>
            <span className="love-milestone-dot" aria-hidden="true">{index+1}</span>
            <article className="love-milestone-card">
              <div className="love-milestone-body">
                <span className="love-milestone-date">{oneLine(milestone.dateLabel)}</span>
                <h4>{oneLine(milestone.title)}</h4>
                {milestone.description?.trim()&&<p>{text(milestone.description)}</p>}
              </div>
              {photo&&<div className="love-milestone-photo">
                <img
                  src={photo}
                  alt={oneLine(milestone.title)}
                  loading="lazy"
                  decoding="async"
                  onError={e=>{
                    const img=e.currentTarget;
                    const fallback=fallbackMilestoneUrl(index);
                    if(!img.src.endsWith(fallback))img.src=fallback;
                  }}
                />
              </div>}
            </article>
          </li>;
        })}
      </ol>
    </div>}
  </section>;
}

/** Gia đình: hai khối đối ứng, nhãn nhóm, địa chỉ tư gia và lời đón tiếp ấm áp. */
function FamilySection({section}:{section:ContentSection}){
  const groups=(section.payload?.groups??[])
    .map(group=>({
      label:group.label?oneLine(group.label):'',
      side:group.side,
      location:group.location?oneLine(group.location):'',
      welcomeNote:group.welcomeNote?text(group.welcomeNote).trim():'',
      members:(group.members??[]).filter(member=>oneLine(member.name)),
    }))
    .filter(group=>group.label||group.members.length);
  const lead=text(section.body).trim();
  if(!groups.length&&!lead) return null;
  return <section className="content-section content-family reveal">
    <SectionCornerStickers compact/>
    <SectionHeading title={section.title} mark="❧" sticker="wax-seal-song-hy" badge="Gia đình hai bên"/>
    {lead&&<p className="family-lead">{text(section.body)}</p>}
    {groups.length>0&&<div className={`family-groups count-${Math.min(groups.length,2)}`}>
      {groups.map((group,index)=><div className="family-group" key={`${index}-${group.label}`}>
        {group.side&&<span className={`side-pill side-${group.side.toLowerCase()}`}>{SIDE_LABELS[group.side]}</span>}
        {group.label&&<h3 className="family-group-label">{group.label}</h3>}
        {group.location&&<p className="family-group-location"><MapPin size={14} aria-hidden="true"/> <span>{group.location}</span></p>}
        <ul className="family-members">
          {group.members.map((member,memberIndex)=><li key={`${memberIndex}-${member.name}`}>
            <span className="family-member-name">{oneLine(member.name)}</span>
            {member.note&&<span className="family-member-note">{oneLine(member.note)}</span>}
          </li>)}
        </ul>
        {group.welcomeNote&&<p className="family-welcome-note">{group.welcomeNote}</p>}
      </div>)}
    </div>}
  </section>;
}

/** Nghi lễ: thiệp giấy trang trọng kèm chỉ đường bản đồ, sao chép địa chỉ và lưu lịch điện thoại. */
function CeremonySection({section}:{section:ContentSection}){
  const items=(section.payload?.items??[]).filter(item=>oneLine(item.title));
  const [sideFilter,setSideFilter]=useState<'ALL'|WeddingSide>('ALL');
  const [copiedIdx,setCopiedIdx]=useState<number|null>(null);
  const note=text(section.body).trim();
  if(!items.length&&!note) return null;
  const distinctSides=Array.from(new Set(items.map(i=>i.side).filter((s):s is WeddingSide=>Boolean(s))));
  const filtered=sideFilter==='ALL'?items:items.filter(item=>item.side===sideFilter);

  async function copyCeremonyAddress(index:number,venue?:string,address?:string){
    const full=[oneLine(venue??''),oneLine(address??'')].filter(Boolean).join(', ');
    if(!full||typeof navigator==='undefined'||!navigator.clipboard)return;
    try{
      await navigator.clipboard.writeText(full);
      setCopiedIdx(index);
      window.setTimeout(()=>setCopiedIdx(cur=>cur===index?null:cur),2400);
    }catch{}
  }

  return <section className="content-section content-ceremony reveal">
    <SectionCornerStickers compact/>
    <SectionHeading title={section.title} mark="✧" sticker="wedding-rings" badge="Nghi lễ thiêng liêng"/>
    {note&&<p className="ceremony-note">{text(section.body)}</p>}
    {distinctSides.length>1&&<div className="side-filter-bar" role="group" aria-label="Lọc nghi lễ theo gia đình">
      <button type="button" className={`secondary side-filter-btn${sideFilter==='ALL'?' is-active':''}`} aria-pressed={sideFilter==='ALL'} onClick={()=>setSideFilter('ALL')}>Tất cả nghi lễ</button>
      {distinctSides.map(side=><button type="button" key={side} className={`secondary side-filter-btn${sideFilter===side?' is-active':''}`} aria-pressed={sideFilter===side} onClick={()=>setSideFilter(side)}>{CEREMONY_SIDE_LABELS[side]}</button>)}
    </div>}
    {filtered.length>0&&<div className="ceremony-list">
      {filtered.map((item,index)=>{
        const resolvedMapUrl=item.mapsUrl?.trim()||googleMapsSearchUrl(item.venue,item.address);
        const hasAddress=Boolean(oneLine(item.venue??'')||oneLine(item.address??''));
        const validTime=Boolean(item.time&&!Number.isNaN(Date.parse(item.time)));
        return <article className="ceremony-card" key={`${index}-${item.title}`}>
          {item.side&&<span className={`side-pill side-${item.side.toLowerCase()}`}>{CEREMONY_SIDE_LABELS[item.side]}</span>}
          <h3>{oneLine(item.title)}</h3>
          {item.lead&&<p className="ceremony-lead">{text(item.lead)}</p>}
          {(item.time||item.venue||item.address||item.dressNote)&&<dl className="ceremony-meta">
            {item.time&&<div><dt>Thời gian</dt><dd><time dateTime={item.time}>{date(item.time)}</time></dd></div>}
            {item.venue&&<div><dt>Địa điểm</dt><dd>{oneLine(item.venue)}</dd></div>}
            {item.address&&<div><dt>Địa chỉ</dt><dd>{oneLine(item.address)}</dd></div>}
            {item.dressNote?.trim()&&<div><dt>Trang phục</dt><dd>{oneLine(item.dressNote)}</dd></div>}
          </dl>}
          {item.directions&&<p className="ceremony-directions">{text(item.directions)}</p>}
          {(resolvedMapUrl||hasAddress||validTime)&&<div className="ceremony-actions">
            {resolvedMapUrl&&<a className="button secondary ceremony-action-btn" href={resolvedMapUrl} target="_blank" rel="noreferrer"><Compass size={15} aria-hidden="true"/> <span>Mở chỉ đường ↗</span></a>}
            {hasAddress&&<button type="button" className="secondary ceremony-action-btn" onClick={()=>void copyCeremonyAddress(index,item.venue,item.address)}>{copiedIdx===index?<Check size={15} aria-hidden="true"/>:<Copy size={15} aria-hidden="true"/>} <span>{copiedIdx===index?'Đã chép địa chỉ':'Sao chép địa chỉ'}</span></button>}
            {validTime&&item.time&&<button type="button" className="secondary ceremony-action-btn" onClick={()=>downloadEventIcs({uid:`ceremony-${index}`,title:item.title,start:item.time!,venue:item.venue,address:item.address,description:item.lead,filename:`nghi-le-${index+1}.ics`})}><CalendarPlus size={15} aria-hidden="true"/> <span>Lưu lịch (.ics)</span></button>}
            {validTime&&item.time&&<a className="button secondary ceremony-action-btn" href={googleCalendarUrl({title:item.title,start:item.time,venue:item.venue,address:item.address})} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true"/> <span>Lịch Google ↗</span></a>}
          </div>}
        </article>;
      })}
    </div>}
  </section>;
}

/** Lịch trình: nhóm theo ngày, giờ nổi bật, hỗ trợ lọc Nhà Trai / Nhà Gái; hàng cũ vẫn giữ bố cục cũ. */
function TimelineSection({section}:{section:ContentSection}){
  const structured=(section.payload?.timeline??[]).filter(item=>item.at&&oneLine(item.title));
  const [sideFilter,setSideFilter]=useState<'ALL'|WeddingSide>('ALL');
  if(!structured.length){
    const body=text(section.body).trim();
    if(!section.startsAt&&!body) return null;
    return <section className="content-section content-timeline reveal">
      <SectionCornerStickers compact/>
      <SectionHeading title={section.title} mark="—" sticker="champagne-toast" badge="Dòng thời gian"/>
      {section.startsAt&&<time className="timeline-legacy-time" dateTime={section.startsAt}>{date(section.startsAt)}</time>}
      {body&&<p>{text(section.body)}</p>}
    </section>;
  }
  const sorted=[...structured].sort((left,right)=>new Date(left.at).getTime()-new Date(right.at).getTime());
  const distinctSides=Array.from(new Set(sorted.map(i=>i.side).filter((s):s is WeddingSide=>Boolean(s))));
  const visibleItems=sideFilter==='ALL'?sorted:sorted.filter(item=>item.side===sideFilter||item.side==='JOINT');
  const groups:{day:string;items:TimelineItem[]}[]=[];
  for(const item of visibleItems){
    const day=dayFormat.format(new Date(item.at));
    const last=groups[groups.length-1];
    if(!last||last.day!==day) groups.push({day,items:[item]});
    else last.items.push(item);
  }
  const note=text(section.body).trim();
  return <section className="content-section content-timeline reveal">
    <SectionCornerStickers compact/>
    <SectionHeading title={section.title} mark="—" sticker="champagne-toast" badge="Chương trình buổi lễ"/>
    {note&&<p className="timeline-note">{text(section.body)}</p>}
    {distinctSides.length>1&&<div className="side-filter-bar" role="group" aria-label="Lọc lịch trình theo gia đình">
      <button type="button" className={`secondary side-filter-btn${sideFilter==='ALL'?' is-active':''}`} aria-pressed={sideFilter==='ALL'} onClick={()=>setSideFilter('ALL')}>Toàn bộ chương trình</button>
      {distinctSides.map(side=><button type="button" key={side} className={`secondary side-filter-btn${sideFilter===side?' is-active':''}`} aria-pressed={sideFilter===side} onClick={()=>setSideFilter(side)}>{SIDE_LABELS[side]}</button>)}
    </div>}
    <div className="timeline-groups">
      {groups.map(group=><div className="timeline-group" key={group.day}>
        <p className="timeline-day">{group.day}</p>
        <ol className="timeline-list">
          {group.items.map((item,index)=>{
            const mapLink=item.mapsUrl?.trim()||(item.venue?googleMapsSearchUrl(item.venue,''):'');
            return <li className="timeline-item" key={`${item.at}-${index}`}>
              <div className="timeline-time"><time dateTime={item.at}>{timeFormat.format(new Date(item.at))}</time></div>
              <div className="timeline-content">
                <div className="timeline-title-row">
                  <h3>{oneLine(item.title)}{item.tentative&&<span className="timeline-tentative">Dự kiến</span>}</h3>
                  {item.side&&<span className={`side-pill side-pill-sm side-${item.side.toLowerCase()}`}>{SIDE_LABELS[item.side]}</span>}
                </div>
                {item.note&&<p>{text(item.note)}</p>}
                {item.venue&&<p className="timeline-venue"><MapPin size={13} aria-hidden="true"/> <span>{oneLine(item.venue)}</span></p>}
                <div className="timeline-inline-tools">
                  {mapLink&&<a className="timeline-tool-link" href={mapLink} target="_blank" rel="noreferrer">Chỉ đường ↗</a>}
                  <button type="button" className="timeline-tool-btn" onClick={()=>downloadEventIcs({uid:`timeline-${index}-${item.at}`,title:item.title,start:item.at,venue:item.venue,description:item.note,filename:`moc-lich-trinh-${index+1}.ics`})}>+ Lưu lịch</button>
                </div>
              </div>
            </li>;
          })}
        </ol>
      </div>)}
    </div>
  </section>;
}

/** Trang phục: palette tương tác có tên màu kèm swatch và Cẩm nang lưu ý tinh tế cho khách mời. */
function DressCodeSection({section}:{section:ContentSection}){
  const palette=(section.payload?.palette??[]).filter(color=>oneLine(color.name)&&/^#[0-9a-fA-F]{6}$/.test(color.color??''));
  const tips=(section.payload?.tips??[]).filter(tip=>oneLine(tip.title)&&text(tip.detail).trim());
  const [selectedColor,setSelectedColor]=useState<PaletteColor|null>(null);
  const [copiedHex,setCopiedHex]=useState('');
  const guidance=text(section.body).trim();
  const avoid=section.payload?.avoid?text(section.payload.avoid).trim():'';
  if(!palette.length&&!guidance&&!avoid&&!section.color) return null;

  async function pickColor(item:PaletteColor){
    setSelectedColor(item);
    const hex=item.color.toUpperCase();
    try{
      if(typeof navigator!=='undefined'&&navigator.clipboard){
        await navigator.clipboard.writeText(hex);
        setCopiedHex(hex);
        window.setTimeout(()=>setCopiedHex(cur=>cur===hex?'':cur),2200);
      }
    }catch{}
  }

  return <section className="content-section content-dress-code reveal">
    <SectionCornerStickers compact/>
    <SectionHeading title={section.title} mark="◐" sticker="butterfly-gold" badge="Gợi ý trang phục"/>
    {guidance&&<p className="dress-guidance">{text(section.body)}</p>}
    {palette.length>0
      ?<>
        <ul className="dress-palette">{palette.map((color,index)=>{
          const hex=color.color.toUpperCase();
          const isPicked=selectedColor?.color.toUpperCase()===hex;
          return <li key={`${index}-${color.name}`} className={isPicked?'is-picked':''}>
            <button type="button" className="dress-swatch-btn" onClick={()=>void pickColor(color)} aria-label={`Chọn tông màu ${oneLine(color.name)} (${hex})`}>
              <span className="dress-swatch" style={{backgroundColor:color.color}} aria-hidden="true"/>
              <span className="dress-color-name">{oneLine(color.name)}</span>
              <span className="dress-color-hex">{copiedHex===hex?'Đã chép ✓':hex}</span>
            </button>
          </li>;
        })}</ul>
        {selectedColor&&<p className="dress-swatch-preview" role="status">
          <Sparkles size={15} aria-hidden="true"/>
          <span>Tông <strong>{oneLine(selectedColor.name)}</strong> ({selectedColor.color.toUpperCase()}) rất hài hòa với không gian lễ cưới và giúp lên hình kỷ niệm thật trang nhã.</span>
        </p>}
      </>
      :section.color?<p className="dress-legacy"><span className="dress-swatch" style={{backgroundColor:section.color}} aria-hidden="true"/></p>:null}
    {avoid&&<p className="dress-avoid"><strong>Nên tránh</strong> {avoid}</p>}
    {tips.length>0&&<div className="guest-tips-section" aria-label="Cẩm nang lưu ý dành cho khách mời">
      <h3 className="guest-tips-heading">Lưu ý nhỏ dành cho quý khách</h3>
      <div className="guest-tips-grid">
        {tips.map((tip,index)=><article className="guest-tip-card" key={`${index}-${tip.title}`}>
          <strong>{oneLine(tip.title)}</strong>
          <p>{text(tip.detail)}</p>
        </article>)}
      </div>
    </div>}
  </section>;
}
