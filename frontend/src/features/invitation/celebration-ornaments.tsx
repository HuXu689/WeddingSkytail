/** Pure decoration: deterministic markup, no timers or pointer listeners. */
export function CelebrationOrnaments(){
 return <div className="celebration-ornaments" aria-hidden="true">
  <div className="celebration-halo"/>
  <svg className="celebration-corner corner-start" viewBox="0 0 180 180" fill="none">
   <path d="M12 168V12h156M22 140V22h118M36 110C36 64 64 36 110 36M36 90C64 90 90 64 90 36"/>
   <path d="M36 110C16 86 21 65 36 61C51 65 56 86 36 110ZM61 36C65 21 86 16 110 36C86 56 65 51 61 36Z"/>
   <path d="m36 27 9 9-9 9-9-9 9-9Zm86-15 5 8-5 8-5-8 5-8ZM12 122l8-5 8 5-8 5-8-5Z"/>
  </svg>
  <svg className="celebration-corner corner-end" viewBox="0 0 180 180" fill="none">
   <path d="M12 168V12h156M22 140V22h118M36 110C36 64 64 36 110 36M36 90C64 90 90 64 90 36"/>
   <path d="M36 110C16 86 21 65 36 61C51 65 56 86 36 110ZM61 36C65 21 86 16 110 36C86 56 65 51 61 36Z"/>
  </svg>
  <div className="celebration-sparks">{Array.from({length:8},(_,index)=><span key={index}/>)}</div>
 </div>;
}