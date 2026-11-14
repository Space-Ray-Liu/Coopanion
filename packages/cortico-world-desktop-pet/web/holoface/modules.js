/** Eight triangular faces form each floating octahedron; electrical pixels orbit outside it. */
const vertices=[[0,-27,0],[0,27,0],[-19.1,0,-19.1],[19.1,0,-19.1],[19.1,0,19.1],[-19.1,0,19.1]];
const faces=[[0,2,3],[0,3,4],[0,4,5],[0,5,2],[1,3,2],[1,4,3],[1,5,4],[1,2,5]];
const module=`<g data-module=""><g data-part="octahedron" stroke="#b9ffe2" stroke-width="1.1" stroke-linejoin="round">${faces.map(()=>'<polygon/>').join('')}</g>
  <g data-module-particles="" fill="#c5ffe2" stroke="none" opacity="0">
    <rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/><rect width="2.4" height="2.4"/>
    <path d="M-32-8L-29-3L-33 2L-30 7" fill="none" stroke="#9cf6cf" stroke-width="1.2"/>
  </g></g>`;
export const MODULES={victory:module,salute:module,approval:module,thinking:module,laughter:module};
export function createModuleMotion(poses) {
  const groups=poses.flatMap(pose=>[...pose.querySelectorAll('[data-module]')].map(group=>({
    pose,facets:[...group.querySelector('[data-part="octahedron"]').children],
    particles:group.querySelector('[data-module-particles]'),
  })));
  return time=>groups.forEach(({pose,facets,particles},index)=>{
    if(Number(pose.getAttribute('opacity'))<.005)return;
    const yaw=.35+Math.sin(time*.55+index)*.22,pitch=-.25;
    const points=vertices.map(([x,y,z])=>{
      const u=x*Math.cos(yaw)+z*Math.sin(yaw),v=z*Math.cos(yaw)-x*Math.sin(yaw);
      return [u,y*Math.cos(pitch)-v*Math.sin(pitch),y*Math.sin(pitch)+v*Math.cos(pitch)];
    });
    faces.map((face,i)=>({face,top:i<4,depth:face.reduce((z,j)=>z+points[j][2],0)/3}))
      .sort((a,b)=>a.depth-b.depth).forEach(({face,top,depth},i)=>{
        facets[i].setAttribute('points',face.map(j=>points[j].slice(0,2).map(n=>n.toFixed(2)).join(',')).join(' '));
        const shade=(depth+27)/54;
        facets[i].setAttribute('fill',`rgb(${Math.round(49+shade*52+(top?16:0))},${Math.round(164+shade*58+(top?12:0))},${Math.round(135+shade*50+(top?10:0))})`);
      });
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
