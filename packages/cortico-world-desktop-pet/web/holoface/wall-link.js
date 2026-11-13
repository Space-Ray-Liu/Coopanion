/** One electrical connection from the middle of the screen's side to the wall. */
export const WALL_PORTS = { left:[48,140], right:[208,140] };
const f = n => Number(n.toFixed(2));
export function createWallLink(group,filter) {
  group.setAttribute('filter',`url(#${filter})`);
  group.innerHTML=`<g data-part="wall-current" fill="none" stroke-linejoin="bevel">
      <path data-current="glow" stroke="#24d8a5" stroke-width="7" opacity=".25"/>
      <path data-current="core" stroke="#d4fff0" stroke-width="2.2"/>
      <path data-part="wall-contact" stroke="#8affd5" stroke-width="2"/>
    </g>
    <circle data-part="left-port" cx="48" cy="140" r="1.8" fill="#baffdf"/>
    <circle data-part="right-port" cx="208" cy="140" r="1.8" fill="#baffdf"/>
    <g data-part="current-sparks" fill="#d0ffeb"><rect x="-1.5" y="-1.5" width="3" height="3"/><rect x="-1" y="-1" width="2" height="2"/><rect x="-1" y="-1" width="2" height="2"/></g>`;
  const glow=group.querySelector('[data-current="glow"]'),core=group.querySelector('[data-current="core"]');
  const contact=group.querySelector('[data-part="wall-contact"]'),sparks=group.querySelector('[data-part="current-sparks"]');
  const ports={left:group.querySelector('[data-part="left-port"]'),right:group.querySelector('[data-part="right-port"]')};
  let strength=0,target=null,side='left';
  return (time,dt,wall,anchor)=>{
    if(anchor){target=anchor;side=wall;}
    strength+=((anchor?1:0)-strength)*(1-Math.exp(-dt*12));
    group.setAttribute('opacity',strength.toFixed(3));group.dataset.attached=anchor?'true':'false';
    if(!target)return strength;
    ports.left.setAttribute('opacity',side==='left'?'1':'0');ports.right.setAttribute('opacity',side==='right'?'1':'0');
    const start=WALL_PORTS[side],dx=target[0]-start[0],dy=target[1]-start[1];
    const arc=`M${start.join(' ')} `+Array.from({length:5},(_,i)=>{
      const k=(i+1)/5,bend=Math.sin(k*Math.PI)*Math.sin(time*25+i*2.7)*4;
      return `L${f(start[0]+dx*k)} ${f(start[1]+dy*k+bend)}`;
    }).join(' ');
    glow.setAttribute('d',arc);core.setAttribute('d',arc);
    contact.setAttribute('d',`M${f(target[0])} ${f(target[1]-5)}V${f(target[1]+5)}`);
    [...sparks.children].forEach((spark,i)=>{
      const k=(time*1.1+i/3)%1;
      spark.setAttribute('transform',`translate(${f(start[0]+dx*k)} ${f(start[1]+dy*k)})`);
      spark.setAttribute('opacity',String(Math.sin(k*Math.PI)));
    });
    return strength;
  };
}
