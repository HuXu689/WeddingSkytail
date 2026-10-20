import type {ReactNode} from 'react';

/** Native keyboard semantics; children stay mounted so closing never discards a draft. */
export function GuestDisclosure({title,hint,children,id}:{title:string;hint?:string;children:ReactNode;id?:string}){
 return <details id={id} className="guest-disclosure">
  <summary><span className="guest-disclosure-copy"><span className="guest-disclosure-title">{title}</span>{hint&&<span className="guest-disclosure-hint">{hint}</span>}</span><span className="guest-disclosure-mark" aria-hidden="true">+</span></summary>
  <div className="guest-disclosure-body">{children}</div>
 </details>;
}