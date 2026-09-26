import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateDataset} from '../src/core.js';
const root=new URL('..',import.meta.url).pathname;
for(const dir of ['src','scripts','tests'])for(const name of await readdir(join(root,dir))){if(!/\.m?js$/.test(name)||name==='sw.template.js')continue;const result=spawnSync(process.execPath,['--check',join(root,dir,name)],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
validateDataset(JSON.parse(await readFile(join(root,'data/models.json'))));
const html=await readFile(join(root,'index.html'),'utf8');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
for(const filename of ['app.js','pwa.js']){const js=await readFile(join(root,'src',filename),'utf8');for(const m of js.matchAll(/\$\('([^']+)'\)/g)){if(!ids.includes(m[1]))throw new Error(`Missing DOM ID ${m[1]}`);}}
console.log('PASS: JS syntax, dataset schema, unique HTML IDs, static DOM references');
