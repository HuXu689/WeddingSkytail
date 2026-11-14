export type WeddingIllustrationKind='rings'|'heart'|'flower'|'spark';

/** Small inline illustrations keep the invitation independent of animation CDNs. */
export function WeddingIllustration({kind='rings'}:{kind?:WeddingIllustrationKind}){
 return <svg className={`wedding-illustration illustration-${kind}`} viewBox="0 0 100 80" fill="none" aria-hidden="true" focusable="false">
  <g className="illustration-drawing" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
   {kind==='rings'?<><circle cx="37" cy="45" r="21"/><circle cx="63" cy="45" r="21"/><path d="m54 22 9-12 9 12-9 9-9-9Zm0 0h18M63 10v21"/></>:
    kind==='heart'?<><path d="M50 65 21 39C4 19 31 4 50 25 69 4 96 19 79 39L50 65Z"/><path d="M25 29c0-6 6-9 11-6M50 73v3"/></>:
    kind==='flower'?<><path d="M50 72V41M50 62C25 65 19 49 23 44c14-2 25 5 27 18ZM50 56c25 3 31-13 27-18-14-2-25 5-27 18Z"/><path d="M50 42C22 41 24 20 38 22 32 1 52 0 57 18 75 4 87 24 67 34 81 46 62 55 50 42Z"/><circle cx="52" cy="30" r="6"/></>:
    <><path d="m50 10 9 22 23 8-23 8-9 22-9-22-23-8 23-8 9-22Z"/><path d="m79 10 3 7 8 3-8 3-3 7-3-7-8-3 8-3 3-7Z"/></>}
  </g>
  <g className="illustration-glints" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 11v8m-4-4h8M87 57v10m-5-5h10"/></g>
 </svg>;
}