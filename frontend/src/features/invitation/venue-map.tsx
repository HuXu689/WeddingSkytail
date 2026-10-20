'use client';
import {useState} from 'react';
import type {EventCoordinates} from '@/shared/invitation-features';
import {venueMap} from '@/shared/venue-map';

/** Remount on location changes: consent and loading state never carry into another venue. */
export function VenueMap(props:EventCoordinates&{venue:string;address:string}){
 return <VenueMapContent key={`${props.latitude}:${props.longitude}:${props.venue}:${props.address}`} {...props}/>;
}
function VenueMapContent({venue,address,...coordinates}:EventCoordinates&{venue:string;address:string}){
 const [consent,setConsent]=useState(false),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false);
 const map=venueMap(coordinates);
 return <section className="venue-map" aria-label={`Bản đồ ${venue}`}>
  <div className="venue-map-address"><strong>{venue}</strong><p>{address}</p></div>
  {map?<>
   {!consent?<div className="venue-map-placeholder"><p>Bản đồ OpenStreetMap chỉ tải khi bạn đồng ý. Dịch vụ này sẽ nhận địa chỉ IP của bạn; website không yêu cầu vị trí thiết bị.</p><button type="button" className="secondary" onClick={()=>setConsent(true)}>Đồng ý tải bản đồ</button></div>:<>
    <div className="venue-map-frame"><iframe key={attempt} src={map.embed} title={`Vị trí ${venue} trên OpenStreetMap`} loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)}/></div>
    <p className="field-hint" role="status">{loaded?'Nếu bản đồ không hiển thị, bạn vẫn có thể mở chỉ đường bên dưới.':'Đã yêu cầu tải bản đồ. Nếu mạng hoặc trình duyệt chặn, hãy dùng địa chỉ hoặc mở chỉ đường bên dưới.'}</p>
    <div className="row"><button type="button" className="secondary" onClick={()=>{setLoaded(false);setAttempt(value=>value+1);}}>Thử tải lại bản đồ</button><button type="button" className="secondary" onClick={()=>{setConsent(false);setLoaded(false);}}>Ẩn bản đồ</button></div>
   </>}
   <p className="field-hint">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p>
   <a className="button secondary" href={map.directions} target="_blank" rel="noreferrer">Mở chỉ đường ↗</a>
  </>:<><p className="field-hint">Chưa có vị trí bản đồ được xác nhận. Vui lòng đối chiếu địa chỉ trước khi đi.</p><a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Mở bản đồ địa chỉ ↗</a></>}
 </section>;
}