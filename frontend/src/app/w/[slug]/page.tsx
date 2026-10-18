'use client';
import {use,useEffect,useState} from 'react';
import {api} from '@/shared/api';
export default function PublicWedding({params}:{params:Promise<{slug:string}>}) {
 const {slug}=use(params);const [data,setData]=useState<{names:string;message:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{api<{names:string;message:string}>(`/public/weddings/${slug}`).then(setData).catch(()=>setError('Thiệp chung chưa được công bố.'));},[slug]);
 return <main className="narrow hero"><p className="eyebrow">Chúng mình kết hôn</p><h1>{data?.names||'Một lời mời'}</h1><p style={{whiteSpace:'pre-line'}}>{data?.message||error||'Đang tải…'}</p><p className="muted">Thông tin buổi tiệc và xác nhận tham dự nằm trong lời mời riêng được gửi tới bạn.</p></main>;
}