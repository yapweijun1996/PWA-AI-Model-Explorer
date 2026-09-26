"""Real Chromium acceptance, offline and N->N+1 lifecycle test. Run after npm run build.
Uses isolated temporary profiles/site copies. It never modifies the source dataset or production dist.
"""
import json, os, shutil, socket, subprocess, tempfile, time, pathlib
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'evidence'; EVIDENCE.mkdir(exist_ok=True)
results=[]
def record(name):
    results.append(name); print('PASS:',name,flush=True)
def launch_server(directory,base='/models/'):
    with socket.socket() as probe:
        probe.bind(('127.0.0.1',0)); port=probe.getsockname()[1]
    process=subprocess.Popen(['node',str(ROOT/'scripts/serve.mjs'),'--dir',str(directory),'--port',str(port),'--base',base],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if process.poll() is not None:
            raise RuntimeError(f'Test server exited before becoming ready (code {process.returncode}).')
        try:
            with socket.create_connection(('127.0.0.1',port),timeout=.2): return process,port
        except OSError: time.sleep(.05)
    process.terminate();process.wait(timeout=5)
    raise RuntimeError('Test server did not become ready within 5 seconds.')
def ready(page,url):
    page.goto(url); page.wait_for_selector('html[data-ready="true"]'); page.wait_for_function("typeof Chart==='function' && Object.keys(Chart.instances).length===1")
def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
with tempfile.TemporaryDirectory(prefix='model-explorer-e2e-') as temp:
    temp=pathlib.Path(temp); site=temp/'site'; shutil.copytree(ROOT/'dist',site)
    server,port=launch_server(site)
    try:
      with sync_playwright() as p:
        executable=os.environ.get('BROWSER_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
        page=context.new_page(); errors=[]; external=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:external.append(r.url) if not r.url.startswith(f'http://127.0.0.1:{port}') else None)
        url=f'http://127.0.0.1:{port}/models/'
        ready(page,url); no_overflow(page)
        expect(page.locator('#resultStatus')).to_contain_text('102 matches')
        expect(page.locator('#plotCount')).to_contain_text('100 plotted / 102')
        record('Subpath launch, real Chart.js, 102 source rows and disclosed chart omissions')
        page.screenshot(path=str(EVIDENCE/'desktop-light.png'),full_page=True)
        page.locator('[data-preset="balanced"]').click()
        expect(page.locator('#minSpeed')).to_have_value('80')
        values=page.locator('#modelRows tr').evaluate_all("rows=>rows.map(r=>Number(r.children[4].textContent.replace(/[^0-9.]/g,'')))")
        assert values and all(v>=80 for v in values)
        record('Balanced preset actually enforces speed >=80 and all four constraints')
        page.locator('#resetFilters').click(); page.locator('#scope').select_option('median')
        count=int(page.locator('#resultStatus').inner_text().split()[0]); assert 0<count<102
        assert page.locator('#modelRows tr').count()==count
        expect(page.locator('#scopeExplanation')).to_contain_text('96 complete base-filter rows')
        expect(page.locator('#plotCount')).to_contain_text(f'/ {count} matching')
        record('Median selection uses one shared membership for chart, table and totals')
        page.locator('#resetFilters').click()
        for i in range(4): page.locator('#modelRows input').nth(i).check()
        ids=page.locator('#modelRows input:checked').evaluate_all('els=>els.map(e=>e.dataset.id)')
        page.locator('#modelRows input:not(:checked)').first.click()
        expect(page.locator('#compareCount')).to_have_text('4 / 4 selected')
        assert page.locator('#modelRows input:checked').evaluate_all('els=>els.map(e=>e.dataset.id)')==ids
        expect(page.locator('#toast')).to_contain_text('up to 4')
        record('Fifth selection blocked without evicting an existing selection')
        page.locator('#openCompare').click(); expect(page.locator('#compareDialog')).to_be_visible()
        assert page.locator('#compareMatrix thead th').count()==5
        assert page.locator('#compareMatrix tbody th[scope=row]').count()==7
        page.screenshot(path=str(EVIDENCE/'compare-matrix.png'))
        page.keyboard.press('Escape'); expect(page.locator('#compareDialog')).not_to_be_visible()
        assert page.evaluate('document.activeElement.id')=='openCompare'
        record('Native comparison dialog, metric row headers, Escape and focus restoration')
        page.locator('#query').fill('zzzz-no-model')
        expect(page.locator('#compareCount')).to_have_text('4 / 4 selected')
        expect(page.locator('#selectionVisibility')).to_contain_text('4 selected model(s) outside')
        page.reload(); page.wait_for_selector('html[data-ready="true"]')
        expect(page.locator('#compareCount')).to_have_text('4 / 4 selected')
        expect(page.locator('#query')).to_have_value('zzzz-no-model')
        record('Filters and comparison IDs survive reload; hidden selections remain explicit')
        page.locator('#resetFilters').click(); page.locator('#modelRows [data-model]').first.click()
        page.locator('#noteText').fill('My private note: test ERP tool calls before adopting.');page.locator('#saveNote').click()
        expect(page.locator('#noteStatus')).to_have_text('Saved locally');page.locator('#closeDetail').click()
        page.locator('nav [data-route=learn]').click();page.locator('[data-lesson=index][data-answer="1"]').click()
        expect(page.locator('#learningProgress')).to_contain_text('1 / 6')
        page.reload();page.wait_for_selector('html[data-ready="true"]');expect(page.locator('#learningProgress')).to_contain_text('1 / 6')
        page.locator('nav [data-route=notes]').click();expect(page.locator('#notesList')).to_contain_text('My private note')
        record('IndexedDB notes and learning progress persist across reload')
        page.locator('nav [data-route=settings]').click();page.locator('#theme').select_option('dark')
        assert page.evaluate("document.querySelector('meta[name=theme-color]').content")=='#111925'
        page.locator('nav [data-route=explore]').click();page.screenshot(path=str(EVIDENCE/'desktop-dark.png'),full_page=True)
        record('Light/dark app chrome, theme-color and charts update coherently')
        for width,height in [(834,1112),(390,844),(320,720)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200);no_overflow(page)
            if width<720:
                expect(page.locator('#modelCards')).to_be_visible()
                assert page.locator('#query').evaluate('e=>getComputedStyle(e).fontSize')=='16px'
            if width==390: page.screenshot(path=str(EVIDENCE/'mobile-dark.png'),full_page=True)
        record('834px, 390px, 320px layouts: no document overflow; mobile cards and 16px inputs')
        page.set_viewport_size({'width':1440,'height':1000});page.locator('nav [data-route=settings]').click()
        expect(page.locator('#offlineStatus')).to_contain_text('Ready offline',timeout=15000)
        context.set_offline(True);page.reload();page.wait_for_selector('html[data-ready="true"]')
        page.locator('nav [data-route=explore]').click();expect(page.locator('#resultStatus')).to_contain_text('102 matches')
        assert page.evaluate("typeof Chart==='function'")
        page.locator('#openCompare').click();expect(page.locator('#compareDialog')).to_be_visible();page.keyboard.press('Escape')
        page.locator('nav [data-route=notes]').click();expect(page.locator('#notesList')).to_contain_text('My private note')
        record('Real offline reload: local Chart.js, dataset, comparison and notes work')
        context.set_offline(False)
        # Sibling cache must not be removed during this app's update activation.
        page.evaluate("caches.open('unrelated-app-keep-me')")
        new=temp/'new';subprocess.run(['node',str(ROOT/'scripts/build.mjs'),'--version','1.0.1','--out',str(new)],cwd=ROOT,check=True)
        shutil.copytree(new,site,dirs_exist_ok=True)
        page.locator('nav [data-route=settings]').click();page.locator('#checkUpdate').click()
        expect(page.locator('#updateBanner')).to_be_visible(timeout=20000)
        expect(page.locator('#appVersion')).to_have_text('v1.0.0')
        expect(page.locator('#updateLabel')).to_contain_text('1.0.1')
        page.wait_for_timeout(500);expect(page.locator('#appVersion')).to_have_text('v1.0.0')
        record('N -> N+1 worker waits visibly; no silent reload')
        page.locator('#applyUpdate').click();expect(page.locator('#updatingDialog')).to_be_visible()
        expect(page.locator('#appVersion')).to_have_text('v1.0.1',timeout=20000)
        expect(page.locator('#compareCount')).to_have_text('4 / 4 selected')
        page.locator('nav [data-route=notes]').click();expect(page.locator('#notesList')).to_contain_text('My private note')
        keys=page.evaluate('caches.keys()');assert 'unrelated-app-keep-me' in keys
        assert len([k for k in keys if k.startswith('model-explorer:/models/:')])==1
        record('Explicit update loader, activation, reload, study retention and own-cache cleanup')
        missing=page.evaluate("fetch('./missing.js').then(async r=>({status:r.status,text:await r.text()}))")
        assert missing['status']==404 and '<html' not in missing['text'].lower()
        record('Missing JS returns 404, never offline HTML')
        assert not errors,errors
        assert not external,external
        record('No uncaught page errors or runtime third-party requests')
        broken= temp/'broken'; shutil.copytree(ROOT/'dist',broken); (broken/'offline.html').unlink()
        broken_server,broken_port=launch_server(broken)
        broken_context=None
        try:
            broken_context=browser.new_context(viewport={'width':1440,'height':1000})
            broken_page=broken_context.new_page(); broken_page.goto(f'http://127.0.0.1:{broken_port}/models/')
            broken_page.wait_for_selector('html[data-ready="true"]')
            expect(broken_page.locator('#pwaStatus')).to_contain_text('Offline preparation failed',timeout=5000)
            expect(broken_page.locator('#offlineStatus')).to_contain_text('Try again')
            record('Initial precache failure is surfaced instead of leaving PWA status stuck')
        finally:
            if broken_context: broken_context.close()
            broken_server.terminate();broken_server.wait(timeout=5)
        context.close();browser.close()
      (EVIDENCE/'browser-results.json').write_text(json.dumps({'passed':len(results),'checks':results,'limitations':['Physical iPhone/iPad Safari installation and actual system status bar not tested.','Public GitHub Pages deployment not performed.']},indent=2))
    finally:
      server.terminate();server.wait(timeout=5)
print(f'BROWSER ACCEPTANCE: {len(results)} checks passed')
