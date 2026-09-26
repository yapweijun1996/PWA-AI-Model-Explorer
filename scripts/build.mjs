import {readFile,writeFile,mkdir,rm,cp,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareVendor} from './prepare-vendor.mjs';
import {validateDataset} from '../src/core.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const arg=k=>{const i=process.argv.indexOf(k);return i>=0?process.argv[i+1]:null;};
const out=resolve(root,arg('--out')||'dist'),version=arg('--version')||JSON.parse(await readFile(join(root,'package.json'))).version;
if(out===root||root.startsWith(out+sep)||out==='/'||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version))throw new Error('Invalid output/version.');
// An explicit output may be new or a previous build, never an arbitrary directory.
if(out!==join(root,'dist')){
 try{
  await stat(out);
  const previous=JSON.parse(await readFile(join(out,'version.json'),'utf8'));
  if(typeof previous.version!=='string'||typeof previous.build!=='string')throw new Error('Not a previous Model Explorer build.');
 }catch(error){
  if(error.code!=='ENOENT')throw new Error('Refusing to replace an unrecognized output directory: '+out);
  // Distinguish a missing directory from an existing directory with no marker.
  try{await stat(out);throw new Error('Refusing to replace an existing directory without version.json: '+out);}catch(probe){if(probe.code!=='ENOENT')throw probe;}
 }
}
await prepareVendor();validateDataset(JSON.parse(await readFile(join(root,'data/models.json'))));
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const path of ['index.html','offline.html','manifest.webmanifest','assets','src','data'])await cp(join(root,path),join(out,path),{recursive:true});
await writeFile(join(out,'.nojekyll'),'');
async function list(dir){const result=[];for(const ent of await readdir(dir,{withFileTypes:true})){const p=join(dir,ent.name);if(ent.isDirectory())result.push(...await list(p));else result.push(p);}return result.sort();}
const sourceFiles=(await list(out)).filter(p=>!p.endsWith('/src/version.js'));
const hash=createHash('sha256');hash.update(version);for(const p of sourceFiles){hash.update(relative(out,p));hash.update(await readFile(p));}const build=hash.digest('hex').slice(0,12);
await writeFile(join(out,'src/version.js'),`export const VERSION=${JSON.stringify(version)};\nexport const BUILD=${JSON.stringify(build)};\n`);
await writeFile(join(out,'version.json'),JSON.stringify({version,build},null,2));
const files=(await list(out)).map(p=>relative(out,p).replaceAll('\\','/')).filter(p=>p!=='.nojekyll');
const template=await readFile(join(root,'scripts/sw.template.js'),'utf8');
await writeFile(join(out,'sw.js'),template.replace('__VERSION__',JSON.stringify(version)).replace('__BUILD__',JSON.stringify(build)).replace('__FILES__',JSON.stringify(files)));
console.log(JSON.stringify({out,version,build,precacheFiles:files.length}));
