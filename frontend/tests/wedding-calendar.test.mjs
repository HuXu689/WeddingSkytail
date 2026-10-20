import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/shared/wedding-calendar.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {monthCells,localDay,adjacentMonth,defaultCalendarItem,publicCalendar,guestCalendar}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('Gregorian month grid handles 28/29/30/31 days, Monday/Sunday starts',()=>{
 for(const [month,days] of [['2027-02',28],['2028-02',29],['2027-04',30],['2027-01',31]]){const cells=monthCells(month);assert.equal(cells.filter(Boolean).length,days);assert.equal(cells.length%7,0);}
 assert.equal(monthCells('2027-02')[0],1);assert.deepEqual(monthCells('2026-11').slice(0,7),[null,null,null,null,null,null,1]);
 assert.equal(adjacentMonth('2027-12',1),'2028-01');assert.equal(adjacentMonth('2028-01',-1),'2027-12');
});
test('local day follows event timezone across midnight, invalid input is ignored',()=>{
 assert.equal(localDay('2027-12-31T18:00:00Z','Asia/Ho_Chi_Minh'),'2028-01-01');
 assert.equal(localDay('2027-12-31T18:00:00Z','America/Los_Angeles'),'2027-12-31');
 assert.equal(localDay('invalid','UTC'),null);assert.equal(localDay('2027-01-01T00:00Z','invalid'),null);
});
test('default is next upcoming event, nearest past fallback, cancelled not preferred',()=>{
 const item=(id,at,cancelled=false)=>({id,at,timezone:'UTC',cancelled,kind:'event',title:id});
 const items=[item('old','2027-01-01T00:00Z'),item('next','2027-03-01T00:00Z'),item('cancelled','2027-02-01T00:00Z',true)];
 assert.equal(defaultCalendarItem(items,Date.parse('2027-01-20')).id,'next');assert.equal(defaultCalendarItem(items,Date.parse('2028-01-01')).id,'next');assert.equal(defaultCalendarItem([],0),undefined);
});
test('public calendar uses only PUBLIC enabled timeline milestones, no ICS or guest events',()=>{
 const section={kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Legacy',startsAt:'2027-01-01T00:00Z'};
 const rows=publicCalendar([section,{...section,audience:'PRIVATE'},{...section,enabled:false},{...section,payload:{timeline:[{title:'Public',at:'2027-01-02T00:00Z',audience:'PUBLIC'},{title:'Private',at:'2027-01-03T00:00Z',audience:'PRIVATE'}]}}]);
 assert.deepEqual(rows.map(item=>item.title),['Legacy','Public']);assert.ok(rows.every(item=>item.kind==='milestone'&&!item.calendarUrl));
});
test('guest calendar retains only assigned DTO published/cancelled, ICS only published',()=>{
 const rows=guestCalendar(['DRAFT','PUBLISHED','CANCELLED'].map((state,n)=>({id:String(n),state,title:state,start_at:'2027-01-01T00:00Z',timezone:'UTC',venue:'Fixture',address:'Fixture'})),'fixture/id');
 assert.equal(rows.length,2);assert.equal(rows[0].kind,'event');assert.match(rows[0].calendarUrl,/fixture%2Fid\/events\/1\/calendar.ics$/);assert.equal(rows[1].calendarUrl,undefined);assert.equal(rows[1].cancelled,true);
});