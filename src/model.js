/* Data model, deterministic geometry, costs and skill dependencies. */
const VERSION=1, SAVE_KEY='kaskad_campaign_v1', SANDBOX_KEY='kaskad_sandbox_v1';
const W=440,H=700,STEP=1/120,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=o=>JSON.parse(JSON.stringify(o));
const fmt=(n,precision=0)=>{if(!Number.isFinite(n))return '0';const a=Math.abs(n);if(a<10000)return Math.floor(n).toLocaleString('ru-RU');if(a<1e6)return (n/1e3).toLocaleString('ru-RU',{maximumFractionDigits:1})+'\u00a0K';if(a<1e9)return (n/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})+'\u00a0M';if(a<1e12)return (n/1e9).toLocaleString('ru-RU',{maximumFractionDigits:2})+'\u00a0B';return n.toExponential(2).replace('+','');};
const exact=n=>Math.floor(n).toLocaleString('ru-RU');
const dec=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const TYPES={
 bar:{name:'Палочка',short:'Палочка',price:20,c:1,p:10,unlock:0,color:'#edaa59',shape:'bar',desc:'Неподвижная планка. Направляет шарик к другим модулям. Поворот меняет траекторию.',l5:'Каждое пятое попадание дает двойные очки.',l10:'Раз в 5 с попадание добавляет еще один шаг серии.'},
 bumper:{name:'Бампер',short:'Бампер',price:60,c:2,p:20,unlock:1,color:'#56bca9',shape:'bumper',desc:'Упругий отбойник. Активно возвращает шарик в верхнюю часть поля.',l5:'Сила отбоя +10% в пределах лимита скорости.',l10:'Каждый шестой удар: 50% очков ближайшего модуля без цепной активации.'},
 spinner:{name:'Вертушка',short:'Вертушка',price:150,c:1,p:8,unlock:3,color:'#efbd50',shape:'spinner',desc:'За 4 контакта выплачивает еще 3 монеты и 40 очков с учетом уровня.',l5:'Выплата после 3 контактов вместо 4.',l10:'Монеты дополнительной выплаты +50%.'},
 gate:{name:'Ворота-множитель',short:'Ворота',price:250,c:1,p:5,unlock:5,color:'#a18ad8',shape:'gate',desc:'Проход по стрелке: следующие 3 попадания шарика получают x1,5 очков на 4 с.',l5:'Усиление на 4 попадания.',l10:'Длительность усиления 6 с.'},
 bank:{name:'Банк',short:'Банк',price:350,c:1,p:5,unlock:7,color:'#df9c47',shape:'bank',desc:'После 5 попаданий выплачивает 12 монет и 100 очков. Перезарядка выплаты 1 с.',l5:'Выплата после 4 попаданий.',l10:'Монеты выплаты +50%.'},
 portal:{name:'Портальная пара',short:'Порталы',price:600,c:1,p:5,unlock:10,color:'#9587df',shape:'portal',unique:true,desc:'Вход и выход занимают 2 сокета. Сохраняет скорость, но меняет направление по стрелке выхода.',l5:'После выхода +25% очков на 2 попадания за 3 с.',l10:'Повторный вход через 0,75 с вместо 1 с.'},
 magnet:{name:'Магнит',short:'Магнит',price:1200,c:1,p:5,unlock:15,color:'#ed9684',shape:'magnet',unique:true,desc:'Захватывает шарик на 0,15 с и выпускает по стрелке. Перезарядка 6 с.',l5:'Перезарядка 5 с.',l10:'После выпуска +25% очков на 2 попадания за 3 с.'},
 multi:{name:'Генератор мультибола',short:'Мультибол',price:1800,c:1,p:6,unlock:20,color:'#5db7c8',shape:'multi',unique:true,desc:'Каждые 20 попаданий по полю создают 2 шарика на 8 с. Не более 3 шариков; перезарядка 20 с.',l5:'Для активации нужно 16 попаданий.',l10:'Временные шарики живут 12 с.'}
};
const CHAPTERS=[
 {name:'Мастерская',copy:'Четыре палочки. Один шарик. Собери первую цепочку попаданий.',color:'#a9edd1'},
 {name:'Неон',copy:'Два маршрута. Одна выгодная серия. Проведи шарик через ворота.',color:'#b8b0f1'},
 {name:'Орбита',copy:'Соедини разнесенные зоны. Порталы сокращают путь к новому рекорду.',color:'#a4cfe3'},
 {name:'Магнитный зал',copy:'Настрой направление выпуска. Точный маршрут важнее случайного отбива.',color:'#e6b29b'},
 {name:'Реактор',copy:'Больше шариков. Больше связей. Построй поле для непрерывного каскада.',color:'#a4dfb3'},
 {name:'Обсерватория',copy:'Соедини все механизмы в одну сборку. Впереди бесконечная экспедиция.',color:'#d0c0ed'}
];
const NAMES={A:'Управление',B:'Инженерия',C:'Экономика',D:'Автоматика'};
const BRANCH_COLORS={A:'#2a9b86',B:'#8a70ce',C:'#c68929',D:'#d77561'};
const SKILLS={};
function skill(id,name,desc,costs){SKILLS[id]={id,name,desc,costs,max:costs.length};}
const COST1=[2,3,5,8,12],COST23=[3,5,8],COST45=[5,8,12];
skill('A1','Точный отбив','Бонус точного отбива: +29 / 33 / 37 / 41 / 45% очков вместо +25%.',COST1);
skill('A2','Широкое окно','Окно точного ручного отбива: 70 / 80 / 90 мс вместо 60 мс.',COST23);
skill('A3','Длинная серия','Серия сохраняется 2,3 / 2,6 / 2,9 с без попаданий вместо 2 с.',COST23);
skill('A4','Контроль запуска','Ранг 1: метка предыдущей силы. Ранг 2: прогноз зоны входа. Ранг 3: первый удар ручного запуска дает x1,5 очков.',COST45);
skill('A5','Разгон серии','Потолок серии повышается до x2,2 / x2,4 / x2,6. Шаг остается +0,05.',COST45);
skill('A6','Страховка','Один возврат последнего шарика за ручной запуск, если за предыдущие 3 с был точный отбив.',[12]);
skill('A7','Режим мастера','8 точных отбивов за запуск дают x1,5 очков физических попаданий на 10 с. Один раз за запуск.',[20]);
skill('B1','Калибровка','Каждый ранг: +6% базовых монет и очков всех модулей. Максимум +30%.',COST1);
skill('B2','Быстрые механизмы','Перезарядки устройств и связи короче на 5 / 10 / 15%. Не влияет на интервал ручных тапов.',COST23);
skill('B3','Умная компоновка','За каждый другой тип соседа: +2 / 4 / 6% монет и очков, не более трёх типов. Радиус 135 единиц поля.',COST23);
skill('B4','Расширение шасси','Каждый ранг открывает еще 1 резервный сокет. Максимум +2, не более 14 на поле.',[5,8]);
skill('B5','Перегрузка','Каждый десятый физический удар по модулю дает x1,5 / x1,75 / x2 очков.',COST45);
skill('B6','Модуль связи','Выбери источник и соседний приемник в редакторе. Удар по источнику усиливает следующий удар приемника на 50% на 2 с. Перезарядка 6 с.',[12]);
skill('B7','Резонанс','Попадания по 4 типам за 5 с дают +30% монет и очков физических контактов на 5 с. Перезарядка 20 с.',[20]);
skill('C1','Монетный сплав','Каждый ранг: +8% монет за попадания и обычные выплаты банка и вертушки. Максимум +40%.',COST1);
skill('C2','Серийная закупка','Новые копии модулей дешевле на 5 / 10 / 15%. Не влияет на цену уровней.',COST23);
skill('C3','Точная смета','Улучшения модулей дешевле на 5 / 10 / 15%. Минимальная цена 1 монета.',COST23);
skill('C4','Касса перехода','При завершении поля: +5 / 10 / 15% монет, заработанных его попаданиями и обычными выплатами. Без офлайн-дохода и подарков.',COST45);
skill('C5','Копилка серии','Каждые 50 попаданий по полю дают 5 / 10 / 15 базовых монет последнего модуля с учетом его уровня.',COST45);
skill('C6','Стартовый комплект','На новом поле бесплатно повышает на 1 уровень два установленных модуля с самым дешевым улучшением.',[12]);
skill('C7','Выгодный контракт','+1 кристалл за новый этап, начатый с этим навыком. Не применяется задним числом.',[20]);
skill('D1','Автопружина','Автозапуск через 2,2 / 1,9 / 1,6 / 1,3 / 1,0 с вместо 2,5 с. Ручное удержание имеет приоритет.',COST1);
skill('D2','Сенсор флипперов','Вероятность команды при входе в датчик: 94 / 97 / 100% вместо 91%. Отклик не гарантирует спасение.',COST23);
skill('D3','Фоновая выработка','Офлайн-доход: 30 / 40 / 50% измеренной автоматической выработки вместо 20%. Только монеты.',COST23);
skill('D4','Профили запуска','Повторять последовательность из 2 / 3 / 4 сил ручных запусков вместо одного значения. Настройка в автоматике.',COST45);
skill('D5','Запас хода','Лимит офлайн-времени: 4 / 6 / 8 часов вместо 2. Лишнее время не переносится.',COST45);
skill('D6','Планировщик','Покупает уровни в открытой игре по минимальной цене или порядку модулей. Резерв 0 / 25 / 50% кошелька при включении. До 2 покупок в секунду.',[12]);
skill('D7','Стабилизатор','Один раз спасает последний шарик, потерянный в первые 8 с полностью автоматического запуска. Любой ручной тап отключает страховку.',[20]);
const SHELLS={steel:{name:'Стальная',unlock:0,c:1,p:1,color:'#e7f3ed',desc:'Без модификаторов. Базовая оболочка.'},brass:{name:'Латунная',unlock:10,c:1.15,p:.85,color:'#f1ce8b',desc:'+15% монет, -15% очков.'},ruby:{name:'Рубиновая',unlock:10,c:.85,p:1.15,color:'#ef999e',desc:'+15% очков, -15% монет.'},ceramic:{name:'Керамическая',unlock:20,c:1,p:.85,color:'#b8c1ed',desc:'+5 п.п. реакции автомата, -15% очков.'}};
const MODIFIERS=['Односторонние дорожки','Разнесенные зоны','Тяжелые механизмы','Зеркальная ориентация'];
const baseSlots=[[124,208],[278,237],[123,350],[274,402],[212,136],[217,291],[191,478],[328,319],[65,281],[325,475],[66,446],[324,172],[195,397],[87,134]];
function chapter(stage){return CHAPTERS[Math.floor((stage-1)/5)%6];}
function modifier(stage){return stage>30?Math.floor((stage-31)/5)%4:-1;}
function goal(stage){return Math.min(1e250,100*Math.ceil((stage<=30?800*Math.pow(1.72,stage-1):100*Math.ceil(800*Math.pow(1.72,29)/100)*Math.pow(1.55,stage-30))/100));}
function reward(stage,skills={}){return Math.min(8,3+Math.floor((stage-1)/5))+(stage%5===0?5:0)+(skills.C7||0);}
function slotCount(s,skills=s.phase==='prep'?s.skills:s.activeSkills){return Math.min(14,8+(s.completed>=10?2:0)+(s.completed>=20?2:0)+(skills.B4||0));}
function slotsFor(stage){const c=Math.floor((stage-1)/5)%6;return baseSlots.map(([x,y],i)=>{let xx=x,yy=y;const variation=(stage-1)%5;if(i<4){xx+=(variation-2)*((i%2)?3:-3);yy+=Math.sin(i+variation)*8;}if(c===1){yy+=i%2?-10:12;xx+=i%2?6:-4;}if(c===2||modifier(stage)===1){if(i<8)xx+=xx<210?-14:12;}if(c===3){if(i<8)yy+=i%2?-15:8;}if(c===4){if(i<4){xx+=i%2?8:-8;yy-=9;}}if(c===5){if(i<4)yy+=(i%2===0?16:-16);}if(modifier(stage)===3)xx=408-xx;return{x:clamp(xx,58,340),y:clamp(yy,122,493)};});}
function newState(){return{version:VERSION,stage:1,completed:0,coins:0,gems:0,score:0,phase:'play',inventory:[0,1,2,3].map((slot,i)=>({id:i+1,type:'bar',level:1,slot,angle:[-20,20,20,-20][i],free:true})),nextId:5,skills:{},activeSkills:{},shell:'steel',activeShell:'steel',traits:{},activeTraits:{},research:{},activeResearch:{},mastery:{},auto:false,autoFlippers:true,lastQ:.6,launchHistory:[.6],profiles:[.6],link:null,schemes:[null,null,null],stats:{hits:0,perfect:0,runs:0,coins:0,bestRun:0,playtime:0},stageEarned:0,stageHits:0,planner:{enabled:false,reserve:0,mode:'cheap'},prefs:{sound:true,motion:!window.matchMedia('(prefers-reduced-motion: reduce)').matches,vibration:false},savedAt:Date.now(),offline:null,rateCache:null,startedStage:1};}
function active(s){return s.phase==='prep'?s.skills:s.activeSkills;}
function priceNew(s,type){const n=s.inventory.filter(m=>m.type===type&&!m.free).length;return Math.ceil(TYPES[type].price*Math.pow(1.8,n)*(1-.05*(s.activeSkills.C2||0)));}
function priceLevel(s,m){return Math.max(1,Math.ceil(.5*TYPES[m.type].price*Math.pow(1.5,m.level-1)*(1-.05*(s.activeSkills.C3||0))));}
function occupied(s){const set=new Set();for(const m of s.inventory){if(m.slot>=0){set.add(m.slot);if(m.type==='portal'&&m.slot2>=0)set.add(m.slot2);}}return set;}
function normalizeSlots(s){const n=slotCount(s),used=new Set();for(const m of s.inventory){if(m.slot<0)continue;if(m.slot>=n||used.has(m.slot)||m.type==='portal'&&(m.slot2<0||m.slot2>=n||used.has(m.slot2)||m.slot2===m.slot)){m.slot=-1;delete m.slot2;continue;}used.add(m.slot);if(m.type==='portal')used.add(m.slot2);}if(!s.inventory.some(m=>m.slot>=0)){const m=s.inventory.find(m=>m.type==='bar');if(m)m.slot=0;}}
function skillRequirement(s,id){const b=id[0],n=+id[1],r=x=>s.skills[b+x]||0;if(s.completed<1)return 'Завершите поле 1';if(b==='D'&&s.completed<3)return 'Завершите поле 3';if(n===2||n===3){if(r(1)<2)return `${b}1: нужен ранг 2`;}if(n===4&&r(2)<2)return `${b}2: нужен ранг 2`;if(n===5&&r(3)<2)return `${b}3: нужен ранг 2`;if(n===6){if(r(4)<2||r(5)<2)return `${b}4 + ${b}5: нужны ранги 2`;if(s.completed<10)return 'Завершите поле 10';}if(n===7){if(!r(6))return `${b}6: нужен ранг 1`;if(s.completed<20)return 'Завершите поле 20';}return '';}
function spentSkills(s){return Object.entries(s.skills).reduce((sum,[id,r])=>sum+(SKILLS[id]?SKILLS[id].costs.slice(0,r).reduce((a,b)=>a+b,0):0),0);}
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function engineConfig(s){return{stage:s.stage,completed:s.completed,skills:copy(active(s)),inventory:copy(s.inventory),shell:s.phase==='prep'?s.shell:s.activeShell,traits:copy(s.phase==='prep'?s.traits:s.activeTraits),research:copy(s.phase==='prep'?s.research:s.activeResearch),auto:s.auto,autoFlippers:s.autoFlippers!==false,profiles:copy(s.profiles),lastQ:s.lastQ,link:copy(s.link),stageHits:s.stageHits};}
function rateSignature(s){const c=engineConfig(s);delete c.auto;delete c.stageHits;const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;return JSON.stringify(canonical(c));}
function validateState(raw){if(!raw||raw.version!==1||!Array.isArray(raw.inventory))throw Error('Несовместимое сохранение');const d=newState();const n=(v,lo,hi,fall=0)=>Number.isFinite(+v)?clamp(+v,lo,hi):fall;d.stage=Math.floor(n(raw.stage,1,1000,1));d.completed=Math.floor(n(raw.completed,0,d.stage-1));for(const k of ['coins','gems','score','stageEarned','stageHits'])d[k]=n(raw[k],0,1e250);d.phase=raw.phase==='prep'?'prep':'play';d.inventory=raw.inventory.slice(0,300).filter(m=>TYPES[m.type]).map((m,i)=>({id:i+1,type:m.type,level:Math.floor(n(m.level,1,250,1)),slot:Math.floor(n(m.slot,-1,13,-1)),slot2:m.type==='portal'?Math.floor(n(m.slot2,-1,13,-1)):undefined,angle:n(m.angle,-3600,3600),free:!!m.free}));if(!d.inventory.some(m=>m.type==='bar'))throw Error('В сохранении нет стартовых модулей');d.nextId=d.inventory.length+1;for(const cat of ['skills','activeSkills'])for(const id in SKILLS){const r=Math.floor(n(raw[cat]?.[id],0,SKILLS[id].max));if(r)d[cat][id]=r;}for(const k of ['shell','activeShell'])d[k]=SHELLS[raw[k]]?raw[k]:'steel';for(const k of ['traits','activeTraits'])for(const id in TYPES)if(['coins','points'].includes(raw[k]?.[id]))d[k][id]=raw[k][id];for(const k of ['research','activeResearch'])for(const id of ['points','devices','coins','offline'])d[k][id]=Math.floor(n(raw[k]?.[id],0,25));for(const id in TYPES)d.mastery[id]=n(raw.mastery?.[id],0,1e15);for(const id in d.stats)d.stats[id]=n(raw.stats?.[id],0,1e250);d.auto=!!raw.auto&&d.completed>=3;d.autoFlippers=raw.autoFlippers!==false;d.lastQ=n(raw.lastQ,0,1,.6);d.launchHistory=Array.isArray(raw.launchHistory)?raw.launchHistory.slice(-12).map(v=>n(v,0,1)): [.6];d.profiles=Array.isArray(raw.profiles)&&raw.profiles.length?raw.profiles.slice(0,4).map(v=>n(v,0,1)):[.6];d.prefs={sound:raw.prefs?.sound!==false,motion:raw.prefs?.motion!==false,vibration:!!raw.prefs?.vibration};d.savedAt=n(raw.savedAt,0,Date.now(),Date.now());d.startedStage=Math.floor(n(raw.startedStage,0,1000,d.stage));if(raw.offline&&Number.isFinite(raw.offline.rate))d.offline={rate:n(raw.offline.rate,0,1e100),eff:n(raw.offline.eff,0,.75),cap:n(raw.offline.cap,0,28800)};if(raw.rateCache&&typeof raw.rateCache.signature==='string'&&Number.isFinite(raw.rateCache.rate))d.rateCache={signature:raw.rateCache.signature,rate:n(raw.rateCache.rate,0,1e100)};if(raw.link&&Number.isInteger(raw.link.from)&&Number.isInteger(raw.link.to))d.link={from:raw.link.from,to:raw.link.to};if(Array.isArray(raw.schemes))d.schemes=raw.schemes.slice(0,3).map(p=>Array.isArray(p)?p.slice(0,14).filter(m=>TYPES[m.type]).map(m=>({type:m.type,slot:Math.floor(n(m.slot,-1,13,-1)),slot2:Math.floor(n(m.slot2,-1,13,-1)),angle:n(m.angle,-3600,3600),linkToSlot:Number.isInteger(m.linkToSlot)?Math.floor(n(m.linkToSlot,0,13)):undefined})):null);while(d.schemes.length<3)d.schemes.push(null);d.planner={enabled:!!raw.planner?.enabled&&!!d.activeSkills.D6,reserve:n(raw.planner?.reserve,0,1e250),ratio:[0,.25,.5].includes(raw.planner?.ratio)?raw.planner.ratio:0,mode:raw.planner?.mode==='order'?'order':'cheap',cursor:Math.floor(n(raw.planner?.cursor,0,1e8))};normalizeSlots(d);return d;}
