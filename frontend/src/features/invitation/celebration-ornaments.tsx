/** Pure decoration: deterministic markup, no timers or pointer listeners.
 *  Enhanced with more ornaments: golden chains, floral borders, diamond accents.
 */
export function CelebrationOrnaments(){
 return <div className="celebration-ornaments" aria-hidden="true">
  <div className="celebration-halo"/>
  {/* Second halo on opposite side */}
  <div className="celebration-halo celebration-halo-alt"/>
  <svg className="celebration-corner corner-start" viewBox="0 0 180 180" fill="none">
   <path d="M12 168V12h156M22 140V22h118M36 110C36 64 64 36 110 36M36 90C64 90 90 64 90 36"/>
   <path d="M36 110C16 86 21 65 36 61C51 65 56 86 36 110ZM61 36C65 21 86 16 110 36C86 56 65 51 61 36Z"/>
   <path d="m36 27 9 9-9 9-9-9 9-9Zm86-15 5 8-5 8-5-8 5-8ZM12 122l8-5 8 5-8 5-8-5Z"/>
  </svg>
  <svg className="celebration-corner corner-end" viewBox="0 0 180 180" fill="none">
   <path d="M12 168V12h156M22 140V22h118M36 110C36 64 64 36 110 36M36 90C64 90 90 64 90 36"/>
   <path d="M36 110C16 86 21 65 36 61C51 65 56 86 36 110ZM61 36C65 21 86 16 110 36C86 56 65 51 61 36Z"/>
  </svg>
  {/* Top-right corner */}
  <svg className="celebration-corner corner-top-right" viewBox="0 0 180 180" fill="none">
   <path d="M168 168V12H12M158 140V22H40M144 110C144 64 116 36 70 36M144 90C116 90 90 64 90 36"/>
   <path d="M144 110C164 86 159 65 144 61C129 65 124 86 144 110ZM119 36C115 21 94 16 70 36C94 56 115 51 119 36Z"/>
  </svg>
  {/* Bottom-left corner */}
  <svg className="celebration-corner corner-bottom-left" viewBox="0 0 180 180" fill="none">
   <path d="M168 12V168H12M158 40V158H40M144 70C144 116 116 144 70 144M144 90C116 90 90 116 90 144"/>
   <path d="M144 70C164 94 159 115 144 119C129 115 124 94 144 70ZM119 144C115 159 94 164 70 144C94 124 115 129 119 144Z"/>
  </svg>
  {/* Golden chain decorations along the edges */}
  <div className="celebration-chain chain-top"/>
  <div className="celebration-chain chain-bottom"/>
  {/* Diamond accents */}
  <div className="celebration-diamonds">
   {Array.from({length: 6}, (_, i) => <span key={`diamond-${i}`} className="celebration-diamond"/>)}
  </div>
  {/* Floral vine SVG running along sides */}
  <svg className="celebration-vine vine-left" viewBox="0 0 40 600" fill="none">
   <path d="M20 0 C20 50, 10 80, 20 120 S30 160, 20 200 S10 240, 20 280 S30 320, 20 360 S10 400, 20 440 S30 480, 20 520 S10 560, 20 600"/>
   <circle cx="15" cy="80" r="4"/><circle cx="25" cy="160" r="3"/>
   <circle cx="15" cy="240" r="4"/><circle cx="25" cy="320" r="3"/>
   <circle cx="15" cy="400" r="4"/><circle cx="25" cy="480" r="3"/>
   <path d="M20 80 C10 70, 5 75, 8 85M20 160 C30 150, 35 155, 32 165M20 240 C10 230, 5 235, 8 245M20 320 C30 310, 35 315, 32 325M20 400 C10 390, 5 395, 8 405M20 480 C30 470, 35 475, 32 485"/>
  </svg>
  <svg className="celebration-vine vine-right" viewBox="0 0 40 600" fill="none">
   <path d="M20 0 C20 50, 30 80, 20 120 S10 160, 20 200 S30 240, 20 280 S10 320, 20 360 S30 400, 20 440 S10 480, 20 520 S30 560, 20 600"/>
   <circle cx="25" cy="80" r="4"/><circle cx="15" cy="160" r="3"/>
   <circle cx="25" cy="240" r="4"/><circle cx="15" cy="320" r="3"/>
   <circle cx="25" cy="400" r="4"/><circle cx="15" cy="480" r="3"/>
   <path d="M20 80 C30 70, 35 75, 32 85M20 160 C10 150, 5 155, 8 165M20 240 C30 230, 35 235, 32 245M20 320 C10 310, 5 315, 8 325M20 400 C30 390, 35 395, 32 405M20 480 C10 470, 5 475, 8 485"/>
  </svg>
  <div className="celebration-sparks">{Array.from({length:12},(_,index)=><span key={index}/>)}</div>
 </div>;
}
