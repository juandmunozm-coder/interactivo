import './estilo.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/sora/600.css';
import * as THREE from 'three';
import { App } from './app';
import { Entrada } from './xr/entrada';
import { actualizarAnimaciones } from './xr/tween';
import { cargarImagenes } from './imagenes';
import { activarAudio, sonido } from './sonido';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const inicio = $('inicio');
const hud = $('hud');
const btnAR = $<HTMLButtonElement>('btn-ar');
const btnAR2 = $<HTMLButtonElement>('btn-ar2');
const btnDemo = $<HTMLButtonElement>('btn-demo');
const estadoXR = $('estado-xr');

// --- Render -------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(0.2); // texto nítido también fuera del centro
document.body.appendChild(renderer.domElement);
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 50);
camara.position.set(0, 1.55, 0);
camara.lookAt(0, 1.45, -1.25); // mira al centro del panel principal (modo demo)
escena.add(camara);

/** Fondo solo para el modo demostración. En RA el fondo es transparente (passthrough). */
function crearFondoDemo(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0B0815';
  g.fillRect(0, 0, 1024, 1024);
  const blob = (x: number, y: number, r: number, col: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(11,8,21,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
  };
  blob(220, 160, 620, 'rgba(109,60,199,0.55)');
  blob(880, 900, 520, 'rgba(200,43,136,0.32)');
  blob(560, 560, 420, 'rgba(37,24,59,0.6)');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const fondoDemo = crearFondoDemo();
escena.background = fondoDemo;

// --- Aplicación ---------------------------------------------------------------------------------
await Promise.all(
  ['300 16px Inter', '400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter', '600 16px Sora'].map((f) =>
    document.fonts.load(f).catch(() => undefined),
  ),
);

const app = new App(escena, camara, renderer, salir);
const entrada = new Entrada(renderer, camara, escena, () => app.paneles(), () => sonido.click());
let redibujoPendiente = false;
cargarImagenes(() => {
  if (redibujoPendiente) return;
  redibujoPendiente = true;
  requestAnimationFrame(() => {
    redibujoPendiente = false;
    app.redibujarTodo();
  });
});

// --- Realidad aumentada -------------------------------------------------------------------------
let soportaAR = false;
let framesHastaColocar = -1;

async function comprobarXR() {
  if (!window.isSecureContext) {
    btnAR.textContent = 'Realidad aumentada no disponible';
    estadoXR.textContent = 'WebXR necesita HTTPS. Abre la dirección https:// que muestra el servidor.';
    return;
  }
  if (!('xr' in navigator) || !navigator.xr) {
    btnAR.textContent = 'Realidad aumentada no disponible';
    estadoXR.textContent = 'Este navegador no tiene WebXR. Usa Meta Quest Browser.';
    return;
  }
  try {
    soportaAR = await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    soportaAR = false;
  }
  btnAR.disabled = !soportaAR;
  btnAR.textContent = soportaAR ? 'Entrar en realidad aumentada' : 'Realidad aumentada no disponible';
  estadoXR.textContent = soportaAR
    ? 'Passthrough + manos o mandos. Se pedirá permiso al entrar.'
    : 'Este equipo no admite immersive-ar: puedes usar el modo demostración.';
  btnAR2.classList.toggle('oculto', !soportaAR);
}

async function entrarAR() {
  activarAudio();
  const xr = navigator.xr;
  if (!xr) return;
  let sesion: XRSession;
  try {
    try {
      sesion = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'bounded-floor'],
      });
    } catch {
      renderer.xr.setReferenceSpaceType('local');
      sesion = await xr.requestSession('immersive-ar', { optionalFeatures: ['hand-tracking', 'local-floor'] });
    }
  } catch (e) {
    estadoXR.textContent = `No se pudo iniciar la RA (${(e as Error).message ?? e}). Continúa en modo demostración.`;
    modoDemo();
    return;
  }
  escena.background = null; // el passthrough se ve detrás de los paneles
  renderer.setClearColor(0x000000, 0);
  sesion.addEventListener('end', alTerminarXR);
  await renderer.xr.setSession(sesion);
  inicio.classList.add('oculto');
  hud.classList.add('oculto');
  app.rig.visible = false;
  app.lanzadorGrupo.visible = false;
  framesHastaColocar = 20; // espera a tener la pose de la cabeza
}

function alTerminarXR() {
  escena.background = fondoDemo;
  renderer.xr.setReferenceSpaceType('local-floor');
  app.rig.scale.setScalar(1);
  app.rig.visible = false;
  app.lanzadorGrupo.visible = false;
  inicio.classList.remove('oculto');
  hud.classList.add('oculto');
}

function modoDemo() {
  activarAudio();
  inicio.classList.add('oculto');
  hud.classList.remove('oculto');
  app.iniciar();
}

function salir() {
  if (renderer.xr.isPresenting) {
    renderer.xr.getSession()?.end();
    return;
  }
  app.rig.visible = false;
  app.lanzadorGrupo.visible = false;
  hud.classList.add('oculto');
  inicio.classList.remove('oculto');
}

btnAR.addEventListener('click', entrarAR);
btnAR2.addEventListener('click', entrarAR);
btnDemo.addEventListener('click', modoDemo);
btnDemo.disabled = false;
btnDemo.textContent = 'Continuar en modo demostración';
comprobarXR();

// --- Cámara del modo demostración ----------------------------------------------------------------
function ajustarCamara(suave: boolean) {
  const aspect = window.innerWidth / window.innerHeight;
  camara.aspect = aspect;
  const dist = 1.25;
  const lateralVisible = app.izq.mesh.visible;
  const ancho = aspect < 1 && !lateralVisible ? 0.62 : 1.48;
  const alto = 1.14;
  const vfov = Math.max(2 * Math.atan(alto / 2 / dist), 2 * Math.atan(ancho / 2 / dist / aspect));
  const objetivo = THREE.MathUtils.radToDeg(vfov);
  camara.fov = suave ? camara.fov + (objetivo - camara.fov) * 0.12 : objetivo;
  camara.updateProjectionMatrix();
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  ajustarCamara(false);
});
ajustarCamara(false);

// --- Bucle --------------------------------------------------------------------------------------
const reloj = new THREE.Clock();
renderer.setAnimationLoop((t) => fotograma(t, Math.min(0.05, reloj.getDelta())));

function fotograma(t: number, dt: number) {
  if (framesHastaColocar > 0 && renderer.xr.isPresenting && --framesHastaColocar === 0) {
    if (app.abierta) {
      app.rig.visible = !app.pausado;
      app.colocarInicial();
      if (app.pausado) app.pausar();
    } else app.iniciar();
  }
  if (!renderer.xr.isPresenting) ajustarCamara(true);
  entrada.actualizar();
  actualizarAnimaciones(dt);
  app.actualizar(dt, t / 1000);
  renderer.render(escena, camara);
}

// Acceso para depuración desde la consola. `vibra.paso(n)` avanza n fotogramas a mano.
let tManual = 0;
Object.assign(window, {
  vibra: { app, renderer, escena, entrada, paso: (n = 1) => { for (let i = 0; i < n; i++) fotograma((tManual += 16.7), 1 / 60); } },
});
