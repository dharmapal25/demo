import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Flash Chat App',
        short_name: 'ChatApp',
        description: 'PWA Chat App',
        theme_color: '#000000',
        background_color: '#272727ff',
        display: 'standalone',
        icons: [
          {
            src: '/Flash.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Flash.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
