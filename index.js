const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const https = require('https');
require('dotenv').config();

const app = express();

// Configuración
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const ADDON_PORT = process.env.PORT || 3000;
const ADDON_ID = 'org.stremio.top10tmdb';

// URLs de TMDB
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTERS_PLUS_URL = 'https://postersplus.stremio.ru/poster';

// Parámetros de PostersPlus (ajusta según necesites)
const POSTERS_PARAMS = {
  primary_client: 'stremio_tv_nuvio',
  top_gradient: 'off',
  bottom_gradient: 'off',
  fallback_to_imdb: 'false',
  rating_display_mode: '0',
  frost_reference: 'true',
  textless: 'false',
  use_original_art: 'false',
  original_art_source: 'primary',
  logo_language: 'es-mx',
  logo_priority: 'native_custom_text',
  logo_language_secondary: 'es-es',
  fallback_bg_style: 'photoreal',
  logo_max_w_ratio: '0.75',
  logo_max_h_ratio: '0.25',
  logo_bottom_ratio: '0.28',
  logo_bottom_anchor: 'true',
  sash_mode: 'hidden',
  cinema_greyscale: 'false',
  cinema_greyscale_skip_if_available: 'false',
  release_status_cinema_only: 'true',
  badge_display_mode: '0'
};

// ===== MANIFIESTO DEL ADDON =====
const manifest = {
  id: ADDON_ID,
  version: '1.0.0',
  name: 'Top 15 TMDB - Trending',
  description: 'Catálogo con el Top 15 Trending de películas y series de TMDB, con pósters numerados',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    {
      type: 'movie',
      id: 'top15_movies',
      name: 'Top 15 Películas - Trending',
      extra: []
    },
    {
      type: 'series',
      id: 'top15_series',
      name: 'Top 15 Series - Trending',
      extra: []
    }
  ],
  idPrefixes: ['tt'],
  background: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=600&fit=crop',
  logo: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a3b168cea5eb17046ca2beb76817c63d8f1b0fda8db32b46e00f457b3861.svg'
};

// ===== FUNCIONES AUXILIARES =====

/**
 * Obtiene una película o serie de TMDB con su IMDB ID
 */
async function getTMDBItem(tmdbId, type) {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await axios.get(`${TMDB_BASE}/${endpoint}/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'es-MX'
      }
    });

    const data = response.data;
    const externalIds = await axios.get(
      `${TMDB_BASE}/${endpoint}/${tmdbId}/external_ids`,
      { params: { api_key: TMDB_API_KEY } }
    );

    return {
      id: externalIds.data.imdb_id,
      tmdbId,
      type,
      name: type === 'movie' ? data.title : data.name,
      description: data.overview,
      poster: data.poster_path,
      rating: data.vote_average,
      year: type === 'movie'
        ? new Date(data.release_date).getFullYear()
        : new Date(data.first_air_date).getFullYear(),
      imdbId: externalIds.data.imdb_id
    };
  } catch (error) {
    console.error(`Error fetching item ${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Obtiene el top 10 trending de TMDB
 */
async function getTopTrending(type, limit = 15) {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await axios.get(`${TMDB_BASE}/trending/${endpoint}/week`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'es-MX'
      }
    });

    const results = response.data.results.slice(0, limit);
    const items = [];

    for (let i = 0; i < results.length; i++) {
      const item = await getTMDBItem(results[i].id, type);
      if (item) {
        item.rank = i + 1; // Agregar ranking
        items.push(item);
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching trending:', error.message);
    return [];
  }
}

/**
 * Construye URL de PostersPlus
 */
function buildPostersUrl(tmdbId, imdbId, type, rank) {
  const params = new URLSearchParams({
    ...POSTERS_PARAMS,
    tmdb_id: tmdbId,
    imdb_id: imdbId || '',
    type: type === 'movie' ? 'movie' : 'tv'
  });

  // Agregamos el rank como parámetro personalizado (PostersPlus puede ignorarlo)
  params.append('_rank', rank);

  return `${POSTERS_PLUS_URL}?${params.toString()}`;
}

/**
 * Obtiene imagen de PostersPlus y superpone el número
 */
async function generateRankedPoster(posterUrl, rank) {
  try {
    // Obtener imagen de PostersPlus
    const response = await axios.get(posterUrl, {
      responseType: 'arraybuffer',
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const imageBuffer = Buffer.from(response.data, 'binary');

    // Crear SVG overlay con el número (aumentado para números de 2 dígitos)
    const rankSvg = `
      <svg width="240" height="240">
        <circle cx="120" cy="120" r="110" fill="rgba(0, 0, 0, 0.8)"/>
        <text x="120" y="145" font-size="160" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">
          ${rank}
        </text>
      </svg>
    `;

    // Superponer en la esquina superior izquierda
    const result = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(rankSvg),
          top: 10,
          left: 10,
          blend: 'over'
        }
      ])
      .webp({ quality: 80 })
      .toBuffer();

    return result;
  } catch (error) {
    console.error('Error generating ranked poster:', error.message);
    // Retornar imagen original si falla
    return await axios.get(posterUrl, { responseType: 'arraybuffer' })
      .then(r => Buffer.from(r.data, 'binary'))
      .catch(() => null);
  }
}

// ===== RUTAS DEL ADDON =====

/**
 * Manifiesto (requerido por Stremio)
 */
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

/**
 * Catálogos
 */
app.get('/catalog/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  try {
    const isMovie = id === 'top15_movies';
    const isTV = id === 'top15_series';

    if (!isMovie && !isTV) {
      return res.status(404).json({ error: 'Catálogo no encontrado' });
    }

    const contentType = isMovie ? 'movie' : 'series';
    const items = await getTopTrending(contentType, 15);

    const metas = items.map(item => ({
      id: item.imdbId,
      type: item.type,
      name: `${item.rank}. ${item.name}`,
      poster: `/poster/${item.tmdbId}/${item.imdbId}/${item.type}/${item.rank}`,
      description: item.description,
      rating: Math.round(item.rating * 10) / 10,
      year: item.year
    }));

    res.json({ metas });
  } catch (error) {
    console.error('Error in catalog route:', error);
    res.status(500).json({ error: 'Error obteniendo catálogo' });
  }
});

/**
 * Ruta personalizada para pósters con número superpuesto
 */
app.get('/poster/:tmdbId/:imdbId/:type/:rank', async (req, res) => {
  const { tmdbId, imdbId, type, rank } = req.params;

  try {
    const posterUrl = buildPostersUrl(tmdbId, imdbId, type, parseInt(rank));
    const rankedImage = await generateRankedPoster(posterUrl, rank);

    if (rankedImage) {
      res.set('Content-Type', 'image/webp');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(rankedImage);
    } else {
      // Redirigir a PostersPlus si falla la generación
      res.redirect(posterUrl);
    }
  } catch (error) {
    console.error('Error generating poster:', error);
    res.status(500).json({ error: 'Error generando póster' });
  }
});

/**
 * Meta (información de items individuales)
 */
app.get('/meta/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  try {
    // Convertir IMDB ID a TMDB ID
    const tmdbId = await getTMDBIdFromImdb(id);
    if (!tmdbId) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    const item = await getTMDBItem(tmdbId, type);
    if (!item) {
      return res.status(404).json({ error: 'No encontrado' });
    }

    res.json({
      meta: {
        id: item.imdbId,
        type: item.type,
        name: item.name,
        poster: buildPostersUrl(item.tmdbId, item.imdbId, item.type, 0),
        description: item.description,
        rating: item.rating,
        year: item.year
      }
    });
  } catch (error) {
    console.error('Error in meta route:', error);
    res.status(500).json({ error: 'Error obteniendo información' });
  }
});

/**
 * Obtener TMDB ID desde IMDB ID
 */
async function getTMDBIdFromImdb(imdbId) {
  try {
    const response = await axios.get(`${TMDB_BASE}/find/${imdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        external_source: 'imdb_id'
      }
    });

    const movie = response.data.movie_results?.[0];
    const tv = response.data.tv_results?.[0];

    return movie?.id || tv?.id || null;
  } catch (error) {
    console.error(`Error finding TMDB ID for ${imdbId}:`, error.message);
    return null;
  }
}

/**
 * Health check
 */
app.get('/', (req, res) => {
  res.json({ status: 'OK', addon: manifest.name });
});

// ===== INICIAR SERVIDOR =====
app.listen(ADDON_PORT, () => {
  console.log(`🎬 Addon Top 10 TMDB corriendo en puerto ${ADDON_PORT}`);
  console.log(`📋 Manifiesto en http://localhost:${ADDON_PORT}/manifest.json`);
  console.log(`🔗 Añade a Stremio: http://localhost:${ADDON_PORT}/manifest.json`);
});

module.exports = app;
           
