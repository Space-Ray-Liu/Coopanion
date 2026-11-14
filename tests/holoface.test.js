import {afterEach,describe,expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
import {FaceMotion,POSES,EXPRESSIONS,createHoloFigure} from '../packages/cortico-world-desktop-pet/web/holoface/face.js';
import {createHoloBody} from '../packages/cortico-world-desktop-pet/web/holoface/figure.js';
import * as kit from '../packages/cortico-world-desktop-pet/web/kit/body.js';
const windows=[];
afterEach(()=>{for(const w of windows.splice(0))w.close();});
function svg(){const dom=new JSDOM('<!doctype html><body><svg xmlns="http://www.w3.org/2000/svg"><g></g></svg></body>');windows.push(dom.window);return dom.window.document.querySelector('g');}
const frame=(face,t)=>({face,t,blink:0,talk:0,look:[0,0],mode:'idle'});
function liveBody(facing=1){
 const group=svg(),root=group.ownerDocument.body,events=[];
 const body=createHoloBody(new URL('http://localhost/'),{kit,random:()=>.9,host:{root,bounds:()=>({W:900,H:600,floorY:570,S:.6}),start:{enter:false,x:450,facing},emit:(kind,detail)=>events.push({event:kind,...detail}),sound(){}}});
 body.set({roam:'off'});body.step(1/60);
 const [,pet,fx]=root.querySelector('svg.kit').children;
 return {body,root,pet,fx,events};
}
const advance=(body,seconds)=>{for(let i=0;i<seconds*60;i++)body.step(1/60);};
const scales=group=>group.getAttribute('transform').match(/scale\(([^)]+)\)/)[1].split(' ').map(Number);

describe('hologram expression transitions',()=>{
 it('keeps smile contours symmetric through love, laughter, victory and speech',()=>{
  const group=svg(),figure=createHoloFigure();let t=0;
  for(const expression of ['love','happy','victory','love']){
   figure.request(expression,10);
   for(let i=0;i<45;i++){
    t+=1/60;figure.draw(group,null,{...frame(expression,t),talk:i%2?.8:0});
    const numbers=group.querySelector('[data-part="mouth"]').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const points=Array.from({length:numbers.length/2},(_,i)=>numbers.slice(i*2,i*2+2));
    const error=Math.max(...points.map(([x,y])=>Math.min(...points.map(([u,v])=>Math.hypot(256-x-u,y-v)))));
    expect(error,expression).toBeLessThan(.02);
   }
  }
 });
 it('moves teeth, mouth and clipping together when following the pointer',()=>{
  const group=svg(),figure=createHoloFigure();
  for(let i=1;i<90;i++)figure.draw(group,null,{...frame('love',i/60),look:[-5,3]});
  const mouth=group.querySelector('[data-part="mouth"]'),teeth=group.querySelector('[data-part="teeth"]');
  const movingFace=mouth.closest('[data-part="face"]');
  expect(teeth.closest('[data-part="face"]')).toBe(movingFace);
  expect(movingFace.getAttribute('transform')).toMatch(/translate\(-/);
  const clip=teeth.parentElement.getAttribute('clip-path');
  expect(group.querySelector(clip.slice(4,-1)).querySelector('path').getAttribute('d')).toBe(mouth.getAttribute('d'));
 });
 it('preserves position and velocity when a cry is interrupted by a salute',()=>{
  const motion=new FaceMotion();motion.set('cry');for(let i=0;i<15;i++)motion.step(1/60);
  const position=[...motion.values],velocity=[...motion.velocity];motion.set('salute');
  expect(motion.values).toEqual(position);expect(motion.velocity).toEqual(velocity);
  motion.step(1/600);expect(Math.max(...motion.values.map((x,i)=>Math.abs(x-position[i])))).toBeLessThan(1);
  for(let i=0;i<180;i++)motion.step(1/60);
  expect(Math.max(...motion.values.map((x,i)=>Math.abs(x-POSES.salute[i])))).toBeLessThan(.001);
 });
 it('keeps every pair of expressions finite through retargeting',()=>{
  for(const first of EXPRESSIONS)for(const next of EXPRESSIONS){
   const motion=new FaceMotion(first);motion.set(next);
   for(let i=0;i<45;i++){motion.step(1/60);expect(motion.values.every(Number.isFinite)).toBe(true);}
  }
 });
 it.each(EXPRESSIONS.slice(1))('animates %s and renders changing geometry or effects',expression=>{
  const group=svg(),figure=createHoloFigure();
  for(let i=1;i<=90;i++)figure.draw(group,null,frame(expression,i/60));
  const first=group.innerHTML;figure.draw(group,null,frame(expression,1.55));
  expect(group.dataset.expression).toBe(expression);expect(group.innerHTML).not.toBe(first);
  expect(group.innerHTML).not.toMatch(/NaN|Infinity/);
  expect(group.querySelectorAll('[data-part="left"]')).toHaveLength(1);
 });
 it('uses the real body contract for the new expression words, speech, and work state',()=>{
  const group=svg(),root=group.ownerDocument.body;
  const body=createHoloBody(new URL('http://localhost/'),{kit,host:{root,bounds:()=>({W:900,H:600,floorY:570,S:.6}),start:{enter:false,x:450},emit(){},sound(){}}});
  expect(body.words).toEqual(expect.arrayContaining(EXPRESSIONS));
  body.set({roam:'off',thinking:true,status:'think'});
  for(let i=0;i<60;i++)body.step(1/60);
  const face=root.querySelector('[data-expression]');expect(face.dataset.expression).toBe('thinking');
  expect(body.do('cry')).toBe(true);for(let i=0;i<30;i++)body.step(1/60);
  const tearFace=face.querySelector('[data-part="left"]').getAttribute('d');
  expect(body.do('salute')).toBe(true);body.step(1/60);
  expect(face.dataset.expression).toBe('salute');
  expect(face.querySelector('[data-part="left"]').getAttribute('d')).not.toBe(tearFace);
  const before=face.querySelector('[data-part="mouth"]').getAttribute('d');body.talk();body.step(1/60);
  expect(face.querySelector('[data-part="mouth"]').getAttribute('d')).not.toBe(before);
  expect(root.innerHTML).not.toMatch(/NaN|Infinity/);body.dispose();
 });
});

describe('hologram movement and pixels',()=>{
 it('stays front-facing from a saved left direction, placement, turns and travel in both directions',()=>{
  const {body,pet}=liveBody(-1);
  const check=()=>{const [x,y]=scales(pet);expect(x).toBeGreaterThan(.5);expect(x/y).toBeGreaterThan(.88);expect(x/y).toBeLessThan(1.12);};
  check();
  for(const facing of [1,-1]){
   body.place(450,facing);body.step(1/60);check();
   body.do('turn');for(let i=0;i<60;i++){body.step(1/60);check();}
   expect(body.layout().moving).toBe(false);
  }
  for(const [target,run] of [[200,false],[700,true]]){
   expect(body.walk(target,run,String(target))).toBe(true);
   for(let i=0;i<360;i++){body.step(1/60);check();}
   expect(Math.abs(body.layout().x-target)).toBeLessThan(2);
  }
  body.dispose();
 });
 it('follows the pointer on the correct side while its movement direction is left',()=>{
  const {body,pet}=liveBody(-1),face=pet.querySelector('[data-part="face"]');
  const gazeX=()=>Number(face.getAttribute('transform').match(/translate\(([^ ]+)/)[1]);
  body.pointer('move',{x:200,y:490,t:0});advance(body,1.2);expect(gazeX()).toBeLessThan(0);
  body.pointer('move',{x:700,y:490,t:1300});advance(body,1.2);expect(gazeX()).toBeGreaterThan(0);
  expect(scales(pet)[0]).toBeGreaterThan(0);body.dispose();
 });
 it('emits mint pixels when picked up and landed, limits stretching, then clears the particles',()=>{
  const {body,pet,fx,events}=liveBody();
  const hit=body.layout().hit[0];
  body.pointer('down',{x:hit.x,y:hit.y,t:0});
  body.pointer('move',{x:hit.x+20,y:hit.y-100,t:150});body.step(1/60);
  expect(body.layout().mode).toBe('drag');
  expect(fx.querySelectorAll('[data-holo-particle]')).not.toHaveLength(0);
  expect(fx.querySelector('circle.p-dust')).toBeNull();
  advance(body,.5);const [x,y]=scales(pet);expect(x/y).toBeGreaterThan(.88);expect(x/y).toBeLessThan(1.12);
  body.pointer('move',{x:hit.x+20,y:hit.y-100,t:800});
  body.pointer('up',{x:hit.x+20,y:hit.y-100,t:1000});
  let landed=false;
  for(let i=0;i<180;i++){
   body.step(1/60);
   if(body.layout().mode==='land'){
    landed=true;expect(fx.querySelectorAll('[data-holo-particle="dust"]').length).toBeGreaterThan(0);
    expect(fx.querySelector('circle.p-dust')).toBeNull();break;
   }
  }
  expect(landed).toBe(true);expect(events).toContainEqual({event:'touch',kind:'grab'});
  advance(body,3);expect(fx.querySelector('[data-holo-particle]')).toBeNull();
  expect(pet.innerHTML+fx.innerHTML).not.toMatch(/NaN|Infinity/);body.dispose();
 });
 it('uses mint pixel tears with its crying face',()=>{
  const {body,fx}=liveBody();body.do('cry');advance(body,.5);
  expect(fx.querySelector('[data-holo-particle="drop"]')).not.toBeNull();
  expect(fx.querySelector('.tearf')).toBeNull();body.dispose();
 });
});
