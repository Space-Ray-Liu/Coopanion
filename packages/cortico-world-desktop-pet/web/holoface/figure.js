/** Hologram pack adapter: the kit supplies movement, interaction, speech and work-state input. */
import { createHoloFigure } from './face.js';
export function createHoloBody(base, {kit,host}) {
  const figure=createHoloFigure();
  const words=Object.fromEntries(['victory','salute','thumbsup'].map(id=>[id,{expression:{like:'happy',seconds:4.5}}]));
  const body=kit.createBody(host,{figure,words});
  const originalDo=body.do;
  body.do=word=>{
    const accepted=originalDo(word);
    if(accepted) figure.request(word,word==='cry'?5:4.5);
    return accepted;
  };
  return body;
}
