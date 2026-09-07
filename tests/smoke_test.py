"""Fast browser smoke test for Kaskad v0.5."""
import os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')

def check(name, value):
    assert value, name
    print('PASS', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or None,
        headless=True, args=['--no-sandbox'],
    )
    ctx = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = ctx.new_page(); errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_default_timeout(5000)
    page.evaluate("""()=>{
      window.__testStore={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStore[k]??null}, setItem(k,v){window.__testStore[k]=String(v)},
        removeItem(k){delete window.__testStore[k]},clear(){window.__testStore={}}
      }});
    }""")
    page.set_content(HTML, wait_until='load'); page.wait_for_function('!!window.Kaskad'); page.wait_for_timeout(150)

    check('standalone build exposes v0.5 runtime', page.evaluate("Kaskad.version==='0.5-tap-hud-unified-tree'"))
    check('auto flippers are enabled by default', page.evaluate('Kaskad.snapshot().autoFlippers===true'))
    check('launch/flipper control button is absent', page.locator('#launchConsole').count()==0 and page.locator('#launchBtn').count()==0)
    check('pause control is absent', page.locator('#pauseBtn').count()==0 and page.locator('.pause-button').count()==0)
    check('gameplay has no auto-flip toggle', page.locator('#autoBtn').count()==0 and page.locator('.auto-row').count()==0)

    layout = page.evaluate("""()=>{
      const b=document.getElementById('boardWrap').getBoundingClientRect(), h=document.querySelector('.topbar').getBoundingClientRect(), n=document.querySelector('.game-nav').getBoundingClientRect();
      const c=Kaskad.camera,f=Kaskad.world.flippers(); const fb=Math.max(...f.flatMap(x=>[x.y,x.y2]))*c.sy+b.top;
      const pr=document.querySelector('.hud-progress').getBoundingClientRect();
      return {boardTop:b.top,hudBottom:h.bottom,boardBottom:b.bottom,navTop:n.top,flipperBottom:fb,width:b.width,sx:c.sx,sy:c.sy,progressTop:pr.top,progressBottom:pr.bottom};
    }""")
    check('top HUD does not cover gameplay', layout['boardTop'] >= layout['hudBottom']-.75)
    check('progress lives inside the top HUD', layout['progressTop'] >= 0 and layout['progressBottom'] <= layout['hudBottom']+.5)
    check('flippers remain inside visible playfield', layout['flipperBottom'] < layout['boardBottom']-2)
    check('table width is capped and X scale follows width only', layout['width']<=430.5 and abs(layout['sx']-layout['width']/440)<.002)

    # Hold and release directly on the playfield; no dedicated launch button.
    r=page.locator('#board').bounding_box(); cdp=ctx.new_cdp_session(page); x,y=r['x']+r['width']*.5,r['y']+r['height']*.72
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); page.wait_for_timeout(330)
    cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]}); page.wait_for_timeout(130)
    check('hold and release on the field launches a ball', page.evaluate('Kaskad.world.balls.length===1'))

    # Live overlay still does not pause physics.
    page.locator('#menuTab').click(); t=page.evaluate('Kaskad.world.time'); page.wait_for_timeout(220)
    check('main menu remains a live overlay', page.evaluate('Kaskad.world.time') > t+.03)
    page.locator('#playTab').click(); page.wait_for_timeout(80)

    # Auto-flip control exists only in Settings, not Automation.
    page.locator('#settingsBtn').click(); page.wait_for_timeout(80)
    check('auto-flip toggle exists in Settings', page.locator('[data-action="assist-settings"]').count()==1)
    page.locator('#menuTab').click(); page.wait_for_timeout(60); page.locator('[data-action="automation"]').first.click(); page.wait_for_timeout(60)
    check('Automation screen has no auto-flip toggle', page.locator('[data-action="assist-modal"]').count()==0)
    page.locator('#playTab').click(); page.wait_for_timeout(80)

    # Sandbox gives enough resources for UI mutation tests.
    page.evaluate('Kaskad.openSandbox()'); page.wait_for_timeout(120)
    page.locator('#workshopBtn').click(); page.wait_for_timeout(100)
    upgrade=page.locator('[data-module-upgrade]:not([disabled])').first
    check('sandbox exposes an upgradeable module card', upgrade.count()==1)
    page.evaluate('window.__sameModalBody=document.querySelector(".modal-body")')
    card=upgrade.locator('xpath=ancestor::article[1]'); before=card.locator('[data-module-level]').inner_text()
    upgrade.click(); page.wait_for_timeout(80); after=card.locator('[data-module-level]').inner_text()
    check('module upgrade mutates only current UI instead of recreating sheet', page.evaluate('document.querySelector(".modal-body")===window.__sameModalBody'))
    check('module card level updates in place', before!=after)

    # Unified horizontally pannable tree, no branch tabs, and in-place skill selection/purchase.
    page.locator('#treeBtn').click(); page.wait_for_timeout(100)
    tree=page.locator('#skillTreeScroll')
    check('skill tree contains four visible lanes in one surface', page.locator('[data-branch-lane]').count()==4 and page.locator('.branch-select').count()==0)
    check('unified tree is horizontally scrollable', page.evaluate('skillTreeScroll.scrollWidth>skillTreeScroll.clientWidth+100'))
    page.evaluate('window.__treeBody=document.querySelector(".modal-body")')
    page.locator('[data-skill-node="B1"]').click(); page.wait_for_timeout(60)
    check('selecting another branch keeps the same tree sheet', page.evaluate('document.querySelector(".modal-body")===window.__treeBody'))
    page.locator('#skillDetail [data-action="skill-buy"]').click(); page.wait_for_timeout(80)
    check('skill purchase keeps the same tree sheet', page.evaluate('document.querySelector(".modal-body")===window.__treeBody'))
    check('purchased skill rank updates in place', page.locator('[data-skill-node="B1"] [data-skill-rank]').inner_text().startswith('1/'))

    check('no browser JavaScript exceptions', not errors)
    browser.close()
