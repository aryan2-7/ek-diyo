import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // works from any sub-path (GitHub Pages, Netlify, a zip opened on a server)
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // keep the big engine in its own cached file
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
