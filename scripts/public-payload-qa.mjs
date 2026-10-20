// Kiểm tra CHỈ ĐỌC payload công khai của thiệp chung.
// Mục đích: bắt hồi quy rò dữ liệu riêng tư ở tầng API (không dựa vào CSS/ẩn phía client).
// Không đăng nhập, không ghi, không phát hành, không dùng dữ liệu khách thật.
//
// Chạy khi stack đang chạy (mặc định edge Docker http://localhost:8088):
//   node scripts/public-payload-qa.mjs
//   PUBLIC_QA_ORIGIN=http://127.0.0.1:3000 PUBLIC_QA_SLUG=our-wedding node scripts/public-payload-qa.mjs
const origin=(process.env.PUBLIC_QA_ORIGIN??'http://localhost:8088').replace(/\/$/,'');
const slug=process.env.PUBLIC_QA_SLUG??'our-wedding';
let body=null;
try{
 const response=await fetch(`${origin}/api/v1/public/weddings/${encodeURIComponent(slug)}`);
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 body=await response.json();
}catch(error){
 console.error(`FAIL: không đọc được payload công khai của "${slug}" tại ${origin} (${error.message}). Stack đã chạy chưa?`);
 process.exitCode=1;
}
if(body){
 const sections=Array.isArray(body.sections)?body.sections:[];
 const problems=[];
 for(const [index,section] of sections.entries()){
  const label=`sections[${index}] ${section.kind??'?'}`;
  if(section.audience==='PRIVATE')problems.push(`${label}: audience PRIVATE xuất hiện trong payload công khai`);
  if(section.enabled!==true)problems.push(`${label}: mục đang tắt vẫn xuất hiện trong payload công khai`);
  if(section.kind==='TIMELINE'&&section.payload?.timeline){
   for(const item of section.payload.timeline){
    if(item.audience==='PRIVATE')problems.push(`${label}: mốc PRIVATE "${item.title??'?'}" bị rò ra công khai`);
   }
   if(section.startsAt!==null)problems.push(`${label}: starts_at phải là null khi payload đã có danh sách mốc`);
  }
 }
 // Các khoá chỉ tồn tại trong lời mời riêng tư, không được có ở payload công khai.
 for(const key of ['displayName','salutation','events','invitationId','assigned_events','internal_note']){
  if(key in body)problems.push(`payload công khai chứa khoá riêng tư: ${key}`);
 }
 if(problems.length){
  console.error(`FAIL: ${problems.length} vấn đề trong payload công khai của "${slug}"`);
  for(const problem of problems)console.error(`- ${problem}`);
  process.exitCode=1;
 }else{
  const privateSections=sections.filter(section=>section.audience!=='PUBLIC').length;
  console.log(`PASS: payload công khai "${slug}" có ${sections.length} mục (${privateSections} mục không phải PUBLIC), không có mốc riêng tư, không lộ trường lời mời.`);
 }
}
