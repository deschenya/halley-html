(() => {
'use strict';
/* Data model, deterministic geometry, costs and skill dependencies. */
const VERSION=1, SAVE_KEY='kaskad_campaign_v1';
const W=440,H=700,STEP=1/120,TAU=Math.PI*2;
// The launch lane must open BELOW the narrowest themed roof. All coordinates
// are shared by collision geometry, live launches, insurance and the renderer.
// 236 clears every outline; the divider begins 24 units lower, leaving room
// for a full ball to turn into the playfield. Never teleport into a roof.
const PHYSICS_REVISION='0.13-pastel-art-pass';
const LAUNCHER=Object.freeze({x:398,spawnY:624,exitY:236,dividerX:382,
 dividerTop:260,dividerBottom:674,baseSpeed:940,chargeSpeed:150,
 exitVx:300,exitVxCharge:180,exitVy:320,exitVyCharge:150,
 timeout:1.8,recoveryX:350,recoveryY:145});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=o=>JSON.parse(JSON.stringify(o));
const fmt=(n,precision=0)=>{if(!Number.isFinite(n))return '0';const a=Math.abs(n);if(a<10000)return Math.floor(n).toLocaleString('ru-RU');if(a<1e6)return (n/1e3).toLocaleString('ru-RU',{maximumFractionDigits:1})+'\u00a0K';if(a<1e9)return (n/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})+'\u00a0M';if(a<1e12)return (n/1e9).toLocaleString('ru-RU',{maximumFractionDigits:2})+'\u00a0B';return n.toExponential(2).replace('+','');};
const exact=n=>Math.floor(n).toLocaleString('ru-RU');
const dec=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const TYPES={
 bar:{name:'Палочка',short:'Палочка',price:20,c:1,p:10,unlock:5,color:'#ff9650',shape:'bar',desc:'Неподвижная планка. Направляет шарик к другим модулям. Поворот меняет траекторию.',l5:'Каждое пятое попадание дает двойные очки.',l10:'Раз в 5 с попадание добавляет еще один шаг серии.'},
 bumper:{name:'Бампер',short:'Бампер',price:60,c:2,p:20,unlock:1,color:'#12ccb5',shape:'bumper',desc:'Упругий отбойник. Активно возвращает шарик в верхнюю часть поля.',l5:'Сила отбоя +10% в пределах лимита скорости.',l10:'Каждый шестой удар: 50% очков ближайшего модуля без цепной активации.'},
 spinner:{name:'Вертушка',short:'Вертушка',price:150,c:1,p:8,unlock:3,color:'#ffbf29',shape:'spinner',desc:'За 4 контакта выплачивает еще 3 монеты и 40 очков с учетом уровня.',l5:'Выплата после 3 контактов вместо 4.',l10:'Монеты дополнительной выплаты +50%.'},
 gate:{name:'Ворота-множитель',short:'Ворота',price:250,c:1,p:5,unlock:5,color:'#9b61ff',shape:'gate',desc:'Проход по стрелке: следующие 3 попадания шарика получают x1,5 очков на 4 с.',l5:'Усиление на 4 попадания.',l10:'Длительность усиления 6 с.'},
 bank:{name:'Банк',short:'Банк',price:350,c:1,p:5,unlock:7,color:'#ffb322',shape:'bank',desc:'После 5 попаданий выплачивает 12 монет и 100 очков. Перезарядка выплаты 1 с.',l5:'Выплата после 4 попаданий.',l10:'Монеты выплаты +50%.'},
 portal:{name:'Портальная пара',short:'Порталы',price:600,c:1,p:5,unlock:10,color:'#8260ff',shape:'portal',unique:true,desc:'Вход и выход занимают 2 сокета. Сохраняет скорость, но меняет направление по стрелке выхода.',l5:'После выхода +25% очков на 2 попадания за 3 с.',l10:'Повторный вход через 0,75 с вместо 1 с.'},
 magnet:{name:'Магнит',short:'Магнит',price:1200,c:1,p:5,unlock:15,color:'#ff6689',shape:'magnet',unique:true,desc:'Захватывает шарик на 0,15 с и выпускает по стрелке. Перезарядка 6 с.',l5:'Перезарядка 5 с.',l10:'После выпуска +25% очков на 2 попадания за 3 с.'},
 multi:{name:'Генератор мультибола',short:'Мультибол',price:1800,c:1,p:6,unlock:20,color:'#28baf0',shape:'multi',unique:true,desc:'Каждые 20 попаданий по полю создают 2 шарика на 8 с. Не более 3 шариков; перезарядка 20 с.',l5:'Для активации нужно 16 попаданий.',l10:'Временные шарики живут 12 с.'},
 boost:{name:'Ускоритель',short:'Ускоритель',price:100,c:1,p:12,unlock:0,color:'#26bdf1',shape:'boost',desc:'Разгоняет шарик по стрелке. Контакт приносит монеты и очки; следующий запуск механизма через 0,75 с.',l5:'Перезарядка сокращается до 0,55 с.',l10:'Следующие два удара шарика: +25% очков на 3 с.'},
 spring:{name:'Пружинный отбойник',short:'Пружина',price:70,c:2,p:15,unlock:0,color:'#ffb52c',shape:'spring',desc:'Даёт сильный отскок и награду за столкновение. Каждый уровень повышает награду на 35%.',l5:'Усиливает отскок на 10%, сохраняя предел скорости.',l10:'Каждый пятый контакт даёт двойные очки.'},
 goo:{name:'Липкая зона',short:'Липкая зона',price:80,c:1,p:10,unlock:0,color:'#89d72f',shape:'goo',desc:'Замедляет шарик. Новый вход в зону приносит монеты и очки; непрерывное удержание не создаёт доход.',l5:'Замедление становится мягче: легче выйти из зоны.',l10:'Выход усиливает следующие два попадания на 25% на 3 с.'},
 coin:{name:'Золотая звезда',short:'Звезда',price:120,c:3,p:20,unlock:0,color:'#ffcc27',shape:'coin',desc:'Бонусная цель с монетами и очками. Каждый уровень повышает награду на 35%. Интервал выплат — 1,1 с.',l5:'Интервал выплат сокращается до 0,8 с.',l10:'Монетная награда ×1,5.'}
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
const BRANCH_COLORS={A:'#04af9d',B:'#8b51f0',C:'#e9a008',D:'#f45d83'};
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
const SKILL_ICONS={A1:'flip',A2:'touch',A3:'chart',A4:'spring',A5:'star',A6:'check',A7:'star',B1:'build',B2:'rotate',B3:'blocks',B4:'plus',B5:'chart',B6:'arrow',B7:'gem',C1:'gem',C2:'blocks',C3:'build',C4:'download',C5:'star',C6:'plus',C7:'gem',D1:'spring',D2:'auto',D3:'download',D4:'chart',D5:'store',D6:'settings',D7:'check'};
const SHELLS={steel:{name:'Стальная',unlock:0,c:1,p:1,color:'#e7f3ed',desc:'Без модификаторов. Базовая оболочка.'},brass:{name:'Латунная',unlock:10,c:1.15,p:.85,color:'#f1ce8b',desc:'+15% монет, -15% очков.'},ruby:{name:'Рубиновая',unlock:10,c:.85,p:1.15,color:'#ef999e',desc:'+15% очков, -15% монет.'},ceramic:{name:'Керамическая',unlock:20,c:1,p:.85,color:'#b8c1ed',desc:'+5 п.п. реакции автомата, -15% очков.'}};
const MODIFIERS=['Односторонние дорожки','Разнесенные зоны','Тяжелые механизмы','Зеркальная ориентация'];
const baseSlots=[[124,208],[278,237],[123,350],[274,402],[212,136],[217,291],[191,478],[328,319],[65,281],[325,475],[66,446],[324,172],[195,397],[87,134]];

const FIELD_THEMES=[
 {name:'Мятный бриз',bg1:'#f7fffc',bg2:'#dbfbf3',wall:'#36d0b7',wallHi:'#b8fff0',accent:'#1eb59b',haz:'#ff5c74'},
 {name:'Голубой сорбет',bg1:'#fbfeff',bg2:'#dff5ff',wall:'#55c3f3',wallHi:'#cbf1ff',accent:'#27a4db',haz:'#ff5c74'},
 {name:'Персиковое облако',bg1:'#fffaf6',bg2:'#ffe8d8',wall:'#ffb36b',wallHi:'#ffe0b9',accent:'#ef9551',haz:'#ff5c74'},
 {name:'Лавандовый поп',bg1:'#fcfaff',bg2:'#ece3ff',wall:'#a888ff',wallHi:'#ddd1ff',accent:'#8d6cf0',haz:'#ff5c74'},
 {name:'Лимонный твист',bg1:'#fffef7',bg2:'#fff3bf',wall:'#f6c84f',wallHi:'#ffe99d',accent:'#d8a326',haz:'#ff5c74'},
 {name:'Аквамарин',bg1:'#f7ffff',bg2:'#d8fbff',wall:'#4acfd7',wallHi:'#c2fdff',accent:'#1db4bb',haz:'#ff5c74'},
 {name:'Клубничный крем',bg1:'#fff9fb',bg2:'#ffe0ea',wall:'#ff87a6',wallHi:'#ffc5d5',accent:'#ee648b',haz:'#ff5c74'},
 {name:'Пастельная радуга',bg1:'#fffefc',bg2:'#eaf7ff',wall:'#7fd0ff',wallHi:'#d9f4ff',accent:'#46b2ea',haz:'#ff5c74'}
];
const FIELD_LAYOUTS=[
 [[124,208],[278,237],[123,350],[274,402],[212,136],[217,291],[191,478],[328,319],[65,281],[325,475],[66,446],[324,172],[195,397],[87,134]],
 [[95,185],[220,165],[315,215],[115,310],[265,330],[182,420],[315,455],[74,430],[188,250],[327,355],[80,255],[275,125],[210,505],[132,475]],
 [[82,150],[190,205],[315,155],[90,350],[210,310],[326,362],[150,455],[285,485],[62,250],[340,265],[116,275],[255,245],[205,485],[327,440]],
 [[145,132],[275,150],[75,240],[205,235],[330,245],[120,365],[285,380],[205,480],[62,435],[342,430],[110,500],[300,500],[205,330],[75,330]],
 [[82,180],[170,135],[305,180],[120,280],[275,270],[70,390],[205,350],[330,385],[138,470],[282,485],[205,220],[335,120],[62,475],[235,430]],
 [[120,150],[280,150],[80,250],[200,235],[325,270],[110,360],[285,350],[200,450],[65,455],[335,455],[150,500],[265,500],[205,305],[330,175]],
 [[70,160],[180,135],[315,175],[120,260],[280,255],[75,360],[205,335],[335,365],[130,455],[282,440],[205,505],[340,500],[210,205],[65,485]],
 [[100,130],[300,135],[175,210],[320,255],[100,300],[230,345],[325,405],[115,420],[210,485],[70,220],[338,175],[75,500],[280,505],[205,270]]
];
const FIELD_OUTLINES=[
 [[24,707],[24,204],[28,164],[42,121],[68,88],[106,61],[156,43],[220,36],[284,43],[334,61],[372,88],[398,121],[412,164],[416,204],[416,707]],
 [[26,707],[26,214],[32,173],[48,129],[76,94],[116,65],[164,46],[220,40],[276,46],[324,65],[364,94],[392,129],[408,173],[414,214],[414,707]],
 [[24,707],[24,196],[30,154],[44,112],[74,80],[114,55],[164,40],[220,34],[276,40],[326,55],[366,80],[396,112],[410,154],[416,196],[416,707]],
 [[28,707],[28,210],[34,168],[52,126],[84,95],[126,70],[172,53],[220,47],[268,53],[314,70],[356,95],[388,126],[406,168],[412,210],[412,707]],
 [[24,707],[24,218],[30,179],[46,136],[74,100],[112,72],[162,52],[220,44],[278,52],[328,72],[366,100],[394,136],[410,179],[416,218],[416,707]],
 [[28,707],[28,205],[36,162],[58,120],[92,88],[136,63],[178,48],[220,42],[262,48],[304,63],[348,88],[382,120],[404,162],[412,205],[412,707]],
 [[24,707],[24,212],[30,171],[48,131],[82,99],[124,73],[170,54],[220,47],[270,54],[316,73],[358,99],[392,131],[410,171],[416,212],[416,707]],
 [[26,707],[26,200],[34,158],[54,118],[88,86],[130,61],[176,46],[220,40],[264,46],[310,61],[352,86],[386,118],[406,158],[414,200],[414,707]]
];
const FIELD_RAILS=[
 [[[96,194],[150,226]],[[344,194],[290,226]],[[126,516],[176,476]],[[314,516],[264,476]]],
 [[[96,206],[148,238]],[[344,206],[292,238]],[[136,478],[186,442]],[[304,478],[254,442]]],
 [[[96,188],[148,220]],[[344,188],[292,220]],[[126,502],[176,462]],[[314,502],[264,462]]],
 [[[108,222],[152,252]],[[332,222],[288,252]],[[146,482],[186,450]],[[294,482],[254,450]]],
 [[[104,214],[154,244]],[[336,214],[286,244]],[[132,508],[180,470]],[[308,508],[260,470]]],
 [[[112,202],[156,232]],[[328,202],[284,232]],[[150,488],[188,456]],[[290,488],[252,456]]],
 [[[102,220],[148,252]],[[338,220],[292,252]],[[136,494],[182,458]],[[304,494],[258,458]]],
 [[[100,210],[150,242]],[[340,210],[290,242]],[[138,500],[184,464]],[[302,500],[256,464]]]
];
function fieldVariant(stage){return (Math.max(1,stage)-1)%FIELD_THEMES.length;}
function fieldTheme(stage){return FIELD_THEMES[fieldVariant(stage)];}

// Only safe, upgradeable devices occupy these two featured sockets.
const FIELD_FEATURE_TYPES=[
 ['spring','spring'],['coin','coin'],['boost','boost'],['goo','goo'],
 ['coin','coin'],['spring','spring'],['boost','boost'],['goo','goo']
];
// Lethal obstacles are authored scenery, not modules. They never award income,
// appear in the catalog, use sockets, contribute to skills or accept upgrades.
function hazardsFor(stage){
 if(stage<16)return [];
 const hazards=[
  {id:'hazard-top-left',type:'spike',x:138,y:145,r:9},
  {id:'hazard-top-right',type:'spike',x:270,y:145,r:9}
 ];
 if(stage>=21){const type=stage%2?'hole':'spike';hazards.push(
  {id:'hazard-low-left',type,x:138,y:575,r:9},
  {id:'hazard-low-right',type,x:270,y:575,r:9}
 );}
 return hazards;
}
function migrateLegacyDevices(raw){
 const d=copy(raw),replacement={spike:'bumper',hole:'bank'};
 for(const m of d.inventory||[])if(replacement[m.type])m.type=replacement[m.type];
 for(const f of Object.values(d.fieldObjects||{}))if(replacement[f?.type])f.type=replacement[f.type];
 for(const scheme of d.schemes||[])if(Array.isArray(scheme))for(const m of scheme)if(replacement[m.type])m.type=replacement[m.type];
 for(const key of ['mastery','traits','activeTraits'])if(d[key])for(const [from,to] of Object.entries(replacement)){
  if(key==='mastery')d[key][to]=(d[key][to]||0)+(d[key][from]||0);
  else if(d[key][from]&&!d[key][to])d[key][to]=d[key][from];
  delete d[key][from];
 }
 return d;
}
const FIELD_PERMUTATIONS=[
 [0,3,8,11,1,6,13,7,4,15,12,2,9,14,5,10],
 [3,0,11,8,2,5,14,4,7,12,15,1,10,13,6,9],
 [1,2,12,15,0,7,9,11,4,14,8,3,6,13,5,10],
 [0,2,9,11,3,4,14,6,7,12,15,1,8,13,5,10],
 [3,1,8,10,0,5,15,7,4,13,12,2,11,14,6,9],
 [1,3,12,14,0,6,9,7,4,15,8,2,10,13,5,11],
 [2,0,15,8,1,4,14,6,7,12,11,3,9,13,5,10],
 [0,3,9,14,1,7,12,6,4,15,8,2,11,13,5,10]
];
function safeLayout(stage){
 const variant=fieldVariant(stage);
 const left=124,right=316,outerLeft=90,outerRight=350,midLeft=165,midRight=275,center=220;
 const yOffset=[0,7,-6,12,-10,4,-3,9][variant];
 const points=[
  {x:left,y:186+yOffset},{x:right,y:186+yOffset},
  {x:outerLeft,y:268+yOffset},{x:outerRight,y:268+yOffset},
  {x:center,y:226+yOffset},
  {x:left,y:346+yOffset},{x:right,y:346+yOffset},
  {x:center,y:306+yOffset},
  {x:outerLeft,y:424+yOffset},{x:outerRight,y:424+yOffset},
  {x:center,y:384+yOffset},
  {x:midLeft,y:502+yOffset},{x:midRight,y:502+yOffset},
  {x:center,y:462+yOffset},
  {x:166,y:566+yOffset},{x:274,y:566+yOffset}
 ];
 if(modifier(stage)===3)for(const p of points)p.x=440-p.x;
 return points;
}
function featuresFor(stage,records={}){
 const points=safeLayout(stage),allDefaults=FIELD_FEATURE_TYPES[fieldVariant(stage)];
 const featureCount=stage<5?0:2;
 const defaults=allDefaults.slice(0,featureCount);
 return defaults.map((type,i)=>{
   const record=records[i]||{},chosen=TYPES[record.type]&&record.type!=='portal'?record.type:type;
   return {id:'f'+i,featureIndex:i,type:chosen,level:record.level||1,angle:record.angle??(chosen==='boost'?-90:0),slot:14+i,
     x:points[14+i].x,y:points[14+i].y,r:chosen==='goo'?23:chosen==='spike'?21:18,
     a:(record.angle??(chosen==='boost'?-90:0))*Math.PI/180,hits:0,charge:0,paidAt:-100,lastAward:-100,
     nextAction:0,lastExtra:-100,glow:0,spin:0};
 });
}
function objectRecord(id,create=false){
 if(String(id).startsWith('f')){
   const i=+String(id).slice(1);if(!Number.isInteger(i)||i<0||i>1)return null;
   if(create&&!state.fieldObjects[i])state.fieldObjects[i]={level:1,angle:featuresFor(state.stage)[i].angle};
   const live=world?.mods.find(m=>m.id==='f'+i);
   return create?state.fieldObjects[i]:live;
 }
 return state.inventory.find(m=>m.id===+id)||null;
}
function syncWorldObjects(){
 world.cfg.fieldObjects=copy(state.fieldObjects||{});
 world.updateModules(state.inventory);
}
function objectBounds(m,includePrice=true){
 return {left:m.x-36,right:m.x+36,top:m.y-36,bottom:m.y+(includePrice?56:36)};
}
function segmentIntersectsRect(a,b,r){
 let lo=0,hi=1;
 for(const [axis,min,max] of [[0,r.left,r.right],[1,r.top,r.bottom]]){
  const d=b[axis]-a[axis];if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return false;continue;}
  let x=(min-a[axis])/d,y=(max-a[axis])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;
 }
 return true;
}
function layoutAudit(stage){
 const positions=safeLayout(stage),bounds=positions.map(p=>objectBounds(p)),errors=[];
 const path=FIELD_OUTLINES[fieldVariant(stage)],walls=[];
 for(let i=1;i<path.length;i++)walls.push([path[i-1],path[i],10]);
 walls.push([[LAUNCHER.dividerX,LAUNCHER.dividerTop],[LAUNCHER.dividerX,LAUNCHER.dividerBottom],10]);
 for(const chain of [[[29,560],[66,580],[109,603]],[[377,560],[343,580],[300,603]]])
  for(let i=1;i<chain.length;i++)walls.push([chain[i-1],chain[i],11]);
 for(let i=0;i<bounds.length;i++){
   const a=bounds[i],p=positions[i];
   if(a.left<39||a.right>370||a.top<124||a.bottom>550)errors.push({kind:'boundary',slot:i});
   for(let j=i+1;j<bounds.length;j++){
     const b=bounds[j];
     if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)errors.push({kind:'overlap',slots:[i,j]});
   }
   for(const [w1,w2,r] of walls){
    const body={left:p.x-36-r,right:p.x+36+r,top:p.y-36-r,bottom:p.y+36+r};
    const price={left:p.x-34-r,right:p.x+34+r,top:p.y+34-r,bottom:p.y+53+r};
    if(segmentIntersectsRect(w1,w2,body)||segmentIntersectsRect(w1,w2,price))errors.push({kind:'wall',slot:i});
   }
 }
 for(const h of hazardsFor(stage)){
  for(let i=0;i<bounds.length;i++){const b=bounds[i];
   if(h.x+h.r>b.left&&h.x-h.r<b.right&&h.y+h.r>b.top&&h.y-h.r<b.bottom)errors.push({kind:'hazard-overlap',slot:i});
  }
  if(h.x+h.r>LAUNCHER.dividerX-4)errors.push({kind:'hazard-in-launch-lane'});
 }
 return errors;
}

function chapter(stage){return CHAPTERS[Math.floor((stage-1)/5)%6];}
function modifier(stage){return stage>30?Math.floor((stage-31)/5)%4:-1;}
function goal(stage){return Math.min(1e250,100*Math.ceil((stage<=30?2000*Math.pow(1.72,stage-1):100*Math.ceil(2000*Math.pow(1.72,29)/100)*Math.pow(1.55,stage-30))/100));}
function reward(stage,skills={}){return Math.min(8,3+Math.floor((stage-1)/5))+(stage%5===0?5:0)+(skills.C7||0);}
function slotCount(s,skills=s.skills){const early=s.stage<=2?4:s.stage<=4?6:8;return Math.min(14,early+(s.completed>=10?2:0)+(s.completed>=20?2:0)+(skills.B4||0));}
function slotsFor(stage){return safeLayout(stage);}
function newState(){return{version:VERSION,stage:1,completed:0,coins:0,gems:0,score:0,phase:'play',inventory:[0,1,2,3].map((slot,i)=>({id:i+1,type:'bumper',level:1,slot,angle:0,free:true})),nextId:5,skills:{},activeSkills:{},shell:'steel',activeShell:'steel',traits:{},activeTraits:{},research:{},activeResearch:{},mastery:{},auto:false,autoFlippers:true,lastQ:.6,launchHistory:[.6],profiles:[.6],link:null,schemes:[null,null,null],fieldObjects:{},stats:{hits:0,perfect:0,manual:0,runs:0,coins:0,bestRun:0,playtime:0},stageEarned:0,stageHits:0,planner:{enabled:false,reserve:0,mode:'cheap'},prefs:{sound:true,motion:!window.matchMedia('(prefers-reduced-motion: reduce)').matches,vibration:false},savedAt:Date.now(),offline:null,rateCache:null,startedStage:1};}
function active(s){return s.skills;}
function priceNew(s,type){const n=s.inventory.filter(m=>m.type===type&&!m.free).length;return Math.ceil(TYPES[type].price*Math.pow(1.8,n)*(1-.05*(s.skills.C2||0)));}
function priceLevel(s,m){return Math.max(1,Math.ceil(.5*TYPES[m.type].price*Math.pow(1.5,m.level-1)*(1-.05*(s.skills.C3||0))));}
function occupied(s){const set=new Set();for(const m of s.inventory){if(m.slot>=0){set.add(m.slot);if(m.type==='portal'&&m.slot2>=0)set.add(m.slot2);}}return set;}
function normalizeSlots(s){const n=slotCount(s),used=new Set();for(const m of s.inventory){if(m.slot<0)continue;if(m.slot>=n||used.has(m.slot)||m.type==='portal'&&(m.slot2<0||m.slot2>=n||used.has(m.slot2)||m.slot2===m.slot)){m.slot=-1;delete m.slot2;continue;}used.add(m.slot);if(m.type==='portal')used.add(m.slot2);}if(!s.inventory.some(m=>m.slot>=0)){const m=s.inventory.find(m=>m.type==='bumper')||s.inventory[0];if(m)m.slot=0;}}
function resetFieldProgress(s){
 for(const m of s.inventory)m.level=1;
 s.fieldObjects={};
}
function skillRequirement(){return '';}
function spentSkills(s){return Object.entries(s.skills).reduce((sum,[id,r])=>sum+(SKILLS[id]?SKILLS[id].costs.slice(0,r).reduce((a,b)=>a+b,0):0),0);}
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function engineConfig(s){return{stage:s.stage,completed:s.completed,skills:copy(active(s)),inventory:copy(s.inventory),fieldObjects:copy(s.fieldObjects||{}),shell:s.phase==='prep'?s.shell:s.activeShell,traits:copy(s.phase==='prep'?s.traits:s.activeTraits),research:copy(s.phase==='prep'?s.research:s.activeResearch),auto:s.auto,autoFlippers:s.autoFlippers!==false,profiles:copy(s.profiles),lastQ:s.lastQ,link:copy(s.link),stageHits:s.stageHits};}
function rateSignature(s){const c=engineConfig(s);c.physicsRevision=PHYSICS_REVISION;delete c.auto;delete c.stageHits;const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;return JSON.stringify(canonical(c));}
function validateState(raw){if(!raw||raw.version!==1||!Array.isArray(raw.inventory))throw Error('Несовместимое сохранение');raw=migrateLegacyDevices(raw);const d=newState();const n=(v,lo,hi,fall=0)=>Number.isFinite(+v)?clamp(+v,lo,hi):fall;d.stage=Math.floor(n(raw.stage,1,1000,1));d.completed=Math.floor(n(raw.completed,0,d.stage-1));for(const k of ['coins','gems','score','stageEarned','stageHits'])d[k]=n(raw[k],0,1e250);d.phase=raw.phase==='prep'?'prep':'play';d.inventory=raw.inventory.slice(0,300).filter(m=>TYPES[m.type]).map((m,i)=>({id:i+1,type:m.type,level:Math.floor(n(m.level,1,250,1)),slot:Math.floor(n(m.slot,-1,13,-1)),slot2:m.type==='portal'?Math.floor(n(m.slot2,-1,13,-1)):undefined,angle:n(m.angle,-3600,3600),free:!!m.free}));for(const m of d.inventory)if(m.free&&m.type==='bar'){m.type='bumper';m.angle=0;}d.nextId=d.inventory.length+1;for(const cat of ['skills','activeSkills'])for(const id in SKILLS){const r=Math.floor(n(raw[cat]?.[id],0,SKILLS[id].max));if(r)d[cat][id]=r;}for(const k of ['shell','activeShell'])d[k]=SHELLS[raw[k]]?raw[k]:'steel';for(const k of ['traits','activeTraits'])for(const id in TYPES)if(['coins','points'].includes(raw[k]?.[id]))d[k][id]=raw[k][id];for(const k of ['research','activeResearch'])for(const id of ['points','devices','coins','offline'])d[k][id]=Math.floor(n(raw[k]?.[id],0,25));for(const id in TYPES)d.mastery[id]=n(raw.mastery?.[id],0,1e15);for(const id in d.stats)d.stats[id]=n(raw.stats?.[id],0,1e250);d.auto=!!raw.auto&&(d.completed>=3||!!d.skills.D1);d.autoFlippers=raw.autoFlippers!==false;d.lastQ=n(raw.lastQ,0,1,.6);d.launchHistory=Array.isArray(raw.launchHistory)?raw.launchHistory.slice(-12).map(v=>n(v,0,1)): [.6];d.profiles=Array.isArray(raw.profiles)&&raw.profiles.length?raw.profiles.slice(0,4).map(v=>n(v,0,1)):[.6];d.prefs={sound:raw.prefs?.sound!==false,motion:raw.prefs?.motion!==false,vibration:!!raw.prefs?.vibration};d.savedAt=n(raw.savedAt,0,Date.now(),Date.now());d.startedStage=Math.floor(n(raw.startedStage,0,1000,d.stage));if(raw.offline&&Number.isFinite(raw.offline.rate))d.offline={rate:n(raw.offline.rate,0,1e100),eff:n(raw.offline.eff,0,.75),cap:n(raw.offline.cap,0,28800)};if(raw.rateCache&&typeof raw.rateCache.signature==='string'&&Number.isFinite(raw.rateCache.rate))d.rateCache={signature:raw.rateCache.signature,rate:n(raw.rateCache.rate,0,1e100)};if(raw.link&&(Number.isInteger(raw.link.from)||/^f[01]$/.test(raw.link.from))&&(Number.isInteger(raw.link.to)||/^f[01]$/.test(raw.link.to)))d.link={from:raw.link.from,to:raw.link.to};if(Array.isArray(raw.schemes))d.schemes=raw.schemes.slice(0,3).map(p=>Array.isArray(p)?p.slice(0,14).filter(m=>TYPES[m.type]).map(m=>({type:m.type,slot:Math.floor(n(m.slot,-1,13,-1)),slot2:Math.floor(n(m.slot2,-1,13,-1)),angle:n(m.angle,-3600,3600),linkToSlot:Number.isInteger(m.linkToSlot)?Math.floor(n(m.linkToSlot,0,13)):undefined})):null);while(d.schemes.length<3)d.schemes.push(null);d.planner={enabled:!!raw.planner?.enabled&&!!(d.skills.D6||d.activeSkills.D6),reserve:n(raw.planner?.reserve,0,1e250),ratio:[0,.25,.5].includes(raw.planner?.ratio)?raw.planner.ratio:0,mode:raw.planner?.mode==='order'?'order':'cheap',cursor:Math.floor(n(raw.planner?.cursor,0,1e8))};d.fieldObjects={};for(const i of [0,1]){const f=raw.fieldObjects?.[i];if(f&&typeof f==='object'){d.fieldObjects[i]={level:Math.floor(n(f.level,1,250,1)),angle:n(f.angle,-3600,3600)};if(TYPES[f.type]&&f.type!=='portal')d.fieldObjects[i].type=f.type;}}
d.phase='play';d.activeSkills=copy(d.skills);d.activeResearch=copy(d.research);d.activeTraits=copy(d.traits);d.activeShell=d.shell;normalizeSlots(d);return d;}


/* Fixed-step pinball simulation. No DOM, clocks or storage; reused by the offline
   estimator and the live game. Coordinates are logical pixels (440 x 700). */
class PinballWorld{
 constructor(config,{seed=Date.now()|0,onEvent=()=>{},simulation=false}={}){
  this.cfg=copy(config);this.rng=seeded(seed);this.onEvent=onEvent;this.simulation=simulation;
  this.time=0;this.balls=[];this.nextBall=1;this.emptySince=-1;this.flipAt=-100;this.flipManual=false;this.manualAt=-100;
  this.charging=false;this.chargeAt=0;this.lastQ=config.lastQ??.6;this.profileIndex=0;this.auto=!!config.auto;this.autoFlippers=config.autoFlippers!==false;
  this.combo=1;this.lastHit=-100;this.lastModule=-1;this.coinsEarned=0;this.pointsEarned=0;this.runPoints=0;
  this.runHits=0;this.runPerfect=0;this.runStart=0;this.runManual=false;this.manualTouched=false;this.insured=false;
  this.masterUntil=-100;this.masterUsed=false;this.lastPerfect=-100;this.resonanceUntil=-100;this.resonanceReady=0;
  this.typeHits={};this.linkUntil=-100;this.linkReady=0;this.linkTarget=-1;this.stageHits=config.stageHits||0;
  this.slots=slotsFor(config.stage);this.hazards=hazardsFor(config.stage);this.features=[];this.mods=[];this.updateModules(config.inventory);this.walls=this.makeWalls();
 }
 s(id){return this.cfg.skills[id]||0;}
 emit(type,data={}){this.onEvent({type,time:this.time,...data});}
 cd(seconds){return seconds*(1-.05*this.s('B2'))*(modifier(this.cfg.stage)===2?1.25:1);}

 updateModules(inventory){
  this.cfg.inventory=copy(inventory);
  const old=new Map(this.mods.map(m=>[m.id,m]));
  const records=[...inventory.filter(m=>m.slot>=0),...featuresFor(this.cfg.stage,this.cfg.fieldObjects||{})];
  this.mods=records.map(info=>{
   const prior=old.get(info.id),m=prior&&prior.type===info.type?prior:{hits:0,charge:0,paidAt:-100,lastAward:-100,nextAction:0,lastExtra:-100,glow:0,spin:0};
   const runtime={hits:m.hits,charge:m.charge,paidAt:m.paidAt,lastAward:m.lastAward,nextAction:m.nextAction,lastExtra:m.lastExtra,glow:m.glow,spin:m.spin};
   Object.assign(m,copy(info),this.slots[info.slot],runtime);m.a=(info.angle||0)*Math.PI/180;return m;
  });
  this.features=this.mods.filter(m=>String(m.id).startsWith('f'));
 }
 makeWalls(){const path=FIELD_OUTLINES[fieldVariant(this.cfg.stage)],out=[];for(let i=1;i<path.length;i++)out.push({a:path[i-1],b:path[i],r:3,e:.84});out.push({a:[LAUNCHER.dividerX,LAUNCHER.dividerTop],b:[LAUNCHER.dividerX,LAUNCHER.dividerBottom],r:3,e:.87});for(const chain of [[[29,560],[66,580],[109,603]],[[377,560],[343,580],[300,603]]])for(let i=1;i<chain.length;i++)out.push({a:chain[i-1],b:chain[i],r:5,e:.78});return out;}
  newBall(x,y,vx,vy,extra={}){return{id:this.nextBall++,x,y,px:x,py:y,vx,vy,r:7.2,contacts:new Set(),cool:{},gate:0,gateUntil:0,perfect:0,perfectUntil:0,out:0,outUntil:0,first:false,ttl:Infinity,trail:[],sensor:false,held:null,inLane:false,laneStarted:0,unstuck:0,stuckTime:0,anchorX:x,anchorY:y,lastPerfectPulse:-100,lastManualPulse:-100,manual:0,manualUntil:0,laneReturnLockUntil:0,parked:false,...extra};}
 resetCounters(){this.combo=1;this.lastHit=-100;this.lastModule=-1;this.typeHits={};this.resonanceUntil=-100;this.resonanceReady=this.time;this.linkUntil=-100;this.linkReady=this.time;for(const m of this.mods){m.hits=0;m.charge=0;m.nextAction=this.time;m.lastAward=-100;m.lastExtra=-100;}this.masterUntil=-100;this.masterUsed=false;}
 parkedBall(){return this.balls.length===1&&this.balls[0].parked?this.balls[0]:null;}
 beginCharge(){const parked=this.parkedBall();if(this.balls.length&&!parked||!parked&&this.time-this.emptySince<.5)return false;this.charging=true;this.chargeAt=this.time;this.manualAt=this.time;return true;}
 releaseCharge(){if(!this.charging)return false;const q=clamp((this.time-this.chargeAt)/.9,0,1);return this.releaseChargeQ(q,true);}
 releaseChargeQ(q,manual=true){if(!this.charging)return false;this.charging=false;q=Number.isFinite(q)?clamp(q,0,1):.6;const b=this.parkedBall();if(b)return this.relaunchParked(b,q,manual);return this.launch(q,manual);}
 relaunchParked(b,q,manual=true){this.lastQ=q;if(manual){this.manualAt=this.time;this.manualTouched=true;this.runManual=true;}b.parked=false;b.inLane=true;b.launchQ=q;b.laneStarted=this.time;b.x=LAUNCHER.x;b.y=LAUNCHER.spawnY;b.px=b.x;b.py=b.y;b.vx=0;b.vy=-LAUNCHER.baseSpeed-q*LAUNCHER.chargeSpeed;b.anchorX=b.x;b.anchorY=b.y;b.stuckTime=0;b.contacts.clear();b.trail=[];this.emit('relaunch',{manual,q,ball:b.id});return true;}
 cancelCharge(){this.charging=false;}
 launchBall(q,extra={}){
  q=Number.isFinite(q)?clamp(q,0,1):.6;
  return this.newBall(LAUNCHER.x,LAUNCHER.spawnY,0,-LAUNCHER.baseSpeed-q*LAUNCHER.chargeSpeed,
   {...extra,inLane:true,launchQ:q,laneStarted:this.time});
 }
 enterPlayfield(b,recovered=false){
  const q=Number.isFinite(b.launchQ)?clamp(b.launchQ,0,1):.6;
  // Normal launches turn continuously at the open mouth, with no position jump.
  // The fallback is reserved for an abnormal trapped lane, never for normal play.
  if(recovered){b.x=LAUNCHER.recoveryX;b.y=LAUNCHER.recoveryY;}
  b.inLane=false;b.laneReturnLockUntil=this.time+.45;b.vx=-LAUNCHER.exitVx-LAUNCHER.exitVxCharge*q;
  b.vy=-LAUNCHER.exitVy-LAUNCHER.exitVyCharge*q;
  b.px=b.x;b.py=b.y;b.anchorX=b.x;b.anchorY=b.y;b.stuckTime=0;b.contacts.clear();
  this.emit('entry',{q,x:b.x,y:b.y,ball:b.id,recovered});
 }
 launch(q=.6,manual=false){if(this.balls.length)return false;q=Number.isFinite(q)?clamp(q,0,1):.6;this.resetCounters();this.runHits=0;this.runPerfect=0;this.runPoints=0;this.runStart=this.time;this.runManual=manual;this.manualTouched=manual;this.insured=false;this.lastPerfect=-100;this.lastQ=q;if(manual)this.manualAt=this.time;this.balls.push(this.launchBall(q,{first:manual&&this.s('A4')>=3}));this.emit('launch',{manual,q});return true;}
 pulse(manual=true){if(manual){this.manualAt=this.time;this.manualTouched=true;}if(!this.balls.length||this.parkedBall()||this.time-this.flipAt+1e-9<.25)return false;this.flipAt=this.time;this.flipManual=manual;this.emit('flip',{manual});return true;}
 flippers(){const t=this.time-this.flipAt;let f=0,df=0;if(t>=0&&t<.09){f=Math.sin(t/.09*Math.PI/2);df=Math.cos(t/.09*Math.PI/2)*Math.PI/2/.09;}else if(t<.12&&t>=.09){f=1;}else if(t>=.12&&t<.24){f=1-(t-.12)/.12;df=-1/.12;}const rest=.36,range=.87;return[{x:109,y:603,a:rest-range*f,omega:-range*df,side:1},{x:300,y:603,a:Math.PI-rest+range*f,omega:range*df,side:-1}].map(f=>({...f,x2:f.x+85*Math.cos(f.a),y2:f.y+85*Math.sin(f.a)}));}
 resolveSegment(b,a,c,r=5,e=.88,motion=null){const dx=c[0]-a[0],dy=c[1]-a[1],u=clamp(((b.x-a[0])*dx+(b.y-a[1])*dy)/(dx*dx+dy*dy||1),0,1),x=a[0]+dx*u,y=a[1]+dy*u;let nx=b.x-x,ny=b.y-y,d=Math.hypot(nx,ny),limit=b.r+r;if(d>=limit)return null;if(d<.00001){nx=-dy;ny=dx;d=Math.hypot(nx,ny)||1;}nx/=d;ny/=d;b.x=x+nx*(limit+.02);b.y=y+ny*(limit+.02);let sx=0,sy=0;if(motion){sx=-motion.omega*(y-motion.y);sy=motion.omega*(x-motion.x);}const v=(b.vx-sx)*nx+(b.vy-sy)*ny;if(v<0){b.vx-=(1+e)*v*nx;b.vy-=(1+e)*v*ny;}return{impact:-v,x,y,u,nx,ny};}
 resolveCircle(b,x,y,r,e=.9,kick=0){let nx=b.x-x,ny=b.y-y,d=Math.hypot(nx,ny),limit=r+b.r;if(d>=limit)return null;if(d<.0001){nx=0;ny=-1;d=1;}nx/=d;ny/=d;b.x=x+nx*(limit+.03);b.y=y+ny*(limit+.03);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+e)*v*nx;b.vy-=(1+e)*v*ny;if(kick){b.vx+=nx*kick;b.vy+=ny*kick;}}return{impact:-v,nx,ny,x,y};}
 bonus(m){let types=new Set();for(const n of this.mods){if(n.id!==m.id&&n.type!==m.type&&Math.hypot(n.x-m.x,n.y-m.y)<=135)types.add(n.type);}const b=.06*this.s('B1')+.02*this.s('B3')*Math.min(3,types.size);const shell=SHELLS[this.cfg.shell]||SHELLS.steel,trait=this.cfg.traits[m.type];return{c:(1+b+.08*this.s('C1')+.01*(this.cfg.research.coins||0))*shell.c*(trait==='coins'?1.2:trait==='points'?.85:1),p:(1+b)*shell.p*(trait==='points'?1.2:trait==='coins'?.85:1)};}
 pay(m,c,p,{physical=false,qualified=true,label='',x=m.x,y=m.y}={}){if(!Number.isFinite(c)||!Number.isFinite(p))return;this.coinsEarned+=c;this.pointsEarned+=p;this.runPoints+=p;this.emit('reward',{coins:c,points:p,physical,qualified,label,x,y,module:m.id,moduleType:m.type});}
 secondary(m,c,p,label){const b=this.bonus(m),u=Math.pow(1.35,m.level-1);this.pay(m,c*u*b.c,p*u*b.p*(1+.01*(this.cfg.research.devices||0)),{label});this.emit('payout',{module:m.id,moduleType:m.type,x:m.x,y:m.y});}
 hit(m,b,{gate=false}={}){
  if(this.time-(b.cool['hit'+m.id]??-100)+1e-9<.15||this.time-m.lastAward+1e-9<.08)return false;
  b.cool['hit'+m.id]=this.time;m.lastAward=this.time;m.glow=1;m.hits++;m.spin+=.8;this.runHits++;this.stageHits++;
  if(this.time-this.lastHit>2+.3*this.s('A3'))this.combo=1;
  if(this.lastModule!==m.id&&this.lastModule!==-1)this.combo=Math.min(2+.2*this.s('A5'),this.combo+.05);
  this.lastModule=m.id;this.lastHit=this.time;
  if(m.type==='bar'&&m.level>=10&&this.time-m.lastExtra>=5){this.combo=Math.min(2+.2*this.s('A5'),this.combo+.05);m.lastExtra=this.time;}
  this.typeHits[m.type]=this.time;
  if(this.s('B7')&&this.time>=this.resonanceReady&&Object.values(this.typeHits).filter(t=>this.time-t<=5).length>=4){this.resonanceUntil=this.time+5;this.resonanceReady=this.time+20;this.emit('resonance');}
  let mult=this.combo*(1+.01*(this.cfg.research.points||0));
  // Manual and perfect are the same bonus family: use the stronger one,
  // never multiply them. Both are consumed by real qualifying device hits.
  const precise=b.perfect>0&&this.time<b.perfectUntil;
  if(precise){mult*=1.25+.04*this.s('A1');b.perfect--;}
  else if(b.manual>0&&this.time<b.manualUntil)mult*=1.10;
  if(b.manual>0&&this.time<b.manualUntil)b.manual--;
  if(!gate&&b.gate>0&&this.time<b.gateUntil){mult*=1.5;b.gate--;}
  if(b.out>0&&this.time<b.outUntil){mult*=1.25;b.out--;}
  if(b.first){mult*=1.5;b.first=false;}
  if(m.type==='bar'&&m.level>=5&&m.hits%5===0)mult*=2;
  if(this.s('B5')&&m.hits%10===0)mult*=1.25+.25*this.s('B5');
  if(this.time<this.masterUntil)mult*=1.5;
  if(m.id===this.linkTarget&&this.time<this.linkUntil){mult*=1.5;this.linkUntil=-100;this.emit('link',{x:m.x,y:m.y});}
  const res=this.time<this.resonanceUntil?1.3:1,base=TYPES[m.type],u=Math.pow(1.35,m.level-1),bo=this.bonus(m);
  if(m.type==='spring'&&m.level>=10&&m.hits%5===0)mult*=2;
  if(m.type==='coin'&&m.level>=10)bo.c*=1.5;
  this.pay(m,base.c*u*bo.c*res,base.p*u*bo.p*mult*res,{physical:true});
  this.emit('hit',{module:m.id,moduleType:m.type,x:m.x,y:m.y,points:base.p*u*bo.p*mult*res});
  const link=this.cfg.link;
  if(this.s('B6')&&link?.from===m.id&&this.time>=this.linkReady){const to=this.mods.find(n=>n.id===link.to);if(to&&Math.hypot(to.x-m.x,to.y-m.y)<=135){this.linkTarget=to.id;this.linkUntil=this.time+2;this.linkReady=this.time+this.cd(6);}}
  if(this.s('C5')&&this.stageHits%50===0)this.pay(m,5*this.s('C5')*base.c*u,0,{qualified:false,label:'КОПИЛКА'});
  if(m.type==='spinner'){m.charge++;const need=m.level>=5?3:4;if(m.charge>=need){m.charge=0;this.secondary(m,3*(m.level>=10?1.5:1),40,'ВЫПЛАТА');}}
  if(m.type==='bank'){const need=m.level>=5?4:5;m.charge=Math.min(need,m.charge+1);if(m.charge>=need&&this.time>=m.nextAction){m.charge=0;m.nextAction=this.time+this.cd(1);this.secondary(m,12*(m.level>=10?1.5:1),100,'БАНК');}}
  if(m.type==='bumper'&&m.level>=10&&m.hits%6===0){const ns=this.mods.filter(n=>n.id!==m.id).sort((a,c)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(c.x-m.x,c.y-m.y));if(ns[0])this.secondary(ns[0],0,TYPES[ns[0].type].p*.5,'ИМПУЛЬС');}
  const gen=this.mods.find(n=>n.type==='multi');if(gen&&this.time>=gen.nextAction){gen.charge++;if(gen.charge>=(gen.level>=5?16:20)){gen.charge=0;gen.nextAction=this.time+this.cd(20);const free=3-this.balls.filter(n=>!n.dead).length;for(let i=0;i<Math.min(2,free);i++)this.balls.push(this.newBall(gen.x+(i?19:-19),gen.y-27,(i?1:-1)*(190+this.rng()*80),-370-this.rng()*80,{ttl:this.time+(gen.level>=10?12:8)}));this.emit('multi',{x:gen.x,y:gen.y});}}
  return true;
 }
 manualHit(b,precise=false){
  if(b.lastManualPulse===this.flipAt)return false;
  b.lastManualPulse=this.flipAt;b.manual=3;b.manualUntil=this.time+4;
  if(precise)this.perfectHit(b);
  this.emit('manualRebound',{x:b.x,y:b.y,ball:b.id,precise,bonus:precise?.25+.04*this.s('A1'):.10});
  return true;
 }
 perfectHit(b){if(b.lastPerfectPulse===this.flipAt)return;b.lastPerfectPulse=this.flipAt;b.perfect=3;b.perfectUntil=this.time+4;this.runPerfect++;this.lastPerfect=this.time;this.emit('perfect',{x:b.x,y:b.y,count:this.runPerfect});if(this.s('A7')&&this.runPerfect>=8&&!this.masterUsed){this.masterUsed=true;this.masterUntil=this.time+10;this.emit('master');}}
 integrate(dt){
  const flips=this.flippers();
  for(const b of [...this.balls]){
   if(b.dead)continue;if(this.time>b.ttl){b.dead=true;this.emit('expire',{x:b.x,y:b.y});continue;}
   b.px=b.x;b.py=b.y;
   if(b.parked){b.x=LAUNCHER.x;b.y=LAUNCHER.spawnY;b.px=b.x;b.py=b.y;b.vx=0;b.vy=0;b.sensor=false;b.trail=[];continue;}
   if(b.held){const m=this.mods.find(m=>m.id===b.held.id);if(m){b.x=m.x;b.y=m.y;if(this.time>=b.held.until){b.vx=Math.cos(m.a)*580;b.vy=Math.sin(m.a)*580;b.x+=Math.cos(m.a)*31;b.y+=Math.sin(m.a)*31;if(m.level>=10){b.out=2;b.outUntil=this.time+3;}b.held=null;}else continue;}else b.held=null;}
   b.vy+=620*dt;b.vx*=Math.exp(-.035*dt);b.vy*=Math.exp(-.025*dt);const speed=Math.hypot(b.vx,b.vy);if(speed>1100){b.vx*=1100/speed;b.vy*=1100/speed;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.inLane){
    if(b.y<=LAUNCHER.exitY)this.enterPlayfield(b);
    else if(this.time-b.laneStarted>LAUNCHER.timeout||b.y>LAUNCHER.spawnY+30){
     // Covers a moving loop in the chute as well as a stationary ball; emits no
     // reward, launch or reset, and preserves this ball's run/insurance state.
     this.enterPlayfield(b,true);
    }
   }else if(this.time>=b.laneReturnLockUntil&&b.x>LAUNCHER.dividerX+2&&b.y>LAUNCHER.dividerBottom-18){
    // A live ball that falls into the spring chute parks on the plunger.
    // It is not a loss and the current run/combo state is preserved.
    b.parked=true;b.inLane=false;b.x=LAUNCHER.x;b.y=LAUNCHER.spawnY;b.px=b.x;b.py=b.y;
    b.vx=0;b.vy=0;b.sensor=false;b.contacts.clear();b.trail=[];b.anchorX=b.x;b.anchorY=b.y;b.stuckTime=0;
    this.emit('springPark',{x:b.x,y:b.y,ball:b.id});
   }
   for(const wall of this.walls)this.resolveSegment(b,wall.a,wall.b,wall.r,wall.e);
   if(b.dead)continue;
   if(!b.inLane){
    for(const h of this.hazards)if(Math.hypot(b.x-h.x,b.y-h.y)<h.r+(h.type==='spike'?b.r:0)){
     b.dead=true;this.emit('hazard',{kind:h.type,x:h.x,y:h.y});break;
    }
    if(b.dead)continue;
    if(this.autoFlippers&&this.time-this.manualAt>=.3){const sensorY=603+Math.max(0,Math.min(b.x-109,300-b.x))*.376-20;if(b.y>sensorY&&b.y<646&&b.vy>35&&!b.sensor&&b.x>63&&b.x<351){b.sensor=true;const prob=Math.min(1,.91+.03*this.s('D2')+(this.cfg.shell==='ceramic'?.05:0));if(this.rng()<prob)this.pulse(false);}if(b.y<545||b.vy<-80)b.sensor=false;}
    for(const f of flips){const hit=this.resolveSegment(b,[f.x,f.y],[f.x2,f.y2],7,.55,f);if(hit&&hit.impact>12){const phase=this.time-this.flipAt;if(phase>=0&&phase<=.13&&b.y<630){b.vy=-Math.max(580+hit.u*140,Math.abs(b.vy));b.vx=f.side*(90+hit.u*220);if(this.flipManual)this.manualHit(b,phase<=.06+.01*this.s('A2'));this.emit('flipperHit',{x:b.x,y:b.y});}}}
    const contacts=new Set();
    for(const m of this.mods){

     if(['boost','spring','goo','coin'].includes(m.type)){
      const radius=m.type==='goo'?23:m.type==='spike'?21:m.type==='coin'?17:18;
      const distance=Math.hypot(b.x-m.x,b.y-m.y),inside=distance<radius+b.r;
      if(m.type==='goo'){
       if(inside){contacts.add(m.id);const drag=m.level>=5?.989:.976;b.vx*=drag;b.vy*=drag;
        if(!b.contacts.has(m.id))this.hit(m,b);
        if(m.level>=10){b.out=2;b.outUntil=this.time+3;}
       }
      }else if(m.type==='boost'){
       if(inside&&this.time>=(b.cool['special'+m.id]??0)){
        if(this.hit(m,b)){b.cool['special'+m.id]=this.time+this.cd(m.level>=5?.55:.75);
         b.vx=Math.cos(m.a)*720;b.vy=Math.sin(m.a)*720;
         if(m.level>=10){b.out=2;b.outUntil=this.time+3;}
         this.emit('feature',{kind:m.type,x:m.x,y:m.y});
        }
       }
      }else{
       const collision=this.resolveCircle(b,m.x,m.y,radius,.97,m.type==='spring'?(m.level>=5?231:210):50);
       if(collision){contacts.add(m.id);
        if(collision.impact>25&&!b.contacts.has(m.id)&&this.time>=(b.cool['special'+m.id]??0)){
         if(this.hit(m,b))b.cool['special'+m.id]=this.time+this.cd(m.type==='coin'?(m.level>=5?.8:1.1):.2);
        }
       }
      }
      continue;
     }
     if(m.type==='gate'){
      const nx=Math.cos(m.a),ny=Math.sin(m.a),old=(b.px-m.x)*nx+(b.py-m.y)*ny,now=(b.x-m.x)*nx+(b.y-m.y)*ny,across=-(b.x-m.x)*ny+(b.y-m.y)*nx;
      if(old<0&&now>=0&&Math.abs(across)<30&&this.time>=(b.cool['gate'+m.id]??-100))if(this.hit(m,b,{gate:true})){b.cool['gate'+m.id]=this.time+this.cd(2);b.gate=m.level>=5?4:3;b.gateUntil=this.time+(m.level>=10?6:4);this.emit('gate',{x:m.x,y:m.y});}continue;
     }
     if(m.type==='portal'){
      if(Math.hypot(b.x-m.x,b.y-m.y)<25&&this.time>=(b.cool.portal??-100)){const out=this.slots[m.slot2];if(out&&this.hit(m,b)){const sp=Math.max(260,Math.hypot(b.vx,b.vy));b.x=out.x+Math.cos(m.a)*30;b.y=out.y+Math.sin(m.a)*30;b.px=b.x;b.py=b.y;b.vx=Math.cos(m.a)*sp;b.vy=Math.sin(m.a)*sp;b.cool.portal=this.time+this.cd(m.level>=10?.75:1);if(m.level>=5){b.out=2;b.outUntil=this.time+3;}this.emit('portal',{x:out.x,y:out.y,fromX:m.x,fromY:m.y});}}continue;
     }
     if(m.type==='magnet'&&Math.hypot(b.x-m.x,b.y-m.y)<28&&this.time>=m.nextAction){if(this.hit(m,b)){m.nextAction=this.time+this.cd(m.level>=5?5:6);b.held={id:m.id,until:this.time+.15};b.vx=0;b.vy=0;b.x=m.x;b.y=m.y;this.emit('magnet',{x:m.x,y:m.y});break;}}
     let collision=null;
     if(m.type==='bar'||m.type==='spinner'){
      const len=m.type==='bar'?31:26,rr=m.type==='bar'?5:3,dx=Math.cos(m.a)*len,dy=Math.sin(m.a)*len;collision=this.resolveSegment(b,[m.x-dx,m.y-dy],[m.x+dx,m.y+dy],rr,.96);
      if(m.type==='spinner'){const other=this.resolveSegment(b,[m.x+dy,m.y-dx],[m.x-dy,m.y+dx],rr,.94);if(other&&(!collision||other.impact>collision.impact))collision=other;}
     }else{let r=m.type==='bumper'?22:m.type==='multi'?21:19;collision=this.resolveCircle(b,m.x,m.y,r,m.type==='bumper'?.98:.9,m.type==='bumper'?(m.level>=5?150:125):0);}
     if(collision){contacts.add(m.id);if(collision.impact>30&&!b.contacts.has(m.id)&&m.type!=='magnet')this.hit(m,b);}
    }
    b.contacts=contacts;
   }
   const finalSpeed=Math.hypot(b.vx,b.vy);if(finalSpeed>1100){b.vx*=1100/finalSpeed;b.vy*=1100/finalSpeed;}
   if(b.x<-20||b.x>W+20){b.x=clamp(b.x,33,410);b.vx=-b.vx*.7;}
   if(b.y>H+15)b.dead=true;
   if(Math.hypot(b.x-b.anchorX,b.y-b.anchorY)>12){b.anchorX=b.x;b.anchorY=b.y;b.stuckTime=0;}else b.stuckTime+=dt;
   if(b.stuckTime>3&&!b.held){b.stuckTime=0;b.unstuck++;if(b.unstuck%2){b.vx=(this.rng()-.5)*220;b.vy=-210;}else{const launch=this.launchBall(this.lastQ);b.x=launch.x;b.y=launch.y;b.px=b.x;b.py=b.y;b.vx=launch.vx;b.vy=launch.vy;b.inLane=true;b.launchQ=launch.launchQ;b.laneStarted=this.time;b.anchorX=b.x;b.anchorY=b.y;b.contacts.clear();}this.emit('unstuck',{x:b.x,y:b.y});}
  }
  const had=this.balls.length;this.balls=this.balls.filter(b=>!b.dead);
  if(had&&!this.balls.length){let save=false;if(!this.insured){if(this.s('A6')&&this.runManual&&this.time-this.lastPerfect<=3)save=true;else if(this.s('D7')&&!this.manualTouched&&this.time-this.runStart<8)save=true;}if(save){this.insured=true;this.combo=1;this.lastModule=-1;this.lastHit=-100;this.balls.push(this.launchBall(this.lastQ));this.emit('insured');}else{this.emptySince=this.time;this.charging=false;this.emit('lost',{points:this.runPoints,hits:this.runHits,perfect:this.runPerfect,duration:this.time-this.runStart});this.resetCounters();}}
 }
 step(dt=STEP){this.time+=dt;if(this.time-this.lastHit>2+.3*this.s('A3')){this.combo=1;this.lastModule=-1;}
  if(!this.balls.length&&!this.charging&&this.auto&&(this.cfg.completed>=3||this.s('D1'))&&this.time-this.manualAt>=4&&this.time-this.emptySince>=2.5-.3*this.s('D1')){const profiles=(this.cfg.profiles.length?this.cfg.profiles:[this.lastQ]).slice(0,this.s('D4')?this.s('D4')+1:1);const q=profiles[this.profileIndex++%profiles.length];this.launch(q,false);}
  this.integrate(dt/2);this.integrate(dt/2);for(const m of this.mods){m.glow=Math.max(0,m.glow-dt*3);m.spin*=Math.exp(-dt*2.2);}if(!this.simulation)for(const b of this.balls){b.trail.push({x:b.x,y:b.y});if(b.trail.length>13)b.trail.shift();}
 }
 endRun(){if(this.balls.length)this.emit('lost',{points:this.runPoints,hits:this.runHits,perfect:this.runPerfect,duration:this.time-this.runStart,forced:true});this.balls=[];this.charging=false;this.emptySince=this.time;this.resetCounters();}
}
function calculateRate(s){if(s.completed<3)return 0;const cfg=engineConfig(s);cfg.auto=true;cfg.stageHits=0;const results=[];for(const seed of [4161,8087,12097]){const w=new PinballWorld(cfg,{seed,simulation:true});for(let i=0;i<60/STEP;i++)w.step();results.push(w.coinsEarned/60);}results.sort((a,b)=>a-b);return results[1];}


/* Vector-only rendering: the downloadable game has no image, font or CDN dependency. */
const ICON_PATHS={
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
 touch:'<path d="M10 12V5a2 2 0 0 1 4 0v6l2-1 4 3v4c0 3-2 5-5 5h-3c-2 0-3-1-4-3l-4-6a2 2 0 0 1 3-2l3 3"/><path d="M6 6a6 6 0 0 1 12 0" opacity=".4"/>',
 menu:'<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
 blocks:'<rect x="3" y="12" width="8" height="8" rx="2"/><rect x="13" y="12" width="8" height="8" rx="2"/><rect x="8" y="2" width="8" height="8" rx="2"/><path d="M6 16h2m8 0h2m-7-10h2"/>',
 chart:'<path d="M4 20h17M6 15v2m6-7v7m6-12v12"/><circle cx="6" cy="12" r="1"/>',
 back:'<path d="m15 5-7 7 7 7"/>',

 sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 1.9-2.5 3.7m0 3h.01"/>',
 settings:'<path d="M9.4 2.8h5.2l.7 2.4c.5.2 1 .5 1.4.8L19 5.3l2.6 4.5-1.8 1.7c0 .3.1.7.1 1s0 .7-.1 1l1.8 1.7-2.6 4.5-2.3-.7c-.4.3-.9.6-1.4.8l-.7 2.4H9.4l-.7-2.4c-.5-.2-1-.5-1.4-.8l-2.3.7-2.6-4.5 1.8-1.7a7 7 0 0 1 0-2L2.4 9.8 5 5.3l2.3.7c.4-.3.9-.6 1.4-.8z"/><circle cx="12" cy="12.5" r="3.2"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
 play:'<path d="m8 5 11 7-11 7z"/>',
 spring:'<path d="M5 21h14M12 3v3m-4 3 8 3-8 3 8 3H8"/><circle cx="12" cy="3" r="2"/>',
 flip:'<path d="m3 17 7-5m11 5-7-5M3 17l8-1m10 1-8-1"/><circle cx="12" cy="5" r="2"/>',
 build:'<path d="m4 16 12-12 4 4L8 20H4zM13 7l4 4M6 5h3M5 4v3m13 12h3m-1-1v3"/>',
 tree:'<path d="M12 4v6M6 14l6-4 6 4M6 14v6m12-6v6"/><circle cx="12" cy="4" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="18" cy="14" r="2"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
 auto:'<path d="M7 5h10v4H7zM5 11h14v10H5zM12 2v3M8 15h.01M16 15h.01M9 18h6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 rotate:'<path d="M20 11a8 8 0 1 0-1 6M20 4v7h-7"/>',
 store:'<path d="m3 7 9-4 9 4-9 4zM3 7v11l9 4 9-4V7M12 11v11"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 gem:'<path d="M8 3h8l5 6-9 12L3 9Z"/><path d="M3 9h18M8 3l-1 6 5 12 5-12-1-6M7 9h10"/>'
};

Object.assign(ICON_PATHS,{
 coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M12 8.2v7.6M9.6 10.1h3.6a1.8 1.8 0 0 1 0 3.6H10.8a1.8 1.8 0 0 0 0 3.6h3.6"/>',
 ad:'<rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>',
 zoomin:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6M10 7v6"/>',
 zoomout:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6"/>',
 center:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',
 spike:'<path d="m12 2 2 6 6-2-2 6 4 4-7 1-3 5-3-5-7-1 4-4-2-6 6 2Z"/>',
 hole:'<ellipse cx="12" cy="12" rx="9" ry="7"/><ellipse cx="12" cy="12" rx="4" ry="3"/>',
 goo:'<path d="M7 4c5-4 4 4 8 3 7-1 8 10 2 12-5 0-4 4-9 2C0 19 1 9 7 4Z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="15" r="1"/>',
 boost:'<path d="m5 4 8 8-8 8m8-16 8 8-8 8"/>'
});
function icon(name){return `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.plus}</svg>`;}

function modIcon(type){
 const color=TYPES[type]?.color||'#ff9650';
 const art={
  bar:'<rect x="8" y="29" width="64" height="20" rx="10" transform="rotate(-22 40 40)"/>',
  bumper:'<circle cx="40" cy="40" r="29"/><circle cx="40" cy="40" r="21" fill="white"/><circle cx="40" cy="40" r="14"/>',
  spinner:'<rect x="30" y="8" width="20" height="64" rx="10"/><rect x="8" y="30" width="64" height="20" rx="10"/><circle cx="40" cy="40" r="10" fill="white"/>',
  gate:'<path d="M15 63V19h50v44" fill="none" stroke="currentColor" stroke-width="10"/><path d="M40 30v30m-10-10 10 10 10-10" fill="none" stroke="currentColor" stroke-width="5"/>',
  bank:'<rect x="12" y="10" width="56" height="60" rx="15"/><rect x="20" y="18" width="40" height="43" rx="9" fill="#fff2be"/><path d="M30 26h20" stroke="#da930d" stroke-width="4"/><circle cx="40" cy="43" r="10"/>',
  portal:'<ellipse cx="40" cy="40" rx="25" ry="33"/><ellipse cx="40" cy="40" rx="16" ry="24" fill="#e9e0ff"/><ellipse cx="40" cy="40" rx="7" ry="13"/>',
  magnet:'<path d="M20 13v28a20 20 0 0 0 40 0V13" fill="none" stroke="currentColor" stroke-width="18"/><path d="M20 13v9m40-9v9" stroke="#ffe4eb" stroke-width="18"/>',
  multi:'<circle cx="40" cy="40" r="30"/><g fill="white"><circle cx="40" cy="25" r="10"/><circle cx="26" cy="49" r="10"/><circle cx="54" cy="49" r="10"/></g>',
  boost:'<rect x="5" y="20" width="70" height="40" rx="13"/><path d="m24 29 11 11-11 11m20-22 11 11-11 11" fill="none" stroke="white" stroke-width="5"/>',
  spring:'<circle cx="40" cy="40" r="29"/><circle cx="40" cy="40" r="21" fill="#fff5c9"/><path d="m46 17-22 27h13l-5 20 23-29H42z"/>',
  goo:'<path d="M25 10c10-8 17 3 20 3 30-5 35 25 20 35 6 27-26 34-33 17-25 5-35-24-20-34C7 18 13 9 25 10z"/><circle cx="30" cy="29" r="7" fill="#d9ffa3"/><circle cx="48" cy="50" r="5" fill="#d9ffa3"/>',
  coin:'<circle cx="40" cy="40" r="29"/><circle cx="40" cy="40" r="23" fill="none" stroke="#fff1a4" stroke-width="3"/><path d="m40 21 6 12 13 2-10 10 3 14-12-7-12 7 3-14-10-10 13-2z" fill="white"/>'
 };
 return `<span class="mod-icon"><svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="color:${color};fill:${color};stroke:none">${art[type]||art.bar}</svg></span>`;
}

/* Bright, minimal vector art. All animation is cosmetic; hitboxes never scale. */
class PinballRenderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  this.particles=[];this.floats=[];this.lastTime=0;this.shake=0;this.cssW=0;this.cssH=0;this.dpr=1;this.playCssH=0;this.sx=1;this.sy=1;this.artScale=1;
  this.upgrades=new Map();this.settles=new Map();this.holding=null;
 }
 resize(){
  const r=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),playCssH=Math.max(1,r.height);
  if(this.cssW!==r.width||this.cssH!==r.height||this.dpr!==dpr||Math.abs(this.playCssH-playCssH)>.5){
   this.cssW=r.width;this.cssH=r.height;this.dpr=dpr;this.playCssH=playCssH;
   this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));
  }
  this.sx=this.cssW/W;this.sy=this.playCssH/H;this.artScale=Math.min(this.sx,this.sy);this.canvas.dataset.playHeight=String(Math.round(this.playCssH));
 }
 screenToWorld(x,y){return{x:x/Math.max(.001,this.sx),y:y/Math.max(.001,this.sy)};}
 worldToScreen(x,y){return{x:x*this.sx,y:y*this.sy};}
 camera(){return{cssW:this.cssW,cssH:this.cssH,playCssH:this.playCssH,sx:this.sx,sy:this.sy,artScale:this.artScale};}
 // Positions follow the tall board. Artwork uses ONE scale on both axes.
 // This keeps icons, type, balls and feedback circular without changing physics.
 beginGlyph(x,y){
  const c=this.ctx,u=this.artScale*this.dpr;
  c.save();c.setTransform(u,0,0,u,x*this.sx*this.dpr,y*this.sy*this.dpr);
 }
 endGlyph(){this.ctx.restore();}
 beginScreen(){const c=this.ctx;c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);}
 glyphText(t,x,y,size,col,align='center',weight=800){this.beginGlyph(x,y);this.text(t,0,0,size,col,align,weight);this.endGlyph();}
 beginHold(id){this.holding={id:String(id),started:performance.now()};}
 endHold(){
  if(this.holding){const id=this.holding.id,p=clamp((performance.now()-this.holding.started)/430,0,1);
   this.settles.set(id,{at:performance.now(),amount:.18*p});this.holding=null;}
 }
 upgrade(id){
  this.upgrades.set(String(id),performance.now());this.settles.delete(String(id));
  const m=world.mods.find(m=>String(m.id)===String(id));
  if(m&&motionAllowed())for(let i=0;i<10;i++){
   const a=i*TAU/10;this.particles.push({x:m.x+Math.cos(a)*20,y:m.y+Math.sin(a)*20,vx:Math.cos(a)*75,vy:Math.sin(a)*75-20,life:.48,max:.48,color:i%2?TYPES[m.type].color:'#ffd42a',r:2.8});
  }
 }
 visualState(id){
  id=String(id);const now=performance.now(),hold=this.holding?.id===id?clamp((now-this.holding.started)/430,0,1):0;
  let scale=1+.18*hold,bouncing=false;
  const up=this.upgrades.get(id);
  if(up!==undefined){const t=(now-up)/1000;
   if(t<.64){scale+=.31*Math.sin(Math.min(1,t/.60)*Math.PI*3)*Math.exp(-t*4.7);bouncing=true;}else this.upgrades.delete(id);
  }
  const settle=this.settles.get(id);if(settle){const t=(now-settle.at)/200;if(t<1)scale+=settle.amount*(1-t)*(1-t);else this.settles.delete(id);}
  return {scale:motionAllowed()?scale:1,hold,bouncing};
 }
 event(e,s){
  if(e.type==='hit'&&motionAllowed()){const color=TYPES[e.moduleType]?.color||'#19c6af';
   for(let i=0;i<6;i++){const a=Math.random()*TAU,sp=28+Math.random()*62;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35,max:.35,color,r:2+Math.random()});}
  }
  if(e.type==='reward'&&(e.points||e.coins)){
   const zone=Math.floor(e.x/90)+','+Math.floor(e.y/90),f=this.floats.find(f=>f.zone===zone&&f.life>.65);
   if(f){f.c+=e.coins;f.p+=e.points;}else this.floats.push({x:e.x,y:e.y-27,c:e.coins,p:e.points,life:.9,max:.9,zone,label:e.label});
  }
  if(['manualRebound','hazard','feature'].includes(e.type)&&motionAllowed()){
   const color=e.type==='hazard'?'#ff5475':e.type==='manualRebound'?'#ffcc24':'#16cbb3';
   for(let i=0;i<9;i++){const a=i*TAU/9;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*72,vy:Math.sin(a)*72-20,life:.46,max:.46,color,r:2.8});}
  }
  if(this.particles.length>110)this.particles.splice(0,this.particles.length-110);
  if(this.floats.length>11)this.floats.splice(0,this.floats.length-11);
 }
 line(x,y,x2,y2,col,width=1){const c=this.ctx;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke();}
 circle(x,y,r,col,fill=false,width=1){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,TAU);c.lineWidth=width;if(fill){c.fillStyle=col;c.fill();}else{c.strokeStyle=col;c.stroke();}}
 round(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.4;c.stroke();}}
 text(t,x,y,size,col,align='center',weight=800){const c=this.ctx;c.font=`${weight} ${size}px "Trebuchet MS",Arial,sans-serif`;c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
 arrow(x,y,a,col,len=19){const xx=x+Math.cos(a)*len,yy=y+Math.sin(a)*len;this.line(x,y,xx,yy,col,2.6);this.line(xx,yy,xx-Math.cos(a-.72)*7,yy-Math.sin(a-.72)*7,col,2.6);this.line(xx,yy,xx-Math.cos(a+.72)*7,yy-Math.sin(a+.72)*7,col,2.6);}
 star(x,y,r,col){const c=this.ctx;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;if(!i)c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=col;c.fill();}
 module(m,w,{selected=false,output=false,editor=false}={}){
  const c=this.ctx,{x,y}=m,col=TYPES[m.type].color,visual=this.visualState(m.id),impact=motionAllowed()?m.glow*.05:0;
  this.beginGlyph(x,y);c.scale(visual.scale+impact,visual.scale+impact);
  if(selected)this.circle(0,0,38,col+'28',true);
  if(visual.hold>0){this.circle(0,0,39,col+'28',false,3);c.beginPath();c.arc(0,0,39,-Math.PI/2,-Math.PI/2+TAU*visual.hold);c.strokeStyle=col;c.lineWidth=3.5;c.stroke();}
  if(m.type==='bar'){
   c.rotate(m.a);this.round(-32,-3,64,15,7.5,'#dd73351b');this.round(-32,-7,64,14,7,col);this.line(-24,-4,20,-4,'#ffffff72',2.5);
  }else if(m.type==='bumper'){
   this.circle(0,3,25,'#078f8320',true);this.circle(0,0,25,col,true);this.circle(0,-1,18,'#fff',true);this.circle(0,-1,12,col,true);this.star(0,-1,6,'#fff');
  }else if(m.type==='spinner'){
   c.rotate(m.a+m.spin*.13);this.round(-7,-24,14,53,7,'#b87f1320');this.round(-25,-4,50,14,7,'#b87f1320');
   this.round(-7,-27,14,53,7,col);this.round(-25,-7,50,14,7,col);this.circle(0,0,9,'#fff',true);this.circle(0,0,4,'#ff9c21',true);
  }else if(m.type==='gate'){
   c.rotate(m.a-Math.PI/2);this.line(-25,11,-25,-15,col,8);this.line(25,11,25,-15,col,8);this.line(-25,-15,25,-15,col,8);this.arrow(0,-3,Math.PI/2,col,20);
  }else if(m.type==='bank'){
   this.round(-23,-18,46,44,12,'#b87f131c');this.round(-23,-22,46,44,12,col);this.round(-17,-16,34,29,8,'#fff3c3');
   this.line(-7,-11,7,-11,'#d8940e',3);this.star(0,1,8,col);
   const n=m.level>=5?4:5;for(let i=0;i<n;i++)this.circle(-13+i*(26/(n-1)),17,2,i<m.charge?'#fff':'#dd8e12',true);
  }else if(m.type==='portal'){
   c.rotate(m.a+Math.PI/2);c.beginPath();c.ellipse(0,0,19,28,0,0,TAU);c.fillStyle=col;c.fill();
   c.beginPath();c.ellipse(0,0,12,21,0,0,TAU);c.fillStyle='#ece5ff';c.fill();c.beginPath();c.ellipse(0,0,6,12,0,0,TAU);c.fillStyle='#a58aff';c.fill();
   this.circle(Math.cos(w.time*1.6)*15,Math.sin(w.time*1.6)*24,3.3,'#fff',true);if(output)this.arrow(0,12,Math.PI/2,'#fff',12);
  }else if(m.type==='magnet'){
   c.rotate(m.a+Math.PI/2);c.beginPath();c.moveTo(-16,-16);c.lineTo(-16,1);c.arc(0,1,16,Math.PI,0,true);c.lineTo(16,-16);c.strokeStyle=col;c.lineWidth=13;c.stroke();
   this.line(-16,-16,-16,-9,'#ffe4eb',13);this.line(16,-16,16,-9,'#ffe4eb',13);this.arrow(0,-1,-Math.PI/2,col,17);
  }else if(m.type==='multi'){
   this.circle(0,3,25,'#09698f20',true);this.circle(0,0,25,col,true);
   for(let i=0;i<3;i++){const a=-Math.PI/2+i*TAU/3;this.circle(Math.cos(a)*11,Math.sin(a)*11,7,'#fff',true);}
   const pct=w.time<m.nextAction?1-(m.nextAction-w.time)/w.cd(20):m.charge/(m.level>=5?16:20);
   c.beginPath();c.arc(0,0,29,-Math.PI/2,-Math.PI/2+TAU*clamp(pct,0,1));c.strokeStyle='#149cd2';c.lineWidth=2.5;c.stroke();
  }else if(m.type==='boost'){
   c.rotate(m.a);this.round(-26,-14,52,28,10,col);for(const xx of [-10,4]){this.line(xx-3,-6,xx+3,0,'#fff',3.3);this.line(xx+3,0,xx-3,6,'#fff',3.3);}
  }else if(m.type==='spring'){
   this.circle(0,3,23,'#d794181e',true);this.circle(0,0,23,col,true);this.circle(0,0,17,'#fff4c7',true);
   c.beginPath();c.moveTo(3,-13);c.lineTo(-8,2);c.lineTo(-1,2);c.lineTo(-4,13);c.lineTo(9,-3);c.lineTo(2,-3);c.closePath();c.fillStyle=col;c.fill();
  }else if(m.type==='goo'){
   c.beginPath();for(let i=0;i<40;i++){const a=i*TAU/40,r=22+Math.sin(a*5)*2.5;const xx=Math.cos(a)*r,yy=Math.sin(a)*r;if(!i)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.closePath();c.fillStyle=col;c.fill();
   this.circle(-7,-7,6,'#d4f5a1',true);this.circle(8,6,4,'#d4f5a1',true);this.circle(6,-9,2,'#fff',true);
  }else if(m.type==='coin'){
   this.circle(0,2.5,21,'#d9970f30',true);this.circle(0,0,21,col,true);this.circle(0,0,16,'#fff1a4',false,2.5);this.star(0,0,10,'#fff',true);
  }
  c.restore();this.priceTag(m,w);
 }
 priceTag(m,w){
  const cost=priceLevel(state,m),can=state.coins>=cost,label=m.level>=250?'MAX':fmt(cost),c=this.ctx;
  this.beginGlyph(m.x,m.y+43);
  c.font='900 11px "Trebuchet MS",Arial';const width=Math.max(42,Math.min(70,c.measureText(label).width+27)),y=0;
  this.round(-width/2,y-9,width,19,8,'#fff',can?'#aae7d9':'#e3e9ed');
  this.circle(-width/2+10,y,4.6,'#ffcd2e',true);this.line(-width/2+10,y-2,-width/2+10,y+2,'#fff5bd',1.3);
  this.text(label,6,y,11,can?'#17987d':'#8191a1');
  if(!can&&m.level<250){const xx=width/2-2;this.circle(xx,y-8,5.5,'#69a1ff',true);c.beginPath();c.moveTo(xx-1.5,y-10.3);c.lineTo(xx+2,y-8);c.lineTo(xx-1.5,y-5.7);c.closePath();c.fillStyle='#fff';c.fill();}
  this.endGlyph();
 }
 hazard(h){
  const c=this.ctx;
  this.beginGlyph(h.x,h.y);
  if(h.type==='hole'){this.circle(0,0,11,'#ff526e',true);this.circle(0,0,8,'#493057',true);this.circle(-2,-2,3,'#735585',true);this.endGlyph();return;}
  if(h.x>200)c.rotate(Math.PI);
  this.round(-8,-20,5,40,2,'#ff879d');
  for(let i=-1;i<=1;i++){const y=i*12;c.beginPath();c.moveTo(-4,y-5);c.lineTo(9,y);c.lineTo(-4,y+5);c.closePath();c.fillStyle='#ff4568';c.fill();}
  c.restore();
 }
 draw(w,s,ui){
  this.resize();if(this.cssW<1||this.cssH<1)return;
  const c=this.ctx,dt=clamp(w.time-this.lastTime,0,.05);this.lastTime=w.time;const th=fieldTheme(s.stage);
  c.setTransform(this.canvas.width/W,0,0,this.playCssH*this.dpr/H,0,0);c.globalAlpha=1;c.lineCap='round';c.lineJoin='round';
  const stageGrad=c.createLinearGradient(0,0,0,H);stageGrad.addColorStop(0,'#fff8f0');stageGrad.addColorStop(.52,'#fffefc');stageGrad.addColorStop(1,'#eef9ff');
  c.fillStyle=stageGrad;c.fillRect(0,0,W,H);
  const path=FIELD_OUTLINES[fieldVariant(s.stage)];
  c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
  const fieldGrad=c.createLinearGradient(0,34,0,H);fieldGrad.addColorStop(0,th.bg1);fieldGrad.addColorStop(.48,'#ffffff');fieldGrad.addColorStop(1,th.bg2);c.fillStyle=fieldGrad;c.fill();
  c.save();c.clip();
  for(let i=0;i<10;i++){const x=60+i*38+(i%2?12:0),y=120+i*48;c.beginPath();c.arc(x,y,18+(i%3)*3,0,TAU);c.fillStyle=i%2?'#ffffff66':'#dff8f340';c.fill();}
  c.restore();
  c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.strokeStyle='#ffffff';c.lineWidth=10;c.stroke();
  c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.strokeStyle=th.wall;c.lineWidth=6;c.stroke();
  c.beginPath();path.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.strokeStyle=th.wallHi;c.lineWidth=2.6;c.stroke();
  for(const radius of [3,5]){
   c.beginPath();for(const wall of w.walls)if(wall.r===radius){c.moveTo(wall.a[0],wall.a[1]);c.lineTo(wall.b[0],wall.b[1]);}
   c.lineWidth=radius*2+8;c.strokeStyle=th.accent+'18';c.stroke();
   c.beginPath();for(const wall of w.walls)if(wall.r===radius){c.moveTo(wall.a[0],wall.a[1]);c.lineTo(wall.b[0],wall.b[1]);}
   c.lineWidth=radius*2+4;c.strokeStyle=th.wall;c.stroke();
   c.beginPath();for(const wall of w.walls)if(wall.r===radius){c.moveTo(wall.a[0],wall.a[1]-1);c.lineTo(wall.b[0],wall.b[1]-1);}
   c.lineWidth=Math.max(2,radius*2-1);c.strokeStyle=th.wallHi;c.stroke();
  }
  this.line(398,575,398,292,th.wall+'4a',2);
  this.arrow(398,246,-2.38,th.wall,16);
  const editor=ui.view==='workshop',slots=w.slots,n=slotCount(s),used=occupied(s),chosen=s.inventory.find(m=>m.id===ui.selected);
  if(editor&&chosen&&(active(s).B3||active(s).B6)){const p=slots[chosen.slot];if(p)for(const m of w.mods)if(m.id!==chosen.id&&Math.hypot(m.x-p.x,m.y-p.y)<=135){c.setLineDash([4,5]);this.line(p.x,p.y,m.x,m.y,th.accent+'88',1.5);c.setLineDash([]);}}
  if(s.link&&active(s).B6){const a=w.mods.find(m=>m.id===s.link.from),b=w.mods.find(m=>m.id===s.link.to);if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=135){this.line(a.x,a.y,b.x,b.y,w.time<w.linkUntil?'#8b5cff':'#b4dfd7',2);this.arrow((a.x+b.x)/2,(a.y+b.y)/2,Math.atan2(b.y-a.y,b.x-a.x),'#a497e4',9);}}
  for(let i=0;i<n;i++){const p=slots[i];this.beginGlyph(p.x,p.y);
   if(!used.has(i)){
    this.circle(0,4,20,'#90c8c618',true);this.circle(0,0,18,'#ffffffec',true);
    this.circle(0,0,18,th.wallHi,false,2);c.setLineDash([3,5]);this.circle(0,0,18,th.wall+'55',false,1.4);c.setLineDash([]);
    this.line(-4,0,4,0,th.accent+'88',1.7);this.line(0,-4,0,4,th.accent+'88',1.7);
   }
   if(editor){this.text(String(i+1),0,40,10,th.accent);if(ui.slot===i)this.circle(0,0,34,th.accent,false,2);}
   this.endGlyph();
  }
  for(const h of w.hazards)this.hazard(h);
  for(const m of w.mods){this.module(m,w,{selected:editor&&m.id===ui.selected,editor});if(m.type==='portal'&&m.slot2>=0){const out=slots[m.slot2];if(out)this.module({...m,...out},w,{selected:editor&&m.id===ui.selected,output:true,editor});}}
  // Preserve real endpoints, but keep round caps and hinges perfectly round.
  this.beginScreen();
  for(const f of w.flippers()){
   const a=this.worldToScreen(f.x,f.y),b=this.worldToScreen(f.x2,f.y2),u=this.artScale;
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len;
   this.line(a.x,a.y+4*u,b.x,b.y+4*u,'#ff9b801f',22*u);
   this.line(a.x,a.y,b.x,b.y,'#ff8f6d',19*u);
   this.line(a.x+nx*8*u,a.y+ny*8*u-3*u,b.x-nx*4*u,b.y-ny*4*u-3*u,'#ffd0bf',4*u);
   this.circle(a.x,a.y,10*u,'#ff8f6d',true);this.circle(a.x,a.y,5*u,'#fff',true);
  }
  c.restore();
  const charge=w.charging?(w.chargeUI??clamp((w.time-w.chargeAt)/.9,0,1)):0,springTop=649+charge*18;
  this.beginGlyph(LAUNCHER.x,springTop);this.line(-8,0,8,0,'#ffb426',5);this.endGlyph();
  c.beginPath();c.moveTo(LAUNCHER.x,springTop+4);for(let i=1;i<=10;i++)c.lineTo(LAUNCHER.x+(i%2?5:-5),springTop+4+(679-springTop-4)*i/10);c.strokeStyle=th.accent+'99';c.lineWidth=2;c.stroke();this.line(LAUNCHER.x-7,684,LAUNCHER.x+7,684,th.wall,4);
  if(!w.balls.length&&!editor){this.ball({x:LAUNCHER.x,y:springTop-16,r:7.2,trail:[],ttl:Infinity,perfect:0,gate:0,out:0,manual:0},s,w);}
  if(w.s('A4')>=1)this.line(388,649+w.lastQ*18,394,649+w.lastQ*18,'#ff9e29',2);
  if(w.charging&&w.s('A4')>=2){c.setLineDash([3,6]);this.line(398,236,300-charge*70,154,th.accent+'88',2);c.setLineDash([]);}
  for(const b of w.balls)this.ball(b,s,w);
  for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;c.globalAlpha=Math.max(0,p.life/p.max);this.beginGlyph(p.x,p.y);this.circle(0,0,p.r||2,p.color,true);this.endGlyph();}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(const f of this.floats){f.life-=dt;f.y-=28*dt;c.globalAlpha=clamp(f.life*3,0,1);const x=clamp(f.x,60,341);
   this.beginGlyph(x,f.y);
   if(f.p>0){c.font='900 13px "Trebuchet MS",Arial';const width=c.measureText('+'+fmt(f.p)).width;this.round(-width/2-6,-9,width+12,19,8,'#ffffffee');this.text('+'+fmt(f.p),0,0,13,'#15a589');}
   if(f.c>0){const yy=f.p>0?17:0;this.text('+'+dec(f.c),-5,yy,10,'#c69009');this.beginGlyph(18,yy);this.circle(0,0,4.2,'#d99400',false,1.25);this.circle(0,0,2.5,'#d99400',false,.9);this.endGlyph();}
   if(f.label)this.text(f.label,0,-20,8,'#8e72c9');
   this.endGlyph();
  }
  c.globalAlpha=1;this.floats=this.floats.filter(f=>f.life>0);
 }
 ball(b,s,w,alpha=1){
  const c=this.ctx;c.save();c.globalAlpha=alpha;
  const shell={steel:'#218cff',brass:'#ffd34d',ruby:'#ff6396',ceramic:'#9e86ff'}[s.activeShell||'steel'];
  const comboMax=2+.2*w.s('A5'),onFire=w.combo>=comboMax-.001&&w.combo>1.001;
  if(motionAllowed()&&b.trail?.length>1){
   if(onFire){
    c.save();c.shadowColor='#ff5a21';c.shadowBlur=9;
    for(let i=1;i<b.trail.length;i++){const a=b.trail[i-1],p=b.trail[i],t=i/b.trail.length;
     this.line(a.x,a.y,p.x,p.y,`rgba(255,55,28,${.12+.42*t})`,2+8*t);
     this.line(a.x,a.y,p.x,p.y,`rgba(255,166,24,${.12+.58*t})`,1+5*t);
     if(i%3===0){this.beginGlyph(a.x,a.y);this.circle(0,0,1.5+3*t,`rgba(255,218,72,${.18+.55*t})`,true);this.endGlyph();}
    }c.restore();
   }else for(let i=1;i<b.trail.length;i++){const a=b.trail[i-1],p=b.trail[i];this.line(a.x,a.y,p.x,p.y,`rgba(202,241,255,${i/b.trail.length*.30})`,1+i/b.trail.length*5);}
  }
  this.beginGlyph(b.x,b.y);
  this.circle(1.5,3,b.r+1.1,'#21476b26',true);this.circle(0,0,b.r+1.7,onFire?'#ff8b2c':'#ffffff',true);
  this.circle(0,0,b.r,shell,true);this.circle(0,0,b.r-1,'#ffffff42',false,1.2);this.circle(-2.4,-2.7,2.2,'#ffffffee',true);
  if(onFire){this.circle(0,0,b.r+3,'#ffb02e88',false,1.6);this.circle(0,0,b.r+5,'#ff4b2570',false,1.2);}
  let r=12;if(b.perfect>0&&w.time<b.perfectUntil){this.circle(0,0,r,'#ffd43b',false,1.8);r+=3;}else if(b.manual>0&&w.time<b.manualUntil){this.circle(0,0,r,'#29e3bb',false,1.8);r+=3;}
  if(b.gate>0&&w.time<b.gateUntil){this.circle(0,0,r,'#b495ff',false,1.6);r+=3;}if(b.out>0&&w.time<b.outUntil)this.circle(0,0,r,'#4ae4c2',false,1.6);
  if(Number.isFinite(b.ttl)){c.setLineDash([2,3]);this.circle(0,0,10,'#c5efff');c.setLineDash([]);}this.endGlyph();c.restore();
 }
}



/* Mobile screen router and complete touch-friendly menus.
   No network requests, assets, frameworks or external fonts are required. */
const reducedMotionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
const runningUIAnimations=new Set(),animationByElement=new WeakMap(),valuePulseAt=new WeakMap();
function motionAllowed(){return state.prefs.motion&&!reducedMotionQuery.matches;}
function uiAnimate(el,frames,options={}){
 if(!el||!motionAllowed()||!el.animate)return null;
 animationByElement.get(el)?.cancel();
 const a=el.animate(frames,{duration:240,easing:'cubic-bezier(.18,.8,.22,1)',...options});
 animationByElement.set(el,a);runningUIAnimations.add(a);
 a.finished.catch(()=>{}).finally(()=>{runningUIAnimations.delete(a);if(animationByElement.get(el)===a)animationByElement.delete(el);});
 return a;
}
function syncMotionPreference(){
 document.documentElement.classList.toggle('reduced-motion',!motionAllowed());
 if(!motionAllowed())for(const a of runningUIAnimations)a.cancel();
}
reducedMotionQuery.addEventListener?.('change',syncMotionPreference);
function setHUDValue(id,value,pulse=false){
 const el=$(id),text=String(value);if(!el)return;if(el.textContent===text){el.dataset.initialized='true';return;}
 const hadValue=el.dataset.initialized;el.textContent=text;el.dataset.initialized='true';
 const now=performance.now();
 if(pulse&&hadValue&&now-(valuePulseAt.get(el)||0)>420){valuePulseAt.set(el,now);uiAnimate(el,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.35},{transform:'scale(1)'}],{duration:280});}
}
let launchShown=false,launchReleaseAt=0,launchLastQ=0,modalCloseTimer=0;
function updateLaunchUI(now=performance.now()){
 const el=$('launchMeter');if(!el)return;
 const charging=world.charging&&!ui.modal&&!document.hidden;
 if(charging){launchLastQ=clamp(world.chargeUI??0,0,1);launchReleaseAt=0;}
 const released=!charging&&launchReleaseAt>now,visible=charging||released;
 if(visible!==launchShown){launchShown=visible;el.classList.toggle('visible',visible);el.setAttribute('aria-hidden',String(!visible));}
 el.classList.toggle('released',released);el.classList.toggle('full',launchLastQ>=.999);
 const p=Math.round(launchLastQ*100),percent=$('launchPercent');
 if(percent.textContent!==p+'%')percent.textContent=p+'%';
 const title=released?'\u041f\u0423\u0421\u041a!':p>=100?'\u041c\u0410\u041a\u0421\u0418\u041c\u0423\u041c':'\u0421\u0418\u041b\u0410 \u0417\u0410\u041f\u0423\u0421\u041a\u0410';
 if($('launchTitle').textContent!==title)$('launchTitle').textContent=title;
 $('launchFill').style.transform=`scaleX(${launchLastQ})`;
 el.setAttribute('aria-valuenow',String(p));
 const marker=$('launchPrevious');marker.hidden=world.s('A4')<1;marker.style.left=(world.lastQ*100)+'%';
}
function mobileNav(){}
function switchHTML(action,on,label,disabled=false){
 return `<button class="switch-button ${on?'on':''}" data-action="${action}" role="switch" aria-checked="${!!on}" aria-label="${label}" ${disabled?'disabled':''}><i></i></button>`;
}
function goPlay(){
 closeModal(false);if(ui.view==='workshop'){finishEditor();return;}
 renderAll();scheduleRate();
}
function toggleAutoLaunch(){if(state.completed<3&&!state.skills.D1){toast('Автопружина откроется после поля 3');return;}state.auto=!state.auto;world.auto=state.auto;world.cfg.auto=state.auto;saveNow();scheduleRate();}
function openMainMenu(){openSettings();}
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
function tileColor(type){return{bar:'#ffe9dc',bumper:'#e7fff8',spinner:'#fff7dc',gate:'#f2ecff',bank:'#fff3d8',portal:'#efe7ff',magnet:'#ffe9ef',multi:'#e3f7ff',boost:'#e4f9ff',spring:'#fff2cf',goo:'#ecffd8',coin:'#fff7cb'}[type]||'#f6f3ed';}
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
   <button class="btn ${unlocked?'primary':''}" data-action="buy" data-type="${id}" ${!unlocked||unique||!room||!afford?'disabled':''}>${!unlocked?'После поля '+d.unlock:unique?'Уже на поле':!room?'Нет места':`<span class="price-chip">${icon('coin')}<b>${fmt(price)}</b></span>`}</button>
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
   ${tab==='storage'?`<button class="btn primary" data-action="install" data-id="${m.id}" ${!canInstall?'disabled':''}>${canInstall?'На поле':'Нет места'}</button>`:`<button class="btn primary" data-module-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<price||m.level>=250?'disabled':''}>↑ <span class="price-chip">${icon('coin')}<b>${fmt(price)}</b></span></button>`}
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
 <button class="btn primary wide" data-detail-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<cost||m.level>=250?'disabled':''}>${m.level>=250?'Максимальный уровень':`Улучшить на 35% · <span class="price-chip">${icon('coin')}<b>${fmt(cost)}</b></span>`}</button>
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
  case 'open-map':return true;
  case 'open-collection':openMap('gear');return true;
  case 'open-stats':openStats();return true;
  case 'menu-back':openSettings();return true;
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
  case 'assist-settings':toggleAuto();refreshSettings();return true;
  case 'autolaunch-modal':toggleAutoLaunch();openAutomation();return true;
  case 'autolaunch-settings':toggleAutoLaunch();refreshSettings();return true;
  default:return false;
 }
}


/* Application state, editor, progression and menus. Save only persistent state;
   a reloaded launch starts with a fresh ball, never with duplicate rewards. */
let mode='campaign',persistent=true,loadWarning='',offlineNotice=null;
function loadState(key){try{const raw=localStorage.getItem(key);return raw?validateState(JSON.parse(raw)):newState();}catch(e){loadWarning=e.name==='SecurityError'?'Автосохранение недоступно. Сохраняй прогресс файлом в настройках.':'Сохранение повреждено. Можно восстановить резервную копию в настройках.';return newState();}}
let state=loadState(SAVE_KEY),world,renderer;
const ui={view:'game',modal:'',selected:null,slot:-1,moving:null,moveOut:false,linkFrom:null,shopTab:'catalog',branch:'A',skill:'A1',metaTab:'map',focus:null,readyNotified:false,ratePending:false,closing:false,modalScroll:0};
let frameLast=0,accumulator=0,lastHud=-1,lastSave=0,lastPlanner=0,hiddenAt=0,activePointer=null,keyHeld=false,bannerTimer=0,rateTimer=0;
const writer=globalThis.crypto?.randomUUID?.()||String(Math.random());
const canvas=$('board');
function offlineParams(s=state){const sk=s.skills;return{eff:Math.min(.75,.2+.1*(sk.D3||0)+.01*(s.activeResearch.offline||0)),cap:7200*(1+(sk.D5||0))};}
function acceptOffline(){if(mode!=='campaign'||state.completed<3||!state.offline)return;const t=clamp((Date.now()-state.savedAt)/1000,0,state.offline.cap),gain=state.offline.rate*t*state.offline.eff;if(t>=30&&gain>=1){state.coins+=gain;offlineNotice={seconds:t,coins:gain,rate:state.offline.rate,eff:state.offline.eff,cap:state.offline.cap};}state.savedAt=Date.now();}
acceptOffline();
function saveNow(){try{const params=offlineParams(),signature=rateSignature(state);state.offline=state.completed>=3&&state.rateCache?.signature===signature?{...params,rate:state.rateCache.rate}:null;state.savedAt=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify({...state,_writer:writer}));persistent=true;}catch(e){persistent=false;}updateSaveStatus();}
function updateSaveStatus(){if($('saveStatus'))$('saveStatus').textContent=persistent?'Прогресс сохранён':'Сохраняй прогресс файлом';}
function rebuildWorld(){world=new PinballWorld(engineConfig(state),{onEvent:onGameEvent});accumulator=0;if(renderer){renderer.lastTime=0;renderer.floats=[];renderer.particles=[];renderer.upgrades.clear();renderer.settles.clear();renderer.holding=null;}clearTimeout(praiseTimer);$('manualPraise')?.classList.remove('visible');ui.readyNotified=state.score>=goal(state.stage);}
function onGameEvent(e){
 if(e.type==='reward'){state.coins+=e.coins;state.score+=e.points;state.stats.coins+=e.coins;if(e.qualified)state.stageEarned+=e.coins;}
 if(e.type==='hit'){state.stats.hits++;state.stageHits++;state.mastery[e.moduleType]=(state.mastery[e.moduleType]||0)+1;audio.hit(e.moduleType);}
 if(e.type==='hazard'){showBanner(e.kind==='spike'?'ШИПЫ · ШАР ПОТЕРЯН':'ЛОВУШКА · ШАР ПОТЕРЯН');audio.tone(120,.16,.03,'sawtooth',55);}
 if(e.type==='launch'){state.stats.runs++;if(e.manual){state.lastQ=e.q;state.launchHistory.push(e.q);state.launchHistory=state.launchHistory.slice(-12);if(!active(state).D4){state.profiles=[e.q];world.cfg.profiles=[e.q];}world.cfg.lastQ=e.q;}audio.tone(180,.08,.035,'triangle',520);}
 if(e.type==='flip')audio.tone(80,.055,.016,'triangle',55);
 if(e.type==='perfect'){state.stats.perfect++;if(state.prefs.vibration)navigator.vibrate?.(12);}
 if(e.type==='manualRebound'){
  state.stats.manual=(state.stats.manual||0)+1;
  showPraise(e.precise,e.bonus);
  audio.tone(e.precise?880:640,.10,.025,'sine',e.precise?1174:850);
 }
 if(e.type==='lost'){state.stats.bestRun=Math.max(state.stats.bestRun,e.points||0);saveNow();scheduleRate();}
 if(e.type==='multi'){showBanner('МУЛЬТИБОЛ');audio.tone(330,.3,.035,'triangle',990);}
 if(e.type==='resonance')showBanner('РЕЗОНАНС +30%');
 if(e.type==='master')showBanner('РЕЖИМ МАСТЕРА');
 if(e.type==='insured')showBanner('СТРАХОВКА');
 if(e.type==='payout')audio.tone(520,.13,.025,'sine',740);
 if(e.type==='unstuck')toast('Шарик освобожден без дополнительной награды');
 renderer?.event(e,state);
}
const audio={ctx:null,last:0,init(){if(!state.prefs.sound)return;try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();}catch(e){}},tone(hz,len=.08,vol=.02,type='sine',end=hz){if(!state.prefs.sound||!this.ctx||this.ctx.state!=='running')return;try{const a=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,a);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),a+len);g.gain.setValueAtTime(vol,a);g.gain.exponentialRampToValueAtTime(.0001,a+len);o.connect(g);g.connect(this.ctx.destination);o.start(a);o.stop(a+len+.01);}catch(e){}},hit(type){if(!this.ctx||this.ctx.currentTime-this.last<.055)return;this.last=this.ctx.currentTime;this.tone(({bar:390,bumper:520,spinner:650,bank:290,gate:740,portal:440,magnet:220,multi:330})[type]||420,.09,.025,'sine');}};
function toast(text,warn=false){const e=document.createElement('div');e.className='toast'+(warn?' warn':'');e.textContent=text;$('toasts').appendChild(e);while($('toasts').children.length>2)$('toasts').firstElementChild.remove();uiAnimate(e,[{opacity:0,transform:'translateY(-8px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220});setTimeout(()=>{if(!e.isConnected)return;const a=uiAnimate(e,[{opacity:1},{opacity:0,transform:'translateY(-6px)'}],{duration:180});if(a)a.finished.catch(()=>{}).finally(()=>e.remove());else e.remove();},3200);}
let praiseTimer=0,praiseIndex=0;
function showPraise(precise,bonus){
 const el=$('manualPraise');if(!el)return;
 const words=['\u041a\u043b\u0430\u0441\u0441!','\u041a\u0440\u0430\u0441\u0438\u0432\u043e!','\u041e\u0442\u043b\u0438\u0447\u043d\u043e!'];
 el.querySelector('strong').textContent=precise?'\u0422\u043e\u0447\u043d\u043e!':words[praiseIndex++%words.length];
 el.querySelector('span').textContent='+'+Math.round(bonus*100)+'% \u043e\u0447\u043a\u043e\u0432 \u00b7 3 \u043f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044f';
 el.classList.remove('visible');el.classList.toggle('perfect',precise);el.classList.toggle('static',!motionAllowed());
 void el.offsetWidth;el.classList.add('visible');clearTimeout(praiseTimer);
 praiseTimer=setTimeout(()=>el.classList.remove('visible'),1550);
}
function showBanner(text){$('eventBanner').textContent=text;$('eventBanner').classList.add('visible');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>$('eventBanner').classList.remove('visible'),1150);}
function isPaused(){return document.hidden;}
function scheduleRate(){clearTimeout(rateTimer);if(state.completed<3)return;if(state.rateCache?.signature===rateSignature(state))return;ui.ratePending=true;rateTimer=setTimeout(()=>{if(world.balls.length&&!isPaused()){scheduleRate();return;}const signature=rateSignature(state);try{const rate=calculateRate(state);state.rateCache={signature,rate};}catch(e){console.warn('Rate estimate failed',e);}ui.ratePending=false;saveNow();if(ui.view==='game')renderOverview();},350);}
function fitBoard(){
 const wrap=$('boardWrap'),space=document.querySelector('.board-space');if(!wrap||!space)return;
 const rect=space.getBoundingClientRect();
 wrap.style.height=Math.max(80,rect.height)+'px';wrap.style.width=Math.max(80,rect.width)+'px';wrap.style.maxHeight='none';
 renderer?.resize();
}
function renderAll(){
 syncMotionPreference();
 document.body.classList.toggle('editor',ui.view==='workshop');
 $('soundBtn').innerHTML=icon(state.prefs.sound?'sound':'mute');
 $('helpBtn').innerHTML=icon('help');$('settingsBtn').innerHTML=icon('settings');
 for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);
 if(ui.view==='workshop')renderEditor();
 updateHUD(true);updateSaveStatus();requestAnimationFrame(fitBoard);
}
function updateHUD(force=false){
 const t=performance.now();if(!force&&t-lastHud<75)return;lastHud=t;
 const g=goal(state.stage),ready=state.score>=g,assisted=state.autoFlippers!==false,pct=clamp(state.score/g*100,0,100);
 setHUDValue('scoreValue',fmt(state.score));$('scoreValue').title=exact(state.score);
 setHUDValue('goalValue',fmt(g));setHUDValue('coinsValue',fmt(state.coins),true);setHUDValue('gemsValue',fmt(state.gems),true);
 $('coinsValue').parentElement.title=exact(state.coins)+' монет';$('gemsValue').parentElement.title=exact(state.gems)+' кристаллов';
 $('progressFill').style.width=pct+'%';$('progressPercent').textContent=Math.floor(pct)+'%';
 setHUDValue('stageLabel',state.stage,true);setHUDValue('comboValue','×'+world.combo.toFixed(2),true);
 const comboMax=2+.2*world.s('A5');$('comboBadge').classList.toggle('hot',world.combo>=1.5);$('comboBadge').classList.toggle('maxed',world.combo>=comboMax-.001&&world.combo>1.001);
 $('runNumber').textContent=state.stats.runs;$('perfectStat').textContent=world.runPerfect;$('hitStat').textContent=world.runHits;
 const charging=world.charging,has=world.balls.length>0;
 const prompt=$('boardPrompt');prompt.classList.toggle('hidden',has||charging||ready||state.stats.runs>0);
 prompt.querySelector('strong').textContent=state.stats.runs===0?'Тапай прямо по полю':'Ещё один каскад?';
 prompt.querySelector('span:last-child').textContent=state.auto&&state.completed>=3?'Автозапуск включён':'Зажми и отпусти, чтобы запустить';
 $('advanceBtn').classList.toggle('visible',ready&&!ui.modal);
 $('advanceReward').textContent='+'+reward(state.stage,state.skills);
 const td=$('treeDot');if(td)td.style.display=Object.keys(SKILLS).some(id=>(state.skills[id]||0)<SKILLS[id].max&&state.gems>=SKILLS[id].costs[state.skills[id]||0])?'block':'none';
 if(ready&&!ui.readyNotified){ui.readyNotified=true;toast('Поле пройдено! Забери кристаллы и открой новое.');audio.tone(660,.4,.035,'sine',1320);saveNow();}
}
function renderOverview(){}
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
 if(m){const price=priceLevel(state,m);body+=`<div class="placement-actions"><button class="btn small" data-action="rotate" data-id="${m.id}" data-dir="-1">↶ 15°</button><button class="btn small" data-action="rotate" data-id="${m.id}" data-dir="1">↷ 15°</button><button class="btn small" data-action="move" data-id="${m.id}">Перенести</button><button class="btn primary small" data-placement-upgrade data-action="upgrade" data-id="${m.id}" ${state.coins<price?'disabled':''}>↑ <span class="price-chip">${icon('coin')}<b>${fmt(price)}</b></span></button></div>`;}
 else body+=`<div class="placement-actions"><button class="btn primary small" data-action="open-catalog">${icon('plus')} Добавить модуль${ui.slot>=0?' в ячейку '+(ui.slot+1):''}</button><button class="btn small" data-action="schemes">${icon('store')} Схемы</button></div>`;
 $('rightContent').innerHTML=body;
 if(ui.modal==='modules')openModules(ui.shopTab);else if(ui.modal==='module'){if(ui.selected)openModuleDetail(ui.selected);else openModules(ui.shopTab);}
}
function editorChanged(){normalizeSlots(state);syncWorldObjects();world.cfg.link=copy(state.link);saveNow();renderEditor();updateHUD(true);scheduleRate();}
function refreshModuleUpgradeUI(id){
 const m=world.mods.find(m=>String(m.id)===String(id))||objectRecord(id);
 if(!m)return;
 const detail=document.querySelector('[data-object-detail]');
 if(detail&&detail.dataset.objectDetail===String(id)){
  const u=Math.pow(1.35,m.level-1),d=TYPES[m.type],cost=priceLevel(state,m),max=m.level>=250;
  const set=(name,value)=>{const node=detail.querySelector('[data-object-'+name+']');if(node&&node.textContent!==value)node.textContent=value;};
  set('coins',dec(d.c*u));set('points',dec(d.p*u));set('next-coins',dec(d.c*u*1.35));set('next-points',dec(d.p*u*1.35));
  set('price',max?'Максимум':fmt(cost));set('action',max?'Максимальный уровень':state.coins>=cost?'Улучшить':'Улучшить · тестовая реклама');
  const btn=detail.querySelector('[data-action="object-upgrade"]');if(btn)btn.disabled=max;
  for(const tier of [5,10])detail.querySelector(`[data-milestone="${tier}"]`)?.classList.toggle('reached',m.level>=tier);
 }
 updateHUD(true);
}
function freeSlots(){const used=occupied(state);return Array.from({length:slotCount(state)},(_,i)=>i).filter(i=>!used.has(i));}
function placeModule(m){const free=freeSlots();if(free.length<(m.type==='portal'?2:1))return toast('Не хватает свободных сокетов',true);if(TYPES[m.type].unique&&state.inventory.some(n=>n.id!==m.id&&n.type===m.type&&n.slot>=0))return toast('На поле допустим только один такой модуль',true);m.slot=free.includes(ui.slot)?ui.slot:free[0];if(m.type==='portal')m.slot2=free.find(i=>i!==m.slot);ui.selected=m.id;ui.slot=m.slot;return true;}
function buyModule(type){if(ui.view!=='workshop'||!TYPES[type]||state.completed<TYPES[type].unlock)return;const cost=priceNew(state,type);if(state.coins<cost)return toast('Не хватает монет',true);const m={id:state.nextId,type,level:1,slot:-1,angle:type==='gate'?90:['portal','magnet'].includes(type)?-90:type==='bar'?-15:0,free:false};if(!placeModule(m))return;state.nextId++;state.coins-=cost;state.inventory.push(m);audio.tone(440,.16,.03,'sine',660);editorChanged();}
function upgradeModule(id,planner=false,adAllowed=false){
 const live=world.mods.find(m=>String(m.id)===String(id)),record=objectRecord(id,true),m=live||record;
 if(!record||!m||m.level>=250)return false;
 const cost=priceLevel(state,m);
 if(state.coins<cost){
  if(!adAllowed)return false;
  const missing=cost-state.coins;state.coins+=missing;toast('Тестовая реклама · улучшение получено');
 }
 state.coins=Math.max(0,state.coins-cost);record.level=(m.level||1)+1;
 syncWorldObjects();renderer?.upgrade(id);saveNow();scheduleRate();refreshModuleUpgradeUI(id);
 const hero=document.querySelector('.object-hero>.mod-icon');if(hero&&state.prefs.motion){hero.classList.remove('upgrade-bounce');void hero.offsetWidth;hero.classList.add('upgrade-bounce');}
 if(!planner)audio.tone(660,.11,.025,'triangle',880);
 return true;
}
function hitFieldModule(x,y){
 let best=null,distance=Infinity;
 for(const m of world.mods){
  const positions=[{x:m.x,y:m.y}];
  if(m.type==='portal'&&m.slot2>=0&&world.slots[m.slot2])positions.push(world.slots[m.slot2]);
  for(const p of positions){
   const dx=x-p.x,dy=y-p.y,inside=Math.hypot(dx,dy)<=35||(Math.abs(dx)<=35&&dy>=30&&dy<=57);
   if(inside&&Math.hypot(dx,dy)<distance){distance=Math.hypot(dx,dy);best=m;}
  }
 }
 return best;
}

function objectUpgradeButton(m){
 const cost=priceLevel(state,m),ad=state.coins<cost,max=m.level>=250;
 return `<button class="object-upgrade btn primary wide" data-action="object-upgrade" data-id="${m.id}" ${max?'disabled':''}>
 <span data-object-action>${max?'Максимальный уровень':ad?'Улучшить · тестовая реклама':'Улучшить'}</span>
 <span class="price-chip">${icon('coin')}<b data-object-price>${max?'MAX':fmt(cost)}</b></span></button>`;
}
function openObjectDetail(id){
 const m=world.mods.find(o=>String(o.id)===String(id));if(!m)return;
 ui.objectId=String(m.id);ui.selected=m.id;
 const d=TYPES[m.type],u=Math.pow(1.35,m.level-1);
 const body=`<div class="object-card" data-object-detail="${m.id}">
  <div class="object-hero" style="--object:${d.color}">${modIcon(m.type)}<div><span class="eyebrow">ЭЛЕМЕНТ ПОЛЯ</span><h3>${d.name}</h3></div></div>
  <p class="object-description">${d.desc}</p>
  <div class="object-yield"><div>${icon('coin')}<span><b data-object-coins>${dec(d.c*u)}</b><small>монет за контакт</small></span><span class="next-yield">→ <b data-object-next-coins>${dec(d.c*u*1.35)}</b></span></div>
  <div>${icon('star')}<span><b data-object-points>${dec(d.p*u)}</b><small>очков за контакт</small></span><span class="next-yield">→ <b data-object-next-points>${dec(d.p*u*1.35)}</b></span></div></div>
  ${objectUpgradeButton(m)}
  <div class="object-milestones"><div class="milestone ${m.level>=5?'reached':''}" data-milestone="5"><span>${icon('star')}</span><p>${d.l5}</p></div>
  <div class="milestone ${m.level>=10?'reached':''}" data-milestone="10"><span>${icon('star')}</span><p>${d.l10}</p></div></div>
  <div class="object-tools"><button class="btn" data-action="object-rotate" data-id="${m.id}" data-dir="-1">↶ 15°</button>
  <button class="btn" data-action="object-rotate" data-id="${m.id}" data-dir="1">↷ 15°</button></div>
  ${state.skills.B6?`<button class="btn wide" data-action="object-link" data-id="${m.id}">${icon('tree')} Настроить связь</button>`:''}
  <button class="btn secondary wide replace-open" data-action="object-replacements" data-id="${m.id}">${icon('rotate')} Заменить элемент</button>
 </div>`;
 modal('object','Элемент',body,'',false,'КОНСТРУКТОР');
}
function replacementReason(m,type){
 const d=TYPES[type];
 if(type===m.type)return 'Уже установлен';
 if(state.completed<d.unlock)return 'После поля '+d.unlock;
 if(d.unique&&world.mods.some(o=>o.id!==m.id&&o.type===type))return 'Уже есть на поле';
 if(type==='portal'&&String(m.id).startsWith('f'))return 'Нужны две обычные ячейки';
 if(type==='portal'&&m.type!=='portal'&&!freeSlots().length)return 'Нужна ещё одна ячейка';
 return '';
}
function openObjectReplacements(id){
 const m=world.mods.find(o=>String(o.id)===String(id));if(!m)return;
 ui.objectId=String(id);
 let body=`<div class="replacement-note">Выбери новый тип. <b>Улучшения сохранятся.</b> Замена оплачивается как новая копия; нехватку монет покрывает тестовая реклама.</div><div class="replacement-list">`;
 for(const [type,d] of Object.entries(TYPES)){
  const reason=replacementReason(m,type),cost=priceNew(state,type),ad=state.coins<cost;
  body+=`<button class="replacement-row" data-action="object-replace" data-id="${m.id}" data-type="${type}" ${reason?'disabled':''}>
    ${modIcon(type)}<span><strong>${d.short}</strong><small>${reason||d.desc.split('.')[0]}</small></span>
    <span class="replacement-price">${reason?'':`${icon(ad?'ad':'coin')} ${fmt(cost)}`}</span></button>`;
 }
 body+='</div>';
 modal('replace','Заменить элемент',body,'',false,TYPES[m.type].short);
}
function replaceObject(id,type){
 const m=world.mods.find(o=>String(o.id)===String(id));
 if(!m||!TYPES[type]||replacementReason(m,type))return false;
 const cost=priceNew(state,type);if(state.coins<cost){state.coins=cost;toast('Тестовая реклама · замена оплачена');}
 state.coins=Math.max(0,state.coins-cost);
 const record=objectRecord(id,true),old=m.type;record.type=type;
 record.angle=type==='gate'?90:['portal','magnet','boost'].includes(type)?-90:0;
 if(type==='portal')record.slot2=freeSlots()[0];else delete record.slot2;
 if(!String(id).startsWith('f'))record.free=false;
 syncWorldObjects();saveNow();scheduleRate();openObjectDetail(id);audio.tone(440,.16,.03,'sine',660);
 return true;
}
function rotateObject(id,dir){
 const rec=objectRecord(id,true);if(!rec)return;rec.angle=((rec.angle||0)+15*dir+360)%360;
 syncWorldObjects();saveNow();scheduleRate();toast('Направление: '+rec.angle+'°');
}
function openObjectLinks(id){
 const from=world.mods.find(m=>String(m.id)===String(id));if(!from||!state.skills.B6)return;
 const neighbors=world.mods.filter(m=>m.id!==from.id&&Math.hypot(m.x-from.x,m.y-from.y)<=135);
 const body=`<p class="replacement-note">Удар по «${TYPES[from.type].short}» усилит следующий удар выбранного соседа на 50%.</p><div class="replacement-list">${neighbors.map(m=>`<button class="replacement-row" data-action="set-object-link" data-id="${from.id}" data-to="${m.id}">${modIcon(m.type)}<span><strong>${TYPES[m.type].short}</strong><small>Ячейка ${m.slot+1}</small></span>${icon('tree')}</button>`).join('')||'<p>Рядом нет установленных элементов.</p>'}</div>`;
 modal('link','Связь элементов',body);
}

function hitEmptySocket(x,y){const used=occupied(state);let best=-1,d=27;world.slots.slice(0,slotCount(state)).forEach((p,i)=>{if(used.has(i))return;const q=Math.hypot(p.x-x,p.y-y);if(q<d){d=q;best=i;}});return best;}
function openSocketPicker(slot){
 if(!world.slots[slot])return;ui.slot=slot;
 const free=freeSlots().length;
 let body='<div class="socket-picker">';
 for(const [type,d] of Object.entries(TYPES)){
  const reason=state.completed<d.unlock?'После поля '+d.unlock:d.unique&&world.mods.some(m=>m.type===type)?'Уже есть на поле':free<(type==='portal'?2:1)?'Нужны две ячейки':'';
  const cost=priceNew(state,type),can=!reason&&state.coins>=cost;
  body+=`<button class="socket-option" data-action="field-build" data-type="${type}" data-slot="${slot}" ${can?'':'disabled'}>
   ${modIcon(type)}<span><strong>${d.short}</strong><small>${reason||fmt(cost)+' мон.'}</small></span></button>`;
 }
 modal('socket','Добавить элемент',body+'</div>','','','ЯЧЕЙКА '+(slot+1));
}
function buildAtSocket(type,slot){const d=TYPES[type];if(!d||state.completed<d.unlock)return;const cost=priceNew(state,type),free=freeSlots();if(state.coins<cost)return toast('Не хватает монет',true);if(d.unique&&world.mods.some(m=>m.type===type))return;const need=type==='portal'?2:1;if(free.length<need||!free.includes(slot))return toast('Ячейка уже занята',true);const m={id:state.nextId++,type,level:1,slot,angle:type==='gate'?90:['portal','magnet'].includes(type)?-90:type==='bar'?-15:0,free:false};if(type==='portal')m.slot2=free.find(i=>i!==slot);state.coins-=cost;state.inventory.push(m);syncWorldObjects();closeModal(false);saveNow();updateHUD(true);scheduleRate();showBanner('НОВЫЙ · '+d.short.toUpperCase());audio.tone(440,.16,.03,'sine',660);}
function editorPick(x,y){const slots=world.slots.slice(0,slotCount(state));let nearest=-1,d=44;slots.forEach((p,i)=>{const dist=Math.hypot(p.x-x,p.y-y);if(dist<d){nearest=i;d=dist;}});if(nearest<0)return;const m=state.inventory.find(m=>m.slot===nearest||m.type==='portal'&&m.slot2===nearest);if(ui.linkFrom){const from=state.inventory.find(m=>m.id===ui.linkFrom),a=slots[from?.slot],b=slots[m?.slot];if(m&&from&&m.id!==from.id&&a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=135){state.link={from:from.id,to:m.id};ui.linkFrom=null;editorChanged();toast('Направленная связь создана');}else toast('Нужен другой модуль в радиусе 135 единиц',true);return;}
 if(ui.moving){if(m)return toast('Выбери свободный сокет',true);const moving=state.inventory.find(m=>m.id===ui.moving);if(moving){if(ui.moveOut)moving.slot2=nearest;else moving.slot=nearest;ui.slot=nearest;ui.selected=moving.id;}ui.moving=null;ui.moveOut=false;editorChanged();return;}
 ui.slot=nearest;ui.selected=m?.id||null;renderEditor();}
function storeModule(id){const m=state.inventory.find(m=>m.id===id);if(!m)return;if(state.inventory.filter(m=>m.slot>=0).length<=1)return toast('На поле должен остаться хотя бы один модуль',true);m.slot=-1;delete m.slot2;ui.selected=null;ui.slot=-1;editorChanged();}
function toggleAuto(){state.autoFlippers=state.autoFlippers===false;world.autoFlippers=state.autoFlippers;world.cfg.autoFlippers=state.autoFlippers;saveNow();scheduleRate();}

let fieldGesture=null,holdTimer=0;
function manualDown(e){
 if(e?.button!==undefined&&e.button!==0||ui.modal||activePointer!==null)return;
 e?.preventDefault?.();audio.init();activePointer=e?.pointerId??'keyboard';
 if(e?.target===canvas&&e.clientX!==undefined){
  const rect=canvas.getBoundingClientRect(),p=renderer.screenToWorld(e.clientX-rect.left,e.clientY-rect.top),m=hitFieldModule(p.x,p.y);
  fieldGesture={started:performance.now(),x:e.clientX,y:e.clientY,id:m?.id??null,slot:m?-1:hitEmptySocket(p.x,p.y),cancelled:false,long:false};
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  if(m){
   renderer.beginHold(m.id);
   holdTimer=setTimeout(()=>{
    if(!fieldGesture||fieldGesture.cancelled)return;
    const key=fieldGesture.id;fieldGesture.long=true;
    renderer.endHold();openObjectDetail(key);
   },430);
   return;
  }
  if(fieldGesture.slot>=0){return;}
 }
 if(world.balls.length&&!world.parkedBall())world.pulse(true);
 else if(world.beginCharge()){ui.holdClock=performance.now();world.chargeUI=0;}
 updateHUD(true);
}
function manualMove(e){
 if(activePointer!==e.pointerId||!fieldGesture)return;
 if(Math.hypot(e.clientX-fieldGesture.x,e.clientY-fieldGesture.y)>13){
  fieldGesture.cancelled=true;clearTimeout(holdTimer);renderer.endHold();
 }
}
function manualUp(e){
 if(activePointer===null||e?.pointerId!==undefined&&activePointer!==e.pointerId)return;
 clearTimeout(holdTimer);renderer?.endHold();const gesture=fieldGesture;fieldGesture=null;activePointer=null;
 if(gesture?.id!==null&&gesture?.id!==undefined){
  if(!gesture.cancelled&&!gesture.long&&!ui.modal)upgradeModule(gesture.id,false,true);
  return;
 }
 if(gesture?.slot>=0){if(!gesture.cancelled&&!ui.modal)openSocketPicker(gesture.slot);return;}
 if(world.charging&&!isPaused()){
  const q=clamp((performance.now()-(ui.holdClock??performance.now()))/900,0,1);
  world.chargeUI=0;if(world.releaseChargeQ(q,true)){launchLastQ=q;launchReleaseAt=performance.now()+240;}
 }else world.cancelCharge();
 updateHUD(true);
}
function cancelInput(){
 clearTimeout(holdTimer);renderer?.endHold();fieldGesture=null;activePointer=null;keyHeld=false;world?.cancelCharge();launchReleaseAt=0;updateLaunchUI();
}

let pendingConfirm=null;
function modal(kind,title,body,actions='',wide=false,kicker=''){
 cancelInput();clearTimeout(modalCloseTimer);$('modalRoot').classList.remove('is-closing');
 const same=ui.modal===kind,old=same?$('modalRoot').querySelector('.modal-body')?.scrollTop||0:0;
 if(!ui.modal)ui.focus=document.activeElement;ui.modal=kind;
 const sheet=['confirm','transition','offline'].includes(kind);
 $('modalRoot').classList.toggle('dialog-root',sheet);
 $('modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal modal-${kind}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
 <header class="modal-header"><div><span class="eyebrow">${kicker||'КАСКАД'}</span><h2 id="modalTitle">${title}</h2></div>
 <span class="live-pill"><i></i> Игра идёт</span><button class="icon-button modal-close" data-action="close" aria-label="Закрыть">${icon('close')}</button></header>
 <div class="modal-body">${body}</div>${actions?`<footer class="modal-actions">${actions}</footer>`:''}</section></div>`;
 $('modalRoot').querySelector('.modal-body').scrollTop=old;
 if(!same){
  uiAnimate($('modalRoot').querySelector('.modal-backdrop'),[{opacity:0},{opacity:1}],{duration:180});
  uiAnimate($('modalRoot').querySelector('.modal'),[{opacity:.45,transform:'scale(.985)'},{opacity:1,transform:'scale(1)'}],{duration:240});
 }

 document.querySelector('.layout').inert=true;
 requestAnimationFrame(()=>{if(!old)$('modalRoot').querySelector('.modal-close')?.focus({preventScroll:true});});
 updateHUD(true);
}
function closeModal(refresh=true){
 const root=$('modalRoot'),old=root.firstElementChild,dialog=old?.querySelector('.modal');
 clearTimeout(modalCloseTimer);ui.modal='';
 const remove=()=>{if(root.firstElementChild===old){root.replaceChildren();root.classList.remove('dialog-root','is-closing');}};
 if(refresh&&old&&motionAllowed()){
  root.classList.add('is-closing');old.inert=true;old.setAttribute('aria-hidden','true');
  uiAnimate(dialog,[{transform:'scale(1)'},{transform:'scale(.985)'}],{duration:160,easing:'ease-in'});
  uiAnimate(old,[{opacity:1},{opacity:0}],{duration:160,easing:'ease-in',fill:'forwards'});
  modalCloseTimer=setTimeout(remove,165);
 }else remove();
 document.querySelector('.layout').inert=false;pendingConfirm=null;
 if(ui.focus?.isConnected)ui.focus.focus({preventScroll:true});ui.focus=null;
 ui.view='game';ui.moving=null;ui.linkFrom=null;
 if(refresh){updateHUD(true);scheduleRate();}
}
function confirmDialog(title,text,yes,fn){pendingConfirm=fn;modal('confirm',title,`<p>${text}</p>`,`<button class="btn subtle" data-action="close">Отмена</button><button class="btn primary" data-action="confirm-generic">${yes}</button>`);}
function openTransition(){if(state.score<goal(state.stage))return;const n=state.stage,r=reward(n,state.skills),unlocks=Object.values(TYPES).filter(d=>d.unlock===n).map(d=>d.name),cash=state.stageEarned*.05*(state.skills.C4||0);modal('transition','Поле пройдено',`<div class="reward-hero"><strong>+${r}</strong><span>кристалла в древо навыков</span></div><div class="info-box"><b>Следующее поле ${n+1}</b><br>Новая симметричная раскладка и другая цветовая палитра.</div><div class="field-reset-note">Новое поле начнётся с <b>0 / ${exact(goal(n+1))}</b> очков. Уровни всех элементов сбросятся до базовых; постоянное усиление остаётся в древе навыков.</div>${unlocks.length?`<h3 style="margin-top:14px">Новые модули</h3><p style="margin-top:8px">${unlocks.join(' · ')}</p>`:''}${cash?`<p>Касса перехода: +${fmt(cash)} монет.</p>`:''}`,`<button class="btn subtle" data-action="close">Остаться</button><button class="btn primary" data-action="advance">Новое поле →</button>`,false,'ЭТАП '+String(n).padStart(2,'0')+' / COMPLETE');}
function advanceStage(){if(state.score<goal(state.stage)||state.completed>=state.stage)return;const n=state.stage,r=reward(n,state.skills),cash=state.stageEarned*.05*(state.skills.C4||0);world.endRun();state.gems+=r;state.coins+=cash;state.completed=n;state.stage=n+1;state.score=0;state.stageEarned=0;state.stageHits=0;state.phase='play';state.planner.enabled=false;state.activeSkills=copy(state.skills);state.activeShell=state.shell;state.activeTraits=copy(state.traits);state.activeResearch=copy(state.research);resetFieldProgress(state);if(state.skills.C6){const sorted=state.inventory.filter(m=>m.slot>=0).sort((a,b)=>priceLevel(state,a)-priceLevel(state,b));for(const m of sorted.slice(0,2))m.level++;}state.startedStage=state.stage;ui.view='game';ui.selected=null;ui.slot=-1;normalizeSlots(state);closeModal(false);rebuildWorld();saveNow();renderAll();scheduleRate();toast(`Поле ${state.stage}: 0 очков · новая форма и палитра`);}
function startStage(){state.phase='play';state.activeSkills=copy(state.skills);state.activeShell=state.shell;state.activeTraits=copy(state.traits);state.activeResearch=copy(state.research);saveNow();}

const TREE_W=880,TREE_H=648,TREE_ROOT={x:440,y:49};
function treePositions(){
 const positions={};['A','B','C','D'].forEach((b,i)=>{
  const x=128+i*208;
  [[1,x,150],[2,x-47,256],[3,x+47,256],[4,x-47,364],[5,x+47,364],[6,x,474],[7,x,584]].forEach(([n,px,py])=>positions[b+n]={x:px,y:py});
 });return positions;
}
const TREE_POS=treePositions();
function skillAffordable(id){const d=SKILLS[id],r=state.skills[id]||0;return r<d.max&&state.gems>=d.costs[r];}
function skillNodeHTML(id){
 const d=SKILLS[id],r=state.skills[id]||0,p=TREE_POS[id],b=id[0];
 return `<button class="skill-node ${r?'purchased':''} ${r===d.max?'maxed':''} ${skillAffordable(id)?'available':''}" data-action="skill-select" data-skill="${id}" data-skill-node="${id}"
 style="--branch:${BRANCH_COLORS[b]};left:${p.x-32}px;top:${p.y-32}px" aria-label="${d.name}. ${r} из ${d.max}">
 <span class="node-glyph">${icon(SKILL_ICONS[id]||'star')}</span><span class="skill-rank">${r}/${d.max}</span><i class="node-notice"></i></button>`;
}
function skillPopupHTML(id){
 const d=SKILLS[id],r=state.skills[id]||0,max=r>=d.max,cost=d.costs[r]||0;
 return `<div class="skill-pop-header"><span class="pop-icon" style="--branch:${BRANCH_COLORS[id[0]]}">${icon(SKILL_ICONS[id])}</span>
 <div><small>${NAMES[id[0]]}</small><h3>${d.name}</h3></div><button class="icon-button" data-action="skill-dismiss" aria-label="Закрыть описание">${icon('close')}</button></div>
 <p class="skill-description">${d.desc}</p><div class="skill-pop-purchase"><span class="rank-label">Ранг <b data-skill-current>${r}</b> / ${d.max}<small data-skill-status>${max?'Изучено полностью':skillAffordable(id)?'Эффект применяется сразу':'Нужно ещё '+fmt(cost-state.gems)+' крист.'}</small></span>
 <button class="btn primary" data-action="skill-buy" data-skill="${id}" ${!skillAffordable(id)?'disabled':''}><span data-skill-buy-label>${max?'Максимум':'Улучшить'}</span><span class="price-chip">${icon('gem')}<b data-skill-cost>${max?'':cost}</b></span></button></div>`;
}
function refreshTreeUI(id=ui.skill){
 updateHUD(true);if(ui.modal!=='tree')return;
 const available=Object.keys(SKILLS).filter(skillAffordable);
 if($('treeGems'))$('treeGems').textContent=fmt(state.gems);
 if($('treeAvailable'))$('treeAvailable').textContent=available.length?'Доступно: '+available.length:'Нет доступных';
 for(const key of Object.keys(SKILLS)){
  const node=document.querySelector(`[data-skill-node="${key}"]`),r=state.skills[key]||0,d=SKILLS[key];if(!node)continue;
  node.classList.toggle('available',skillAffordable(key));node.classList.toggle('purchased',r>0);node.classList.toggle('maxed',r>=d.max);node.classList.toggle('selected',key===ui.skill&&$('skillPopover')?.classList.contains('visible'));
  node.querySelector('.skill-rank').textContent=r+'/'+d.max;
  node.setAttribute('aria-label',`${d.name}. ${r} из ${d.max}`);
  document.querySelector(`[data-mini-node="${key}"]`)?.setAttribute('fill',r>0?BRANCH_COLORS[key[0]]:'#dcdacf');
 }
 const pop=$('skillPopover');
 if(pop?.classList.contains('visible')){
  const key=ui.skill,d=SKILLS[key],r=state.skills[key]||0,max=r>=d.max,cost=d.costs[r]||0;
  const set=(q,v)=>{const el=pop.querySelector(q);if(el)el.textContent=v;};
  set('[data-skill-current]',r);set('[data-skill-status]',max?'Изучено полностью':skillAffordable(key)?'Эффект применяется сразу':'Нужно ещё '+fmt(cost-state.gems)+' крист.');
  set('[data-skill-buy-label]',max?'Максимум':'Улучшить');set('[data-skill-cost]',max?'':cost);
  const buy=pop.querySelector('[data-action="skill-buy"]');if(buy)buy.disabled=!skillAffordable(key);
 }
}
function selectSkill(id){
 if(!SKILLS[id])return;
 ui.skill=id;const pop=$('skillPopover');if(!pop)return;
 pop.innerHTML=skillPopupHTML(id);pop.classList.add('visible');
 uiAnimate(pop,[{opacity:.4},{opacity:1}],{duration:200});
 uiAnimate(pop.querySelector('.skill-pop-header'),[{transform:'translateY(5px)'},{transform:'translateY(0)'}],{duration:200});
 refreshTreeUI(id);
 panTreeTo(id,false);requestAnimationFrame(updateTreeNavigator);
}
function panTreeTo(id,animate=true){
 const p=id?TREE_POS[id]:TREE_ROOT,sc=$('skillTreeScroll');if(!sc||!p)return;
 const z=ui.treeZoom||.8;
 sc.scrollTo({left:p.x*z-sc.clientWidth/2,top:Math.max(0,p.y*z-sc.clientHeight/2),behavior:animate?'smooth':'instant'});
}
function treeZoom(delta){
 const old=ui.treeZoom||.8,sc=$('skillTreeScroll'),map=$('skillTreeMap');if(!sc||!map)return;
 const z=clamp(Math.round((old+delta)*100)/100,.6,1.2),centerX=(sc.scrollLeft+sc.clientWidth/2)/old,centerY=(sc.scrollTop+sc.clientHeight/2)/old;
 ui.treeZoom=z;map.style.transform=`scale(${z})`;const space=$('treeScrollSpace');space.style.width=TREE_W*z+'px';space.style.height=TREE_H*z+'px';
 sc.scrollLeft=centerX*z-sc.clientWidth/2;sc.scrollTop=centerY*z-sc.clientHeight/2;
 if($('treeZoomLabel'))$('treeZoomLabel').textContent=Math.round(z*100)+'%';
 updateTreeNavigator();
}
function updateTreeNavigator(){
 const sc=$('skillTreeScroll'),r=$('treeViewport');if(!sc||!r)return;
 const z=ui.treeZoom||.8;
 r.setAttribute('x',sc.scrollLeft/z);r.setAttribute('y',sc.scrollTop/z);
 r.setAttribute('width',Math.min(TREE_W,sc.clientWidth/z));r.setAttribute('height',Math.min(TREE_H,sc.clientHeight/z));
 ui.treeX=sc.scrollLeft;ui.treeY=sc.scrollTop;
}
function openTree(){
 let links='';
 for(const b of ['A','B','C','D']){
  for(const [parent,child] of [['root',b+'1'],[b+'1',b+'2'],[b+'1',b+'3'],[b+'2',b+'4'],[b+'3',b+'5'],[b+'4',b+'6'],[b+'5',b+'6'],[b+'6',b+'7']]){
   const a=parent==='root'?TREE_ROOT:TREE_POS[parent],p=TREE_POS[child],mid=(a.y+p.y)/2;
   links+=`<path d="M${a.x},${a.y+28} V${mid} H${p.x} V${p.y-32}" stroke="${BRANCH_COLORS[b]}" opacity=".32"/>`;
  }
 }
 const z=ui.treeZoom||.8;ui.treeZoom=z;
 const mini=Object.entries(TREE_POS).map(([id,p])=>`<rect data-mini-node="${id}" x="${p.x-23}" y="${p.y-23}" width="46" height="46" rx="10" fill="${state.skills[id]?BRANCH_COLORS[id[0]]:'#dcdacf'}"/>`).join('');
 const body=`<div class="tree-toolbar"><span class="tree-wallet">${icon('gem')}<strong id="treeGems">${fmt(state.gems)}</strong></span>
 <button class="available-shortcut" data-action="tree-affordable"><i></i><span id="treeAvailable">Доступные</span></button>
 <div class="tree-controls"><button data-action="tree-zoom-out" aria-label="Уменьшить">−</button><span id="treeZoomLabel">${Math.round(z*100)}%</span><button data-action="tree-zoom-in" aria-label="Увеличить">+</button><button data-action="tree-home" aria-label="К центру древа">${icon('center')}</button></div></div>
 <div class="tree-stage"><div class="skill-tree-scroll" id="skillTreeScroll" tabindex="0" aria-label="Древо. Прокрутка в любом направлении.">
 <div id="treeScrollSpace" style="width:${TREE_W*z}px;height:${TREE_H*z}px"><div class="unified-tree" id="skillTreeMap" style="transform:scale(${z})">
 <svg class="tree-connections" viewBox="0 0 ${TREE_W} ${TREE_H}" aria-hidden="true"><g fill="none" stroke-width="3" stroke-linejoin="round">${links}</g></svg>
 <div class="tree-root" style="left:${TREE_ROOT.x-29}px;top:${TREE_ROOT.y-26}px">${icon('tree')}</div>
 ${Object.keys(SKILLS).map(skillNodeHTML).join('')}</div></div></div>
 <button class="tree-minimap" id="treeMinimap" aria-label="Навигатор древа"><svg viewBox="0 0 ${TREE_W} ${TREE_H}">${mini}<rect id="treeViewport" x="0" y="0" width="100" height="100" fill="#69af9122" stroke="#589a80" stroke-width="9" rx="15"/></svg></button></div>
 <div class="tree-guide">${icon('touch')} Двигай древо в любую сторону · нажми на навык</div>
 <div class="skill-popover" id="skillPopover" aria-live="polite"></div>`;
 modal('tree','Навыки',body,'',true,'ОДНО ДРЕВО · 28 НАВЫКОВ');
 const sc=$('skillTreeScroll');
 if(ui.treeX!==undefined){sc.scrollLeft=ui.treeX;sc.scrollTop=ui.treeY||0;}else panTreeTo(null,false);
 sc.addEventListener('scroll',updateTreeNavigator,{passive:true});
 // Mouse drag complements native touch and trackpad scrolling.
 let drag=null;
 sc.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:sc.scrollLeft,top:sc.scrollTop};sc.setPointerCapture(e.pointerId);sc.classList.add('dragging');});
 sc.addEventListener('pointermove',e=>{if(drag){sc.scrollLeft=drag.left-(e.clientX-drag.x);sc.scrollTop=drag.top-(e.clientY-drag.y);}});
 const stop=()=>{drag=null;sc.classList.remove('dragging');};
 sc.addEventListener('pointerup',stop);sc.addEventListener('pointercancel',stop);
 $('treeMinimap').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();const z=ui.treeZoom||.8;sc.scrollTo({left:(e.clientX-r.left)/r.width*TREE_W*z-sc.clientWidth/2,top:(e.clientY-r.top)/r.height*TREE_H*z-sc.clientHeight/2,behavior:'smooth'});});
 refreshTreeUI();requestAnimationFrame(updateTreeNavigator);
}

function buySkill(id){const d=SKILLS[id],r=state.skills[id]||0;if(!d||r>=d.max||state.gems<d.costs[r])return;state.gems-=d.costs[r];state.skills[id]=r+1;state.activeSkills=copy(state.skills);world.cfg.skills=copy(state.skills);normalizeSlots(state);syncWorldObjects();saveNow();scheduleRate();refreshTreeUI(id);uiAnimate(document.querySelector(`[data-skill="${id}"].skill-node`),[{transform:'scale(1)'},{transform:'scale(1.13)',offset:.38},{transform:'scale(.98)',offset:.72},{transform:'scale(1)'}],{duration:360});uiAnimate(document.querySelector('.pop-icon'),[{transform:'scale(1)'},{transform:'scale(1.16)',offset:.38},{transform:'scale(1)'}],{duration:300});audio.tone(660,.17,.03,'sine',990);showBanner(d.name.toUpperCase()+' · '+(r+1));}
function resetSkills(){confirmDialog('Сбросить навыки?',`Вернутся все ${spentSkills(state)} кристалла. Эффекты исчезнут сразу.`,`Вернуть кристаллы`,()=>{state.gems+=spentSkills(state);state.skills={};state.activeSkills={};world.cfg.skills={};normalizeSlots(state);syncWorldObjects();saveNow();closeModal(false);openTree();});}
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
 const sk=active(state),params=offlineParams(),signature=rateSignature(state),known=state.rateCache?.signature===signature,rate=known?state.rateCache.rate:0,unlocked=state.completed>=3||!!sk.D1;
 let body=`<div class="info-box"><b>Автоотбив настраивается только в экране «Настройки».</b><br>Здесь находятся автозапуск, офлайн-доход и планировщик улучшений.</div>
 <div class="settings-row"><div><strong>Автозапуск шарика</strong><small>${unlocked?'Запуск через '+dec(2.5-.3*(sk.D1||0))+' с. Можно не держать пружину.':'Откроется после прохождения поля 3'}</small></div>${switchHTML('autolaunch-modal',state.auto,'Автозапуск',!unlocked)}</div>
 <div class="settings-row"><div><strong>Точность помощника</strong><small>Вероятность срабатывания датчика, не гарантия спасения.</small></div><span class="pill">${Math.min(100,91+3*(sk.D2||0)+(state.activeShell==='ceramic'?5:0))}%</span></div>
 <div class="section-heading"><h3>Офлайн-доход</h3></div><div class="stat-grid"><div class="stat-cell"><small>ВЫРАБОТКА</small><strong>${unlocked&&known?dec(rate):'—'}</strong><small>монет в секунду</small></div><div class="stat-cell"><small>ЭФФЕКТИВНОСТЬ / ЛИМИТ</small><strong>${Math.round(params.eff*100)}% / ${params.cap/3600}ч</strong><small>${unlocked?'только монеты':'после поля 3'}</small></div></div>
 <button class="btn wide" data-action="measure-rate" ${!unlocked?'disabled':''}>Калибровать сборку</button><p class="fine">Три ускоренных теста физики. Не начисляют наград. Офлайн не проходит поля и не тратит ресурсы.</p>
 <div class="section-heading"><h3>Сила автопружины</h3><span class="pill">D4 · ${sk.D4||0}</span></div><p class="fine">Выбери силу из своих ручных запусков.</p>`;
 const choices=[...new Set(state.launchHistory.map(q=>q.toFixed(3)))],cap=sk.D4?sk.D4+1:1;for(let i=0;i<cap;i++){const val=state.profiles[i]??state.profiles[0]??.6;if(!choices.includes(val.toFixed(3)))choices.push(val.toFixed(3));body+=`<div class="settings-row"><strong>Профиль ${i+1}</strong><select data-control="profile" data-index="${i}" aria-label="Сила профиля ${i+1}">${choices.map(q=>`<option value="${q}" ${Math.abs(+q-val)<.001?'selected':''}>${Math.round(+q*100)}%</option>`).join('')}</select></div>`;}
 body+=`<div class="section-heading"><h3>Планировщик улучшений</h3><span class="pill">D6</span></div>${sk.D6?`<div class="settings-row"><div><strong>Покупать уровни автоматически</strong><small>Не более двух покупок в секунду.</small></div><button class="btn ${state.planner.enabled?'primary':''}" data-action="planner">${state.planner.enabled?'Включен':'Выключен'}</button></div><div class="settings-row"><strong>Резерв кошелька</strong><select data-control="reserve"><option value="0" ${(state.planner.ratio||0)===0?'selected':''}>0%</option><option value=".25" ${state.planner.ratio===.25?'selected':''}>25%</option><option value=".5" ${state.planner.ratio===.5?'selected':''}>50%</option></select></div><div class="settings-row"><strong>Порядок покупок</strong><select data-control="planner-mode"><option value="cheap" ${state.planner.mode==='cheap'?'selected':''}>Минимальная цена</option><option value="order" ${state.planner.mode==='order'?'selected':''}>По порядку сокетов</option></select></div><p class="fine">Резерв: ${fmt(state.planner.reserve)} монет. Фиксируется при включении. Новые модули и кристаллы не расходуются.</p>`:'<p>Доступен после изучения D6. Работает только когда игра открыта.</p>'}`;
 modal('automation','Автоматика и офлайн',body,'<button class="btn primary" data-action="close">К игре</button>');}
function openHelp(){openSettings();requestAnimationFrame(()=>{const d=document.querySelector('.settings-help');if(d){d.open=true;d.scrollIntoView({block:'nearest'});}});}
function settingRow(label,description,action,on,key='',disabled=false){
 return `<div class="settings-row"><div><strong>${label}</strong><small>${description}</small></div>
 <button class="switch-button ${on?'on':''}" role="switch" aria-label="${label}" aria-checked="${on}" data-action="${action}" ${key?`data-key="${key}"`:''} ${disabled?'disabled':''}><i></i></button></div>`;
}
function openSettings(){
 const sk=active(state),params=offlineParams(),unlocked=state.completed>=3||!!sk.D1,v=state.stats;
 const known=state.rateCache?.signature===rateSignature(state);
 let body=`<section class="settings-card"><h3>${icon('touch')} Управление</h3>
 ${settingRow('Автоотбив','Ручные тапы доступны и с помощником.','assist-settings',state.autoFlippers!==false)}
 ${settingRow('Автозапуск',unlocked?'Новый шар запускается автоматически.':'Откроется после поля 3 или навыка «Автопружина».','autolaunch-settings',state.auto,'',!unlocked)}
 </section><section class="settings-card"><h3>${icon('sound')} Звук и эффекты</h3>`;
 for(const [key,title,desc] of [['sound','Звуки','Удары и награды.'],['motion','Анимации','Плавные окна, отклик кнопок и эффекты на поле.'],['vibration','Вибрация','Отклик при точном отбиве.']])
  body+=settingRow(title,desc,'setting',state.prefs[key],key);
 body+=`</section><section class="settings-card"><h3>${icon('auto')} Автоматика</h3>
 <div class="settings-metrics"><div><small>Выработка</small><strong data-rate-value>${known?dec(state.rateCache.rate):'—'} <em>мон./с</em></strong></div>
 <div><small>Офлайн</small><strong>${Math.round(params.eff*100)}% <em>· ${params.cap/3600} ч</em></strong></div></div>
 <button class="btn secondary wide" data-action="automation">${icon('settings')} Профили и планировщик</button>
 </section><section class="settings-card"><h3>${icon('chart')} Твой прогресс</h3><div class="settings-metrics"><div><small>Пройдено полей</small><strong>${state.completed}</strong></div><div><small>Лучший запуск</small><strong>${fmt(v.bestRun)}</strong></div><div><small>Попадания</small><strong>${fmt(v.hits)}</strong></div><div><small>Запуски</small><strong>${fmt(v.runs)}</strong></div></div></section>
 <section class="settings-card"><h3>${icon('store')} Сохранение</h3><p class="settings-note">Прогресс сохраняется в этом браузере. Файл позволяет перенести его на другое устройство.</p>
 <div class="settings-save"><button class="btn secondary" data-action="export">${icon('download')} Экспорт</button><button class="btn secondary" data-action="import">${icon('store')} Импорт</button></div></section>
 <details class="settings-card settings-help"><summary>${icon('help')} Управление и правила</summary><p>Свободное место: зажать и отпустить — запуск; с шариком — отбив.</p><p>Короткое касание элемента покупает улучшение. Удержание открывает описание, поворот и замену. Если монет на улучшение или замену не хватает, срабатывает мгновенная тестовая реклама.</p><p>Пустая ячейка открывает строительство. Новые модули покупаются за монеты. Игра продолжает работать под окнами.</p></details>
 <button class="reset-button" data-action="reset-save">Сбросить прогресс</button><p class="version-label">КАСКАД · v0.9 · локальный прототип</p>`;
 modal('settings','Настройки',body,'',false,'ЗВУК · УПРАВЛЕНИЕ · СОХРАНЕНИЕ');
}
function refreshSettings(){
 syncMotionPreference();
 if(ui.modal!=='settings')return;
 for(const b of $('modalRoot').querySelectorAll('[role="switch"]')){
  const a=b.dataset.action,on=a==='assist-settings'?state.autoFlippers!==false:a==='autolaunch-settings'?state.auto:!!state.prefs[b.dataset.key];
  b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));
 }
 updateHUD(true);
}

function showOffline(){if(!offlineNotice)return;const n=offlineNotice;offlineNotice=null;modal('offline','Поле работало без тебя',`<div class="reward-hero"><strong style="color:var(--gold)">+${fmt(n.coins)}</strong><span>монет уже добавлено</span></div><div class="stat-grid"><div class="stat-cell"><small>УЧТЕНО ВРЕМЕНИ</small><strong>${dec(n.seconds/3600)} ч</strong><small>лимит ${n.cap/3600} ч</small></div><div class="stat-cell"><small>ВЫРАБОТКА</small><strong>${dec(n.rate)} / с</strong><small>эффективность ${Math.round(n.eff*100)}%</small></div></div><div class="info-box">Выплата по снимку сборки перед выходом. Офлайн не начисляет очки, кристаллы или мастерство и не переходит на новое поле.</div>`,'<button class="btn primary" data-action="close">Продолжить</button>');}
function exportSave(){saveNow();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`kaskad-${mode}-field-${state.stage}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Сохранение экспортировано');}
function resetSave(){confirmDialog('Удалить прогресс этого профиля?','Монеты, модули, навыки и пройденные поля будут удалены. Перед сбросом можно экспортировать сохранение.','Удалить и начать заново',()=>{state=newState();ui.view='game';closeModal(false);rebuildWorld();saveNow();renderAll();});}
function action(name,d={}){
 if(name==='skill-dismiss'){$('skillPopover')?.classList.remove('visible');refreshTreeUI();requestAnimationFrame(updateTreeNavigator);return;}
 if(name==='tree-zoom-in'){treeZoom(.1);return;}
 if(name==='tree-zoom-out'){treeZoom(-.1);return;}
 if(name==='tree-home'){panTreeTo(null);return;}
 if(name==='tree-affordable'){const ids=Object.keys(SKILLS).filter(skillAffordable);if(ids.length){const i=ids.indexOf(ui.skill);selectSkill(ids[(i+1)%ids.length]);}else toast('Кристаллы выдаются за завершение поля');return;}

 if(name==='object-upgrade'){upgradeModule(d.id,false,true);return;}
 if(name==='object-replacements'){openObjectReplacements(d.id);return;}
 if(name==='object-replace'){replaceObject(d.id,d.type);return;}
 if(name==='object-rotate'){rotateObject(d.id,+d.dir);return;}
 if(name==='object-link'){openObjectLinks(d.id);return;}
 if(name==='set-object-link'){
  const from=world.mods.find(m=>String(m.id)===d.id),to=world.mods.find(m=>String(m.id)===d.to);
  if(from&&to){state.link={from:from.id,to:to.id};world.cfg.link=copy(state.link);saveNow();openObjectDetail(from.id);}return;
 }

 audio.init();const id=+d.id;
 if(mobileAction(name,d))return;
 switch(name){
  case 'close':closeModal();break;
  case 'confirm-generic':{const fn=pendingConfirm;closeModal(false);fn?.();break;}
  case 'workshop':openWorkshop();break;
  case 'edit-module':openWorkshop(id);break;
  case 'upgrade':upgradeModule(id,false,true);break;
  case 'field-build':buildAtSocket(d.type,+d.slot);break;
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
  case 'planner':if(state.skills.D6){state.planner.enabled=!state.planner.enabled;if(state.planner.enabled){state.planner.reserve=state.coins*(state.planner.ratio||0);state.planner.cursor=0;}saveNow();openAutomation();}break;
  case 'setting':if(['sound','motion','vibration'].includes(d.key)){state.prefs[d.key]=!state.prefs[d.key];audio.init();saveNow();refreshSettings();}break;
  case 'export':exportSave();break;
  case 'import':$('importInput').click();break;
  case 'reset-save':resetSave();break;
 }
}
document.addEventListener('selectstart',e=>e.preventDefault());
document.addEventListener('dragstart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled){e.preventDefault();try{action(b.dataset.action,b.dataset);}catch(err){console.error(err);toast('Действие не выполнено. Прогресс сохранен.',true);}}else if(e.target.classList.contains('modal-backdrop'))closeModal();});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.control==='profile'){state.profiles[+d.index]=clamp(+e.target.value,0,1);for(let i=0;i<state.profiles.length;i++)if(state.profiles[i]==null)state.profiles[i]=state.profiles[0]||.6;world.cfg.profiles=copy(state.profiles);saveNow();}if(d.control==='reserve'){state.planner.ratio=+e.target.value;if(state.planner.enabled)state.planner.reserve=state.coins*state.planner.ratio;saveNow();openAutomation();}if(d.control==='planner-mode'){state.planner.mode=e.target.value;state.planner.cursor=0;saveNow();}});
$('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('Файл слишком большой');const imported=validateState(JSON.parse(await file.text()));confirmDialog('Заменить текущий профиль?',`Из файла будет восстановлено поле ${imported.stage}, ${fmt(imported.coins)} монет и ${fmt(imported.gems)} кристаллов. Текущий профиль будет заменен.`,'Восстановить',()=>{state=imported;state.savedAt=Date.now();state.offline=null;ui.view='game';closeModal(false);rebuildWorld();saveNow();renderAll();scheduleRate();toast('Сохранение восстановлено');});}catch(err){toast('Не удалось импортировать сохранение',true);console.warn(err);}finally{e.target.value='';}});
canvas.addEventListener('pointerdown',manualDown);canvas.addEventListener('pointermove',manualMove);canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointerup',manualUp);window.addEventListener('pointercancel',cancelInput);
window.addEventListener('keydown',e=>{
 if(e.key==='Tab'&&ui.modal&&$('modalRoot').classList.contains('dialog-root')){const nodes=[...$('modalRoot').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(nodes.length){const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
 if(e.key==='Escape'){e.preventDefault();if(ui.modal)closeModal();else if(ui.view==='workshop')finishEditor();return;}
 if(e.target.matches('input,select,textarea')||ui.modal)return;
 if(['Space','KeyZ','KeyX','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();if(!e.repeat&&!keyHeld){keyHeld=true;manualDown();}}
});
window.addEventListener('keyup',e=>{if(['Space','KeyZ','KeyX','ArrowLeft','ArrowRight'].includes(e.code)&&keyHeld){e.preventDefault();keyHeld=false;manualUp();}});
$('soundBtn').addEventListener('click',()=>{state.prefs.sound=!state.prefs.sound;audio.init();saveNow();renderAll();});
$('settingsBtn').addEventListener('click',openSettings);$('treeFab').addEventListener('click',openTree);$('advanceBtn').addEventListener('click',openTransition);
window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(fitBoard));
window.addEventListener('resize',()=>requestAnimationFrame(fitBoard));
window.addEventListener('blur',cancelInput);
document.addEventListener('visibilitychange',()=>{cancelInput();if(document.hidden){hiddenAt=Date.now();saveNow();}else{frameLast=performance.now();accumulator=0;if(hiddenAt){acceptOffline();hiddenAt=0;saveNow();if(offlineNotice)showOffline();}scheduleRate();}});
window.addEventListener('pagehide',saveNow);window.addEventListener('beforeunload',saveNow);
function plannerTick(){if(!state.skills.D6||!state.planner.enabled||world.time-lastPlanner<.5)return;lastPlanner=world.time;let mods=state.inventory.filter(m=>m.slot>=0&&m.level<250);if(!mods.length)return;if(state.planner.mode==='order'){mods.sort((a,b)=>a.slot-b.slot);mods=[mods[(state.planner.cursor||0)%mods.length]];}else mods.sort((a,b)=>priceLevel(state,a)-priceLevel(state,b));const m=mods[0],cost=priceLevel(state,m);if(state.coins-cost>=state.planner.reserve&&upgradeModule(m.id,true,false)){state.planner.cursor=(state.planner.cursor||0)+1;}}
function frame(now){if(world.charging)world.chargeUI=clamp((now-(ui.holdClock??now))/900,0,1);if(!frameLast)frameLast=now;const dt=Math.min(.05,Math.max(0,(now-frameLast)/1000));frameLast=now;if(!isPaused()){accumulator+=dt;let n=0;while(accumulator>=STEP&&n++<12){world.step(STEP);state.stats.playtime+=STEP;accumulator-=STEP;}plannerTick();}else accumulator=0;renderer.draw(world,state,ui);updateLaunchUI(now);updateHUD();if(now-lastSave>5000&&!document.hidden){lastSave=now;saveNow();}requestAnimationFrame(frame);}
rebuildWorld();renderer=new PinballRenderer(canvas);renderAll();fitBoard();saveNow();scheduleRate();requestAnimationFrame(frame);
if(loadWarning)toast(loadWarning,true);if(offlineNotice)setTimeout(showOffline,150);
// Small, documented inspection API for local prototype testing; no network calls.
window.Kaskad={version:'0.13.0',snapshot:()=>copy(state),get world(){return world;},get mode(){return mode;},get ui(){return copy({...ui,focus:null});},get camera(){return renderer?renderer.camera():null;},engine:PinballWorld,config:engineConfig,calculateRate,goal,reward,skills:copy(SKILLS),types:copy(TYPES),launcher:LAUNCHER,physicsRevision:PHYSICS_REVISION,layoutAudit,featuresFor,hazardsFor,slotsFor,migrateLegacyDevices,resetFieldProgress,
 visualState:id=>renderer.visualState(id)};

})();