/** F03 wire contract: deliberately excludes invitation/event/author and moderation metadata. */
export interface ApprovedWishItem {
 pinned:boolean;
 id:string;
 display_name:string;
 message:string;
 created_at:string;
}
export interface ApprovedWishPage {
 items:ApprovedWishItem[];
 nextCursor:string|null;
}
/** Optional on old fixtures/responses; both absent means no confirmed marker. */
export interface EventCoordinates {latitude?:number|null;longitude?:number|null}
export interface EventLocationInput {
 latitude:number|null;
 longitude:number|null;
 confirmed:boolean;
 changeNotice:string|null;
 expectedVersion:number;
}
/** Images are resolved via scope-specific gated routes, never /media URLs. */
export interface GiftRecipient {label:string;description:string;assetId:string|null}
export interface GiftSettings {
 enabled:boolean;
 mode:'SINGLE'|'DUAL';
 visibility:'PRIVATE'|'PUBLIC';
 first:GiftRecipient;
 second:GiftRecipient;
 revision:number;
}
export interface GiftConfiguration {draft:GiftSettings;published:GiftSettings}
export interface GiftInput extends Omit<GiftSettings,'revision'> {expectedRevision:number}
export interface GiftPublishInput {expectedRevision:number;expectedPublishedRevision:number;confirmed:boolean}
export interface GiftView {enabled:boolean;mode:'SINGLE'|'DUAL';recipients:GiftRecipient[]}
export type WishFeedScope={kind:'public';slug:string}|{kind:'guest';invitationId:string};
export function approvedWishPath(scope:WishFeedScope,cursor:string|null=null):string{
 const base=scope.kind==='public'
  ?`/public/weddings/${encodeURIComponent(scope.slug)}/wishes`
  :`/guest/invitations/${encodeURIComponent(scope.invitationId)}/approved-wishes`;
 return cursor===null?base:`${base}?cursor=${encodeURIComponent(cursor)}`;
}