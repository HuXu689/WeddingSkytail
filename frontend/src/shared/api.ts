export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
  const headers: Record<string,string> = {};
  if (method !== 'GET') {
    const response = await fetch('/api/v1/session/csrf', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('Không thể khởi tạo phiên. Vui lòng thử lại.');
    const csrf = await response.json(); headers[csrf.headerName] = csrf.token;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['Idempotency-Key'] = key;
  const result = await fetch(`/api/v1${path}`, { method, headers, credentials: 'include', cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
  if (!result.ok) { const problem = await result.json().catch(() => ({})); throw new ApiError(result.status, problem.detail || (result.status === 401 ? 'Vui lòng đăng nhập lại.' : 'Yêu cầu không thành công. Vui lòng thử lại.')); }
  const text = await result.text(); return (text ? JSON.parse(text) : undefined) as T;
}
export async function login(username: string, password: string) {
  const csrf = await api<{token:string;headerName:string}>('/session/csrf');
  const result = await fetch('/api/v1/auth/login', { method: 'POST', headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({username,password}), credentials:'include' });
  if (!result.ok) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
}
export async function uploadFile<T>(path:string,file:File):Promise<T>{
  const csrf=await api<{token:string;headerName:string}>('/session/csrf');
  const form=new FormData();form.append('file',file);
  const result=await fetch(`/api/v1${path}`,{method:'POST',headers:{[csrf.headerName]:csrf.token},credentials:'include',cache:'no-store',body:form});
  if(!result.ok){const problem=await result.json().catch(()=>({}));throw new ApiError(result.status,problem.detail||'Không thể tải ảnh lên.');}
  return await result.json() as T;
}
export async function uploadFileWithKey<T>(path:string,file:File,key:string):Promise<T>{
 const csrf=await api<{token:string;headerName:string}>('/session/csrf');const form=new FormData();form.append('file',file);const result=await fetch(`/api/v1${path}`,{method:'POST',headers:{[csrf.headerName]:csrf.token,'Idempotency-Key':key},credentials:'include',cache:'no-store',body:form});if(!result.ok){const problem=await result.json().catch(()=>({}));throw new ApiError(result.status,problem.detail||'Không thể đọc tệp CSV.');}return await result.json() as T;
}
export function date(value: string, timezone = 'Asia/Ho_Chi_Minh') { return new Intl.DateTimeFormat('vi-VN', { dateStyle:'full',timeStyle:'short',timeZone:timezone }).format(new Date(value)); }