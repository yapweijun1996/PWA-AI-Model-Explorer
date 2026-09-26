import {DEFAULT_FILTERS,METRICS,deriveView,formatMetric,finite,number,money,escapeHTML as esc,toggleSelection,validateDataset,sanitizePreferences,toCSV,complete4D} from './core.js';
import {readPreferences,savePreferences,listStudy,getStudy,saveStudy,clearStudy,importStudy} from './storage.js';
import {LESSONS} from './lessons.js';
import {ModelChart} from './charts.js';
import {initPWA} from './pwa.js';
import {VERSION,BUILD} from './version.js';
const $=id=>document.getElementById(id);
let models=[],dataset,prefs,view,chart,page=1,study=[],detail=null,savedText='',noteDirty=false,toastTimer,storageWarned=false;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function persist(){if(!savePreferences(prefs)&&!storageWarned){storageWarned=true;toast('Preferences cannot be saved in this browser. Current session still works.');}}
function applyTheme(){document.documentElement.dataset.theme=prefs.theme;document.body.classList.toggle('english-only',!prefs.bilingual);document.querySelector('meta[name=theme-color]').content=prefs.theme==='dark'?'#111925':'#f5f7fb';$('theme').value=prefs.theme;$('bilingual').checked=prefs.bilingual;}
function download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
async function refreshStudy(){try{study=await listStudy();}catch{study=[];toast('Local study storage is unavailable. Notes and progress cannot be saved.');}renderLessons();renderNotes();}
function synchronizeInputs(){for(const key of Object.keys(DEFAULT_FILTERS))$(key).value=prefs.filters[key];$('sortSelect').value=`${prefs.sort.field}:${prefs.sort.direction}`;$('displayMode').value=prefs.display;$('chartMode').value=prefs.mode;$('costScale').value=prefs.scale;for(const k of ['showLine','showSize','showColor'])$(k).checked=prefs[k];}
function render(){
 view=deriveView(models,prefs.filters,prefs.sort);page=Math.min(page,Math.max(1,Math.ceil(view.rows.length/prefs.pageSize)));
 const max=view.rows.length?Math.max(...view.rows.map(r=>r.intelligence)):null;
 $('summary').innerHTML=`<article><small>MATCHING MODELS</small><strong>${view.rows.length}</strong><p>${models.length} rows in the supplied snapshot</p></article><article><small>COMPLETE 4D DATA</small><strong>${view.completeCount}</strong><p>Index, cost, speed and first chunk</p></article><article><small>HIGHEST INDEX IN VIEW</small><strong>${number(max)}</strong><p>Benchmark index, not a percentage</p></article><article><small>MEDIAN COST / TASK</small><strong>${money(view.medianCost)}</strong><p>Displayed USD, current matches</p></article>`;
 const active=['maxCost','minIntelligence','minSpeed','maxLatency'].filter(k=>prefs.filters[k]!=='').length;$('activeFilterCount').textContent=active?`(${active} active)`:'';
 const t=view.medians.thresholds;
 $('scopeExplanation').textContent=prefs.filters.scope==='median'?`Median thresholds from ${view.base.filter(complete4D).length} complete base-filter rows: index ≥ ${number(t.intelligence)}, cost ≤ ${money(t.cost)}, speed ≥ ${number(t.speed)} tok/s, first chunk ≤ ${number(t.latency)} s. Applied consistently to charts, table and export.`:prefs.filters.scope==='frontier'?'2D Pareto frontier: no other positive-cost model in your base filter matches or improves both cost and index with one strict improvement. This ignores speed, latency and workload quality.':'Missing data remains unavailable, never zero. Active numeric filters exclude rows with an unavailable measurement.';
 $('costScale').disabled=prefs.mode==='performance';$('showLine').disabled=prefs.mode!=='cost';
 renderTable();renderSelection();chart.update(view,prefs);persist();
}
function selectHTML(r){return `<label class="check-hit"><input type="checkbox" class="compare-check" data-id="${r.id}" aria-label="Compare ${esc(r.model)}" ${prefs.compareIds.includes(r.id)?'checked':''}></label>`;}
function modelButton(r){return `<button class="model-open" data-model="${r.id}">${esc(r.model)}</button><small>${esc(r.creator)} · ${esc(r.context)} context</small>`;}
function renderTable(){
 const rows=view.rows.slice((page-1)*prefs.pageSize,page*prefs.pageSize);
 $('resultStatus').textContent=`${view.rows.length} matches · ${view.completeCount} complete 4D · select 2–4 models to compare`;
 $('modelRows').innerHTML=rows.map(r=>`<tr class="${prefs.compareIds.includes(r.id)?'compared':''}"><td class="check-column">${selectHTML(r)}</td><th scope="row" class="model-column">${modelButton(r)}</th><td class="score">${formatMetric(r,'intelligence')}</td><td class="cost-value">${formatMetric(r,'cost')}</td><td>${formatMetric(r,'speed')}</td><td>${formatMetric(r,'latency')}</td><td><span class="badge ${complete4D(r)?'good':'amber'}">${complete4D(r)?'Complete':'Partial'}</span></td></tr>`).join('');
 $('modelCards').innerHTML=rows.map(r=>`<article class="model-card ${prefs.compareIds.includes(r.id)?'compared':''}"><div class="card-top"><div>${modelButton(r)}</div>${selectHTML(r)}</div><div class="mini-metrics">${['intelligence','cost','speed','latency'].map(k=>`<span><small>${METRICS[k].label}</small><strong>${formatMetric(r,k)}</strong></span>`).join('')}</div></article>`).join('');
 const cards=prefs.display==='cards'||(prefs.display==='auto'&&matchMedia('(max-width:720px)').matches);$('tableWrap').hidden=cards;$('modelCards').hidden=!cards;
 $('noResults').hidden=rows.length>0;$('pageStatus').textContent=`Page ${page} / ${Math.max(1,Math.ceil(view.rows.length/prefs.pageSize))} · ${prefs.pageSize} per page`;
 $('previousPage').disabled=page<=1;$('nextPage').disabled=page*prefs.pageSize>=view.rows.length;
 for(const th of document.querySelectorAll('[data-sort]'))th.setAttribute('aria-sort',prefs.sort.field===th.dataset.sort?(prefs.sort.direction==='asc'?'ascending':'descending'):'none');
}
function compare(id){const result=toggleSelection(prefs.compareIds,id);if(result.error){toast(result.error);document.querySelectorAll(`.compare-check[data-id="${id}"]`).forEach(el=>el.checked=false);return;}prefs.compareIds=result.ids;persist();document.querySelectorAll('.compare-check').forEach(input=>{input.checked=prefs.compareIds.includes(input.dataset.id);input.closest('tr,.model-card')?.classList.toggle('compared',input.checked);});renderSelection();if(detail)$('detailCompare').textContent=prefs.compareIds.includes(detail.id)?'Remove from comparison':'Add to comparison';}
function renderSelection(){
 const ids=prefs.compareIds,hidden=ids.filter(id=>!view.rows.some(r=>r.id===id)).length;
 $('compareBar').hidden=!ids.length;document.body.classList.toggle('has-selection',!!ids.length);$('compareCount').textContent=`${ids.length} / 4 selected`;
 $('selectionVisibility').textContent=ids.length<2?'Select one more model to compare.':hidden?`${hidden} selected model(s) outside current filters. Selections are retained.`:'Selection is saved on this device.';
 $('selectionChips').innerHTML=ids.map(id=>{const r=models.find(r=>r.id===id);return `<button data-remove="${id}" aria-label="Remove ${esc(r.model)}" title="${esc(r.model)}">${esc(r.model)}</button>`;}).join('');$('openCompare').disabled=ids.length<2;$('shareCompare').disabled=ids.length<2;
}
function openComparison(){
 if(prefs.compareIds.length<2)return;const rows=prefs.compareIds.map(id=>models.find(r=>r.id===id));
 let html=`<thead><tr><th scope="col">Metric</th>${rows.map(r=>`<th scope="col">${esc(r.model)}<small>${esc(r.creator)}</small></th>`).join('')}</tr></thead><tbody>`;
 for(const [field,metric] of Object.entries(METRICS)){
  const max=Math.max(...rows.map(r=>finite(r[field])?r[field]:0),1);
  html+=`<tr><th scope="row">${metric.label}<small>${metric.hint}</small></th>${rows.map(r=>`<td><strong>${formatMetric(r,field)}</strong>${finite(r[field])?`<div class="metric-bar"><meter min="0" max="${max}" value="${r[field]}" aria-label="${metric.label}: ${r[field]}"></meter></div>`:'<small>Unavailable in snapshot</small>'}</td>`).join('')}</tr>`;
 }
 html+=`<tr><th scope="row">Context window</th>${rows.map(r=>`<td>${esc(r.context)}</td>`).join('')}</tr><tr><th scope="row">4D data</th>${rows.map(r=>`<td>${complete4D(r)?'Complete':'Partial; no imputation'}</td>`).join('')}</tr></tbody>`;
 $('compareMatrix').innerHTML=html;$('compareDialog').showModal();
}
async function openDetails(id){
 if(noteDirty&&!confirm('Discard the unsaved note?'))return;
 detail=models.find(r=>r.id===id);if(!detail)return;savedText='';noteDirty=false;$('noteText').value='';$('noteText').disabled=true;$('saveNote').disabled=true;$('noteStatus').textContent='Loading local note…';
 $('detailTitle').textContent=detail.model;$('detailCreator').textContent=detail.creator;
 $('detailMetrics').innerHTML=['intelligence','cost','speed','latency'].map(k=>`<div><small>${METRICS[k].label}</small><strong>${formatMetric(detail,k)}</strong><p>${METRICS[k].hint}</p></div>`).join('');
 $('detailFacts').textContent=`Context: ${detail.context} · Total response: ${formatMetric(detail,'totalResponse')} · ${complete4D(detail)?'Complete':'Partial'} 4D data.`;
 $('detailScope').textContent=detail.cost===0?'Displayed $0.00 is not proof of free usage.':'Snapshot measurements only. Validate behavior with your actual workload.';
 $('detailCompare').textContent=prefs.compareIds.includes(id)?'Remove from comparison':'Add to comparison';if(!$('detailDialog').open)$('detailDialog').showModal();
 const current=id;try{const record=await getStudy(`note:${id}`);if(detail?.id!==current)return;savedText=record?.text||'';$('noteText').value=savedText;$('noteStatus').textContent=record?'Saved locally':'No note yet';}catch{$('noteStatus').textContent='Local storage unavailable. Saving may fail.';}finally{if(detail?.id===current){$('noteText').disabled=false;$('saveNote').disabled=false;}}
}
function closeDetails(){if(noteDirty&&!confirm('Discard the unsaved note?'))return;noteDirty=false;$('detailDialog').close();}
function renderLessons(){
 $('learningProgress').textContent=`${LESSONS.filter(l=>study.some(s=>s.id===`lesson:${l.id}`&&s.correct)).length} / ${LESSONS.length} understood`;
 $('lessonList').innerHTML=LESSONS.map((l,i)=>{const done=study.find(r=>r.id===`lesson:${l.id}`);return `<article class="panel lesson-card"><span class="badge">${String(i+1).padStart(2,'0')} · ${esc(l.tag)}</span><h2>${esc(l.title)}</h2><p class="zh">${esc(l.zhTitle)}</p><p>${esc(l.body)}</p><p class="zh">${esc(l.zh)}</p><p class="question">${esc(l.question)}</p><div class="answers">${l.options.map((o,j)=>`<button data-lesson="${l.id}" data-answer="${j}">${esc(o)}</button>`).join('')}</div><p class="feedback" id="feedback-${l.id}" role="status">${done?(done.correct?'Understood. ':'Review this concept. ')+esc(l.explanation):''}</p></article>`;}).join('');
}
function renderNotes(){const notes=study.filter(s=>s.id.startsWith('note:')&&s.text?.trim());$('notesList').innerHTML=notes.length?notes.map(n=>{const r=models.find(r=>r.id===n.id.slice(5));return `<article class="panel note-card"><h2>${r?`<button class="text-button" data-model="${r.id}">${esc(r.model)}</button>`:'Model from another snapshot'}</h2><p class="note-body">${esc(n.text)}</p><p class="help">${esc(n.updatedAt||'Saved locally')}</p></article>`;}).join(''):'<div class="panel empty"><h2>No study notes yet</h2><p>Inspect a model and save your first observation.</p><a class="button" href="#explore">Explore models</a></div>';}
async function exportBackup(){try{download('model-explorer-study-backup.json',JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),records:await listStudy()},null,2));}catch(e){toast(e.message);}}
function route(){
 const routeName=location.hash.slice(1).split('?')[0]||'explore',active=['explore','learn','notes','settings'].includes(routeName)?routeName:'explore';
 for(const s of document.querySelectorAll('.page'))s.hidden=s.id!==active;
 for(const a of document.querySelectorAll('[data-route]')){if(a.dataset.route===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
 $('appHeader').classList.remove('hide-header');if(active==='explore')requestAnimationFrame(()=>chart?.chart?.resize());
}
function reset(){prefs.filters={...DEFAULT_FILTERS};page=1;synchronizeInputs();render();}
async function start(){
 try{
  const response=await fetch('./data/models.json');if(!response.ok)throw new Error(`Dataset failed to load (${response.status}).`);
  const input=validateDataset(await response.json());models=input.models;dataset=input.dataset;
  const creators=[...new Set(models.map(r=>r.creator))].sort();prefs=sanitizePreferences(readPreferences(),models.map(r=>r.id),creators);
  $('creator').innerHTML='<option value="">All creators</option>'+creators.map(c=>`<option>${esc(c)}</option>`).join('');
  const shared=new URLSearchParams(location.hash.split('?')[1]||'').get('compare');if(shared!==null){prefs.compareIds=[...new Set(shared.split(',').filter(id=>models.some(r=>r.id===id)))].slice(0,4);}
  applyTheme();synchronizeInputs();$('appVersion').textContent=`v${VERSION}`;$('buildDetails').textContent=`Version ${VERSION} · build ${BUILD}`;
  $('datasetDetails').textContent=`${dataset.title}. ${models.length} retained rows. Imported ${dataset.importedOn}; benchmark as-of ${dataset.asOf||'not specified'}.`;
  $('sourceSummary').textContent=`${models.length} source rows · imported ${dataset.importedOn} · benchmark date not specified`;
  chart=new ModelChart($('modelChart'),models,openDetails);
  bind();await refreshStudy();render();route();$('bootStatus').hidden=true;
  initPWA({toast,beforeUpdate:()=>{if(noteDirty){toast('Save or discard your unsaved note before updating.');return false;}persist();return true;}});
  document.documentElement.dataset.ready='true';
 }catch(e){$('bootStatus').textContent=`Cannot start: ${e.message} Serve the project using npm start; file:// cannot load modules or install a PWA.`;$('bootStatus').setAttribute('role','alert');}
}
function bind(){
 for(const k of Object.keys(DEFAULT_FILTERS))$(k).addEventListener(k==='query'?'input':'change',()=>{prefs.filters[k]=$(k).value;page=1;render();});
 for(const id of ['resetFilters','emptyReset'])$(id).onclick=reset;
 document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{prefs.filters={...DEFAULT_FILTERS,query:prefs.filters.query,creator:prefs.filters.creator};if(b.dataset.preset==='budget')prefs.filters.maxCost='0.10';if(b.dataset.preset==='responsive')prefs.filters.maxLatency='3';if(b.dataset.preset==='balanced')Object.assign(prefs.filters,{minIntelligence:'30',maxCost:'0.50',minSpeed:'80',maxLatency:'10'});$('advancedFilters').open=true;page=1;synchronizeInputs();render();});
 $('chartMode').onchange=()=>{prefs.mode=$('chartMode').value;render();};$('costScale').onchange=()=>{prefs.scale=$('costScale').value;render();};for(const k of ['showLine','showSize','showColor'])$(k).onchange=()=>{prefs[k]=$(k).checked;render();};
 $('sortSelect').onchange=()=>{const [field,direction]=$('sortSelect').value.split(':');prefs.sort={field,direction};page=1;render();};
 document.querySelectorAll('[data-sort]').forEach(th=>th.querySelector('button').onclick=()=>{const field=th.dataset.sort;prefs.sort={field,direction:prefs.sort.field===field?(prefs.sort.direction==='asc'?'desc':'asc'):(METRICS[field]?.direction||'asc')};page=1;synchronizeInputs();render();});
 $('displayMode').onchange=()=>{prefs.display=$('displayMode').value;render();};$('previousPage').onclick=()=>{page--;renderTable();};$('nextPage').onclick=()=>{page++;renderTable();};
 document.addEventListener('change',e=>{if(e.target.matches('.compare-check'))compare(e.target.dataset.id);});
 document.addEventListener('click',async e=>{
  const model=e.target.closest('[data-model]');if(model)openDetails(model.dataset.model);
  const remove=e.target.closest('[data-remove]');if(remove)compare(remove.dataset.remove);
  const close=e.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  const lesson=e.target.closest('[data-lesson]');if(lesson){const l=LESSONS.find(l=>l.id===lesson.dataset.lesson),correct=Number(lesson.dataset.answer)===l.answer;try{await saveStudy({id:`lesson:${l.id}`,correct,updatedAt:new Date().toISOString()});await refreshStudy();$('feedback-'+l.id).textContent=(correct?'Correct. ':'Not quite. ')+l.explanation;}catch(err){toast('Answer checked, but progress was not saved: '+err.message);$('feedback-'+l.id).textContent=(correct?'Correct. ':'Not quite. ')+l.explanation;}}
 });
 $('openCompare').onclick=openComparison;$('clearCompare').onclick=()=>{prefs.compareIds=[];render();};
 $('shareCompare').onclick=async()=>{const url=new URL(location.href);url.hash='explore?compare='+prefs.compareIds.join(',');try{await navigator.clipboard.writeText(url.href);toast('Comparison link copied. Notes are not included.');}catch{prompt('Copy this comparison link (no notes included):',url.href);}};
 $('detailCompare').onclick=()=>{if(detail)compare(detail.id);};$('closeDetail').onclick=closeDetails;$('detailDialog').addEventListener('cancel',e=>{e.preventDefault();closeDetails();});$('noteText').oninput=()=>{noteDirty=$('noteText').value!==savedText;$('noteStatus').textContent=noteDirty?'Unsaved changes':'Saved locally';};
 $('saveNote').onclick=async()=>{if(!detail)return;const id=detail.id,text=$('noteText').value;$('saveNote').disabled=true;try{await saveStudy({id:`note:${id}`,text,updatedAt:new Date().toISOString()});if(detail?.id===id){savedText=text;noteDirty=$('noteText').value!==text;$('noteStatus').textContent=noteDirty?'New changes unsaved':'Saved locally';}await refreshStudy();}catch(e){$('noteStatus').textContent='Save failed';toast(e.message);}finally{$('saveNote').disabled=false;}};
 window.addEventListener('beforeunload',e=>{if(noteDirty){e.preventDefault();e.returnValue='';}});
 $('exportCSV').onclick=()=>download('model-explorer-filtered.csv',toCSV(view.rows),'text/csv;charset=utf-8');
 $('theme').onchange=()=>{prefs.theme=$('theme').value;applyTheme();render();};$('bilingual').onchange=()=>{prefs.bilingual=$('bilingual').checked;applyTheme();persist();};
 $('exportStudy').onclick=exportBackup;$('notesBackup').onclick=exportBackup;$('importStudyButton').onclick=()=>$('importFile').click();$('importFile').onchange=async()=>{const f=$('importFile').files[0];if(!f)return;try{if(f.size>5_000_000)throw new Error('Backup is too large.');if(!confirm('Import this backup? Matching note IDs will be replaced.'))return;await importStudy(JSON.parse(await f.text()));await refreshStudy();toast('Study backup imported.');}catch(e){toast('Import failed: '+e.message);}finally{$('importFile').value='';}};
 $('clearStudy').onclick=async()=>{if(!confirm('Delete every local note and quiz record? Export a backup first.'))return;try{await clearStudy();await refreshStudy();toast('Study records deleted.');}catch(e){toast(e.message);}};
 $('sourceInfo').onclick=()=>location.hash='settings';window.addEventListener('hashchange',()=>{route();window.scrollTo(0,0);});matchMedia('(max-width:720px)').addEventListener('change',()=>renderTable());
 let previous=scrollY,last=scrollY;window.addEventListener('scroll',()=>{const y=scrollY;$('scrollTop').hidden=y<innerHeight;const delta=y-last;if(Math.abs(delta)>12){$('appHeader').classList.toggle('hide-header',y>180&&delta>0&&!$('appHeader').contains(document.activeElement));last=y;}previous=y;},{passive:true});
 $('scrollTop').onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
start();
