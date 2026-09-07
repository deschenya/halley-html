"""Mobile layout regression tests for Kaskad v0.5."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'tests'/'artifacts'; OUT.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'index.html').read_text(); RESULTS=[]
def ok(name,value=True): assert value,name; RESULTS.append(name); print('PASS',name,flush=True)
def install(page):
    page.evaluate("""()=>{window.__testStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]},clear(){window.__testStore={}}}})}""")
    page.set_content(HTML,wait_until='load');page.wait_for_function('!!window.Kaskad');page.wait_for_timeout(100)
def snap(page,name): page.evaluate('document.querySelectorAll(".toast").forEach(e=>e.remove())');page.wait_for_timeout(80);page.screenshot(path=str(OUT/name))
def bounds(page):
    return page.evaluate("""()=>{const doc=document.documentElement,b=boardWrap.getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect(),n=document.querySelector('.game-nav').getBoundingClientRect(),c=Kaskad.camera,fs=Kaskad.world.flippers();const fb=Math.max(...fs.flatMap(f=>[f.y,f.y2]))*c.sy+b.top;return{x:doc.scrollWidth<=innerWidth+1,y:doc.scrollHeight<=innerHeight+1,board:b.toJSON(),hud:h.toJSON(),nav:n.toJSON(),camera:c,flippers:fb,widthCapped:b.width<=430.5,hudClear:b.top>=h.bottom-.75,navClear:b.bottom<=n.top+1};}""")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or None,headless=True,args=['--no-sandbox']);errors=[]
    for width,height in [(320,568),(360,640),(360,740),(390,844),(430,932),(1440,900)]:
        c=b.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=width<600,has_touch=width<600);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));install(page);r=bounds(page)
        ok(f'No document overflow {width}x{height}',r['x'] and r['y'])
        ok(f'HUD never overlaps playfield {width}x{height}',r['hudClear'])
        ok(f'Bottom nav never covers playfield {width}x{height}',r['navClear'])
        ok(f'Flippers remain visible {width}x{height}',r['flippers']<r['board']['bottom']-2)
        ok(f'Table width never stretches past 430 px {width}x{height}',r['widthCapped'])
        ok(f'Horizontal camera scale follows only table width {width}x{height}',abs(r['camera']['sx']-r['board']['width']/440)<.002)
        ok(f'Vertical camera fills available play height {width}x{height}',abs(r['camera']['sy']-r['board']['height']/700)<.002)
        snap(page,f'layout_{width}x{height}.png')
        page.locator('#treeBtn').click();page.wait_for_timeout(50)
        ok(f'Unified tree horizontally pans {width}x{height}',page.evaluate('skillTreeScroll.scrollWidth>skillTreeScroll.clientWidth'))
        c.close()
    ok('No browser JavaScript exceptions',not errors)
    (OUT/'layout_report.json').write_text(json.dumps({'passed':len(RESULTS),'checks':RESULTS,'errors':errors},indent=2),encoding='utf-8');b.close()
