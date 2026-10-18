import test from 'node:test';
import assert from 'node:assert/strict';
import {fromVietnamInput,toVietnamInput} from '../src/shared/time.ts';

test('Vietnam input converts to UTC, independent of machine timezone',()=>{
 assert.equal(fromVietnamInput('2027-01-10T18:30'),'2027-01-10T11:30:00.000Z');
 assert.equal(toVietnamInput('2027-01-10T11:30:00Z'),'2027-01-10T18:30:00');
});
test('Schedule survives form roundtrip with seconds and day rollover',()=>{
 const value='2027-01-10T20:30:45.000Z';
 assert.equal(fromVietnamInput(toVietnamInput(value)),value);
 assert.equal(toVietnamInput(null),'');
});
test('Malformed schedule rejected',()=>{
 assert.throws(()=>fromVietnamInput(''));
 assert.throws(()=>fromVietnamInput('invalid'));
});