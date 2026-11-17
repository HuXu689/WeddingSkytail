export function imageIndex(index:number,length:number):number {
 return length>0?((index%length)+length)%length:0;
}

/** Next four photographs, without repeating the main photograph. */
export function secondaryImages(active:number,length:number):number[] {
 return Array.from({length:Math.min(4,Math.max(0,length-1))},(_,offset)=>imageIndex(active+offset+1,length));
}

/** Derive fast cached thumbnail URL for media assets when applicable, preserving synthetic/external URLs. */
export function albumThumbUrl(url:string):string {
 const pub=url.match(/^(\/media\/[0-9a-fA-F-]+)\.jpg$/);
 if(pub)return `${pub[1]}-thumb.jpg`;
 const admin=url.match(/^(\/api\/v1\/admin\/media\/[0-9a-fA-F-]+)\/content$/);
 if(admin)return `${admin[1]}/thumb`;
 return url;
}

export function albumPageCount(total:number,perPage:number):number {
 return total>0&&perPage>0?Math.ceil(total/perPage):0;
}

export function albumPageSlice(total:number,page:number,perPage:number):number[] {
 const pages=albumPageCount(total,perPage);
 if(pages===0)return [];
 const safePage=Math.max(0,Math.min(page,pages-1));
 const start=safePage*perPage;
 const end=Math.min(total,start+perPage);
 return Array.from({length:end-start},(_,offset)=>start+offset);
}

/** Up to `windowSize` indices centered around `active` without duplicates, for large lightbox filmstrips. */
export function lightboxFilmstrip(active:number,length:number,windowSize=9):number[] {
 if(length<=0)return [];
 const count=Math.min(length,Math.max(1,windowSize));
 if(length<=count)return Array.from({length},(_,i)=>i);
 const half=Math.floor(count/2);
 let start=active-half;
 if(start<0)start=0;
 if(start+count>length)start=length-count;
 return Array.from({length:count},(_,offset)=>start+offset);
}
