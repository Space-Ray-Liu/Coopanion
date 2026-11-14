/** Impact interference and the autonomous relocation clock run independently. */
export const HOLO_SIGNAL = { relocationInterval:[30,90], jitter:4, seconds:[3,4] };
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const p=clamp(n);return p*p*(3-2*p);};
function bursts(seconds,r){
  const pulses=[];
  for(let at=.015+r()*.06;at<seconds;){
    const duration=.025+r()**2*.16;
    pulses.push({from:at,to:at+duration,strength:.4+r()*.58,offset:(r()*2-1)*HOLO_SIGNAL.jitter,row:75+r()*115});
    at+=duration+(r()<.55?.008+r()*.065:.1+r()*.4);
  }
  return pulses;
}
function transition(time,jump){
  const steady={phase:'steady',scaleX:1,scaleY:1,electric:0,spread:1,seed:0,offset:0,amount:0,row:83};
  if(!jump||time>=jump.at+jump.seconds+jump.enter)return steady;
  const phase=time<jump.at?'out':time<jump.at+jump.seconds?'hidden':'in';
  const p=clamp(phase==='out'?(time-jump.start)/jump.exit:1-(time-jump.at-jump.seconds)/jump.enter);
  const compression=smooth((p-.18)/.5),spread=1-.96*smooth((p-.78)/.22);
  const pulse=jump.pulses.find(v=>time-jump.start>=v.from&&time-jump.start<v.to);
  const envelope=Math.min(1,p/.12,(1-p)/.08);
  return {phase,scaleX:spread,scaleY:1-.988*compression,spread,seed:jump.seed,
    electric:phase==='hidden'?0:smooth((p-.2)/.45)*(1-smooth((p-.94)/.06)),
    offset:(pulse?.offset??0)*envelope,amount:(pulse?.strength??0)*envelope,row:pulse?.row??83};
}
export class HoloSignal {
  constructor({random=Math.random,autoRelocate=true}={}) {
    this.random=random;this.previousImpact=0;this.started=-Infinity;this.duration=0;this.pulses=[];
    this.relocation=null;this.pending=null;this.moved=false;this.hidden=false;this.active=false;
    this.autoRelocate=autoRelocate;this.paused=false;this.remaining=null;this.lastTime=null;this.wasEligible=false;
    this.visual={...transition(0,null),opacity:1};
  }
  begin(time) {
    const r=this.random;
    this.started=time;
    this.duration=HOLO_SIGNAL.seconds[0]+r()*(HOLO_SIGNAL.seconds[1]-HOLO_SIGNAL.seconds[0]);
    this.pulses=bursts(this.duration,r);
  }
  advance(time,impact,mode) {
    const dt=this.lastTime===null?0:Math.max(0,time-this.lastTime);this.lastTime=time;
    if(impact>this.previousImpact)this.begin(time);
    this.previousImpact=impact;
    const eligible=this.autoRelocate&&!this.paused&&['idle','look','sit'].includes(mode);
    if(this.paused||mode==='drag'||mode==='air'||(this.relocation&&!this.moved&&!eligible))this.cancelRelocation();
    if(eligible&&!this.relocation){
      if(this.remaining===null){const [min,max]=HOLO_SIGNAL.relocationInterval;this.remaining=min+this.random()*(max-min);}
      if(this.wasEligible)this.remaining-=dt;
      if(this.remaining<=0){
        const r=this.random;
        const edge=['left','right','bottom'][Math.floor(r()*3)],position=.15+r()*.7;
        const exit=.58+r()*.18,seconds=.16+r()*.12,enter=.65+r()*.18,seed=r();
        this.relocation={edge,position,start:time,at:time+exit,exit,seconds,enter,seed,pulses:bursts(exit+seconds+enter,r)};
        this.pending=null;this.moved=false;this.remaining=null;
      }
    }
    this.wasEligible=eligible;
    const age=time-this.started;
    const faultActive=age<this.duration;
    const jump=this.relocation;
    this.hidden=!!jump&&time>=jump.at&&time<jump.at+jump.seconds;
    if(jump&&!this.moved&&time>=jump.at+jump.seconds/2){
      this.pending={edge:jump.edge,position:jump.position};this.moved=true;
    }
    if(jump&&time>=jump.at+jump.seconds+jump.enter)this.relocation=null;
    this.active=faultActive||!!this.relocation;
    const pulse=this.pulses.find(p=>age>=p.from&&age<p.to);
    const fade=faultActive?Math.pow(1-age/this.duration,.45):0;
    const fault=pulse?pulse.strength*fade:0,teleport=transition(time,jump);
    const offset=(pulse?.offset??0)*fade+teleport.offset;
    this.visual={...teleport,opacity:this.hidden?0:(1-fault)*(1-teleport.amount*.75),
      offset:Math.max(-HOLO_SIGNAL.jitter,Math.min(HOLO_SIGNAL.jitter,offset)),
      amount:Math.max(fault,teleport.amount),row:teleport.amount?teleport.row:pulse?.row??83};
    return this.visual;
  }
  takeRelocation(){const jump=this.pending;this.pending=null;return jump;}
  cancelRelocation(){if(this.relocation)this.remaining=null;this.relocation=null;this.pending=null;this.hidden=false;}
}
export function createProjectionSignal(projection,screen,gaps,noise,signal) {
  return (time,impact,mode)=>{
    const {opacity,offset,amount,row,scaleX,scaleY}=signal.advance(time,impact,mode);
    projection.setAttribute('opacity',opacity.toFixed(3));
    projection.setAttribute('transform',`translate(${offset.toFixed(2)} 0)`);
    screen.setAttribute('transform',`translate(128 140) scale(${scaleX.toFixed(4)} ${scaleY.toFixed(4)}) translate(-128 -140)`);
    screen.setAttribute('opacity',String(.25+scaleY*.75));
    gaps.setAttribute('opacity',amount.toFixed(3));
    noise.setAttribute('opacity',(amount*.75).toFixed(3));
    if(!amount)return;
    [...gaps.children].forEach((gap,i)=>{
      gap.setAttribute('y',String(row+i*31));gap.setAttribute('height',String(1+amount*(i?2:6)));
    });
    noise.setAttribute('transform',`translate(${offset*2} ${row})`);
  };
}
