/** The current stays at screen height while the projection contracts around it. */
const f=n=>Number(n.toFixed(2));
const noise=(tick,channel,seed)=>{
  let n=(tick^Math.imul(channel+1,374761393)^(seed*4294967295))>>>0;
  n=Math.imul(n^(n>>>16),2246822507);n=Math.imul(n^(n>>>13),3266489909);
  return ((n^(n>>>16))>>>0)/4294967296;
};
export function createTeleportCurrent(group,filter) {
  group.setAttribute('filter',`url(#${filter})`);group.setAttribute('opacity','0');
  group.innerHTML=`<g fill="none" stroke-linejoin="bevel" stroke-linecap="round">
      <path data-current="glow" stroke="#2be9ae" stroke-width="8" opacity=".3"/>
      <path data-current="mint" stroke="#75ffcf" stroke-width="3.5" opacity=".8"/>
      <path data-current="core" stroke="#e3fff5" stroke-width="1.4"/>
    </g><g data-part="teleport-fragments" fill="#beffe8">${Array.from({length:6},()=>'<rect/>').join('')}</g>`;
  const paths=[...group.querySelectorAll('path')],fragments=[...group.querySelectorAll('rect')];
  let visible=false;
  return (time,{electric,spread,seed})=>{
    if(electric<=0){if(visible)group.setAttribute('opacity','0');visible=false;return;}
    visible=true;
    const tick=Math.floor(time*38+Math.sin(time*11)*.8),r=i=>noise(tick,i,seed);
    const half=86*spread,amplitude=(3+r(30)*5)*Math.sqrt(spread),cy=140+(r(31)-.5)*3;
    group.setAttribute('opacity',f(electric*(.72+r(32)*.28)));
    const points=Array.from({length:19},(_,i)=>{
      const k=i/18,x=128+(k*2-1)*half,y=cy+(r(i)*2-1)*amplitude*(i===0||i===18?.2:1);
      return `${i?'L':'M'}${f(x)} ${f(y)}`;
    }).join(' ');
    for(const path of paths)path.setAttribute('d',points);
    fragments.forEach((rect,i)=>{
      const a=40+i*5;
      rect.setAttribute('x',f(128+(r(a)*2-1)*(half+4)));
      rect.setAttribute('y',f(cy+(i%2?1:-1)*(4+r(a+1)*12)*Math.sqrt(spread)));
      rect.setAttribute('width',f(1.4+r(a+2)*5));rect.setAttribute('height',f(1+r(a+3)*1.5));
      rect.setAttribute('opacity',f(r(a+4)>.25?.4+r(a+4)*.6:0));
    });
  };
}
