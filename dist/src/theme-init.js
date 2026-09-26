// Early paint only. Storage corruption must never stop the app.
try {
  const root=new URL('./',location.href).pathname;
  const prefs=JSON.parse(localStorage.getItem(`model-explorer:${root}:preferences:v1`)||'null');
  if(prefs?.theme==='dark')document.documentElement.dataset.theme='dark';
} catch { /* Use readable light defaults. */ }
