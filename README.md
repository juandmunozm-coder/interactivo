# VIBRA · Barcelona 2050 (realidad aumentada para Meta Quest)

Prototipo académico (Cultura del Diseño 2, UX/UI crítica) de una app de citas **simulada** en realidad
aumentada. La interfaz flota en tu habitación (passthrough) y se usa con las **manos**: tocando con el
dedo índice o apuntando y pellizcando. También funciona con mandos y, en el PC, con ratón (modo demostración).

El usuario es **Juan David** (21, Barcelona) con **VIBRA Plus**: no hay anuncios ni bloqueos de pago.
El conflicto de diseño: las valoraciones de citas anteriores deciden a quién ves. La intervención,
**“Yo decido”**, permite ver y cambiar esos criterios.

> Perfiles y retratos ficticios generados con IA. No es un servicio real de citas ni un producto de Tinder o Meta.
> No se envía nada a personas reales: chats, likes y llamadas son guiones locales.

## Cómo probarlo en el Meta Quest

1. Requisitos: Node 20+ en el PC, y el Quest y el PC en la **misma red Wi-Fi**.
2. En esta carpeta:
   ```bash
   npm install
   npm run dev
   ```
   Vite mostrará algo como `https://192.168.1.7:5173` (usa la línea **Network**).
3. En el Quest abre **Meta Quest Browser** y entra en esa dirección `https://…:5173`.
   El certificado es local: pulsa *Avanzado → Continuar* la primera vez.
4. Pulsa **“Entrar en realidad aumentada”** y acepta los permisos (seguimiento de manos).
5. Si Windows pregunta por el firewall, permite el acceso de Node en redes privadas.

Para una versión estática: `npm run build` genera `dist/`, que se puede subir a cualquier hosting **HTTPS**
(WebXR no funciona por HTTP salvo en `localhost`).

Probar solo en el PC (modo demostración, sin RA): `npm run dev:http` y abrir `http://localhost:5180`.

## Recorrido (según el guion de viñetas)

| Viñeta | En la app |
|---|---|
| 1-2 Abrir la app | Aparece el icono de VIBRA flotando delante de ti. Tócalo con el dedo. |
| 3-4 Inicio de sesión | Omitido: la sesión de Juan David ya está iniciada. |
| 5 Elegir Swipe | El menú (Swipe · Likes · Chat · Perfil) se esconde en el **corazón del logo**: tócalo para abrirlo. |
| 6-7 Perfil y flecha | Tarjeta con foto. La **flecha** despliega dos paneles: *Sobre ella* (gustos) y *Calificaciones* (comunicación, puntualidad, amabilidad, compatibilidad, experiencia general + % del algoritmo). Arrastra la foto: derecha = me gusta, izquierda = paso. |
| 8-9 Likes | Pestañas *Recibidos*, *Enviados* y **Descartados**. |
| 10 Descartados | Perfiles con pocas estrellas: el panel explica **por qué no aparecen en “Para ti”** (baja compatibilidad, intención distinta, notas ajenas, ciudad), en lenguaje neutral. |
| 11-12 Chats | Lista de chats y conversación corta simulada con respuestas rápidas. Arriba a la derecha: **videollamada** y **escudo de seguridad** (denunciar con motivo o bloquear: deshace el match y borra el chat). |
| Llamada | Videollamada simulada sin audio: se ve la foto de ella y tu vista propia. Botón **Colgar**. |
| Calificar | Al colgar, deslizadores 1–5 para calificar a la persona en las cinco categorías. |
| Perfil | Juan David: foto, datos, gustos editables, biografía, Vibe Score **Pendiente** (no se inventa nota) y *Yo decido*. |

**Yo decido** (icono de ajustes en Swipe o en Perfil): “No usar valoraciones ajenas para ordenar” (entran los 15
perfiles), “Explorar sin priorizar compatibilidad” y “Ocultar puntuaciones” (solo presentación). Cambia el orden al
instante y se guarda en el dispositivo; *Restablecer* vuelve al estado inicial.

**Barra inferior** (ventana espacial): Mover (arrastra), Recentrar, **Cerca/Lejos** (cerca ≈ 0,6 m para tocar con el
dedo; lejos ≈ 1,25 m para apuntar y pellizcar), tamaño − / +, opacidad del cristal, alto contraste, animaciones,
Pausar (deja solo el icono flotante) y Salir (cierra la sesión RA).

## Estructura

```
src/
  main.ts          arranque, sesión immersive-ar, modo demostración y bucle
  app.ts           estado de interfaz, escena (paneles, tarjetas), swipe, navegación, ventana espacial
  pantallas.ts     dibujo de todas las pantallas y paneles
  estado.ts        datos persistentes (likes, matches, chats, valoraciones, ajustes) en localStorage
  logica.ts        lógica pura y comprobable: orden del mazo, medias, intereses en común, motivos
  xr/panel.ts      panel espacial: lienzo 2D → textura en un plano 3D, con zonas interactivas
  xr/entrada.ts    entrada unificada: ratón, rayos de mando/pellizco y toque con el índice
  ui/              tema (paleta, fuentes), iconos vectoriales y utilidades de dibujo
  data/perfiles.json     16 perfiles del documento original (sin cambios)
  data/simulacion.json   likes recibidos, matches iniciales y guiones de chat (datos de simulación)
public/perfiles/   retratos optimizados (JPG 720 px). Los PNG originales siguen en ../vibra/assets/perfiles
tests/logica.test.ts   pruebas de datos y orden (npm test)
```

## Decisiones técnicas

- **Three.js 0.170 + WebXR** (`immersive-ar`, `local-floor`, `hand-tracking` opcional), Vite 5.4, TypeScript 5.6.
  El prompt proponía Immersive Web SDK (IWSDK); se usó Three.js con la API WebXR estándar porque es estable y está
  documentada, para no inventar imports del SDK. Toda la UI vive dentro de la escena XR (no es HTML superpuesto).
- Passthrough: el render tiene fondo transparente en RA; el fondo violeta solo existe en el modo demostración.
- Los paneles se dibujan en canvas 2D (Inter / Sora, incluidas con `@fontsource`) y se suben como texturas con
  mipmaps; solo se redibujan cuando cambia algo. La tarjeta es un objeto 3D propio para poder arrastrarla.
- Detección de planos, hit-test y anclajes **no** están implementados: la colocación es manual (recentrar/mover).

## Qué está verificado y qué no

- ✔ `npm test`: 16 perfiles y 16 fotos, 10 recomendados + 5 fuera, medias iguales a los datos, Juan David sin nota,
  orden por “Yo decido” (incluye los 15 sin notas; orden alfabético sin ambos criterios; ocultar no cambia el orden).
- ✔ Modo demostración probado en navegador de escritorio: swipe, match, likes/descartados, paneles de detalle,
  Yo decido, chat, videollamada, calificación y perfil.
- ✘ **No probado en un visor físico.** La sesión RA, el seguimiento de manos y el toque con el índice siguen la API
  WebXR de Three.js, pero hay que comprobarlos en el Quest (rendimiento, distancias, umbrales de toque).
