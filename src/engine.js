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
  this.slots=slotsFor(config.stage);this.mods=[];this.updateModules(config.inventory);this.walls=this.makeWalls();
 }
 s(id){return this.cfg.skills[id]||0;}
 emit(type,data={}){this.onEvent({type,time:this.time,...data});}
 cd(seconds){return seconds*(1-.05*this.s('B2'))*(modifier(this.cfg.stage)===2?1.25:1);}
 updateModules(inventory){this.cfg.inventory=copy(inventory);const old=new Map(this.mods.map(m=>[m.id,m]));this.mods=inventory.filter(m=>m.slot>=0).map(info=>{const m=old.get(info.id)||{hits:0,charge:0,paidAt:-100,lastAward:-100,nextAction:0,lastExtra:-100,glow:0,spin:0};Object.assign(m,copy(info),this.slots[info.slot]);m.a=(info.angle||0)*Math.PI/180;return m;});}
 makeWalls(){const path=[[24,707],[24,176],[26,139],[38,105],[62,76],[97,55],[143,41],[198,35],[258,39],[311,50],[355,69],[390,102],[414,144],[419,180],[419,707]],out=[];for(let i=1;i<path.length;i++)out.push({a:path[i-1],b:path[i],r:3,e:.84});out.push({a:[382,164],b:[382,674],r:3,e:.87});for(const chain of [[[29,488],[59,551],[109,603]],[[377,488],[350,551],[300,603]]])for(let i=1;i<chain.length;i++)out.push({a:chain[i-1],b:chain[i],r:5,e:.78});return out;}
 newBall(x,y,vx,vy,extra={}){return{id:this.nextBall++,x,y,px:x,py:y,vx,vy,r:7.2,contacts:new Set(),cool:{},gate:0,gateUntil:0,perfect:0,perfectUntil:0,out:0,outUntil:0,first:false,ttl:Infinity,trail:[],sensor:false,held:null,inLane:false,unstuck:0,stuckTime:0,anchorX:x,anchorY:y,lastPerfectPulse:-100,...extra};}
 resetCounters(){this.combo=1;this.lastHit=-100;this.lastModule=-1;this.typeHits={};this.resonanceUntil=-100;this.resonanceReady=this.time;this.linkUntil=-100;this.linkReady=this.time;for(const m of this.mods){m.hits=0;m.charge=0;m.nextAction=this.time;m.lastAward=-100;m.lastExtra=-100;}this.masterUntil=-100;this.masterUsed=false;}
 beginCharge(){if(this.balls.length||this.time-this.emptySince<.5)return false;this.charging=true;this.chargeAt=this.time;this.manualAt=this.time;return true;}
 releaseCharge(){if(!this.charging)return false;const q=clamp((this.time-this.chargeAt)/.9,0,1);this.charging=false;return this.launch(q,true);}
 cancelCharge(){this.charging=false;}
 launch(q=.6,manual=false){if(this.balls.length)return false;this.resetCounters();this.runHits=0;this.runPerfect=0;this.runPoints=0;this.runStart=this.time;this.runManual=manual;this.manualTouched=manual;this.insured=false;this.lastPerfect=-100;this.lastQ=q;if(manual)this.manualAt=this.time;this.balls.push(this.newBall(401,624,0,-940-q*150,{inLane:true,launchQ:q,first:manual&&this.s('A4')>=3}));this.emit('launch',{manual,q});return true;}
 pulse(manual=true){if(manual){this.manualAt=this.time;this.manualTouched=true;}if(!this.balls.length||this.time-this.flipAt+1e-9<.25)return false;this.flipAt=this.time;this.flipManual=manual;this.emit('flip',{manual});return true;}
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
  if(b.perfect>0&&this.time<b.perfectUntil){mult*=1.25+.04*this.s('A1');b.perfect--;}
  if(!gate&&b.gate>0&&this.time<b.gateUntil){mult*=1.5;b.gate--;}
  if(b.out>0&&this.time<b.outUntil){mult*=1.25;b.out--;}
  if(b.first){mult*=1.5;b.first=false;}
  if(m.type==='bar'&&m.level>=5&&m.hits%5===0)mult*=2;
  if(this.s('B5')&&m.hits%10===0)mult*=1.25+.25*this.s('B5');
  if(this.time<this.masterUntil)mult*=1.5;
  if(m.id===this.linkTarget&&this.time<this.linkUntil){mult*=1.5;this.linkUntil=-100;this.emit('link',{x:m.x,y:m.y});}
  const res=this.time<this.resonanceUntil?1.3:1,base=TYPES[m.type],u=Math.pow(1.35,m.level-1),bo=this.bonus(m);
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
 perfectHit(b){if(b.lastPerfectPulse===this.flipAt)return;b.lastPerfectPulse=this.flipAt;b.perfect=3;b.perfectUntil=this.time+4;this.runPerfect++;this.lastPerfect=this.time;this.emit('perfect',{x:b.x,y:b.y,count:this.runPerfect});if(this.s('A7')&&this.runPerfect>=8&&!this.masterUsed){this.masterUsed=true;this.masterUntil=this.time+10;this.emit('master');}}
 integrate(dt){
  const flips=this.flippers();
  for(const b of [...this.balls]){
   if(b.dead)continue;if(this.time>b.ttl){b.dead=true;this.emit('expire',{x:b.x,y:b.y});continue;}
   b.px=b.x;b.py=b.y;
   if(b.held){const m=this.mods.find(m=>m.id===b.held.id);if(m){b.x=m.x;b.y=m.y;if(this.time>=b.held.until){b.vx=Math.cos(m.a)*580;b.vy=Math.sin(m.a)*580;b.x+=Math.cos(m.a)*31;b.y+=Math.sin(m.a)*31;if(m.level>=10){b.out=2;b.outUntil=this.time+3;}b.held=null;}else continue;}else b.held=null;}
   b.vy+=620*dt;b.vx*=Math.exp(-.035*dt);b.vy*=Math.exp(-.025*dt);const speed=Math.hypot(b.vx,b.vy);if(speed>1100){b.vx*=1100/speed;b.vy*=1100/speed;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.inLane&&b.y<136){b.inLane=false;b.x=399;b.y=134;b.vx=-300-180*(b.launchQ??.6);b.vy=-160-120*(b.launchQ??.6);this.emit('entry',{q:b.launchQ});}
   for(const wall of this.walls)this.resolveSegment(b,wall.a,wall.b,wall.r,wall.e);
   if(modifier(this.cfg.stage)===0&&b.vy<0&&b.py>276){if(b.x<146)this.resolveSegment(b,[41,276],[147,276],2,.9);if(b.x>262&&b.x<376)this.resolveSegment(b,[260,276],[376,276],2,.9);}
   if(!b.inLane){
    if(this.autoFlippers&&this.time-this.manualAt>=.3){const sensorY=603+Math.max(0,Math.min(b.x-109,300-b.x))*.376-20;if(b.y>sensorY&&b.y<646&&b.vy>35&&!b.sensor&&b.x>63&&b.x<351){b.sensor=true;const prob=Math.min(1,.91+.03*this.s('D2')+(this.cfg.shell==='ceramic'?.05:0));if(this.rng()<prob)this.pulse(false);}if(b.y<545||b.vy<-80)b.sensor=false;}
    for(const f of flips){const hit=this.resolveSegment(b,[f.x,f.y],[f.x2,f.y2],7,.55,f);if(hit&&hit.impact>12){const phase=this.time-this.flipAt;if(phase>=0&&phase<=.13&&b.y<630){b.vy=-Math.max(580+hit.u*140,Math.abs(b.vy));b.vx=f.side*(90+hit.u*220);if(this.flipManual&&phase<=.06+.01*this.s('A2'))this.perfectHit(b);this.emit('flipperHit',{x:b.x,y:b.y});}}}
    const contacts=new Set();
    for(const m of this.mods){
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
   if(b.stuckTime>3&&!b.held){b.stuckTime=0;b.unstuck++;if(b.unstuck%2){b.vx=(this.rng()-.5)*220;b.vy=-210;}else{b.x=401;b.y=620;b.vx=0;b.vy=-1040;b.inLane=true;b.launchQ=this.lastQ;b.contacts.clear();}this.emit('unstuck',{x:b.x,y:b.y});}
  }
  const had=this.balls.length;this.balls=this.balls.filter(b=>!b.dead);
  if(had&&!this.balls.length){let save=false;if(!this.insured){if(this.s('A6')&&this.runManual&&this.time-this.lastPerfect<=3)save=true;else if(this.s('D7')&&!this.manualTouched&&this.time-this.runStart<8)save=true;}if(save){this.insured=true;this.combo=1;this.lastModule=-1;this.lastHit=-100;this.balls.push(this.newBall(401,624,0,-1030,{inLane:true,launchQ:this.lastQ}));this.emit('insured');}else{this.emptySince=this.time;this.charging=false;this.emit('lost',{points:this.runPoints,hits:this.runHits,perfect:this.runPerfect,duration:this.time-this.runStart});this.resetCounters();}}
 }
 step(dt=STEP){this.time+=dt;if(this.time-this.lastHit>2+.3*this.s('A3')){this.combo=1;this.lastModule=-1;}
  if(!this.balls.length&&!this.charging&&this.auto&&this.cfg.completed>=3&&this.time-this.manualAt>=4&&this.time-this.emptySince>=2.5-.3*this.s('D1')){const profiles=(this.cfg.profiles.length?this.cfg.profiles:[this.lastQ]).slice(0,this.s('D4')?this.s('D4')+1:1);const q=profiles[this.profileIndex++%profiles.length];this.launch(q,false);}
  this.integrate(dt/2);this.integrate(dt/2);for(const m of this.mods){m.glow=Math.max(0,m.glow-dt*3);m.spin*=Math.exp(-dt*2.2);}if(!this.simulation)for(const b of this.balls){b.trail.push({x:b.x,y:b.y});if(b.trail.length>13)b.trail.shift();}
 }
 endRun(){if(this.balls.length)this.emit('lost',{points:this.runPoints,hits:this.runHits,perfect:this.runPerfect,duration:this.time-this.runStart,forced:true});this.balls=[];this.charging=false;this.emptySince=this.time;this.resetCounters();}
}
function calculateRate(s){if(s.completed<3)return 0;const cfg=engineConfig(s);cfg.auto=true;cfg.stageHits=0;const results=[];for(const seed of [4161,8087,12097]){const w=new PinballWorld(cfg,{seed,simulation:true});for(let i=0;i<60/STEP;i++)w.step();results.push(w.coinsEarned/60);}results.sort((a,b)=>a-b);return results[1];}
