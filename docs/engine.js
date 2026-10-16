/* Money Plane: deterministic flight simulation. No input changes a round's outcome. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MoneyPlane = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STEP = 1 / 120, MAX_WIN = 250;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rules = Object.freeze({speed: 575, lift: 260, gravity: 140, pickupLift: 260, bombKick: 90, trainSpeed: 115, cameraRate: 6.027, cameraAnchor: 271, ground: 520, roof: 424, wheelOffset: 11, maxWin: MAX_WIN});
  // World-height samples from the supplied recording, with its camera motion removed.
  // Cubic Hermite interpolation smooths the recording's duplicated/dropped frames.
  const launchHeights=[413,388,319,243,173,123,85,63];
  function launchMotion(t){
    const u=clamp(t/.2,0,7),i=Math.min(6,Math.floor(u)),q=u-i;
    const a=launchHeights[i],b=launchHeights[i+1];
    const tangent=k=>k===0?0:k===7?(launchHeights[7]-launchHeights[6])/.2:(launchHeights[k+1]-launchHeights[k-1])/.4;
    const m0=tangent(i)*.2,m1=tangent(i+1)*.2;
    const y=(2*q*q*q-3*q*q+1)*a+(q*q*q-2*q*q+q)*m0+(-2*q*q*q+3*q*q)*b+(q*q*q-q*q)*m1;
    const vy=((6*q*q-6*q)*a+(3*q*q-4*q+1)*m0+(-6*q*q+6*q)*b+(3*q*q-2*q)*m1)/.2;
    return {y,vy};
  }
  function create(seed) {
    const random = rng(seed), range = (a,b) => a + random() * (b-a);
    const flight = { seed, t: 0, state: 'flying', value: 1, hitCount: 0, cameraX: 0, cameraY: 0, plane: {x:392,y:413,vx:2000,vy:0,angle:0}, objects:[], trains:[], events:[], landing: null, launching: true };
    flight.trains.push({x:307,w:350,vx:rules.trainSpeed,launch:true});
    // All positions are generated at launch; render speed never changes collisions.
    for (let x=1220 + range(-150,230); x<15000; x += range(1070,1670)) flight.trains.push({x,w:350,vx:rules.trainSpeed,launch:false});
    for (let x=720; x<15200; x += range(90,160)) {
      const count = 4;
      for (let j=0;j<count;j++) {
        const roll = random();
        const type = roll < .42 ? 'bomb' : roll < .51 ? 'multiply' : 'add';
        const pick = random();
        const n = type==='bomb' ? 0 : type==='multiply' ? (pick<.5?2:pick<.73?3:pick<.9?4:pick<.97?6:10) : (pick<.35?1:pick<.65?2:pick<.82?3:pick<.92?4:pick<.97?5:pick<.99?6:10);
        flight.objects.push({x:x+range(-28,28),y:-475 + j*260 + range(-105,155),type,n,taken:false,id:flight.objects.length});
      }
    }
    return flight;
  }
  function hit(f,o) {
    o.taken=true; f.hitCount++; f.launching=false;
    const p=f.plane;
    if(o.type==='bomb') {
      // Reference rounds each halving to a tenth of the bet multiplier (.25 → .3).
      f.value=Math.max(.1,Math.round((f.value/2 + 1e-10)*10)/10);
      p.vy+=rules.bombKick;
    } else {
      f.value=Math.min(MAX_WIN,Math.round((o.type==='add'?f.value+o.n:f.value*o.n)*10)/10);
      p.vy=-rules.pickupLift;
      p.vx=Math.max(p.vx,rules.speed+200);
    }
    f.events.push({type:o.type,n:o.n,value:f.value,x:o.x,y:o.y,t:f.t});
  }
  function step(f, dt=STEP) {
    if(f.state!=='flying')return f;
    f.t+=dt;
    const p=f.plane, oldX=p.x, oldY=p.y;
    const previousTrains=f.trains.map(w=>w.x);
    for(const w of f.trains)w.x+=w.vx*dt;
    // Exact horizontal drag integration. The first launch has a brief speed burst.
    const drag=f.launching?2.5:3,decay=Math.exp(-drag*dt),extra=p.vx-rules.speed;
    p.x+=rules.speed*dt+extra*(1-decay)/drag;
    p.vx=rules.speed+extra*decay;
    if(f.launching&&f.t<=1.4){const motion=launchMotion(f.t);p.y=motion.y;p.vy=motion.vy;}
    else{f.launching=false;p.y+=p.vy*dt+.5*rules.gravity*dt*dt;p.vy+=rules.gravity*dt;}
    const desired=clamp(Math.atan2(p.vy,p.vx),-.5,1.1);
    p.angle+=(desired-p.angle)*(1-Math.exp(-12*dt));
    const dx=p.x-oldX,dy=p.y-oldY,len=dx*dx+dy*dy;
    const hits=[];
    for(const o of f.objects) {
      if(o.taken||o.x<oldX-42||o.x>p.x+42)continue;
      const u=clamp(((o.x-oldX)*dx+(o.y-oldY)*dy)/len,0,1);
      const ex=(oldX+dx*u-o.x)/38,ey=(oldY+dy*u-o.y)/22;
      if(ex*ex+ey*ey<=1)hits.push({o,u});
    }
    hits.sort((a,b)=>a.u-b.u||a.o.id-b.o.id);
    for(const {o} of hits)hit(f,o);
    if(p.vy>0&&oldY+rules.wheelOffset<=rules.roof&&p.y+rules.wheelOffset>=rules.roof&&f.t>.8) {
      const fraction=(rules.roof-rules.wheelOffset-oldY)/(p.y-oldY);
      const crossX=oldX+(p.x-oldX)*fraction;
      for(let i=0;i<f.trains.length;i++) {
        const w=f.trains[i],wx=previousTrains[i]+(w.x-previousTrains[i])*fraction;
        if(crossX>=wx+15&&crossX<=wx+w.w-15) {
          p.y=rules.roof-rules.wheelOffset;p.angle=0;p.vx=w.vx;p.vy=0;
          f.state='landed';f.landing=i;
          f.events.push({type:'landed',x:p.x,y:p.y,value:f.value,t:f.t});break;
        }
      }
    }
    if(f.state==='flying'&&p.y+rules.wheelOffset>=rules.ground) {
      p.y=rules.ground-rules.wheelOffset;p.vx=0;p.vy=0;f.state='crashed';
      f.events.push({type:'crashed',x:p.x,y:p.y,value:0,t:f.t});
    }
    return f;
  }
  function simulate(seed) {
    const f=create(seed);
    while(f.state==='flying')step(f);
    return {seed,payout:f.state==='landed'?f.value:0,duration:+f.t.toFixed(3),hits:f.hitCount,state:f.state};
  }
  return {STEP,MAX_WIN,rules,rng,create,step,simulate,hit,launchMotion};
});
