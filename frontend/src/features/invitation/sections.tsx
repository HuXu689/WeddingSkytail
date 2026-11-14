import {date} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import {WeddingIllustration} from './wedding-illustration';

/**
 * Nội dung 5 phần tùy chọn của thiệp. `payload` là dữ liệu có cấu trúc (content schema 2);
 * hàng cũ không có payload vẫn render từ title/body/startsAt/color như trước.
 * Việc lọc audience=PRIVATE do server quyết định — component này chỉ hiển thị dữ liệu đã được cấp.
 */
export interface IntroPerson { name:string; role?:string; note?:string }
export interface FamilyMember { name:string; note?:string }
export interface FamilyGroup { label?:string; members:FamilyMember[] }
export interface CeremonyItem { title:string; lead?:string; time?:string|null; venue?:string; address?:string; directions?:string }
export interface TimelineItem { at:string; title:string; note?:string; venue?:string; audience:'PUBLIC'|'PRIVATE'; tentative?:boolean }
export interface PaletteColor { name:string; color:string }
export interface SectionPayload {
  people?:IntroPerson[];
  groups?:FamilyGroup[];
  items?:CeremonyItem[];
  timeline?:TimelineItem[];
  palette?:PaletteColor[];
  avoid?:string;
}
export interface ContentSection {kind:'INTRO'|'FAMILY'|'CEREMONY'|'TIMELINE'|'DRESS_CODE';audience:'PUBLIC'|'PRIVATE';enabled:boolean;title:string;body:string;startsAt:string|null;color:string|null;payload?:SectionPayload|null}

/** Mốc lịch trình dùng giờ Việt Nam như ô nhập của editor; không tự suy ra múi giờ khác. */
const TIME_ZONE='Asia/Ho_Chi_Minh';
const dayFormat=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'long',timeZone:TIME_ZONE});
const timeFormat=new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:TIME_ZONE});

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

function SectionHeading({title,mark}:{title:string;mark:string}){
  return <header className="invitation-section-heading"><span className="invitation-section-mark" aria-hidden="true"><WeddingIllustration kind={mark==='❧'?'flower':mark==='✧'?'rings':mark==='✦'?'heart':'spark'}/></span><h2>{oneLine(title)}</h2></header>;
}

/** Giới thiệu hai bạn: chân dung bằng typography, nhịp lệch nhẹ trên desktop. */
function IntroSection({section}:{section:ContentSection}){
  const people=(section.payload?.people??[]).filter(person=>oneLine(person.name));
  const lead=text(section.body).trim();
  if(!people.length&&!lead) return null;
  return <section className="content-section content-intro reveal">
    <SectionHeading title={section.title} mark="✦"/>
    {lead&&<p className="intro-lead">{text(section.body)}</p>}
    {people.length>0&&<div className={`intro-people count-${Math.min(people.length,2)}`}>
      {people.map((person,index)=><article className="intro-person" key={`${index}-${person.name}`}>
        <h3 className="intro-person-name">{oneLine(person.name)}</h3>
        {person.role&&<p className="intro-person-role">{oneLine(person.role)}</p>}
        {person.note&&<p className="intro-person-note">{text(person.note)}</p>}
      </article>)}
    </div>}
  </section>;
}

/** Gia đình: hai khối đối ứng, nhãn nhóm nhỏ, không mặc định đủ cha/mẹ. */
function FamilySection({section}:{section:ContentSection}){
  const groups=(section.payload?.groups??[])
    .map(group=>({label:group.label?oneLine(group.label):'',members:(group.members??[]).filter(member=>oneLine(member.name))}))
    .filter(group=>group.label||group.members.length);
  const lead=text(section.body).trim();
  if(!groups.length&&!lead) return null;
  return <section className="content-section content-family reveal">
    <SectionHeading title={section.title} mark="❧"/>
    {lead&&<p className="family-lead">{text(section.body)}</p>}
    {groups.length>0&&<div className={`family-groups count-${Math.min(groups.length,2)}`}>
      {groups.map((group,index)=><div className="family-group" key={`${index}-${group.label}`}>
        {group.label&&<h3 className="family-group-label">{group.label}</h3>}
        <ul className="family-members">
          {group.members.map((member,memberIndex)=><li key={`${memberIndex}-${member.name}`}>
            <span className="family-member-name">{oneLine(member.name)}</span>
            {member.note&&<span className="family-member-note">{oneLine(member.note)}</span>}
          </li>)}
        </ul>
      </div>)}
    </div>}
  </section>;
}

/** Nghi lễ: thiệp giấy nhẹ, mỗi nghi lễ một khối; nội dung đã được server lọc theo quyền. */
function CeremonySection({section}:{section:ContentSection}){
  const items=(section.payload?.items??[]).filter(item=>oneLine(item.title));
  const note=text(section.body).trim();
  if(!items.length&&!note) return null;
  return <section className="content-section content-ceremony reveal">
    <SectionHeading title={section.title} mark="✧"/>
    {note&&<p className="ceremony-note">{text(section.body)}</p>}
    {items.length>0&&<div className="ceremony-list">
      {items.map((item,index)=><article className="ceremony-card" key={`${index}-${item.title}`}>
        <h3>{oneLine(item.title)}</h3>
        {item.lead&&<p className="ceremony-lead">{text(item.lead)}</p>}
        {(item.time||item.venue||item.address)&&<dl className="ceremony-meta">
          {item.time&&<div><dt>Thời gian</dt><dd>{date(item.time)}</dd></div>}
          {item.venue&&<div><dt>Địa điểm</dt><dd>{oneLine(item.venue)}</dd></div>}
          {item.address&&<div><dt>Địa chỉ</dt><dd>{oneLine(item.address)}</dd></div>}
        </dl>}
        {item.directions&&<p className="ceremony-directions">{text(item.directions)}</p>}
      </article>)}
    </div>}
  </section>;
}

/** Lịch trình: nhóm theo ngày, giờ nổi bật; hàng cũ chỉ có starts_at vẫn giữ bố cục cũ. */
function TimelineSection({section}:{section:ContentSection}){
  const structured=(section.payload?.timeline??[]).filter(item=>item.at&&oneLine(item.title));
  if(!structured.length){
    const body=text(section.body).trim();
    if(!section.startsAt&&!body) return null;
    return <section className="content-section content-timeline reveal">
      <SectionHeading title={section.title} mark="—"/>
      {section.startsAt&&<time className="timeline-legacy-time" dateTime={section.startsAt}>{date(section.startsAt)}</time>}
      {body&&<p>{text(section.body)}</p>}
    </section>;
  }
  const sorted=[...structured].sort((left,right)=>new Date(left.at).getTime()-new Date(right.at).getTime());
  const groups:{day:string;items:TimelineItem[]}[]=[];
  for(const item of sorted){
    const day=dayFormat.format(new Date(item.at));
    const last=groups[groups.length-1];
    if(!last||last.day!==day) groups.push({day,items:[item]});
    else last.items.push(item);
  }
  const note=text(section.body).trim();
  return <section className="content-section content-timeline reveal">
    <SectionHeading title={section.title} mark="—"/>
    {note&&<p className="timeline-note">{text(section.body)}</p>}
    <div className="timeline-groups">
      {groups.map(group=><div className="timeline-group" key={group.day}>
        <p className="timeline-day">{group.day}</p>
        <ol className="timeline-list">
          {group.items.map((item,index)=><li className="timeline-item" key={`${item.at}-${index}`}>
            <div className="timeline-time"><time dateTime={item.at}>{timeFormat.format(new Date(item.at))}</time></div>
            <div className="timeline-content">
              <h3>{oneLine(item.title)}{item.tentative&&<span className="timeline-tentative">Dự kiến</span>}</h3>
              {item.note&&<p>{text(item.note)}</p>}
              {item.venue&&<p className="timeline-venue">{oneLine(item.venue)}</p>}
            </div>
          </li>)}
        </ol>
      </div>)}
    </div>
  </section>;
}

/** Trang phục: palette có tên màu kèm swatch; không truyền nghĩa chỉ bằng màu. */
function DressCodeSection({section}:{section:ContentSection}){
  const palette=(section.payload?.palette??[]).filter(color=>oneLine(color.name)&&/^#[0-9a-fA-F]{6}$/.test(color.color??''));
  const guidance=text(section.body).trim();
  const avoid=section.payload?.avoid?text(section.payload.avoid).trim():'';
  if(!palette.length&&!guidance&&!avoid&&!section.color) return null;
  return <section className="content-section content-dress-code reveal">
    <SectionHeading title={section.title} mark="◐"/>
    {guidance&&<p className="dress-guidance">{text(section.body)}</p>}
    {palette.length>0
      ?<ul className="dress-palette">{palette.map((color,index)=><li key={`${index}-${color.name}`}>
        <span className="dress-swatch" style={{backgroundColor:color.color}} aria-hidden="true"/>
        <span className="dress-color-name">{oneLine(color.name)}</span>
        <span className="dress-color-hex">{color.color.toUpperCase()}</span>
      </li>)}</ul>
      :section.color?<p className="dress-legacy"><span className="dress-swatch" style={{backgroundColor:section.color}} aria-hidden="true"/></p>:null}
    {avoid&&<p className="dress-avoid"><strong>Nên tránh</strong> {avoid}</p>}
  </section>;
}
