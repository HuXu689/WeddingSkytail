'use client';
import {useEffect,useRef} from 'react';
import {label} from '@/shared/labels';
export function Badge({value}:{value:string}){return <span className={`badge badge-${value.toLowerCase()}`} title={value}>{label(value)}</span>;}
export function Heading({title,description}:{title:string;description:string}){return <header className="page-heading"><p className="eyebrow">Không gian chủ tiệc</p><h1>{title}</h1><p className="muted">{description}</p></header>;}
export function Feedback({error,notice,retry}:{error:string;notice:string;retry?:()=>void}){return <>{error&&<div className="error" role="alert">{error} {retry&&<button className="secondary" onClick={retry}>Tải lại</button>}</div>}{notice&&<div className="success" role="status">{notice}</div>}</>;}
export function Empty({children}:{children:React.ReactNode}){return <div className="empty-state"><span aria-hidden="true">✦</span><p>{children}</p></div>;}
export function Loading(){return <p className="loading" role="status">Đang tải dữ liệu…</p>;}
export function Confirm({title,children,onConfirm,onClose,busy}:{title:string;children:React.ReactNode;onConfirm:()=>void;onClose:()=>void;busy:boolean}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><h2 id="confirm-title">{title}</h2><p>{children}</p><div className="row"><button className="secondary" disabled={busy} onClick={onClose} autoFocus>Quay lại</button><button className="danger" disabled={busy} onClick={onConfirm}>{busy?'Đang xử lý…':'Xác nhận'}</button></div></dialog>;
}