'use client';
import {useState} from 'react';
import type {EventCoordinates} from '@/shared/invitation-features';
import {VenueMap} from './venue-map';

/** Calendar and map are scoped to this invited event; embed needs separate explicit consent. */
export function EventTools({start,timezone,address,venue,...coordinates}:{start:string;timezone:string;address:string;venue:string}&EventCoordinates){
 const [expanded,setExpanded]=useState(false);
 const day=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',timeZone:timezone}).format(new Date(start));
 const month=new Intl.DateTimeFormat('vi-VN',{month:'long',year:'numeric',timeZone:timezone}).format(new Date(start));
 return <details className="event-tools" onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Lịch ngày tiệc và bản đồ</summary>{expanded&&<div><div className="mini-calendar"><strong>{day}</strong><span>{month}</span></div><VenueMap venue={venue} address={address} {...coordinates}/></div>}</details>;
}