/** Safe dependency-free development/static fixture server. No SPA fallbacks for missing assets. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const arg=k=>{const i=process.argv.indexOf(k);return i>=0?process.argv[i+1]:null;};
const root=resolve(arg('--dir')||'dist'),port=Number(arg('--port')||4173),base=arg('--base')||'/';
if(!base.startsWith('/')||!base.endsWith('/'))throw new Error('Base must start and end with /.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(base)){res.writeHead(404);res.end('Not found');return;}
  const path=decodeURIComponent(u.pathname.slice(base.length)),file=resolve(root,path||'index.html');
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const meta=await stat(file);if(!meta.isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});server.listen(port,'127.0.0.1',()=>console.log(`Model Explorer: http://localhost:${port}${base}`));
