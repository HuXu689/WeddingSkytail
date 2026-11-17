 'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api,ApiError} from '@/shared/api';
export function useAdminRole() {
 const [role,setRole]=useState<'OWNER'|'EDITOR'|null>(null);
 useEffect(()=>{
  let active=true;
  api<{role:'OWNER'|'EDITOR'}>('/auth/me').then(me=>{if(active)setRole(me.role);}).catch(()=>{});
  return()=>{active=false;};
 },[]);
 return {role,isOwner:role==='OWNER',isEditor:role==='EDITOR'};
}
export function useAdmin<T>(path:string) {
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const sequence=useRef(0);
 const fail=useCallback((e:unknown)=>{if(e instanceof ApiError&&e.status===401) window.location.replace('/admin/login');else setError(e instanceof Error?e.message:'Không thể kết nối máy chủ.');},[]);
 const reload=useCallback(async()=>{const current=++sequence.current;setError('');try {const value=await api<T>(path);if(current===sequence.current)setData(value);}catch(e){if(current===sequence.current)fail(e);throw e;}},[path,fail]);
 useEffect(()=>{setData(null);void reload().catch(()=>{});return()=>{sequence.current++;};},[reload]);
 async function run(task:()=>Promise<unknown>,message='Đã lưu thay đổi.') {
  setBusy(true);setError('');setNotice('');
  try {await task();setNotice(message);await reload();return true;}catch(e){fail(e);return false;}finally{setBusy(false);}
 }
 return {data,error,notice,busy,reload,run,setError};
}