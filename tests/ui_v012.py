"""v0.12 checks: uniform icon rendering, safe launch meter, local UI motion."""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'tests/artifacts';ART.mkdir(exist_ok=True)
HTML=(ROOT/'index.html').read_text();results=[];errors=[]
def check(name,ok,detail=None):
 results.append(dict(name=name,passed=bool(ok),detail=detail))
 print('PASS' if ok else 'FAIL',name,detail if not ok else '',flush=True)
 if not ok:raise AssertionError(name)
def boot(browser,seed=None,w=390,h=844,reduced=False):
 p=browser.new_page(viewport=dict(width=w,height=h),device_scale_factor=2,is_mobile=w<600,has_touch=True,reduced_motion='reduce' if reduced else 'no-preference')
 p.on('pageerror',lambda e:errors.append(str(e)))
 values={} if seed is None else {'kaskad_campaign_v1':json.dumps(seed)}
 shim='<script>window.__saved='+json.dumps(values)+';Object.defineProperty(window,"localStorage",{value:{getItem:k=>__saved[k]??null,setItem:(k,v)=>__saved[k]=v}});'
 shim+='''window.__aspects={circles:0,text:0,maxCircle:1,maxText:1};
 for(const [method,key] of [['arc','Circle'],['fillText','Text']]){
  const original=CanvasRenderingContext2D.prototype[method];
  CanvasRenderingContext2D.prototype[method]=function(...args){const t=this.getTransform(),x=Math.hypot(t.a,t.b),y=Math.hypot(t.c,t.d);if(x>0&&y>0){__aspects[key==='Circle'?'circles':'text']++;__aspects['max'+key]=Math.max(__aspects['max'+key],x/y,y/x);}return original.apply(this,args);};
 }
 </script>'''
 p.set_content(HTML.replace('<head>','<head>'+shim,1));p.wait_for_function('window.Kaskad');p.wait_for_timeout(90);return p
def ev(p,name,pt,pid=45):p.locator('#board').dispatch_event(name,dict(pointerId=pid,pointerType='touch',isPrimary=True,button=0,clientX=pt['x'],clientY=pt['y']))
def freepoint(p):return p.evaluate('''()=>{const r=document.querySelector('#board').getBoundingClientRect();return{x:r.left+r.width*.45,y:r.top+r.height*.96};}''')
def close(p):p.locator('.modal-close').click();p.wait_for_timeout(210)
def animation_count(p):return p.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('KASKAD_CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 p=boot(b);seed=p.evaluate('Kaskad.snapshot()');seed['prefs']['sound']=False;seed['skills']={'A4':2};seed['activeSkills']={'A4':2};p.close()
 for w,h in [(320,568),(360,640),(360,740),(390,844),(430,932),(320,480),(1440,900)]:
  p=boot(b,seed,w,h);tag=f'{w}x{h}';pt=freepoint(p)
  ev(p,'pointerdown',pt);p.wait_for_timeout(220)
  low=p.evaluate('Number(document.querySelector("#launchMeter").getAttribute("aria-valuenow"))')
  p.wait_for_timeout(330);higher=p.evaluate('Number(document.querySelector("#launchMeter").getAttribute("aria-valuenow"))')
  check('launch meter follows the hold '+tag,0<low<higher<100,(low,higher))
  p.wait_for_timeout(410)
  stats=p.evaluate('window.__aspects')
  check('circle artwork uses equal X/Y scale '+tag,stats['circles']>10 and stats['maxCircle']<1.00001,stats)
  check('canvas type and price tags are not stretched '+tag,stats['text']>10 and stats['maxText']<1.00001,stats)
  layout=p.evaluate('''()=>{const get=id=>document.querySelector(id),r=get('#board').getBoundingClientRect(),m=get('#launchMeter').getBoundingClientRect(),c=Kaskad.camera;
   const bottom=Math.max(...Kaskad.world.flippers().map(f=>Math.max(f.y,f.y2)*c.sy))+10*c.artScale+r.top;
   const inside=[...get('#launchMeter').children].every(e=>{const q=e.getBoundingClientRect();return q.left>=m.left&&q.right<=m.right&&q.top>=m.top&&q.bottom<=m.bottom;});
   return{meter:{x:m.x,y:m.y,width:m.width,height:m.height,bottom:m.bottom},flipperBottom:bottom,
    below:m.top>=bottom,inside,contained:m.left>=r.left&&m.right<=r.right&&m.bottom<=r.bottom,
    touch:getComputedStyle(get('#launchMeter')).pointerEvents,full:get('#launchMeter').classList.contains('full'),percent:get('#launchPercent').textContent,marker:!get('#launchPrevious').hidden};}''')
  check('power meter clears the flippers '+tag,layout['below'] and layout['contained'],layout)
  check('charge contents fit, including 100 percent '+tag,layout['inside'] and layout['full'] and layout['percent']=='100%',layout)
  check('meter is touch-through and shows A4 marker '+tag,layout['touch']=='none' and layout['marker'],layout)
  p.screenshot(path=str(ART/f'charge_v012_{tag}.png'))
  ev(p,'pointerup',pt);check('release still launches the ball '+tag,p.evaluate('Kaskad.world.balls.length===1&&!Kaskad.world.charging'))
  p.wait_for_timeout(480)
  check('charge panel hides after release '+tag,p.evaluate('document.querySelector("#launchMeter").getAttribute("aria-hidden")==="true"'))
  p.locator('#settingsBtn').click();p.wait_for_timeout(370)
  check('square settings icons remain square '+tag,p.evaluate('''[...document.querySelectorAll('.modal-header .icon-button svg,.settings-card h3 svg')].every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<.01;})'''))
  if tag in ['320x568','390x844']:p.screenshot(path=str(ART/f'settings_v012_{tag}.png'))
  close(p);p.locator('#treeFab').click();p.wait_for_timeout(300)
  check('skill icons remain square '+tag,p.evaluate('''[...document.querySelectorAll('.skill-node svg')].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&Math.abs(r.width-r.height)<.01;})'''))
  if tag=='390x844':p.screenshot(path=str(ART/'tree_v012.png'))
  p.close()
 # Animations must not pause time, replace panels on purchases, or race on close.
 rich=json.loads(json.dumps(seed));rich['coins']=5000;rich['gems']=100;p=boot(b,rich)
 p.locator('#treeFab').click();check('opening window has a UI animation',animation_count(p)>0)
 t=p.evaluate('Kaskad.world.time');p.wait_for_timeout(310)
 check('world keeps simulating during window animation',p.evaluate('Kaskad.world.time')>t+.1)
 p.locator('[data-action="skill-select"][data-skill="A1"]').click();p.wait_for_timeout(260)
 p.evaluate('window.__nodes={map:document.querySelector("#skillTreeMap"),pop:document.querySelector("#skillPopover"),body:document.querySelector(".modal-body")};')
 p.locator('[data-action="skill-buy"]').click()
 check('skill upgrade has a local bounce',p.evaluate('document.querySelector(".pop-icon").getAnimations().length>0'))
 check('upgrade preserves popup and map elements',p.evaluate('document.querySelector("#skillTreeMap")===__nodes.map&&document.querySelector("#skillPopover")===__nodes.pop&&document.querySelector(".modal-body")===__nodes.body'))
 p.locator('.modal-close').click()
 check('dismissal animates but immediately releases gameplay',p.evaluate('!Kaskad.ui.modal&&document.querySelector("#modalRoot").classList.contains("is-closing")&&!document.querySelector(".layout").inert'))
 p.locator('#settingsBtn').click();p.wait_for_timeout(400)
 check('rapid reopening cannot be removed by an old close callback',p.evaluate('Kaskad.ui.modal==="settings"&&!!document.querySelector(".modal-settings")'))
 p.locator('[data-action="assist-settings"]').click();p.wait_for_timeout(260)
 check('switch responds without replacing settings',p.evaluate('document.querySelector("[data-action=assist-settings]").getAttribute("aria-checked")==="false"'))
 close(p);pt=freepoint(p);ev(p,'pointerdown',pt);p.wait_for_timeout(270);p.locator('#settingsBtn').click();p.wait_for_timeout(300)
 check('opening menu cancels charge and its indicator',p.evaluate('!Kaskad.world.charging&&document.querySelector("#launchMeter").getAttribute("aria-hidden")==="true"'))
 p.close()
 for os_reduced in [False,True]:
  quiet=json.loads(json.dumps(seed));quiet['prefs']['motion']=bool(os_reduced)
  p=boot(b,quiet,reduced=os_reduced);p.locator('#settingsBtn').click();p.wait_for_timeout(30)
  check(('OS' if os_reduced else 'game')+' reduced motion disables UI animations',animation_count(p)==0)
  close(p);pt=freepoint(p);ev(p,'pointerdown',pt);p.wait_for_timeout(500)
  check('reduced motion does not disable charge feedback '+str(os_reduced),p.evaluate('Kaskad.world.charging&&Number(document.querySelector("#launchMeter").getAttribute("aria-valuenow"))>30'))
  ev(p,'pointerup',pt);p.close()
 check('no uncaught browser errors',not errors,errors);b.close()
(ART/'ui_v012_results.json').write_text(json.dumps(dict(checks=results,errors=errors),ensure_ascii=False,indent=2))
print('TOTAL',len(results),'PASS',sum(r['passed'] for r in results))
