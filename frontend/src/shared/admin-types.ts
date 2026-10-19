export type PolicyMode = 'INHERIT' | 'MANUAL_OPEN' | 'MANUAL_CLOSED' | 'SCHEDULED';
export interface Policy { mode: PolicyMode; open_at: string | null; close_at: string | null; version: number }
export interface Wedding extends Policy { draft_names: string; draft_message: string; names: string; message: string; published: boolean; tracking: boolean; draft_theme: import('@/features/invitation/design').Theme; draft_accent: import('@/features/invitation/design').Accent; draft_story: string; draft_footer: string; draft_show_story: boolean; draft_music_id: string|null; draft_show_countdown: boolean; show_countdown: boolean; musicUrl: string|null; heroUrl: string|null; heroPosition?: string|null; albumUrls: string[] }
export interface WeddingEvent { id: string; event_code: string; title: string; start_at: string; deadline: string; timezone: string; venue: string; address: string; capacity: number; state: 'DRAFT'|'PUBLISHED'|'CANCELLED'; version: number; maps_url: string|null; dress_code: string|null; parking: string|null; note: string; change_notice: string|null; cancel_reason: string|null; revision: number }
export type AccessState = 'OPEN'|'NOT_YET_OPEN'|'CLOSED_SCHEDULE'|'CLOSED_MANUAL'|'CLOSED_GLOBAL'|'REVOKED';
export type OpenFilter = ''|'NO_OPEN'|'OPENED'|'OPENED_NO_RESPONSE'|'SCHEDULED_UPCOMING';
/** Reminder worklist (FR21): the owner copies a message by hand; the list never mixes with open tracking. */
export interface ReminderEvent { id:string; title:string; start_at:string; deadline:string; timezone:string }
export interface ReminderRow { invitation_id:string; display_name:string; group_name:string; salutation:string; internal_note:string; assigned_events:string|null; first_opened_at:string|null; last_opened_at:string|null; open_count:number; reminder_note:string; contacted_at:string|null; contacted_by:string|null; message:string }
export interface ReminderWorklist { event:ReminderEvent; events:ReminderEvent[]; filter:string; generatedAt:string; counts:{unanswered:number;no_open:number;opened_no_response:number;contacted:number}; rows:ReminderRow[] }
/** Wish book moderation (T24): guests write, the owner decides, only approved wishes become public. */
export interface WishRow { id:string; display_name:string; message:string; state:'PENDING'|'APPROVED'|'REJECTED'; created_at:string; moderated_at:string|null; moderated_by:string|null; revision:number; invitation_id:string; invitation_name:string; group_name:string; assigned_events:string|null }
export interface WishQueue { counts:{pending:number;approved:number;rejected:number}; rows:WishRow[] }
/** T25: two roles. OWNER keeps every right; EDITOR never sees credentials, link/PIN secrets or exports. */
export type AdminRole = 'OWNER'|'EDITOR';
export interface AdminUser { username:string; role:AdminRole; display_name:string; enabled:boolean; created_at:string; created_by:string|null }
export interface Me { username:string; role:AdminRole }
export interface Invitation extends Policy { id: string; display_name: string; group_name: string; salutation: string; internal_note: string; archived: boolean; active: boolean; sent: boolean; first_opened_at: string|null; last_opened_at: string|null; access_state: AccessState; server_now: string; open_count: number; pin_enabled: boolean; assigned_events: string|null; confirmed_people: number; attending_events: number; declined_events: number; version:number }
export interface LinkStats { open_parties: number; closed_global: number; closed_manual: number; closed_schedule: number; not_yet_open: number; revoked_parties: number; no_open_record: number; opened_record: number; openedNoResponse: number|null; serverNow: string }
export interface Summary { id: string; title: string; capacity: number; confirmed_people: number; invited_parties: number; unanswered: number; attending: number; declined: number }
export interface ResponseRow { invitation_id:string; event_id:string; display_name: string; title: string; status: string; total_people: number; note: string; version:number; updated_at: string }
export interface RsvpHistoryRow { id:number; status:string; total_people:number; note:string; version:number; changed_by:string; change_reason:string; created_at:string }
export interface AuditRow { id: number; action: string; target: string; created_at: string }