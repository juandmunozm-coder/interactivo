import perfilesJson from './data/perfiles.json';
import sim from './data/simulacion.json';
import { AJUSTES_POR_DEFECTO, Ajustes, Categoria, INTERESES_JUAN_DAVID, Perfil, interesesComunes, ordenarMazo } from './logica';

export const PERFILES = perfilesJson as unknown as Perfil[];
export const YO = PERFILES.find((p) => p.id === 'juan-david')!;
export const porId = (id: string) => PERFILES.find((p) => p.id === id)!;
export const SIM = sim;

export interface Mensaje {
  de: 'yo' | 'ella' | 'sistema';
  texto: string;
}

export type Valoracion = Record<Categoria, number>;

interface Persistente {
  likes: string[]; // likes enviados
  descartados: string[]; // pasados por el usuario
  matches: string[];
  chats: Record<string, Mensaje[]>;
  noLeidos: string[];
  valoraciones: Record<string, Valoracion>;
  ajustes: Ajustes;
  intereses: string[];
  bio: number;
  guion: Record<string, number>;
  bloqueados: string[];
  denuncias: { id: string; motivo: string }[];
}

export const BIOS = [
  YO.details['Descripción sugerida'],
  'Barcelona, gimnasio por la mañana y series por la noche. Si me recomiendas un anime o una peli de Marvel, ya tenemos tema.',
  'Estudiante con ganas de conocer a alguien con quien compartir cine, arte y algún partido de fútbol. Sin prisas.',
];

const CLAVE = 'vibra-2050-estado-v1';

function inicial(): Persistente {
  const chats: Record<string, Mensaje[]> = {};
  for (const [id, c] of Object.entries(SIM.chats)) chats[id] = c.mensajes.map((m) => ({ ...m }) as Mensaje);
  return {
    likes: [],
    descartados: [],
    matches: [...SIM.matchesIniciales],
    chats,
    noLeidos: ['valentina'],
    valoraciones: {},
    ajustes: { ...AJUSTES_POR_DEFECTO },
    intereses: [...INTERESES_JUAN_DAVID],
    bio: 0,
    guion: {},
    bloqueados: [],
    denuncias: [],
  };
}

function cargar(): Persistente {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return { ...inicial(), ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return inicial();
}

type Oyente = () => void;

class Estado {
  d: Persistente = cargar();
  private oyentes: Oyente[] = [];
  /** Avisos efímeros (no se guardan). */
  alAviso?: (texto: string, id?: string) => void;
  alMatch?: (id: string) => void;

  escuchar(f: Oyente) {
    this.oyentes.push(f);
  }

  cambiar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.d));
    } catch {
      /* sin persistencia */
    }
    this.oyentes.forEach((f) => f());
  }

  reiniciar() {
    this.d = inicial();
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* nada */
    }
    this.cambiar();
  }

  get ajustes() {
    return this.d.ajustes;
  }

  setAjuste<K extends keyof Ajustes>(k: K, v: Ajustes[K]) {
    this.d.ajustes = { ...this.d.ajustes, [k]: v };
    this.cambiar();
  }

  restablecerAjustes() {
    this.d.ajustes = { ...AJUSTES_POR_DEFECTO };
    this.cambiar();
  }

  /** Perfiles pendientes de deslizar, según "Yo decido". */
  mazo(): Perfil[] {
    const fuera = new Set([...this.d.likes, ...this.d.descartados, ...this.d.matches, ...this.d.bloqueados]);
    return ordenarMazo(PERFILES, this.d.ajustes, fuera);
  }

  bloqueado(id: string) {
    return this.d.bloqueados.includes(id);
  }

  /** Deshace el match, borra el chat y oculta a la persona de todas las listas. */
  bloquear(id: string) {
    if (!this.bloqueado(id)) this.d.bloqueados.push(id);
    this.d.matches = this.d.matches.filter((x) => x !== id);
    this.d.likes = this.d.likes.filter((x) => x !== id);
    this.d.noLeidos = this.d.noLeidos.filter((x) => x !== id);
    delete this.d.chats[id];
    this.cambiar();
  }

  denunciar(id: string, motivo: string) {
    this.d.denuncias.push({ id, motivo });
    this.cambiar();
  }

  esMatch(id: string) {
    return this.d.matches.includes(id);
  }

  meDioLike(id: string) {
    return SIM.likesRecibidos.includes(id);
  }

  likesRecibidosPendientes(): Perfil[] {
    return SIM.likesRecibidos.filter((id) => !this.esMatch(id) && !this.d.descartados.includes(id) && !this.bloqueado(id)).map(porId);
  }

  likesEnviadosPendientes(): Perfil[] {
    return this.d.likes.filter((id) => !this.esMatch(id)).map(porId);
  }

  /** Fuera de recomendaciones del algoritmo + los que el usuario pasó. */
  descartados(): { perfil: Perfil; porTi: boolean }[] {
    const algoritmo = PERFILES.filter(
      (p) => p.group === 'fuera-de-recomendaciones' && !this.esMatch(p.id) && !this.d.likes.includes(p.id) && !this.bloqueado(p.id),
    );
    const porTi = this.d.descartados.map(porId).filter((p) => p.group !== 'fuera-de-recomendaciones' && !this.bloqueado(p.id));
    return [
      ...algoritmo.map((perfil) => ({ perfil, porTi: this.d.descartados.includes(perfil.id) })),
      ...porTi.map((perfil) => ({ perfil, porTi: true })),
    ];
  }

  like(id: string) {
    this.d.descartados = this.d.descartados.filter((x) => x !== id);
    if (!this.d.likes.includes(id)) this.d.likes.push(id);
    if (this.meDioLike(id)) {
      this.hacerMatch(id);
    } else if (SIM.devuelvenLikeTrasUnosSegundos.includes(id)) {
      setTimeout(() => {
        if (this.d.likes.includes(id) && !this.esMatch(id)) {
          this.hacerMatch(id);
          this.alAviso?.(`${porId(id).name} te ha devuelto el like · ¡Es un match!`, id);
        }
      }, 4500);
    }
    this.cambiar();
  }

  retirarLike(id: string) {
    this.d.likes = this.d.likes.filter((x) => x !== id);
    this.cambiar();
  }

  pasar(id: string) {
    this.d.likes = this.d.likes.filter((x) => x !== id);
    if (!this.d.descartados.includes(id)) this.d.descartados.push(id);
    this.cambiar();
  }

  recuperar(id: string) {
    this.d.descartados = this.d.descartados.filter((x) => x !== id);
    this.cambiar();
  }

  private hacerMatch(id: string) {
    if (this.esMatch(id)) return;
    this.d.matches.unshift(id);
    const p = porId(id);
    const comun = interesesComunes(p, this.d.intereses)[0] ?? 'el cine';
    this.d.chats[id] = [{ de: 'ella', texto: SIM.aperturaNuevoMatch.replace('{interes}', comun.toLowerCase()) }];
    if (!this.d.noLeidos.includes(id)) this.d.noLeidos.push(id);
    this.alMatch?.(id);
    this.cambiar();
  }

  leer(id: string) {
    if (this.d.noLeidos.includes(id)) {
      this.d.noLeidos = this.d.noLeidos.filter((x) => x !== id);
      this.cambiar();
    }
  }

  /** Envía una respuesta rápida y programa la respuesta de guion (simulada, local). */
  enviar(id: string, texto: string, alEscribir: (escribiendo: boolean) => void) {
    (this.d.chats[id] ??= []).push({ de: 'yo', texto });
    this.cambiar();
    const n = this.d.guion[id] ?? 0;
    const resp = SIM.respuestasDeGuion[Math.min(n, SIM.respuestasDeGuion.length - 1)];
    this.d.guion[id] = n + 1;
    setTimeout(() => alEscribir(true), 500);
    setTimeout(() => {
      alEscribir(false);
      this.d.chats[id].push({ de: 'ella', texto: resp });
      this.cambiar();
    }, 2200);
  }

  valorar(id: string, v: Valoracion) {
    this.d.valoraciones[id] = v;
    (this.d.chats[id] ??= []).push({ de: 'sistema', texto: 'Videollamada finalizada · valoración enviada' });
    this.cambiar();
  }

  alternarInteres(i: string) {
    const s = new Set(this.d.intereses);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    this.d.intereses = [...s];
    this.cambiar();
  }

  siguienteBio() {
    this.d.bio = (this.d.bio + 1) % BIOS.length;
    this.cambiar();
  }
}

export const estado = new Estado();
