'use client';
import {WishFeed} from './wish-feed';
export function ApprovedWishes({slug}:{slug:string}){
 return <section className="wish-book"><h2>Sổ lời chúc</h2><WishFeed scope={{kind:'public',slug}}/></section>;
}