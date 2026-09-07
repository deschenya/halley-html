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
 settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 2-3-2-2 1-3-3-2-1-3z" transform="translate(2 0)"/><circle cx="12" cy="11.5" r="3"/>',
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
 gem:'<path d="m8 3 8 0 5 7-9 12L3 10zM3 10h18M8 3l-1 7 5 12 5-12-1-7"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.plus}</svg>`;}

function modIcon(type){
 const art={
 bar:'<g transform="rotate(-24 40 40)"><rect x="8" y="32" width="64" height="20" rx="10" fill="#d8a55e"/><rect x="8" y="27" width="64" height="20" rx="10" fill="#f3c578" stroke="#e5b26a" stroke-width="2"/><path d="M19 31h41" stroke="#fff0c8" stroke-width="3"/><circle cx="18" cy="37" r="3" fill="#d6a668"/><circle cx="62" cy="37" r="3" fill="#d6a668"/></g>',
 bumper:'<circle cx="40" cy="45" r="29" fill="#80b7a3"/><circle cx="40" cy="40" r="29" fill="#a2d9c5" stroke="#83c4af" stroke-width="2"/><circle cx="40" cy="38" r="22" fill="#daf1d9"/><circle cx="40" cy="38" r="17" fill="#80c6ac"/><path d="m40 27 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" fill="#eaf9e4" stroke="none"/><path d="M24 25q10-10 25-4" stroke="#f4fff0" stroke-width="3"/>',
 spinner:'<g transform="rotate(17 40 40)"><rect x="30" y="9" width="20" height="62" rx="10" fill="#d39583"/><rect x="9" y="33" width="62" height="20" rx="10" fill="#d39583"/><rect x="30" y="5" width="20" height="62" rx="10" fill="#f0b59e"/><rect x="9" y="29" width="62" height="20" rx="10" fill="#f5c3ad"/><circle cx="40" cy="37" r="12" fill="#fff3cc"/><circle cx="40" cy="37" r="5" fill="#d7b67b"/></g>',
 gate:'<path d="M14 61V29q0-14 15-14h22q15 0 15 14v32" fill="none" stroke="#ac91ca" stroke-width="14"/><path d="M14 56V25q0-14 15-14h22q15 0 15 14v31" fill="none" stroke="#d0b7e7" stroke-width="13"/><path d="M18 27q0-12 13-12h18" fill="none" stroke="#f2e2ff" stroke-width="3"/><path d="M40 32v28m-9-9 9 9 9-9" fill="none" stroke="#a785c1" stroke-width="5"/>',
 bank:'<rect x="13" y="17" width="54" height="52" rx="14" fill="#c9a061"/><rect x="13" y="11" width="54" height="52" rx="14" fill="#f5cf89" stroke="#e6bc77" stroke-width="2"/><rect x="21" y="18" width="38" height="36" rx="10" fill="#ffe8b7"/><path d="M30 23h20" stroke="#cfa964" stroke-width="4"/><circle cx="40" cy="39" r="10" fill="#edbf68"/><path d="M40 33v12m-4-3h7m-7-6h7" stroke="#fff0c3" stroke-width="2"/>',
 portal:'<ellipse cx="40" cy="45" rx="26" ry="32" fill="#a091c6"/><ellipse cx="40" cy="40" rx="26" ry="32" fill="#c3b3e7" stroke="#b2a0d8" stroke-width="2"/><ellipse cx="40" cy="39" rx="17" ry="24" fill="#e9dffa"/><ellipse cx="40" cy="39" rx="9" ry="16" fill="#bba9e2"/><path d="M25 24q10-13 20-9" fill="none" stroke="#f4eaff" stroke-width="3"/><circle cx="51" cy="57" r="4" fill="#f7e6be"/>',
 magnet:'<path d="M20 16v28a20 20 0 0 0 40 0V16" fill="none" stroke="#c08076" stroke-width="18"/><path d="M20 12v28a20 20 0 0 0 40 0V12" fill="none" stroke="#eca99c" stroke-width="17"/><path d="M20 12v12m40-12v12" stroke="#fff1dc" stroke-width="18"/><path d="M18 34v7q0 14 14 19" stroke="#f7cec0" stroke-width="3" fill="none"/>',
 multi:'<circle cx="40" cy="44" r="30" fill="#76abba"/><circle cx="40" cy="40" r="30" fill="#a8d2d9" stroke="#8abfca" stroke-width="2"/><circle cx="40" cy="25" r="11" fill="#eaf6ed" stroke="#8cbbc0" stroke-width="2"/><circle cx="26" cy="49" r="11" fill="#eaf6ed" stroke="#8cbbc0" stroke-width="2"/><circle cx="54" cy="49" r="11" fill="#eaf6ed" stroke="#8cbbc0" stroke-width="2"/><circle cx="37" cy="22" r="3" fill="#fff"/><circle cx="23" cy="46" r="3" fill="#fff"/><circle cx="51" cy="46" r="3" fill="#fff"/>'
 };
 return `<span class="mod-icon"><svg viewBox="0 0 80 80" aria-hidden="true" style="stroke:none">${art[type]||art.bar}</svg></span>`;
}

/* Pastel toy-board renderer. Visuals are fully vector; colliders remain in engine.js. */
class PinballRenderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
  this.particles=[];this.floats=[];this.lastTime=0;this.shake=0;this.cssW=0;this.cssH=0;this.dpr=1;this.playCssH=0;this.sx=1;this.sy=1;
 }
 resize(){
  const r=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  // v0.5: the visible canvas is already the safe gameplay rectangle between
  // the permanent top HUD and bottom navigation. Never stretch the table past
  // its phone width: X follows the 440-unit design width, while Y alone adapts
  // to the remaining screen height. Mapping the full 700-unit world to the
  // full canvas guarantees that the drain and both flippers remain visible.
  const playCssH=Math.max(1,r.height);
  if(this.cssW!==r.width||this.cssH!==r.height||this.dpr!==dpr||Math.abs(this.playCssH-playCssH)>.5){
   this.cssW=r.width;this.cssH=r.height;this.dpr=dpr;this.playCssH=playCssH;
   this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));
  }
  this.sx=this.cssW/W;this.sy=this.playCssH/H;
  this.canvas.dataset.playHeight=String(Math.round(this.playCssH));
 }
 screenToWorld(x,y){return{x:x/Math.max(.001,this.sx),y:y/Math.max(.001,this.sy)};}
 worldToScreen(x,y){return{x:x*this.sx,y:y*this.sy};}
 camera(){return{cssW:this.cssW,cssH:this.cssH,playCssH:this.playCssH,sx:this.sx,sy:this.sy};}
 event(e,s){
  if(e.type==='hit'&&s.prefs.motion){
   const color=TYPES[e.moduleType].color;
   for(let i=0;i<7;i++){const a=Math.random()*TAU,sp=24+Math.random()*75;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.42,max:.42,color,r:2+Math.random()*1.3});}
   if(e.moduleType==='bumper')this.shake=1.6;
  }
  if(e.type==='reward'&&(e.points||e.coins)){
   const zone=Math.floor(e.x/90)+','+Math.floor(e.y/90);const f=this.floats.find(f=>f.zone===zone&&f.life>.7);
   if(f){f.c+=e.coins;f.p+=e.points;}
   else this.floats.push({x:e.x,y:e.y-27,c:e.coins,p:e.points,life:1.05,max:1.05,zone,label:e.label});
  }
  if(e.type==='perfect'&&s.prefs.motion)for(let i=0;i<9;i++){const a=i*TAU/9;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*95,vy:Math.sin(a)*95,life:.6,max:.6,color:'#edb557',r:3});}
  if(this.particles.length>120)this.particles.splice(0,this.particles.length-120);
  if(this.floats.length>13)this.floats.splice(0,this.floats.length-13);
 }
 line(x,y,x2,y2,col,width=1){const c=this.ctx;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke();}
 circle(x,y,r,col,fill=false,width=1){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,TAU);c.lineWidth=width;if(fill){c.fillStyle=col;c.fill();}else{c.strokeStyle=col;c.stroke();}}
 round(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.stroke();}}
 text(t,x,y,size,col,align='center',weight=700){const c=this.ctx;c.font=`${weight} ${size}px "Trebuchet MS",Arial,sans-serif`;c.fillStyle=col;c.textAlign=align;c.textBaseline='middle';c.fillText(t,x,y);}
 arrow(x,y,a,col,len=19){this.line(x,y,x+Math.cos(a)*len,y+Math.sin(a)*len,col,2.3);const xx=x+Math.cos(a)*len,yy=y+Math.sin(a)*len;this.line(xx,yy,xx-Math.cos(a-.7)*7,yy-Math.sin(a-.7)*7,col,2.3);this.line(xx,yy,xx-Math.cos(a+.7)*7,yy-Math.sin(a+.7)*7,col,2.3);}
 star(x,y,r,col){const c=this.ctx;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.47:r;if(i===0)c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=col;c.fill();}
 module(m,w,{selected=false,output=false,editor=false}={}){
  const c=this.ctx,{x,y}=m,t=w.time,color=TYPES[m.type].color;
  if(selected){this.circle(x,y,43,'#78c4a732',true);c.setLineDash([3,5]);this.circle(x,y,40,'#60ab8e',false,1.8);c.setLineDash([]);}
  if(m.glow>0){c.globalAlpha=m.glow*.45;this.circle(x,y,38,color,true);c.globalAlpha=1;}
  c.save();c.translate(x,y);
  if(m.type==='bar'){
   c.rotate(m.a);this.round(-33,-3,66,14,7,'#cda66b');this.round(-33,-7,66,13,6.5,'#f2cc89','#ddbc7e');this.line(-23,-4,23,-4,'#fff1c8',2.3);
   this.circle(-26,0,2.6,'#cea66d',true);this.circle(26,0,2.6,'#cea66d',true);this.circle(-26,-1,1,'#fbe8b4',true);this.circle(26,-1,1,'#fbe8b4',true);
  }else if(m.type==='bumper'){
   this.circle(0,4,25,'#7fbaa1',true);this.circle(0,0,25,'#a8d9bd',true);this.circle(0,-1,21,'#e1f0cb',true);this.circle(0,-2,15.5,'#7ec5a4',true);
   this.star(0,-3,9,'#eef8d8');this.line(-12,-19,0,-22,'#f3ffe2',2);
  }else if(m.type==='spinner'){
   c.rotate(m.a+m.spin*.13);this.round(-7,-25,14,53,7,'#cd9e82');this.round(-25,-4,50,14,7,'#cd9e82');this.round(-7,-28,14,53,7,'#efbb9e');this.round(-25,-7,50,14,7,'#f5c9ad');
   this.circle(0,0,9,'#fff2ce',true);this.circle(0,0,3.5,'#d4ae73',true);c.rotate(-m.a-m.spin*.13);
   this.text(`${m.charge}/${m.level>=5?3:4}`,0,38,10,'#bf9b6c');
  }else if(m.type==='gate'){
   c.rotate(m.a-Math.PI/2);
   this.line(-29,12,-29,-10,'#b8a0cd',11);this.line(29,12,29,-10,'#b8a0cd',11);this.line(-29,-10,29,-10,'#b8a0cd',11);
   this.line(-29,8,-29,-13,'#d5c1e8',10);this.line(29,8,29,-13,'#d5c1e8',10);this.line(-29,-13,29,-13,'#d5c1e8',10);this.line(-24,-17,24,-17,'#eee2f8',2);
   this.arrow(0,-3,Math.PI/2,'#b89ccc',17);c.rotate(-m.a+Math.PI/2);this.text('×1,5',0,33,11,'#a58abc');
  }else if(m.type==='bank'){
   this.round(-22,-16,44,43,11,'#c8a266');this.round(-22,-21,44,43,11,'#f3cf8d','#ddba7e');this.round(-17,-16,34,30,7,'#ffebba');this.line(-8,-11,8,-11,'#cdaa70',3);
   this.circle(0,1,8.5,'#e8bc68',true);this.line(0,-4,0,6,'#fff1c8',2);this.line(-3,3,3,3,'#fff1c8',2);
   const n=m.level>=5?4:5;for(let i=0;i<n;i++)this.circle(-17+i*(34/(n-1)),32,2.8,i<m.charge?'#d7a45a':'#d8d3bf',true);
  }else if(m.type==='portal'){
   c.rotate(m.a+Math.PI/2);c.beginPath();c.ellipse(0,3,20,28,0,0,TAU);c.fillStyle='#a296c5';c.fill();c.beginPath();c.ellipse(0,0,20,28,0,0,TAU);c.fillStyle='#c6b6e6';c.fill();c.beginPath();c.ellipse(0,-1,13,21,0,0,TAU);c.fillStyle='#ece0fa';c.fill();c.beginPath();c.ellipse(0,-1,6.5,13,0,0,TAU);c.fillStyle='#bbabe1';c.fill();
   const a=t*.7;this.circle(Math.cos(a)*14,Math.sin(a)*22,3,'#fff0c8',true);c.rotate(-m.a-Math.PI/2);
   if(output)this.arrow(Math.cos(m.a)*26,Math.sin(m.a)*26,m.a,'#a995c6',12);this.text(output?'ВЫХОД':'ВХОД',0,39,8,'#b1a1c8');
  }else if(m.type==='magnet'){
   c.rotate(m.a+Math.PI/2);c.beginPath();c.moveTo(-15,-15);c.lineTo(-15,2);c.arc(0,2,15,Math.PI,0,true);c.lineTo(15,-15);c.strokeStyle='#c1877d';c.lineWidth=13;c.stroke();c.translate(0,-3);c.strokeStyle='#edb3a4';c.lineWidth=12;c.stroke();this.line(-15,-15,-15,-7,'#fff0d7',13);this.line(15,-15,15,-7,'#fff0d7',13);c.translate(0,3);this.arrow(0,-6,-Math.PI/2,'#ce9b8e',15);c.rotate(-m.a-Math.PI/2);
   if(w.time<m.nextAction)this.text(`${Math.ceil(m.nextAction-w.time)}с`,0,37,10,'#b18d7f');
  }else if(m.type==='multi'){
   this.circle(0,4,24,'#7dabb6',true);this.circle(0,0,24,'#add7dc',true);this.circle(0,-1,19,'#cde7e5',true);
   for(let i=0;i<3;i++){const a=-Math.PI/2+i*TAU/3,px=Math.cos(a)*11,py=Math.sin(a)*11;this.circle(px,py+1,7,'#88b3b8',true);this.circle(px,py-1,6.5,'#f3f8ec',true);this.circle(px-2,py-3,1.8,'#ffffff',true);}
   const pct=w.time<m.nextAction?1-(m.nextAction-w.time)/w.cd(20):m.charge/(m.level>=5?16:20);
   c.beginPath();c.arc(0,0,29,-Math.PI/2,-Math.PI/2+TAU*clamp(pct,0,1));c.strokeStyle='#73acb6';c.lineWidth=2.7;c.stroke();
   this.text(w.time<m.nextAction?`${Math.ceil(m.nextAction-w.time)}с`:`${m.charge}/${m.level>=5?16:20}`,0,41,9,'#83a4a5');
  }
  c.restore();
  if(!output){const lx=x+(m.type==='bar'?23:24),ly=y-(m.type==='bar'?17:25);this.round(lx-11,ly-7,23,14,5,'#fff9eccc','#d6d6bc');this.text(`${m.level}`,lx+.5,ly,9,'#ac987a');}
 }
 draw(w,s,ui){
  this.resize();if(this.cssW<1||this.cssH<1)return;
  const c=this.ctx,dt=clamp(w.time-this.lastTime,0,.05);this.lastTime=w.time;
  const themes=[['#e7f3e8','#dceee5'],['#f1eaf7','#eae3f4'],['#e9f3f7','#dfeef2'],['#fff0e5','#f6e6db'],['#e6f1e7','#d9ecdc'],['#f1edf8','#e7e3f0']];
  const bgc=themes[Math.floor((s.stage-1)/5)%6];
  // Paint the entire phone first. The lower apron remains visible behind the
  // controls even though physics is mapped only to playCssH.
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.lineCap='round';c.lineJoin='round';
  const screenBg=c.createLinearGradient(0,0,0,this.cssH);screenBg.addColorStop(0,bgc[0]);screenBg.addColorStop(1,bgc[1]);c.fillStyle=screenBg;c.fillRect(0,0,this.cssW,this.cssH);
  if(this.playCssH<this.cssH){c.fillStyle='#ffffff18';c.fillRect(0,this.playCssH,this.cssW,this.cssH-this.playCssH);c.fillStyle='#b3cab522';c.fillRect(0,this.playCssH-1,this.cssW,2);}
  c.setTransform(this.canvas.width/W,0,0,this.playCssH*this.dpr/H,0,0);
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,bgc[0]);bg.addColorStop(1,bgc[1]);c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.save();if(this.shake>0&&s.prefs.motion){c.translate(Math.sin(w.time*125)*this.shake,Math.cos(w.time*137)*this.shake);this.shake=Math.max(0,this.shake-dt*16);}
  for(let y=73;y<669;y+=27)for(let x=42;x<388;x+=27)this.circle(x,y,.85,'#a9c8b130',true);
  this.circle(209,289,151,'#ffffff37',true);this.circle(209,289,151,'#b4d1b738',false,1.5);
  c.setLineDash([2,12]);this.circle(209,289,127,'#adc9b145');c.setLineDash([]);
  // Tiny decorative stars are not physical targets.
  this.star(81,169,6,'#bfd9b754');this.star(327,214,4,'#b4d1b456');this.star(103,451,5,'#b4d1b448');
  for(const wall of w.walls){
   this.line(wall.a[0],wall.a[1]+5,wall.b[0],wall.b[1]+5,'#a1b5ab',wall.r*2+7);
   this.line(...wall.a,...wall.b,'#b4c8b9',wall.r*2+7);
   this.line(...wall.a,...wall.b,'#fdf6e5',wall.r*2+2);
   this.line(wall.a[0]-1,wall.a[1]-2,wall.b[0]-1,wall.b[1]-2,'#fffff5',2);
  }
  for(const tri of [[[46,508],[62,550],[97,591]],[[360,508],[344,550],[313,591]]]){
   c.beginPath();c.moveTo(...tri[0]);c.lineTo(...tri[1]);c.lineTo(...tri[2]);c.closePath();c.fillStyle='#b4d5bc';c.fill();c.lineWidth=2;c.strokeStyle='#e8f6dd';c.stroke();
  }
  this.star(209,73,9,'#c6ddad');this.text('К А С К А Д',209,96,11,'#a7c3aa','center',900);
  this.text(s.stage>30?'ЭКСПЕДИЦИЯ':'СОБЕРИ СВОЮ ИСТОРИЮ',209,113,6.7,'#b1c6ae');
  if(modifier(s.stage)===0)for(const [x1,x2] of [[41,147],[260,376]]){c.setLineDash([4,5]);this.line(x1,276,x2,276,'#bba4c8',2);c.setLineDash([]);this.arrow((x1+x2)/2,256,Math.PI/2,'#bba4c8',16);}
  const editor=ui.view==='workshop',slots=w.slots,n=slotCount(s),used=occupied(s),chosen=s.inventory.find(m=>m.id===ui.selected);
  if(editor&&chosen&&(active(s).B3||active(s).B6)){
   const pos=slots[chosen.slot];if(pos)for(const m of w.mods)if(m.id!==chosen.id&&Math.hypot(m.x-pos.x,m.y-pos.y)<=135){c.setLineDash([4,5]);this.line(pos.x,pos.y,m.x,m.y,'#82b2a0',1.5);c.setLineDash([]);}
  }
  if(s.link&&active(s).B6){const a=w.mods.find(m=>m.id===s.link.from),b=w.mods.find(m=>m.id===s.link.to);if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<=135){this.line(a.x,a.y,b.x,b.y,w.time<w.linkUntil?'#67b394':'#b3c9b2',2);this.arrow((a.x+b.x)/2,(a.y+b.y)/2,Math.atan2(b.y-a.y,b.x-a.x),'#7faf94',10);}}
  for(let i=0;i<n;i++){
   const p=slots[i];if(!used.has(i)){this.circle(p.x,p.y,editor?25:19,editor?'#e6f3e3':'#d2e6d732',true);c.setLineDash([3,5]);this.circle(p.x,p.y,editor?25:19,editor?'#9fc9a9':'#b2ccba',false,1.4);c.setLineDash([]);this.line(p.x-4,p.y,p.x+4,p.y,'#a8c6ad',1.6);this.line(p.x,p.y-4,p.x,p.y+4,'#a8c6ad',1.6);}
   if(editor){this.text(String(i+1),p.x,p.y+39,10,'#7d9f87');if(ui.slot===i){this.circle(p.x,p.y,33,'#6ab79a',false,2);}}
  }
  for(const m of w.mods){
   if(s.completed>=10&&(s.mastery[m.type]||0)>=500){this.circle(m.x,m.y,34,'#d7c99766');this.star(m.x-25,m.y-23,4,'#d1b775');}
   this.module(m,w,{selected:editor&&m.id===ui.selected,editor});if(m.type==='portal'&&m.slot2>=0){const out=slots[m.slot2];if(out)this.module({...m,...out},w,{selected:editor&&m.id===ui.selected,output:true,editor});}
  }
  for(const f of w.flippers()){
   this.line(f.x,f.y+5,f.x2,f.y2+5,'#c68f76',19);
   this.line(f.x,f.y,f.x2,f.y2,'#e3ad8e',19);
   this.line(f.x,f.y-2,f.x2,f.y2-2,'#f6cfac',14);
   this.line(f.x+f.side*8,f.y-6,f.x2-f.side*3,f.y2-6,'#fff0cf',2.5);
   this.circle(f.x,f.y,10,'#d8a381',true);this.circle(f.x,f.y-1,6,'#fff0d4',true);this.circle(f.x,f.y-1,2.3,'#c3aa87',true);
  }
  this.round(143,651,122,21,10,'#b5cfba36');
  this.text('ТАП = ТОЧНЫЙ ОТБИВ',204,662,8,'#91af97', 'center',800);
  this.line(151,687,185,687,'#b9cdb7',1.5);this.line(223,687,257,687,'#b9cdb7',1.5);this.star(204,687,4,'#b5cbae');
  const charge=w.charging?(w.chargeUI??clamp((w.time-w.chargeAt)/.9,0,1)):0,springTop=649+charge*18;
  this.line(393,springTop+2,409,springTop+2,'#b8a484',5);this.line(393,springTop,409,springTop,'#e6caa0',5);
  c.beginPath();c.moveTo(401,springTop+4);for(let i=1;i<=10;i++)c.lineTo(401+(i%2?6:-6),springTop+4+(679-springTop-4)*i/10);c.strokeStyle='#acb9a0';c.lineWidth=2;c.stroke();this.line(393,684,409,684,'#c3b89c',3);
  if(!w.balls.length&&!editor){this.ball({x:401,y:springTop-16,r:7.2,trail:[],ttl:Infinity,perfect:0,gate:0,out:0},s,w,1);if(charge){this.line(409,624,409,624-charge*340,'#edbe66',4);this.text(Math.round(charge*100)+'%',399,594,9,'#af9b6f');}}
  if(w.s('A4')>=1)this.line(388,649+w.lastQ*18,394,649+w.lastQ*18,'#c9a271',2);
  if(w.charging&&w.s('A4')>=2){c.setLineDash([3,6]);this.line(399,130,220-charge*80,105,'#84b699');c.setLineDash([]);c.beginPath();c.ellipse(220-charge*80,105,32,18,0,0,TAU);c.fillStyle='#79ba9f33';c.fill();}
  for(const b of w.balls)this.ball(b,s,w,1);
  for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;c.globalAlpha=Math.max(0,p.life/p.max);this.circle(p.x,p.y,p.r||2,p.color,true);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(const f of this.floats){f.life-=dt;f.y-=21*dt;c.globalAlpha=clamp(f.life*2.3,0,1);const x=clamp(f.x,60,341);
   if(f.p>0){c.font='900 14px "Trebuchet MS",Arial';const width=c.measureText('+'+fmt(f.p)).width;this.round(x-width/2-7,f.y-10,width+14,20,8,'#fffff1d9');this.text('+'+fmt(f.p),x,f.y,14,'#699c7c','center',900);}
   if(f.c>0)this.text('+'+dec(f.c)+' ●',x,f.y+(f.p>0?18:0),10,'#b68d48','center',800);if(f.label)this.text(f.label,x,f.y-20,8,'#ac965e');
  }
  c.globalAlpha=1;this.floats=this.floats.filter(f=>f.life>0);c.restore();
 }
 ball(b,s,w,alpha=1){
  const c=this.ctx;c.save();c.globalAlpha=alpha;const shell=s.activeShell||'steel',col={steel:'#a7c4d0',brass:'#eec173',ruby:'#eaa6a6',ceramic:'#c6bee6'}[shell];
  if(b.trail?.length>1)for(let i=1;i<b.trail.length;i++){const a=b.trail[i-1],p=b.trail[i];this.line(a.x,a.y,p.x,p.y,`rgba(107,157,168,${i/b.trail.length*.22})`,1.5+i/b.trail.length*5);}
  this.circle(b.x+2,b.y+4,b.r+1,'#648a7650',true);
  const g=c.createRadialGradient(b.x-3,b.y-3,.3,b.x,b.y,b.r);g.addColorStop(0,'#ffffff');g.addColorStop(.35,col);g.addColorStop(1,'#7896a4');this.circle(b.x,b.y,b.r,g,true);this.circle(b.x,b.y,b.r,'#6d93a133',false,1);this.circle(b.x-2.4,b.y-2.7,1.8,'#fff',true);
  let r=11;if(b.perfect>0&&w.time<b.perfectUntil){this.circle(b.x,b.y,r,'#d7ad62',false,1.6);r+=3;}if(b.gate>0&&w.time<b.gateUntil){this.circle(b.x,b.y,r,'#b395d3',false,1.6);r+=3;}if(b.out>0&&w.time<b.outUntil)this.circle(b.x,b.y,r,'#68ae93',false,1.6);
  if(Number.isFinite(b.ttl)){c.setLineDash([2,3]);this.circle(b.x,b.y,10,'#8eb7ac');c.setLineDash([]);}c.restore();
 }
}
