import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildSunoProfileUrl, mapSunoProfileResponse } from './src/application/adapters/sunoProfileAdapter'
import { parseArtistInput } from './src/application/usecases/parseArtistInput'

function sunoProfileDevApi(): Plugin {
  return {
    name: 'suno-profile-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/suno/profile', async (req, res) => {
        try {
          const host = req.headers.host ?? 'localhost'
          const url = new URL(req.url ?? '', `http://${host}`)
          const handle = parseArtistInput(url.searchParams.get('handle') ?? '')
          if (!handle) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Handle invalide' }))
            return
          }

          const page = Number(url.searchParams.get('page') ?? '1') || 1
          const response = await fetch(buildSunoProfileUrl(handle, page), {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SunoPublicPlayer/1.0',
            },
          })

          if (response.status === 404) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Artiste introuvable' }))
            return
          }

          if (!response.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Suno a refuse la requete publique' }))
            return
          }

          const payload = await response.json()
          const catalog = mapSunoProfileResponse(payload)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(catalog))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: "Impossible de lire le profil public Suno" }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    sunoProfileDevApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'Suno Public Player',
        short_name: 'Suno Player',
        description: 'Lecteur multi-artistes pour les sons publics Suno, avec cache local optionnel.',
        theme_color: '#0c1118',
        background_color: '#0c1118',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/tracks/**', '**/visual/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn2\.suno\.ai\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'suno-covers',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
        ],
      },
    }),
  ],
})
