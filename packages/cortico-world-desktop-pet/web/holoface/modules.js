/** A thin offset edge and an upper highlight give the octagonal plates a little depth. */
const octagon='-10,-24 10,-24 24,-10 24,10 10,24 -10,24 -24,10 -24,-10';
const module=`<g data-module=""><g data-part="octagon" stroke-linejoin="round">
    <polygon points="${octagon}" transform="translate(2.5 3)" fill="#329c80" stroke="#68c9aa" stroke-width="1"/>
    <polygon points="${octagon}" fill="#73d9b8" stroke="#b9ffe2" stroke-width="1.4"/>
    <path data-module-highlight="" d="M-23-10L-10-23H10L23-10" fill="none" stroke="#e0fff0" stroke-width="1.2" opacity=".65"/>
  </g>
  <g data-module-particles="" fill="#c5ffe2" stroke="none" opacity="0">
    <rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/>
    <path d="M-32-8L-29-3L-33 2L-30 7" fill="none" stroke="#9cf6cf" stroke-width="1.2"/>
  </g></g>`;
export const MODULES={victory:module,salute:module,approval:module,thinking:module,laughter:module};
export function createModuleMotion(poses) {
  const groups=poses.flatMap(pose=>[...pose.querySelectorAll('[data-module]')].map(group=>({
    pose,highlight:group.querySelector('[data-module-highlight]'),
    particles:group.querySelector('[data-module-particles]'),
  })));
  return time=>groups.forEach(({pose,highlight,particles},index)=>{
    if(Number(pose.getAttribute('opacity'))<.005)return;
    highlight.setAttribute('opacity',String(.6+Math.sin(time*1.5+index)*.1));
    particles.setAttribute('opacity','1');
    [...particles.children].slice(0,4).forEach((particle,i)=>{
      const a=time*1.25+i*Math.PI/2+index*.7;
      particle.setAttribute('x',(Math.cos(a)*31-1.2).toFixed(2));particle.setAttribute('y',(Math.sin(a)*34-1.2).toFixed(2));
      particle.setAttribute('opacity',String(.5+.3*Math.sin(time*8+i+index)));
    });
    const spark=particles.lastElementChild;
    spark.setAttribute('transform',`rotate(${Math.floor(time*1.5+index)%4*90})`);
    spark.setAttribute('opacity',String(Math.max(0,Math.sin(time*9+index))*.65));
  });
}
