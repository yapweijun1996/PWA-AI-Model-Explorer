/** npm run release -- 1.0.1: bump source version, then run tests/build before committing. */
import {readFile,writeFile} from 'node:fs/promises';
const version=process.argv[2];if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Usage: npm run release -- 1.0.1');
const url=new URL('../package.json',import.meta.url),pkg=JSON.parse(await readFile(url));pkg.version=version;await writeFile(url,JSON.stringify(pkg,null,2)+'\n');
console.log(`Version set to ${version}. Run npm run check && npm test && npm run build && npm run test:browser before committing.`);
