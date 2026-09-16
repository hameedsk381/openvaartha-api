import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  server: {
    port: 4321,
    proxy: {
      // Proxy API calls to the FastAPI backend in development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react', 'motion', 'embla-carousel-react', 'embla-carousel-autoplay'],
    },
  },
});
