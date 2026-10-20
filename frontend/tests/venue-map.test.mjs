import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const output=ts.transpileModule(read('../src/shared/venue-map.ts'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {venueMap,parseCoordinates}=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('map accepts explicit coordinates including zero, rejects missing/nonfinite/range errors',()=>{
 for(const coordinates of [{},{latitude:null,longitude:0},{latitude:0,longitude:null},{latitude:NaN,longitude:1},{latitude:0,longitude:Infinity},{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:'1',longitude:'2'}])assert.equal(venueMap(coordinates),null);
 assert.ok(venueMap({latitude:0,longitude:0}));assert.ok(venueMap({latitude:90,longitude:-180}));
});
test('embed allowlists OSM and marker matches directions with clamped bounds',()=>{
 const map=venueMap({latitude:90,longitude:-180});const embed=new URL(map.embed);
 assert.equal(embed.origin,'https://www.openstreetmap.org');assert.equal(embed.pathname,'/export/embed.html');
 assert.equal(embed.searchParams.get('marker'),'90,-180');assert.deepEqual(embed.searchParams.get('bbox').split(',').map(Number),[-180,89.995,-179.992,90]);
 assert.equal(new URL(map.directions).searchParams.get('destination'),'90,-180');
 assert.equal(embed.searchParams.has('token'),false);
});
test('coordinate form clears only a complete empty pair and validates before mutation',()=>{
 assert.deepEqual(parseCoordinates(' ',''),{latitude:null,longitude:null});assert.deepEqual(parseCoordinates('0','0'),{latitude:0,longitude:0});
 for(const pair of [['','1'],['1',''],['NaN','1'],['91','1'],['0','-181']])assert.throws(()=>parseCoordinates(...pair));
});
test('map loads only after consent, preserves fallback, labels iframe and avoids arbitrary URLs',()=>{
 const source=read('../src/features/invitation/venue-map.tsx');
 assert.match(source,/useState\(false\)/);assert.match(source,/!consent\?/);assert.match(source,/referrerPolicy="no-referrer"/);
 assert.match(source,/loading="lazy"/);assert.match(source,/title=\{`Vị trí/);assert.match(source,/Thử tải lại bản đồ/);assert.match(source,/OpenStreetMap contributors/);
 assert.doesNotMatch(source,/maps_url|mapsUrl|geolocation|dangerouslySetInnerHTML/);
});
test('location editor uses separate versioned endpoint with confirmation and change notice',()=>{
 const source=read('../src/features/admin/event-location-form.tsx');
 assert.match(source,/expectedVersion:event.version/);assert.match(source,/\/location`,'PUT',input/);assert.match(source,/setConfirmed\(false\)/);
 assert.match(source,/event.state==='PUBLISHED'/);assert.match(source,/submitting.current/);
});