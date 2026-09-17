import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' mientras estamos en pleno testing: la app se actualiza
      // sola sin depender de que aparezca un cartel y alguien lo toque (esto
      // estaba dando problemas — el celu no siempre chequeaba a tiempo).
      // Antes de que esto lo use un chofer de verdad en la calle, volver a
      // 'prompt' para no interrumpirlo a mitad de una entrega.
      registerType: 'autoUpdate',
      manifest: {
        name: '7 Cajas — Reparto',
        short_name: '7 Cajas',
        description: 'App del chofer para el reparto de aceite',
        theme_color: '#f5a623',
        background_color: '#fdf6ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // Para poder abrirlo desde el celu en la misma red WiFi.
    host: true,
  },
})
