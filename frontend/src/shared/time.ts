/** Asia/Ho_Chi_Minh (UTC+07), independent of browser timezone. */
export function toVietnamInput(value: string | null): string {
 if (!value) return '';
 return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0,19);
}
export function fromVietnamInput(value: string): string {
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) throw new Error('Vui lòng nhập ngày và giờ hợp lệ.');
 const result = new Date(`${value}+07:00`);
 if (!Number.isFinite(result.getTime())) throw new Error('Ngày giờ không hợp lệ.');
 return result.toISOString();
}