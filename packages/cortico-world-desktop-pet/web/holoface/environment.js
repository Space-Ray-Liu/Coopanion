/** Animation thresholds for measured idle time, fan controls and the CPU/GPU-load fallback. */
const clamp = x => Math.max(0, Math.min(1, x));
export const HOLO_BEHAVIOUR = {
  rest: { after: 120 },
  climb: { height: 2 / 3, speed: 50, rest: 6 },
  impact: { speed: 900, scale: .75, seconds: 20, tears: 9 },
};
export class HoloEnvironment {
  constructor({ loadFallback = true } = {}) {
    this.loadFallback = loadFallback;
    this.age = Infinity; this.idle = null; this.cpu = null; this.gpu = null; this.fan = null;
    this.hotFor = 0; this.coolFor = 0; this.active = false; this.effort = 0;
  }
  sample(data) {
    const value = n => typeof n === 'number' && Number.isFinite(n) ? clamp(n) : null;
    this.cpu = value(data?.cpuLoad); this.gpu = value(data?.gpuLoad); this.fan = value(data?.fanFraction);
    this.idle = typeof data?.idleSeconds === 'number' && Number.isFinite(data.idleSeconds) ? Math.max(0, data.idleSeconds) : null;
    this.age = 0;
  }
  step(dt) {
    this.age += dt;
    const fresh = this.age < 12, fan = fresh ? this.fan : null;
    const load = this.cpu === null && this.gpu === null ? null : Math.max(this.cpu ?? 0,this.gpu ?? 0);
    const signal = fan ?? (fresh && this.loadFallback ? load : null);
    const high = signal !== null && signal >= (fan === null ? .85 : .8);
    const low = signal === null || signal <= (fan === null ? .65 : .55);
    this.hotFor = high ? this.hotFor + dt : 0;
    this.coolFor = low ? this.coolFor + dt : 0;
    if (this.hotFor >= (fan === null ? 12 : 4)) this.active = true;
    if (this.coolFor >= 8 || !fresh) this.active = false;
    this.effort += ((this.active ? 1 : 0) - this.effort) * (1 - Math.exp(-dt * 1.5));
    return { idleSeconds: this.idle === null || !fresh ? null : this.idle + this.age, effort: this.effort };
  }
}
