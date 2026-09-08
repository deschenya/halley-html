'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
const ctx={console,window:{matchMedia:()=>({matches:false})}};vm.createContext(ctx);
vm.runInContext(source.slice(0,source.indexOf('/* Vector-only rendering'))+'globalThis.T={safeLayout,layoutAudit,featuresFor,hazardsFor,LAUNCHER,newState,slotCount};})();',ctx);
const T=ctx.T; let fail=0; const center=204;
function ok(name,v,d){console.log(v?'PASS':'FAIL',name,v?'':d||'');if(!v)fail++;}
for(let stage=1;stage<=30;stage++){
 const pts=T.safeLayout(stage);
 const symmetric=pts.every((p,i)=>{const mate=pts[i%2===0?i+1:i-1];return Math.abs(p.y-mate.y)<1e-9&&Math.abs((p.x+mate.x)-2*center)<1e-9;});
 const clear=pts.every(p=>p.x+36<=T.LAUNCHER.dividerX-16);
 ok(`stage ${stage} mirrored inside play chamber`,symmetric,pts.slice(0,4));
 ok(`stage ${stage} clear of launch chute`,clear,Math.max(...pts.map(p=>p.x)));
 ok(`stage ${stage} layout audit`,T.layoutAudit(stage).length===0,T.layoutAudit(stage));
}
const f=T.featuresFor(5);ok('feature pair also centered in chamber',f.length===2&&Math.abs(f[0].x+f[1].x-2*center)<1e-9&&f[0].y===f[1].y,f);
if(fail)process.exit(1);else console.log('TOTAL PASS',30*3+1);
