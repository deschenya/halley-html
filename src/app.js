/* Application state, editor, progression and menus. Save only persistent state;
   a reloaded launch starts with a fresh ball, never with duplicate rewards. */
let mode='campaign',persistent=true,loadWarning='',offlineNotice=null;
function loadState(key){try{const raw=localStorage.getItem(key);return raw?validateState(JSON.parse(raw)):newState();}catch(e){loadWarning=e.name==='SecurityError'?'Автосохранение недоступно. Сохраняй прогресс файлом в настройках.':'Сохранение повреждено. Можно восстановить резервную копию в настройках.';return newState();}}
let state=loadState(SAVE_KEY),world,renderer;
const ui={view:'game',modal:'',selected:null,slot:-1,moving:null,moveOut:false,linkFrom:null,shopTab:'catalog',branch:'A',skill:'A1',metaTab:'map',focus:null,readyNotified:false,ratePending:false,closing:false,modalScroll:0};
let frameLast=0,accumulator=0,lastHud=-1,lastSave=0,lastPlanner=0,hiddenAt=0,activePointer=null,keyHeld=false,bannerTimer=0,rateTimer=0;
const writer=globalThis.crypto?.randomUUID?.()||String(Math.random());
const canvas=$('board');
function offlineParams(s=state){const sk=s.activeSkills;return{eff:Math.min(.75,.2+.1*(sk.D3||0)+.01*(s.activeResearch.offline||0)),cap:7200*(1+(sk.D5||0))};}
function acceptOffline(){if(mode!=='campaign'||state.completed<3||!state.offline)return;const t=clamp((Date.now()-state.savedAt)/1000,0,state.offline.cap),gain=state.offline.rate*t*state.offline.eff;if(t>=30&&gain>=1){state.coins+=gain;offlineNotice={seconds:t,coins:gain,rate:state.offline.rate,eff:state.offline.eff,cap:state.offline.cap};}state.savedAt=Date.now();}
acceptOffline();
function saveNow(){try{const params=offlineParams(),signature=rateSignature(state);state.offline=state.phase==='play'&&state.completed>=3&&state.rateCache?.signature===signature?{...params,rate:state.rateCache.rate}:null;state.savedAt=Date.now();localStorage.setItem(mode==='sandbox'?SANDBOX_KEY:SAVE_KEY,JSON.stringify({...state,_writer:writer}));persistent=true;}catch(e){persistent=false;}updateSaveStatus();}
function updateSaveStatus(){if(!$('saveStatus'))return;$('saveStatus').innerHTML=`<i></i>${mode==='sandbox'?'Песочница: отдельный профиль':persistent?'Прогресс сохраняется на этом устройстве':'Сохранение недоступно. Экспортируйте прогресс.'}`;}
function rebuildWorld(){world=new PinballWorld(engineConfig(state),{onEvent:onGameEvent});accumulator=0;if(renderer){renderer.lastTime=0;renderer.floats=[];renderer.particles=[];}ui.readyNotified=state.score>=goal(state.stage);}
function onGameEvent(e){
 if(e.type==='reward'){state.coins+=e.coins;state.score+=e.points;state.stats.coins+=e.coins;if(e.qualified)state.stageEarned+=e.coins;}
 if(e.type==='hit'){state.stats.hits++;state.stageHits++;state.mastery[e.moduleType]=(state.mastery[e.moduleType]||0)+1;audio.hit(e.moduleType);}
 if(e.type==='launch'){state.stats.runs++;if(e.manual){state.lastQ=e.q;state.launchHistory.push(e.q);state.launchHistory=state.launchHistory.slice(-12);if(!active(state).D4){state.profiles=[e.q];world.cfg.profiles=[e.q];}world.cfg.lastQ=e.q;}audio.tone(180,.08,.035,'triangle',520);}
 if(e.type==='flip')audio.tone(80,.055,.016,'triangle',55);
 if(e.type==='perfect'){state.stats.perfect++;showBanner('ТОЧНО +'+Math.round((.25+.04*world.s('A1'))*100)+'%');audio.tone(880,.09,.025,'sine',1174);if(state.prefs.vibration)navigator.vibrate?.(12);}
 if(e.type==='lost'){state.stats.bestRun=Math.max(state.stats.bestRun,e.points||0);saveNow();scheduleRate();}
 if(e.type==='multi'){showBanner('МУЛЬТИБОЛ');audio.tone(330,.3,.035,'triangle',990);}
 if(e.type==='resonance')showBanner('РЕЗОНАНС +30%');
 if(e.type==='master')showBanner('РЕЖИМ МАСТЕРА');
 if(e.type==='insured')showBanner('СТРАХОВКА');
 if(e.type==='payout')audio.tone(520,.13,.025,'sine',740);
 if(e.type==='unstuck')toast('Шарик освобожден без дополнительной награды');
 renderer?.event(e,state);
}
const audio={ctx:null,last:0,init(){if(!state.prefs.sound)return;try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();}catch(e){}},tone(hz,len=.08,vol=.02,type='sine',end=hz){if(!state.prefs.sound||!this.ctx||this.ctx.state!=='running')return;try{const a=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,a);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),a+len);g.gain.setValueAtTime(vol,a);g.gain.exponentialRampToValueAtTime(.0001,a+len);o.connect(g);g.connect(this.ctx.destination);o.start(a);o.stop(a+len+.01);}catch(e){}},hit(type){if(!this.ctx||this.ctx.currentTime-this.last<.055)return;this.last=this.ctx.currentTime;this.tone(({bar:390,bumper:520,spinner:650,bank:290,gate:740,portal:440,magnet:220,multi:330})[type],.09,.025,'sine');}};
function toast(text,warn=false){const e=document.createElement('div');e.className='toast'+(warn?' warn':'');e.textContent=text;$('toasts').appendChild(e);setTimeout(()=>e.remove(),3400);}
function showBanner(text){$('eventBanner').textContent=text;$('eventBanner').classList.add('visible');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>$('eventBanner').classList.remove('visible'),1150);}
function isPaused(){return state.phase==='prep'||document.hidden;}
function scheduleRate(){clearTimeout(rateTimer);if(state.completed<3||state.phase!=='play')return;if(state.rateCache?.signature===rateSignature(state))return;ui.ratePending=true;rateTimer=setTimeout(()=>{if(world.balls.length&&!isPaused()){scheduleRate();return;}const signature=rateSignature(state);try{const rate=calculateRate(state);state.rateCache={signature,rate};}catch(e){console.warn('Rate estimate failed',e);}ui.ratePending=false;saveNow();if(ui.view==='game')renderOverview();},350);}
function fitBoard(){
 const wrap=$('boardWrap'),space=document.querySelector('.board-space');if(!wrap||!space)return;
 const rect=space.getBoundingClientRect();
 wrap.style.height=Math.max(80,rect.height)+'px';wrap.style.width=Math.max(80,rect.width)+'px';wrap.style.maxHeight='none';
 renderer?.resize();
}
function renderAll(){
 document.body.classList.toggle('editor',ui.view==='workshop');document.body.classList.toggle('prep',state.phase==='prep');document.body.classList.toggle('sandbox-mode',mode==='sandbox');
 $('modeLabel').textContent=mode==='sandbox'?'ПЕСОЧНИЦА · ОТДЕЛЬНЫЙ ПРОФИЛЬ':'ТВОЙ МАЛЕНЬКИЙ КАСКАД';
 $('sandboxBtn').textContent=mode==='sandbox'?'Вернуться в кампанию':'Песочница';
 $('soundBtn').innerHTML=icon(state.prefs.sound?'sound':'mute');$('helpBtn').innerHTML=icon('help');$('settingsBtn').innerHTML=icon('settings');
 for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);
 const chap=chapter(state.stage);$('chapterName').textContent=ui.view==='workshop'?'Расстановка':chap.name;
 $('chapterCopy').textContent=chap.copy;$('chapterTrack').innerHTML='';$('nextUnlock').innerHTML='';
 if(ui.view==='workshop')renderEditor();else renderOverview();
 updateHUD(true);updateSaveStatus();mobileNav();requestAnimationFrame(fitBoard);
}
function updateHUD(force=false){
 const t=performance.now();if(!force&&t-lastHud<75)return;lastHud=t;
 const g=goal(state.stage),ready=state.score>=g,assisted=state.autoFlippers!==false,pct=clamp(state.score/g*100,0,100);
 $('scoreValue').textContent=fmt(state.score);$('scoreValue').title=exact(state.score);
 $('goalValue').textContent=fmt(g);$('coinsValue').textContent=fmt(state.coins);$('gemsValue').textContent=fmt(state.gems);
 $('coinsValue').parentElement.title=exact(state.coins)+' монет';$('gemsValue').parentElement.title=exact(state.gems)+' кристаллов';
 $('progressFill').style.width=pct+'%';$('progressPercent').textContent=Math.floor(pct)+'%';
 $('stageLabel').textContent=state.stage;$('comboValue').textContent='×'+world.combo.toFixed(2);
 $('comboBadge').classList.toggle('hot',world.combo>=1.5);
 $('runNumber').textContent=state.stats.runs;$('perfectStat').textContent=world.runPerfect;$('hitStat').textContent=world.runHits;
 $('boardStatus').innerHTML='<i></i>'+(ui.view==='workshop'?'РАССТАНОВКА':state.phase==='prep'?'НОВОЕ ПОЛЕ':'ПОЛЕ В ИГРЕ');
 const charging=world.charging,has=world.balls.length>0;
 const prompt=$('boardPrompt');prompt.classList.toggle('hidden',has||charging||ui.view==='workshop'||state.phase==='prep'||ready||state.stats.runs>0||mode==='sandbox');
 prompt.querySelector('strong').textContent=state.stats.runs===0?'Тапай прямо по полю':'Ещё один каскад?';
 prompt.querySelector('span:last-child').textContent=state.auto&&state.completed>=3?'Автозапуск включён':'Зажми и отпусти, чтобы запустить';
 $('advanceBtn').classList.toggle('visible',ready&&state.phase==='play'&&ui.view==='game');
 $('advanceReward').textContent='+'+reward(state.stage,state.activeSkills);
 $('treeDot').style.display=state.phase==='prep'&&state.gems>=2?'block':'none';
 $('shopDot').style.display=state.inventory.some(m=>m.slot>=0&&state.coins>=priceLevel(state,m))?'block':'none';
 if(ready&&!ui.readyNotified){ui.readyNotified=true;toast('Поле пройдено! Забери кристаллы и открой новое.');audio.tone(660,.4,.035,'sine',1320);saveNow();}
}
function renderOverview(){const mods=state.inventory.filter(m=>m.slot>=0).sort((a,b)=>a.slot-b.slot),free=slotCount(state)-occupied(state).size;let rows=mods.slice(0,5).map(m=>`<button class="module-row" data-action="edit-module" data-id="${m.id}">${modIcon(m.type)}<span class="module-name"><strong>${TYPES[m.type].short}</strong><small>${dec(TYPES[m.type].c*Math.pow(1.35,m.level-1))} мон. / ${dec(TYPES[m.type].p*Math.pow(1.35,m.level-1))} оч.</small></span><span class="level">L${m.level}</span></button>`).join('');if(mods.length>5)rows+=`<button class="module-row empty" data-action="workshop"><span class="mod-icon">${icon('build')}</span><span class="module-name"><strong>Еще модулей: ${mods.length-5}</strong><small>Открыть сборку полностью</small></span></button>`;else if(free)rows+=`<button class="module-row empty" data-action="workshop"><span class="mod-icon">${icon('plus')}</span><span class="module-name"><strong>Добавить модуль</strong><small>${free} свободных сокета</small></span></button>`;
 const tip=state.completed===0?'Каждое столкновение <strong>приносит монеты</strong>. Улучшай палочки или покупай новые, чтобы собрать 800 очков.':state.completed<3?'Бампер возвращает шарик наверх. Попробуй его вместе с наклоненными палочками.':state.completed<5?'Вертушка выплачивает бонус за серию контактов. Расстановка важна и для автомата.':'Новая геометрия не отменяет инвестиции. Модули, уровни и монеты остаются с тобой.';
 $('rightContent').innerHTML=`<div class="rail-heading"><h2>Твоя сборка</h2><span class="count-badge">${occupied(state).size} / ${slotCount(state)}</span></div><div class="module-list">${rows}</div><button class="btn wide panel-action" data-action="workshop">${icon('build')} Настроить поле</button><div class="build-note"><div class="eyebrow">${state.completed===0?'ПОСТРОЙ СВОЙ КАСКАД':'СИСТЕМА БЕЗ СБРОСА'}</div><p>${tip}</p></div>${state.completed>=3?`<div class="right-bottom"><span>Автовыработка</span><span>${ui.ratePending?'расчет...':state.rateCache?.signature===rateSignature(state)?dec(state.rateCache.rate)+' / с':'\u2014'}</span></div><button class="btn subtle wide small" data-action="automation">${icon('auto')} Настройки автоматики</button>`:`<div class="right-bottom"><span>Запуск всегда бесплатный</span><span>\u221e</span></div>`}${mode==='sandbox'?'<button class="btn gold wide panel-action" data-action="sandbox-tools">Инструменты песочницы</button>':''}`;
}
function openWorkshop(id=null){
 if(ui.view!=='workshop'){
  closeModal(false);world.cancelCharge();ui.view='workshop';ui.selected=id;ui.slot=id?state.inventory.find(m=>m.id===id)?.slot??-1:-1;ui.moving=null;ui.linkFrom=null;ui.shopTab='installed';renderAll();
 }
 if(id){ui.selected=id;ui.slot=state.inventory.find(m=>m.id===id)?.slot??-1;openModuleDetail(id);}else openModules('installed');
}
function finishEditor(){
 closeModal(false);ui.view='game';ui.moving=null;ui.linkFrom=null;ui.selected=null;ui.slot=-1;
 saveNow();scheduleRate();renderAll();
}
function renderEditor(){
 const m=state.inventory.find(m=>m.id===ui.selected&&m.slot>=0),n=slotCount(state),used=occupied(state);
 $('editorHint').textContent=ui.linkFrom?'Выбери соседний модуль для связи':ui.moving?'Выбери свободную ячейку на поле':ui.slot>=0?'Ячейка '+(ui.slot+1)+' · игра продолжается':'Выбери ячейку на поле или её номер';
 let body=`<div class="placement-top" ${m?`data-placement-module="${m.id}"`:''}>${m?modIcon(m.type):`<span class="mod-icon">${icon('blocks')}</span>`}<div><h3>${m?TYPES[m.type].name:'Твоя расстановка'}</h3><small data-placement-meta>${m?'Уровень '+m.level+' · ячейка '+(m.slot+1):used.size+' из '+n+' ячеек занято'}</small></div><button class="btn small" data-action="modules-back">${icon('blocks')} Модули</button></div>`;
 body+=`<div class="slot-strip" aria-label="Выбор ячейки">${Array.from({length:n},(_,i)=>`<button class="socket-chip ${used.has(i)?'filled':''} ${ui.slot===i?'selected':''}" data-action="pick-slot" data-index="${i}" aria-label="Ячейка ${i+1}${used.has(i)?', занята':', свободна'}">${i+1}</button>`).join('')}</div>`;
 if(m){const price=priceLevel(state,m);body+=`<div class="placement-actions"><button class="btn small" data-action="rotate" data-id="${m.id}" data-dir="-1">↶ 15°</button><button class="btn small" data-action="rotate" data-id="${m.id}" data-dir="1">↷ 15°</button><button class="btn small" data-action="move" data-id="${m.id}">Перенести</button><button class="btn primary small" data-placement-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<price?'disabled':''}>↑ ${fmt(price)} ●</button></div>`;}
 else body+=`<div class="placement-actions"><button class="btn primary small" data-action="open-catalog">${icon('plus')} Добавить модуль${ui.slot>=0?' в ячейку '+(ui.slot+1):''}</button><button class="btn small" data-action="schemes">${icon('store')} Схемы</button></div>`;
 $('rightContent').innerHTML=body;
 if(ui.modal==='modules')openModules(ui.shopTab);else if(ui.modal==='module'){if(ui.selected)openModuleDetail(ui.selected);else openModules(ui.shopTab);}
}
function editorChanged(){normalizeSlots(state);world.updateModules(state.inventory);world.cfg.link=copy(state.link);saveNow();renderEditor();updateHUD(true);scheduleRate();}
function refreshModuleUpgradeUI(id){
 const m=state.inventory.find(m=>m.id===+id);if(!m)return;const d=TYPES[m.type],u=Math.pow(1.35,m.level-1),cost=priceLevel(state,m),can=state.coins>=cost&&m.level<250;
 const card=document.querySelector(`[data-module-id="${m.id}"]`);if(card){
  const lev=card.querySelector('[data-module-level]');if(lev)lev.textContent='Ур. '+m.level;
  const y=card.querySelector('[data-module-yield]');if(y)y.textContent=`${dec(d.c*u)} мон. · ${dec(d.p*u)} оч.`;
  const b=card.querySelector('[data-module-upgrade]');if(b){b.textContent=m.level>=250?'Максимум':'↑ '+fmt(cost)+' ●';b.disabled=!can;}
  card.classList.remove('flash');void card.offsetWidth;card.classList.add('flash');
 }
 const detail=document.querySelector(`[data-module-detail="${m.id}"]`);if(detail){
  const set=(sel,val)=>{const e=detail.querySelector(sel);if(e)e.textContent=val;};
  set('[data-detail-level]','УРОВЕНЬ '+m.level);set('[data-detail-coins]',dec(d.c*u));set('[data-detail-coins-next]',m.level>=250?'MAX':dec(d.c*u*1.35));set('[data-detail-points]',dec(d.p*u));set('[data-detail-points-next]',m.level>=250?'MAX':dec(d.p*u*1.35));
  const b=detail.querySelector('[data-detail-upgrade]');if(b){b.textContent=m.level>=250?'Максимальный уровень':'Улучшить на 35% · '+fmt(cost)+' ●';b.disabled=!can;}
  const shortage=detail.querySelector('[data-detail-shortage]');if(shortage){shortage.textContent=state.coins<cost?'Нужно ещё '+fmt(cost-state.coins)+' монет':'';shortage.hidden=state.coins>=cost;}
  for(const level of [5,10])detail.querySelector(`[data-milestone="${level}"]`)?.classList.toggle('reached',m.level>=level);
  const art=detail.querySelector('.detail-art');if(art){art.classList.remove('flash');void art.offsetWidth;art.classList.add('flash');}
 }
 const placement=document.querySelector(`[data-placement-module="${m.id}"]`);if(placement){const meta=placement.querySelector('[data-placement-meta]');if(meta)meta.textContent=`Уровень ${m.level} · ячейка ${m.slot+1}`;const b=document.querySelector(`[data-placement-upgrade][data-id="${m.id}"]`);if(b){b.textContent=m.level>=250?'MAX':'↑ '+fmt(cost)+' ●';b.disabled=!can;}}
 for(const b of document.querySelectorAll('[data-module-upgrade][data-id]')){const x=state.inventory.find(v=>v.id===+b.dataset.id);if(x)b.disabled=x.level>=250||state.coins<priceLevel(state,x);}
 updateHUD(true);
}
function freeSlots(){const used=occupied(state);return Array.from({length:slotCount(state)},(_,i)=>i).filter(i=>!used.has(i));}
function placeModule(m){const free=freeSlots();if(free.length<(m.type==='portal'?2:1))return toast('Не хватает свободных сокетов',true);if(TYPES[m.type].unique&&state.inventory.some(n=>n.id!==m.id&&n.type===m.type&&n.slot>=0))return toast('На поле допустим только один такой модуль',true);m.slot=free.includes(ui.slot)?ui.slot:free[0];if(m.type==='portal')m.slot2=free.find(i=>i!==m.slot);ui.selected=m.id;ui.slot=m.slot;return true;}
function buyModule(type){if(ui.view!=='workshop'||!TYPES[type]||state.completed<TYPES[type].unlock)return;const cost=priceNew(state,type);if(state.coins<cost)return toast('Не хватает монет',true);const m={id:state.nextId,type,level:1,slot:-1,angle:type==='gate'?90:['portal','magnet'].includes(type)?-90:type==='bar'?-15:0,free:false};if(!placeModule(m))return;state.nextId++;state.coins-=cost;state.inventory.push(m);audio.tone(440,.16,.03,'sine',660);editorChanged();}
function upgradeModule(id,planner=false){const m=state.inventory.find(m=>m.id===id);if(!m||(!planner&&ui.view!=='workshop'))return false;const cost=priceLevel(state,m);if(state.coins<cost||m.level>=250)return false;state.coins-=cost;m.level++;world.updateModules(state.inventory);saveNow();scheduleRate();refreshModuleUpgradeUI(m.id);if(!planner)audio.tone(660,.11,.025,'triangle',880);return true;}
function editorPick(x,y){const slots=world.slots.slice(0,slotCount(state));let nearest=-1,d=44;slots.forEach((p,i)=>{const dist=Math.hypot(p.x-x,p.y-y);if(dist<d){nearest=i;d=dist;}});if(nearest<0)return;const m=state.inventory.find(m=>m.slot===nearest||m.type==='portal'&&m.slot2===nearest);if(ui.linkFrom){const from=state.inventory.find(m=>m.id===ui.linkFrom),a=slots[from?.slot],b=slots[m?.slot];if(m&&from&&m.id!==from.id&&a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=135){state.link={from:from.id,to:m.id};ui.linkFrom=null;editorChanged();toast('Направленная связь создана');}else toast('Нужен другой модуль в радиусе 135 единиц',true);return;}
 if(ui.moving){if(m)return toast('Выбери свободный сокет',true);const moving=state.inventory.find(m=>m.id===ui.moving);if(moving){if(ui.moveOut)moving.slot2=nearest;else moving.slot=nearest;ui.slot=nearest;ui.selected=moving.id;}ui.moving=null;ui.moveOut=false;editorChanged();return;}
 ui.slot=nearest;ui.selected=m?.id||null;renderEditor();}
function storeModule(id){const m=state.inventory.find(m=>m.id===id);if(!m)return;if(state.inventory.filter(m=>m.slot>=0).length<=1)return toast('На поле должен остаться хотя бы один модуль',true);m.slot=-1;delete m.slot2;ui.selected=null;ui.slot=-1;editorChanged();}
function toggleAuto(){
 state.autoFlippers=state.autoFlippers===false;world.autoFlippers=state.autoFlippers;world.cfg.autoFlippers=state.autoFlippers;
 saveNow();renderAll();scheduleRate();
}
function manualDown(e){if(e?.button!==undefined&&e.button!==0)return;if(ui.modal||(state.phase==='prep'&&ui.view!=='workshop'))return;if(e?.preventDefault)e.preventDefault();audio.init();if(ui.view==='workshop'){if(e?.target===canvas){const r=canvas.getBoundingClientRect(),p=renderer?.screenToWorld(e.clientX-r.left,e.clientY-r.top)||{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};editorPick(p.x,p.y);}return;}if(activePointer!==null)return;activePointer=e?.pointerId??'keyboard';if(e?.target?.setPointerCapture&&e.pointerId!==undefined){try{e.target.setPointerCapture(e.pointerId);}catch(err){}}if(world.balls.length)world.pulse(true);else if(world.beginCharge()){ui.holdClock=performance.now();world.chargeUI=0;}updateHUD(true);}
function manualUp(e){if(activePointer===null)return;if(e?.pointerId!==undefined&&activePointer!==e.pointerId)return;activePointer=null;if(world.charging&&!isPaused()){const q=clamp((performance.now()-(ui.holdClock??performance.now()))/900,0,1);world.charging=false;world.chargeUI=0;world.launch(q,true);}else world.cancelCharge();updateHUD(true);}
function cancelInput(){activePointer=null;keyHeld=false;world?.cancelCharge();}
let pendingConfirm=null;
function modal(kind,title,body,actions='',wide=false,kicker=''){
 cancelInput();const old=ui.modal===kind?$('modalRoot').querySelector('.modal-body')?.scrollTop||0:0;
 if(!ui.modal)ui.focus=document.activeElement;ui.modal=kind;
 const sheet=['confirm','transition','offline'].includes(kind);
 const back=['module','catalog-detail'].includes(kind)?'modules-back':['settings','automation','help','stats','sandbox'].includes(kind)?'menu-back':'close';
 $('modalRoot').classList.toggle('dialog-root',sheet);
 $('modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal modal-${kind}" role="${sheet?'dialog':'region'}" ${sheet?'aria-modal="true"':''} aria-labelledby="modalTitle"><header class="modal-header"><div><div class="eyebrow">${kicker||'ТВОЙ КАСКАД'}${state.phase==='play'?'<span class="live-pill"><i></i> ИГРА ИДЁТ</span>':''}</div><h2 id="modalTitle">${title}</h2></div><button class="icon-button" data-action="${sheet?'close':back}" aria-label="${sheet?'Закрыть':'Назад'}">${icon(sheet?'close':'back')}</button></header><div class="modal-body">${body}</div>${actions?`<footer class="modal-actions">${actions}</footer>`:''}</section></div>`;
 $('modalRoot').querySelector('.modal-body').scrollTop=old;document.querySelector('.layout').inert=true;
 requestAnimationFrame(()=>{if(!old)$('modalRoot').querySelector('.modal-header button')?.focus({preventScroll:true});});
 updateHUD(true);mobileNav();
}
function closeModal(refresh=true){
 const previous=ui.modal;ui.modal='';$('modalRoot').innerHTML='';$('modalRoot').classList.remove('dialog-root');document.querySelector('.layout').inert=false;pendingConfirm=null;
 if(ui.focus?.isConnected)ui.focus.focus({preventScroll:true});ui.focus=null;
 if(refresh){
  if(previous==='module'||previous==='catalog-detail'){openModules(ui.shopTab);return;}
  if(previous==='modules'){finishEditor();return;}
  renderAll();scheduleRate();
 }
 mobileNav();
}
function confirmDialog(title,text,yes,fn){pendingConfirm=fn;modal('confirm',title,`<p>${text}</p>`,`<button class="btn subtle" data-action="close">Отмена</button><button class="btn primary" data-action="confirm-generic">${yes}</button>`);}
function openTransition(){if(state.phase!=='play'||state.score<goal(state.stage))return;const n=state.stage,r=reward(n,state.activeSkills),unlocks=Object.values(TYPES).filter(d=>d.unlock===n).map(d=>d.name);if(n===1)unlocks.push('Древо навыков');if(n===3)unlocks.push('Автопружина и офлайн-доход');if(n===5)unlocks.push('Сохраненные схемы');if(n===10)unlocks.push('+2 сокета, оболочки и мастерство');if(n===20)unlocks.push('+2 сокета и финальные навыки');if(n===30)unlocks.push('Экспедиция и исследования');const cash=state.stageEarned*.05*(state.activeSkills.C4||0);modal('transition','Поле пройдено',`<div class="reward-hero"><strong>+${r}</strong><span>кристалла в древо навыков</span></div><div class="info-box"><b>Следующее поле ${n+1} / ${chapter(n+1).name}</b><br>Цель: ${exact(goal(n+1))} очков.<br>Монеты, модули и их уровни сохраняются.</div>${unlocks.length?`<h3>Открывается сейчас</h3><p style="margin-top:10px">${unlocks.join(' \u00b7 ')}</p>`:''}${cash?`<p>Касса перехода: +${fmt(cash)} монет.</p>`:''}<p class="fine">Награда выдается только при подтверждении. Текущий запуск можно завершить без штрафа.</p>`,`<button class="btn subtle" data-action="close">Остаться на поле</button><button class="btn primary" data-action="advance">Забрать и перейти \u2192</button>`,false,'ЭТАП '+String(n).padStart(2,'0')+' / COMPLETE');}
function advanceStage(){if(state.phase!=='play'||state.score<goal(state.stage)||state.completed>=state.stage)return;const n=state.stage,r=reward(n,state.activeSkills),cash=state.stageEarned*.05*(state.activeSkills.C4||0);world.endRun();state.gems+=r;state.coins+=cash;state.completed=n;state.stage=n+1;state.score=0;state.stageEarned=0;state.stageHits=0;state.phase='prep';state.planner.enabled=false;ui.view='game';normalizeSlots(state);closeModal(false);rebuildWorld();saveNow();renderAll();toast(`+${r} кристалла. Выбери навыки перед новым полем.`);openTree();}
function startStage(){if(state.phase!=='prep')return;state.activeSkills=copy(state.skills);state.activeShell=state.shell;state.activeTraits=copy(state.traits);state.activeResearch=copy(state.research);if(state.startedStage!==state.stage&&state.activeSkills.C6){const sorted=state.inventory.filter(m=>m.slot>=0).sort((a,b)=>priceLevel(state,a)-priceLevel(state,b));for(const m of sorted.slice(0,2))m.level++;toast('Стартовый комплект: два модуля улучшены бесплатно');}state.startedStage=state.stage;state.phase='play';ui.view='workshop';ui.selected=null;ui.slot=-1;closeModal(false);rebuildWorld();saveNow();renderAll();scheduleRate();}
function skillNodeHTML(id){
 const b=id[0],d=SKILLS[id],rank=state.skills[id]||0,locked=!!skillRequirement(state,id),afford=!locked&&rank<d.max&&state.gems>=d.costs[rank];
 return `<button class="skill-node ${locked?'locked':afford?'available':''} ${rank?'purchased':''} ${ui.skill===id?'selected':''}" data-action="skill-select" data-skill="${id}" data-skill-node="${id}" style="--branch:${BRANCH_COLORS[b]}"><span class="skill-id">${id} · <span data-skill-rank>${rank}/${d.max}</span></span><strong>${d.name}</strong><span class="skill-bottom"><span class="rank-dots" data-skill-dots>${d.costs.map((_,i)=>`<i class="${i<rank?'filled':''}"></i>`).join('')}</span><span data-skill-cost>${rank===d.max?'✓':d.costs[rank]+' ◇'}</span></span></button>`;
}
function skillBranchHTML(b,name){
 let out=`<section class="branch" data-branch-lane="${b}" style="--branch:${BRANCH_COLORS[b]}"><header class="branch-title"><b>${b}</b><h3>${name}</h3></header>`;
 for(const nums of [[1],[2,3],[4,5],[6],[7]]){out+=`<div class="tree-level ${nums.length===2?'split':''}">`;for(const n of nums)out+=skillNodeHTML(b+n);out+='</div>';}
 return out+'</section>';
}
function skillDetailHTML(id=ui.skill){
 const d=SKILLS[id]||SKILLS.A1,r=state.skills[id]||0,req=skillRequirement(state,id),maxed=r>=d.max,can=state.phase==='prep'&&!req&&!maxed&&state.gems>=d.costs[r];
 const note=req||state.phase!=='prep'?`${req||''}${state.phase!=='prep'?' · Покупка после перехода':''}`:maxed?'Навык изучен полностью':state.gems<d.costs[r]?'Не хватает '+(d.costs[r]-state.gems)+' кристаллов':'';
 return `<div><h3>${id} / ${d.name} <span class="pill">${r}/${d.max}</span></h3><p>${d.desc}</p><small>${note}</small></div><button class="btn primary" data-action="skill-buy" data-skill="${id}" ${!can?'disabled':''}>${maxed?'Максимум':'Изучить · '+d.costs[r]+' ◇'}</button>`;
}
function researchHTML(){
 if(!(state.completed>=30&&Object.entries(state.skills).some(([id,r])=>id.endsWith('7')&&r>0)))return '';
 const research={points:'Очки попаданий',devices:'Выплаты устройств',coins:'Монетный доход',offline:'Офлайн-эффективность'};let body=`<div class="section-heading"><h3>Исследования / после 30 поля</h3></div><div class="research-row">`;
 for(const [id,n] of Object.entries(research)){const rank=state.research[id]||0,cost=20+5*rank;body+=`<div class="gear-card"><strong>${n}</strong><p>${rank}/25 · +${rank}${id==='offline'?' п.п.':'%'}<br>Каждый ранг добавляет 1.</p><button class="btn small wide" data-action="research" data-type="${id}" ${state.phase!=='prep'||rank>=25||state.gems<cost?'disabled':''}>${rank>=25?'Максимум':cost+' ◇'}</button></div>`;}
 return body+'</div><button class="btn subtle small panel-action" data-action="research-reset">Сбросить исследования с возвратом</button>';
}
function refreshTreeUI(){
 if(ui.modal!=='tree')return;const root=$('modalRoot');
 const gems=root.querySelector('#treeGems'),spent=root.querySelector('#treeSpent');if(gems)gems.textContent=fmt(state.gems);if(spent)spent.textContent=spentSkills(state);
 for(const id of Object.keys(SKILLS)){const node=root.querySelector(`[data-skill-node="${id}"]`);if(node)node.outerHTML=skillNodeHTML(id);}
 const detail=root.querySelector('#skillDetail');if(detail){detail.innerHTML=skillDetailHTML();detail.classList.remove('flash');void detail.offsetWidth;detail.classList.add('flash');}
 const research=root.querySelector('#researchArea');if(research)research.innerHTML=researchHTML();
 updateHUD(true);mobileNav();
}
function selectSkill(id){if(!SKILLS[id])return;ui.skill=id;ui.branch=id[0];refreshTreeUI();}
function openTree(){
 const info=state.completed<1?'Древо откроется после первого поля. Кристаллы даются за переход, а не за отдельный запуск.':state.phase==='prep'?'Подготовка нового поля. Выбери улучшения; их эффекты зафиксируются при старте.':'Навыки можно покупать и сбрасывать только между полями. Сейчас доступен просмотр.';
 let body=`<div class="info-box"><b>Кристаллы: <span id="treeGems">${fmt(state.gems)}</span></b> · <span id="treeSpent">${spentSkills(state)}</span> вложено<br>${info}</div><div class="tree-pan-hint"><span>←</span> свайпай по единому древу влево и вправо <span>→</span></div><div class="skill-tree-scroll" id="skillTreeScroll"><div class="tree-canvas">`;
 for(const [b,name] of Object.entries(NAMES))body+=skillBranchHTML(b,name);
 body+=`</div></div><div class="skill-detail" id="skillDetail">${skillDetailHTML()}</div><div id="researchArea">${researchHTML()}</div><p class="fine">Все четыре направления находятся на одной карте. Узлы 2/3 требуют корень ранга 2; 4/5 требуют соответствующую дорожку ранга 2. Узел 6 объединяет обе дорожки и требует поле 10. Узел 7 требует поле 20.</p>`;
 modal('tree','Древо навыков',body,`<button class="btn subtle" data-action="skill-reset" ${state.phase!=='prep'||!spentSkills(state)?'disabled':''}>Вернуть вложенные кристаллы</button><button class="btn ${state.phase==='prep'?'primary':''}" data-action="${state.phase==='prep'?'start-stage':'close'}">${state.phase==='prep'?'Начать поле '+state.stage:'К игре'} →</button>`,true,'28 НАВЫКОВ / ЕДИНОЕ ДРЕВО');
 requestAnimationFrame(()=>{const sc=$('skillTreeScroll');if(!sc)return;sc.scrollLeft=ui.treeX||0;sc.addEventListener('scroll',()=>{ui.treeX=sc.scrollLeft;},{passive:true});const lane=sc.querySelector(`[data-branch-lane="${ui.skill[0]}"]`);if(!ui.treeX&&ui.skill[0]!=='A')lane?.scrollIntoView({inline:'start',block:'nearest'});});
}
function buySkill(id){const d=SKILLS[id],r=state.skills[id]||0;if(!d||state.phase!=='prep'||skillRequirement(state,id)||r>=d.max||state.gems<d.costs[r])return;state.gems-=d.costs[r];state.skills[id]=r+1;normalizeSlots(state);rebuildWorld();saveNow();refreshTreeUI();audio.tone(660,.17,.03,'sine',990);}
function resetSkills(){if(state.phase!=='prep')return;confirmDialog('Перераспределить навыки?',`Вернутся все ${spentSkills(state)} кристалла. Модули в лишних сокетах перейдут на склад. Награды за поля не повторяются.`,'Вернуть кристаллы',()=>{state.gems+=spentSkills(state);state.skills={};normalizeSlots(state);rebuildWorld();saveNow();renderAll();openTree();});}
function openMap(tab=ui.metaTab){ui.metaTab=tab;let body=`<div class="tabs"><button class="${tab==='map'?'active':''}" data-action="meta-tab" data-tab="map">Карта</button><button class="${tab==='gear'?'active':''}" data-action="meta-tab" data-tab="gear">Оболочки</button><button class="${tab==='mastery'?'active':''}" data-action="meta-tab" data-tab="mastery">Мастерство</button></div>`;
 if(tab==='map'){
  body+=`<div class="stat-grid"><div class="stat-cell"><small>ВСЕГО ПОПАДАНИЙ</small><strong>${fmt(state.stats.hits)}</strong></div><div class="stat-cell"><small>ЛУЧШИЙ ЗАПУСК</small><strong>${fmt(state.stats.bestRun)}</strong></div></div>`;
  for(let c=0;c<6;c++){body+=`<section class="map-chapter"><div class="map-chapter-head"><b>${String(c+1).padStart(2,'0')} / ${CHAPTERS[c].name}</b><span>${c*5+1}\u2013${c*5+5}</span></div><div class="map-levels">`;for(let i=1;i<=5;i++){const n=c*5+i;body+=`<div class="map-level ${n<=state.completed?'done':n===state.stage?'current':''}"><b>${n<=state.completed?'\u2713':n}</b><small>${fmt(goal(n))} оч.</small><small>+${reward(n)} \u25c7</small></div>`;}body+='</div></section>';}
  body+=`<div class="info-box"><b>Экспедиция / поле 31+</b><br>Шесть тем, четыре модификатора и цели с ростом x1,55. Без обязательного престижа и сброса инвентаря.${state.stage>30?'<br>Сейчас: '+MODIFIERS[modifier(state.stage)]:''}</div><p class="fine">Ежедневные контракты, недельное испытание и сетевой рейтинг не входят в эту сборку прототипа.</p>`;
 }else if(tab==='gear'){
  body+=`<div class="info-box">Размер, масса и физика шарика одинаковы. <b>Выбор фиксируется при входе на поле.</b></div><div class="gear-grid">`;for(const [id,sh] of Object.entries(SHELLS)){const unlocked=state.completed>=sh.unlock,selected=state.shell===id;body+=`<div class="gear-card ${selected?'selected':''}"><div class="shell-orb" style="background:${sh.color}"></div><strong>${sh.name}</strong><p>${sh.desc}</p><button class="btn small ${selected?'primary':''}" data-action="shell" data-type="${id}" ${!unlocked||state.phase!=='prep'||selected?'disabled':''}>${selected?'Выбрана':!unlocked?'После поля '+sh.unlock:state.phase!=='prep'?'Между полями':'Выбрать'}</button></div>`;}body+='</div>';
 }else{
  body+=`<div class="info-box">${state.completed<10?'Система откроется после поля 10. Ранние попадания уже учитываются.':'500 контактов: оформление. 5 000: выбор свойства. 25 000: след и знак мастерства.'}<br><b>Офлайн и калибровка не дают мастерство.</b></div>`;
  for(const [id,d] of Object.entries(TYPES)){const xp=state.mastery[id]||0,target=xp<500?500:xp<5000?5000:25000,rank=xp>=25000?3:xp>=5000?2:xp>=500?1:0;body+=`<div class="mastery-row"><div class="mastery-row-head">${modIcon(id)}<strong>${d.short} <span class="pill">${rank}/3</span></strong><span>${fmt(xp)} / ${fmt(target)}</span></div><div class="mastery-track"><i style="width:${clamp(xp/target*100,0,100)}%"></i></div><small>${rank>=2?'Доступна специализация: +20% к одной награде, -15% к другой.':'Счетчик общий для всех копий типа.'}</small>${rank>=2&&state.completed>=10?`<div class="choice-row">${[['none','Стандарт'],['coins','Доходный'],['points','Рекордный']].map(([v,n])=>`<button class="btn small ${(state.traits[id]||'none')===v?'active':''}" data-action="trait" data-type="${id}" data-value="${v}" ${state.phase!=='prep'?'disabled':''}>${n}</button>`).join('')}</div>`:''}</div>`;}
 }
 modal('map',tab==='map'?'Путь к новым системам':tab==='gear'?'Оболочки шарика':'Мастерство модулей',body,`<button class="btn" data-action="tree">${icon('tree')} Древо навыков</button><button class="btn primary" data-action="close">Готово</button>`,false,'ПРОГРЕСС / МЕТА');}
function openSchemes(){if(state.completed<5)return toast('Три слота схем откроются после поля 5');if(ui.view!=='workshop'){openWorkshop();return;}let body='<p>Схема сохраняет типы, сокеты, ориентацию и связь. Уровни принадлежат реальным модулям; недостающие копии не создаются.</p><div class="slots-row">';for(let i=0;i<3;i++){const p=state.schemes[i];body+=`<div class="preset-card">Схема ${i+1}<small>${p?p.length+' модулей':'Пустой слот'}</small><button class="btn small" data-action="save-scheme" data-index="${i}">Сохранить</button><button class="btn small primary" data-action="load-scheme" data-index="${i}" ${!p?'disabled':''}>Применить</button></div>`;}body+='</div>';modal('schemes','Сохраненные схемы',body,'<button class="btn primary" data-action="close">В редактор</button>');}
function saveScheme(index){if(state.completed<5||ui.view!=='workshop')return;const linkTo=state.inventory.find(m=>m.id===state.link?.to);state.schemes[index]=state.inventory.filter(m=>m.slot>=0).map(m=>({type:m.type,slot:m.slot,slot2:m.slot2,angle:m.angle,linkToSlot:state.link?.from===m.id?linkTo?.slot:undefined}));saveNow();toast('Схема сохранена');openSchemes();}
function loadScheme(index){const p=state.schemes[index];if(!p||ui.view!=='workshop')return;for(const m of state.inventory){m.slot=-1;delete m.slot2;}let missing=0;const used=new Set();for(const item of p){const m=state.inventory.filter(m=>m.type===item.type&&!used.has(m.id)).sort((a,b)=>b.level-a.level)[0];if(!m){missing++;continue;}m.slot=item.slot;m.slot2=item.slot2;m.angle=item.angle;used.add(m.id);}state.link=null;normalizeSlots(state);for(const item of p)if(item.linkToSlot!==undefined){const from=state.inventory.find(m=>m.slot===item.slot),to=state.inventory.find(m=>m.slot===item.linkToSlot);if(from&&to)state.link={from:from.id,to:to.id};}ui.selected=null;ui.slot=-1;closeModal(false);editorChanged();toast(missing?'Схема загружена. Недостающие модули: '+missing:'Схема загружена без дополнительных покупок');}

function openAutomation(){
 const sk=active(state),params=offlineParams(),signature=rateSignature(state),known=state.rateCache?.signature===signature,rate=known?state.rateCache.rate:0,unlocked=state.completed>=3;
 let body=`<div class="info-box"><b>Автоотбив настраивается только в экране «Настройки».</b><br>Здесь находятся автозапуск, офлайн-доход и планировщик улучшений.</div>
 <div class="settings-row"><div><strong>Автозапуск шарика</strong><small>${unlocked?'Запуск через '+dec(2.5-.3*(sk.D1||0))+' с. Можно не держать пружину.':'Откроется после прохождения поля 3'}</small></div>${switchHTML('autolaunch-modal',state.auto,'Автозапуск',!unlocked)}</div>
 <div class="settings-row"><div><strong>Точность помощника</strong><small>Вероятность срабатывания датчика, не гарантия спасения.</small></div><span class="pill">${Math.min(100,91+3*(sk.D2||0)+(state.activeShell==='ceramic'?5:0))}%</span></div>
 <div class="section-heading"><h3>Офлайн-доход</h3></div><div class="stat-grid"><div class="stat-cell"><small>ВЫРАБОТКА</small><strong>${unlocked&&known?dec(rate):'—'}</strong><small>монет в секунду</small></div><div class="stat-cell"><small>ЭФФЕКТИВНОСТЬ / ЛИМИТ</small><strong>${Math.round(params.eff*100)}% / ${params.cap/3600}ч</strong><small>${unlocked?'только монеты':'после поля 3'}</small></div></div>
 <button class="btn wide" data-action="measure-rate" ${!unlocked?'disabled':''}>Калибровать сборку</button><p class="fine">Три ускоренных теста физики. Не начисляют наград. Офлайн не проходит поля и не тратит ресурсы.</p>
 <div class="section-heading"><h3>Сила автопружины</h3><span class="pill">D4 · ${sk.D4||0}</span></div><p class="fine">Выбери силу из своих ручных запусков.</p>`;
 const choices=[...new Set(state.launchHistory.map(q=>q.toFixed(3)))],cap=sk.D4?sk.D4+1:1;for(let i=0;i<cap;i++){const val=state.profiles[i]??state.profiles[0]??.6;if(!choices.includes(val.toFixed(3)))choices.push(val.toFixed(3));body+=`<div class="settings-row"><strong>Профиль ${i+1}</strong><select data-control="profile" data-index="${i}" aria-label="Сила профиля ${i+1}">${choices.map(q=>`<option value="${q}" ${Math.abs(+q-val)<.001?'selected':''}>${Math.round(+q*100)}%</option>`).join('')}</select></div>`;}
 body+=`<div class="section-heading"><h3>Планировщик улучшений</h3><span class="pill">D6</span></div>${sk.D6?`<div class="settings-row"><div><strong>Покупать уровни автоматически</strong><small>Не более двух покупок в секунду.</small></div><button class="btn ${state.planner.enabled?'primary':''}" data-action="planner">${state.planner.enabled?'Включен':'Выключен'}</button></div><div class="settings-row"><strong>Резерв кошелька</strong><select data-control="reserve"><option value="0" ${(state.planner.ratio||0)===0?'selected':''}>0%</option><option value=".25" ${state.planner.ratio===.25?'selected':''}>25%</option><option value=".5" ${state.planner.ratio===.5?'selected':''}>50%</option></select></div><div class="settings-row"><strong>Порядок покупок</strong><select data-control="planner-mode"><option value="cheap" ${state.planner.mode==='cheap'?'selected':''}>Минимальная цена</option><option value="order" ${state.planner.mode==='order'?'selected':''}>По порядку сокетов</option></select></div><p class="fine">Резерв: ${fmt(state.planner.reserve)} монет. Фиксируется при включении. Новые модули и кристаллы не расходуются.</p>`:'<p>Доступен после изучения D6. Работает только когда игра открыта.</p>'}`;
 modal('automation','Автоматика и офлайн',body,'<button class="btn primary" data-action="close">К игре</button>');}
function openHelp(){modal('help','Пинбол, который ты строишь сам',`<div class="help-step"><span>01</span><div><strong>Нет шарика: зажми поле и отпусти</strong><p>Никакой отдельной кнопки запуска нет. За 0,9 с пружина достигает максимума; даже короткого удержания достаточно.</p></div></div><div class="help-step"><span>02</span><div><strong>Шарик на поле: просто тапай</strong><p>Любой тап по игровому столу синхронно поднимает обе ручки. Автоотбив включён по умолчанию и переключается только в Настройках; ручной тап остаётся доступен для точных отбивов.</p></div></div><div class="help-step"><span>03</span><div><strong>Собирай монеты. Меняй поле.</strong><p>Открой мастерскую, выбери сокет и установи модуль. Повороты и перенос бесплатны. Каждый уровень даёт +35% базовой награды.</p></div></div><div class="help-step"><span>04</span><div><strong>Достигни цели. Забери кристаллы.</strong><p>Прогресс поля всегда виден в верхнем HUD. Магазин, дерево, карта и мастерская открываются поверх живой игры и не останавливают симуляцию.</p></div></div><div class="info-box"><b>Нет жизней, энергии, отдельной кнопки флипперов и паузы.</b><br>Потеря шарика не отнимает очки. Верхний HUD занимает собственную зону и не перекрывает стол.</div><p>На клавиатуре: <kbd>ПРОБЕЛ</kbd> / <kbd>Z</kbd> / <kbd>X</kbd> — запуск и отбив, <kbd>E</kbd> — мастерская.</p><p class="fine">В прототипе: 8 модулей, 28 навыков, 30 полей и экспедиция, схемы, оболочки, мастерство, локальный офлайн. Без контрактов, недельных испытаний, покупок за реальные деньги и сервера.</p>`,`<button class="btn" data-action="sandbox-enter">Проверить всё в песочнице</button><button class="btn primary" data-action="close">Играть →</button>`,false,'УПРАВЛЕНИЕ / ПРАВИЛА');}
function openSettings(){
 let body=`<div class="section-heading" style="margin-top:0"><h3>Управление</h3></div><div class="settings-row"><div><strong>Автоматические ручки</strong><small>Включены по умолчанию с первого поля. Можно помогать точными тапами.</small></div>${switchHTML('assist-settings',state.autoFlippers!==false,'Автоматические ручки')}</div><div class="settings-row"><div><strong>Автоматический запуск</strong><small>${state.completed>=3?'Пружина выпускает шарик без удержания.':'Откроется после поля 3. Сейчас зажми и отпусти.'}</small></div>${switchHTML('autolaunch-settings',state.auto,'Автоматический запуск',state.completed<3)}</div>
 <div class="section-heading"><h3>Звук и ощущения</h3></div>`;
 for(const [key,title,desc] of [['sound','Звуки игры','Мягкие звуки ударов, наград и механизмов.'],['motion','Частицы и анимация','Всплески при попаданиях и лёгкое покачивание поля.'],['vibration','Вибрация','Сигнал точного отбива, если устройство поддерживает.']])
  body+=`<div class="settings-row"><div><strong>${title}</strong><small>${desc}</small></div><button class="switch-button ${state.prefs[key]?'on':''}" role="switch" aria-checked="${state.prefs[key]}" aria-label="${title}" data-action="setting" data-key="${key}"><i></i></button></div>`;
 body+=`<div class="section-heading"><h3>Твой прогресс</h3><span class="pill">${mode==='sandbox'?'ПЕСОЧНИЦА':'КАМПАНИЯ'}</span></div><p class="fine">Игра сохраняется на этом устройстве. Скачай копию, чтобы перенести прогресс или не потерять его при очистке браузера.</p><div class="choice-row"><button class="btn" data-action="export">${icon('download')} Сохранить файл</button><button class="btn" data-action="import">Загрузить файл</button></div>
 <div class="section-heading"><h3>Новое начало</h3></div><button class="btn danger wide" data-action="reset-save">Сбросить этот профиль</button><p class="fine">Сброс потребует подтверждения. Основная игра и песочница хранятся отдельно.</p>`;
 modal('settings','Настройки',body,'<button class="btn primary" data-action="nav-play">Вернуться к игре</button>',false,'УСТРОЙ ИГРУ ПОД СЕБЯ');
}
function makeSandbox(){const s=newState();s.stage=21;s.completed=20;s.phase='prep';s.coins=12000;s.gems=200;s.inventory[1].slot=-1;s.inventory[2].slot=-1;const map=[['bumper',1,0],['spinner',2,0],['gate',4,90],['bank',5,0],['portal',6,-90,8],['magnet',7,180],['multi',9,0]];for(const [type,slot,angle,slot2] of map)s.inventory.push({id:s.nextId++,type,slot,angle,slot2,level:5,free:false});s.inventory[0].level=5;s.inventory[3].level=5;return s;}
function enterSandbox(force=false){if(mode==='sandbox'){openSandboxTools();return;}const go=()=>{saveNow();mode='sandbox';try{const raw=localStorage.getItem(SANDBOX_KEY);state=raw?validateState(JSON.parse(raw)):makeSandbox();}catch(e){state=makeSandbox();}ui.view='game';closeModal(false);rebuildWorld();saveNow();renderAll();toast('Песочница. Основной профиль остался без изменений.');};if(force)go();else confirmDialog('Открыть песочницу?','Будет создан отдельный тестовый профиль с открытыми модулями, монетами и кристаллами. Вернуться можно в любой момент.','Открыть',go);}
function exitSandbox(){if(mode!=='sandbox')return;saveNow();mode='campaign';state=loadState(SAVE_KEY);acceptOffline();closeModal(false);ui.view='game';rebuildWorld();saveNow();renderAll();scheduleRate();toast('Основное прохождение восстановлено');if(offlineNotice)showOffline();}
function openSandboxTools(){if(mode!=='sandbox')return;modal('sandbox','Инструменты песочницы',`<div class="info-box warn"><b>Только тестовый профиль.</b><br>Ресурсы, переходы и навыки не переносятся в кампанию.</div><div class="choice-row"><button class="btn gold" data-action="sandbox-coins">+50 000 монет</button><button class="btn" data-action="sandbox-gems">+100 кристаллов</button><button class="btn" data-action="sandbox-goal">Достигнуть цели</button></div><div class="section-heading"><h3>Перейти к геометрии</h3></div><div class="choice-row">${[1,6,11,16,21,26,31,36,41,46].map(n=>`<button class="btn small" data-action="sandbox-stage" data-stage="${n}">${n} / ${chapter(n).name}</button>`).join('')}</div><p class="fine">Тестовый переход не выдаст награду. Поле начнется с подготовки, где можно перераспределить навыки.</p><button class="btn wide panel-action" data-action="sandbox-master">Открыть специализации мастерства</button>`,`<button class="btn" data-action="sandbox-exit">В кампанию</button><button class="btn primary" data-action="close">Продолжить тест</button>`,false,'ПЕСОЧНИЦА / ОТДЕЛЬНЫЙ ПРОФИЛЬ');}
function showOffline(){if(!offlineNotice)return;const n=offlineNotice;offlineNotice=null;modal('offline','Поле работало без тебя',`<div class="reward-hero"><strong style="color:var(--gold)">+${fmt(n.coins)}</strong><span>монет уже добавлено</span></div><div class="stat-grid"><div class="stat-cell"><small>УЧТЕНО ВРЕМЕНИ</small><strong>${dec(n.seconds/3600)} ч</strong><small>лимит ${n.cap/3600} ч</small></div><div class="stat-cell"><small>ВЫРАБОТКА</small><strong>${dec(n.rate)} / с</strong><small>эффективность ${Math.round(n.eff*100)}%</small></div></div><div class="info-box">Выплата по снимку сборки перед выходом. Офлайн не начисляет очки, кристаллы или мастерство и не переходит на новое поле.</div>`,'<button class="btn primary" data-action="close">Продолжить</button>');}
function exportSave(){saveNow();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`kaskad-${mode}-field-${state.stage}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Сохранение экспортировано');}
function resetSave(){confirmDialog('Удалить прогресс этого профиля?','Монеты, модули, навыки и пройденные поля будут удалены. Перед сбросом можно экспортировать сохранение.','Удалить и начать заново',()=>{state=mode==='sandbox'?makeSandbox():newState();ui.view='game';closeModal(false);rebuildWorld();saveNow();renderAll();});}
function action(name,d={}){
 audio.init();const id=+d.id;
 if(mobileAction(name,d))return;
 switch(name){
  case 'close':closeModal();break;
  case 'confirm-generic':{const fn=pendingConfirm;closeModal(false);fn?.();break;}
  case 'workshop':openWorkshop();break;
  case 'edit-module':openWorkshop(id);break;
  case 'upgrade':upgradeModule(id);break;
  case 'buy':buyModule(d.type);break;
  case 'install':{const m=state.inventory.find(m=>m.id===id);if(m&&m.slot<0&&placeModule(m))editorChanged();break;}
  case 'rotate':{const m=state.inventory.find(m=>m.id===id);if(m&&ui.view==='workshop'){m.angle=((m.angle+15*(+d.dir))%360+360)%360;editorChanged();}break;}
  case 'move':case 'move-out':ui.moving=id;ui.moveOut=name==='move-out';ui.linkFrom=null;renderEditor();break;
  case 'store':storeModule(id);break;
  case 'link':ui.linkFrom=id;ui.moving=null;renderEditor();break;
  case 'catalog':ui.selected=null;ui.slot=-1;ui.moving=null;renderEditor();break;
  case 'shop-tab':ui.shopTab=d.tab;renderEditor();break;
  case 'tree':openTree();break;
  case 'branch':ui.branch=d.branch;ui.skill=d.branch+'1';selectSkill(ui.skill);requestAnimationFrame(()=>$('skillTreeScroll')?.querySelector(`[data-branch-lane="${ui.branch}"]`)?.scrollIntoView({inline:'start',block:'nearest',behavior:'smooth'}));break;
  case 'skill-select':selectSkill(d.skill);break;
  case 'skill-buy':buySkill(d.skill);break;
  case 'skill-reset':resetSkills();break;
  case 'advance':advanceStage();break;
  case 'start-stage':startStage();break;
  case 'meta-tab':openMap(d.tab);break;
  case 'shell':if(state.phase==='prep'&&SHELLS[d.type]&&state.completed>=SHELLS[d.type].unlock){state.shell=d.type;saveNow();openMap('gear');}break;
  case 'trait':if(state.phase==='prep'&&state.completed>=10&&(state.mastery[d.type]||0)>=5000){if(d.value==='none')delete state.traits[d.type];else if(['coins','points'].includes(d.value))state.traits[d.type]=d.value;saveNow();openMap('mastery');}break;
  case 'research':{const key=d.type,r=state.research[key]||0,cost=20+5*r;if(state.phase==='prep'&&state.completed>=30&&Object.keys(state.skills).some(k=>k.endsWith('7')&&state.skills[k])&&['points','devices','coins','offline'].includes(key)&&r<25&&state.gems>=cost){state.gems-=cost;state.research[key]=r+1;saveNow();refreshTreeUI();}break;}
  case 'research-reset':if(state.phase==='prep'){let refund=0;for(const r of Object.values(state.research))refund+=20*r+5*r*(r-1)/2;state.gems+=refund;state.research={};saveNow();refreshTreeUI();}break;
  case 'schemes':openSchemes();break;
  case 'save-scheme':saveScheme(+d.index);break;
  case 'load-scheme':loadScheme(+d.index);break;
  case 'automation':openAutomation();break;
  case 'auto-modal':toggleAutoLaunch();openAutomation();break;
  case 'measure-rate':{if(state.phase!=='play'){toast('Сначала начни новое поле: бонусы должны быть зафиксированы');break;}state.rateCache={signature:rateSignature(state),rate:calculateRate(state)};ui.ratePending=false;saveNow();openAutomation();toast('Три теста выполнены. Наград за калибровку нет.');break;}
  case 'planner':if(state.activeSkills.D6){state.planner.enabled=!state.planner.enabled;if(state.planner.enabled){state.planner.reserve=state.coins*(state.planner.ratio||0);state.planner.cursor=0;}saveNow();openAutomation();}break;
  case 'setting':if(['sound','motion','vibration'].includes(d.key)){state.prefs[d.key]=!state.prefs[d.key];saveNow();renderAll();openSettings();}break;
  case 'export':exportSave();break;
  case 'import':$('importInput').click();break;
  case 'reset-save':resetSave();break;
  case 'sandbox-enter':enterSandbox();break;
  case 'sandbox-exit':exitSandbox();break;
  case 'sandbox-tools':openSandboxTools();break;
  case 'sandbox-coins':if(mode==='sandbox'){state.coins+=50000;saveNow();updateHUD(true);toast('+50 000 тестовых монет');}break;
  case 'sandbox-gems':if(mode==='sandbox'){state.gems+=100;saveNow();updateHUD(true);toast('+100 тестовых кристаллов');}break;
  case 'sandbox-goal':if(mode==='sandbox'){if(state.phase==='prep')startStage();state.score=goal(state.stage);saveNow();closeModal();openTransition();}break;
  case 'sandbox-stage':if(mode==='sandbox'){const n=clamp(+d.stage||21,1,1000);state.stage=n;state.completed=n-1;state.score=0;state.stageEarned=0;state.stageHits=0;state.phase='prep';state.planner.enabled=false;state.startedStage=0;state.auto=state.completed>=3&&state.auto;normalizeSlots(state);closeModal(false);ui.view='game';rebuildWorld();saveNow();renderAll();toast('Тестовое поле '+n+' готово');}break;
  case 'sandbox-master':if(mode==='sandbox'){for(const key in TYPES)state.mastery[key]=Math.max(state.mastery[key]||0,5000);saveNow();toast('Специализации мастерства открыты');}break;
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled){e.preventDefault();try{action(b.dataset.action,b.dataset);}catch(err){console.error(err);toast('Действие не выполнено. Прогресс сохранен.',true);}}else if(e.target.classList.contains('modal-backdrop'))closeModal();});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.control==='profile'){state.profiles[+d.index]=clamp(+e.target.value,0,1);for(let i=0;i<state.profiles.length;i++)if(state.profiles[i]==null)state.profiles[i]=state.profiles[0]||.6;world.cfg.profiles=copy(state.profiles);saveNow();}if(d.control==='reserve'){state.planner.ratio=+e.target.value;if(state.planner.enabled)state.planner.reserve=state.coins*state.planner.ratio;saveNow();openAutomation();}if(d.control==='planner-mode'){state.planner.mode=e.target.value;state.planner.cursor=0;saveNow();}});
$('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('Файл слишком большой');const imported=validateState(JSON.parse(await file.text()));confirmDialog('Заменить текущий профиль?',`Из файла будет восстановлено поле ${imported.stage}, ${fmt(imported.coins)} монет и ${fmt(imported.gems)} кристаллов. Текущий профиль будет заменен.`,'Восстановить',()=>{state=imported;state.savedAt=Date.now();state.offline=null;ui.view='game';closeModal(false);rebuildWorld();saveNow();renderAll();scheduleRate();toast('Сохранение восстановлено');});}catch(err){toast('Не удалось импортировать сохранение',true);console.warn(err);}finally{e.target.value='';}});
canvas.addEventListener('pointerdown',manualDown);canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',manualUp);window.addEventListener('pointercancel',cancelInput);
window.addEventListener('keydown',e=>{
 if(e.key==='Tab'&&ui.modal&&$('modalRoot').classList.contains('dialog-root')){const nodes=[...$('modalRoot').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(nodes.length){const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
 if(e.key==='Escape'){e.preventDefault();if(ui.modal)closeModal();else if(ui.view==='workshop')finishEditor();return;}
 if(e.target.matches('input,select,textarea')||ui.modal)return;
 if(['Space','KeyZ','KeyX','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!e.repeat&&!keyHeld){keyHeld=true;manualDown();}}
 if(!e.repeat&&e.code==='KeyE'){e.preventDefault();openWorkshop();}
});
window.addEventListener('keyup',e=>{if(['Space','KeyZ','KeyX','ArrowLeft','ArrowRight'].includes(e.code)&&keyHeld){e.preventDefault();keyHeld=false;manualUp();}});
$('soundBtn').addEventListener('click',()=>{state.prefs.sound=!state.prefs.sound;audio.init();saveNow();renderAll();});
$('helpBtn').addEventListener('click',openHelp);$('settingsBtn').addEventListener('click',openSettings);
$('workshopBtn').addEventListener('click',()=>openWorkshop());$('finishEdit').addEventListener('click',finishEditor);
$('treeBtn').addEventListener('click',openTree);$('mapBtn').addEventListener('click',()=>openMap('map'));
$('advanceBtn').addEventListener('click',openTransition);$('startFieldBtn').addEventListener('click',startStage);
$('sandboxBtn').addEventListener('click',()=>mode==='sandbox'?exitSandbox():enterSandbox());
document.querySelector('.brand')?.addEventListener('click',e=>{e.preventDefault();openMainMenu();});
$('playTab').addEventListener('click',goPlay);$('menuTab').addEventListener('click',openMainMenu);
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(fitBoard));
window.addEventListener('resize',()=>requestAnimationFrame(fitBoard));
window.addEventListener('blur',cancelInput);
document.addEventListener('visibilitychange',()=>{cancelInput();if(document.hidden){hiddenAt=Date.now();saveNow();}else{frameLast=performance.now();accumulator=0;if(hiddenAt){acceptOffline();hiddenAt=0;saveNow();if(offlineNotice)showOffline();}scheduleRate();}});
window.addEventListener('pagehide',saveNow);window.addEventListener('beforeunload',saveNow);
function plannerTick(){if(!state.activeSkills.D6||!state.planner.enabled||world.time-lastPlanner<.5)return;lastPlanner=world.time;let mods=state.inventory.filter(m=>m.slot>=0&&m.level<250);if(!mods.length)return;if(state.planner.mode==='order'){mods.sort((a,b)=>a.slot-b.slot);mods=[mods[(state.planner.cursor||0)%mods.length]];}else mods.sort((a,b)=>priceLevel(state,a)-priceLevel(state,b));const m=mods[0],cost=priceLevel(state,m);if(state.coins-cost>=state.planner.reserve&&upgradeModule(m.id,true)){state.planner.cursor=(state.planner.cursor||0)+1;renderOverview();}}
function frame(now){if(world.charging)world.chargeUI=clamp((now-(ui.holdClock??now))/900,0,1);if(!frameLast)frameLast=now;const dt=Math.min(.05,Math.max(0,(now-frameLast)/1000));frameLast=now;if(!isPaused()){accumulator+=dt;let n=0;while(accumulator>=STEP&&n++<12){world.step(STEP);state.stats.playtime+=STEP;accumulator-=STEP;}plannerTick();}else accumulator=0;renderer.draw(world,state,ui);updateHUD();if(now-lastSave>5000&&!document.hidden){lastSave=now;saveNow();}requestAnimationFrame(frame);}
rebuildWorld();renderer=new PinballRenderer(canvas);renderAll();fitBoard();saveNow();scheduleRate();requestAnimationFrame(frame);
if(loadWarning)toast(loadWarning,true);if(offlineNotice)setTimeout(showOffline,150);
// Small, documented inspection API for local prototype testing; no network calls.
window.Kaskad={version:'0.5-tap-hud-unified-tree',snapshot:()=>copy(state),get world(){return world;},get mode(){return mode;},get ui(){return copy({...ui,focus:null});},get camera(){return renderer?renderer.camera():null;},openSandbox:()=>enterSandbox(true),engine:PinballWorld,config:engineConfig,calculateRate,goal,reward,skills:copy(SKILLS)};
