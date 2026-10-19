// Extend the S10 compatibility palette without overwriting its existing hex tokens.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const palettePath=resolve(root,'frontend/src/app/color-tokens.css');
let palette=readFileSync(palettePath,'utf8');
const additions=new Map();
const files=['frontend/src/app/globals.css','frontend/src/app/admin/admin.css','frontend/src/features/invitation/design.css'];
const migrated=files.map(file=>{
 const source=readFileSync(resolve(root,file),'utf8');
 const output=source.replace(/([\w-]+)(\s*:\s*)([^{};]+)/g,(whole,property,separator,value)=>{
  if(property.startsWith('--'))return whole;
  return property+separator+value.replace(/rgba?\([^()]+\)|\b(?:white|black|transparent)\b/g,color=>{
   const key=`--compat-paint-${Buffer.from(color).toString('hex')}`;
   additions.set(key,color);return `var(${key})`;
  });
 });
 return [file,output];
});
if(!additions.size){console.log('No remaining rgb/named colors to migrate.');process.exit(0);}
palette+=`\n/* TOK-002: exact legacy rgb/named colors; no palette or opacity change. */\n:root {\n${[...additions].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`  ${key}:${value};`).join('\n')}\n}\n`;
writeFileSync(palettePath,palette);
for(const [file,output] of migrated)writeFileSync(resolve(root,file),output);
console.log(`Migrated ${additions.size} rgb/named color values, preserving the existing palette.`);