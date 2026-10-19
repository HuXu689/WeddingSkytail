'use client';
import {useState} from 'react';
import {oneLine,text} from '@/shared/text';
import type {Wish} from './wish-book';
export function ApprovedWishes({wishes}:{wishes:Wish[]}){
 const [visible,setVisible]=useState(6);
 if(!wishes.length)return null;
 return <section className="wish-book"><h2>Sổ lời chúc</h2><div className="wish-list">{wishes.slice(0,visible).map((wish,index)=><blockquote className="wish-item" key={wish.id??index}><p>{text(wish.message)}</p><cite>{oneLine(wish.display_name)}</cite></blockquote>)}</div>{visible<wishes.length&&<button type="button" className="secondary" onClick={()=>setVisible(count=>count+6)}>Xem thêm lời chúc ({wishes.length-visible})</button>}</section>;
}