// Utilidades de dibujo 2D para los paneles (se rasterizan en texturas para la escena XR).
import { C, F, superficie, visual } from './tema';
import { icon } from './iconos';

export type Ctx = CanvasRenderingContext2D;

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, stroke: string, lw = 1.5) {
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Fondo de cristal violeta ahumado con borde lavanda fino. */
export function vidrio(ctx: Ctx, w: number, h: number, r = 36, alpha = visual.opacidad) {
  rr(ctx, 2, 2, w - 4, h - 4, r);
  ctx.fillStyle = superficie(alpha);
  ctx.fill();
  if (!visual.altoContraste) {
    const g = ctx.createRadialGradient(w * 0.15, 0, 10, w * 0.15, 0, Math.max(w, h) * 0.9);
    g.addColorStop(0, 'rgba(166,107,255,0.22)');
    g.addColorStop(1, 'rgba(166,107,255,0)');
    rr(ctx, 2, 2, w - 4, h - 4, r);
    ctx.fillStyle = g;
    ctx.fill();
  }
  strokeRR(ctx, 2, 2, w - 4, h - 4, r, visual.altoContraste ? '#FFFFFF' : 'rgba(217,191,255,0.38)', visual.altoContraste ? 3 : 2);
}

export function txt(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  font: string,
  color: string = C.texto,
  align: CanvasTextAlign = 'left',
  base: CanvasTextBaseline = 'alphabetic',
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}

export function medir(ctx: Ctx, s: string, font: string): number {
  ctx.font = font;
  return ctx.measureText(s).width;
}

/** Recorta con "…" para que quepa en maxW. */
export function ajustar(ctx: Ctx, s: string, font: string, maxW: number): string {
  ctx.font = font;
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/** Texto multilínea. Devuelve la y siguiente a la última línea. */
export function parrafo(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
  font: string,
  color: string = C.texto2,
  maxLineas = 99,
  align: CanvasTextAlign = 'left',
): number {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const palabras = s.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (ctx.measureText(prueba).width > maxW && actual) {
      lineas.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  const vis = lineas.slice(0, maxLineas);
  if (lineas.length > maxLineas) vis[vis.length - 1] = ajustar(ctx, vis[vis.length - 1] + '…', font, maxW);
  vis.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + vis.length * lh;
}

/** Imagen tipo object-fit: cover con esquinas redondeadas. */
export function imagenCover(
  ctx: Ctx,
  img: HTMLImageElement | HTMLCanvasElement | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  focoY = 0.35,
) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  if (img && (img as HTMLImageElement).width) {
    const iw = img.width, ih = img.height;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * focoY, dw, dh);
  } else {
    ctx.fillStyle = C.elevada;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function avatar(ctx: Ctx, img: HTMLImageElement | undefined, cx: number, cy: number, r: number, borde?: string) {
  imagenCover(ctx, img, cx - r, cy - r, r * 2, r * 2, r, 0.3);
  if (borde) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = borde;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function estrellas(ctx: Ctx, x: number, y: number, size: number, valor: number) {
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (size + 4) + size / 2;
    icon(ctx, 'star', cx, y, size, 'rgba(245,182,91,0.25)', { fill: true });
    const f = Math.max(0, Math.min(1, valor - i));
    if (f > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - size / 2, y - size / 2, size * f, size);
      ctx.clip();
      icon(ctx, 'star', cx, y, size, C.dorado, { fill: true });
      ctx.restore();
    }
  }
}

/** Chip/etiqueta. Devuelve su ancho. */
export function chip(
  ctx: Ctx,
  label: string,
  x: number,
  y: number,
  o: { h?: number; size?: number; fondo?: string; color?: string; borde?: string; icono?: string; peso?: number } = {},
): number {
  const h = o.h ?? 34;
  const size = o.size ?? 16;
  const font = F.texto(size, o.peso ?? 500);
  const tw = medir(ctx, label, font);
  const pad = 14;
  const iw = o.icono ? size + 6 : 0;
  const w = tw + pad * 2 + iw;
  fillRR(ctx, x, y, w, h, h / 2, o.fondo ?? 'rgba(166,107,255,0.16)');
  if (o.borde) strokeRR(ctx, x, y, w, h, h / 2, o.borde, 1.5);
  if (o.icono) icon(ctx, o.icono, x + pad + size / 2, y + h / 2, size, o.color ?? C.lavanda);
  txt(ctx, label, x + pad + iw, y + h / 2 + 1, font, o.color ?? C.lavanda, 'left', 'middle');
  return w;
}

/** Fila de chips con salto de línea. Devuelve la y final. */
export function chips(
  ctx: Ctx,
  labels: string[],
  x: number,
  y: number,
  maxW: number,
  estilo: (l: string) => Parameters<typeof chip>[4] = () => ({}),
  gap = 8,
): number {
  let cx = x, cy = y;
  for (const l of labels) {
    const e = estilo(l) ?? {};
    const font = F.texto(e.size ?? 16, e.peso ?? 500);
    const w = medir(ctx, l, font) + 28 + (e.icono ? (e.size ?? 16) + 6 : 0);
    if (cx + w > x + maxW && cx > x) {
      cx = x;
      cy += (e.h ?? 34) + gap;
    }
    chip(ctx, l, cx, cy, e);
    cx += w + gap;
  }
  return cy + 34;
}

export function degradadoVioleta(ctx: Ctx, x: number, y: number, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, C.violeta);
  g.addColorStop(1, C.violetaProfundo);
  return g;
}

export function degradadoRosa(ctx: Ctx, x: number, y: number, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, C.rosa);
  g.addColorStop(1, C.magenta);
  return g;
}

export function circulo(ctx: Ctx, cx: number, cy: number, r: number, fill: string | CanvasGradient, stroke?: string, lw = 2) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Insignia de verificado. */
export function verificado(ctx: Ctx, cx: number, cy: number, r = 12) {
  circulo(ctx, cx, cy, r, C.violeta);
  icon(ctx, 'check', cx, cy, r * 1.2, '#fff', { lw: 3 });
}

export function separador(ctx: Ctx, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(217,191,255,0.14)';
  ctx.fillRect(x, y, w, 1.5);
}
