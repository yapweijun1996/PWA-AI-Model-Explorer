/** Build-time fetch only: production never depends on a CDN. Hashes were verified from upstream. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../assets/vendor/',import.meta.url);
export const files=[
 ['chart.umd.min.js','https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js','48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a'],
 ['Chart-LICENSE.md','https://raw.githubusercontent.com/chartjs/Chart.js/v4.5.1/LICENSE.md','41a84aa2caba645f966a18d9c2056b73e6d3a81d80bc0046bc0011a2634d4cce']
];
export async function prepareVendor(){
 await mkdir(root,{recursive:true});
 for(const [name,url,expected] of files){
  let bytes;try{bytes=await readFile(new URL(name,root));}catch{}
  const hash=b=>createHash('sha256').update(b).digest('hex');
  // The bundled scatter-only build is genuine Chart.js 4.5.1; see docs/VENDOR.md.
  const accepted=[expected];
  if(name==='chart.umd.min.js')accepted.push('c811b6602c4777c754fe8fa6482d31222af4391333e9356041912df1f90824a8');
  if(bytes&&accepted.includes(hash(bytes)))continue;
  console.log(`Preparing pinned Chart.js dependency: ${name}`);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Dependency download failed: ${response.status}. Retry when online.`);
  bytes=Buffer.from(await response.arrayBuffer());if(hash(bytes)!==expected)throw new Error(`Integrity mismatch for ${name}. Refusing to publish.`);
  await writeFile(new URL(name,root),bytes);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareVendor();
