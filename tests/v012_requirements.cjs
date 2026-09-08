'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
const ctx={console,window:{matchMedia:()=>({matches:false})}};vm.createContext(ctx);
vm.runInContext(source.slice(0,source.indexOf('/* Vector-only rendering'))+'globalThis.T={PinballWorld,newState,engineConfig,STEP,goal,slotCount,featuresFor,FIELD_THEMES,TYPES,safeLayout,layoutAudit,resetFieldProgress,LAUNCHER};})();',ctx);
const T=ctx.T,checks=[];function check(name,v,detail=''){checks.push([name,!!v,detail]);console.log(v?'PASS':'FAIL',name,v?'':detail);if(!v)process.exitCode=1;}
check('level 1 goal remains 2000',T.goal(1)===2000,T.goal(1));
check('starter objects are four round bumpers',T.newState().inventory.length===4&&T.newState().inventory.every(m=>m.type==='bumper'&&m.level===1));
check('bar is not available in initial fields',T.TYPES.bar.unlock>=5,T.TYPES.bar.unlock);
const expected=[4,4,6,6,8];for(let stage=1;stage<=5;stage++){const s=T.newState();s.stage=stage;s.completed=stage-1;check(`stage ${stage} socket count`,T.slotCount(s)===expected[stage-1],T.slotCount(s));}
for(let stage=1;stage<=30;stage++){
 const pts=T.safeLayout(stage),sym=pts.every((p,i)=>{const mate=pts[i%2===0?i+1:i-1];return Math.abs(p.y-mate.y)<1e-9&&Math.abs((p.x+mate.x)-408)<1e-9;});
 check(`stage ${stage} socket layout symmetric`,sym,pts.slice(0,4));
 check(`stage ${stage} layout audit clean`,T.layoutAudit(stage).length===0,T.layoutAudit(stage));
}
check('fields 1-4 have no authored bonus device',[1,2,3,4].every(s=>T.featuresFor(s).length===0));
check('field 5 has mirrored authored pair',(()=>{const f=T.featuresFor(5);return f.length===2&&f[0].type===f[1].type&&Math.abs(f[0].x+f[1].x-408)<1e-9&&f[0].y===f[1].y;})(),T.featuresFor(5));
{
 const s=T.newState();s.inventory[0].level=8;s.inventory[1].level=4;s.fieldObjects={0:{type:'spring',level:9,angle:0}};T.resetFieldProgress(s);
 check('field transition reset helper returns all module levels to 1',s.inventory.every(m=>m.level===1),s.inventory.map(m=>m.level));
 check('field transition reset helper clears authored item progress',Object.keys(s.fieldObjects).length===0,s.fieldObjects);
}
{
 const s=T.newState();s.stage=8;s.completed=7;s.autoFlippers=false;const events=[];const w=new T.PinballWorld(T.engineConfig(s),{simulation:true,seed:17,onEvent:e=>events.push(e)});
 const b=w.newBall(400,681,120,90);b.inLane=false;b.laneReturnLockUntil=0;w.balls=[b];w.combo=1.75;w.runPoints=321;w.lastHit=w.time;
 w.step();
 check('returning live ball parks on spring',w.balls.length===1&&b.parked&&Math.abs(b.x-T.LAUNCHER.x)<1e-9&&Math.abs(b.y-T.LAUNCHER.spawnY)<1e-9&&b.vx===0&&b.vy===0,{x:b.x,y:b.y,parked:b.parked});
 check('spring parking emits dedicated event',events.some(e=>e.type==='springPark'),events.map(e=>e.type));
 check('spring parking is not a loss',!events.some(e=>e.type==='lost'),events.map(e=>e.type));
 check('spring parking preserves combo and run score',Math.abs(w.combo-1.75)<1e-9&&w.runPoints===321,{combo:w.combo,runPoints:w.runPoints});
 check('parked ball can begin manual charge',w.beginCharge());
 const combo=w.combo,runPoints=w.runPoints;check('parked ball relaunch succeeds',w.releaseChargeQ(.7,true));
 check('parked ball relaunch preserves current run',!b.parked&&b.inLane&&Math.abs(w.combo-combo)<1e-9&&w.runPoints===runPoints,{combo:w.combo,runPoints:w.runPoints,inLane:b.inLane});
}
console.log('TOTAL',checks.length,'PASS',checks.filter(x=>x[1]).length);if(checks.some(x=>!x[1]))process.exit(1);
