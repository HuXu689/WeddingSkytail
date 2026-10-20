import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/shared/invitation-features.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {approvedWishPath}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('approved feed has separate public/guest paths and encodes identifiers and cursor',()=>{
 assert.equal(approvedWishPath({kind:'public',slug:'fixture/only'}),'/public/weddings/fixture%2Fonly/wishes');
 assert.equal(approvedWishPath({kind:'guest',invitationId:'fixture'}),'/guest/invitations/fixture/approved-wishes');
 assert.equal(approvedWishPath({kind:'guest',invitationId:'fixture'},'a+b/='),'/guest/invitations/fixture/approved-wishes?cursor=a%2Bb%2F%3D');
});