/** Hologram pack adapter: the kit supplies movement, interaction, speech and work-state input. */
import { createHoloFigure } from './face.js';
import { HOLO_BEHAVIOUR, HoloEnvironment } from './environment.js';
import { HOLO_SIGNAL } from './signal.js';
export function createHoloBody(base, {kit,host,random=Math.random}) {
  const figure=createHoloFigure({random,autoRelocate:true});
  const words=Object.fromEntries(['victory','salute','thumbsup'].map(id=>[id,{expression:{like:'happy',seconds:4.5}}]));
  for(const id of ['climb-left','climb-right']) words[id]={motion:{seconds:60}};
  const environment=new HoloEnvironment();
  const projection=host.root.ownerDocument.createElement('div');
  projection.dataset.holoProjection='';projection.style.cssText='position:absolute;inset:0';
  host.root.appendChild(projection);
  const body=kit.createBody({...host,root:projection},{figure,words,...HOLO_BEHAVIOUR,fall:{
    before:HOLO_SIGNAL.fallLead,avoid:time=>figure.signal.evadeFall(time),active:()=>!!figure.signal.relocation?.fall,
  }});
  const [shadow,,effects]=projection.querySelector('svg').children;
  const interaction={dialogOpen:false,listening:false,thinking:false,status:null};
  const originalSet=body.set, originalStep=body.step;
  body.set=state=>{
    if('system' in state)environment.sample(state.system);
    for(const key of Object.keys(interaction))if(key in state)interaction[key]=state[key];
    originalSet(state);
  };
  body.step=dt=>{
    figure.signal.paused=originalLayout().pressing||Object.values(interaction).some(Boolean);
    originalSet(environment.step(dt));originalStep(dt);
    const jump=figure.signal.takeRelocation();
    if(jump)body.relocate(jump.edge,jump.position);
    projection.style.opacity=figure.signal.hidden?'0':'1';
    const visibility=figure.signal.visual.scaleY;
    shadow.setAttribute('opacity',String(Number(shadow.getAttribute('opacity'))*visibility));
    effects.setAttribute('opacity',String(visibility));
  };
  const originalLayout=body.layout,originalDispose=body.dispose;
  body.layout=()=>{
    const layout=originalLayout();
    return {...layout,moving:layout.moving||figure.signal.active,...(figure.signal.hidden?{hit:[]}: {})};
  };
  body.dispose=()=>{originalDispose();projection.remove();};
  const originalDo=body.do;
  body.do=word=>{
    const accepted=originalDo(word);
    if(accepted) figure.request(word,word==='cry'?5:4.5);
    return accepted;
  };
  return body;
}
