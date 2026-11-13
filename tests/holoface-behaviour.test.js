import {afterEach,describe,expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
import {createHoloBody} from '../packages/cortico-world-desktop-pet/web/holoface/figure.js';
import {HOLO_BEHAVIOUR,HoloEnvironment} from '../packages/cortico-world-desktop-pet/web/holoface/environment.js';
import * as kit from '../packages/cortico-world-desktop-pet/web/kit/body.js';
const windows=[];
afterEach(()=>{for(const win of windows.splice(0))win.close();});
function rig(bounds={W:900,H:600,floorY:570,S:.6}){
 const dom=new JSDOM('<!doctype html><body></body>');windows.push(dom.window);
 const events=[],root=dom.window.document.body;
 const body=createHoloBody(new URL('http://localhost/'),{kit,host:{root,bounds:()=>bounds,start:{enter:false,x:450},emit:(event,detail)=>events.push({event,...detail}),sound(){}}});
 body.set({roam:'off'});body.step(1/60);
 return {body,root,events,bounds};
}
const advance=(body,seconds)=>{for(let i=0;i<Math.ceil(seconds*30);i++)body.step(1/30);};
function heat(env,seconds,sample){for(let i=0;i<seconds*30;i++){if(i%30===0)env.sample(sample);env.step(1/30);}return env.effort;}

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
 it('shrinks only a hard user landing, scales hit areas, shows mechanical tears and recovers',()=>{
  const {body,root}=rig(),size=()=>body.layout().hit[0].r;
  const full=size(),hit=body.layout().hit[0];
  body.pointer('down',{x:hit.x,y:hit.y,t:0});body.pointer('move',{x:450,y:120,t:100});advance(body,.5);
  body.pointer('move',{x:450,y:400,t:200});body.step(1/60);body.pointer('up',{x:450,y:400,t:210});
  advance(body,3);
  expect(size()/full).toBeCloseTo(HOLO_BEHAVIOUR.impact.scale,2);
  expect(root.querySelector('[data-part="teartracks"]')).not.toBeNull();
  expect(Number(root.querySelector('[data-part="tears"]').getAttribute('opacity'))).toBeGreaterThan(.2);
  advance(body,HOLO_BEHAVIOUR.impact.seconds+3);expect(size()/full).toBeCloseTo(1,2);
  body.dispose();
 });
 it('keeps its normal size during an ordinary jump',()=>{
  const {body}=rig(),full=body.layout().hit[0].r;body.do('jump');advance(body,3);
  expect(body.layout().hit[0].r/full).toBeCloseTo(1,3);body.dispose();
 });
});
