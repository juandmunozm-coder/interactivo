// Sonidos de interfaz sintetizados (sin archivos ni voces). Volumen bajo.
let ctx: AudioContext | null = null;
export let silencio = false;

export function activarAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tono(freq: number, t0: number, dur: number, vol = 0.05, tipo: OscillatorType = 'sine') {
  if (!ctx || silencio) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  const t = ctx.currentTime + t0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sonido = {
  click: () => tono(1200, 0, 0.05, 0.025),
  like: () => {
    tono(660, 0, 0.12, 0.04);
    tono(990, 0.08, 0.18, 0.04);
  },
  pasar: () => tono(330, 0, 0.12, 0.03, 'triangle'),
  match: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.09, 0.3, 0.035)),
  timbre: () => {
    tono(740, 0, 0.35, 0.03);
    tono(587, 0.4, 0.35, 0.03);
  },
  colgar: () => {
    tono(480, 0, 0.18, 0.04, 'triangle');
    tono(360, 0.18, 0.25, 0.04, 'triangle');
  },
};
