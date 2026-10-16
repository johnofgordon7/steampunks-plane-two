'use strict';
(() => {
const $=s=>document.querySelector(s), E=MoneyPlane;
const KEY='money-plane-flight-v3', stakes=[10,20,50,100,200,500,1000,2000,5000,10000];
const fresh=()=>({balance:500000,stake:200,collected:0,sound:true,quick:false,pending:null,rounds:0});
let saved;try{saved=JSON.parse(localStorage.getItem(KEY))||fresh();}catch{saved=fresh();}
if(!Number.isSafeInteger(saved.balance)||saved.balance<0||!stakes.includes(saved.stake))saved=fresh();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
const money=cents=>(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
let sessionStartBalance=saved.balance;const sessionStarted=Date.now();
let model,ready=false,flight=null,selected=null,phase='idle',intro=true,fastFinish=false,autoRemaining=0,chosenRounds=10,settleDelay=0,wallTime=0,effectTime=0,last=0,accumulator=0,trailClock=0,smokeUntil=0,smokeClock=0,eventIndex=0,toastTimer;
let trail=[],smoke=[],effects=[];
let boardingElapsed=0,sceneryTravel=0;
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
const boardingDuration=()=>motionPreference.matches ? .16 : 1.05;
const art={},renderer=new PlaneRenderer($('#world'),art);
const assets=[['background','spx-background-v3.webp'],['aircraft','spx-aircraft.webp'],['train','spx-train.webp'],['pigeon','spx-pigeon.webp'],['logo','spx-logo.webp'],['pilot','spx-pilot.webp'],['airship','spx-airship.webp']];
function resize(){const r=$('#world').getBoundingClientRect();renderer.resize(r.width,r.height,Math.min(devicePixelRatio||1,2));}
new ResizeObserver(resize).observe($('.scene'));resize();
class AudioEngine{
 constructor(){this.enabled=saved.sound!==false;this.ctx=null;this.buffers={};}
 unlock(){if(!this.enabled)return;try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.34;this.master.connect(this.ctx.destination);this.motor=this.ctx.createOscillator();this.motor.type='sawtooth';this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=240;this.motorGain=this.ctx.createGain();this.motorGain.gain.value=0;this.motor.connect(this.filter).connect(this.motorGain).connect(this.master);this.motor.start();this.pulse=this.ctx.createOscillator();this.pulse.frequency.value=18;this.pulseGain=this.ctx.createGain();this.pulseGain.gain.value=.008;this.pulse.connect(this.pulseGain).connect(this.motorGain.gain);this.pulse.start();this.loadSamples();}this.ctx.resume().catch(()=>{});}catch{}}
 loadSamples(){for(const [key,file] of [['engine','engine-loop.mp3'],['bomb','bomb-hit.mp3'],['pickup','pickup.mp3']]){fetch('assets/'+file).then(r=>{if(!r.ok)throw Error('Sound unavailable');return r.arrayBuffer();}).then(bytes=>this.ctx.decodeAudioData(bytes)).then(buffer=>{this.buffers[key]=buffer;}).catch(()=>{});}}
 sample(key,rate=1,volume=.5){if(!this.ctx||!this.enabled||!this.buffers[key])return false;const src=this.ctx.createBufferSource(),gain=this.ctx.createGain();src.buffer=this.buffers[key];src.playbackRate.value=rate;gain.gain.value=volume;src.connect(gain).connect(this.master);src.start();return true;}
 set(enabled){this.enabled=enabled;if(this.ctx)this.master.gain.setTargetAtTime(enabled?.34:0,this.ctx.currentTime,.05);if(enabled)this.unlock();}
 update(active,angle){if(!this.ctx)return;const a=this.ctx;if(this.buffers.engine&&!this.sampleMotor){this.sampleMotor=a.createBufferSource();this.sampleMotor.buffer=this.buffers.engine;this.sampleMotor.loop=true;this.sampleMotorGain=a.createGain();this.sampleMotorGain.gain.value=0;this.sampleMotor.connect(this.sampleMotorGain).connect(this.master);this.sampleMotor.start();}if(this.sampleMotor){this.sampleMotor.playbackRate.setTargetAtTime(1-angle*.16,a.currentTime,.12);this.sampleMotorGain.gain.setTargetAtTime(active&&this.enabled?.28:0,a.currentTime,.15);}this.motor.frequency.setTargetAtTime(active?72-angle*22:45,a.currentTime,.15);this.motorGain.gain.setTargetAtTime(active&&this.enabled&&!this.sampleMotor?.043:0,a.currentTime,.12);} 
 note(freq,duration=.12,level=.17){if(!this.ctx||!this.enabled)return;const a=this.ctx,t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.02);}
 noise(big=false){if(!this.ctx||!this.enabled)return;const a=this.ctx,d=big?.65:.23,n=a.sampleRate*d,b=a.createBuffer(1,n,a.sampleRate),v=b.getChannelData(0);for(let i=0;i<n;i++)v[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const src=a.createBufferSource(),filter=a.createBiquadFilter(),g=a.createGain();filter.type='lowpass';filter.frequency.value=big?750:1500;g.gain.value=big?.7:.3;src.buffer=b;src.connect(filter).connect(g).connect(this.master);src.start();this.note(big?45:85,d,.22);}
 event(type){if(type==='bomb'||type==='crashed'){if(!this.sample('bomb',type==='crashed'?.82:1,type==='crashed'?.85:.55))this.noise(type==='crashed');}else if(type==='landed'){this.sample('pickup',.85,.8);this.note(523,.35);setTimeout(()=>this.note(659,.35),90);setTimeout(()=>this.note(784,.5),180);}else if(!this.sample('pickup',type==='multiply'?1.3:1,.45))this.note(type==='multiply'?1047:784,.18,.15);}
}
const sound=new AudioEngine();
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2800);}
function hud(){
 $('#stake').textContent=money(saved.stake);$('#balance').textContent=money(saved.balance);
 $('#stakeFooter').textContent=money(saved.stake);$('#stakeValueFill').style.width=(stakes.indexOf(saved.stake)/(stakes.length-1)*100)+'%';
 const sessionNet=saved.balance-sessionStartBalance;$('#sessionResult').textContent=(sessionNet>0?'+':sessionNet<0?'-':'')+money(Math.abs(sessionNet))+' FUN';$('#sessionResult').classList.toggle('negative',sessionNet<0);
 $('#collection').textContent=Math.min(1000,saved.collected)+' / 1000';$('#progressFill').style.width=Math.min(100,saved.collected/10)+'%';
 $('#quick').classList.toggle('on',!!saved.quick);$('#quick').setAttribute('aria-pressed',String(!!saved.quick));$('#quick').setAttribute('aria-label',saved.quick?'Disable quickspin':'Enable quickspin');
 $('#quickSetting').checked=!!saved.quick;$('#soundSetting').checked=saved.sound!==false;
 const busy=phase!=='idle';for(const id of ['minus','plus','betReadout','resetDemo'])$('#'+id).disabled=busy;
 if(!busy){$('#minus').disabled=saved.stake===stakes[0];$('#plus').disabled=saved.stake===stakes.at(-1);}
 $('#spin').disabled=!ready||(phase==='settling'&&autoRemaining<=0);$('.spin-icon').style.display=busy?'none':'';$('.stop-icon').hidden=!busy;$('#spin').classList.toggle('autoplay',autoRemaining>0);
 $('#spin').classList.toggle('running',busy);
 $('#spin').setAttribute('aria-label',autoRemaining>0?'Stop autoplay after this flight':busy?'Finish current flight':'Start flight');
 $('#spin').title=autoRemaining>0?'Stop autoplay':busy?'Finish flight':'Start flight (Space)';
 $('#autoCount').hidden=autoRemaining<=0;$('#autoCount').textContent=autoRemaining;
 $('#auto').disabled=!ready||busy;$('#auto').setAttribute('aria-label',autoRemaining>0?'Stop autoplay':'Autoplay');
 $('#progression').hidden=true;$('#startHint').hidden=!intro;
}
function random(){const n=new Uint32Array(1);crypto.getRandomValues(n);return n[0]/4294967296;}
function chooseOutcome(){const r=random(),out=model.outcomes;let lo=0,hi=out.length-1;while(lo<hi){const m=(lo+hi)>>>1;if(r<out[m][2])hi=m;else lo=m+1;}return out[lo];}
function launch(){
 if(!ready||phase!=='idle')return;
 if(saved.balance<saved.stake){autoRemaining=0;hud();toast('Insufficient demo credits. Reset your balance in Settings.');return;}
 sound.unlock();selected=chooseOutcome();flight=E.create(selected[0]);phase='boarding';boardingElapsed=0;intro=false;fastFinish=false;accumulator=0;trail=[];smoke=[];effects=[];eventIndex=0;trailClock=0;smokeClock=0;smokeUntil=0;
 saved.balance-=saved.stake;saved.rounds++;saved.pending={seed:selected[0],stake:saved.stake,id:saved.rounds};persist();
 if(autoRemaining>0)autoRemaining--;
 $('#status').textContent='Pilot boarding. Flight '+saved.rounds+'. Bet '+money(saved.stake)+' demo credits.';hud();
}
function stopAuto(){autoRemaining=0;hud();}
function complete(){
 if(phase!=='flying')return;
 phase='settling';settleDelay=flight.state==='landed'?1.15:.9;fastFinish=false;
 const payout=flight.state==='landed'?Math.round(saved.stake*flight.value):0;
 saved.balance+=payout;saved.pending=null;saved.collected+=flight.hitCount;persist();
 $('#win').textContent=money(payout);$('#status').textContent=flight.state==='landed'?'Landed. Won '+money(payout)+' demo credits.':'Plane crashed. No win.';
 hud();
}
function processEvents(){while(eventIndex<flight.events.length){const ev=flight.events[eventIndex++];effects.push({...ev,born:effectTime,amount:money(Math.round(saved.stake*ev.value))});sound.event(ev.type);if(ev.type==='bomb')smokeUntil=effectTime+2.1;if(ev.type==='add'||ev.type==='multiply')smokeUntil=Math.max(effectTime+.2,smokeUntil-.3);}}
function tick(dt){
 effectTime+=dt;
 if(phase==='flying'){
   E.step(flight,dt);processEvents();trailClock+=dt;smokeClock+=dt;
   if(trailClock>=1/60){trailClock=0;trail.push({x:flight.plane.x-30,y:flight.plane.y-2,smoke:effectTime<smokeUntil});if(trail.length>210)trail.shift();}
   if(effectTime<smokeUntil&&smokeClock>=.04){smokeClock=0;smoke.push({x:flight.plane.x-29,y:flight.plane.y,born:effectTime});}
   if(flight.state!=='flying')complete();
 }
 smoke=smoke.filter(q=>effectTime-q.born<2);effects=effects.filter(q=>effectTime-q.born<1.7);
}
function frame(now){if(document.hidden){last=0;requestAnimationFrame(frame);return;}const elapsed=last?Math.min((now-last)/1000,.05):0;last=now;wallTime+=elapsed;
 if((phase==='idle'||phase==='boarding')&&!motionPreference.matches)sceneryTravel+=E.rules.trainSpeed*elapsed;
 if(phase==='boarding'){boardingElapsed+=elapsed*(saved.quick?1.75:1);if(boardingElapsed>=boardingDuration()){phase='flying';accumulator=0;$('#status').textContent='Flight '+saved.rounds+' in progress.';hud();}}
 if(phase==='flying'){const speed=fastFinish?16:saved.quick?3:1;accumulator+=elapsed*speed;let steps=0;while(accumulator>=E.STEP&&phase==='flying'&&steps++<150){tick(E.STEP);accumulator-=E.STEP;}}
 else{effectTime+=elapsed;if(phase==='settling'){
  settleDelay-=elapsed*(saved.quick?2:1);
  if(flight.state==='landed'){for(const w of flight.trains)w.x+=w.vx*elapsed;flight.plane.x+=flight.plane.vx*elapsed;}
  if(settleDelay<=0){flight=null;phase='idle';trail=[];smoke=[];effects=[];renderer.cameraY=0;hud();if(autoRemaining>0&&!document.querySelector('dialog[open]'))launch();else if(autoRemaining>0)stopAuto();}
 }}
 sound.update(phase==='flying',flight?.plane.angle||0);
 renderer.render({flight,phase,boarding:phase==='boarding'?Math.min(1,boardingElapsed/boardingDuration()):null,sceneryTravel,intro,delta:elapsed*(phase==='flying'?(fastFinish?16:saved.quick?3:1):1),time:wallTime,effectTime,stake:saved.stake/100,gold:saved.collected>=1000,trail,smoke,effects});
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function setStake(cents){if(phase!=='idle')return;saved.stake=cents;persist();hud();}
function openDialog(dialog,trigger){dialog.returnFocus=trigger;dialog.showModal();}
function showManualPanel(tab){const isRules=tab==='rules';$('#rulesPanel').hidden=!isRules;$('#settingsPanel').hidden=isRules;$('#manualTitle').textContent=isRules?'GAME RULES':'SETTINGS';document.querySelectorAll('[data-tab]').forEach(x=>{const selected=x.dataset.tab===tab;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});}
function openManual(tab,trigger){stopAuto();showManualPanel(tab);openDialog($('#manual'),trigger);}
function positionStakePopup(){const popup=$('#betDialog');if(!popup.open)return;const trigger=$('#betReadout').getBoundingClientRect(),viewWidth=window.innerWidth,viewHeight=window.innerHeight,width=Math.min(290,viewWidth-20),above=trigger.top-22,below=viewHeight-trigger.bottom-22,placeAbove=above>=150||above>=below,height=Math.min(256,Math.max(100,placeAbove?above:below));popup.style.width=width+'px';popup.style.height=height+'px';popup.style.left=Math.max(10,Math.min(viewWidth-width-10,trigger.left))+'px';popup.style.top=Math.max(10,Math.min(viewHeight-height-10,placeAbove?trigger.top-height-12:trigger.bottom+12))+'px';}
function openStakePopup(){if(phase!=='idle')return;document.querySelectorAll('[data-stake]').forEach(b=>b.classList.toggle('selected',+b.dataset.stake===saved.stake));openDialog($('#betDialog'),$('#betReadout'));positionStakePopup();$('#betReadout').classList.add('open');$('#betChoices').querySelector('.selected')?.scrollIntoView({block:'nearest'});}
$('#minus').onclick=()=>setStake(stakes[Math.max(0,stakes.indexOf(saved.stake)-1)]);
$('#plus').onclick=()=>setStake(stakes[Math.min(stakes.length-1,stakes.indexOf(saved.stake)+1)]);
$('#spin').onclick=()=>{if(autoRemaining>0){stopAuto();toast('Autoplay stopped. Current flight will finish.');}else if(phase==='boarding'){boardingElapsed=boardingDuration();fastFinish=true;}else if(phase==='flying'){fastFinish=true;}else launch();};
function setQuick(v){saved.quick=v;persist();hud();}
$('#quick').onclick=()=>{if(saved.quick)setQuick(false);else openDialog($('#quickDialog'),$('#quick'));};
$('#quickNo').onclick=()=>$('#quickDialog').close();$('#quickYes').onclick=()=>{setQuick(true);$('#quickDialog').close();};
$('#quickSetting').onchange=e=>setQuick(e.target.checked);
$('#soundSetting').onchange=e=>{saved.sound=e.target.checked;sound.set(saved.sound);persist();};
document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;if(document.hidden)sound.ctx?.suspend();else if(sound.enabled)sound.ctx?.resume().catch(()=>{});});
$('#auto').onclick=()=>{if(phase!=='idle')return;$('#autoExposure').textContent='Total stake: '+money(saved.stake*chosenRounds)+' demo credits';openDialog($('#autoDialog'),$('#auto'));};
document.querySelectorAll('[data-rounds]').forEach(b=>b.onclick=()=>{chosenRounds=+b.dataset.rounds;document.querySelectorAll('[data-rounds]').forEach(x=>x.classList.toggle('selected',x===b));$('#autoExposure').textContent='Total stake: '+money(saved.stake*chosenRounds)+' demo credits';});
$('#startAuto').onclick=()=>{$('#autoDialog').close();autoRemaining=chosenRounds;launch();};
$('#betReadout').onclick=openStakePopup;
for(const stake of stakes){const b=document.createElement('button');b.textContent=money(stake);b.dataset.stake=stake;b.onclick=()=>{setStake(stake);$('#betDialog').close();};$('#betChoices').append(b);}
$('#info').onclick=()=>openManual('rules',$('#info'));
$('#menu').onclick=()=>openManual('settings',$('#menu'));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>{$('#betReadout').classList.remove('open');d.returnFocus?.focus({preventScroll:true});});});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showManualPanel(b.dataset.tab));
window.addEventListener('resize',positionStakePopup);
$('#resetDemo').onclick=()=>{if(phase!=='idle')return;saved.balance=500000;sessionStartBalance=saved.balance;persist();hud();toast('Demo balance reset to 5,000.00.');};
document.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||document.querySelector('dialog[open]')||/BUTTON|INPUT|SELECT/.test(e.target.tagName))return;e.preventDefault();$('#spin').click();});
function updateClock(){$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});const duration=Math.max(0,Math.floor((Date.now()-sessionStarted)/1000));$('#sessionDuration').textContent=[Math.floor(duration/3600),Math.floor(duration/60)%60,duration%60].map(v=>String(v).padStart(2,'0')).join(':');}updateClock();setInterval(updateClock,1000);
const loads=assets.map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{art[key]=img;resolve();};img.onerror=()=>reject(new Error('Artwork could not load'));img.src='assets/'+file;}));
loads.push(fetch('model.json?v=4').then(r=>{if(!r.ok)throw Error('Flight data could not load');return r.json();}).then(data=>{model=data;if(!model.outcomes?.length)throw Error('Invalid flight data');}));
Promise.all(loads).then(()=>{
 // An interrupted demo round resolves exactly once on reload.
 if(saved.pending){const previous=E.simulate(saved.pending.seed),payout=Math.round(saved.pending.stake*previous.payout);saved.balance+=payout;saved.collected+=previous.hits;saved.pending=null;persist();$('#win').textContent=money(payout);toast('Previous flight completed: '+money(payout)+' demo credits.');}
 ready=true;$('#loading').hidden=true;hud();
}).catch(error=>{$('#loading').textContent=error.message+'. Tap here to retry.';$('#loading').style.cursor='pointer';$('#loading').onclick=()=>location.reload();$('#status').textContent='Unable to load the game. Retry required.';});
hud();
})();
