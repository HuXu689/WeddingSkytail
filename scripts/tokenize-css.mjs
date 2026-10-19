// One-time, lossless color-token migration. Custom-property declarations are left intact.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const files=['frontend/src/app/globals.css','frontend/src/app/admin/admin.css','frontend/src/features/invitation/design.css'];
const palette=new Map();
const migrated=files.map(file=>{
 const source=readFileSync(resolve(root,file),'utf8');
 const result=source.replace(/([\w-]+)(\s*:\s*)([^{};]+)/g,(whole,property,separator,value)=>{
  if(property.startsWith('--'))return whole;
  return property+separator+value.replace(/#[\da-fA-F]{3,8}\b/g,color=>{
   const key=`--compat-color-${color.slice(1).toLowerCase()}`;
   palette.set(key,color.toLowerCase());return `var(${key})`;
  });
 });
 return [file,result];
});
if(!palette.size)throw new Error('No literal colors found; migration already applied. Do not overwrite the palette.');
writeFileSync(resolve(root,'frontend/src/app/color-tokens.css'),`/* TOK-002: compatibility palette. Values preserve existing published colors exactly.
   These are intentionally NOT aliases to brand colors: changing a theme must not recolor
   status badges or inherited legacy surfaces. Semantic tokens can replace these gradually. */
:root {\n${[...palette].sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>`  ${name}:${value};`).join('\n')}\n}\n`);
for(const [file,source] of migrated)writeFileSync(resolve(root,file),source);
console.log(`Migrated ${palette.size} exact color values across ${files.length} stylesheets.`);