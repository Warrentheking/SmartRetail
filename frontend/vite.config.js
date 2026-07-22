import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SmartRetail',
        short_name: 'SmartRetail',
        description: 'AI-driven POS and inventory management for Ghanaian SMEs',
        theme_color: '#2a78d6',
        background_color: '#2a78d6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Never cache API responses - stock levels, prices, and sales
            // must always be fresh, never served from the service worker.
            urlPattern: ({ url, sameOrigin }) =>
              !sameOrigin || url.hostname.endsWith('onrender.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
