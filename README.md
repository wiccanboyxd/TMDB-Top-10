# 🎬 Addon Stremio - Top 15 TMDB Trending

Addon para Stremio que muestra el catálogo Top 15 Trending de películas y series de TMDB, con pósters numerados usando PostersPlus.

## ✨ Características

- 📺 Catálogos separados para películas y series
- 🏆 Top 15 basado en trending semanal de TMDB
- 🎨 Pósters con número de ranking superpuesto (1-15)
- 🌐 Integración con PostersPlus para alta calidad
- 🇪🇸 Idioma español (México)
- ⚡ Caché optimizado

## 📋 Requisitos

- **Node.js** 14+ (si lo descargas localmente)
- **API Key de TMDB** (gratuita)
- **Stremio** versión reciente

## 🚀 Instalación

### 1️⃣ Opción A: Instalación Local (Desarrollo)

```bash
# Clonar o descargar el proyecto
cd stremio-top10

# Instalar dependencias
npm install

# Copiar archivo .env
cp .env.example .env

# Editar .env y agregar tu TMDB API Key
# nano .env  (o abre en tu editor favorito)

# Iniciar el addon
npm start
```

El addon estará disponible en: `http://localhost:3000/manifest.json`

### 2️⃣ Opción B: Deployment en Heroku/Vercel/Render

Usa cualquier servicio gratuito compatible con Node.js y agrega la variable de entorno `TMDB_API_KEY`.

## 🔑 Obtener API Key de TMDB

1. Ve a https://www.themoviedb.org/settings/api
2. Crea una cuenta si no tienes (es gratis)
3. Solicita una API Key para aplicación
4. Copia la key en tu archivo `.env`

```env
TMDB_API_KEY=abc123xyz...
PORT=3000
```

## 📱 Agregar a Stremio

1. Abre **Stremio**
2. Ve a **Configuración** → **Addons**
3. Pega la URL: `http://localhost:3000/manifest.json` (desarrollo local)
   - O tu URL de deployment en producción
4. Haz clic en **INSTALAR**
5. ¡Disfruta del Top 15!

## 🎨 Personalización

### Cambiar idioma de TMDB

En `index.js`, línea ~38, cambia `logo_language`:

```javascript
const POSTERS_PARAMS = {
  ...
  logo_language: 'es-mx',        // Cambiar a: es-es, en, fr, etc.
  logo_language_secondary: 'es-es'
};
```

### Ajustar estilos del póster

Todos estos parámetros pueden modificarse en `POSTERS_PARAMS`:

- `textless`: `true/false` (mostrar/ocultar texto)
- `use_original_art`: `true/false` (arte original vs póster TMDB)
- `top_gradient`, `bottom_gradient`: Gradientes en bordes
- `sash_mode`: `hidden/overlay` (cinta del sash)

### Cambiar cantidad de items (Top 50, Top 20, etc.)

En la ruta `/catalog/:type/:id`, cambia el número del segundo parámetro:

```javascript
const items = await getTopTrending(contentType, 50); // Cambiar a 50 para Top 50
```

## 🐛 Solucionar Problemas

### "Error: No se puede conectar a TMDB"
- Verifica que tu `TMDB_API_KEY` sea correcta
- Comprueba tu conexión a internet
- Revisa que el servidor TMDB esté activo (https://www.themoviedb.org)

### "Los pósters no cargan"
- PostersPlus puede estar saturado — espera unos minutos
- Verifica que `imdb_id` esté disponible para el contenido
- Intenta sin el parámetro `fallback_to_imdb` en `POSTERS_PARAMS`

### "Addon no aparece en Stremio"
- Asegúrate de que el puerto 3000 esté accesible
- Prueba `http://localhost:3000/manifest.json` en el navegador
- En otros dispositivos, usa `http://tu_ip:3000/manifest.json`

## 📊 Estructura del Addon

```
/manifest.json          ← Información del addon (requerido)
/catalog/:type/:id     ← Catálogos (películas/series)
/meta/:type/:id        ← Información de items
/poster/:tmdbId/...    ← Genera pósters con números
```

## 🔄 Cómo Funciona

1. **Stremio pide catálogo** → Addon obtiene Top 15 trending de TMDB
2. **Por cada item**:
   - Obtiene ID de IMDB desde TMDB
   - Construye URL de PostersPlus con tus parámetros
   - Genera imagen con número superpuesto (1-15)
3. **Stremio muestra catálogo** con películas/series y pósters numerados

## 📝 Notas

- Los datos se actualizan cada vez que Stremio pide catálogo
- PostersPlus cachea imágenes automáticamente
- Los números están en la esquina superior izquierda
- Compatible con otros addons de streams

## 📄 Licencia

MIT - Úsalo libremente

## 🤝 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica tu API Key de TMDB
3. Asegúrate de que PostersPlus esté disponible
4. Prueba con otro navegador/dispositivo

---

**¡Disfruta tu addon Top 15 personalizado!** 🚀🎬

