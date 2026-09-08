from pathlib import Path
import os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];HTML=(ROOT/'index.html').read_text()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('KASKAD_CHROMIUM') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 shim='<script>const __s={};Object.defineProperty(window,"localStorage",{value:{getItem:k=>__s[k]??null,setItem:(k,v)=>__s[k]=v}});</script>'
 p.set_content(HTML.replace('<head>','<head>'+shim,1));p.wait_for_function('window.Kaskad');p.wait_for_timeout(80)
 p.evaluate('''()=>{const w=Kaskad.world,b=w.newBall(400,681,100,100);b.inLane=false;b.laneReturnLockUntil=0;w.balls=[b];w.combo=1.65;w.lastHit=w.time;}''')
 p.wait_for_timeout(80)
 parked=p.evaluate('Kaskad.world.balls.length===1&&Kaskad.world.balls[0].parked&&Kaskad.world.combo===1.65')
 r=p.locator('#board').bounding_box();x=r['x']+r['width']*.45;y=r['y']+r['height']*.96
 p.locator('#board').dispatch_event('pointerdown',{'pointerId':71,'pointerType':'touch','isPrimary':True,'button':0,'clientX':x,'clientY':y});p.wait_for_timeout(260)
 charging=p.evaluate('Kaskad.world.charging')
 p.locator('#board').dispatch_event('pointerup',{'pointerId':71,'pointerType':'touch','isPrimary':True,'button':0,'clientX':x,'clientY':y});p.wait_for_timeout(80)
 relaunched=p.evaluate('Kaskad.world.balls.length===1&&!Kaskad.world.balls[0].parked&&Kaskad.world.balls[0].inLane&&Kaskad.world.combo===1.65')
 print('PASS spring parking browser' if parked else 'FAIL spring parking browser')
 print('PASS parked ball charges' if charging else 'FAIL parked ball charges')
 print('PASS parked ball relaunch preserves run' if relaunched else 'FAIL parked ball relaunch preserves run')
 b.close()
 if not all([parked,charging,relaunched]): raise SystemExit(1)
