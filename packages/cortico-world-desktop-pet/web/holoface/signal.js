/** Impact interference and the autonomous relocation clock run independently. */
export const HOLO_SIGNAL = { relocationInterval:[30,90], jitter:4, seconds:[3,4] };
export class HoloSignal {
  constructor({random=Math.random,autoRelocate=true}={}) {
    this.random=random;this.previousImpact=0;this.started=-Infinity;this.duration=0;this.pulses=[];
    this.relocation=null;this.pending=null;this.moved=false;this.hidden=false;this.active=false;
    this.autoRelocate=autoRelocate;this.paused=false;this.remaining=null;this.lastTime=null;this.wasEligible=false;
    this.visual={opacity:1,offset:0,amount:0,row:83};
  }
  begin(time) {
    const r=this.random;
    this.started=time;
    this.duration=HOLO_SIGNAL.seconds[0]+r()*(HOLO_SIGNAL.seconds[1]-HOLO_SIGNAL.seconds[0]);
    this.pulses=[];
    for(let at=.015+r()*.06;at<this.duration;){
      const seconds=.025+r()**2*.16;
      this.pulses.push({from:at,to:at+seconds,strength:.4+r()*.58,offset:(r()*2-1)*HOLO_SIGNAL.jitter,row:75+r()*115});
      at+=seconds+(r()<.55?.008+r()*.065:.1+r()*.4);
    }
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
        this.relocation={edge:['left','right','bottom'][Math.floor(r()*3)],position:.15+r()*.7,at:time+.08+r()*.14,seconds:.18+r()*.22};
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
    if(jump&&time>=jump.at+jump.seconds)this.relocation=null;
    this.active=faultActive||!!this.relocation;
    const pulse=this.pulses.find(p=>age>=p.from&&age<p.to);
    const fade=faultActive?Math.pow(1-age/this.duration,.45):0;
    const amount=pulse?pulse.strength*fade:0;
    this.visual={opacity:this.hidden?0:1-amount,offset:pulse?pulse.offset*fade:0,amount,row:pulse?.row??83};
    return this.visual;
  }
  takeRelocation(){const jump=this.pending;this.pending=null;return jump;}
  cancelRelocation(){if(this.relocation)this.remaining=null;this.relocation=null;this.pending=null;this.hidden=false;}
}
export function createProjectionSignal(projection,gaps,noise,signal) {
  return (time,impact,mode)=>{
    const {opacity,offset,amount,row}=signal.advance(time,impact,mode);
    projection.setAttribute('opacity',opacity.toFixed(3));
    projection.setAttribute('transform',`translate(${offset.toFixed(2)} 0)`);
    gaps.setAttribute('opacity',amount.toFixed(3));
    noise.setAttribute('opacity',(amount*.75).toFixed(3));
    if(!amount)return;
    [...gaps.children].forEach((gap,i)=>{
      gap.setAttribute('y',String(row+i*31));gap.setAttribute('height',String(1+amount*(i?2:6)));
    });
    noise.setAttribute('transform',`translate(${offset*2} ${row})`);
  };
}
