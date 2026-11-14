import {afterEach,describe,expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
import {createHoloBody} from '../packages/cortico-world-desktop-pet/web/holoface/figure.js';
import {HOLO_BEHAVIOUR,HoloEnvironment} from '../packages/cortico-world-desktop-pet/web/holoface/environment.js';
import {HOLO_SIGNAL} from '../packages/cortico-world-desktop-pet/web/holoface/signal.js';
import * as kit from '../packages/cortico-world-desktop-pet/web/kit/body.js';
const windows=[];
afterEach(()=>{for(const win of windows.splice(0))win.close();});
function rig(bounds={W:900,H:600,floorY:570,S:.6},random=()=>.9){
 const dom=new JSDOM('<!doctype html><body></body>');windows.push(dom.window);
 const events=[],root=dom.window.document.body;
 const body=createHoloBody(new URL('http://localhost/'),{kit,random,host:{root,bounds:()=>bounds,start:{enter:false,x:450},emit:(event,detail)=>events.push({event,...detail}),sound(){}}});
 body.set({roam:'off'});body.step(1/60);
 return {body,root,events,bounds};
}
const advance=(body,seconds)=>{for(let i=0;i<Math.ceil(seconds*30);i++)body.step(1/30);};
function heat(env,seconds,sample){for(let i=0;i<seconds*30;i++){if(i%30===0)env.sample(sample);env.step(1/30);}return env.effort;}
function chooseEdge(edge){
 const first=[0,{left:.05,right:.5,bottom:.95}[edge]];let seed=181;
 return ()=>first.length?first.shift():((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}
describe('hologram activity and effort',()=>{
 it('sleeps through prolonged inactivity and wakes when system input resumes',()=>{
  const {body}=rig();body.set({system:{idleSeconds:180,cpuLoad:.1,fanFraction:null}});advance(body,4);
  expect(body.layout().mode).toBe('sleep');advance(body,30);expect(body.layout().mode).toBe('sleep');
  body.set({system:{idleSeconds:0,cpuLoad:.1,fanFraction:null}});advance(body,2.5);
  expect(body.layout().mode).toBe('idle');body.dispose();
 });
 it('keeps a conversation or ongoing work awake during inactivity',()=>{
  for(const state of [{dialogOpen:true},{thinking:true},{listening:true},{status:'read'}]){
   const {body}=rig();body.set({...state,system:{idleSeconds:300,cpuLoad:.1}});advance(body,4);
   expect(body.layout().mode).not.toBe('sleep');body.dispose();
  }
 });
 it('wakes from automatic sleep when a conversation or work begins',()=>{
  for(const state of [{dialogOpen:true},{status:'read'}]){
   const {body}=rig();body.set({system:{idleSeconds:180,cpuLoad:.1}});advance(body,4);
   expect(body.layout().mode).toBe('sleep');body.set(state);advance(body,2.5);
   expect(body.layout().mode).toBe('idle');body.dispose();
  }
 });
 it('does not treat a stationary polled cursor as fresh activity',()=>{
  const {body}=rig();body.pointer('move',{x:20,y:30,t:0});
  for(let i=0;i<(HOLO_BEHAVIOUR.rest.after+4)*30;i++){body.pointer('move',{x:20,y:30,t:i*33});body.step(1/30);}
  expect(body.layout().mode).toBe('sleep');body.dispose();
 });
 it('uses real fan controls first and rejects a CPU spike',()=>{
  const env=new HoloEnvironment();
  expect(heat(env,3,{cpuLoad:1,fanFraction:null})).toBeLessThan(.01);
  expect(heat(env,8,{cpuLoad:.1,fanFraction:.95})).toBeGreaterThan(.9);
  expect(heat(env,12,{cpuLoad:1,fanFraction:.1})).toBeLessThan(.05);
 });
 it('supports sustained CPU load as an explicit fallback and cools when samples stop',()=>{
  const env=new HoloEnvironment();
  expect(heat(env,16,{cpuLoad:.95,fanFraction:null})).toBeGreaterThan(.9);
  for(let i=0;i<18*30;i++)env.step(1/30);
  expect(env.effort).toBeLessThan(.01);
  const fanOnly=new HoloEnvironment({loadFallback:false});
  expect(heat(fanOnly,20,{cpuLoad:1,fanFraction:null})).toBeLessThan(.01);
 });
 it('also reacts to sustained GPU load when the CPU is mostly idle',()=>{
  const env=new HoloEnvironment();
  expect(heat(env,16,{cpuLoad:.1,gpuLoad:.95,fanFraction:null})).toBeGreaterThan(.9);
  expect(heat(env,12,{cpuLoad:.1,gpuLoad:.1,fanFraction:null})).toBeLessThan(.05);
 });
 it('shows red tint, digital green exhaust and strain during a measured busy period',()=>{
  const {body,root}=rig();
  for(let i=0;i<16*30;i++){if(i%30===0)body.set({system:{idleSeconds:0,cpuLoad:.95,fanFraction:null}});body.step(1/30);}
  expect(root.querySelector('[data-expression]').dataset.expression).toBe('strained');
  expect(Number(root.querySelector('[data-part="heat"]').getAttribute('opacity'))).toBeGreaterThan(.2);
  expect(Number(root.querySelector('[data-part="exhaust"]').getAttribute('opacity'))).toBeGreaterThan(.8);
  expect(root.innerHTML).not.toMatch(/NaN|Infinity/);body.dispose();
 });
});

describe('autonomous hologram relocation',()=>{
 it.each(['dialogOpen','thinking','listening','status'])('pauses the idle timer while %s is active and resumes it afterwards',key=>{
  const {body,root}=rig(undefined,chooseEdge('left'));
  advance(body,HOLO_SIGNAL.relocationInterval[0]-.1);
  body.set({[key]:key==='status'?'read':true});
  for(let i=0;i<60;i++){
   body.step(1/30);expect(root.querySelector('[data-holo-projection]').style.opacity).toBe('1');
   expect(body.layout().x).toBeCloseTo(450);
  }
  body.set({[key]:key==='status'?null:false});
  let hidden=false;
  for(let i=0;i<60;i++){body.step(1/60);hidden||=root.querySelector('[data-holo-projection]').style.opacity==='0';}
  expect(hidden).toBe(true);expect(body.layout().x).toBeLessThan(150);body.dispose();
 });
 it.each(['left','right','bottom'])('disappears before moving to the %s edge, then restores its hit area',edge=>{
  const r=rig(undefined,chooseEdge(edge)),{body,root,bounds}=r;
  const full=body.layout().hit[0].r;advance(body,HOLO_SIGNAL.relocationInterval[0]-.1);
  let hidden=0,moves=0,currentBefore=0,currentAfter=0,previousX=body.layout().x;
  for(let i=0;i<180;i++){
   body.step(1/60);const l=body.layout(),invisible=root.querySelector('[data-holo-projection]').style.opacity==='0';
   if(invisible){hidden++;expect(l.hit).toEqual([]);}
   if(Math.abs(l.x-previousX)>1){moves++;expect(invisible).toBe(true);}
   if(!invisible&&Number(root.querySelector('[data-part="teleport-current"]').getAttribute('opacity'))>.1){
    if(moves)currentAfter++;else currentBefore++;
   }
   previousX=l.x;
  }
  expect(hidden).toBeGreaterThan(3);expect(moves).toBe(1);
  expect(currentBefore).toBeGreaterThan(5);expect(currentAfter).toBeGreaterThan(5);
  expect(root.querySelector('[data-part="signal-screen"]').getAttribute('transform')).toContain('scale(1.0000 1.0000)');
  expect(root.querySelector('[data-part="teleport-current"]').getAttribute('opacity')).toBe('0');
  const l=body.layout();expect(l.hit).toHaveLength(1);expect(l.hit[0].r/full).toBeCloseTo(1,2);
  expect(r.events.some(e=>e.event==='touch'&&e.kind==='crash')).toBe(false);
  expect(root.querySelector('[data-holo-projection]').style.opacity).toBe('1');
  if(edge==='bottom'){
   expect(l.mode).toBe('idle');expect(l.box.y+l.box.h).toBeGreaterThan(bounds.floorY-5);
  }else{
   expect(l.mode).toBe('climb');expect(edge==='left'?l.x<bounds.W*.15:l.x>bounds.W*.85).toBe(true);
   expect(l.box.y).toBeGreaterThanOrEqual(bounds.H*(1-HOLO_BEHAVIOUR.climb.height)-2);
   expect(root.querySelector('[data-part="wall-link"]').dataset.attached).toBe('true');
  }
  const hit=l.hit[0];body.pointer('down',{x:hit.x,y:hit.y,t:1000});body.pointer('move',{x:hit.x+16,y:hit.y-25,t:1100});body.step(1/60);
  expect(body.layout().mode).toBe('drag');body.dispose();
 });
 it('cancels an electrical collapse and restores its full shape when picked up',()=>{
  const r=rig(undefined,chooseEdge('left')),{body,root,bounds}=r;advance(body,HOLO_SIGNAL.relocationInterval[0]+.35);
  expect(Number(root.querySelector('[data-part="teleport-current"]').getAttribute('opacity'))).toBeGreaterThan(0);
  const hit=body.layout().hit[0];body.pointer('down',{x:hit.x,y:hit.y,t:500});
  body.pointer('move',{x:hit.x+16,y:hit.y-35,t:600});
  for(let i=0;i<90;i++){
   body.step(1/30);expect(body.layout().mode).toBe('drag');
   expect(root.querySelector('[data-holo-projection]').style.opacity).toBe('1');
   expect(root.querySelector('[data-part="signal-screen"]').getAttribute('transform')).toContain('scale(1.0000 1.0000)');
   expect(root.querySelector('[data-part="teleport-current"]').getAttribute('opacity')).toBe('0');
   expect(body.layout().x).toBeGreaterThan(bounds.W*.3);
  }
  body.dispose();expect(root.querySelector('[data-holo-projection]')).toBeNull();
 });
 it('uses the current screen bounds when a resize happens during disappearance',()=>{
  const bounds={W:900,H:600,floorY:570,S:.6},r=rig(bounds,chooseEdge('right')),{body,root}=r;advance(body,HOLO_SIGNAL.relocationInterval[0]-.1);
  for(let i=0;i<60&&root.querySelector('[data-holo-projection]').style.opacity!=='0';i++)body.step(1/60);
  expect(root.querySelector('[data-holo-projection]').style.opacity).toBe('0');
  bounds.W=620;bounds.H=420;bounds.floorY=400;body.resize();advance(body,2);
  const l=body.layout();expect(l.x).toBeGreaterThan(bounds.W*.8);expect(l.x).toBeLessThan(bounds.W);
  expect(l.box.y).toBeGreaterThanOrEqual(bounds.H*(1-HOLO_BEHAVIOUR.climb.height)-2);
  expect(l.hit[0].y).toBeLessThan(bounds.H);body.dispose();
 });
});

describe('hologram wall climbing and impact',()=>{
 it.each(['left','right'])('climbs the %s wall below the height cap, pauses, and descends',side=>{
  const {body,events,bounds}=rig();expect(body.do(`climb-${side}`)).toBe(true);
  let highest=Infinity,sawWall=false;
  for(let i=0;i<55*30;i++){
   body.step(1/30);const l=body.layout();highest=Math.min(highest,l.box.y);
   if(l.mode==='climb'&&(side==='left'?l.x<bounds.W*.15:l.x>bounds.W*.85))sawWall=true;
   expect(l.box.y).toBeGreaterThanOrEqual(bounds.H*(1-HOLO_BEHAVIOUR.climb.height)-2);
   if(events.some(e=>e.event==='done'&&e.word===`climb-${side}`))break;
  }
  expect(sawWall).toBe(true);expect(highest).toBeLessThan(bounds.H*.45);
  expect(body.layout().mode).toBe('idle');expect(events).toContainEqual({event:'done',word:`climb-${side}`});body.dispose();
 });
 it('can be picked up from a wall and keeps the height cap after a screen resize',()=>{
  const bounds={W:900,H:600,floorY:570,S:.6}, {body}=rig(bounds);
  body.do('climb-left');advance(body,8);bounds.H=400;bounds.floorY=380;body.resize();body.step(1/30);
  expect(body.layout().box.y).toBeGreaterThanOrEqual(bounds.H/3-2);
  const hit=body.layout().hit[0];body.pointer('down',{x:hit.x,y:hit.y,t:0});body.pointer('move',{x:hit.x+40,y:hit.y+20,t:200});body.step(1/30);
  expect(body.layout().mode).toBe('drag');body.dispose();
 });
 it('keeps a hard landing upright with bounded horizontal interference, shrinking and recovery',()=>{
  const {body,root,events}=rig(),size=()=>body.layout().hit[0].r;
  const full=size(),hit=body.layout().hit[0];
  body.pointer('down',{x:hit.x,y:hit.y,t:0});body.pointer('move',{x:450,y:120,t:100});advance(body,.5);
  body.pointer('move',{x:450,y:400,t:200});body.step(1/60);body.pointer('up',{x:450,y:400,t:210});
  const opacity=[],tilts=[],positions=[],offsets=[];
  for(let i=0;i<180;i++){
   body.step(1/60);
   if(!events.some(e=>e.event==='touch'&&e.kind==='crash'))continue;
   const group=root.querySelector('[data-expression]');
   opacity.push(Number(group.querySelector('[data-part="projection"]').getAttribute('opacity')));
   offsets.push(Number(group.querySelector('[data-part="projection"]').getAttribute('transform').match(/translate\(([^ ]+)/)[1]));
   tilts.push(Number(group.getAttribute('transform').match(/rotate\(([^)]+)\)/)[1]));
   positions.push(body.layout().x);
   const local=group.querySelector('[data-part="float"]').getAttribute('transform');
   expect(Number(local.match(/translate\(([^ ]+)/)[1])).toBe(0);
   expect(Number(local.match(/rotate\(([^ ]+)/)[1])).toBe(0);
  }
  expect(opacity.length).toBeGreaterThan(60);
  expect(Math.min(...opacity)).toBeLessThan(.35);expect(Math.max(...opacity)).toBe(1);
  expect(Math.max(...tilts.map(Math.abs))).toBeLessThan(.001);
  expect(Math.max(...positions)-Math.min(...positions)).toBeLessThan(.01);
  expect(Math.max(...offsets.map(Math.abs))).toBeGreaterThan(.5);
  expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(HOLO_SIGNAL.jitter);
  advance(body,HOLO_SIGNAL.seconds[1]-3+.4);
  expect(root.querySelector('[data-part="projection"]').getAttribute('opacity')).toBe('1.000');
  expect(size()/full).toBeCloseTo(HOLO_BEHAVIOUR.impact.scale,2);
  expect(root.querySelector('[data-part="teartracks"]')).not.toBeNull();
  expect(Number(root.querySelector('[data-part="tears"]').getAttribute('opacity'))).toBeGreaterThan(.2);
  advance(body,HOLO_BEHAVIOUR.impact.seconds+3);expect(size()/full).toBeCloseTo(1,2);
  body.dispose();
 });
 it.each(['jump','cry'])('keeps its size and projection steady during %s without impact',word=>{
  const {body,root}=rig(),full=body.layout().hit[0].r;body.do(word);
  for(let i=0;i<90;i++){
   body.step(1/30);
   expect(Number(root.querySelector('[data-part="projection"]').getAttribute('opacity'))).toBe(1);
  }
  expect(body.layout().hit[0].r/full).toBeCloseTo(1,3);body.dispose();
 });
});
