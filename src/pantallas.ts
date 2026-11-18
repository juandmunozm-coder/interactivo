// Dibujo de todas las pantallas y paneles de VIBRA.
import type { App } from './app';
import { Panel } from './xr/panel';
import { C, F, visual } from './ui/tema';
import { icon } from './ui/iconos';
import {
  ajustar, avatar, chip, chips, circulo, degradadoRosa, degradadoVioleta, estrellas, fillRR, imagenCover, medir,
  parrafo, rr, separador, strokeRR, txt, verificado, vidrio,
} from './ui/dibujo';
import { estado, porId, YO, BIOS, SIM } from './estado';
import { foto, dibujarLogo } from './imagenes';
import {
  CATALOGO_INTERESES, CATEGORIAS, EXPLICACION_METRICA, Perfil, ciudad, intereses, interesesComunes,
  media, motivosFueraDeRecomendaciones,
} from './logica';

const oculto = () => estado.ajustes.ocultarPuntuaciones;

// ---------------------------------------------------------------------------------------------
// Utilidades de interfaz
// ---------------------------------------------------------------------------------------------

function boton(
  p: Panel, x: number, y: number, w: number, h: number, label: string, click: () => void,
  o: { tipo?: 'primario' | 'rosa' | 'secundario' | 'peligro'; icono?: string; size?: number } = {},
) {
  const { ctx } = p;
  const tipo = o.tipo ?? 'secundario';
  const fondo =
    tipo === 'primario' ? degradadoVioleta(ctx, x, y, w, h)
      : tipo === 'rosa' ? degradadoRosa(ctx, x, y, w, h)
        : tipo === 'peligro' ? C.rojo
          : 'rgba(217,191,255,0.10)';
  fillRR(ctx, x, y, w, h, h / 2, fondo);
  if (tipo === 'secundario') strokeRR(ctx, x, y, w, h, h / 2, visual.altoContraste ? '#fff' : 'rgba(217,191,255,0.35)', 1.5);
  const size = o.size ?? 18;
  const font = F.texto(size, 600);
  const tw = medir(ctx, label, font) + (o.icono ? size + 10 : 0);
  let cx = x + (w - tw) / 2;
  if (o.icono) {
    icon(ctx, o.icono, cx + size / 2, y + h / 2, size + 2, '#fff', { lw: 2.2, fill: o.icono === 'heart' && tipo === 'rosa' });
    cx += size + 10;
  }
  txt(ctx, label, cx, y + h / 2 + 1, font, tipo === 'secundario' ? C.texto : '#fff', 'left', 'middle');
  p.zona({ x, y, w, h, r: h / 2, click });
}

function botonIcono(p: Panel, cx: number, cy: number, r: number, nombre: string, click: () => void, activo = false, color = C.texto) {
  circulo(p.ctx, cx, cy, r, activo ? 'rgba(166,107,255,0.45)' : 'rgba(217,191,255,0.10)', visual.altoContraste ? '#fff' : 'rgba(217,191,255,0.3)', 1.5);
  icon(p.ctx, nombre, cx, cy, r * 0.95, color);
  p.zona({ x: cx - r, y: cy - r, w: r * 2, h: r * 2, r, click });
}

/** Cabecera con el logo (abre la navegación) en el centro. */
function cabecera(
  app: App, p: Panel, titulo: string, sub?: string,
  o: { atras?: () => void; derecha?: { icono: string; accion: () => void; activo?: boolean } } = {},
) {
  const { ctx } = p;
  let x = 28;
  if (o.atras) {
    botonIcono(p, 50, 48, 24, 'back', o.atras);
    x = 86;
  }
  txt(ctx, ajustar(ctx, titulo, F.titulo(24), 225 - x), x, sub ? 46 : 56, F.titulo(24));
  if (sub) txt(ctx, ajustar(ctx, sub, F.texto(14), 225 - x), x, 70, F.texto(14), C.texto2);

  // Logo = botón de navegación
  if (app.dockAbierto) circulo(ctx, 270, 48, 40, 'rgba(248,59,145,0.18)', C.rosa, 2);
  dibujarLogo(ctx, 238, 18, 64);
  p.zona({ x: 230, y: 10, w: 80, h: 76, r: 20, click: () => app.alternarDock() });

  if (o.derecha) botonIcono(p, 490, 48, 24, o.derecha.icono, o.derecha.accion, o.derecha.activo);
}

// ---------------------------------------------------------------------------------------------
// Panel principal
// ---------------------------------------------------------------------------------------------

export function dibujarPrincipal(app: App, p: Panel) {
  vidrio(p.ctx, p.w, p.h, 40);
  switch (app.pantalla) {
    case 'bienvenida': bienvenida(app, p); break;
    case 'swipe': swipe(app, p); break;
    case 'verPerfil': verPerfil(app, p); break;
    case 'likes': likes(app, p); break;
    case 'chats': chats(app, p); break;
    case 'conversacion': conversacion(app, p); break;
    case 'llamada': llamada(app, p); break;
    case 'valorar': valorar(app, p); break;
    case 'perfil': miPerfil(app, p); break;
  }
  if (app.matchCon) superposicionMatch(app, p, app.matchCon);
}

function bienvenida(app: App, p: Panel) {
  const { ctx } = p;
  cabecera(app, p, 'VIBRA');
  dibujarLogo(ctx, 190, 190, 160, true);
  txt(ctx, `Hola, ${YO.name}`, 270, 470, F.titulo(34), C.texto, 'center');
  chip(ctx, 'Sesión iniciada · VIBRA Plus · sin anuncios', 92, 510, { icono: 'check', size: 15, fondo: 'rgba(100,220,237,0.14)', color: C.cian });
  fillRR(ctx, 40, 600, 460, 120, 24, 'rgba(217,191,255,0.08)');
  icon(ctx, 'arrowUp', 80, 660, 30, C.rosa);
  parrafo(ctx, 'Toca el corazón de arriba para abrir el menú y elige Swipe para empezar.', 116, 646, 360, 26, F.texto(18, 500), C.texto, 3);
  boton(p, 120, 790, 300, 58, 'Empezar a descubrir', () => app.ir('swipe'), { tipo: 'rosa', icono: 'flame' });
}

function swipe(app: App, p: Panel) {
  const { ctx } = p;
  const mazo = estado.mazo();
  cabecera(app, p, 'Para ti', `${mazo.length} perfiles por ver`, {
    derecha: { icono: 'sliders', accion: () => app.abrirLateral('decide'), activo: app.lateral === 'decide' },
  });

  if (!mazo.length) {
    fillRR(ctx, 30, 110, 480, 690, 32, 'rgba(217,191,255,0.06)');
    dibujarLogo(ctx, 230, 200, 80);
    txt(ctx, 'Has visto todos los perfiles', 270, 340, F.titulo(24), C.texto, 'center');
    parrafo(ctx, 'Con los criterios actuales no quedan personas por mostrar. Puedes revisar quién quedó fuera o cambiar los criterios en “Yo decido”.', 270, 380, 400, 26, F.texto(17), C.texto2, 5, 'center');
    boton(p, 90, 520, 360, 56, 'Ver descartados', () => app.irLikes('descartados'), { tipo: 'primario', icono: 'eyeOff' });
    boton(p, 90, 592, 360, 56, 'Abrir “Yo decido”', () => app.abrirLateral('decide'), { icono: 'sliders' });
    boton(p, 90, 664, 360, 56, 'Reiniciar demo', () => app.reiniciar(), { icono: 'refresh' });
    return;
  }

  // Botones inferiores
  const y = 878;
  circulo(ctx, 165, y, 44, 'rgba(24,17,38,0.95)', 'rgba(217,191,255,0.35)', 2);
  icon(ctx, 'x', 165, y, 40, C.lavanda, { lw: 3 });
  p.zona({ x: 121, y: y - 44, w: 88, h: 88, r: 44, click: () => app.decidir(false) });
  circulo(ctx, 375, y, 44, degradadoRosa(ctx, 331, y - 44, 88, 88));
  icon(ctx, 'heart', 375, y + 2, 40, '#fff', { fill: true });
  p.zona({ x: 331, y: y - 44, w: 88, h: 88, r: 44, click: () => app.decidir(true) });
  txt(ctx, 'Desliza la foto', 270, y - 6, F.texto(14), C.texto2, 'center');
  txt(ctx, '← paso · me gusta →', 270, y + 16, F.texto(14), C.texto2, 'center');
}

function verPerfil(app: App, p: Panel) {
  const per = porId(app.verId!);
  const volver = app.verOrigen === 'chat' ? () => app.ir('conversacion') : () => app.ir('likes');
  cabecera(app, p, per.name, app.verOrigen === 'chat' ? 'Perfil del match' : 'Desde Likes', { atras: volver });
  const y = 830;
  const id = per.id;
  if (estado.esMatch(id)) {
    boton(p, 60, y, 420, 62, `Abrir chat con ${per.name}`, () => app.abrirChat(id), { tipo: 'primario', icono: 'chat' });
  } else if (estado.d.likes.includes(id)) {
    boton(p, 60, y, 420, 62, 'Retirar like', () => { estado.retirarLike(id); app.toast(`Like a ${per.name} retirado`); }, { icono: 'x' });
  } else if (estado.d.descartados.includes(id)) {
    boton(p, 30, y, 230, 62, 'Recuperar', () => { estado.recuperar(id); app.toast(`${per.name} vuelve a estar disponible`); }, { icono: 'refresh' });
    boton(p, 280, y, 230, 62, 'Me gusta', () => app.likeDesdePerfil(id), { tipo: 'rosa', icono: 'heart' });
  } else {
    boton(p, 30, y, 200, 62, 'Pasar', () => { estado.pasar(id); app.ir('likes'); }, { icono: 'x' });
    boton(p, 250, y, 260, 62, estado.meDioLike(id) ? 'Corresponder' : 'Me gusta', () => app.likeDesdePerfil(id), { tipo: 'rosa', icono: 'heart' });
  }
}

function likes(app: App, p: Panel) {
  const { ctx } = p;
  cabecera(app, p, 'Likes', 'Sin bloqueos: VIBRA Plus');
  const tabs: { k: App['tabLikes']; label: string }[] = [
    { k: 'recibidos', label: `Recibidos ${estado.likesRecibidosPendientes().length}` },
    { k: 'enviados', label: `Enviados ${estado.likesEnviadosPendientes().length}` },
    { k: 'descartados', label: `Descartados ${estado.descartados().length}` },
  ];
  fillRR(ctx, 24, 104, 492, 54, 27, 'rgba(11,8,21,0.55)');
  tabs.forEach((t, i) => {
    const x = 28 + i * 162.7, w = 158;
    const act = app.tabLikes === t.k;
    if (act) fillRR(ctx, x, 108, w, 46, 23, degradadoVioleta(ctx, x, 108, w, 46));
    txt(ctx, t.label, x + w / 2, 132, F.texto(16, act ? 600 : 500), act ? '#fff' : C.texto2, 'center', 'middle');
    p.zona({ x, y: 108, w, h: 46, r: 23, click: () => { app.tabLikes = t.k; app.paginaLikes = 0; app.refrescar(); } });
  });

  let items: { perfil: Perfil; etiqueta: string; porTi?: boolean }[] = [];
  if (app.tabLikes === 'recibidos') items = estado.likesRecibidosPendientes().map((perfil) => ({ perfil, etiqueta: 'Le gustas' }));
  if (app.tabLikes === 'enviados') items = estado.likesEnviadosPendientes().map((perfil) => ({ perfil, etiqueta: 'Esperando respuesta' }));
  if (app.tabLikes === 'descartados') items = estado.descartados().map((d) => ({ perfil: d.perfil, etiqueta: d.porTi ? 'Descartada por ti' : 'Fuera de Para ti', porTi: d.porTi }));

  const desc = {
    recibidos: 'Personas que te dieron like. Si correspondes, hacéis match.',
    enviados: 'Tus likes pendientes. Puedes retirarlos cuando quieras.',
    descartados: 'Perfiles que el algoritmo dejó fuera o que pasaste. Toca uno para ver por qué.',
  }[app.tabLikes];
  parrafo(ctx, desc, 28, 186, 484, 20, F.texto(15), C.texto2, 2);

  if (!items.length) {
    txt(ctx, 'Nada por aquí todavía', 270, 420, F.titulo(22), C.texto, 'center');
    parrafo(ctx, app.tabLikes === 'enviados' ? 'Da like desde Swipe y aparecerá aquí.' : 'Vuelve a Swipe para seguir descubriendo.', 270, 456, 400, 24, F.texto(17), C.texto2, 2, 'center');
    boton(p, 140, 520, 260, 56, 'Ir a Swipe', () => app.ir('swipe'), { tipo: 'primario', icono: 'flame' });
    return;
  }

  const porPag = 4;
  const pags = Math.ceil(items.length / porPag);
  app.paginaLikes = Math.min(app.paginaLikes, pags - 1);
  const vis = items.slice(app.paginaLikes * porPag, app.paginaLikes * porPag + porPag);
  vis.forEach((it, i) => {
    const x = 24 + (i % 2) * 250, y = 236 + Math.floor(i / 2) * 300, w = 242, h = 288;
    const per = it.perfil;
    imagenCover(ctx, foto(per.id), x, y, w, h, 24, 0.3);
    const g = ctx.createLinearGradient(0, y + 110, 0, y + h);
    g.addColorStop(0, 'rgba(11,8,21,0)');
    g.addColorStop(1, 'rgba(11,8,21,0.94)');
    rr(ctx, x, y, w, h, 24);
    ctx.fillStyle = g;
    ctx.fill();
    strokeRR(ctx, x, y, w, h, 24, 'rgba(217,191,255,0.25)', 1.5);
    chip(ctx, it.etiqueta, x + 10, y + 10, {
      size: 13, h: 28, peso: 600,
      fondo: it.etiqueta === 'Le gustas' ? 'rgba(248,59,145,0.85)' : 'rgba(11,8,21,0.75)',
      color: '#fff', icono: it.etiqueta === 'Le gustas' ? 'heart' : undefined,
    });
    txt(ctx, `${per.name}, ${per.age}`, x + 14, y + h - 70, F.titulo(21));
    icon(ctx, 'pin', x + 22, y + h - 46, 15, C.texto2);
    txt(ctx, ciudad(per), x + 34, y + h - 41, F.texto(15), C.texto2);
    if (oculto()) {
      txt(ctx, 'Puntuación oculta', x + 14, y + h - 16, F.texto(14), C.texto2);
    } else {
      icon(ctx, 'star', x + 22, y + h - 20, 16, C.dorado, { fill: true });
      txt(ctx, per.averageRating!.toFixed(2), x + 34, y + h - 15, F.texto(15, 600), C.texto);
      txt(ctx, `${per.compatibilityPercent} % compat.`, x + w - 14, y + h - 15, F.texto(14), C.lavanda, 'right');
    }
    p.zona({ x, y, w, h, r: 24, click: () => app.verPerfil(per.id, 'likes') });
  });

  if (pags > 1) {
    const y = 878;
    botonIcono(p, 190, y, 26, 'back', () => { app.paginaLikes = (app.paginaLikes - 1 + pags) % pags; app.refrescar(); });
    txt(ctx, `${app.paginaLikes + 1} / ${pags}`, 270, y + 1, F.texto(18, 600), C.texto, 'center', 'middle');
    botonIcono(p, 350, y, 26, 'next', () => { app.paginaLikes = (app.paginaLikes + 1) % pags; app.refrescar(); });
  }
}

function ultimoMensaje(id: string): string {
  const m = (estado.d.chats[id] ?? []).filter((x) => x.de !== 'sistema');
  const u = m[m.length - 1];
  if (!u) return 'Nuevo match · ¡saluda!';
  return (u.de === 'yo' ? 'Tú: ' : '') + u.texto;
}

function chats(app: App, p: Panel) {
  const { ctx } = p;
  cabecera(app, p, 'Chats', `${estado.d.matches.length} matches`);
  const matches = estado.d.matches;
  txt(ctx, 'Tus matches', 28, 124, F.texto(15, 600), C.lavanda);
  matches.slice(0, 6).forEach((id, i) => {
    const cx = 62 + i * 82, cy = 176;
    avatar(ctx, foto(id), cx, cy, 32, estado.d.noLeidos.includes(id) ? C.rosa : 'rgba(217,191,255,0.4)');
    txt(ctx, porId(id).name, cx, cy + 52, F.texto(14, 500), C.texto, 'center');
    p.zona({ x: cx - 38, y: cy - 38, w: 76, h: 100, r: 20, click: () => app.abrirChat(id) });
  });
  separador(ctx, 28, 254, 484);
  const lista = [...matches].sort((a, b) => Number(estado.d.noLeidos.includes(b)) - Number(estado.d.noLeidos.includes(a)));
  lista.slice(0, 6).forEach((id, i) => {
    const y = 268 + i * 100;
    const per = porId(id);
    avatar(ctx, foto(id), 64, y + 46, 34);
    txt(ctx, per.name, 116, y + 36, F.texto(20, 600));
    const nl = estado.d.noLeidos.includes(id);
    txt(ctx, ajustar(ctx, ultimoMensaje(id), F.texto(16, nl ? 600 : 400), 330), 116, y + 64, F.texto(16, nl ? 600 : 400), nl ? C.texto : C.texto2);
    const hora = (SIM.chats as Record<string, { hora: string }>)[id]?.hora ?? 'Ahora';
    txt(ctx, hora, 508, y + 36, F.texto(14), C.texto2, 'right');
    if (nl) circulo(ctx, 498, y + 60, 7, C.rosa);
    p.zona({ x: 20, y: y + 4, w: 500, h: 88, r: 18, click: () => app.abrirChat(id) });
  });
}

function conversacion(app: App, p: Panel) {
  const { ctx } = p;
  const id = app.chatId!;
  const per = porId(id);
  cabecera(app, p, 'Chat');
  // Barra de la persona
  fillRR(ctx, 16, 96, 508, 76, 22, 'rgba(11,8,21,0.5)');
  botonIcono(p, 52, 134, 22, 'back', () => app.ir('chats'));
  avatar(ctx, foto(id), 112, 134, 26);
  p.zona({ x: 84, y: 104, w: 220, h: 60, r: 16, click: () => app.verPerfil(id, 'chat') });
  txt(ctx, per.name, 150, 130, F.texto(20, 600));
  circulo(ctx, 156, 149, 5, '#3DDC84');
  txt(ctx, 'En línea', 168, 154, F.texto(14), C.texto2);
  botonIcono(p, 424, 134, 26, 'video', () => app.iniciarLlamada(id));
  botonIcono(p, 486, 134, 26, 'shield', () => app.abrirDenuncia(id), false, '#FF8FA3');

  // Mensajes (de abajo arriba)
  const msgs = [...(estado.d.chats[id] ?? [])];
  const escribiendo = app.escribiendo.has(id);
  const top = 184, bottom = 762;
  let y = bottom;
  const font = F.texto(18);
  const maxW = 330;
  const bloques: { m: { de: string; texto: string }; lineas: string[]; h: number }[] = [];
  if (escribiendo) msgs.push({ de: 'ella', texto: 'escribiendo…' });
  ctx.font = font;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const lineas: string[] = [];
    let actual = '';
    for (const w of m.texto.split(' ')) {
      const t = actual ? actual + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && actual) { lineas.push(actual); actual = w; } else actual = t;
    }
    lineas.push(actual);
    const h = m.de === 'sistema' ? 34 : lineas.length * 25 + 24;
    if (y - h < top) break;
    y -= h + 10;
    bloques.push({ m, lineas, h });
  }
  y = bottom;
  for (const b of bloques) {
    y -= b.h + 10;
    if (b.m.de === 'sistema') {
      txt(ctx, b.m.texto.replace(' simulada', ''), 270, y + 22, F.texto(14), C.texto2, 'center');
      continue;
    }
    ctx.font = font;
    const w = Math.max(...b.lineas.map((l) => ctx.measureText(l).width)) + 32;
    const mio = b.m.de === 'yo';
    const x = mio ? 512 - w : 28;
    fillRR(ctx, x, y, w, b.h, 20, mio ? degradadoVioleta(ctx, x, y, w, b.h) : 'rgba(217,191,255,0.12)');
    b.lineas.forEach((l, i) => txt(ctx, l, x + 16, y + 30 + i * 25, b.m.texto === 'escribiendo…' ? F.texto(17, 400) : font, mio ? '#fff' : C.texto));
  }

  // Respuestas rápidas
  SIM.respuestasRapidas.forEach((r, i) => {
    boton(p, 24, 776 + i * 56, 492, 48, r, () => app.enviar(id, r), { icono: 'send', size: 16 });
  });

  if (app.denuncia?.id === id) superposicionDenuncia(app, p);
}

export const MOTIVOS_DENUNCIA = [
  'Perfil falso o fotos de otra persona',
  'Mensajes ofensivos o acoso',
  'Spam o intento de estafa',
  'Comportamiento inapropiado en una cita',
  'Otro motivo',
];

/** Menú de seguridad: denunciar o bloquear a la persona del chat. */
function superposicionDenuncia(app: App, p: Panel) {
  const { ctx } = p;
  const d = app.denuncia!;
  const per = porId(d.id);
  rr(ctx, 2, 2, p.w - 4, p.h - 4, 40);
  ctx.fillStyle = visual.altoContraste ? 'rgba(8,5,16,0.98)' : 'rgba(11,8,21,0.94)';
  ctx.fill();
  p.zonas = [];
  avatar(ctx, foto(d.id), 270, 150, 56, '#FF8FA3');
  circulo(ctx, 312, 192, 20, C.rojo);
  icon(ctx, 'shield', 312, 192, 22, '#fff');

  if (d.paso === 'menu') {
    txt(ctx, `Seguridad · ${per.name}`, 270, 258, F.titulo(28), C.texto, 'center');
    parrafo(ctx, 'Si algo no va bien, avísanos. La otra persona no sabrá quién la ha denunciado.', 270, 294, 440, 24, F.texto(17), C.texto2, 2, 'center');
    const opcion = (y: number, ic: string, titulo: string, desc: string, color: string, click: () => void) => {
      fillRR(ctx, 30, y, 480, 120, 24, 'rgba(217,191,255,0.08)');
      strokeRR(ctx, 30, y, 480, 120, 24, 'rgba(217,191,255,0.25)', 1.5);
      circulo(ctx, 82, y + 60, 30, 'rgba(255,77,106,0.18)');
      icon(ctx, ic, 82, y + 60, 28, color);
      txt(ctx, titulo, 130, y + 50, F.texto(20, 600), color);
      parrafo(ctx, desc, 130, y + 78, 360, 20, F.texto(15), C.texto2, 2);
      p.zona({ x: 30, y, w: 480, h: 120, r: 24, click });
    };
    opcion(370, 'flag', `Denunciar a ${per.name}`, 'Cuéntanos qué ha pasado. El equipo de VIBRA lo revisará.', '#FF8FA3', () => app.pasoDenuncia('motivos'));
    opcion(506, 'block', `Bloquear a ${per.name}`, 'Deshace el match. No podrá escribirte ni volverá a ver tu perfil.', C.rojo, () => app.bloquear(d.id));
    boton(p, 30, 680, 480, 60, 'Cancelar', () => app.cerrarDenuncia());
    return;
  }

  if (d.paso === 'motivos') {
    txt(ctx, `¿Por qué denuncias a ${per.name}?`, 270, 258, F.titulo(24), C.texto, 'center');
    txt(ctx, 'Elige el motivo principal', 270, 290, F.texto(16), C.texto2, 'center');
    MOTIVOS_DENUNCIA.forEach((m, i) => {
      const y = 320 + i * 76;
      fillRR(ctx, 30, y, 480, 64, 20, 'rgba(217,191,255,0.08)');
      strokeRR(ctx, 30, y, 480, 64, 20, 'rgba(217,191,255,0.25)', 1.5);
      txt(ctx, m, 56, y + 33, F.texto(18, 500), C.texto, 'left', 'middle');
      icon(ctx, 'next', 482, y + 32, 22, C.texto2);
      p.zona({ x: 30, y, w: 480, h: 64, r: 20, click: () => app.denunciar(d.id, m) });
    });
    boton(p, 30, 720, 480, 60, 'Volver', () => app.pasoDenuncia('menu'), { icono: 'back' });
    return;
  }

  // Denuncia enviada
  txt(ctx, 'Denuncia enviada', 270, 258, F.titulo(28), C.texto, 'center');
  parrafo(ctx, `Gracias por avisarnos. Revisaremos el perfil de ${per.name}. ¿Quieres bloquearla también?`, 270, 294, 440, 24, F.texto(17), C.texto2, 3, 'center');
  boton(p, 30, 400, 480, 62, `Bloquear a ${per.name}`, () => app.bloquear(d.id), { tipo: 'peligro', icono: 'block' });
  boton(p, 30, 480, 480, 62, 'Volver al chat', () => app.cerrarDenuncia(), { icono: 'chat' });
}

function llamada(app: App, p: Panel) {
  const { ctx } = p;
  const l = app.llamada!;
  const per = porId(l.id);
  const conectada = l.fase === 'conectada';
  if (conectada) {
    imagenCover(ctx, foto(l.id), 8, 8, p.w - 16, p.h - 16, 34, 0.3);
  } else {
    imagenCover(ctx, app.fotoDesenfocada(l.id), 8, 8, p.w - 16, p.h - 16, 34, 0.3);
    fillRR(ctx, 8, 8, p.w - 16, p.h - 16, 34, 'rgba(11,8,21,0.45)');
    avatar(ctx, foto(l.id), 270, 380, 110, 'rgba(217,191,255,0.7)');
  }
  const gt = ctx.createLinearGradient(0, 0, 0, 200);
  gt.addColorStop(0, 'rgba(11,8,21,0.75)');
  gt.addColorStop(1, 'rgba(11,8,21,0)');
  ctx.fillStyle = gt;
  ctx.fillRect(8, 8, p.w - 16, 200);
  const gb = ctx.createLinearGradient(0, 560, 0, p.h);
  gb.addColorStop(0, 'rgba(11,8,21,0)');
  gb.addColorStop(1, 'rgba(11,8,21,0.92)');
  ctx.fillStyle = gb;
  ctx.fillRect(8, 560, p.w - 16, p.h - 568);

  chip(ctx, 'Videollamada', 26, 26, { size: 14, h: 32, fondo: 'rgba(11,8,21,0.7)', color: C.texto, icono: 'video' });

  // Vista propia (PIP)
  const px = 370, py = 76, pw = 146, ph = 190;
  if (l.cam) imagenCover(ctx, foto('juan-david'), px, py, pw, ph, 20, 0.3);
  else {
    fillRR(ctx, px, py, pw, ph, 20, 'rgba(24,17,38,0.95)');
    icon(ctx, 'videoOff', px + pw / 2, py + ph / 2 - 10, 34, C.texto2);
    txt(ctx, 'Cámara apagada', px + pw / 2, py + ph / 2 + 30, F.texto(13), C.texto2, 'center');
  }
  strokeRR(ctx, px, py, pw, ph, 20, 'rgba(217,191,255,0.6)', 2);
  txt(ctx, 'Tú', px + 12, py + ph - 12, F.texto(14, 600), '#fff');

  txt(ctx, per.name, 270, 660, F.titulo(36), '#fff', 'center');
  const estadoTxt = conectada ? app.tiempoLlamada() : 'Llamando' + '.'.repeat(1 + (Math.floor(performance.now() / 500) % 3));
  txt(ctx, estadoTxt, 270, 696, F.texto(18, 500), C.lavanda, 'center');
  if (!l.mic) txt(ctx, 'Micrófono silenciado', 270, 726, F.texto(14), C.texto2, 'center');

  const y = 840;
  const ctrl = (cx: number, nombre: string, label: string, click: () => void, activo: boolean) => {
    circulo(ctx, cx, y, 38, activo ? 'rgba(217,191,255,0.2)' : 'rgba(247,243,255,0.9)', 'rgba(217,191,255,0.4)', 1.5);
    icon(ctx, nombre, cx, y, 30, activo ? '#fff' : C.fondo);
    txt(ctx, label, cx, y + 64, F.texto(14), C.texto2, 'center');
    p.zona({ x: cx - 40, y: y - 40, w: 80, h: 80, r: 40, click });
  };
  ctrl(130, l.mic ? 'mic' : 'micOff', l.mic ? 'Silenciar' : 'Activar', () => { l.mic = !l.mic; app.principal.redibujar(); }, l.mic);
  ctrl(410, l.cam ? 'video' : 'videoOff', l.cam ? 'Cámara' : 'Encender', () => { l.cam = !l.cam; app.principal.redibujar(); }, l.cam);
  circulo(ctx, 270, y, 46, C.rojo);
  icon(ctx, 'phone', 270, y, 34, '#fff', { rot: (135 * Math.PI) / 180 });
  txt(ctx, 'Colgar', 270, y + 72, F.texto(14, 600), '#fff', 'center');
  p.zona({ x: 222, y: y - 48, w: 96, h: 96, r: 48, click: () => app.colgar() });
}

function valorar(app: App, p: Panel) {
  const { ctx } = p;
  const id = app.chatId!;
  const per = porId(id);
  cabecera(app, p, 'Valorar', 'Tras la videollamada');
  circulo(ctx, 270, 152, 38, degradadoVioleta(ctx, 232, 114, 76, 76));
  icon(ctx, 'diamond', 270, 152, 40, '#fff');
  txt(ctx, `Califica a ${per.name}`, 270, 228, F.titulo(28), C.texto, 'center');
  parrafo(ctx, 'Tu opinión se suma a sus valoraciones de encuentros anteriores y influirá en a quién se muestra.', 270, 260, 450, 22, F.texto(16), C.texto2, 2, 'center');

  const v = app.valoracion;
  CATEGORIAS.forEach((c, i) => {
    const y = 316 + i * 90;
    txt(ctx, c, 40, y + 26, F.texto(19, 600));
    txt(ctx, v[c].toFixed(1), 500, y + 26, F.texto(19, 700), C.dorado, 'right');
    const x0 = 48, x1 = 492, ty = y + 58;
    fillRR(ctx, x0, ty - 5, x1 - x0, 10, 5, 'rgba(217,191,255,0.18)');
    const k = (v[c] - 1) / 4;
    fillRR(ctx, x0, ty - 5, (x1 - x0) * k, 10, 5, degradadoVioleta(ctx, x0, ty, x1 - x0, 10));
    for (let s = 0; s <= 4; s++) circulo(ctx, x0 + ((x1 - x0) * s) / 4, ty, 3, 'rgba(247,243,255,0.5)');
    circulo(ctx, x0 + (x1 - x0) * k, ty, 17, '#fff', C.violeta, 4);
    const fijar = (x: number) => {
      const val = 1 + Math.round(Math.max(0, Math.min(1, (x - x0) / (x1 - x0))) * 8) / 2;
      if (val !== v[c]) {
        v[c] = val;
        app.principal.redibujar();
      }
    };
    p.zona({ x: 24, y: y + 30, w: 492, h: 56, r: 16, sinResaltado: true, arrastre: (e) => fijar(e.x) });
  });
  const m = media(v)!;
  txt(ctx, 'Tu media', 40, 790, F.texto(17, 500), C.texto2);
  estrellas(ctx, 140, 784, 20, m);
  txt(ctx, `${m.toFixed(2)} / 5`, 500, 790, F.texto(19, 700), C.texto, 'right');
  boton(p, 24, 832, 180, 60, 'Omitir', () => app.ir('conversacion'));
  boton(p, 220, 832, 296, 60, 'Enviar valoración', () => app.enviarValoracion(), { tipo: 'primario', icono: 'check' });
  txt(ctx, 'Arrastra o toca cada barra (1–5)', 270, 926, F.texto(14), C.texto2, 'center');
}

function miPerfil(app: App, p: Panel) {
  const { ctx } = p;
  const d = YO.details;
  cabecera(app, p, 'Mi perfil', 'Vista de Juan David', {
    derecha: { icono: 'sliders', accion: () => app.abrirLateral('decide'), activo: app.lateral === 'decide' },
  });
  imagenCover(ctx, foto('juan-david'), 24, 104, 196, 246, 24, 0.25);
  verificado(ctx, 198, 126, 14);
  txt(ctx, YO.name, 240, 138, F.titulo(28));
  txt(ctx, d['Edad'], 240, 166, F.texto(17), C.texto2);
  const filas: [string, string][] = [['pin', d['Ubicación']], ['briefcase', d['Ocupación']], ['moon', d['Signo']], ['ruler', d['Altura']]];
  filas.forEach(([ic, t], i) => {
    icon(ctx, ic, 252, 200 + i * 32, 18, C.lavanda);
    txt(ctx, t, 272, 206 + i * 32, F.texto(17), C.texto);
  });
  chip(ctx, 'VIBRA Plus · sin anuncios', 240, 318, { size: 14, h: 30, icono: 'sparkle', fondo: 'rgba(248,59,145,0.16)', color: '#FFB3D6' });

  let y = 384;
  txt(ctx, 'Busca', 28, y, F.texto(15, 600), C.lavanda);
  y = parrafo(ctx, d['Busca'], 28, y + 24, 484, 22, F.texto(16), C.texto, 2);
  txt(ctx, `Serie favorita: ${d['Serie favorita']}`, 28, y + 8, F.texto(16), C.texto2);

  y += 44;
  txt(ctx, app.editandoIntereses ? 'Elige tus intereses' : 'Mis intereses', 28, y, F.texto(15, 600), C.lavanda);
  const eb = medir(ctx, app.editandoIntereses ? 'Listo' : 'Editar', F.texto(15, 600)) + 50;
  fillRR(ctx, 512 - eb, y - 24, eb, 34, 17, 'rgba(217,191,255,0.12)');
  icon(ctx, app.editandoIntereses ? 'check' : 'edit', 512 - eb + 20, y - 7, 16, C.lavanda);
  txt(ctx, app.editandoIntereses ? 'Listo' : 'Editar', 512 - eb + 34, y - 1, F.texto(15, 600), C.lavanda);
  p.zona({ x: 512 - eb, y: y - 26, w: eb, h: 38, r: 17, click: () => { app.editandoIntereses = !app.editandoIntereses; app.refrescar(); } });

  y += 16;
  const lista = app.editandoIntereses ? CATALOGO_INTERESES : estado.d.intereses;
  let cx = 28, cy = y;
  for (const it of lista) {
    const sel = estado.d.intereses.includes(it);
    const w = medir(ctx, it, F.texto(15, 500)) + 28 + (app.editandoIntereses ? 22 : 0);
    if (cx + w > 512) { cx = 28; cy += 42; }
    chip(ctx, it, cx, cy, {
      size: 15, h: 34,
      icono: app.editandoIntereses ? (sel ? 'check' : 'plus') : undefined,
      fondo: sel ? 'rgba(166,107,255,0.28)' : 'rgba(217,191,255,0.04)',
      borde: sel ? undefined : 'rgba(217,191,255,0.3)',
      color: sel ? C.texto : C.texto2,
    });
    if (app.editandoIntereses) p.zona({ x: cx, y: cy, w, h: 34, r: 17, click: () => estado.alternarInteres(it) });
    cx += w + 8;
  }
  y = cy + 60;

  if (!app.editandoIntereses) {
    txt(ctx, 'Sobre mí', 28, y, F.texto(15, 600), C.lavanda);
    txt(ctx, 'Otra sugerencia', 512, y, F.texto(14, 600), C.lavanda, 'right');
    p.zona({ x: 380, y: y - 22, w: 136, h: 32, r: 14, click: () => estado.siguienteBio() });
    y = parrafo(ctx, BIOS[estado.d.bio], 28, y + 26, 484, 22, F.texto(16), C.texto, 4);
  }

  // Vibe Score pendiente
  const vy = 780;
  fillRR(ctx, 24, vy, 492, 84, 22, 'rgba(166,107,255,0.14)');
  strokeRR(ctx, 24, vy, 492, 84, 22, 'rgba(217,191,255,0.3)', 1.5);
  icon(ctx, 'sparkle', 56, vy + 30, 22, C.lavanda);
  txt(ctx, 'Vibe Score', 78, vy + 37, F.texto(18, 600));
  txt(ctx, 'Pendiente', 500, vy + 37, F.titulo(20), C.dorado, 'right');
  txt(ctx, 'Aún sin valoraciones de encuentros. No se inventa una nota.', 40, vy + 66, F.texto(14), C.texto2);

  boton(p, 24, 880, 240, 56, 'Yo decido', () => app.abrirLateral('decide'), { tipo: 'primario', icono: 'sliders' });
  boton(p, 276, 880, 240, 56, 'Reiniciar demo', () => app.reiniciar(), { icono: 'refresh' });
}

function superposicionMatch(app: App, p: Panel, id: string) {
  const { ctx } = p;
  const per = porId(id);
  rr(ctx, 2, 2, p.w - 4, p.h - 4, 40);
  ctx.fillStyle = visual.altoContraste ? 'rgba(8,5,16,0.98)' : 'rgba(11,8,21,0.93)';
  ctx.fill();
  p.zonas = [];
  txt(ctx, '¡Es un match!', 270, 200, F.titulo(44), C.rosa, 'center');
  txt(ctx, 'Os habéis dado like mutuamente', 270, 240, F.texto(17), C.texto2, 'center');
  avatar(ctx, foto('juan-david'), 190, 400, 100, C.violeta);
  avatar(ctx, foto(id), 350, 400, 100, C.rosa);
  circulo(ctx, 270, 400, 34, 'rgba(11,8,21,0.9)');
  icon(ctx, 'heart', 270, 402, 38, C.rosa, { fill: true });
  parrafo(ctx, `A ${per.name} y a ti os gustáis. ¡Empieza la conversación!`, 270, 560, 420, 26, F.texto(19, 500), C.texto, 3, 'center');
  parrafo(ctx, 'Un like no implica consentimiento para contactar fuera de VIBRA.', 270, 640, 420, 22, F.texto(15), C.texto2, 2, 'center');
  boton(p, 70, 720, 400, 62, 'Enviar mensaje', () => { app.matchCon = null; app.abrirChat(id); }, { tipo: 'rosa', icono: 'chat' });
  boton(p, 70, 800, 400, 62, 'Seguir deslizando', () => { app.matchCon = null; app.ir('swipe'); }, { icono: 'flame' });
}

// ---------------------------------------------------------------------------------------------
// Tarjeta (se dibuja en su propio panel 3D para poder arrastrarla)
// ---------------------------------------------------------------------------------------------

export function dibujarTarjeta(app: App, p: Panel, id: string | null, frente: boolean) {
  const { ctx } = p;
  if (!id) return;
  const per = porId(id);
  imagenCover(ctx, foto(id), 0, 0, p.w, p.h, 32, 0.28);
  const g = ctx.createLinearGradient(0, p.h * 0.45, 0, p.h);
  g.addColorStop(0, 'rgba(11,8,21,0)');
  g.addColorStop(0.55, 'rgba(11,8,21,0.72)');
  g.addColorStop(1, 'rgba(11,8,21,0.96)');
  rr(ctx, 0, 0, p.w, p.h, 32);
  ctx.fillStyle = g;
  ctx.fill();
  strokeRR(ctx, 1, 1, p.w - 2, p.h - 2, 32, 'rgba(217,191,255,0.35)', 2);

  // Etiquetas superiores
  const rec = per.group === 'recomendados';
  chip(ctx, rec ? 'Recomendada para ti' : 'Más personas', 16, 16, {
    size: 14, h: 32, peso: 600, icono: rec ? 'sparkle' : 'eyeOff', fondo: 'rgba(11,8,21,0.72)', color: C.texto,
  });
  if (estado.meDioLike(id)) chip(ctx, 'Le gustas', 330, 16, { size: 14, h: 32, peso: 600, icono: 'heart', fondo: 'rgba(248,59,145,0.9)', color: '#fff' });

  // Datos
  let y = 452;
  ctx.font = F.titulo(38);
  const nw = ctx.measureText(per.name).width;
  txt(ctx, per.name, 24, y, F.titulo(38), '#fff');
  txt(ctx, String(per.age), 24 + nw + 12, y, F.texto(32, 300), '#fff');
  verificado(ctx, 24 + nw + 12 + medir(ctx, String(per.age), F.texto(32, 300)) + 22, y - 13, 13);
  y += 34;
  icon(ctx, 'home', 34, y - 6, 18, C.texto2);
  txt(ctx, `Vive en ${ciudad(per)}`, 54, y, F.texto(18), C.texto);
  y += 30;
  icon(ctx, 'briefcase', 34, y - 6, 18, C.texto2);
  txt(ctx, ajustar(ctx, per.details['Ocupación'], F.texto(18), 360), 54, y, F.texto(18), C.texto);
  y += 22;
  if (!oculto()) {
    const w = chip(ctx, `Compatible · ${per.compatibilityPercent} %`, 24, y, { size: 15, h: 32, peso: 600, fondo: 'rgba(166,107,255,0.85)', color: '#fff' });
    estrellas(ctx, 24 + w + 16, y + 16, 18, per.averageRating!);
    txt(ctx, per.averageRating!.toFixed(2), 24 + w + 130, y + 22, F.texto(16, 600), C.texto);
  } else chip(ctx, 'Puntuaciones ocultas', 24, y, { size: 15, h: 32, icono: 'eyeOff', fondo: 'rgba(11,8,21,0.7)', color: C.texto2 });
  y += 44;
  const comunes = new Set(interesesComunes(per, estado.d.intereses));
  chips(ctx, intereses(per).slice(0, 4), 24, y, 400, () => ({ size: 14, h: 30, fondo: 'rgba(217,191,255,0.14)', color: C.texto }), 6);
  void comunes;

  if (!frente) return;
  // Zona de arrastre de toda la tarjeta (swipe) y botón de detalles
  if (app.pantalla === 'swipe') {
    p.zona({ x: 0, y: 0, w: p.w, h: p.h, r: 32, sinResaltado: true, plano: app.principal, arrastre: (e) => app.arrastreTarjeta(e), click: () => app.abrirLateral('perfil') });
  }
  const abierto = app.lateral === 'perfil';
  circulo(ctx, 426, 404, 30, abierto ? C.violeta : 'rgba(247,243,255,0.95)');
  icon(ctx, abierto ? 'arrowDown' : 'arrowUp', 426, 404, 28, abierto ? '#fff' : C.fondo, { lw: 2.6 });
  p.zona({ x: 390, y: 368, w: 72, h: 72, r: 36, click: () => app.abrirLateral(abierto ? null : 'perfil') });
}

// ---------------------------------------------------------------------------------------------
// Paneles laterales
// ---------------------------------------------------------------------------------------------

export function dibujarLateralIzq(app: App, p: Panel) {
  const { ctx } = p;
  vidrio(ctx, p.w, p.h, 32);
  if (app.lateral === 'decide') return algoritmo(app, p);
  const id = app.idLateral();
  if (!id) return;
  const per = porId(id);
  const d = per.details;
  txt(ctx, 'Sobre ella', 28, 52, F.titulo(24));
  txt(ctx, `${per.name}, ${per.age}`, 392, 52, F.texto(18, 600), C.lavanda, 'right');
  separador(ctx, 28, 72, 364);
  let y = 104;
  const fila = (ic: string, et: string, val: string) => {
    icon(ctx, ic, 40, y - 6, 18, C.lavanda);
    txt(ctx, et, 60, y, F.texto(14, 600), C.texto2);
    y = parrafo(ctx, val, 60, y + 24, 332, 22, F.texto(17), C.texto, 2) + 14;
  };
  fila('briefcase', 'Ocupación', d['Ocupación']);
  fila('heart', 'Busca', d['Busca']);
  fila('home', 'Vive en', ciudad(per));
  fila('film', 'Serie o película favorita', d['Serie o película favorita']);
  separador(ctx, 28, y - 4, 364);
  y += 22;
  txt(ctx, 'Descripción', 28, y, F.texto(14, 600), C.texto2);
  y = parrafo(ctx, d['Descripción'], 28, y + 26, 364, 24, F.texto(17), C.texto, 6) + 18;
  const comunes = interesesComunes(per, estado.d.intereses);
  txt(ctx, 'Gustos', 28, y, F.texto(14, 600), C.texto2);
  txt(ctx, `${comunes.length} en común contigo`, 392, y, F.texto(14, 600), C.rosa, 'right');
  const comunTexto = (l: string) => comunes.some((c) => l.toLowerCase().includes(c.toLowerCase()) || (c === 'Cine' && /pel[ií]cula/i.test(l)) || (c === 'PlayStation' && /videojuegos/i.test(l)));
  chips(ctx, intereses(per), 28, y + 14, 364, (l) => (comunTexto(l)
    ? { size: 15, h: 32, fondo: 'rgba(248,59,145,0.22)', borde: 'rgba(248,59,145,0.7)', color: '#FFD0E6' }
    : { size: 15, h: 32, fondo: 'rgba(217,191,255,0.1)', color: C.texto }));
}

export function dibujarLateralDer(app: App, p: Panel) {
  const { ctx } = p;
  vidrio(ctx, p.w, p.h, 32);
  if (app.lateral === 'decide') return yoDecido(app, p);
  const id = app.idLateral();
  if (!id) return;
  const per = porId(id);
  icon(ctx, 'diamond', 44, 44, 26, C.lavanda);
  txt(ctx, 'Calificaciones', 66, 52, F.titulo(24));
  separador(ctx, 28, 72, 364);

  if (oculto()) {
    parrafo(ctx, 'Has elegido ocultar las puntuaciones. Esto solo cambia la presentación: el orden sigue los criterios de “Yo decido”.', 28, 112, 364, 24, F.texto(17), C.texto2, 5);
    boton(p, 28, 250, 364, 54, 'Mostrar puntuaciones', () => estado.setAjuste('ocultarPuntuaciones', false), { icono: 'eyeOff' });
    if (per.group === 'fuera-de-recomendaciones') motivos(p, per, 340);
    return;
  }

  // Compatibilidad del algoritmo
  let y = 96;
  const pc = per.compatibilityPercent ?? 0;
  ctx.beginPath();
  ctx.arc(76, y + 50, 42, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(217,191,255,0.15)';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(76, y + 50, 42, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pc) / 100);
  ctx.strokeStyle = pc >= 60 ? C.violeta : C.lavanda;
  ctx.lineCap = 'round';
  ctx.stroke();
  txt(ctx, `${pc}%`, 76, y + 51, F.titulo(22), C.texto, 'center', 'middle');
  txt(ctx, 'Compatibilidad del algoritmo', 136, y + 30, F.texto(17, 600));
  parrafo(ctx, 'Coincidencias con tus preferencias', 136, y + 54, 256, 20, F.texto(14), C.texto2, 2);
  const nc = interesesComunes(per, estado.d.intereses).length;
  txt(ctx, `${nc} intereses en común`, 136, y + 98, F.texto(14, 600), C.rosa);
  y += 130;
  separador(ctx, 28, y, 364);
  y += 34;
  txt(ctx, 'Opiniones de encuentros anteriores', 28, y, F.texto(16, 600), C.lavanda);
  y += 18;
  for (const c of CATEGORIAS) {
    const v = per.ratings[c] ?? 0;
    txt(ctx, c, 28, y + 22, F.texto(16, 500));
    txt(ctx, v.toFixed(1), 392, y + 22, F.texto(16, 700), v >= 4 ? C.dorado : C.texto2, 'right');
    fillRR(ctx, 28, y + 32, 364, 8, 4, 'rgba(217,191,255,0.14)');
    fillRR(ctx, 28, y + 32, (364 * v) / 5, 8, 4, v >= 4 ? degradadoVioleta(ctx, 28, y, 364, 8) : 'rgba(217,191,255,0.55)');
    if (c === 'Compatibilidad') txt(ctx, EXPLICACION_METRICA[c], 28, y + 58, F.texto(13), C.texto2);
    y += c === 'Compatibilidad' ? 66 : 50;
  }
  fillRR(ctx, 28, y + 6, 364, 56, 18, 'rgba(245,182,91,0.1)');
  txt(ctx, 'Media general', 44, y + 41, F.texto(16, 600));
  estrellas(ctx, 172, y + 35, 17, per.averageRating!);
  txt(ctx, per.averageRating!.toFixed(2), 380, y + 41, F.texto(18, 700), C.dorado, 'right');
  y += 76;

  const mia = estado.d.valoraciones[id];
  if (mia) {
    fillRR(ctx, 28, y, 364, 48, 16, 'rgba(166,107,255,0.18)');
    txt(ctx, 'Tu valoración tras la videollamada', 44, y + 30, F.texto(15, 600));
    txt(ctx, media(mia)!.toFixed(2), 380, y + 30, F.texto(17, 700), C.lavanda, 'right');
    y += 62;
  }
  if (per.group === 'fuera-de-recomendaciones') motivos(p, per, y);
  else parrafo(ctx, 'Las notas son opiniones de otras personas, no una medida objetiva ni una predicción de cómo saldrá una cita.', 28, y + 20, 364, 20, F.texto(14), C.texto2, 3);
}

function motivos(p: Panel, per: Perfil, y: number) {
  const { ctx } = p;
  separador(ctx, 28, y, 364);
  y += 30;
  icon(ctx, 'info', 40, y - 6, 20, C.cian);
  txt(ctx, '¿Por qué no aparece en Para ti?', 58, y, F.texto(16, 600), C.cian);
  y += 12;
  for (const m of motivosFueraDeRecomendaciones(per)) {
    circulo(ctx, 36, y + 17, 3.5, C.lavanda);
    y = parrafo(ctx, m, 48, y + 22, 344, 19, F.texto(14), C.texto, 4) + 4;
    if (y > p.h - 20) break;
  }
}

function yoDecido(app: App, p: Panel) {
  const { ctx } = p;
  const a = estado.ajustes;
  icon(ctx, 'sliders', 44, 44, 24, C.lavanda);
  txt(ctx, 'Yo decido', 68, 52, F.titulo(24));
  botonIcono(p, 382, 44, 20, 'x', () => app.abrirLateral(null));
  separador(ctx, 28, 72, 364);
  parrafo(ctx, 'Elige qué criterios ordenan a las personas que ves. Los cambios se aplican al instante.', 28, 104, 364, 22, F.texto(16), C.texto2, 3);

  let y = 170;
  const toggle = (titulo: string, desc: string, on: boolean, accion: () => void, etiqueta?: string) => {
    fillRR(ctx, 20, y, 380, 128, 20, on ? 'rgba(166,107,255,0.2)' : 'rgba(217,191,255,0.06)');
    if (etiqueta) chip(ctx, etiqueta, 36, y + 12, { size: 12, h: 24, fondo: 'rgba(100,220,237,0.15)', color: C.cian });
    const ty = y + (etiqueta ? 58 : 38);
    parrafo(ctx, titulo, 36, ty, 260, 22, F.texto(17, 600), C.texto, 2);
    parrafo(ctx, desc, 36, ty + (titulo.length > 28 ? 48 : 26), 280, 19, F.texto(14), C.texto2, 3);
    // interruptor
    const sx = 318, sy = y + 30;
    fillRR(ctx, sx, sy, 66, 36, 18, on ? degradadoVioleta(ctx, sx, sy, 66, 36) : 'rgba(217,191,255,0.2)');
    circulo(ctx, on ? sx + 48 : sx + 18, sy + 18, 14, '#fff');
    p.zona({ x: 20, y, w: 380, h: 128, r: 20, click: accion });
    y += 140;
  };
  toggle('No usar valoraciones ajenas para ordenar', 'Entran los 15 perfiles y las notas dejan de pesar.', !a.usarValoraciones,
    () => estado.setAjuste('usarValoraciones', !a.usarValoraciones));
  toggle('Explorar sin priorizar compatibilidad', 'El % del algoritmo deja de ordenar.', !a.priorizarCompatibilidad,
    () => estado.setAjuste('priorizarCompatibilidad', !a.priorizarCompatibilidad));
  toggle('Ocultar puntuaciones', 'Esconde notas y estrellas. No cambia el orden.', a.ocultarPuntuaciones,
    () => estado.setAjuste('ocultarPuntuaciones', !a.ocultarPuntuaciones), 'Solo presentación');

  boton(p, 28, p.h - 78, 364, 54, 'Restablecer criterios', () => estado.restablecerAjustes(), { icono: 'refresh' });
}

function algoritmo(_app: App, p: Panel) {
  const { ctx } = p;
  icon(ctx, 'info', 44, 44, 24, C.cian);
  txt(ctx, 'Cómo ordena VIBRA', 68, 52, F.titulo(24));
  separador(ctx, 28, 72, 364);
  let y = 110;
  const bloque = (titulo: string, cuerpo: string, color: string) => {
    fillRR(ctx, 20, y - 26, 6, 26, 3, color);
    txt(ctx, titulo, 36, y - 6, F.texto(17, 600), C.texto);
    y = parrafo(ctx, cuerpo, 36, y + 20, 356, 22, F.texto(15), C.texto2, 6) + 30;
  };
  bloque('60 % · Compatibilidad', 'Porcentaje de coincidencias entre tus gustos e intención y los de la otra persona.', C.violeta);
  bloque('40 % · Valoraciones ajenas', 'Media de cinco categorías puntuadas por citas anteriores: comunicación, puntualidad, amabilidad, compatibilidad y experiencia general.', C.dorado);
}

// ---------------------------------------------------------------------------------------------
// Navegación (se abre desde el logo), barra de sistema, lanzador y avisos
// ---------------------------------------------------------------------------------------------

export function dibujarDock(app: App, p: Panel) {
  const { ctx } = p;
  // Burbuja con punta de corazón hacia el logo
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.w / 2 - 22, 26);
  ctx.lineTo(p.w / 2, 4);
  ctx.lineTo(p.w / 2 + 22, 26);
  ctx.closePath();
  ctx.fillStyle = 'rgba(37,24,59,0.97)';
  ctx.fill();
  ctx.restore();
  fillRR(ctx, 4, 24, p.w - 8, p.h - 28, 44, visual.altoContraste ? '#08050F' : 'rgba(37,24,59,0.97)');
  strokeRR(ctx, 4, 24, p.w - 8, p.h - 28, 44, visual.altoContraste ? '#fff' : 'rgba(248,59,145,0.55)', 2);
  const items: { k: App['pantalla']; ic: string; label: string; badge?: number }[] = [
    { k: 'swipe', ic: 'flame', label: 'Swipe' },
    { k: 'likes', ic: 'heart', label: 'Likes', badge: estado.likesRecibidosPendientes().length },
    { k: 'chats', ic: 'chat', label: 'Chat', badge: estado.d.noLeidos.length },
    { k: 'perfil', ic: 'user', label: 'Perfil' },
  ];
  const w = (p.w - 40) / items.length;
  items.forEach((it, i) => {
    const x = 20 + i * w;
    const act = app.seccion() === it.k;
    if (act) fillRR(ctx, x + 6, 36, w - 12, p.h - 52, 30, degradadoVioleta(ctx, x, 36, w, p.h - 52));
    icon(ctx, it.ic, x + w / 2, 72, 30, act ? '#fff' : C.lavanda, { fill: act && it.ic === 'heart' });
    txt(ctx, it.label, x + w / 2, 122, F.texto(17, 600), act ? '#fff' : C.texto, 'center');
    if (it.badge) {
      circulo(ctx, x + w / 2 + 22, 54, 12, C.rosa);
      txt(ctx, String(it.badge), x + w / 2 + 22, 55, F.texto(13, 700), '#fff', 'center', 'middle');
    }
    p.zona({ x: x + 6, y: 36, w: w - 12, h: p.h - 52, r: 30, click: () => app.ir(it.k) });
  });
}

export function dibujarBarra(app: App, p: Panel) {
  const { ctx } = p;
  fillRR(ctx, 2, 2, p.w - 4, p.h - 4, p.h / 2, visual.altoContraste ? '#08050F' : `rgba(24,17,38,${Math.min(0.95, visual.opacidad + 0.06)})`);
  strokeRR(ctx, 2, 2, p.w - 4, p.h - 4, p.h / 2, visual.altoContraste ? '#fff' : 'rgba(217,191,255,0.3)', 1.5);
  const items: { ic: string; label: string; click?: () => void; activo?: boolean; mover?: boolean }[] = [
    { ic: 'move', label: 'Mover', mover: true },
    { ic: 'recenter', label: 'Recentrar', click: () => app.recentrar() },
    { ic: 'hand', label: visual.alcance ? 'Cerca' : 'Lejos', click: () => app.alternarAlcance(), activo: visual.alcance },
    { ic: 'minus', label: 'Menor', click: () => app.escalar(-0.1) },
    { ic: 'plus', label: 'Mayor', click: () => app.escalar(0.1) },
    { ic: 'opacity', label: `${Math.round(visual.opacidad * 100)} %`, click: () => app.cambiarOpacidad() },
    { ic: 'contrast', label: 'Contraste', click: () => app.alternarContraste(), activo: visual.altoContraste },
    { ic: 'motion', label: 'Animación', click: () => app.alternarMovimiento(), activo: !visual.reducirMovimiento },
    { ic: 'pause', label: 'Pausar', click: () => app.pausar() },
    { ic: 'exit', label: 'Salir', click: () => app.salir() },
  ];
  const w = (p.w - 24) / items.length;
  items.forEach((it, i) => {
    const x = 12 + i * w;
    if (it.activo) fillRR(ctx, x + 4, 8, w - 8, p.h - 16, 18, 'rgba(166,107,255,0.3)');
    if (it.mover) fillRR(ctx, x + 4, 8, w - 8, p.h - 16, 18, 'rgba(217,191,255,0.12)');
    icon(ctx, it.ic, x + w / 2, 32, 24, it.mover ? C.lavanda : C.texto);
    txt(ctx, it.label, x + w / 2, 68, F.texto(14, 500), C.texto2, 'center');
    if (it.mover) p.zona({ x: x + 4, y: 6, w: w - 8, h: p.h - 12, r: 18, mover: (f, pt) => app.moverVentana(f, pt) });
    else p.zona({ x: x + 4, y: 6, w: w - 8, h: p.h - 12, r: 18, click: it.click });
  });
}

export function dibujarLanzador(app: App, p: Panel) {
  const { ctx } = p;
  fillRR(ctx, 8, 8, p.w - 16, p.h - 16, 40, 'rgba(11,8,21,0.55)');
  dibujarLogo(ctx, 30, 22, 160, true);
  const label = app.pausado ? 'Volver a VIBRA' : 'Toca para abrir';
  fillRR(ctx, 20, 222, 180, 44, 22, degradadoRosa(ctx, 20, 222, 180, 44));
  txt(ctx, label, 110, 245, F.texto(16, 600), '#fff', 'center', 'middle');
  p.zona({ x: 0, y: 0, w: p.w, h: p.h, r: 40, click: () => app.abrir() });
}

export function dibujarAviso(app: App, p: Panel) {
  const { ctx } = p;
  const a = app.aviso;
  if (!a) return;
  fillRR(ctx, 2, 2, p.w - 4, p.h - 4, 30, visual.altoContraste ? '#08050F' : 'rgba(37,24,59,0.96)');
  strokeRR(ctx, 2, 2, p.w - 4, p.h - 4, 30, 'rgba(248,59,145,0.6)', 2);
  if (a.id) avatar(ctx, foto(a.id), 50, p.h / 2, 28);
  else {
    circulo(ctx, 50, p.h / 2, 26, 'rgba(166,107,255,0.3)');
    icon(ctx, 'check', 50, p.h / 2, 24, '#fff');
  }
  parrafo(ctx, a.texto, 92, a.texto.length > 38 ? 38 : 52, 380, 24, F.texto(17, 600), C.texto, 2);
  if (a.id) p.zona({ x: 0, y: 0, w: p.w, h: p.h, r: 30, click: () => app.abrirChat(a.id!) });
}

/** Sellos "ME GUSTA" / "PASO" que aparecen al arrastrar la tarjeta. */
export function dibujarSello(ctx: CanvasRenderingContext2D, w: number, h: number, texto: string, color: string) {
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(11,8,21,0.35)';
  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 18);
  ctx.fill();
  ctx.stroke();
  txt(ctx, texto, w / 2, h / 2 + 3, F.titulo(52), color, 'center', 'middle');
}
