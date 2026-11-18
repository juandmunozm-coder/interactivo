import * as THREE from 'three';

/** Metros por píxel lógico: el panel principal de 540 px mide 0,42 m de ancho. */
export const M_PX = 0.42 / 540;

export interface EventoArrastre {
  fase: 'inicio' | 'mover' | 'fin';
  /** Coordenadas en píxeles lógicos del panel de referencia (pueden salir de sus límites). */
  x: number;
  y: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
}

export interface Zona {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  click?: () => void;
  arrastre?: (e: EventoArrastre) => void;
  /** Panel cuyo plano se usa para medir el arrastre (p. ej. la tarjeta usa el principal). */
  plano?: Panel;
  /** Arrastre en el espacio 3D (mover la ventana): recibe un punto en coordenadas de mundo. */
  mover?: (fase: 'inicio' | 'mover' | 'fin', punto: THREE.Vector3) => void;
  /** Sin resaltado al pasar por encima. */
  sinResaltado?: boolean;
}

let ordenRender = 0;

/**
 * Panel espacial: un lienzo 2D que se rasteriza en una textura y se muestra en un plano 3D.
 * Toda su interacción se resuelve con "zonas" en píxeles lógicos.
 */
export class Panel {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly textura: THREE.CanvasTexture;
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  zonas: Zona[] = [];
  interactivo = true;
  /** Opacidad global (para animaciones de aparición). */
  alfa = 1;
  private resaltado: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  constructor(
    public nombre: string,
    public w: number,
    public h: number,
    public dibujar: (p: Panel) => void,
    public resolucion = 2,
    orden?: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * resolucion);
    this.canvas.height = Math.round(h * resolucion);
    this.ctx = this.canvas.getContext('2d')!;
    this.textura = new THREE.CanvasTexture(this.canvas);
    this.textura.colorSpace = THREE.SRGBColorSpace;
    this.textura.anisotropy = 8;
    this.textura.minFilter = THREE.LinearMipmapLinearFilter;
    this.textura.generateMipmaps = true;
    const mat = new THREE.MeshBasicMaterial({
      map: this.textura,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * M_PX, h * M_PX), mat);
    this.mesh.name = nombre;
    this.mesh.renderOrder = orden ?? ++ordenRender;
    this.mesh.userData.panel = this;

    this.resaltado = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false, color: 0xd9bfff, opacity: 0.16, toneMapped: false }),
    );
    this.resaltado.visible = false;
    this.resaltado.renderOrder = 999;
    this.mesh.add(this.resaltado);
  }

  get visible() {
    return this.mesh.visible;
  }

  redibujar() {
    const { ctx } = this;
    ctx.setTransform(this.resolucion, 0, 0, this.resolucion, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.zonas = [];
    this.dibujar(this);
    this.textura.needsUpdate = true;
    this.resaltar(null);
  }

  zona(z: Zona) {
    this.zonas.push(z);
  }

  zonaEn(x: number, y: number): Zona | null {
    for (let i = this.zonas.length - 1; i >= 0; i--) {
      const z = this.zonas[i];
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
    }
    return null;
  }

  /** Píxeles lógicos → coordenadas locales del plano (metros, origen en el centro). */
  pxALocal(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3((x - this.w / 2) * M_PX, (this.h / 2 - y) * M_PX, 0);
  }

  localAPx(v: THREE.Vector3): { x: number; y: number } {
    return { x: v.x / M_PX + this.w / 2, y: this.h / 2 - v.y / M_PX };
  }

  resaltar(z: Zona | null, presionado = false) {
    if (!z || z.sinResaltado || (!z.click && !z.arrastre)) {
      this.resaltado.visible = false;
      return;
    }
    const c = this.pxALocal(z.x + z.w / 2, z.y + z.h / 2);
    this.resaltado.position.set(c.x, c.y, 0.001);
    this.resaltado.scale.set(z.w * M_PX, z.h * M_PX, 1);
    this.resaltado.material.map = texturaRedondeada(z.w, z.h, z.r ?? 18);
    this.resaltado.material.opacity = presionado ? 0.3 : 0.14;
    this.resaltado.material.needsUpdate = true;
    this.resaltado.visible = true;
  }

  aplicarAlfa() {
    this.mesh.material.opacity = this.alfa;
    this.mesh.visible = this.alfa > 0.001;
  }
}

const cacheRedondeo = new Map<string, THREE.CanvasTexture>();
function texturaRedondeada(w: number, h: number, r: number): THREE.CanvasTexture {
  const k = `${Math.round(w)}x${Math.round(h)}x${Math.round(r)}`;
  let t = cacheRedondeo.get(k);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(w));
  c.height = Math.max(4, Math.round(h));
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath();
  const rad = Math.min(r, w / 2, h / 2);
  g.roundRect(0, 0, c.width, c.height, rad);
  g.fill();
  t = new THREE.CanvasTexture(c);
  cacheRedondeo.set(k, t);
  return t;
}
