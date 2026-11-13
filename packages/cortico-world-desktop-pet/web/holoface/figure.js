/** Hologram pack adapter: the kit supplies movement, interaction, speech and work-state input. */
import { createHoloFigure } from './face.js';
import { HOLO_BEHAVIOUR, HoloEnvironment } from './environment.js';
export function createHoloBody(base, {kit,host}) {
  const figure=createHoloFigure();
  const words=Object.fromEntries(['victory','salute','thumbsup'].map(id=>[id,{expression:{like:'happy',seconds:4.5}}]));
  for(const id of ['climb-left','climb-right']) words[id]={motion:{seconds:60}};
  const environment=new HoloEnvironment();
  const body=kit.createBody(host,{figure,words,...HOLO_BEHAVIOUR});
  const originalSet=body.set, originalStep=body.step;
  body.set=state=>{if('system' in state)environment.sample(state.system);originalSet(state);};
  body.step=dt=>{originalSet(environment.step(dt));originalStep(dt);};
  const originalDo=body.do;
  body.do=word=>{
    const accepted=originalDo(word);
    if(accepted) figure.request(word,word==='cry'?5:4.5);
    return accepted;
  };
  return body;
}
