export function imageIndex(index:number,length:number):number {
 return length>0?((index%length)+length)%length:0;
}

/** Next four photographs, without repeating the main photograph. */
export function secondaryImages(active:number,length:number):number[] {
 return Array.from({length:Math.min(4,Math.max(0,length-1))},(_,offset)=>imageIndex(active+offset+1,length));
}