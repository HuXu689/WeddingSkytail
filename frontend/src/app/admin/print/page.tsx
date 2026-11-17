'use client';
import {useState} from 'react';
import {api,date} from '@/shared/api';
import type {Invitation} from '@/shared/admin-types';
import type {ExportLabelStyle,ExportPreview} from '@/shared/export-types';
import {useAdmin} from '@/features/admin/use-admin';
import {Heading,Feedback,Loading,Empty,Badge} from '@/features/admin/ui';

/** A4 grid used by ExportService.renderPdf: 3 columns × 5 rows = 15 labels per page. */
const PER_PAGE=15;
/** Names longer than this are wrapped to two lines in the PDF, so we warn before printing. */
const LONG_NAME=34;
const styles:[ExportLabelStyle,string,string][]=[
 ['NAME_QR','Tên + QR + hướng dẫn','Dán lên phong bì có ghi tên khách. Nhãn hiện tên, mã số và các buổi được mời.'],
 ['QR_ONLY','Chỉ QR','Dán kín niêm phong hoặc dùng kèm thiệp giấy; khách quét mã để mở thiệp.']
];

export default function PrintCentre(){
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState('');
 const [style,setStyle]=useState<ExportLabelStyle>('NAME_QR'),[preview,setPreview]=useState<ExportPreview|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const guests=useAdmin<Invitation[]>(`/admin/invitations?page=${page}&archived=false${query.trim()?`&query=${encodeURIComponent(query.trim())}`:''}`);
 const visible=guests.data??[];
 const onPage=visible.filter(row=>selected.includes(row.id));
 const cells=preview?preview.rows.map(row=>({code:row.rowNumber,name:row.displayName,summary:row.eventSummary}))
  :onPage.map((row,index)=>({code:index+1,name:row.display_name,summary:row.assigned_events??''}));
 const sheetPages=Math.ceil(cells.length/PER_PAGE);
 const longNames=cells.filter(cell=>cell.name.length>LONG_NAME);
 function toggle(id:string){setSelected(items=>items.includes(id)?items.filter(value=>value!==id):items.length>=300?items:items.concat(id));}
 async function create(){setBusy(true);setError('');setNotice('');try{const result=await api<ExportPreview>('/admin/exports','POST',{format:'PDF',invitationIds:selected,labelStyle:style});setPreview(result);setNotice(`Đã tạo bản in ${result.rowCount} nhãn trong ${result.pageCount} trang A4.`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function download(){if(!preview)return;setBusy(true);setError('');try{await api(`/admin/exports/${preview.id}`);window.location.href=`/api/v1/admin/exports/${preview.id}/download`;}catch{setError('Bản in đã hết hạn hoặc đã bị thu hồi. Hãy tạo bản in mới.');setPreview(null);}finally{setBusy(false);}}
 async function revoke(){if(!preview)return;setBusy(true);try{await api(`/admin/exports/${preview.id}/revoke`,'POST');setPreview(null);setNotice('Đã thu hồi bản in.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><Heading title="Trung tâm in" description="Chọn khách, chọn mẫu nhãn rồi xem trước lưới A4 3×5 đúng như file PDF sẽ in. Bản in dùng lại link QR hiện có nên không làm mất hiệu lực QR đã phát cho khách."/><Feedback error={error} notice={notice} retry={()=>void guests.reload().catch(()=>{})}/>
  <section className="card print-layout"><div className="section-heading"><div><h2>Chọn khách để in</h2><p className="field-hint">Đã chọn {selected.length}/300 · tối đa {PER_PAGE} nhãn mỗi trang A4 · khách đã lưu trữ hoặc thu hồi link không in được.</p></div><div className="row"><button className="secondary" type="button" disabled={visible.length===0} onClick={()=>setSelected(onPage.length>0?selected.filter(id=>!visible.some(row=>row.id===id)):Array.from(new Set(selected.concat(visible.filter(row=>row.active&&!row.archived).map(row=>row.id)))).slice(0,300))}>{onPage.length>0?'Bỏ chọn trang này':'Chọn tất cả trang này'}</button></div></div>
   <div className="toolbar"><label>Tìm khách<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Tên khách hoặc nhóm"/></label><span className="muted">Hiện {visible.length} khách trên trang {page+1}</span></div>
   {!guests.data&&!guests.error&&<Loading/>}{guests.data?.length===0&&<Empty>Chưa có khách để in.</Empty>}
   {guests.data&&visible.length>0&&<div className="table"><table><thead><tr><th><span className="sr-only">Chọn</span></th><th>Người nhận</th><th>Nhóm</th><th>Buổi được mời</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td><input type="checkbox" checked={selected.includes(row.id)} disabled={!row.active||row.archived||(!selected.includes(row.id)&&selected.length>=300)} onChange={()=>toggle(row.id)} aria-label={`Chọn ${row.display_name} để in`}/></td><td>{row.display_name}</td><td>{row.group_name||'—'}</td><td>{row.assigned_events||'—'}</td><td><Badge value={row.active?'ACTIVE':'INACTIVE'}/>{row.archived&&<span className="field-hint"> · Đã lưu trữ</span>}</td></tr>)}</tbody></table></div>}
   <div className="pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>← Trang trước</button><span>Trang {page+1}</span><button className="secondary" disabled={!guests.data||guests.data.length<50} onClick={()=>setPage(page+1)}>Trang sau →</button></div>
  </section>
  <section className="card"><div className="section-heading"><div><h2>Mẫu nhãn in</h2><p className="field-hint">Mẫu nhãn chỉ đổi cách trình bày trên giấy, không đổi link hay QR của khách.</p></div></div><div className="print-options">{styles.map(([value,title,hint])=><label className="print-option" key={value}><input type="radio" name="labelStyle" value={value} checked={style===value} onChange={()=>{setStyle(value);setPreview(null);}}/><div><strong>{title}</strong><span className="field-hint">{hint}</span></div></label>)}</div></section>
   <section className="card"><div className="section-heading"><div><h2>Xem trước và tạo bản in</h2><p className="print-summary">{cells.length} nhãn · {sheetPages} trang A4 · {PER_PAGE} nhãn/trang {preview?`· hết hạn ${date(preview.expiresAt)}`:''}</p></div><div className="row"><button disabled={busy||selected.length===0} onClick={()=>void create()}>Tạo bản in PDF</button>{preview&&<button className="secondary" disabled={busy} onClick={()=>void download()}>Tải PDF</button>}{preview&&<button className="danger" disabled={busy} onClick={()=>void revoke()}>Thu hồi</button>}</div></div>
    {longNames.length>0&&<p className="print-warning">Có {longNames.length} tên dài hơn {LONG_NAME} ký tự sẽ xuống dòng hoặc bị cắt khi in: {longNames.slice(0,5).map(cell=>cell.name).join(' · ')}{longNames.length>5?' …':''}</p>}
    {cells.length===0?<Empty>Chọn ít nhất một khách để xem trước nhãn in.</Empty>:<div className="print-sheet">{cells.map(cell=><div className="print-label" key={cell.code}>{style==='NAME_QR'?<><strong className="print-label-name">{cell.name}</strong><span className="print-label-code">Mã {cell.code}</span><span className="print-label-note">{cell.summary}</span><span className="print-label-qr">QR</span></>:<><span className="print-label-qr">QR</span><span className="print-label-code">Mã {cell.code}</span></>}</div>)}</div>}
   </section>
  </>;
}