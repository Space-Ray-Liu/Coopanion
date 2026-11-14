/** Impact interrupts the projection in uneven bursts, recovering within three seconds. */
const dropouts = [[.02,.12,.9],[.2,.25,.65],[.65,.77,.8],[1.22,1.31,.7],[1.94,2.04,.8],[2.6,2.68,.6]];
export function createProjectionSignal(projection, gaps, noise) {
  let started = -Infinity, previousImpact = 0;
  return (time, impact) => {
    if (impact > previousImpact) started = time;
    previousImpact = impact;
    const age = time - started, pulse = dropouts.find(([from,to]) => age >= from && age < to);
    const amount = pulse ? pulse[2] * Math.max(0,1-age/3) : 0;
    projection.setAttribute('opacity',(1-amount).toFixed(3));
    gaps.setAttribute('opacity',amount.toFixed(3));
    noise.setAttribute('opacity',(amount*.75).toFixed(3));
    if (!amount) return;
    const row = 83 + Math.floor(age*31)%6*21;
    [...gaps.children].forEach((gap,i) => {
      gap.setAttribute('y',String(row+i*31));
      gap.setAttribute('height',String(1+amount*(i?2:6)));
    });
    noise.setAttribute('transform',`translate(${Math.floor(age*43)%2?5:-5} ${row})`);
  };
}
