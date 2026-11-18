// Ejecutar con: npm test   (Node 22.6+ con soporte de TypeScript por eliminación de tipos)
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { media, ordenarMazo, motivosFueraDeRecomendaciones, AJUSTES_POR_DEFECTO, interesesComunes, type Perfil } from '../src/logica.ts';

const perfiles: Perfil[] = JSON.parse(readFileSync(new URL('../src/data/perfiles.json', import.meta.url), 'utf8'));
let ok = 0;
const t = (nombre: string, fn: () => void) => { fn(); ok++; console.log('✔', nombre); };

t('16 perfiles: 1 principal, 10 recomendados, 5 fuera', () => {
  assert.equal(perfiles.length, 16);
  assert.equal(perfiles.filter((p) => p.group === 'principal').length, 1);
  assert.equal(perfiles.filter((p) => p.group === 'recomendados').length, 10);
  assert.equal(perfiles.filter((p) => p.group === 'fuera-de-recomendaciones').length, 5);
});

t('16 fotos distintas y existentes', () => {
  const fotos = new Set(perfiles.map((p) => p.id));
  assert.equal(fotos.size, 16);
  for (const p of perfiles) assert.ok(existsSync(new URL(`../public/perfiles/${p.id}.jpg`, import.meta.url)), p.id);
});

t('Juan David sin nota inventada', () => {
  const jd = perfiles.find((p) => p.id === 'juan-david')!;
  assert.equal(jd.averageRating, null);
  assert.equal(media(jd.ratings), null);
});

t('Medias aritméticas iguales a los datos', () => {
  for (const p of perfiles.filter((p) => p.group !== 'principal')) assert.equal(media(p.ratings), p.averageRating, p.id);
});

t('Orden por defecto: 10 recomendados, Lucía primero', () => {
  const m = ordenarMazo(perfiles, AJUSTES_POR_DEFECTO);
  assert.equal(m.length, 10);
  assert.equal(m[0].id, 'lucia');
});

t('Sin valoraciones ajenas: entran los 15 perfiles', () => {
  const m = ordenarMazo(perfiles, { ...AJUSTES_POR_DEFECTO, usarValoraciones: false });
  assert.equal(m.length, 15);
  assert.equal(m[0].id, 'lucia'); // sigue mandando la compatibilidad
});

t('Sin ambos criterios: orden alfabético neutral', () => {
  const m = ordenarMazo(perfiles, { usarValoraciones: false, priorizarCompatibilidad: false, ocultarPuntuaciones: false });
  const nombres = m.map((p) => p.name);
  assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, 'es')));
});

t('Ocultar puntuaciones no cambia el orden', () => {
  const a = ordenarMazo(perfiles, AJUSTES_POR_DEFECTO).map((p) => p.id);
  const b = ordenarMazo(perfiles, { ...AJUSTES_POR_DEFECTO, ocultarPuntuaciones: true }).map((p) => p.id);
  assert.deepEqual(a, b);
});

t('Cada perfil fuera de recomendaciones tiene motivos', () => {
  for (const p of perfiles.filter((p) => p.group === 'fuera-de-recomendaciones')) {
    assert.ok(motivosFueraDeRecomendaciones(p).length >= 2, p.id);
  }
});

t('Intereses comunes de Lucía', () => {
  const l = perfiles.find((p) => p.id === 'lucia')!;
  assert.ok(interesesComunes(l).includes('Marvel'));
});

console.log(`\n${ok} pruebas superadas`);
