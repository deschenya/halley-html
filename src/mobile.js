
/* Mobile screen router and complete touch-friendly menus.
   No network requests, assets, frameworks or external fonts are required. */
function mobileNav(){
 const kind=ui.modal;let selected='playTab';
 if(ui.view==='workshop'||['modules','module','catalog-detail','schemes'].includes(kind))selected='workshopBtn';
 if(kind==='tree')selected='treeBtn';else if(kind==='map')selected='mapBtn';
 else if(['menu','settings','automation','help','stats','sandbox'].includes(kind))selected='menuTab';
 for(const id of ['playTab','workshopBtn','treeBtn','mapBtn','menuTab']){
  const b=$(id);if(!b)continue;b.classList.toggle('active',id===selected);
  if(id===selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
}
function switchHTML(action,on,label,disabled=false){
 return `<button class="switch-button ${on?'on':''}" data-action="${action}" role="switch" aria-checked="${!!on}" aria-label="${label}" ${disabled?'disabled':''}><i></i></button>`;
}
function goPlay(){
 closeModal(false);if(ui.view==='workshop'){finishEditor();return;}
 renderAll();scheduleRate();
}
function toggleAutoLaunch(){
 if(state.completed<3){toast('Автопружина откроется после поля 3');return;}
 state.auto=!state.auto;world.auto=state.auto;world.cfg.auto=state.auto;saveNow();renderAll();scheduleRate();
}
function openMainMenu(){
 const g=goal(state.stage),p=Math.floor(clamp(state.score/g*100,0,100));
 const body=`<div class="menu-hero"><small>${mode==='sandbox'?'ТЕСТОВАЯ МАСТЕРСКАЯ':'ПИНБОЛ, КОТОРЫЙ ТЫ СТРОИШЬ'}</small><h3>Ещё один каскад?</h3><p>Поле ${state.stage} · ${chapter(state.stage).name}<br>До нового открытия — ${100-p}% цели.</p>${icon('spring')}<button class="btn primary" data-action="nav-play">${icon('play')} Продолжить</button></div>
 <div class="menu-links">
 <button class="menu-link" data-action="open-settings"><span>${icon('settings')}</span><strong>Настройки</strong><small>Управление, звук, сохранения</small></button>
 <button class="menu-link" data-action="automation"><span>${icon('auto')}</span><strong>Автоматика</strong><small>Пружина, планировщик и офлайн</small></button>
 <button class="menu-link" data-action="open-collection"><span>${icon('gem')}</span><strong>Коллекция</strong><small>Оболочки и мастерство</small></button>
 <button class="menu-link" data-action="open-stats"><span>${icon('chart')}</span><strong>Мои рекорды</strong><small>Попадания, точность, прогресс</small></button>
 </div>
 <button class="menu-list-button" data-action="open-help"><span>${icon('help')}</span>Как играть<span>›</span></button>
 <button class="menu-list-button" data-action="${mode==='sandbox'?'sandbox-tools':'sandbox-enter'}"><span>${icon('blocks')}</span>${mode==='sandbox'?'Инструменты песочницы':'Попробовать всё в песочнице'}<span>›</span></button>
 ${mode==='sandbox'?'<button class="menu-list-button" data-action="sandbox-exit"><span>↩</span>Вернуться в основную игру<span>›</span></button>':''}
 <p class="menu-save"><i></i> ${persistent?'Прогресс сохранён на этом устройстве':'Хранилище недоступно. Экспортируй сохранение.'}<br>Каскад · мобильная версия 0.5</p>`;
 modal('menu','Твой маленький мир',body,'',false,'ИГРАЙ В СВОЁМ РИТМЕ');
}
function openStats(){
 const v=state.stats;
 modal('stats','Мои рекорды',`<div class="menu-hero"><small>ШАГ ЗА ШАГОМ</small><h3>${state.completed} полей пройдено</h3><p>Ничего не теряется при сливе шарика. Каждый запуск приближает новое открытие.</p>${icon('star')}</div>
 <div class="stat-grid">
 <div class="stat-cell"><small>ПОПАДАНИЯ</small><strong>${fmt(v.hits)}</strong><small>по всем модулям</small></div>
 <div class="stat-cell"><small>ТОЧНЫЕ ОТБИВЫ</small><strong>${fmt(v.perfect)}</strong><small>только ручной тайминг</small></div>
 <div class="stat-cell"><small>ЛУЧШИЙ ЗАПУСК</small><strong>${fmt(v.bestRun)}</strong><small>очков</small></div>
 <div class="stat-cell"><small>ЗАПУСКИ</small><strong>${fmt(v.runs)}</strong><small>всегда бесплатные</small></div>
 <div class="stat-cell"><small>ЗАРАБОТАНО</small><strong>${fmt(v.coins)}</strong><small>монет в активной игре</small></div>
 <div class="stat-cell"><small>ВРЕМЯ В ИГРЕ</small><strong>${Math.floor(v.playtime/60)}</strong><small>минут активной симуляции</small></div></div>
 <div class="info-box"><b>Сборка:</b> ${state.inventory.length} модулей, ${occupied(state).size} на поле.<br><b>Навыки:</b> ${Object.values(state.skills).reduce((a,b)=>a+b,0)} рангов · ${spentSkills(state)} кристаллов вложено.</div>`,
 '<button class="btn primary" data-action="nav-play">Сделать новый рекорд</button>',false,'ТВОЯ ИСТОРИЯ КАСКАДОВ');
}
function tileColor(type){return{bar:'#faf0d7',bumper:'#e7f1df',spinner:'#fae8dc',gate:'#efe5f8',bank:'#fbefd1',portal:'#eee7fa',magnet:'#f8e5df',multi:'#e1f0f1'}[type]||'#f1eee7';}
function openModules(tab=ui.shopTab){
 if(ui.view!=='workshop'){openWorkshop();return;}
 if(!['installed','catalog','storage'].includes(tab))tab='installed';ui.shopTab=tab;
 const used=occupied(state).size,count=slotCount(state),free=count-used;
 let body=`<div class="shop-intro"><span>${icon('blocks')}</span><div><b>${used} из ${count} ячеек занято</b><small>Меняй сборку. Создавай свои цепочки.</small></div><button class="text-button" data-action="placement">Расставить ›</button></div>
 <div class="tabs"><button data-action="modules-tab" data-tab="installed" class="${tab==='installed'?'active':''}">На поле</button><button data-action="modules-tab" data-tab="catalog" class="${tab==='catalog'?'active':''}">Магазин</button><button data-action="modules-tab" data-tab="storage" class="${tab==='storage'?'active':''}">Склад${state.inventory.some(m=>m.slot<0)?' · '+state.inventory.filter(m=>m.slot<0).length:''}</button></div>`;
 if(tab==='catalog'){
  if(ui.slot>=0&&!occupied(state).has(ui.slot))body+=`<div class="info-box">Новый модуль займёт выбранную ячейку <b>${ui.slot+1}</b>.</div>`;
  body+='<div class="module-grid">';
  for(const [id,d] of Object.entries(TYPES)){
   const unlocked=state.completed>=d.unlock,price=priceNew(state,id),unique=d.unique&&state.inventory.some(m=>m.type===id&&m.slot>=0),room=free>=(id==='portal'?2:1),afford=state.coins>=price;
   body+=`<article class="module-card ${!unlocked?'locked':''}">
   <button class="module-art" style="--tile:${tileColor(id)}" data-action="module-info" data-type="${id}" aria-label="${d.name}: описание">${modIcon(id)}<span class="module-level">${unlocked?'НОВЫЙ':icon('lock')}</span></button>
   <h3>${d.short}</h3><div class="module-yield">${d.c} мон. · ${d.p} оч. / удар</div>
   <button class="btn ${unlocked?'primary':''}" data-action="buy" data-type="${id}" ${!unlocked||unique||!room||!afford?'disabled':''}>${!unlocked?'После поля '+d.unlock:unique?'Уже на поле':!room?'Нет места':fmt(price)+' ●'}</button>
   <button class="card-details" data-action="module-info" data-type="${id}">${unlocked?'Что умеет?':'Узнать больше'} ›</button></article>`;
  }
  body+='</div>';
 }else{
  const inventory=state.inventory.filter(m=>tab==='storage'?m.slot<0:m.slot>=0).sort((a,b)=>a.slot-b.slot);
  if(!inventory.length)body+=`<div class="empty-copy">${icon('store')}<p style="margin-top:12px">Пока здесь пусто.<br>Убирай модули на склад —<br>их уровни сохранятся.</p></div>`;
  else{body+='<div class="module-grid">';for(const m of inventory){
   const d=TYPES[m.type],u=Math.pow(1.35,m.level-1),price=priceLevel(state,m);
   const canInstall=free>=(m.type==='portal'?2:1)&&!(d.unique&&state.inventory.some(n=>n.slot>=0&&n.type===m.type));
   body+=`<article class="module-card" data-module-id="${m.id}"><button class="module-art" style="--tile:${tileColor(m.type)}" data-action="module-detail" data-id="${m.id}" aria-label="${d.name}, уровень ${m.level}">${modIcon(m.type)}<span class="module-level" data-module-level>Ур. ${m.level}</span></button><h3>${d.short}</h3>
   <div class="module-yield" data-module-yield>${dec(d.c*u)} мон. · ${dec(d.p*u)} оч.</div>
   ${tab==='storage'?`<button class="btn primary" data-action="install" data-id="${m.id}" ${!canInstall?'disabled':''}>${canInstall?'На поле':'Нет места'}</button>`:`<button class="btn primary" data-module-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<price||m.level>=250?'disabled':''}>↑ ${fmt(price)} ●</button>`}
   <button class="card-details" data-action="module-detail" data-id="${m.id}">${tab==='storage'?'Посмотреть':'Ячейка '+(m.slot+1)} ›</button></article>`;
  }body+='</div>';}
 }
 body+=`<button class="btn wide panel-action" data-action="placement">${icon('build')} Расставить на поле</button><button class="btn subtle wide panel-action" data-action="schemes">${icon('store')} Сохранённые схемы${state.completed<5?' · после поля 5':''}</button>`;
 modal('modules','Мастерская',body,'<button class="btn primary" data-action="nav-play">Готово, играть '+icon('play')+'</button>',false,'СОБИРАЙ · УЛУЧШАЙ · КОМБИНИРУЙ');
}
function openModuleDetail(id){
 const m=state.inventory.find(m=>m.id===+id);if(!m){openModules();return;}
 ui.selected=m.id;ui.slot=m.slot;
 const d=TYPES[m.type],u=Math.pow(1.35,m.level-1),cost=priceLevel(state,m),free=freeSlots().length;
 let body=`<div data-module-detail="${m.id}"><div class="detail-art" style="background:${tileColor(m.type)}">${modIcon(m.type)}<span class="pill" data-detail-level>УРОВЕНЬ ${m.level}</span></div>
 <p class="detail-description">${d.desc}</p><div class="stat-grid"><div class="stat-cell"><small>МОНЕТ ЗА УДАР</small><strong data-detail-coins>${dec(d.c*u)}</strong><small>после улучшения <span data-detail-coins-next>${dec(d.c*u*1.35)}</span></small></div><div class="stat-cell"><small>ОЧКОВ ЗА УДАР</small><strong data-detail-points>${dec(d.p*u)}</strong><small>после улучшения <span data-detail-points-next>${dec(d.p*u*1.35)}</span></small></div></div>
 <button class="btn primary wide" data-detail-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<cost||m.level>=250?'disabled':''}>${m.level>=250?'Максимальный уровень':'Улучшить на 35% · '+fmt(cost)+' ●'}</button>
 <p class="fine" data-detail-shortage style="text-align:center" ${state.coins>=cost?'hidden':''}>${state.coins<cost?'Нужно ещё '+fmt(cost-state.coins)+' монет':''}</p>
 <div class="section-heading"><h3>Особые улучшения</h3></div>
 <div class="milestone ${m.level>=5?'reached':''}" data-milestone="5"><span>УР. 5</span><p>${d.l5}</p></div><div class="milestone ${m.level>=10?'reached':''}" data-milestone="10"><span>УР. 10</span><p>${d.l10}</p></div>`;
 if(m.slot>=0)body+=`<div class="section-heading"><h3>Место на поле</h3><span class="pill">ЯЧЕЙКА ${m.slot+1}${m.type==='portal'?' + '+(m.slot2+1):''}</span></div>
 <div class="choice-row"><button class="btn" data-action="rotate" data-id="${m.id}" data-dir="-1">↶ 15°</button><button class="btn" data-action="rotate" data-id="${m.id}" data-dir="1">↷ 15°</button></div><p class="fine" style="text-align:center">Направление: ${Math.round(((m.angle%360)+360)%360)}°</p>
 <div class="choice-row"><button class="btn" data-action="place-module" data-id="${m.id}">${icon('build')} Перенести${m.type==='portal'?' вход':''}</button>${m.type==='portal'?`<button class="btn" data-action="place-exit" data-id="${m.id}">Перенести выход</button>`:''}<button class="btn subtle" data-action="store" data-id="${m.id}">${icon('store')} На склад</button></div>${active(state).B6?`<button class="btn wide panel-action" data-action="place-link" data-id="${m.id}">Создать направленную связь</button>`:''}`;
 else body+=`<button class="btn wide panel-action" data-action="install" data-id="${m.id}" ${free<(m.type==='portal'?2:1)?'disabled':''}>${icon('plus')} Установить на поле</button>`;
 body+='</div>';
 modal('module',d.name,body,'<button class="btn" data-action="modules-back">К модулям</button><button class="btn primary" data-action="placement">К расстановке</button>',false,'ТВОЙ МОДУЛЬ');
}
function openModuleInfo(type){
 const d=TYPES[type];if(!d)return;
 modal('catalog-detail',d.name,`<div class="detail-art" style="background:${tileColor(type)}">${modIcon(type)}<span class="pill">${state.completed>=d.unlock?'ДОСТУПЕН':'ПОСЛЕ ПОЛЯ '+d.unlock}</span></div><p class="detail-description">${d.desc}</p>
 <div class="stat-grid"><div class="stat-cell"><small>МОНЕТ ЗА УДАР</small><strong>${d.c}</strong><small>на уровне 1</small></div><div class="stat-cell"><small>ОЧКОВ ЗА УДАР</small><strong>${d.p}</strong><small>на уровне 1</small></div></div>
 <div class="milestone"><span>УР. 5</span><p>${d.l5}</p></div><div class="milestone"><span>УР. 10</span><p>${d.l10}</p></div>
 <div class="info-box" style="margin-top:15px">${d.unique?'На поле может быть только один такой модуль.':'Можно купить несколько копий. Каждая следующая дороже.'}${type==='portal'?'<br>Пара занимает две ячейки.':''}<br>Первая копия: ${d.price} монет. Перемещение и поворот бесплатны.</div>`,
 '<button class="btn primary" data-action="modules-back">Вернуться в магазин</button>',false,'КАТАЛОГ МОДУЛЕЙ');
}
function enterPlacement(){
 if(ui.view!=='workshop'){openWorkshop();return;}
 closeModal(false);renderAll();toast(ui.moving?'Выбери свободную ячейку':'Тапни по модулю или номеру ячейки');
}
function mobileAction(name,d){
 switch(name){
  case 'nav-play':goPlay();return true;
  case 'open-settings':openSettings();return true;
  case 'open-help':openHelp();return true;
  case 'open-map':openMap('map');return true;
  case 'open-collection':openMap('gear');return true;
  case 'open-stats':openStats();return true;
  case 'menu-back':openMainMenu();return true;
  case 'modules-back':openModules(ui.shopTab);return true;
  case 'modules-tab':openModules(d.tab);return true;
  case 'module-detail':openModuleDetail(+d.id);return true;
  case 'module-info':openModuleInfo(d.type);return true;
  case 'open-catalog':ui.selected=null;openModules('catalog');return true;
  case 'placement':enterPlacement();return true;
  case 'pick-slot':{const p=world.slots[+d.index];if(p&&ui.view==='workshop')editorPick(p.x,p.y);return true;}
  case 'place-module':case 'place-exit':ui.selected=+d.id;ui.moving=+d.id;ui.moveOut=name==='place-exit';ui.linkFrom=null;enterPlacement();return true;
  case 'place-link':ui.linkFrom=+d.id;ui.moving=null;enterPlacement();return true;
  case 'assist-modal':toggleAuto();openAutomation();return true;
  case 'assist-settings':toggleAuto();openSettings();return true;
  case 'autolaunch-modal':toggleAutoLaunch();openAutomation();return true;
  case 'autolaunch-settings':toggleAutoLaunch();openSettings();return true;
  default:return false;
 }
}
