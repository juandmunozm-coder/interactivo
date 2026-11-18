// Lógica pura de VIBRA (sin Three.js ni DOM) para poder probarla con `npm test`.

export type Categoria = 'Comunicación' | 'Puntualidad' | 'Amabilidad' | 'Compatibilidad' | 'Experiencia general';
export const CATEGORIAS: Categoria[] = ['Comunicación', 'Puntualidad', 'Amabilidad', 'Compatibilidad', 'Experiencia general'];

export interface Perfil {
  id: string;
  name: string;
  age: number;
  group: 'principal' | 'recomendados' | 'fuera-de-recomendaciones';
  photo: string;
  details: Record<string, string>;
  compatibilityPercent: number | null;
  ratings: Partial<Record<Categoria, number>>;
  averageRating: number | null;
}

export interface Ajustes {
  /** Yo decido · usar las valoraciones de otras personas para ordenar */
  usarValoraciones: boolean;
  /** Yo decido · priorizar el porcentaje de compatibilidad del algoritmo */
  priorizarCompatibilidad: boolean;
  /** Solo presentación: oculta estrellas y notas, no cambia el orden */
  ocultarPuntuaciones: boolean;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  usarValoraciones: true,
  priorizarCompatibilidad: true,
  ocultarPuntuaciones: false,
};

/** Gustos de Juan David según el documento original. */
export const INTERESES_JUAN_DAVID = ['Cine', 'Series', 'Gimnasio', 'Marvel', 'Arte', 'PlayStation', 'Fútbol'];

/** Catálogo para editar los intereses del perfil propio. */
export const CATALOGO_INTERESES = [
  'Cine', 'Series', 'Gimnasio', 'Marvel', 'Arte', 'PlayStation', 'Fútbol', 'Anime', 'Música', 'Fotografía', 'Viajes', 'Café',
];

export function media(ratings: Partial<Record<Categoria, number>>): number | null {
  const vals = CATEGORIAS.map((c) => ratings[c]).filter((v): v is number => typeof v === 'number');
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

export function ciudad(p: Perfil): string {
  return p.details['Vive en'] ?? p.details['Ubicación'] ?? '';
}

export function intereses(p: Perfil): string[] {
  const raw = p.details['Intereses'] ?? '';
  return raw
    .split(/,| y /)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

const SINONIMOS: Record<string, string[]> = {
  Cine: ['cine', 'película', 'peliculas', 'películas'],
  Series: ['series', 'serie'],
  Gimnasio: ['gimnasio', 'gym'],
  Marvel: ['marvel'],
  Arte: ['arte', 'ilustración'],
  PlayStation: ['playstation', 'videojuegos'],
  Fútbol: ['fútbol', 'futbol'],
  Anime: ['anime'],
  Música: ['música', 'musica', 'conciertos'],
  Fotografía: ['fotografía'],
  Viajes: ['viajes'],
  Café: ['café', 'cafeterías'],
};

/** Intereses de `p` que coinciden con los gustos indicados (por defecto, los de Juan David). */
export function interesesComunes(p: Perfil, mios: string[] = INTERESES_JUAN_DAVID): string[] {
  // Solo el campo Intereses: la descripción contiene negaciones ("no suele jugar videojuegos").
  const texto = (p.details['Intereses'] ?? '').toLowerCase();
  const comunes = new Set<string>();
  for (const m of mios) {
    const claves = SINONIMOS[m] ?? [m.toLowerCase()];
    if (claves.some((k) => texto.includes(k))) comunes.add(m);
  }
  return [...comunes];
}

export function buscaRelacionEstable(p: Perfil): boolean {
  const b = (p.details['Busca'] ?? '').toLowerCase();
  return b.includes('estable') || b.includes('pareja');
}

/**
 * Ordena las personas que se muestran en Swipe.
 * - Con valoraciones activas: solo el grupo "recomendados" (como hace el algoritmo simulado).
 * - Sin valoraciones: entran los 15 perfiles y la nota ajena deja de pesar.
 * - Sin ambos criterios: orden neutral por nombre.
 */
export function ordenarMazo(perfiles: Perfil[], a: Ajustes, excluir: Set<string> = new Set()): Perfil[] {
  const pool = perfiles.filter(
    (p) => p.group !== 'principal' && !excluir.has(p.id) && (a.usarValoraciones ? p.group === 'recomendados' : true),
  );
  const comp = (p: Perfil) => (p.compatibilityPercent ?? 0) / 100;
  const nota = (p: Perfil) => (p.averageRating ?? 0) / 5;
  const puntuar = (p: Perfil): number => {
    if (a.usarValoraciones && a.priorizarCompatibilidad) return 0.6 * comp(p) + 0.4 * nota(p);
    if (a.priorizarCompatibilidad) return comp(p);
    if (a.usarValoraciones) return nota(p);
    return 0;
  };
  return [...pool].sort((x, y) => {
    const d = puntuar(y) - puntuar(x);
    return Math.abs(d) > 1e-9 ? d : x.name.localeCompare(y.name, 'es');
  });
}

export function descripcionOrden(a: Ajustes): string {
  if (a.usarValoraciones && a.priorizarCompatibilidad) return '60 % compatibilidad + 40 % valoraciones ajenas · 10 recomendadas';
  if (a.priorizarCompatibilidad) return 'Solo compatibilidad · 15 perfiles, sin peso de las notas';
  if (a.usarValoraciones) return 'Solo valoraciones ajenas · 10 recomendadas';
  return 'Orden neutral por nombre · 15 perfiles';
}

/** Motivos, derivados de los datos, por los que un perfil no aparece en "Para ti". Lenguaje neutral. */
export function motivosFueraDeRecomendaciones(p: Perfil): string[] {
  const motivos: string[] = [];
  const c = p.compatibilityPercent ?? 0;
  const comunes = interesesComunes(p);
  if (c < 60) {
    motivos.push(
      `Compatibilidad del ${c} %: ${comunes.length ? `comparten ${comunes.join(', ').toLowerCase()} (${comunes.length} de ${INTERESES_JUAN_DAVID.length} gustos)` : `ninguno de los ${INTERESES_JUAN_DAVID.length} gustos de Juan David coincide`}.`,
    );
  }
  if (!buscaRelacionEstable(p)) {
    motivos.push(`Busca “${p.details['Busca']}”; Juan David, una relación estable. Intenciones distintas, no mejores ni peores.`);
  }
  if ((p.averageRating ?? 5) < 3.5) {
    motivos.push(
      `Media de ${(p.averageRating ?? 0).toFixed(2)} / 5 en opiniones de citas anteriores, con un 40 % de peso al ordenar. No mide quién es.`,
    );
  }
  const ci = ciudad(p);
  if (ci && ci !== 'Barcelona') motivos.push(`Vive en ${ci}; el algoritmo prioriza Barcelona.`);
  return motivos;
}

export const EXPLICACION_METRICA: Record<Categoria, string> = {
  'Comunicación': 'Opiniones de encuentros anteriores',
  'Puntualidad': 'Opiniones de encuentros anteriores',
  'Amabilidad': 'Opiniones de encuentros anteriores',
  'Compatibilidad': 'Opinión de citas previas (no es el % del algoritmo)',
  'Experiencia general': 'Opiniones de encuentros anteriores',
};
