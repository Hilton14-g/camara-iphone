# 📸 Cámara iPhone — Web App con Smart HDR y Live Photos

Una aplicación web progresiva (PWA) de cámara diseñada con la estética, nitidez y experiencia auténtica de un **iPhone 16 Pro / iOS 18**, lista para ser desplegada en **Vercel**.

---

## ✨ Características Principales

### 1. 🔍 Calidad y Nitidez de iPhone (Smart HDR & Deep Fusion)
- **Pipeline de Nitidez (Unsharp Mask)**: Algoritmo de convolución por software que rescata microtexturas (ojos, cabello, bordes) eliminando la apariencia borrosa típica de las cámaras web estándar.
- **Rango Dinámico Smart HDR**: Curva de tonos S-Curve que rescata luces altas para evitar cielos quemados y levanta sombras preservando negros profundos.
- **Estilos Fotográficos de Apple**:
  - *Estándar*: Equilibrado y fiel a la realidad.
  - *Contraste Intenso*: Sombras dramáticas y colores profundos.
  - *Brillante*: Tonos vivos y luminosos manteniendo tonos de piel naturales.
  - *Cálido*: Matices dorados estilo atardecer californiano.
  - *Frío*: Subtonos fríos y modernos.
- **Modo Retrato (Portrait Mode)**: Simulación de apertura óptica (ƒ/1.4 - ƒ/2.4) con desenfoque de fondo bokeh y luz de estudio.

### 2. 🎞️ Fotos en Vivo (Live Photos Animadas)
- Graba automáticamente **1.6 segundos de video sincronizado con audio** alrededor de la fotografía en alta resolución.
- Indicador icónico **"LIVE"** en amarillo con anillos concéntricos animados en la barra superior.
- En la Galería: **Mantén presionado (Click & Hold / Tap & Hold)** la foto para reproducir el movimiento en vivo con audio y respuesta háptica.
- Efectos de Live Photo: *En Vivo*, *Bucle (Loop)* y *Rebote (Bounce)*.

### 3. 💾 Guardado Automático y Descargas
- **Persistencia en IndexedDB**: Todas tus fotos y fotos en vivo se guardan automáticamente en la memoria del navegador. Aunque recargues la página o cierres la pestaña, tus fotos seguirán ahí.
- **Descarga Automática**: Activa el switch *"Descarga Automática"* en el menú superior para que cada disparo guarde instantáneamente el archivo en tu carpeta de Descargas.
- **Exportación Flexible en Galería**:
  - Descargar Foto en Alta Calidad (`.jpg`).
  - Descargar Video en Vivo (`.mp4` / `.webm`).
  - Descargar Ambos en un clic.
  - Compartir directo a WhatsApp, Instagram o AirDrop (Web Share API).

### 4. 🎛️ Controles y Experiencia iOS 18
- **Enfoque táctil con medidor de exposición**: Toca cualquier punto de la pantalla para enfocar; aparece el recuadro amarillo con el deslizador de sol para ajustar el brillo (EV) en tiempo real.
- **Nivel de horizonte (Spirit Level)** estilo iOS 17/18 que se vuelve amarillo al estar nivelado.
- **Control de Zoom**: Botones circulares `.5`, `1x`, `2x` y `3x`.
- **Selector de Modos**: *VIDEO*, *FOTO*, *RETRATO*, *CUADRADO*.
- **Temporizador**: Apagado, 3s y 10s con pitidos auditivos y cuenta regresiva.
- **Sonido háptico y auditivo auténtico**: Clic mecánico de obturador y campana de Live Photo sintetizados con Web Audio API (sin archivos externos).
- **Modo de Prueba / Cámara Simulada**: Si pruebas en una PC sin webcam física o con permisos bloqueados, puedes activar la cámara de prueba interactiva con movimiento 3D.

---

## 🚀 Despliegue en Vercel

Esta aplicación está 100% optimizada para Vercel:

### Opción 1: Con Vercel CLI (desde tu terminal)
```bash
npx vercel
```
Sigue los pasos y ¡listo! Tu enlace HTTPS estará funcionando en segundos.

### Opción 2: Con GitHub / Vercel Dashboard
1. Sube esta carpeta a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "iPhone Camera App"
   git branch -M main
   # Agrega tu repositorio remoto y haz git push
   ```
2. Ve a [vercel.com](https://vercel.com) e inicia sesión.
3. Haz clic en **"Add New Project"** e importa tu repositorio.
4. Vercel detectará Vite automáticamente:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Haz clic en **Deploy**.

> **Nota importante para cámaras en la web**: Los navegadores modernos (Safari, Chrome) exigen **HTTPS** para acceder a la cámara del usuario. Vercel proporciona HTTPS automático y gratuito con certificado SSL, por lo que la cámara funcionará perfectamente tanto en iPhones como en teléfonos Android y computadoras.

---

## 🛠️ Ejecución Local

Para probarlo en tu propia máquina:
```bash
npm install
npm run dev
```
Abre en tu navegador: `http://localhost:5173`
