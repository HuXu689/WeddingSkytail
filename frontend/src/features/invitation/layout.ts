export const layoutKeys=['MUSIC','COUNTDOWN','STORY','CONTENT','ALBUM','THANKS'] as const;
export type LayoutKey=typeof layoutKeys[number];
export interface LayoutItem {section:LayoutKey;enabled:boolean}
export const defaultLayout:LayoutItem[]=layoutKeys.map(section=>({section,enabled:true}));
/** Older payloads retain their original order; malformed layouts fail back to defaults. */
export function normalizedLayout(layout?:LayoutItem[]):LayoutItem[]{
 if(!layout||layout.length!==layoutKeys.length||new Set(layout.map(item=>item?.section)).size!==layoutKeys.length||layout.some(item=>!layoutKeys.includes(item?.section)||typeof item.enabled!=='boolean'))return defaultLayout.map(item=>({...item}));
 return layout;
}