import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOpenIntent} from '../src/features/invitation/open-intent.ts';

test('INTRO-001: concurrent intent shares a single POST and payload request',async()=>{
 const calls=[];let release;
 const wait=new Promise(resolve=>{release=resolve;});
 const open=createOpenIntent(async(path,method)=>{calls.push([path,method]);if(path.endsWith('/state')){await wait;return {opened:false};}return {names:'private'};});
 const first=open('a'),second=open('a');assert.equal(first,second);release();
 await Promise.all([first,second]);
 assert.equal(calls.filter(([,method])=>method==='POST').length,1);
 assert.equal(calls.length,3);
});
test('INTRO-001: lost open response retries state without a second POST',async()=>{
 let opened=false,posts=0;
 const open=createOpenIntent(async(path,method)=>{
  if(path.endsWith('/state'))return {opened};
  if(method==='POST'){posts++;opened=true;throw new Error('network');}
  return {authorized:true};
 });
 await assert.rejects(open('a'),/network/);
 assert.deepEqual(await open('a'),{authorized:true});assert.equal(posts,1);
});
test('INTRO-001: failed payload is retryable and does not record another open',async()=>{
 let opened=false,posts=0,views=0;
 const open=createOpenIntent(async(path,method)=>{
  if(path.endsWith('/state'))return {opened};
  if(method==='POST'){opened=true;posts++;return;}
  if(++views===1)throw new Error('network');return {authorized:true};
 });
 await assert.rejects(open('a'));await open('a');assert.equal(posts,1);assert.equal(views,2);
});
test('INTRO-001: denied gate never fetches private content; invitations stay isolated',async()=>{
 const paths=[];
 const open=createOpenIntent(async(path)=>{paths.push(path);throw new Error('denied');});
 await assert.rejects(open('a'));await assert.rejects(open('b'));
 assert.deepEqual(paths,['/guest/invitations/a/state','/guest/invitations/b/state']);
});
test('INTRO-001: envelope keeps explicit consent, PIN→open flow and reduced-motion without delay',()=>{
 const entry=readFileSync(new URL('../src/features/invitation/invitation-entry.tsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/app/invitation/[id]/page.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');
 assert.match(entry,/if\(locked.current\)return/);
 assert.match(entry,/await api\(`\/guest\/invitations\/\$\{id\}\/pin`,'POST',\{pin\}\)/);
 assert.match(entry,/await openInvitation\(id\)/);
 assert.doesNotMatch(entry,/<WeddingCanvas|recipient=|setTimeout\(/);
 assert.match(page,/!data\?<InvitationEntry<Invitation>/);
 assert.match(page,/<InvitationContent key=\{id\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.envelope-flap,\.envelope-seal\{transition:none/);
});