import {oneLine} from '@/shared/text';

export interface PublicGuestGreeting {
  guestName: string;
  salutation: string;
  openCeremony: boolean;
}

const DEFAULT_SALUTATION = 'Trân trọng kính mời';

/**
 * Đọc tham số cá nhân hóa trên thiệp công khai (/w/[slug]?guest=...&salutation=...).
 * Chỉ phục vụ hiển thị lời chào trang trọng trên phong bì & bìa thiệp chung,
 * hoàn toàn tách biệt với quyền truy cập bảo mật của lời mời riêng (/i/[token]).
 */
export function parsePublicGuestGreeting(search: string): PublicGuestGreeting | null {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const rawGuest = params.get('guest') ?? params.get('khach') ?? params.get('to') ?? '';
  const rawSalutation = params.get('salutation') ?? params.get('xungho') ?? '';
  const ceremonyFlag = params.get('ceremony') === '1' || params.get('envelope') === '1';

  const guestName = oneLine(rawGuest).slice(0, 90);
  const salutation = oneLine(rawSalutation).slice(0, 50) || DEFAULT_SALUTATION;

  if (!guestName && !ceremonyFlag) return null;
  return {
    guestName,
    salutation,
    openCeremony: Boolean(guestName) || ceremonyFlag,
  };
}

export function buildPersonalizedPublicUrl(
  origin: string,
  slug: string,
  guestName: string,
  salutation = DEFAULT_SALUTATION
): string {
  const base = `${origin.replace(/\/$/, '')}/w/${encodeURIComponent(slug)}`;
  const cleanName = oneLine(guestName).slice(0, 90);
  const cleanSalutation = oneLine(salutation).slice(0, 50) || DEFAULT_SALUTATION;
  if (!cleanName) return base;
  const query = new URLSearchParams();
  query.set('guest', cleanName);
  if (cleanSalutation !== DEFAULT_SALUTATION) {
    query.set('salutation', cleanSalutation);
  }
  return `${base}?${query.toString()}`;
}

export function buildQuickInviteMessage(params: {
  coupleNames: string;
  guestName: string;
  salutation?: string;
  url: string;
}): string {
  const salutation = oneLine(params.salutation || DEFAULT_SALUTATION);
  const guest = oneLine(params.guestName) || 'bạn và gia đình';
  const couple = oneLine(params.coupleNames) || 'chúng mình';
  return `${salutation} ${guest} cùng xem thiệp cưới trực tuyến và chia sẻ niềm vui trong ngày trọng đại của ${couple} tại: ${params.url}`;
}
