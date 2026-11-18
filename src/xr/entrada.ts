import * as THREE from 'three';
import { Panel, Zona, EventoArrastre } from './panel';

type Tipo = 'raton' | 'rayo' | 'toque';

interface Sobre {
  panel: Panel;
  zona: Zona | null;
  punto: THREE.Vector3;
  dist: number;
}

interface Pulsado {
  distRayo: number;
  panel: Panel;
  zona: Zona | null;
  ref: Panel;
  x0: number;
  y0: number;
  x: number;
  y: number;
  movido: boolean;
}

interface Puntero {
  tipo: Tipo;
  indice: number;
  activo: boolean;
  origen: THREE.Vector3;
  dir: THREE.Vector3;
  punta: THREE.Vector3;
  sobre: Sobre | null;
  pulsado: Pulsado | null;
  quierePulsar: boolean;
  quiereSoltar: boolean;
  distAnterior: number;
  fuente?: XRInputSource;
  cursor: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  linea?: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  esfera?: THREE.Mesh;
  controlador?: THREE.Group;
  mano?: THREE.Group;
}

const UMBRAL_TOQUE = 0.012; // m delante del panel para "pulsar" con la yema del índice
const UMBRAL_SOLTAR = 0.032;
const CERCA_TOQUE = 0.14; // si la mano está así de cerca de un panel, se usa toque y no rayo

/**
 * Entrada unificada: ratón/tacto (modo demo), rayos de mando o de pellizco de mano (XR)
 * y toque directo con la punta del dedo índice (XR, seguimiento de manos).
 */
export class Entrada {
  readonly punteros: Puntero[] = [];
  private ray = new THREE.Raycaster();
  private raton: Puntero;
  private tmp = new THREE.Vector3();
  private ultimoResaltado = new Map<Panel, Zona | null>();

  constructor(
    private renderer: THREE.WebGLRenderer,
    private camara: THREE.PerspectiveCamera,
    private escena: THREE.Scene,
    private paneles: () => Panel[],
    private alPulsar?: () => void,
  ) {
    this.raton = this.crearPuntero('raton', 0);
    this.configurarRaton();
    for (let i = 0; i < 2; i++) this.configurarXR(i);
  }

  private crearPuntero(tipo: Tipo, indice: number): Puntero {
    const cursor = new THREE.Mesh(
      new THREE.RingGeometry(0.0045, 0.007, 32),
      new THREE.MeshBasicMaterial({ color: 0xf7f3ff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }),
    );
    cursor.renderOrder = 1000;
    cursor.visible = false;
    this.escena.add(cursor);
    const p: Puntero = {
      tipo,
      indice,
      activo: tipo === 'raton',
      origen: new THREE.Vector3(),
      dir: new THREE.Vector3(0, 0, -1),
      punta: new THREE.Vector3(),
      sobre: null,
      pulsado: null,
      quierePulsar: false,
      quiereSoltar: false,
      distAnterior: 1,
      cursor,
    };
    this.punteros.push(p);
    return p;
  }

  private configurarRaton() {
    const el = this.renderer.domElement;
    const ndc = new THREE.Vector2();
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(ndc, this.camara);
      this.raton.origen.copy(this.ray.ray.origin);
      this.raton.dir.copy(this.ray.ray.direction);
      this.raton.activo = true;
    };
    // El ratón se procesa al momento (no por fotograma) para que los gestos rápidos no se pierdan.
    const mallas = () => this.listaPaneles().map((p) => p.mesh);
    el.addEventListener('pointermove', (e) => {
      mover(e);
      if (this.raton.pulsado) this.arrastrar(this.raton);
    });
    el.addEventListener('pointerdown', (e) => {
      if (this.renderer.xr.isPresenting) return;
      mover(e);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura */
      }
      this.raton.sobre = this.buscarRayo(this.raton, mallas());
      if (this.raton.sobre && !this.raton.pulsado) this.pulsar(this.raton);
    });
    const arriba = (e: PointerEvent) => {
      mover(e);
      if (!this.raton.pulsado) return;
      this.arrastrar(this.raton);
      this.raton.sobre = this.buscarRayo(this.raton, mallas());
      this.soltar(this.raton);
    };
    el.addEventListener('pointerup', arriba);
    el.addEventListener('pointercancel', arriba);
    el.addEventListener('pointerleave', () => {
      if (!this.raton.pulsado) this.raton.activo = false;
    });
  }

  private configurarXR(i: number) {
    const ctrl = this.renderer.xr.getController(i);
    const mano = this.renderer.xr.getHand(i);
    this.escena.add(ctrl, mano);

    const rayo = this.crearPuntero('rayo', i);
    rayo.activo = false;
    rayo.controlador = ctrl;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    rayo.linea = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xd9bfff, transparent: true, opacity: 0.5 }));
    rayo.linea.visible = false;
    ctrl.add(rayo.linea);

    const toque = this.crearPuntero('toque', i);
    toque.activo = false;
    toque.mano = mano;
    toque.esfera = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xd9bfff, transparent: true, opacity: 0.85 }),
    );
    toque.esfera.visible = false;
    this.escena.add(toque.esfera);

    ctrl.addEventListener('connected', (e: any) => {
      rayo.fuente = e.data as XRInputSource;
      toque.fuente = e.data as XRInputSource;
      rayo.activo = true;
    });
    ctrl.addEventListener('disconnected', () => {
      rayo.activo = false;
      toque.activo = false;
      this.soltar(rayo, true);
      this.soltar(toque, true);
      rayo.linea!.visible = false;
    });
    ctrl.addEventListener('selectstart', () => (rayo.quierePulsar = true));
    ctrl.addEventListener('selectend', () => (rayo.quiereSoltar = true));
  }

  /** Panel interactivo visible que contiene este mesh. */
  private listaPaneles(): Panel[] {
    return this.paneles().filter((p) => p.interactivo && visibleEnEscena(p.mesh));
  }

  actualizar() {
    const enXR = this.renderer.xr.isPresenting;
    const paneles = this.listaPaneles();
    const mallas = paneles.map((p) => p.mesh);

    for (const p of this.punteros) {
      if (p.tipo === 'raton' && enXR) p.activo = false;

      // --- posición del puntero -------------------------------------------------
      if (p.tipo === 'toque') {
        const tip = (p.mano as unknown as { joints?: Record<string, THREE.Group> } | undefined)?.joints?.['index-finger-tip'];
        const hayMano = !!(p.fuente?.hand && tip && tip.visible && p.mano!.visible);
        p.activo = enXR && hayMano;
        if (p.activo) tip!.getWorldPosition(p.punta);
        p.esfera!.visible = p.activo;
        if (p.activo) p.esfera!.position.copy(p.punta);
      } else if (p.tipo === 'rayo') {
        if (!enXR || !p.fuente) p.activo = false;
        else {
          p.controlador!.updateMatrixWorld();
          p.origen.setFromMatrixPosition(p.controlador!.matrixWorld);
          p.dir.set(0, 0, -1).transformDirection(p.controlador!.matrixWorld);
          // Con manos: si el índice está cerca de un panel, se desactiva el rayo y se usa el toque.
          const toque = this.punteros.find((q) => q.tipo === 'toque' && q.indice === p.indice);
          p.activo = !(toque?.activo && toque.sobre && toque.sobre.dist < CERCA_TOQUE) || !!p.pulsado;
        }
      }

      if (!p.activo) {
        p.cursor.visible = false;
        if (p.linea) p.linea.visible = false;
        if (p.pulsado && p.tipo !== 'raton') this.soltar(p, true);
        p.sobre = null;
        p.quierePulsar = p.quiereSoltar = false;
        continue;
      }

      // --- qué hay debajo ----------------------------------------------------------
      p.sobre = p.tipo === 'toque' ? this.buscarToque(p, paneles) : this.buscarRayo(p, mallas);

      // --- pulsar / soltar -----------------------------------------------------------
      if (p.tipo === 'toque') {
        const d = p.sobre?.dist ?? 1;
        if (!p.pulsado && p.sobre && d < UMBRAL_TOQUE && p.distAnterior >= UMBRAL_TOQUE) this.pulsar(p);
        else if (p.pulsado) {
          const dRef = this.distanciaA(p.pulsado.ref, p.punta);
          // Mientras se arrastra (swipe, deslizadores) se tolera más separación del plano.
          const umbral = p.pulsado.movido ? UMBRAL_SOLTAR * 2 : UMBRAL_SOLTAR;
          if (dRef > umbral || dRef < -0.08) this.soltar(p);
        }
        p.distAnterior = p.pulsado ? 0 : d;
      } else {
        if (p.quierePulsar) {
          p.quierePulsar = false;
          if (!p.pulsado && p.sobre) this.pulsar(p);
        }
        if (p.quiereSoltar) {
          p.quiereSoltar = false;
          if (p.pulsado) {
            this.arrastrar(p); // usa la posición final antes de soltar
            this.soltar(p);
          }
        }
      }

      if (p.pulsado) this.arrastrar(p);

      // --- visuales ------------------------------------------------------------------------
      this.visuales(p);
    }

    // Resaltado de zonas
    const nuevo = new Map<Panel, Zona | null>();
    for (const p of this.punteros) {
      if (!p.activo) continue;
      if (p.pulsado) nuevo.set(p.pulsado.panel, p.pulsado.zona);
      else if (p.sobre && !nuevo.has(p.sobre.panel)) nuevo.set(p.sobre.panel, p.sobre.zona);
    }
    for (const [panel] of this.ultimoResaltado) if (!nuevo.has(panel)) panel.resaltar(null);
    for (const [panel, zona] of nuevo) {
      const presionado = this.punteros.some((p) => p.pulsado?.panel === panel);
      panel.resaltar(zona && !zona.arrastre ? zona : null, presionado);
    }
    this.ultimoResaltado = nuevo;
  }

  private buscarRayo(p: Puntero, mallas: THREE.Object3D[]): Sobre | null {
    this.ray.set(p.origen, p.dir);
    const hits = this.ray.intersectObjects(mallas, false);
    for (const h of hits) {
      const panel = h.object.userData.panel as Panel;
      if (!h.uv) continue;
      const x = h.uv.x * panel.w;
      const y = (1 - h.uv.y) * panel.h;
      return { panel, zona: panel.zonaEn(x, y), punto: h.point.clone(), dist: h.distance };
    }
    return null;
  }

  private buscarToque(p: Puntero, paneles: Panel[]): Sobre | null {
    let mejor: Sobre | null = null;
    for (const panel of paneles) {
      const local = panel.mesh.worldToLocal(this.tmp.copy(p.punta));
      const mw = (panel.w * 0.5 + 10) * (0.42 / 540);
      const mh = (panel.h * 0.5 + 10) * (0.42 / 540);
      if (Math.abs(local.x) > mw || Math.abs(local.y) > mh) continue;
      const d = local.z;
      if (d < -0.04 || d > CERCA_TOQUE) continue;
      if (!mejor || d < mejor.dist) {
        const px = panel.localAPx(local);
        const punto = panel.mesh.localToWorld(new THREE.Vector3(local.x, local.y, 0));
        mejor = { panel, zona: panel.zonaEn(px.x, px.y), punto, dist: d };
      }
    }
    return mejor;
  }

  private distanciaA(panel: Panel, punto: THREE.Vector3): number {
    return panel.mesh.worldToLocal(this.tmp.copy(punto)).z;
  }

  /** Posición del puntero proyectada sobre el plano del panel de referencia, en px lógicos. */
  private pxEn(p: Puntero, ref: Panel): { x: number; y: number } | null {
    if (p.tipo === 'toque') return ref.localAPx(ref.mesh.worldToLocal(this.tmp.copy(p.punta)));
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(ref.mesh.getWorldQuaternion(new THREE.Quaternion()));
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, ref.mesh.getWorldPosition(new THREE.Vector3()));
    const hit = new THREE.Ray(p.origen, p.dir).intersectPlane(plano, new THREE.Vector3());
    if (!hit) return null;
    return ref.localAPx(ref.mesh.worldToLocal(hit));
  }

  private pulsar(p: Puntero) {
    if (!p.sobre) return;
    const { panel, zona } = p.sobre;
    const ref = zona?.plano ?? panel;
    const px = this.pxEn(p, ref) ?? { x: 0, y: 0 };
    p.pulsado = { panel, zona, ref, x0: px.x, y0: px.y, x: px.x, y: px.y, movido: false, distRayo: p.sobre.dist };
    zona?.arrastre?.(evento('inicio', p.pulsado));
    zona?.mover?.('inicio', this.puntoMundo(p));
    this.vibrar(p, 0.35, 20);
  }

  private puntoMundo(p: Puntero): THREE.Vector3 {
    if (p.tipo === 'toque') return p.punta.clone();
    return p.origen.clone().addScaledVector(p.dir, p.pulsado?.distRayo ?? p.sobre?.dist ?? 1);
  }

  private arrastrar(p: Puntero) {
    const s = p.pulsado!;
    if (s.zona?.mover) {
      s.zona.mover('mover', this.puntoMundo(p));
      s.movido = true;
      return;
    }
    const px = this.pxEn(p, s.ref);
    if (!px) return;
    if (Math.abs(px.x - s.x) < 0.01 && Math.abs(px.y - s.y) < 0.01) return;
    s.x = px.x;
    s.y = px.y;
    const umbral = p.tipo === 'toque' ? 16 : 10;
    if (Math.hypot(s.x - s.x0, s.y - s.y0) > umbral) s.movido = true;
    s.zona?.arrastre?.(evento('mover', s));
  }

  private soltar(p: Puntero, cancelado = false) {
    const s = p.pulsado;
    if (!s) return;
    p.pulsado = null;
    s.zona?.arrastre?.(evento('fin', s));
    s.zona?.mover?.('fin', this.puntoMundo(p));
    if (cancelado || !s.zona?.click) return;
    const mismaZona = p.sobre?.zona && p.sobre.panel === s.panel && mismoRect(p.sobre.zona, s.zona);
    if (!s.movido || (!s.zona.arrastre && mismaZona) || (p.tipo === 'toque' && !s.zona.arrastre)) {
      this.vibrar(p, 0.6, 35);
      this.alPulsar?.();
      s.zona.click();
    }
  }

  private visuales(p: Puntero) {
    const s = p.sobre;
    if (p.linea) {
      p.linea.visible = true;
      p.linea.scale.z = s ? s.dist : 0.5;
      p.linea.material.opacity = s ? 0.75 : 0.25;
    }
    if (s && p.tipo !== 'raton') {
      p.cursor.visible = true;
      p.cursor.position.copy(s.punto);
      s.panel.mesh.getWorldQuaternion(p.cursor.quaternion);
      p.cursor.translateZ(0.003);
      const k = p.tipo === 'toque' ? THREE.MathUtils.clamp(s.dist / 0.08, 0.35, 1.6) : 1;
      p.cursor.scale.setScalar(p.pulsado ? 0.7 : k);
      p.cursor.material.color.set(p.pulsado ? 0xf83b91 : s.zona?.click || s.zona?.arrastre ? 0xd9bfff : 0xf7f3ff);
    } else p.cursor.visible = false;

    if (p.tipo === 'raton') {
      const c = s?.zona && (s.zona.click || s.zona.arrastre);
      this.renderer.domElement.style.cursor = p.pulsado ? 'grabbing' : c ? 'pointer' : 'default';
    }
  }

  private vibrar(p: Puntero, intensidad: number, ms: number) {
    const act = (p.fuente?.gamepad as any)?.hapticActuators?.[0];
    try {
      act?.pulse?.(intensidad, ms);
    } catch {
      /* sin háptica */
    }
  }

  ocupado(): boolean {
    return this.punteros.some((p) => p.pulsado);
  }
}

function evento(fase: EventoArrastre['fase'], s: Pulsado): EventoArrastre {
  return { fase, x: s.x, y: s.y, x0: s.x0, y0: s.y0, dx: s.x - s.x0, dy: s.y - s.y0 };
}

function mismoRect(a: Zona, b: Zona) {
  return a === b || (a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
}

function visibleEnEscena(o: THREE.Object3D): boolean {
  let n: THREE.Object3D | null = o;
  while (n) {
    if (!n.visible) return false;
    n = n.parent;
  }
  return true;
}
