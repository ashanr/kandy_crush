import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // The default globPatterns cover js/css/html/ico/png/svg only — without
        // mp3 here the announcer voice clips are copied to dist/ but never
        // precached, which silently breaks the offline playback guarantee that
        // is the whole reason these clips are pre-rendered instead of spoken
        // via the Web Speech API.
        globPatterns: ['**/*.{js,css,html,svg,mp3}'],
        // 36 voice clips push the precache past the default 2 MiB per-file /
        // total budget warnings; clips are small but numerous.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Candy Saga',
        short_name: 'Candy Saga',
        description: 'A match-3 candy crushing saga adventure.',
        theme_color: '#ff5da2',
        background_color: '#2b0a3d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
