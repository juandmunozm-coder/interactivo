import { PERFILES } from './estado';

const imgs = new Map<string, HTMLImageElement>();
export let logo: HTMLImageElement | undefined;

function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => ok(i);
    i.onerror = () => ok(i);
    i.src = src;
  });
}

/** Retratos optimizados (public/perfiles/*.jpg); los originales PNG se conservan en ../vibra/assets. */
export async function cargarImagenes(alCargar: () => void) {
  logo = await cargar('./img/logo.png');
  await Promise.all(
    PERFILES.map(async (p) => {
      imgs.set(p.id, await cargar(`./perfiles/${p.id}.jpg`));
      alCargar();
    }),
  );
}

export const foto = (id: string) => imgs.get(id);

/** Logo original (raster con su contenedor oscuro), recortado al azulejo del icono. */
export function dibujarLogo(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, conEtiqueta = false) {
  if (!logo || !logo.width) return;
  // El PNG (185×205) contiene el azulejo redondeado y la palabra "Vibra" debajo.
  const sh = conEtiqueta ? 205 : 160;
  const sw = 185;
  const h = (s * sh) / sw;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, s, h, s * 0.22);
  ctx.clip();
  ctx.drawImage(logo, 0, 0, sw, sh, x, y, s, h);
  ctx.restore();
}
