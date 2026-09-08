'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
const ctx={console,window:{matchMedia:()=>({matches:false})}};vm.createContext(ctx);
vm.runInContext(source.slice(0,source.indexOf('/* Vector-only rendering'))+'globalThis.T={PinballWorld,newState,engineConfig,STEP,LAUNCHER};})();',ctx);const T=ctx.T;
let pass=0,total=0;const fails=[];
for(let stage=1;stage<=30;stage++)for(let qi=0;qi<=20;qi++){
 const q=qi/20,s=T.newState();s.stage=stage;s.completed=stage-1;s.autoFlippers=false;const ev=[];const w=new T.PinballWorld(T.engineConfig(s),{simulation:true,seed:1000+stage*31+qi,onEvent:e=>ev.push(e)});w.launch(q,true);
 for(let i=0;i<Math.ceil(2/T.STEP);i++)w.step();
 const entries=ev.filter(e=>e.type==='entry');const ok=entries.length>=1&&!entries.some(e=>e.recovered)&&w.balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.vx)&&Number.isFinite(b.vy));total++;if(ok)pass++;else fails.push({stage,q,entries:entries.length,recovered:entries.some(e=>e.recovered),balls:w.balls.map(b=>({x:b.x,y:b.y,inLane:b.inLane}))});
}
console.log('TOTAL',total,'PASS',pass);if(fails.length){console.error(fails.slice(0,10));process.exit(1);}
