# YouTube Ads Bypass Refactor

## Objetivo

Esta extensión fue refactorizada para responder al detección anti-adblock de YouTube sin bloquear peticiones HTTP directas ni cancelar recursos de red de forma agresiva. La estrategia actual se centra en:

- detectar anuncios en la reproducción del video;
- silenciar y acelerar el flujo del anuncio;
- hacer click automático sobre el botón de skip cuando aparece;
- y limpiar la respuesta del reproductor en el contexto principal de la página para que YouTube no reciba la estructura de anuncio inicial.

## Caso de uso particular: YouTube

El caso de uso principal es la navegación por contenidos de YouTube donde se detecta la presencia de anuncios pre-roll, mid-roll o overlays del reproductor.

### Problema original

El sistema anti-adblock de YouTube puede detectar extensiones que:

- bloquean URLs de publicidad;
- cancelan requests a `/youtubei/v1/player`;
- o interceptan `ytInitialPlayerResponse` sin un tratamiento cuidadoso.

Cuando el código hace esto de forma visible, YouTube puede activar la advertencia de:

> "Se bloqueará el reproductor después de 3 videos"

### Nueva estrategia aplicada

#### 1) Fast-forwarding + auto click

Se implementa un `MutationObserver` que vigila cambios del DOM y detecta si el reproductor está mostrando publicidad. Cuando ocurre:

- se silencia el video con `video.muted = true`;
- se acelera la reproducción con `video.playbackRate = 16.0`;
- se intenta hacer clic sobre selectores dinámicos relacionados con el skip (`.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`, `button[aria-label*="Skip ad"]`, etc.).

Esto evita el bloqueo directo de peticiones y ofrece una forma más natural de avanzar el anuncio.

#### 2) Intercepción de `ytInitialPlayerResponse` en MAIN WORLD

Se crea un script inyectado con `world: "MAIN"` para ejecutar en el contexto principal de la página. Allí se intercepta:

- `window.ytInitialPlayerResponse`;
- `window.fetch` cuando apunta a `/youtubei/v1/player`;
- `XMLHttpRequest` de la misma ruta.

Antes de que el reproductor procese la respuesta, se elimina del JSON las claves relevantes:

- `adPlacements`
- `playerAds`
- `adSlots`

Esto permite mantener la carga normal del video sin avisar a YouTube que se está bloqueando publicidad de manera directa.

#### 3) Observador dinámico de selectores

Se evita depender únicamente de una clase CSS fija. La lógica analiza:

- texto del botón;
- `aria-label`;
- nodos del DOM activos;
- botones con texto o etiquetas tipo "Skip ad";
- selectores alternativos ante cambios de UI de YouTube.

Esto hace que la extensión sea más resiliente a cambios de estructura del DOM y del reproductor.

## Cambios corregidos en este proyecto

### Manifest V3

- Se confirmó el uso de `content_scripts` con `run_at: "document_start"`.
- Se añadieron scripts específicos para YouTube.
- Se configuraron permisos alojados con `host_permissions` apropiados para YouTube.
- Se evitó el uso de bloqueo de requests directos a través de `declarativeNetRequest` para este caso de uso concreto.

### Archivos añadidos

- `content/content-script.js`
  - `MutationObserver`
  - detección de anuncios del video
  - mute + playbackRate
  - auto click del skip

- `content/injected-script.js`
  - interceptación de `ytInitialPlayerResponse`
  - sanitización de payloads del reproductor
  - interceptación de `fetch` y `XMLHttpRequest`

### Validación del proyecto

Se ejecuta la suite de pruebas del repositorio para asegurar que no se introducen ejecuciones de código sospechosas ni permisos excesivos.

## Recomendaciones de uso

- Habilitar la extensión solo en YouTube durante pruebas.
- Revisar la consola del navegador para confirmar que se detectan anuncios y se ejecuta el bypass.
- Mantener la prueba en una pestaña con reproducción activa para verificar que no aparece el aviso de bloqueo del reproductor.

## Limitaciones

- YouTube puede ajustar la estructura del DOM o del payload del reproductor en futuras actualizaciones.
- La estrategia es compatible con un enfoque de evasión técnico, pero depende de la evolución del front-end de YouTube.
- No se debe combinar con bloqueos de red de alto nivel que puedan disparar detección automática.

## Estado final

La extensión queda preparada para el caso de uso concreto de YouTube, con una refactorización orientada a detectar y avanzar anuncios sin bloquear peticiones de red directas.
