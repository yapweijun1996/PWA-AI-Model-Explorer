import {chartRows,formatMetric,finite} from './core.js';
/** Rendering adapter only. Domain membership comes from deriveView, never recomputed here. */
export class ModelChart {
  constructor(canvas,models,onSelect){
    this.models=models;this.onSelect=onSelect;this.canvas=canvas;
    if(!globalThis.Chart){document.getElementById('chartFallback').hidden=false;canvas.hidden=true;return;}
    this.chart=new Chart(canvas,{type:'scatter',data:{datasets:[]},options:{responsive:true,maintainAspectRatio:false,animation:false,
      interaction:{mode:'nearest',intersect:true},plugins:{legend:{display:false},tooltip:{displayColors:false,callbacks:{
        title:items=>items[0]?.raw?.model||'',label:item=>['intelligence','cost','speed','latency'].map(k=>`${{intelligence:'Index',cost:'Cost / task',speed:'Speed',latency:'First chunk'}[k]}: ${formatMetric(item.raw,k)}`)
      }}},onClick:(_e,elements)=>{if(elements.length){const hit=elements[0];onSelect(this.chart.data.datasets[hit.datasetIndex].data[hit.index].id);}}}});
  }
  update(view,prefs){
    const plotted=chartRows(view.rows,prefs.mode,prefs.scale),total=view.rows.length;
    document.getElementById('plotCount').textContent=`${plotted.length} plotted / ${total} matching models · ${total-plotted.length} omitted from this chart (missing measurements or non-positive log coordinates). Table retains all matches.`;
    const mode=prefs.mode;
    document.getElementById('chartLegend').textContent=mode==='cost'
      ?'X: cost per task · Y: intelligence. Blue points: 2D frontier in the current base filter. Grey points: other rows. Rounded-zero cost is excluded from frontier calculations.'
      :mode==='four'
      ?`X: cost · Y: intelligence. ${prefs.showSize?'Size: fixed speed bands, 5–15 px radius (50 / 100 / 200 / 500 tokens/s).':'Uniform point size.'} ${prefs.showColor?'Color: blue ≤3s, teal 3–10s, amber >10s first-chunk latency.':'Uniform color.'}`
      :'X: first-chunk latency · Y: speed (both log). Larger points: higher index. Blue: cost ≤$0.10; teal: ≤$1; amber: >$1. Colors are categories, not an overall quality score.';
    if(!this.chart)return;
    const css=getComputedStyle(document.documentElement),ink=css.getPropertyValue('--muted').trim(),grid=css.getPropertyValue('--line').trim();
    const points=plotted.map(r=>({...r,x:mode==='performance'?r.latency:r.cost,y:mode==='performance'?r.speed:r.intelligence}));
    const color=r=>!prefs.showColor?'#4779d6':mode==='cost'?(view.frontier.has(r.id)?'#4779d6':'#9aa8bc'):mode==='four'?(r.latency<=3?'#4779d6':r.latency<=10?'#208778':'#c78832'):(r.cost<=.1?'#4779d6':r.cost<=1?'#208778':'#c78832');
    const radius=r=>!prefs.showSize||mode==='cost'?5:mode==='performance'?5+Math.min(60,r.intelligence)/6:r.speed<50?5:r.speed<100?7:r.speed<200?10:r.speed<500?12:15;
    const frontier=points.filter(r=>view.frontier.has(r.id)).sort((a,b)=>a.cost-b.cost||a.intelligence-b.intelligence);
    this.chart.data.datasets=[{label:'Models',data:points,parsing:false,pointRadius:points.map(radius),pointHoverRadius:points.map(r=>radius(r)+3),pointBackgroundColor:points.map(color),pointBorderColor:css.getPropertyValue('--panel').trim(),pointBorderWidth:1.5,order:1},
      {label:'2D frontier',data:mode==='cost'&&prefs.showLine?frontier:[],parsing:false,showLine:true,pointRadius:0,pointHitRadius:0,borderWidth:1.5,borderColor:'#4779d6',tension:0,order:2}];
    this.chart.options.scales={x:{type:mode==='performance'?'logarithmic':prefs.scale==='log'?'logarithmic':'linear',beginAtZero:mode!=='performance'&&prefs.scale==='linear',title:{display:true,text:mode==='performance'?'First-chunk latency (seconds)':'Cost per Task (USD)',color:ink},grid:{color:grid},ticks:{color:ink,maxTicksLimit:8}},
      y:{type:mode==='performance'?'logarithmic':'linear',beginAtZero:mode!=='performance',title:{display:true,text:mode==='performance'?'Output speed (tokens/s)':'Intelligence Index',color:ink},grid:{color:grid},ticks:{color:ink,maxTicksLimit:7}}};
    this.chart.update('none');
  }
}
