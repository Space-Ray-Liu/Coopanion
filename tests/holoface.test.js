import {afterEach,describe,expect,it} from 'vitest';
import {JSDOM} from 'jsdom';
import {FaceMotion,POSES,EXPRESSIONS,createHoloFigure} from '../packages/cortico-world-desktop-pet/web/holoface/face.js';
import {createHoloBody} from '../packages/cortico-world-desktop-pet/web/holoface/figure.js';
import * as kit from '../packages/cortico-world-desktop-pet/web/kit/body.js';
const windows=[];
afterEach(()=>{for(const w of windows.splice(0))w.close();});
function svg(){const dom=new JSDOM('<!doctype html><body><svg xmlns="http://www.w3.org/2000/svg"><g></g></svg></body>');windows.push(dom.window);return dom.window.document.querySelector('g');}
const frame=(face,t)=>({face,t,blink:0,talk:0,look:[0,0],mode:'idle'});

describe('hologram expression transitions',()=>{
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
