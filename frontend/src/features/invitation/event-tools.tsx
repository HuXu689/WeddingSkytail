'use client';
import {useState} from 'react';

/** Map is a user-initiated external navigation, never an arbitrary iframe/proxy. */
export function EventTools({start,timezone,address}:{start:string;timezone:string;address:string}){
 const [expanded,setExpanded]=useState(false);
 const day=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',timeZone:timezone}).format(new Date(start));
 const month=new Intl.DateTimeFormat('vi-VN',{month:'long',year:'numeric',timeZone:timezone}).format(new Date(start));
 return <details className="event-tools" onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Lịch ngày tiệc và bản đồ</summary>{expanded&&<div><div className="mini-calendar"><strong>{day}</strong><span>{month}</span></div><a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Mở bản đồ địa chỉ ↗</a><p className="field-hint">Bản đồ chỉ mở ở dịch vụ bên ngoài khi bạn bấm; website không tải bản đồ theo dõi trong nền.</p></div>}</details>;
}