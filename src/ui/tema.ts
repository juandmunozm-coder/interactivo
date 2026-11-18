// Paleta y tipografía de VIBRA (propuesta del prompt del proyecto).
export const C = {
  fondo: '#0B0815',
  superficie: '#181126',
  elevada: '#25183B',
  violeta: '#A66BFF',
  violetaProfundo: '#6D3CC7',
  lavanda: '#D9BFFF',
  texto: '#F7F3FF',
  texto2: '#BCB0CF',
  rosa: '#F83B91',
  magenta: '#C82B88',
  dorado: '#F5B65B',
  cian: '#64DCED',
  rojo: '#FF4D6A',
};

export const F = {
  titulo: (px: number) => `600 ${px}px Sora, Inter, system-ui, sans-serif`,
  texto: (px: number, peso = 400) => `${peso} ${px}px Inter, system-ui, sans-serif`,
};

/** Estado visual global que afecta a todos los paneles. */
export const visual = {
  opacidad: 0.84, // 0,72–0,96 detrás de los textos
  altoContraste: false,
  reducirMovimiento: false,
  /** En RA: ventana al alcance de la mano (toque directo). */
  alcance: true,
};

export function superficie(alpha = visual.opacidad): string {
  if (visual.altoContraste) return 'rgba(8,5,16,0.97)';
  return `rgba(24,17,38,${alpha})`;
}
