/** Plain floating squares surrounded by a few moving electrical particles. */
const block = `<rect data-part="plain-block" x="-23" y="-23" width="46" height="46" rx="1.5" fill="#82e5c4" stroke="#b9ffe2" stroke-width="2"/>
  <g data-module-particles="" fill="#c5ffe2" stroke="none" opacity="0">
    <rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/>
    <path d="M-29-8L-26-3L-30 2L-27 7" fill="none" stroke="#9cf6cf" stroke-width="1.2"/>
  </g>`;
export const MODULES = {
  victory: block, salute: block, approval: block, thinking: block, laughter: block,
};
export function createModuleParticles(poses) {
  const groups=poses.flatMap(pose=>[...pose.querySelectorAll('[data-module-particles]')].map(group=>({pose,group,parts:[...group.children]})));
  return time=>groups.forEach(({pose,group,parts},index)=>{
    if(Number(pose.getAttribute('opacity'))<.005)return;
    group.setAttribute('opacity','1');
    parts.slice(0,4).forEach((particle,i)=>{
      const progress=(time*.35+i/4+index*.11)%1*4,edge=Math.floor(progress),k=progress-edge;
      const [x,y]=[[-28+56*k,-28],[28,-28+56*k],[28-56*k,28],[-28,28-56*k]][edge];
      particle.setAttribute('x',(x-1.2).toFixed(2));particle.setAttribute('y',(y-1.2).toFixed(2));
      particle.setAttribute('opacity',String(.5+.3*Math.sin(time*8+i+index)));
    });
    parts[4].setAttribute('transform',`rotate(${Math.floor(time*1.5+index)%4*90})`);
    parts[4].setAttribute('opacity',String(Math.max(0,Math.sin(time*9+index))*.65));
  });
}
