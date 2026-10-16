(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlaneRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
class Renderer {
 constructor(canvas,art){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.art=art;this.width=1102;this.height=548;this.cameraY=0;this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};}
 resize(w,h,dpr=1){this.width=w/h<1?720:1102;this.height=this.width*h/w;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
 trackCamera(f,dt,H=this.height){const desired=f?f.plane.y-(520-(H-28)+H*(271/548)):0;this.cameraY=Math.min(0,this.cameraY+(desired-this.cameraY)*(1-Math.exp(-6.027*dt)));return this.cameraY;}
 ready(key){const img=this.art[key];return img&&(img.naturalWidth||img.width)>0;}
 text(text,x,y,size,color='#fff',stroke='#15181b',weight='900') {const c=this.ctx;c.font=`${weight} ${size}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.strokeStyle=stroke;c.lineWidth=size*.14;c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
 featheredBackground(bg,w,h){
  if(this.featherSource!==bg||!this.featherCache){
   const surface=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');surface.width=w;surface.height=h;
   const ctx=surface.getContext('2d');ctx.drawImage(bg,0,0,w,h);ctx.globalCompositeOperation='destination-in';const mask=ctx.createLinearGradient(0,0,0,110);
   for(const u of [0,.25,.5,.75,1])mask.addColorStop(u,`rgba(0,0,0,${u*u*(3-2*u)})`);ctx.fillStyle=mask;ctx.fillRect(0,0,w,h);this.featherCache=surface;this.featherSource=bg;
  }
  return this.featherCache;
 }
 render(s){
  const c=this.ctx,W=this.width,H=this.height,f=s.flight,p=f?f.plane:{x:392,y:413,angle:0},t=s.time||0;
  c.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);c.clearRect(0,0,W,H);
  const camX=f?p.x-W*.355:392-W*.355;
  const camY=this.trackCamera(f,s.delta||1/60,H);
  const x=v=>v-camX,y=v=>H-28+v-520-camY;
  const altitude=clamp(-camY/600,0,1);
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,`rgb(${Math.round(13-4*altitude)},${Math.round(39-13*altitude)},${Math.round(43-12*altitude)})`);sky.addColorStop(1,'#304e50');c.fillStyle=sky;c.fillRect(0,0,W,H);
  const sceneryX=camX+(s.sceneryTravel||0),bw=1102,bh=548,by=H-bh-camY,offset=((sceneryX*.175)%bw+bw)%bw;
  if(this.ready('background')){const bg=this.art.background;for(let k=-1;k<3;k++){const bx=k*bw-offset;c.save();c.translate(bx,by);if(Math.abs(Math.floor(sceneryX*.175/bw)+k)%2){c.translate(bw,0);c.scale(-1,1);}c.drawImage(by>0?this.featheredBackground(bg,bw,bh):bg,-.5,0,bw+1,bh);c.restore();}}

  this.airships(s,sceneryX,camY);
  const gy=y(520);
  if(gy<H+10){c.fillStyle='#171b1a';c.fillRect(0,gy,W,H-gy);c.fillStyle='#181b1a';c.fillRect(0,gy-1,W,5);c.strokeStyle='#564d3c';c.lineWidth=4;c.beginPath();for(let a=-((sceneryX*1.05)%13);a<W;a+=13){c.moveTo(a,gy-3);c.lineTo(a+4,gy+7);}c.stroke();c.fillStyle='#b99c6b';c.fillRect(0,gy,W,1.5);c.fillStyle='#151b1c';c.fillRect(0,gy+4,W,2);}
  const trains=f?f.trains:[{x:307,w:350,launch:true}];
  for(let i=0;i<trains.length;i++){const w=trains[i],wx=x(w.x);if(wx>W+60||wx+590<0)continue;const wy=y(424);if(wy>H+150)continue;
   if(!w.launch&&f&&f.state!=='crashed')this.glow(wx+9,wy-2,w.w-18,t,f.state==='landed'&&f.landing===i?1.2:1);
   if(this.ready('train')){const im=this.art.train;c.drawImage(im,wx-11,wy-51,585,159);}
   this.trainWheels(wx,wy,t);
   // The camera follows the launch train before play; only scenery scrolls.
   if(f&&f.state==='landed'&&f.landing===i)this.glow(wx+12,wy,w.w-24,t,.35);
  }
  if(f){for(const o of f.objects){if(o.taken)continue;const ox=x(o.x),oy=y(o.y);if(ox< -30||ox>W+40||oy< -30||oy>H-12)continue;
    if(o.type==='bomb'){c.save();c.translate(ox,oy);if(!this.reducedMotion.matches)c.rotate(Math.sin(t*3+o.x*.02)*.04);if(this.ready('pigeon'))c.drawImage(this.art.pigeon,-24,-18,48,32);c.restore();this.text('÷2',ox,oy+22,14,'#e1c29d','#142425','700');}
    else {if(o.type==='multiply'){const glow=c.createRadialGradient(ox,oy,2,ox,oy,26);glow.addColorStop(0,'#fff0d275');glow.addColorStop(.3,'#d0a46c55');glow.addColorStop(1,'#ad794400');c.fillStyle=glow;c.fillRect(ox-26,oy-26,52,52);}this.text((o.type==='multiply'?'×':'')+o.n,ox,oy,o.type==='multiply'?25:26,o.type==='multiply'?'#f5d49a':'#f5efdd','#11272a');}
  }}
  const trail=s.trail||[];
  if(trail.length>1){c.lineWidth=1.6;c.strokeStyle='#a6d6c9';c.shadowColor='#8bc2b4';c.shadowBlur=3;c.beginPath();for(let i=0;i<trail.length;i++){const q=trail[i];if(!i||q.smoke||trail[i-1].smoke)c.moveTo(x(q.x),y(q.y));else c.lineTo(x(q.x),y(q.y));}c.stroke();c.shadowBlur=0;}
  for(const q of s.smoke||[]){const age=s.effectTime-q.born,life=1-age/2;if(life<=0)continue;c.globalAlpha=life*.25;c.fillStyle='#73736c';c.beginPath();c.arc(x(q.x)-age*7,y(q.y)-age*13,4+age*13,0,TAU);c.fill();c.globalAlpha=life*.15;c.beginPath();c.arc(x(q.x)-age*3,y(q.y)+4,3+age*10,0,TAU);c.fill();}c.globalAlpha=1;
  const crashed=f&&f.state==='crashed';
  if(!crashed){
   const px=x(p.x),py=y(p.y),boarding=s.phase==='boarding',u=boarding?clamp(s.boarding||0,0,1):0;
   const parked=!f||boarding;
   if(parked&&this.ready('pilot')){
    const reduced=this.reducedMotion.matches,ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
    const move=boarding?ease((u-.12)/.65):0;
    const pilotX=px-66+(reduced?0:move*50),pilotFeet=py+11-(reduced?0:Math.sin(move*Math.PI/2)*36);
    const alpha=boarding?1-ease((u-.64)/.25):1;
    c.save();c.globalAlpha=alpha;this.pilot(pilotX,pilotFeet,(W<800?126:112)*(1-move*.18),t);c.restore();
   }
   c.save();c.translate(px,py);c.rotate(p.angle||0);
   if(this.ready('aircraft'))c.drawImage(this.aircraft(s.gold),-76,-62,152,74);
   const seated=!parked?1:boarding?clamp((u-.60)/.26,0,1):0;
   if(seated&&this.ready('pilot')){c.save();c.globalAlpha=seated;this.pilotHead(-18,-68,29);c.restore();}
   c.strokeStyle='#f6e7c6bb';c.lineWidth=1.5;c.beginPath();c.ellipse(67,-28,1.6,this.reducedMotion.matches?18:19+Math.sin(t*95)*3,0,0,TAU);c.stroke();
   c.restore();
   c.save();c.translate(px,py-89);c.rotate((p.angle||0)*.3);this.text(((s.stake||2)*(f?f.value:1)).toFixed(2),0,0,22,'#fff2cf','#15272a');c.restore();
  }
  for(const q of s.effects||[])this.effect(q,s.effectTime,x,y);
  if(this.ready('logo')){
   const im=this.art.logo,ratio=(im.naturalHeight||im.height)/(im.naturalWidth||im.width);
   if(s.intro){const lw=W<800?430:H<380?H*.65:390,lh=lw*ratio,top=Math.max(W<800?160:24,H*.06);c.drawImage(im,W/2-lw/2,top,lw,lh);const ty=top+lh+23;this.text('WIN UP TO 250×',W/2,ty,23,'#f5dfac','#14272b','700');}
   else{c.globalAlpha=.28;const lw=180;c.drawImage(im,W/2-lw/2,18,lw,lw*ratio);c.globalAlpha=1;}
  }
 }

 surface(w,h){const result=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');result.width=w;result.height=h;return result;}
 aircraft(gold){
  const key=gold?'goldAircraft':'brightAircraft';if(this[key])return this[key];
  const im=this.art.aircraft,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,surface=this.surface(w+12,h+12),c=surface.getContext('2d');
  for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]])c.drawImage(im,6+dx,6+dy);
  c.globalCompositeOperation='source-in';c.fillStyle='#efdcb6';c.fillRect(0,0,w+12,h+12);c.globalCompositeOperation='source-over';
  c.filter=gold?'sepia(1) saturate(1.7) brightness(1.48)':'brightness(1.55) saturate(1.12)';c.drawImage(im,6,6);c.filter='none';
  this[key]=surface;return surface;
 }
 pilot(cx,feet,height,t){
  const im=this.art.pilot,c=this.ctx,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,width=height*w/h;
  const breath=this.reducedMotion.matches?0:Math.sin(t*TAU/3.1)*.7,left=cx-width/2,top=feet-height;
  // Head moves with the chest; boots stay fixed. No whole-sprite scale pulse.
  c.drawImage(im,0,0,w,h*.30,left,top-breath,width,height*.30);
  c.drawImage(im,0,h*.30,w,h*.36,left,top+height*.30-breath,width,height*.36+breath);
  c.drawImage(im,0,h*.66,w,h*.34,left,top+height*.66,width,height*.34);
 }
 pilotHead(cx,top,height){const im=this.art.pilot,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,crop=h*.235,width=height*w/crop;this.ctx.drawImage(im,0,0,w,crop,cx-width/2,top,width,height);}
 airships(s,camera,camY){
  if(!this.ready('airship'))return;const c=this.ctx,W=this.width,H=this.height,im=this.art.airship,ratio=(im.naturalHeight||im.height)/(im.naturalWidth||im.width),time=this.reducedMotion.matches?0:s.time||0;
  for(const [anchor,level,width,speed,alpha] of [[.16,.40,105,3,.29],[.71,.24,76,1.8,.22],[.92,.51,48,-1.2,.17]]){
   const span=W+width*2,xx=((anchor*W+time*speed-camera*.035+width)%span+span)%span-width,yy=Math.max(80,H*level+camY*.025);
   c.save();c.globalAlpha=alpha;c.drawImage(im,xx,yy,width,width*ratio);c.restore();
  }
 }
 trainWheels(x,y,t){
  const c=this.ctx,angle=this.reducedMotion.matches?0:t*7.8;
  c.save();c.strokeStyle='#e6c48688';c.lineWidth=.9;
  for(const [dx,dy,r] of [[46,80,14],[120,80,14],[194,80,14],[263,80,14],[322,80,14],[402,75,19],[447,73,21],[515,80,13]]){
   c.save();c.translate(x+dx,y+dy);c.scale(1,.83);c.rotate(angle);c.beginPath();for(let k=0;k<5;k++){const a=k*TAU/5;c.moveTo(Math.cos(a)*3,Math.sin(a)*3);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();c.restore();
  }
  const dx=Math.cos(angle)*6,dy=Math.sin(angle)*5;c.strokeStyle='#d1ad78';c.lineWidth=1.5;c.beginPath();c.moveTo(x+402+dx,y+75+dy);c.lineTo(x+447+dx,y+73+dy);c.stroke();c.restore();
 }
 glow(x,y,w,t,amount){const c=this.ctx;c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,y-82,0,y+4);g.addColorStop(0,'#fff8a900');g.addColorStop(.55,'#ffde6120');g.addColorStop(.9,'#ffdc8399');g.addColorStop(1,'#fffbe5e0');c.globalAlpha=amount;c.fillStyle=g;c.fillRect(x,y-82,w,86);for(let i=0;i<11;i++){const age=(t*.45+i*.137)%1,xx=x+((i*79.3)%w),hh=35+((i*19)%46);c.globalAlpha=(1-age)*amount*.65;const beam=c.createLinearGradient(0,y-hh,0,y);beam.addColorStop(0,'#fffacd00');beam.addColorStop(1,'#fff8cc');c.fillStyle=beam;c.fillRect(xx,y-hh,2+(i%3)*2,hh);c.fillStyle='#fffed0';c.beginPath();c.arc(xx+Math.sin(i+t)*6,y-age*90,1.4,0,TAU);c.fill();}c.restore();}
 effect(q,time,x,y){const c=this.ctx,age=time-q.born;if(age<0||age>1.6)return;const px=x(q.x),py=y(q.y);
  if(q.type==='bomb'||q.type==='crashed'){const big=q.type==='crashed',duration=big?1.2:.6,u=age/duration;if(u>1)return;for(let i=0;i<(big?22:10);i++){const angle=i*2.399,rr=(big?56:25)*u*(.5+(i%4)*.2),xx=px+Math.cos(angle)*rr,yy=py+Math.sin(angle)*rr-u*18,rad=(big?20:11)*(1-u)+2;c.globalAlpha=(1-u)*.85;const g=c.createRadialGradient(xx,yy,0,xx,yy,rad);g.addColorStop(0,'#fff4d9');g.addColorStop(.35,big?'#ffe6a5':'#a5d7cb');g.addColorStop(.65,'#c98c4d');g.addColorStop(1,'#553b2500');c.fillStyle=g;c.beginPath();c.arc(xx,yy,rad,0,TAU);c.fill();}c.globalAlpha=1;if(!big&&age<.75)this.text('÷2',px,py-age*80-33,24,'#e2b080','#382214');}
  else if(q.type==='add'||q.type==='multiply'){const u=age/1.1;if(u>1)return;c.globalAlpha=(1-u)*.8;c.strokeStyle='#c0d9ca';c.lineWidth=2;c.beginPath();c.arc(px,py,18+u*28,0,TAU);c.stroke();c.globalAlpha=1-u;this.text((q.type==='multiply'?'×':'+')+q.n,px,py-u*66-14,23,q.type==='multiply'?'#f1d79f':'#b5ddd1','#163331');c.globalAlpha=1;}
  else if(q.type==='landed'){/* The reference settles in the footer; retain only the amount over the aircraft. */}
 }
}
return Renderer;
});
