import {readFileSync} from 'node:fs';
const palette=readFileSync(new URL('../../src/app/color-tokens.css',import.meta.url),'utf8');
const colors=new Map([...palette.matchAll(/(--compat-(?:color|paint)-[\da-f]+):([^;]+);/g)].map(match=>[match[1],match[2]]));
/** Legacy layout/art contracts assert the resolved values rather than token spelling. */
export function resolveCompatibilityColors(css){
 return css.replace(/var\((--compat-(?:color|paint)-[\da-f]+)\)/g,(value,key)=>{
  if(!colors.has(key))throw new Error(`Undefined color token ${key}`);
  return colors.get(key);
 });
}