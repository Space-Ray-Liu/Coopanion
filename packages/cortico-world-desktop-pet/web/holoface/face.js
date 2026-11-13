/** Continuous geometry for a mint hologram. Retargeting preserves velocity, including mid-expression. */
import { holoParticles } from './particles.js';
import { MODULES, createModuleParticles } from './modules.js';
import { createExhaust } from './exhaust.js';
import { createWallLink, WALL_PORTS } from './wall-link.js';
const N = 32;
const ellipse = (x, y, rx, ry, angle = 0) => Array.from({ length: N }, (_, i) => {
  const a = i * Math.PI * 2 / N, u = Math.cos(a) * rx, v = Math.sin(a) * ry;
  return [x + u * Math.cos(angle) - v * Math.sin(angle), y + u * Math.sin(angle) + v * Math.cos(angle)];
});
function polygon(points) {
  const lengths = points.map((p, i) => Math.hypot(p[0] - points[(i + 1) % points.length][0], p[1] - points[(i + 1) % points.length][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  return Array.from({ length: N }, (_, n) => {
    let d = total * n / N, i = 0;
    while (d > lengths[i] && i < lengths.length - 1) { d -= lengths[i]; i++; }
    const k = d / lengths[i], p = points[i], q = points[(i + 1) % points.length];
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  });
}
const shift = (points, x, y) => points.map(([a, b]) => [a + x, b + y]);
const up = (x, y) => shift(polygon([[-15, 5], [-4, -7], [4, -7], [15, 5], [10, 10], [0, 0], [-10, 10]]), x, y);
const squeeze = (x, y, mirror) => shift(polygon([[-12 * mirror, -13], [5 * mirror, 0], [-12 * mirror, 13], [-17 * mirror, 8], [-6 * mirror, 0], [-17 * mirror, -8]]), x, y);
const smile = (w = 24, depth = 12) => Array.from({length:N},(_,i)=>{
  const angle=i*Math.PI*2/N, s=Math.sin(angle);
  return [128+w*Math.cos(angle),169+(s>=0?(11+depth)*s:-8*s)];
});
function align(points) {
  let area=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
  const p=area<0?[...points].reverse():[...points];
  const cy=p.reduce((sum,x)=>sum+x[1],0)/p.length;
  let start=0;
  for(let i=1;i<p.length;i++) if(p[i][0]>p[start][0]+.01 || (Math.abs(p[i][0]-p[start][0])<.01 && Math.abs(p[i][1]-cy)<Math.abs(p[start][1]-cy))) start=i;
  return [...p.slice(start),...p.slice(0,start)];
}
const eyes = (l, r) => [...l.flat(), ...r.flat()];
function pose(left, right, mouth, props = {}) {
  const eye = (shape, cx) => shape.map(([x,y]) => [128 + (cx-128)*.82 + (x-cx)*1.22, 127 + (y-126)]);
  const lips = mouth.map(([x,y]) => [x, 164 + (y-178)*.9]);
  return [...eyes(align(eye(left,96)), align(eye(right,160))), ...align(lips).flat(), props.cool ?? 0, props.peace ?? 0, props.salute ?? 0, props.love ?? 0,
    props.thumb ?? 0, props.think ?? 0, props.laugh ?? 0, props.anger ?? 0, props.tears ?? 0, props.shock ?? 0];
}
export const EXPRESSIONS = ['neutral', 'smug', 'victory', 'salute', 'love', 'thumbsup', 'thinking', 'happy', 'angry', 'cry', 'surprised'];
export const POSES = {
  neutral: pose(ellipse(96,126,12,15), ellipse(160,126,12,15), smile(20,0)),
  smug: pose(ellipse(96,126,13,8), ellipse(160,126,13,8), polygon([[112,172],[138,178],[148,171],[144,184],[124,184],[111,179]]), {cool:1}),
  victory: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(29,11), {peace:1}),
  salute: pose(ellipse(96,126,10,14), ellipse(160,126,10,14), smile(18,0), {salute:1}),
  love: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(31,12), {love:1}),
  thumbsup: pose(up(96,126), up(160,126), ellipse(128,174,10,9), {thumb:1}),
  thinking: pose(ellipse(96,121,14,16), ellipse(160,121,14,16), polygon([[115,171],[137,171],[139,177],[114,179]]), {think:1}),
  happy: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(34,15), {laugh:1}),
  angry: pose(shift(polygon([[-15,-14],[15,-2],[12,16],[-5,13]]),96,126), shift(polygon([[15,-14],[-15,-2],[-12,16],[5,13]]),160,126), polygon([[116,180],[140,180],[140,188],[116,188]]), {anger:1}),
  cry: pose(up(96,121), up(160,121), polygon([[112,164],[144,164],[148,174],[148,206],[108,206],[108,174]]), {tears:1}),
  surprised: pose(ellipse(96,126,7,21), ellipse(160,126,7,21), polygon([[120,173],[136,173],[137,197],[119,197]]), {shock:1}),
  strained: pose(squeeze(96,126,1), squeeze(160,126,-1), polygon([[113,176],[143,176],[143,184],[113,184]]), {anger:.6}),
};
export class FaceMotion {
  constructor(initial = 'neutral') {
    this.values = [...POSES[initial]];
    this.velocity = this.values.map(() => 0);
    this.target = [...this.values];
    this.expression = initial;
  }
  set(expression) {
    if (!POSES[expression]) return false;
    this.target = POSES[expression]; this.expression = expression; return true;
  }
  step(dt) {
    const h = Math.max(0, Math.min(dt, .08)), omega = 11, decay = Math.exp(-omega*h);
    this.values = this.values.map((x,i) => {
      const d=x-this.target[i], v=this.velocity[i], j=(v+omega*d)*h;
      this.velocity[i]=(v-omega*j)*decay;
      return this.target[i]+(d+j)*decay;
    });
  }
}
const fixed = n => Number(n.toFixed(2));
function path(points) {
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const first=mid(points[points.length-1],points[0]);
  return `M${first.map(fixed).join(' ')} `+points.map((p,i)=>`Q${p.map(fixed).join(' ')} ${mid(p,points[(i+1)%points.length]).map(fixed).join(' ')}`).join(' ')+' Z';
}
const points = (values, offset, close=0, cy=126) => Array.from({length:N},(_,i)=>[values[offset+i*2], cy+(values[offset+i*2+1]-cy)*(1-close)]);
const head = 'M78 62H178Q184 62 188 66L204 82Q208 86 208 92V188Q208 194 204 198L188 214Q184 218 178 218H78Q72 218 68 214L52 198Q48 194 48 188V92Q48 86 52 82L68 66Q72 62 78 62Z';
const heart = 'M0 8C-27-7-16-28 0-15C16-28 27-7 0 8Z';
let sequence = 0;
export function createHoloFigure() {
  const motion = new FaceMotion();
  let elements = null, exhaust = null, wallLink = null, moduleParticles = null, previousT = 0, requested = null, requestedUntil = 0, t = 0;
  const id = `hf${++sequence}`;
  const make = (group) => {
    group.innerHTML = `<defs>
      <filter id="${id}-glow" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="5.5"/></filter>
      <filter id="${id}-pixelglow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="1.3" flood-color="#74f9c8" flood-opacity=".7"/></filter>
      <pattern id="${id}-scan" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5H3" stroke="#beffe9" stroke-width=".55" opacity=".36"/></pattern>
      <pattern id="${id}-pixels" width="3.8" height="3.8" patternUnits="userSpaceOnUse"><rect width="2.6" height="2.6" rx=".4" fill="#c4fff0"/></pattern>
      <linearGradient id="${id}-glass" x2="0" y2="1"><stop stop-color="#77eac2" stop-opacity=".46"/><stop offset="1" stop-color="#42caa1" stop-opacity=".28"/></linearGradient>
      <clipPath id="${id}-lenses"><path d="M72 106H122L119 139H70ZM134 106H184L186 139H137Z"/></clipPath>
      <clipPath id="${id}-clip"><path d="${head}"/></clipPath>
      <clipPath id="${id}-mouthclip"><path data-part="mouthclip"/></clipPath>
    </defs>
    <g data-part="float">
      <g data-part="exhaust"/>
      <path d="${head}" stroke="#35e2af" stroke-width="16" fill="none" opacity=".4" filter="url(#${id}-glow)"/>
      <path data-part="shell" d="${head}" fill="url(#${id}-glass)" stroke="#7afcce" stroke-width="2.4" stroke-linejoin="round"/>
      <path data-part="heat" d="${head}" fill="#ff6468" opacity="0"/>
      <path d="M79 69H177L201 93V187L177 211H79L55 187V93Z" fill="none" stroke="#d2ffef" stroke-width="1.2" opacity=".65"/>
      <path d="M82 76H174L194 96V184L174 204H82L62 184V96Z" fill="none" stroke="#71e1b8" stroke-width="1.2" opacity=".5"/>
      <g clip-path="url(#${id}-clip)"><path d="${head}" fill="url(#${id}-scan)"/><rect data-part="beam" x="42" y="40" width="174" height="10" fill="#b7ffe6" opacity=".12"/></g>
      <g data-part="face" fill="url(#${id}-pixels)" stroke="#bcffe8" stroke-width="1.2" stroke-linejoin="round" filter="url(#${id}-pixelglow)">
        <path data-part="left"/><path data-part="right"/><path data-part="mouth" fill="#4bd5ab"/>
        <g clip-path="url(#${id}-mouthclip)" opacity=".8"><path data-part="teeth" d="M90 158Q128 165 166 158" fill="none" stroke="#d8fff2" stroke-width="4"/></g>
      </g>
      <g data-part="cool"><path d="M72 106H122L119 139H70ZM134 106H184L186 139H137Z" fill="#258f74" stroke="#adffe3" stroke-width="4"/><path d="M121 115H137M80 111L74 132M91 111L84 133M143 111L139 131M155 111L148 133" fill="none" stroke="#bcffeb" stroke-width="4"/><g clip-path="url(#${id}-lenses)"><path data-part="shine" d="M70 98L50 146H62L82 98Z" fill="#dbfff3" opacity=".45"/></g></g>
      <g data-part="tears" fill="#a5ffe2" stroke="#d0ffed" stroke-width="1"><path data-part="teartracks" d="M89 141V153H83V169H89V202H95M167 141V153H173V169H167V202H161" fill="none" stroke-width="1.7" opacity=".65"/><path d="M80 156H91M80 162H91M165 156H176M165 162H176M85 190H93M163 190H171" fill="none" opacity=".5"/><g data-part="tearflow"/></g>
      <g data-part="peace" fill="#81e8c8" stroke="#c0ffed" stroke-width="3.5" stroke-linejoin="round"><g data-part="peaceleft"/><g data-part="peaceright"/></g>
      <g data-part="salute">${MODULES.salute}</g>
      <g data-part="thumb">${MODULES.approval}</g>
      <g data-part="think">${MODULES.thinking}</g>
      <g data-part="laughmodules"><g data-part="laughleft" transform="translate(54 189)">${MODULES.laughter}</g><g data-part="laughright" transform="translate(202 189) scale(-1 1)">${MODULES.laughter}</g></g>
      <g data-part="hearts" fill="#ff977e" stroke="#ffd2b5" stroke-width="2"><path data-part="heartleft" d="${heart}"/><path data-part="heartright" d="${heart}"/></g>
      <path data-part="star" d="M59 76L63 90L77 94L63 99L59 113L54 99L40 94L54 90Z" fill="#d5fff0"/>
      <g data-part="anger" fill="#b8ffe3"><path d="M115 96V103M121 93V101M127 95V102" stroke="#b8ffe3" stroke-width="3"/></g>
    </g><g data-part="wall-link"/>`;
    const get = name => group.querySelector(`[data-part="${name}"]`);
    elements = Object.fromEntries(['float','face','left','right','mouth','mouthclip','teeth','cool','shine','tears','tearflow','peace','peaceleft','peaceright','salute','thumb','think','laughmodules','hearts','heartleft','heartright','star','anger','beam','exhaust','heat','wall-link'].map(name=>[name,get(name)]));
    exhaust=createExhaust(elements.exhaust,`${id}-pixelglow`);
    wallLink=createWallLink(elements['wall-link'],`${id}-pixelglow`);
    elements.peaceleft.innerHTML=MODULES.victory; elements.peaceright.innerHTML=MODULES.victory;
    moduleParticles=createModuleParticles(['peace','salute','thumb','think','laughmodules'].map(name=>elements[name]));
    for(const name of ['peace','salute','thumb','think','laughmodules']){
      elements[name].setAttribute('filter',`url(#${id}-pixelglow)`);
    }
    elements.tearflow.innerHTML=Array.from({length:8},()=>'<rect width="5" height="8"/>').join('');
  };
  const setWeight=(name,w)=>elements[name].setAttribute('opacity',Math.max(0,Math.min(1,w)).toFixed(3));
  const aliases={sad:'cry',worried:'cry',smile:'neutral',excited:'victory',shy:'love',smug:'smug',sleepy:'neutral',sleep:'neutral',dizzy:'surprised',dragged:'surprised',listening:'surprised',determined:'angry',run:'neutral',pout:'angry',scared:'surprised',flustered:'surprised',content:'neutral',wink:'salute',waking:'surprised',squeeze:'neutral',laugh:'happy'};
  return {
    motion,
    request(expression, seconds=4) { if (!POSES[expression]) return false; requested=expression; requestedUntil=t+seconds; return true; },
    draw(group, face, frame) {
      if (!elements || !elements.float.isConnected) make(group);
      const dt = Math.max(0,Math.min(.08,frame.t-previousT)); previousT=frame.t; t=frame.t;
      let expression = requested && t<requestedUntil ? requested : (POSES[frame.face] ? frame.face : aliases[frame.face] ?? 'neutral');
      if (!requested && frame.face==='neutral' && frame.status) expression='thinking';
      if (requested && t>=requestedUntil) requested=null;
      if (!requested && (frame.effort??0)>.4) expression='strained';
      if (!requested && (frame.impact??0)>.15) expression='cry';
      if (frame.mode==='sleep') expression='neutral';
      if (motion.expression!==expression) motion.set(expression);
      motion.step(dt);
      const v=motion.values, w=v.slice(N*6), blink=frame.mode==='sleep'?.97:Math.min(.97,frame.blink??0);
      const left=points(v,0,blink), right=points(v,N*2,blink), mouth=points(v,N*4,0,178);
      const gaze=frame.look??[0,0], dx=gaze[0]*.3, dy=gaze[1]*.23;
      elements.face.setAttribute('transform',`translate(${fixed(dx)} ${fixed(dy)})`);
      elements.left.setAttribute('d',path(left)); elements.right.setAttribute('d',path(right));
      for(const p of mouth) p[1]+=(p[1]-162)*((frame.talk??0)*.22+Math.sin(t*4)*w[9]*.06);
      const mouthD=path(mouth); elements.mouth.setAttribute('d',mouthD);elements.mouthclip.setAttribute('d',mouthD);
      const dark=Math.max(0,Math.min(1,w[8]+w[9]));
      elements.mouth.setAttribute('fill',`rgb(${[124,233,196].map((n,i)=>Math.round(n+([57,142,116][i]-n)*dark)).join(',')})`);
      elements.teeth.setAttribute('opacity',Math.max(w[1],w[3],w[6])*.9);
      const bob=Math.sin(t*2.2)*1.5+Math.sin(t*13)*w[8]*1.4;
      elements.float.setAttribute('transform',`translate(${fixed(Math.sin(t*21)*w[7]*.7)} ${fixed(bob)}) rotate(${fixed(Math.sin(t*1.2)*w[5]*3)} 128 155)`);
      elements.beam.setAttribute('y',String(64+(t*23)%151));
      const mounted=wallLink(t,dt,frame.wall,frame.wallAnchor);
      ['cool','peace','salute','hearts','thumb','think','laughmodules','anger','tears'].forEach((name,i)=>{
        const isModule=['peace','salute','thumb','think','laughmodules'].includes(name);
        setWeight(name,w[i]*(isModule?1-mounted:1));
      });
      const mechanicalTears=Math.max(w[8],frame.impact??0);
      setWeight('tears',mechanicalTears);
      elements.heat.setAttribute('opacity',String((frame.effort??0)*.32));
      exhaust(t,frame.effort??0);
      elements.shine.setAttribute('transform',`translate(${fixed((t*22)%220-70)} 0)`);
      elements.cool.setAttribute('transform',`translate(128 ${fixed(122-18*(1-w[0]))}) scale(1.09 1.02) translate(-128 -122)`);
      elements.peaceleft.setAttribute('transform',`translate(44 ${fixed(142+22*(1-w[1])+Math.sin(t*3)*4)})`);
      elements.peaceright.setAttribute('transform',`translate(212 ${fixed(142+22*(1-w[1])-Math.sin(t*3)*4)})`);
      elements.salute.setAttribute('transform',`translate(57 ${fixed(112+30*(1-w[2])+Math.sin(t*3)*3)}) rotate(-12)`);
      elements.thumb.setAttribute('transform',`translate(205 ${fixed(149+20*(1-w[4])+Math.sin(t*4)*2)})`);
      elements.think.setAttribute('transform',`translate(${fixed(128+Math.sin(t*1.5)*1.5)} ${fixed(193+14*(1-w[5]))})`);
      elements.laughmodules.setAttribute('transform',`translate(0 ${fixed(14*(1-w[6])+Math.sin(t*3)*4)})`);
      moduleParticles(t);
      elements.heartleft.setAttribute('transform',`translate(46 ${fixed(213-Math.sin(t*2)*4)}) scale(${fixed(.9+Math.sin(t*4)*.07)}) rotate(-17)`);
      elements.heartright.setAttribute('transform',`translate(204 ${fixed(88+Math.sin(t*2.1)*4)}) scale(${fixed(1+Math.sin(t*4+.5)*.08)}) rotate(15)`);
      setWeight('star',w[2]*(.75+Math.sin(t*4)*.25));
      if(mechanicalTears>.001) [...elements.tearflow.children].forEach((rect,i)=>{
        const y=142+((t*40+i%4*17)%66),x=y>153&&y<169?83:89;
        rect.setAttribute('x',String(i<4?x-2:256-x-2));rect.setAttribute('y',fixed(y));rect.setAttribute('opacity',fixed(1-(y-142)/76));
      });
      group.dataset.expression=expression;
    },
    mirror:false, particles:holoParticles,
    colors:{z:'#76eec3'}, extent:[8,22,248,252], hits:[[128,140,80]], anchors:{gaze:[128,127],tear:[102,140],tears:[[102,140],[154,140]],bubble:[128,56],wall:[WALL_PORTS.left[0],WALL_PORTS.right[0],WALL_PORTS.left[1]]},
    groupScale(mode,sx,sy){return [1+(sx-1)*.16,1+(sy-1)*.16];},
    groupTilt(mode,tilt,lean){return tilt+lean*.25;},
  };
}
