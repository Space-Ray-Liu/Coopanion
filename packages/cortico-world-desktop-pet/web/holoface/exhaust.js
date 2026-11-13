/** Stepped green exhaust plumes with moving square sparks, behind the hologram screen. */
export function createExhaust(group, filter) {
  group.setAttribute('filter', `url(#${filter})`);
  group.innerHTML = [0,1,2].map(i=>`<g transform="translate(${[42,214,128][i]} ${[192,192,228][i]})"><path fill="#1ceba4" opacity=".65"/><path fill="#b6ffb1" opacity=".8"/><rect width="3" height="5" fill="#d4ffd6"/></g>`).join('');
  return (time, effort) => {
    group.setAttribute('opacity',effort.toFixed(3));
    [...group.children].forEach((lane,i)=>{
      const height=(i===2?24:54)+(Math.sin(time*12+i*2)+1)*11;
      lane.children[0].setAttribute('d',`M-12 10H12V-6H8V-20H4V${-height}H-4V-24H-8V-9H-12Z`);
      lane.children[1].setAttribute('d',`M-4 8H4V-12H2V${-height*.65}H-2V-15H-4Z`);
      lane.children[2].setAttribute('x',String(Math.sin(time*3+i)*10));
      lane.children[2].setAttribute('y',String(5-((time*40+i*17)%90)));
    });
  };
}
