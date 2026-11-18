import * as THREE from 'three';
import { Panel, M_PX, EventoArrastre } from './xr/panel';
import { animar, easeOut, easeBack, easeInOut } from './xr/tween';
import { estado, porId, Valoracion } from './estado';
import { foto } from './imagenes';
import { visual } from './ui/tema';
import { sonido } from './sonido';
import { CATEGORIAS } from './logica';
import {
  dibujarAviso, dibujarBarra, dibujarDock, dibujarLanzador, dibujarLateralDer, dibujarLateralIzq, dibujarPrincipal,
  dibujarSello, dibujarTarjeta,
} from './pantallas';

export type Pantalla = 'bienvenida' | 'swipe' | 'verPerfil' | 'likes' | 'chats' | 'conversacion' | 'llamada' | 'valorar' | 'perfil';

interface Tarjeta {
  panel: Panel;
  id: string | null;
  like: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  nope: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

// Geometría (metros) relativa al centro del panel principal
const ALTO = 960 * M_PX;
const TARJ_Y = (480 - 452) * M_PX;
const POSE_FRENTE = { y: TARJ_Y, z: 0.03, s: 1 };
const POSE_ATRAS = { y: TARJ_Y - 0.012, z: 0.014, s: 0.94 };
const LAT_ROT = 0.35;
const LAT_X = 0.21 + 0.03 + (210 * M_PX) * Math.cos(LAT_ROT);
const OPACIDADES = [0.72, 0.8, 0.88, 0.96];

export class App {
  // Estado de interfaz (no persistente)
  pantalla: Pantalla = 'bienvenida';
  dockAbierto = false;
  lateral: 'perfil' | 'decide' | null = null;
  matchCon: string | null = null;
  verId: string | null = null;
  verOrigen: 'likes' | 'chat' = 'likes';
  tabLikes: 'recibidos' | 'enviados' | 'descartados' = 'recibidos';
  paginaLikes = 0;
  chatId: string | null = null;
  llamada: { id: string; fase: 'llamando' | 'conectada'; t0: number; mic: boolean; cam: boolean } | null = null;
  valoracion: Valoracion = valoracionInicial();
  escribiendo = new Set<string>();
  editandoIntereses = false;
  pausado = false;
  abierta = false;
  aviso: { texto: string; id?: string } | null = null;
  denuncia: { id: string; paso: 'menu' | 'motivos' | 'enviada' } | null = null;

  // Escena
  readonly rig = new THREE.Group();
  readonly lanzadorGrupo = new THREE.Group();
  readonly principal: Panel;
  readonly izq: Panel;
  readonly der: Panel;
  readonly dock: Panel;
  readonly barra: Panel;
  readonly avisoPanel: Panel;
  readonly lanzador: Panel;
  private tarjetas: [Tarjeta, Tarjeta];
  private frente = 0;
  private arrastrando = false;
  private volando = false;
  private offsetMover = new THREE.Vector3();
  private tAviso = 0;
  private relojLlamada = 0;
  private relojTimbre = 0;
  private baseLanzadorY = 0;
  private desenfocadas = new Map<string, HTMLCanvasElement>();

  constructor(
    private escena: THREE.Scene,
    private camara: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer,
    private alSalir: () => void,
  ) {
    cargarVisual();
    this.escena.add(this.rig, this.lanzadorGrupo);

    this.principal = new Panel('principal', 540, 960, (p) => dibujarPrincipal(this, p), 2, 10);
    this.rig.add(this.principal.mesh);

    const crearTarjeta = (i: number): Tarjeta => {
      const t: Tarjeta = {
        panel: null as unknown as Panel,
        id: null,
        like: selloMesh('ME GUSTA', '#F83B91', 0.26),
        nope: selloMesh('PASO', '#D9BFFF', -0.26),
      };
      t.panel = new Panel(`tarjeta${i}`, 480, 700, (p) => dibujarTarjeta(this, p, t.id, this.tarjetas?.[this.frente] === t), 2, 20 + i);
      t.like.position.set(-0.1, 0.2, 0.002);
      t.nope.position.set(0.1, 0.2, 0.002);
      t.panel.mesh.add(t.like, t.nope);
      t.panel.mesh.visible = false;
      this.rig.add(t.panel.mesh);
      return t;
    };
    this.tarjetas = [crearTarjeta(0), crearTarjeta(1)];

    this.izq = new Panel('izq', 420, 960, (p) => dibujarLateralIzq(this, p), 2, 30);
    this.der = new Panel('der', 420, 960, (p) => dibujarLateralDer(this, p), 2, 31);
    const latY = 0;
    this.izq.mesh.position.set(-LAT_X, latY, 0.07);
    this.izq.mesh.rotation.y = LAT_ROT;
    this.der.mesh.position.set(LAT_X, latY, 0.07);
    this.der.mesh.rotation.y = -LAT_ROT;

    this.dock = new Panel('dock', 520, 170, (p) => dibujarDock(this, p), 2, 40);
    this.dock.mesh.position.set(0, (480 - 169) * M_PX, 0.1);

    this.barra = new Panel('barra', 720, 84, (p) => dibujarBarra(this, p), 2, 12);
    this.barra.mesh.position.set(0, -ALTO / 2 - 0.012 - (42 * M_PX), 0.03);
    this.barra.mesh.rotation.x = -0.25;

    this.avisoPanel = new Panel('aviso', 500, 100, (p) => dibujarAviso(this, p), 2, 45);
    this.avisoPanel.mesh.position.set(0, ALTO / 2 + 0.015 + 50 * M_PX, 0.04);

    for (const p of [this.izq, this.der, this.dock, this.avisoPanel]) {
      p.alfa = 0;
      p.aplicarAlfa();
    }
    this.rig.add(this.izq.mesh, this.der.mesh, this.dock.mesh, this.barra.mesh, this.avisoPanel.mesh);

    this.lanzador = new Panel('lanzador', 220, 280, (p) => dibujarLanzador(this, p), 2, 50);
    this.lanzadorGrupo.add(this.lanzador.mesh);

    this.rig.visible = false;
    this.lanzadorGrupo.visible = false;

    estado.escuchar(() => this.refrescar());
    estado.alAviso = (texto, id) => {
      sonido.match();
      this.toast(texto, id);
    };
    estado.alMatch = (id) => {
      if (this.pantalla === 'swipe' || this.pantalla === 'verPerfil') {
        this.matchCon = id;
        this.lateral = null;
        sonido.match();
      }
    };
  }

  /** Paneles que reciben entrada. */
  paneles(): Panel[] {
    const t = this.tarjetas[this.frente].panel;
    return [this.lanzador, this.avisoPanel, this.dock, t, this.izq, this.der, this.principal, this.barra];
  }

  // -------------------------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------------------------

  /** Muestra solo el icono de la app flotando delante (viñetas 1-2 del guion). */
  iniciar() {
    this.abierta = false;
    this.pausado = false;
    this.rig.visible = false;
    this.pantalla = 'bienvenida';
    this.lateral = null;
    this.dockAbierto = false;
    this.matchCon = null;
    this.lanzador.redibujar();
    this.colocarLanzador();
    this.lanzadorGrupo.visible = true;
    this.lanzador.alfa = 0;
    animar(400, (k) => {
      this.lanzador.alfa = k;
      this.lanzador.aplicarAlfa();
      this.lanzador.mesh.scale.setScalar(0.7 + 0.3 * k);
    }, undefined, easeBack);
  }

  /** Recoloca lo que esté visible delante de la vista actual (al entrar en XR). */
  colocarInicial() {
    if (this.rig.visible) this.aplicarAlcance();
    if (this.lanzadorGrupo.visible) this.colocarLanzador();
  }

  abrir() {
    sonido.like();
    const primeraVez = !this.abierta;
    this.abierta = true;
    this.lanzadorGrupo.visible = false;
    if (!this.pausado || primeraVez) {
      this.rig.scale.setScalar(this.cercaActivo ? 0.8 : 1);
      this.recentrar();
    }
    this.pausado = false;
    if (primeraVez) {
      this.pantalla = 'bienvenida';
      this.dockAbierto = true; // viñeta 5: se despliega el menú para elegir Swipe
    }
    this.rig.visible = true;
    this.redibujarTodo();
    const s = this.rig.scale.x || 1;
    animar(380, (k) => this.rig.scale.setScalar(s * (0.55 + 0.45 * k)), undefined, easeBack);
  }

  pausar() {
    this.pausado = true;
    this.rig.visible = false;
    this.lanzador.redibujar();
    this.colocarLanzador(-0.04);
    this.lanzadorGrupo.visible = true;
    this.lanzador.alfa = 1;
    this.lanzador.aplicarAlfa();
    this.lanzador.mesh.scale.setScalar(1);
  }

  salir() {
    this.alSalir();
  }

  reiniciar() {
    estado.reiniciar();
    this.pantalla = 'swipe';
    this.lateral = null;
    this.matchCon = null;
    this.dockAbierto = false;
    this.llamada = null;
    this.denuncia = null;
    this.tabLikes = 'recibidos';
    this.toast('Demo reiniciada');
  }

  actualizar(dt: number, t: number) {
    if (this.lanzadorGrupo.visible && !visual.reducirMovimiento) this.lanzadorGrupo.position.y = this.baseLanzadorY + Math.sin(t * 1.6) * 0.008;
    if (this.pantalla === 'llamada' && this.llamada) {
      this.relojLlamada += dt;
      const paso = this.llamada.fase === 'llamando' ? 0.5 : 1;
      if (this.relojLlamada >= paso) {
        this.relojLlamada = 0;
        this.principal.redibujar();
      }
      if (this.llamada.fase === 'llamando') {
        this.relojTimbre += dt;
        if (this.relojTimbre > 1.3) {
          this.relojTimbre = 0;
          sonido.timbre();
        }
      }
    }
  }

  // -------------------------------------------------------------------------------------------
  // Navegación y estado de interfaz
  // -------------------------------------------------------------------------------------------

  seccion(): Pantalla | null {
    switch (this.pantalla) {
      case 'verPerfil': return this.verOrigen === 'chat' ? 'chats' : 'likes';
      case 'conversacion': case 'llamada': case 'valorar': return 'chats';
      case 'bienvenida': return null;
      default: return this.pantalla;
    }
  }

  // --- Seguridad: denunciar / bloquear desde el chat ---------------------------------------------
  abrirDenuncia(id: string) {
    this.denuncia = { id, paso: 'menu' };
    this.dockAbierto = false;
    this.refrescar();
  }

  pasoDenuncia(paso: 'menu' | 'motivos' | 'enviada') {
    if (this.denuncia) this.denuncia.paso = paso;
    this.refrescar();
  }

  cerrarDenuncia() {
    this.denuncia = null;
    this.refrescar();
  }

  denunciar(id: string, motivo: string) {
    this.denuncia = { id, paso: 'enviada' };
    estado.denunciar(id, motivo);
  }

  bloquear(id: string) {
    const nombre = porId(id).name;
    this.denuncia = null;
    this.pantalla = 'chats';
    estado.bloquear(id);
    this.toast(`Has bloqueado a ${nombre}`);
  }

  ir(p: Pantalla) {
    this.pantalla = p;
    this.denuncia = null;
    this.dockAbierto = false;
    this.matchCon = null;
    this.lateral = null;
    this.editandoIntereses = false;
    this.refrescar();
  }

  irLikes(tab: App['tabLikes']) {
    this.tabLikes = tab;
    this.paginaLikes = 0;
    this.ir('likes');
  }

  alternarDock() {
    this.dockAbierto = !this.dockAbierto;
    this.refrescar();
  }

  abrirLateral(k: 'perfil' | 'decide' | null) {
    this.lateral = this.lateral === k ? null : k;
    if (this.lateral) this.dockAbierto = false;
    this.refrescar();
  }

  idLateral(): string | null {
    if (this.pantalla === 'verPerfil') return this.verId;
    if (this.pantalla === 'swipe') return this.tarjetas[this.frente].id;
    return null;
  }

  verPerfil(id: string, origen: 'likes' | 'chat') {
    this.verId = id;
    this.verOrigen = origen;
    this.pantalla = 'verPerfil';
    this.dockAbierto = false;
    this.matchCon = null;
    this.lateral = 'perfil';
    this.refrescar();
  }

  likeDesdePerfil(id: string) {
    sonido.like();
    estado.like(id);
    if (!this.matchCon) {
      this.toast(`Like enviado a ${porId(id).name}`, undefined);
      this.irLikes('enviados');
    }
  }

  abrirChat(id: string) {
    this.chatId = id;
    this.matchCon = null;
    this.ocultarAviso();
    estado.leer(id);
    this.ir('conversacion');
  }

  enviar(id: string, texto: string) {
    estado.enviar(id, texto, (esc) => {
      if (esc) this.escribiendo.add(id);
      else this.escribiendo.delete(id);
      if (this.pantalla === 'conversacion') this.principal.redibujar();
    });
  }

  iniciarLlamada(id: string) {
    this.chatId = id;
    this.llamada = { id, fase: 'llamando', t0: performance.now(), mic: true, cam: true };
    this.relojTimbre = 1.3;
    this.ir('llamada');
    setTimeout(() => {
      if (this.llamada?.id === id && this.llamada.fase === 'llamando') {
        this.llamada.fase = 'conectada';
        this.llamada.t0 = performance.now();
        this.principal.redibujar();
      }
    }, 2800);
  }

  tiempoLlamada(): string {
    const s = Math.floor((performance.now() - (this.llamada?.t0 ?? 0)) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  colgar() {
    sonido.colgar();
    this.llamada = null;
    this.valoracion = valoracionInicial();
    this.ir('valorar');
  }

  enviarValoracion() {
    if (!this.chatId) return;
    estado.valorar(this.chatId, { ...this.valoracion });
    this.toast(`Valoración de ${porId(this.chatId).name} enviada`);
    this.ir('conversacion');
  }

  fotoDesenfocada(id: string): HTMLCanvasElement | undefined {
    let c = this.desenfocadas.get(id);
    if (c) return c;
    const img = foto(id);
    if (!img || !img.width) return undefined;
    c = document.createElement('canvas');
    c.width = 90;
    c.height = 112;
    const g = c.getContext('2d')!;
    g.filter = 'blur(6px)';
    g.drawImage(img, -10, -10, 110, 132);
    this.desenfocadas.set(id, c);
    return c;
  }

  toast(texto: string, id?: string) {
    this.aviso = { texto, id };
    this.avisoPanel.redibujar();
    this.fijarVisible(this.avisoPanel, true);
    const yo = ++this.tAviso;
    setTimeout(() => {
      if (yo === this.tAviso) this.ocultarAviso();
    }, 4500);
  }

  private ocultarAviso() {
    this.fijarVisible(this.avisoPanel, false);
  }

  // -------------------------------------------------------------------------------------------
  // Swipe
  // -------------------------------------------------------------------------------------------

  arrastreTarjeta(e: EventoArrastre) {
    if (this.volando) return;
    const t = this.tarjetas[this.frente];
    const m = t.panel.mesh;
    if (e.fase === 'inicio') {
      this.arrastrando = true;
      return;
    }
    const dx = e.dx;
    if (e.fase === 'mover') {
      m.position.x = dx * M_PX;
      m.position.y = POSE_FRENTE.y - Math.abs(dx) * M_PX * 0.08;
      m.rotation.z = -dx / 1500;
      t.like.material.opacity = THREE.MathUtils.clamp(dx / 120, 0, 1);
      t.nope.material.opacity = THREE.MathUtils.clamp(-dx / 120, 0, 1);
      return;
    }
    this.arrastrando = false;
    if (Math.abs(dx) > 120) this.volarTarjeta(dx > 0);
    else {
      const x0 = m.position.x, r0 = m.rotation.z, y0 = m.position.y;
      animar(220, (k) => {
        m.position.x = x0 * (1 - k);
        m.position.y = y0 + (POSE_FRENTE.y - y0) * k;
        m.rotation.z = r0 * (1 - k);
        t.like.material.opacity *= 1 - k;
        t.nope.material.opacity *= 1 - k;
      }, undefined, easeBack, m);
    }
  }

  decidir(like: boolean) {
    if (this.volando || !this.tarjetas[this.frente].id) return;
    this.volarTarjeta(like);
  }

  private volarTarjeta(like: boolean) {
    const t = this.tarjetas[this.frente];
    const id = t.id;
    if (!id) return;
    this.volando = true;
    const m = t.panel.mesh;
    const x0 = m.position.x, r0 = m.rotation.z;
    const xf = (like ? 1 : -1) * 0.62;
    (like ? sonido.like : sonido.pasar)();
    animar(300, (k) => {
      m.position.x = x0 + (xf - x0) * k;
      m.rotation.z = r0 + ((like ? -0.35 : 0.35) - r0) * k;
      (like ? t.like : t.nope).material.opacity = 1;
      t.panel.alfa = 1 - k;
      t.panel.aplicarAlfa();
    }, () => {
      this.volando = false;
      if (like) estado.like(id);
      else estado.pasar(id);
    }, easeInOut, m);
  }

  /** Coloca las dos tarjetas (frente y siguiente) según el mazo o el perfil abierto. */
  private sincronizarTarjetas() {
    let F = this.tarjetas[this.frente];
    let B = this.tarjetas[1 - this.frente];
    const enSwipe = this.pantalla === 'swipe' && !this.matchCon;
    const enVer = this.pantalla === 'verPerfil' && !this.matchCon;
    if (!enSwipe && !enVer) {
      F.panel.mesh.visible = B.panel.mesh.visible = false;
      F.panel.interactivo = false;
      return;
    }
    if (this.volando || this.arrastrando) return;
    const mazo = estado.mazo();
    const a = enVer ? this.verId : mazo[0]?.id ?? null;
    const b = enVer ? null : mazo[1]?.id ?? null;

    if (F.id !== a) {
      if (a && B.id === a && B.panel.mesh.visible) {
        this.frente = 1 - this.frente;
        [F, B] = [B, F];
        F.panel.mesh.renderOrder = 21;
        B.panel.mesh.renderOrder = 20;
        const m = F.panel.mesh;
        const y0 = m.position.y, z0 = m.position.z, s0 = m.scale.x;
        animar(240, (k) => {
          m.position.set(0, y0 + (POSE_FRENTE.y - y0) * k, z0 + (POSE_FRENTE.z - z0) * k);
          m.scale.setScalar(s0 + (1 - s0) * k);
        }, undefined, easeOut, m);
        F.panel.alfa = 1;
        F.panel.aplicarAlfa();
      } else {
        F.id = a;
        this.poseTarjeta(F, POSE_FRENTE);
        F.panel.alfa = 0;
        animar(220, (k) => {
          F.panel.alfa = k;
          F.panel.aplicarAlfa();
        }, undefined, easeOut, F.panel);
      }
    }
    F.panel.mesh.renderOrder = 21;
    B.panel.mesh.renderOrder = 20;
    F.panel.redibujar();
    F.panel.interactivo = true;
    F.panel.mesh.visible = !!F.id;
    F.like.material.opacity = F.nope.material.opacity = 0;

    if (B.id !== b || !B.panel.mesh.visible) {
      B.id = b;
      B.panel.redibujar();
      this.poseTarjeta(B, POSE_ATRAS);
      B.panel.alfa = 0;
      if (b) {
        animar(300, (k) => {
          B.panel.alfa = k;
          B.panel.aplicarAlfa();
        }, undefined, easeOut, B.panel);
      }
    }
    B.panel.interactivo = false;
    B.panel.mesh.visible = !!b;
    B.like.material.opacity = B.nope.material.opacity = 0;
  }

  private poseTarjeta(t: Tarjeta, pose: { y: number; z: number; s: number }) {
    const m = t.panel.mesh;
    m.position.set(0, pose.y, pose.z);
    m.rotation.set(0, 0, 0);
    m.scale.setScalar(pose.s);
  }

  // -------------------------------------------------------------------------------------------
  // Redibujado
  // -------------------------------------------------------------------------------------------

  refrescar() {
    if (!this.abierta) return;
    this.principal.redibujar();
    this.sincronizarTarjetas();
    const hayLateral = !this.matchCon && (this.lateral === 'decide' || (this.lateral === 'perfil' && !!this.idLateral()));
    this.fijarVisible(this.izq, hayLateral);
    this.fijarVisible(this.der, hayLateral);
    if (hayLateral) {
      this.izq.redibujar();
      this.der.redibujar();
    }
    const dock = this.dockAbierto && this.pantalla !== 'llamada';
    this.fijarVisible(this.dock, dock);
    if (dock) this.dock.redibujar();
    this.barra.redibujar();
  }

  redibujarTodo() {
    this.refrescar();
    this.lanzador.redibujar();
    if (this.aviso) this.avisoPanel.redibujar();
    for (const t of this.tarjetas) t.panel.redibujar();
  }

  private fijarVisible(p: Panel, v: boolean) {
    if (p.mesh.userData.objetivo === v) return;
    p.mesh.userData.objetivo = v;
    p.interactivo = v;
    const desde = p.alfa;
    const hasta = v ? 1 : 0;
    animar(200, (k) => {
      p.alfa = desde + (hasta - desde) * k;
      p.aplicarAlfa();
      p.mesh.scale.setScalar(0.94 + 0.06 * p.alfa);
    }, undefined, easeOut, p);
  }

  // -------------------------------------------------------------------------------------------
  // Ventana espacial: colocar, mover, escalar, opacidad
  // -------------------------------------------------------------------------------------------

  private camaraActual(): THREE.Camera {
    return this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camara;
  }

  colocarFrente(obj: THREE.Object3D, dist: number, dy: number) {
    const cam = this.camaraActual();
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    cam.getWorldPosition(pos);
    cam.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.normalize();
    obj.position.copy(pos).addScaledVector(dir, dist);
    obj.position.y = pos.y + dy;
    // En XR el panel se inclina hacia los ojos; en la demo queda vertical.
    obj.lookAt(pos.x, this.renderer.xr.isPresenting ? pos.y : obj.position.y, pos.z);
  }

  /** Modo "al alcance": ventana cerca (~0,6 m) para tocarla con el índice. "Lejos": 1,25 m con rayo/pellizco. */
  get cercaActivo() {
    return this.renderer.xr.isPresenting && visual.alcance;
  }

  recentrar() {
    if (this.cercaActivo) this.colocarFrente(this.rig, 0.6, -0.24);
    else this.colocarFrente(this.rig, 1.25, -0.1);
  }

  /** Coloca el icono flotante: al alcance de la mano en XR. */
  colocarLanzador(dyExtra = 0) {
    if (this.renderer.xr.isPresenting) this.colocarFrente(this.lanzadorGrupo, 0.5, -0.22 + dyExtra);
    else this.colocarFrente(this.lanzadorGrupo, 0.75, -0.15 + dyExtra);
    this.baseLanzadorY = this.lanzadorGrupo.position.y;
  }

  aplicarAlcance() {
    this.rig.scale.setScalar(this.cercaActivo ? 0.8 : 1);
    this.recentrar();
  }

  alternarAlcance() {
    visual.alcance = !visual.alcance;
    guardarVisual();
    this.aplicarAlcance();
    this.barra.redibujar();
    this.toast(this.cercaActivo ? 'Al alcance: toca con el dedo índice' : visual.alcance ? 'Modo cercano (solo en RA)' : 'Lejos: apunta y pellizca');
  }

  moverVentana(fase: 'inicio' | 'mover' | 'fin', punto: THREE.Vector3) {
    if (fase === 'inicio') {
      this.offsetMover.copy(this.rig.position).sub(punto);
      return;
    }
    if (fase === 'mover') {
      this.rig.position.copy(punto).add(this.offsetMover);
      const cam = new THREE.Vector3();
      this.camaraActual().getWorldPosition(cam);
      this.rig.lookAt(cam.x, this.renderer.xr.isPresenting ? cam.y : this.rig.position.y, cam.z);
    }
  }

  escalar(d: number) {
    const s = THREE.MathUtils.clamp(Math.round((this.rig.scale.x + d) * 10) / 10, 0.7, 1.5);
    this.rig.scale.setScalar(s);
    this.toast(`Tamaño ${Math.round(s * 100)} %`);
  }

  cambiarOpacidad() {
    const i = OPACIDADES.findIndex((o) => Math.abs(o - visual.opacidad) < 0.01);
    visual.opacidad = OPACIDADES[(i + 1) % OPACIDADES.length];
    guardarVisual();
    this.redibujarTodo();
  }

  alternarContraste() {
    visual.altoContraste = !visual.altoContraste;
    guardarVisual();
    this.redibujarTodo();
  }

  alternarMovimiento() {
    visual.reducirMovimiento = !visual.reducirMovimiento;
    guardarVisual();
    this.redibujarTodo();
  }
}

function valoracionInicial(): Valoracion {
  return Object.fromEntries(CATEGORIAS.map((c) => [c, 4])) as Valoracion;
}

function selloMesh(texto: string, color: string, rot: number) {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 180;
  dibujarSello(c.getContext('2d')!, 400, 180, texto, color);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(200 * M_PX, 90 * M_PX),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  m.rotation.z = rot;
  m.renderOrder = 25;
  return m;
}

function guardarVisual() {
  try {
    localStorage.setItem('vibra-visual', JSON.stringify(visual));
  } catch {
    /* nada */
  }
}

function cargarVisual() {
  try {
    const v = JSON.parse(localStorage.getItem('vibra-visual') ?? 'null');
    if (v) Object.assign(visual, v);
  } catch {
    /* nada */
  }
}
