/** Continuous geometry for a mint hologram. Retargeting preserves velocity, including mid-expression. */
import { holoParticles } from './particles.js';
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
const smile = (w = 24, depth = 12) => polygon([[128-w,169], [128,177], [128+w,169], [128+w-5,175+depth], [128,180+depth], [128-w+5,175+depth]]);
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
  const eye = (shape, cx) => shape.map(([x,y]) => [128 + (cx-128)*.94 + (x-cx)*1.14, 125 + (y-126)]);
  const lips = mouth.map(([x,y]) => [128 + (x-128)*1.1, 172 + (y-178)*.9]);
  return [...eyes(align(eye(left,96)), align(eye(right,160))), ...align(lips).flat(), props.cool ?? 0, props.peace ?? 0, props.salute ?? 0, props.love ?? 0,
    props.thumb ?? 0, props.think ?? 0, props.laugh ?? 0, props.anger ?? 0, props.tears ?? 0, props.shock ?? 0];
}
export const EXPRESSIONS = ['neutral', 'smug', 'victory', 'salute', 'love', 'thumbsup', 'thinking', 'happy', 'angry', 'cry', 'surprised'];
export const POSES = {
  neutral: pose(ellipse(96,126,12,15), ellipse(160,126,12,15), smile(20,0)),
  smug: pose(ellipse(96,126,13,8), ellipse(160,126,13,8), polygon([[112,172],[138,178],[148,171],[144,184],[124,184],[111,179]]), {cool:1}),
  victory: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(27,11), {peace:1}),
  salute: pose(ellipse(96,126,10,14), ellipse(160,126,10,14), smile(18,0), {salute:1}),
  love: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(28,10), {love:1}),
  thumbsup: pose(up(96,126), up(160,126), ellipse(128,174,10,9), {thumb:1}),
  thinking: pose(ellipse(96,121,14,16), ellipse(160,121,14,16), polygon([[115,171],[137,171],[139,177],[114,179]]), {think:1}),
  happy: pose(squeeze(96,126,1), squeeze(160,126,-1), smile(31,16), {laugh:1}),
  angry: pose(shift(polygon([[-15,-14],[15,-2],[12,16],[-5,13]]),96,126), shift(polygon([[15,-14],[-15,-2],[-12,16],[5,13]]),160,126), polygon([[116,180],[140,180],[140,188],[116,188]]), {anger:1}),
  cry: pose(up(96,121), up(160,121), polygon([[112,164],[144,164],[148,174],[148,206],[108,206],[108,174]]), {tears:1}),
  surprised: pose(ellipse(96,126,7,21), ellipse(160,126,7,21), polygon([[120,173],[136,173],[137,197],[119,197]]), {shock:1}),
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
const head = 'M73 64H183Q189 64 193 68L209 84Q213 88 213 95V183Q213 190 209 194L192 211Q188 215 181 215H75Q68 215 64 211L47 194Q43 190 43 183V95Q43 88 47 84L63 68Q67 64 73 64Z';
const heart = 'M0 8C-27-7-16-28 0-15C16-28 27-7 0 8Z';
let sequence = 0;
export function createHoloFigure() {
  const motion = new FaceMotion();
  let elements = null, previousT = 0, requested = null, requestedUntil = 0, t = 0;
  const id = `hf${++sequence}`;
  const make = (group) => {
    group.innerHTML = `<defs>
      <filter id="${id}-glow" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="5.5"/></filter>
      <filter id="${id}-pixelglow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="1.3" flood-color="#74f9c8" flood-opacity=".7"/></filter>
      <pattern id="${id}-scan" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5H3" stroke="#beffe9" stroke-width=".55" opacity=".36"/></pattern>
      <pattern id="${id}-pixels" width="3.8" height="3.8" patternUnits="userSpaceOnUse"><rect width="2.6" height="2.6" rx=".4" fill="#c4fff0"/></pattern>
      <pattern id="${id}-hands" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#80e8c5" fill-opacity=".8"/><path d="M0 1H3" stroke="#d4ffed" stroke-width=".6" opacity=".5"/></pattern>
      <linearGradient id="${id}-glass" x2="0" y2="1"><stop stop-color="#77eac2" stop-opacity=".46"/><stop offset="1" stop-color="#42caa1" stop-opacity=".28"/></linearGradient>
      <clipPath id="${id}-lenses"><path d="M72 106H122L119 139H70ZM134 106H184L186 139H137Z"/></clipPath>
      <clipPath id="${id}-clip"><path d="${head}"/></clipPath>
      <clipPath id="${id}-mouthclip"><path data-part="mouthclip"/></clipPath>
    </defs>
    <g data-part="float">
      <path d="${head}" stroke="#35e2af" stroke-width="16" fill="none" opacity=".4" filter="url(#${id}-glow)"/>
      <path data-part="shell" d="${head}" fill="url(#${id}-glass)" stroke="#7afcce" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M74 71H182Q186 71 189 74L203 88Q206 91 206 96V182Q206 186 203 189L188 205Q185 208 180 208H76Q71 208 68 205L53 189Q50 186 50 182V96Q50 91 53 88L67 74Q70 71 74 71Z" fill="none" stroke="#d2ffef" stroke-width="1.2" opacity=".65"/>
      <path d="M77 78H179L199 98V180L180 201H76L57 180V98Z" fill="none" stroke="#71e1b8" stroke-width="1.2" opacity=".5"/>
      <g clip-path="url(#${id}-clip)"><path d="${head}" fill="url(#${id}-scan)"/><rect data-part="beam" x="42" y="40" width="174" height="10" fill="#b7ffe6" opacity=".12"/></g>
      <g data-part="face" fill="url(#${id}-pixels)" stroke="#bcffe8" stroke-width="1.2" stroke-linejoin="round" filter="url(#${id}-pixelglow)">
        <path data-part="left"/><path data-part="right"/><path data-part="mouth" fill="#4bd5ab"/>
      </g>
      <g clip-path="url(#${id}-mouthclip)" opacity=".8"><path data-part="teeth" d="M96 166Q128 173 160 166" fill="none" stroke="#d8fff2" stroke-width="4"/></g>
      <g data-part="cool"><path d="M72 106H122L119 139H70ZM134 106H184L186 139H137Z" fill="#258f74" stroke="#adffe3" stroke-width="4"/><path d="M121 115H137M80 111L74 132M91 111L84 133M143 111L139 131M155 111L148 133" fill="none" stroke="#bcffeb" stroke-width="4"/><g clip-path="url(#${id}-lenses)"><path data-part="shine" d="M70 98L50 146H62L82 98Z" fill="#dbfff3" opacity=".45"/></g></g>
      <g data-part="tears" fill="#a5ffe2" stroke="#d0ffed" stroke-width="1"><g data-part="tearflow"/></g>
      <g data-part="peace" fill="#81e8c8" stroke="#c0ffed" stroke-width="3.5" stroke-linejoin="round"><g data-part="peaceleft"/><g data-part="peaceright"/></g>
      <g data-part="salute" fill="#82e8c6" stroke="#c7fff0" stroke-width="3" stroke-linejoin="round"><path d="M40 153L33 135L45 126L54 117L71 102Q79 96 82 102L64 123L76 119Q84 118 82 125L61 151L54 166Z"/><path d="M43 133L62 139M48 126L67 132M53 119L71 125" fill="none" stroke="#4abd99" stroke-width="2.4"/><path d="M41 161L53 151L64 163L51 179Z"/></g>
      <g data-part="thumb" fill="#83e9c8" stroke="#c3ffeb" stroke-width="3"><path d="M184 146L192 131L192 113Q192 103 200 107L205 129H222Q231 129 229 139L222 164H193L184 159Z"/><path d="M184 143H193V168H184Z" fill="#52cba6"/><path d="M207 139H225M205 148H223M203 157H220" fill="none" stroke="#43b18e" stroke-width="2"/></g>
      <g data-part="think" fill="#8deace" stroke="#c4ffed" stroke-width="3"><path d="M115 207L106 193L118 184L127 195L154 179Q162 175 165 181L144 201L131 216Z"/><path d="M113 204L105 212L115 226L129 216Z" fill="#57c8a9"/></g>
      <g data-part="fists" fill="#8ae8c8" stroke="#c6ffec" stroke-width="3"><path d="M52 177H69Q76 177 76 184V198Q76 205 69 205H52Z"/><path d="M204 177H187Q180 177 180 184V198Q180 205 187 205H204Z"/><path d="M55 184H69M55 191H69M187 184H201M187 191H201" stroke="#3bb68f" stroke-width="2"/></g>
      <g data-part="hearts" fill="#ff977e" stroke="#ffd2b5" stroke-width="2"><path data-part="heartleft" d="${heart}"/><path data-part="heartright" d="${heart}"/></g>
      <path data-part="star" d="M59 76L63 90L77 94L63 99L59 113L54 99L40 94L54 90Z" fill="#d5fff0"/>
      <g data-part="anger" fill="#b8ffe3"><path d="M115 96V103M121 93V101M127 95V102" stroke="#b8ffe3" stroke-width="3"/></g>
    </g>`;
    const get = name => group.querySelector(`[data-part="${name}"]`);
    elements = Object.fromEntries(['float','face','left','right','mouth','mouthclip','teeth','cool','shine','tears','tearflow','peace','peaceleft','peaceright','salute','thumb','think','fists','hearts','heartleft','heartright','star','anger','beam'].map(name=>[name,get(name)]));
    const hand = '<path d="M-14 37L-28-28Q-30-37-23-39Q-16-41-14-31L-2 5L0-48Q0-58 8-58Q16-58 15-48L12 12L18 1Q23-7 29-3Q34 1 29 10L16 37V59H-12Z"/><path d="M-10 26H14M-10 36H14M-9 46H13" fill="none" stroke="#45b994" stroke-width="2.5"/>';
    elements.peaceleft.innerHTML=hand; elements.peaceright.innerHTML=hand;
    for(const name of ['peace','salute','thumb','think','fists']){
      elements[name].setAttribute('fill',`url(#${id}-hands)`);
      elements[name].setAttribute('filter',`url(#${id}-pixelglow)`);
    }
    elements.tearflow.innerHTML=Array.from({length:8},(_,i)=>`<rect x="${i<4?83:169}" width="7" height="12" rx="2"/>`).join('');
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
      if (frame.mode==='sleep') expression='neutral';
      if (motion.expression!==expression) motion.set(expression);
      motion.step(dt);
      const v=motion.values, w=v.slice(N*6), blink=frame.mode==='sleep'?.97:Math.min(.97,frame.blink??0);
      const left=points(v,0,blink), right=points(v,N*2,blink), mouth=points(v,N*4,0,178);
      const gaze=frame.look??[0,0], dx=gaze[0]*.3, dy=gaze[1]*.23;
      elements.face.setAttribute('transform',`translate(${fixed(dx)} ${fixed(dy)})`);
      elements.left.setAttribute('d',path(left)); elements.right.setAttribute('d',path(right));
      for(const p of mouth) p[1]+=(p[1]-170)*((frame.talk??0)*.22+Math.sin(t*4)*w[9]*.06);
      const mouthD=path(mouth); elements.mouth.setAttribute('d',mouthD);elements.mouthclip.setAttribute('d',mouthD);
      const dark=Math.max(0,Math.min(1,w[8]+w[9]));
      elements.mouth.setAttribute('fill',`rgb(${[124,233,196].map((n,i)=>Math.round(n+([57,142,116][i]-n)*dark)).join(',')})`);
      elements.teeth.setAttribute('opacity',Math.max(w[1],w[3],w[6])*.9);
      const bob=Math.sin(t*2.2)*1.5+Math.sin(t*13)*w[8]*1.4;
      elements.float.setAttribute('transform',`translate(${fixed(Math.sin(t*21)*w[7]*.7)} ${fixed(bob)}) rotate(${fixed(Math.sin(t*1.2)*w[5]*3)} 128 155)`);
      elements.beam.setAttribute('y',String(64+(t*23)%151));
      ['cool','peace','salute','hearts','thumb','think','fists','anger','tears'].forEach((name,i)=>setWeight(name,w[i]));
      elements.shine.setAttribute('transform',`translate(${fixed((t*22)%220-70)} 0)`);
      elements.cool.setAttribute('transform',`translate(128 ${fixed(122-18*(1-w[0]))}) scale(1.09 1.02) translate(-128 -122)`);
      elements.peaceleft.setAttribute('transform',`translate(40 ${fixed(144+22*(1-w[1])+Math.sin(t*5)*2)}) rotate(-8)`);
      elements.peaceright.setAttribute('transform',`translate(216 ${fixed(144+22*(1-w[1])-Math.sin(t*5)*2)}) scale(-1 1) rotate(-8)`);
      elements.salute.setAttribute('transform',`translate(60 ${fixed(132+30*(1-w[2]))}) scale(1.26) translate(-64 -124) rotate(${fixed(-8*(1-w[2])+Math.sin(t*3)*1.5)} 64 124)`);
      elements.thumb.setAttribute('transform',`translate(199 ${fixed(151+20*(1-w[4])+Math.sin(t*4)*2)}) scale(1.23) translate(-199 -145)`);
      elements.think.setAttribute('transform',`translate(${fixed(128+Math.sin(t*1.5)*1.5)} ${fixed(196+14*(1-w[5]))}) scale(1.25) translate(-128 -203)`);
      elements.fists.setAttribute('transform',`translate(128 ${fixed(188+Math.sin(t*10)*2.5)}) scale(1.2) translate(-128 -191)`);
      elements.heartleft.setAttribute('transform',`translate(46 ${fixed(213-Math.sin(t*2)*4)}) scale(${fixed(.9+Math.sin(t*4)*.07)}) rotate(-17)`);
      elements.heartright.setAttribute('transform',`translate(204 ${fixed(88+Math.sin(t*2.1)*4)}) scale(${fixed(1+Math.sin(t*4+.5)*.08)}) rotate(15)`);
      setWeight('star',w[2]*(.75+Math.sin(t*4)*.25));
      if(w[8]>.001) [...elements.tearflow.children].forEach((rect,i)=>{const y=134+((t*70+i%4*22)%85);rect.setAttribute('y',fixed(y));rect.setAttribute('opacity',fixed(1-(y-134)/90));});
      group.dataset.expression=expression;
    },
    mirror:false, particles:holoParticles,
    colors:{z:'#76eec3'}, extent:[0,51,256,244], hits:[[128,140,81]], anchors:{gaze:[128,125],tear:[98,138],tears:[[98,138],[158,138]],bubble:[128,58]},
    groupScale(mode,sx,sy){return [1+(sx-1)*.16,1+(sy-1)*.16];},
    groupTilt(mode,tilt,lean){return tilt+lean*.25;},
  };
}
