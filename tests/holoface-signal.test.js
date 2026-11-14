import {describe,expect,it} from 'vitest';
import {HoloSignal,HOLO_SIGNAL} from '../packages/cortico-world-desktop-pet/web/holoface/signal.js';
function seeded(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function record(signal,start){
 const samples=[];
 for(let i=0;i<=540;i++){const age=i/120;samples.push(signal.advance(start+age,1-age/9,'dizzy'));}
 return samples;
}
describe('hologram signal faults',()=>{
 it('generates new irregular bursts on each impact, with bounded jitter in both directions',()=>{
  const signal=new HoloSignal({random:seeded(314159)});
  expect(signal.advance(0,0,'idle')).toMatchObject({opacity:1,offset:0});
  const first=record(signal,1),second=record(signal,11);
  expect(second).not.toEqual(first);
  const starts=first.flatMap((v,i)=>v.opacity<.99&&(i===0||first[i-1].opacity>=.99)?[i]:[]);
  expect(starts.length).toBeGreaterThan(3);
  expect(new Set(starts.slice(1).map((n,i)=>n-starts[i])).size).toBeGreaterThan(2);
  for(const samples of [first,second]){
   expect(samples.every(v=>v.opacity>=0&&v.opacity<=1&&Math.abs(v.offset)<=HOLO_SIGNAL.jitter)).toBe(true);
   expect(Math.min(...samples.map(v=>v.offset))).toBeLessThan(-.5);
   expect(Math.max(...samples.map(v=>v.offset))).toBeGreaterThan(.5);
   expect(samples.at(-1)).toMatchObject({opacity:1,offset:0,amount:0});
  }
 });
});

describe('autonomous hologram relocation',()=>{
 it('repeats after random idle intervals without an impact, moving once per disappearance',()=>{
  const signal=new HoloSignal({random:seeded(7)}),jumps=[];
  for(let i=0;i<210*60;i++){
   const t=i/60,visual=signal.advance(t,0,'idle');
   if(visual.phase==='steady')expect(visual).toMatchObject({offset:0,amount:0,opacity:1,scaleX:1,scaleY:1,electric:0});
   if(signal.hidden)expect(visual.opacity).toBe(0);
   const jump=signal.takeRelocation();
   if(jump){expect(signal.hidden).toBe(true);jumps.push({t,...jump});}
   signal.advance(t,0,'idle');expect(signal.takeRelocation()).toBeNull();
  }
  expect(jumps.length).toBeGreaterThanOrEqual(2);
  const intervals=jumps.map((j,i)=>j.t-(jumps[i-1]?.t??0));
  for(const seconds of intervals){
   expect(seconds).toBeGreaterThanOrEqual(HOLO_SIGNAL.relocationInterval[0]);
   expect(seconds).toBeLessThan(HOLO_SIGNAL.relocationInterval[1]+3);
  }
  expect(new Set(intervals.map(Math.floor)).size).toBeGreaterThan(1);
 });
 it.each(['drag','air','sleep','walk','climb','paused'])('does not count time spent in %s towards the next relocation',mode=>{
  const signal=new HoloSignal({random:()=>0}),delay=HOLO_SIGNAL.relocationInterval[0];
  signal.advance(0,0,'idle');signal.advance(delay-1,0,'idle');
  signal.paused=mode==='paused';
  for(let i=0;i<120;i++){
   signal.advance(delay+i,0,mode==='paused'?'idle':mode);
   expect(signal.hidden).toBe(false);expect(signal.takeRelocation()).toBeNull();
  }
  signal.paused=false;signal.advance(delay+120,0,'idle');
  expect(signal.relocation).toBeNull();
  signal.advance(delay+121,0,'idle');
  expect(signal.relocation).not.toBeNull();
 });
 it('cancels a scheduled jump on interaction and starts a fresh interval afterwards',()=>{
  const signal=new HoloSignal({random:()=>0}),delay=HOLO_SIGNAL.relocationInterval[0];
  signal.advance(0,0,'idle');signal.advance(delay,0,'idle');
  expect(signal.relocation).not.toBeNull();
  signal.paused=true;signal.advance(delay+.04,0,'idle');
  expect(signal.relocation).toBeNull();expect(signal.hidden).toBe(false);
  signal.paused=false;signal.advance(delay+1,0,'idle');
  signal.advance(delay*2,0,'idle');expect(signal.relocation).toBeNull();
  signal.advance(delay*2+1,0,'idle');expect(signal.relocation).not.toBeNull();
 });
 it('preserves the invisible interval after relocation changes the mode to climbing',()=>{
  const signal=new HoloSignal({random:()=>0}),delay=HOLO_SIGNAL.relocationInterval[0];
  signal.advance(0,0,'idle');signal.advance(delay,0,'idle');
  const {at,seconds,enter}=signal.relocation,t=at+seconds*.6;
  signal.advance(t,0,'idle');expect(signal.takeRelocation()?.edge).toBe('left');
  signal.advance(t,0,'climb');expect(signal.hidden).toBe(true);
  const recovering=signal.advance(at+seconds+enter*.5,0,'climb');
  expect(signal.hidden).toBe(false);expect(recovering.phase).toBe('in');expect(recovering.electric).toBeGreaterThan(0);
  const steady=signal.advance(at+seconds+enter+.01,0,'climb');
  expect(steady).toMatchObject({phase:'steady',scaleY:1,opacity:1,electric:0});
  expect(signal.takeRelocation()).toBeNull();
 });
 it('contracts into current and expands at the new position, with interference on departure and arrival',()=>{
  const signal=new HoloSignal({random:seeded(89)}),phases={out:[],in:[]};
  for(let i=0;i<110*120;i++){
   const t=i/120,v=signal.advance(t,0,'idle');
   expect(v.scaleX).toBeGreaterThan(0);expect(v.scaleY).toBeGreaterThan(0);
   expect(Math.abs(v.offset)).toBeLessThanOrEqual(HOLO_SIGNAL.jitter);
   if(phases[v.phase])phases[v.phase].push({...v,t});
   if(signal.takeRelocation())expect(signal.hidden).toBe(true);
   expect(signal.advance(t,0,'idle')).toEqual(v);
  }
  for(const samples of Object.values(phases)){
   expect(samples.some(v=>v.scaleY<.03&&v.electric>.8)).toBe(true);
   expect(samples.some(v=>v.scaleX<.2)).toBe(true);
   expect(samples.some(v=>v.opacity<.75)).toBe(true);
   expect(samples.some(v=>Math.abs(v.offset)>.5)).toBe(true);
   expect(new Set(samples.map(v=>v.offset)).size).toBeGreaterThan(3);
   expect(new Set(samples.map(v=>v.row)).size).toBeGreaterThan(1);
  }
  expect(phases.out[0].scaleY).toBeCloseTo(1);
  expect(phases.in[0].scaleY).toBeLessThan(.03);
 });
 it('keeps impact interference independent of the idle timer',()=>{
  const signal=new HoloSignal({random:()=>0}),delay=HOLO_SIGNAL.relocationInterval[0];
  signal.advance(0,0,'idle');signal.advance(delay-1,0,'idle');
  record(signal,delay);
  expect(signal.takeRelocation()).toBeNull();
  signal.advance(delay+5,0,'idle');expect(signal.relocation).toBeNull();
  signal.advance(delay+6,0,'idle');expect(signal.relocation).not.toBeNull();
 });
});
