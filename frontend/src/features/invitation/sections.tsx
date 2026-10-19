import {date} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
export interface ContentSection {kind:'INTRO'|'FAMILY'|'CEREMONY'|'TIMELINE'|'DRESS_CODE';audience:'PUBLIC'|'PRIVATE';enabled:boolean;title:string;body:string;startsAt:string|null;color:string|null}
export function ContentSections({sections}:{sections:ContentSection[]}){
 return <>{sections.filter(section=>section.enabled).map((section,index)=><section className={`content-section content-${section.kind.toLowerCase()}`} key={index}>
  {section.kind==='TIMELINE'&&section.startsAt&&<time dateTime={section.startsAt}>{date(section.startsAt)}</time>}
  <h2>{oneLine(section.title)}</h2>
  {section.kind==='DRESS_CODE'&&section.color&&<span className="dress-swatch" style={{backgroundColor:section.color}} aria-hidden="true"/>}
  <p>{text(section.body)}</p>
 </section>)}</>;
}