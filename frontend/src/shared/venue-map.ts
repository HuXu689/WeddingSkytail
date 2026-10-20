import type {EventCoordinates} from './invitation-features';
/** Only explicit coordinates can become an embed. No URL, address or invitation credential is embedded. */
export function venueMap(coordinates:EventCoordinates){
 const {latitude:lat,longitude:lng}=coordinates;
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat< -90||lat>90||lng< -180||lng>180)return null;
 const query=new URLSearchParams({bbox:[Math.max(-180,lng-.008),Math.max(-90,lat-.005),Math.min(180,lng+.008),Math.min(90,lat+.005)].join(','),layer:'mapnik',marker:`${lat},${lng}`});
 return {embed:`https://www.openstreetmap.org/export/embed.html?${query}`,external:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,directions:`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`};
}
export function parseCoordinates(latitude:string,longitude:string):EventCoordinates{
 const lat=latitude.trim(),lng=longitude.trim();
 if(!lat&&!lng)return {latitude:null,longitude:null};
 if(!lat||!lng)throw new Error('Nhập đủ vĩ độ và kinh độ hoặc để trống cả hai để tắt bản đồ.');
 const coordinates={latitude:Number(lat),longitude:Number(lng)};
 if(!venueMap(coordinates))throw new Error('Vĩ độ từ −90 đến 90; kinh độ từ −180 đến 180.');
 return coordinates;
}