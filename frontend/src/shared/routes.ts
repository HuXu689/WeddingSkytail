/**
 * Quy tắc "menu đang mở" dùng chung cho sidebar quản trị (UI-002).
 *
 * - `/admin` chỉ sáng khi đúng trang tổng quan, không sáng ở mọi trang con.
 * - Các mục khác vẫn sáng khi khách đang ở route con của chính nó
 *   (ví dụ `/admin/invitations/bulk-policy` vẫn thuộc "Khách & lời mời").
 */
export function isActiveRoute(path: string, href: string): boolean {
  if (path === href) return true;
  if (href === '/admin') return false;
  return path.startsWith(`${href}/`);
}