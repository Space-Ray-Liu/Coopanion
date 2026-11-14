/** Each impact gets fresh dropout clusters, horizontal interference and an optional relocation. */
export const HOLO_SIGNAL = { relocationChance:.2, jitter:4, seconds:[3,4] };
export class HoloSignal {
  constructor({random=Math.random}={}) {
    this.random=random;this.previousImpact=0;this.started=-Infinity;this.duration=0;this.pulses=[];
    this.relocation=null;this.pending=null;this.moved=false;this.hidden=false;this.active=false;
    this.visual={opacity:1,offset:0,amount:0,row:83};
  }
  begin(time) {
    const r=this.random;
    this.started=time;this.pending=null;this.moved=false;
    this.relocation=r()<HOLO_SIGNAL.relocationChance?{
      edge:['left','right','bottom'][Math.floor(r()*3)],position:.15+r()*.7,
      after:.35+r()*.5,seconds:.18+r()*.22,
    }:null;
    this.duration=HOLO_SIGNAL.seconds[0]+r()*(HOLO_SIGNAL.seconds[1]-HOLO_SIGNAL.seconds[0]);
    this.pulses=[];
    for(let at=.015+r()*.06;at<this.duration;){
      const seconds=.025+r()**2*.16;
      this.pulses.push({from:at,to:at+seconds,strength:.4+r()*.58,offset:(r()*2-1)*HOLO_SIGNAL.jitter,row:75+r()*115});
      at+=seconds+(r()<.55?.008+r()*.065:.1+r()*.4);
    }
  }
  advance(time,impact,mode) {
    if(impact>this.previousImpact)this.begin(time);
    this.previousImpact=impact;
    if(mode==='drag'||mode==='air')this.cancelRelocation();
    const age=time-this.started;
    this.active=age<this.duration;
    const jump=this.relocation;
    this.hidden=!!jump&&age>=jump.after&&age<jump.after+jump.seconds;
    if(jump&&!this.moved&&age>=jump.after+jump.seconds/2){
      this.pending={edge:jump.edge,position:jump.position};this.moved=true;
    }
    const pulse=this.pulses.find(p=>age>=p.from&&age<p.to);
    const fade=this.active?Math.pow(1-age/this.duration,.45):0;
    const amount=pulse?pulse.strength*fade:0;
    this.visual={opacity:this.hidden?0:1-amount,offset:pulse?pulse.offset*fade:0,amount,row:pulse?.row??83};
    return this.visual;
  }
  takeRelocation(){const jump=this.pending;this.pending=null;return jump;}
  cancelRelocation(){this.relocation=null;this.pending=null;this.hidden=false;}
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
