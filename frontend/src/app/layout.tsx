import type { Metadata } from 'next';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './color-tokens.css';
import './globals.css';
import '@/features/invitation/design.css';
import '@/features/invitation/cinematic.css';
import '@/features/invitation/celebration.css';
import '@/features/invitation/grand-effects.css';
import '@/features/invitation/grand-effects-extra.css';
import '@/features/invitation/luxury-typography.css';
import '@/features/invitation/luxury-experience.css';

export const metadata: Metadata = { title:'Một lời mời · Một câu chuyện',description:'Trân trọng mời bạn chung vui trong ngày hạnh phúc.',robots:{index:false,follow:false},referrer:'no-referrer',openGraph:{title:'Trân trọng kính mời',description:'Một lời mời, một câu chuyện.',type:'website'} };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="vi"><body>{children}<footer>Một lời mời, một câu chuyện · Thông tin phản hồi chỉ dành cho chủ tiệc.</footer></body></html>; }