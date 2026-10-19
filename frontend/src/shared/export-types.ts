export type ExportLabelStyle='QR_ONLY'|'NAME_QR';
export interface ExportRow { rowNumber:number; invitationId:string; displayName:string; qrUrl:string; eventSummary:string }
export interface ExportPreview { id:string; format:'CSV'|'PDF'; labelStyle:ExportLabelStyle; rowCount:number; pageCount:number; expiresAt:string; rows:ExportRow[] }