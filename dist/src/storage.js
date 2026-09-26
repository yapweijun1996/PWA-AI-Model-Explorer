/** Browser-local storage, deliberately scoped to this repository path. Nothing syncs to a server. */
const scope = new URL('../', import.meta.url).pathname;
const preferenceKey = `model-explorer:${scope}:preferences:v1`;
let dbPromise;
export function readPreferences() {
  try { return JSON.parse(localStorage.getItem(preferenceKey) || 'null'); }
  catch { return null; }
}
export function savePreferences(value) {
  try { localStorage.setItem(preferenceKey,JSON.stringify(value)); return true; }
  catch { return false; }
}
function openDB() {
  if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
    const request = indexedDB.open(`model-explorer:${scope}:study`,1);
    request.onupgradeneeded=() => request.result.createObjectStore('records',{keyPath:'id'});
    request.onsuccess=() => { request.result.onversionchange=() => request.result.close(); resolve(request.result); };
    request.onerror=() => reject(request.error || new Error('IndexedDB unavailable'));
    request.onblocked=() => reject(new Error('Local database upgrade is blocked by another tab.'));
  });
  return dbPromise;
}
async function transact(mode, operation) {
  const db=await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('records',mode);
    const request=operation(tx.objectStore('records'));
    let value;
    request.onsuccess=() => { value=request.result; };
    tx.oncomplete=() => resolve(value);
    tx.onerror=() => reject(tx.error || new Error('Local data could not be saved.'));
    tx.onabort=() => reject(tx.error || new Error('Local data operation was cancelled.'));
  });
}
export const listStudy=() => transact('readonly', store => store.getAll());
export const getStudy=id => transact('readonly', store => store.get(id));
export const saveStudy=record => transact('readwrite', store => store.put(record));
export const clearStudy=() => transact('readwrite', store => store.clear());
/** Validate the entire backup before changing any record; import is one transaction. */
export async function importStudy(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.records) || input.records.length > 6000) throw new Error('Invalid study backup.');
  for (const r of input.records) {
    if (!r || typeof r.id!=='string' || r.id.length>160 || !/^(note:|lesson:)/.test(r.id)) throw new Error('Invalid study record.');
    if (r.id.startsWith('note:') && (typeof r.text!=='string' || r.text.length>5000)) throw new Error('Invalid note.');
    if (r.id.startsWith('lesson:') && typeof r.correct !== 'boolean') throw new Error('Invalid lesson record.');
  }
  const db=await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('records','readwrite');
    for (const r of input.records) tx.objectStore('records').put(r);
    tx.oncomplete=resolve;
    tx.onerror=() => reject(tx.error);
    tx.onabort=() => reject(tx.error);
  });
}
