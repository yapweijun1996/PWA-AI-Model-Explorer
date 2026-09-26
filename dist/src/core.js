/** Pure domain logic. No DOM, network or storage: deterministic and independently tested. */
export const DEFAULT_FILTERS = Object.freeze({
  query: '', creator: '', maxCost: '', minIntelligence: '', minSpeed: '', maxLatency: '', scope: 'all'
});
export const METRICS = Object.freeze({
  intelligence: { label: 'Intelligence Index', unit: 'index', direction: 'desc', hint: 'Higher in this benchmark', zh: '智能指数' },
  cost: { label: 'Cost per Task', unit: 'USD/task', direction: 'asc', hint: 'Lower displayed cost', zh: '每任务成本' },
  speed: { label: 'Output Speed', unit: 'tokens/s', direction: 'desc', hint: 'Higher output throughput', zh: '输出速度' },
  latency: { label: 'First-chunk Latency', unit: 'seconds', direction: 'asc', hint: 'Lower initial wait', zh: '首段等待时间' },
  totalResponse: { label: 'Total Response', unit: 'seconds', direction: 'asc', hint: 'Source total response time', zh: '总响应时间' }
});
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export const complete4D = row => ['intelligence','cost','speed','latency'].every(k => finite(row[k]));
export const numeric = (value, fallback) => value === '' || value == null ? fallback : (finite(Number(value)) ? Number(value) : fallback);
export function money(value) {
  if (!finite(value)) return '—';
  return '$' + value.toFixed(value > 0 && value < 0.01 ? 4 : 2);
}
export function number(value) {
  return finite(value) ? new Intl.NumberFormat('en', { maximumFractionDigits: 4 }).format(value) : '—';
}
export function formatMetric(row, field) {
  if (field === 'cost') return row.costLabel ?? money(row.cost);
  if (!finite(row[field])) return '—';
  return number(row[field]) + (field === 'speed' ? ' tok/s' : ['latency','totalResponse'].includes(field) ? ' s' : '');
}
export function median(values) {
  const sorted = values.filter(finite).toSorted((a,b) => a-b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
/** Missing measurements never pass an active numeric constraint. */
export function filterModels(models, filter) {
  const q = String(filter.query || '').trim().toLowerCase();
  const maxCost = numeric(filter.maxCost, Infinity);
  const minIntelligence = numeric(filter.minIntelligence, -Infinity);
  const minSpeed = numeric(filter.minSpeed, -Infinity);
  const maxLatency = numeric(filter.maxLatency, Infinity);
  return models.filter(r =>
    (!q || `${r.model} ${r.creator}`.toLowerCase().includes(q)) &&
    (!filter.creator || r.creator === filter.creator) &&
    (maxCost === Infinity || (finite(r.cost) && r.cost <= maxCost)) &&
    (minIntelligence === -Infinity || (finite(r.intelligence) && r.intelligence >= minIntelligence)) &&
    (minSpeed === -Infinity || (finite(r.speed) && r.speed >= minSpeed)) &&
    (maxLatency === Infinity || (finite(r.latency) && r.latency <= maxLatency))
  );
}
/** Nulls always sort last, regardless of direction; name breaks ties deterministically. */
export function sortModels(models, field = 'intelligence', direction = 'desc') {
  const factor = direction === 'asc' ? 1 : -1;
  return models.toSorted((a,b) => {
    if (field === 'model') return a.model.localeCompare(b.model) * factor;
    const va = a[field], vb = b[field];
    if (!finite(va) && !finite(vb)) return a.model.localeCompare(b.model);
    if (!finite(va)) return 1;
    if (!finite(vb)) return -1;
    return (va - vb) * factor || a.model.localeCompare(b.model);
  });
}
/** Cost/intelligence only. Exclude rounded-zero costs; ties do not dominate. */
export function paretoIds(rows) {
  const eligible = rows.filter(r => finite(r.cost) && r.cost > 0 && finite(r.intelligence));
  return new Set(eligible.filter(a => !eligible.some(b =>
    b.cost <= a.cost && b.intelligence >= a.intelligence &&
    (b.cost < a.cost || b.intelligence > a.intelligence)
  )).map(r => r.id));
}
export function medianSet(rows) {
  const eligible = rows.filter(complete4D);
  const thresholds = Object.fromEntries(['intelligence','cost','speed','latency'].map(k => [k,median(eligible.map(r => r[k]))]));
  const matches = eligible.filter(r => r.intelligence >= thresholds.intelligence && r.cost <= thresholds.cost &&
    r.speed >= thresholds.speed && r.latency <= thresholds.latency);
  return { thresholds, ids: new Set(matches.map(r => r.id)) };
}
/** One shared pipeline for cards, table, map, count and export. No recursive filtering. */
export function deriveView(models, filter = DEFAULT_FILTERS, sort = {field:'intelligence',direction:'desc'}) {
  const base = filterModels(models, filter);
  const frontier = paretoIds(base);
  const medians = medianSet(base);
  let visible = base;
  if (filter.scope === 'complete') visible = base.filter(complete4D);
  if (filter.scope === 'frontier') visible = base.filter(r => frontier.has(r.id));
  if (filter.scope === 'median') visible = base.filter(r => medians.ids.has(r.id));
  return { base, rows: sortModels(visible, sort.field, sort.direction), frontier, medians,
    completeCount: visible.filter(complete4D).length, medianCost: median(visible.map(r => r.cost)) };
}
export function chartRows(rows, mode = 'cost', scale = 'log') {
  return rows.filter(r => {
    if (mode === 'performance') return complete4D(r) && r.speed > 0 && r.latency > 0;
    return finite(r.cost) && finite(r.intelligence) && (scale !== 'log' || r.cost > 0) &&
      (mode !== 'four' || complete4D(r));
  });
}
export function toggleSelection(ids, id, maximum = 4) {
  if (ids.includes(id)) return { ids: ids.filter(x => x !== id), error: null };
  if (ids.length >= maximum) return { ids: [...ids], error: 'Choose up to 4 models. Remove one before adding another.' };
  return { ids: [...ids, id], error: null };
}
/** Strict schema for repository snapshots. Unavailable stays null, never fabricated zero. */
export function validateDataset(input) {
  if (!input || input.schemaVersion !== 1 || !input.dataset || !Array.isArray(input.models)) throw new Error('Expected schemaVersion 1, dataset metadata and a models array.');
  if (!input.models.length || input.models.length > 5000) throw new Error('Dataset must contain 1–5000 models.');
  const ids = new Set();
  for (const r of input.models) {
    if (!r || typeof r.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(r.id) || ids.has(r.id)) throw new Error('Missing, invalid or duplicate model id.');
    ids.add(r.id);
    for (const k of ['model','creator','context']) if (typeof r[k] !== 'string' || !r[k] || r[k].length > 250) throw new Error(`Invalid ${k}.`);
    for (const k of ['intelligence','cost','speed','latency','totalResponse']) if (r[k] !== null && (!finite(r[k]) || r[k] < 0)) throw new Error(`Invalid ${k} for ${r.model}.`);
    if (!finite(r.intelligence) || !finite(r.cost)) throw new Error('This dataset requires intelligence and cost.');
    if (typeof r.costLabel !== 'string' || !/^\$\d+(?:\.\d+)?$/.test(r.costLabel) || Number(r.costLabel.slice(1)) !== r.cost) throw new Error('Cost label must match the displayed numeric cost.');
  }
  return input;
}
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function toCSV(rows) {
  const fields = ['model','creator','intelligence','cost','speed','latency','totalResponse','context'];
  const quote = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"','""') + '"';
  return [fields.map(quote).join(','), ...rows.map(r => fields.map(k => quote(r[k])).join(','))].join('\r\n');
}
export function sanitizePreferences(raw, validIds = [], creators = []) {
  const defaults = { theme:'light', bilingual:true, filters:{...DEFAULT_FILTERS}, sort:{field:'intelligence',direction:'desc'},
    compareIds:[], mode:'cost', scale:'log', showLine:true, showSize:true, showColor:true, display:'auto', pageSize:25 };
  if (!raw || typeof raw !== 'object') return defaults;
  for (const k of ['bilingual','showLine','showSize','showColor']) if (typeof raw[k] === 'boolean') defaults[k] = raw[k];
  if (['light','dark'].includes(raw.theme)) defaults.theme=raw.theme;
  if (['cost','four','performance'].includes(raw.mode)) defaults.mode=raw.mode;
  if (['log','linear'].includes(raw.scale)) defaults.scale=raw.scale;
  if (['auto','table','cards'].includes(raw.display)) defaults.display=raw.display;
  if ([10,25,50,100].includes(raw.pageSize)) defaults.pageSize=raw.pageSize;
  if (Array.isArray(raw.compareIds)) defaults.compareIds=[...new Set(raw.compareIds.filter(x => validIds.includes(x)))].slice(0,4);
  if (raw.filters && typeof raw.filters === 'object') {
    const f=raw.filters;
    if (typeof f.query === 'string') defaults.filters.query=f.query.slice(0,200);
    if (creators.includes(f.creator)) defaults.filters.creator=f.creator;
    if (['all','complete','frontier','median'].includes(f.scope)) defaults.filters.scope=f.scope;
    for (const k of ['maxCost','minIntelligence','minSpeed','maxLatency']) if (f[k] != null && f[k] !== '' && finite(Number(f[k])) && Number(f[k])>=0) defaults.filters[k]=String(f[k]);
  }
  if (raw.sort && ['model',...Object.keys(METRICS)].includes(raw.sort.field)) defaults.sort={field:raw.sort.field,direction:raw.sort.direction==='asc'?'asc':'desc'};
  return defaults;
}
