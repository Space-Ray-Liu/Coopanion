/** A magnetic sled coupled to the screen edge by animated electrical arcs. */
export const WALL_PORTS = { left:[84,227], right:[172,227] };
const f = n => Number(n.toFixed(2));
export function createMagneticBase(group,filter) {
  group.setAttribute('filter',`url(#${filter})`);
  group.innerHTML=`<g data-part="wall-current" fill="none" stroke-linejoin="bevel">
      <path data-current="glow" stroke="#24d8a5" stroke-width="8" opacity=".25"/>
      <path data-current="core" stroke="#d4fff0" stroke-width="2.2"/>
      <path data-current="branch" stroke="#73f4c9" stroke-width="1.2" opacity=".7"/>
      <path data-part="wall-contact" stroke="#8affd5" stroke-width="2"/>
    </g>
    <g data-part="magnetic-sled" stroke="#9cf3cc" stroke-width="1.7" stroke-linejoin="bevel">
      <path d="M91 219H165L172 224V231L165 236H91L84 231V224Z" fill="#3ba17f" fill-opacity=".4"/>
      <path d="M110 218V214M146 218V214" fill="none" stroke="#70dbb4"/>
      <path d="M128 221L136 227L128 233L120 227Z" fill="#a5ffda" fill-opacity=".5"/>
      <circle data-part="left-port" cx="84" cy="227" r="3" fill="#baffdf"/>
      <circle data-part="right-port" cx="172" cy="227" r="3" fill="#baffdf"/>
    </g>
    <g data-part="current-sparks" fill="#d0ffeb"><path d="M0-2.5L2.5 0L0 2.5L-2.5 0Z"/><path d="M0-2L2 0L0 2L-2 0Z"/><path d="M0-2L2 0L0 2L-2 0Z"/></g>`;
  const paths=Object.fromEntries([...group.querySelectorAll('[data-current]')].map(el=>[el.dataset.current,el]));
  const contact=group.querySelector('[data-part="wall-contact"]'),sparks=group.querySelector('[data-part="current-sparks"]');
  let strength=0,target=null,side='left';
  return (time,dt,wall,anchor)=>{
    if(anchor){target=anchor;side=wall;}
    strength+=((anchor?1:0)-strength)*(1-Math.exp(-dt*12));
    group.setAttribute('opacity',strength.toFixed(3));
    group.dataset.attached=anchor?'true':'false';
    if(!target)return strength;
    const start=WALL_PORTS[side],dx=target[0]-start[0],dy=target[1]-start[1];
    const arc=phase=>`M${start.join(' ')} `+Array.from({length:7},(_,i)=>{
      const k=(i+1)/7,bend=Math.sin(k*Math.PI)*Math.sin(time*25+i*2.7+phase)*5;
      return `L${f(start[0]+dx*k)} ${f(start[1]+dy*k+bend)}`;
    }).join(' ');
    const main=arc(0);paths.glow.setAttribute('d',main);paths.core.setAttribute('d',main);paths.branch.setAttribute('d',arc(2));
    contact.setAttribute('d',`M${f(target[0])} ${f(target[1]-9)}V${f(target[1]+9)}`);
    [...sparks.children].forEach((spark,i)=>{
      const k=(time*1.1+i/3)%1;
      spark.setAttribute('transform',`translate(${f(start[0]+dx*k)} ${f(start[1]+dy*k)})`);
      spark.setAttribute('opacity',String(Math.sin(k*Math.PI)));
    });
    return strength;
  };
}
