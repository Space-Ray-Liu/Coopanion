/** Mint pixels and short scan trails, drawn in stage coordinates by the body kit. */
const f = n => Number(n.toFixed(2));
export const holoParticles = {
  grab: { at: [128, 139], radius: [96, 82], count: 24, speed: 95, life: [.45, .85] },
  land: { at: [128, 213], radius: [90, 12], count: 28, speed: 120, life: [.5, .9] },
  draw(p, { scale, progress }) {
    if (p.type !== 'dust' && p.type !== 'drop') return null;
    const seed = p.seed ?? .5, size = 4 + seed * 5;
    const opacity = (1 - progress) ** 1.5 * (.9 + .1 * Math.sin(p.age * 25 + seed * 20));
    const angle = seed < .5 ? 0 : 45;
    return `<g data-holo-particle="${p.type}" opacity="${f(opacity)}" transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(scale)})">
      <g transform="rotate(${angle})"><rect x="${f(-size * 1.25)}" y="${f(-size * 1.25)}" width="${f(size * 2.5)}" height="${f(size * 2.5)}" fill="#48dfb2" opacity=".12"/>
      <rect x="${f(-size / 2)}" y="${f(-size / 2)}" width="${f(size)}" height="${f(size)}" fill="#aaffdf"/>
      <path d="M${f(-size / 2)} 0H${f(size / 2)}" stroke="#effff8" stroke-width=".8"/></g>
      <path d="M${f(-size - 15 * (1 - progress))} 0h${f(8 + seed * 8)}" stroke="#87ffd6" stroke-width="1.3" opacity=".7"/>
      <rect x="${f(size + 3)}" y="${f(-size - 2)}" width="1.5" height="1.5" fill="#c7ffed"/>
    </g>`;
  },
};
