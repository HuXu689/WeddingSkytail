/** Reset presentation only, never names, copy, media, music or event assignments. */
export function resetPresentation<T extends {theme:string;accent:string}>(design:T):T {
 return {...design,theme:'ELEGANT',accent:'OLIVE'};
}