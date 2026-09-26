import {VERSION} from './version.js';
/** Install/update UI stays independent of model logic. Active sessions never silently reload. */
export async function initPWA({toast,beforeUpdate}){
 const $=id=>document.getElementById(id);let registration=null,installPrompt=null,waiting=null,applying=false,reloadReady=false,timer;
 const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function connectivity(){$('networkStatus').textContent=navigator.onLine?'Online':'Offline';$('networkStatus').className='badge '+(navigator.onLine?'':'amber');}
 connectivity();window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
 function installStatus(){$('installApp').textContent=installed()?'App installed':'Install app';$('installApp').disabled=installed();}
 installStatus();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installStatus();});window.addEventListener('appinstalled',()=>{installPrompt=null;installStatus();toast('App installed.');});
 $('installApp').onclick=async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;}catch{toast('Use the browser’s install option.');}}else $('installDialog').showModal();};
 function versionOf(worker){return new Promise(resolve=>{if(!worker){resolve('');return;}const channel=new MessageChannel(),timeout=setTimeout(()=>resolve(''),1200);channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data?.version||'');channel.port1.close();};try{worker.postMessage({type:'GET_VERSION'},[channel.port2]);}catch{clearTimeout(timeout);resolve('');}});}
 async function offer(worker){waiting=worker;const next=await versionOf(worker);$('updateLabel').textContent=`New version ${next||''} available. Current app: ${VERSION}.`;$('updateBanner').hidden=false;$('checkUpdate').textContent='Update available';$('updateMessage').textContent='Ready to update when you choose. Saved study data will be retained.';}
 function watch(reg){if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker);if(worker.state==='redundant')$('updateMessage').textContent='Update did not install. Current version remains available; try again online.';});});}
 $('laterUpdate').onclick=()=>$('updateBanner').hidden=true;
 $('checkUpdate').onclick=async()=>{
  if(applying)return;if(waiting||reloadReady){$('updateBanner').hidden=false;return;}
  if(!registration){$('updateMessage').textContent='Service worker unavailable. Serve over HTTPS or localhost.';return;}
  if(!navigator.onLine){$('updateMessage').textContent='You are offline. Updates require a connection.';return;}
  $('checkUpdate').disabled=true;$('updateMessage').textContent='Checking for a newer build…';
  try{await registration.update();await new Promise(r=>setTimeout(r,700));if(registration.waiting)await offer(registration.waiting);else if(registration.installing)$('updateMessage').textContent='A new build is downloading. Keep this tab open.';else $('updateMessage').textContent=`No newer worker found. Running ${VERSION}.`;}
  catch{$('updateMessage').textContent='Could not check updates. Current app is unchanged. Try again online.';}
  finally{$('checkUpdate').disabled=false;}
 };
 function updateFailed(){applying=false;$('applyUpdate').disabled=false;$('updatingDialog').close();$('updateMessage').textContent='Update activation timed out. Nothing was deleted; retry or reload when ready.';toast('Update did not complete. Try again.');}
 function waitForReady(reg,timeoutMs=15000){return new Promise((resolve,reject)=>{let timer,settled=false,watchState=()=>{};const worker=reg.installing;const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);worker?.removeEventListener('statechange',watchState);resolve(reg);};const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);worker?.removeEventListener('statechange',watchState);reject(error);};watchState=()=>{if(worker?.state==='activated'&&reg.active)finish();else if(worker?.state==='redundant')fail(new Error('Service worker installation failed.'));};if(reg.active)finish();else{worker?.addEventListener('statechange',watchState);timer=setTimeout(()=>fail(new Error('Service worker did not become ready.')),timeoutMs);navigator.serviceWorker.ready.then(finish,fail);}});}
 $('updatingDialog').addEventListener('cancel',e=>e.preventDefault());
 $('applyUpdate').onclick=async()=>{
  if(applying||!beforeUpdate())return;
  if(reloadReady){location.reload();return;}
  waiting=registration?.waiting||waiting;if(!waiting){$('updateBanner').hidden=true;toast('No waiting version. Check for updates again.');return;}
  applying=true;$('applyUpdate').disabled=true;$('updatingDialog').showModal();$('pwaStatus').textContent='Updating…';
  // Paint the loader before activating, including on very fast local networks.
  await new Promise(r=>setTimeout(r,220));timer=setTimeout(updateFailed,15000);
  try{waiting.postMessage({type:'ACTIVATE_UPDATE'});}catch{clearTimeout(timer);updateFailed();}
 };
 if(!('serviceWorker' in navigator)||!isSecureContext){$('pwaStatus').textContent='Install/offline require HTTPS or localhost. Core browsing remains available.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(applying){clearTimeout(timer);$('pwaStatus').textContent='Reloading…';location.reload();}
  else if(registration){versionOf(navigator.serviceWorker.controller).then(version=>{if(version&&version!==VERSION){reloadReady=true;$('updateLabel').textContent=`Version ${version} activated in another tab. Reload when ready.`;$('applyUpdate').textContent='Reload now';$('updateBanner').hidden=false;}});}
 });
 try{
  registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});watch(registration);
  const ready=await waitForReady(registration);
  $('pwaStatus').textContent=`Running ${VERSION} · service worker active`;$('offlineStatus').textContent='Ready offline: model data, charts, comparisons, lessons and local notes after this successful preparation.';
  if(ready.waiting&&navigator.serviceWorker.controller)offer(ready.waiting);
  if(navigator.onLine)registration.update().catch(()=>{});
 }catch(e){$('pwaStatus').textContent='Offline preparation failed. This online session still works.';$('offlineStatus').textContent='Try again on HTTPS/localhost with sufficient browser storage.';console.warn('PWA registration failed:',e.message);}
}
