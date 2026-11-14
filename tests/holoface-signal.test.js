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
   expect(visual).toMatchObject({offset:0,amount:0});
   expect(visual.opacity).toBe(signal.hidden?0:1);
   const jump=signal.takeRelocation();
   if(jump){expect(signal.hidden).toBe(true);jumps.push({t,...jump});}
   signal.advance(t,0,'idle');expect(signal.takeRelocation()).toBeNull();
  }
  expect(jumps.length).toBeGreaterThanOrEqual(2);
  const intervals=jumps.map((j,i)=>j.t-(jumps[i-1]?.t??0));
  for(const seconds of intervals){
   expect(seconds).toBeGreaterThanOrEqual(HOLO_SIGNAL.relocationInterval[0]);
   expect(seconds).toBeLessThan(HOLO_SIGNAL.relocationInterval[1]+1);
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
  signal.advance(delay+.18,0,'idle');expect(signal.takeRelocation()?.edge).toBe('left');
  signal.advance(delay+.18,0,'climb');expect(signal.hidden).toBe(true);
  signal.advance(delay+.3,0,'climb');expect(signal.hidden).toBe(false);
  expect(signal.takeRelocation()).toBeNull();
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
