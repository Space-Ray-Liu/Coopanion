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
 it.each([[HOLO_SIGNAL.relocationChance-.001,true],[HOLO_SIGNAL.relocationChance,false]])('uses the configured relocation probability at roll %s',(roll,expected)=>{
  const next=seeded(7);let first=true;
  const signal=new HoloSignal({random:()=>{if(first){first=false;return roll;}return next();}});
  let hidden=false;const jumps=[];
  for(let i=0;i<240;i++){
   const t=i/120;signal.advance(t,1-t/9,'dizzy');hidden||=signal.hidden;
   const jump=signal.takeRelocation();if(jump){expect(signal.hidden).toBe(true);jumps.push(jump);}
  }
  expect(hidden).toBe(expected);expect(jumps).toHaveLength(expected?1:0);
 });
});
