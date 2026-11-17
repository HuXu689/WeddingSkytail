'use client';
import {WishFeed} from './wish-feed';
import {SectionCornerStickers,StickerBadge} from './wedding-stickers';
export function ApprovedWishes({slug}:{slug:string}){
 return <section className="wish-book reveal">
  <SectionCornerStickers compact/>
  <div className="wish-book-public-header">
   <StickerBadge sticker="love-letter" label="Lưu bút chúc phúc"/>
   <h2>Sổ lời chúc</h2>
   <p className="field-hint">Những lời chúc trân quý từ gia đình và bạn bè dành cho hai bạn.</p>
  </div>
  <WishFeed scope={{kind:'public',slug}}/>
 </section>;
}
