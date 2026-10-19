import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultLayout,normalizedLayout} from '../src/features/invitation/layout.ts';
test('EDITOR-003: legacy and malformed layouts retain default section order',()=>{
 for(const input of [undefined,[],[{section:'EVENTS',enabled:false}],defaultLayout.map(()=>defaultLayout[0])])assert.deepEqual(normalizedLayout(input),defaultLayout);
});
test('EDITOR-003: valid reorder and hide survive without mutating defaults',()=>{
 const input=defaultLayout.map(item=>({...item})).reverse();input[0].enabled=false;
 assert.equal(normalizedLayout(input),input);assert.equal(defaultLayout[0].section,'MUSIC');assert.ok(defaultLayout.every(item=>item.enabled));
});