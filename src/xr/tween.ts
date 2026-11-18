import { visual } from '../ui/tema';

interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  fin?: () => void;
  ease: (k: number) => number;
  clave?: object;
}

const activos: Tween[] = [];

export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k: number) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

/** Anima de 0 a 1 en `ms`. Con `clave`, cancela la animación anterior con la misma clave. */
export function animar(ms: number, fn: (k: number) => void, fin?: () => void, ease = easeOut, clave?: object) {
  if (clave) {
    for (let i = activos.length - 1; i >= 0; i--) if (activos[i].clave === clave) activos.splice(i, 1);
  }
  const dur = visual.reducirMovimiento ? Math.min(ms, 60) : ms;
  if (dur <= 0) {
    fn(1);
    fin?.();
    return;
  }
  activos.push({ t: 0, dur: dur / 1000, fn, fin, ease, clave });
}

export function actualizarAnimaciones(dt: number) {
  for (let i = activos.length - 1; i >= 0; i--) {
    const a = activos[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(a.ease(k));
    if (k >= 1) {
      activos.splice(i, 1);
      a.fin?.();
    }
  }
}
