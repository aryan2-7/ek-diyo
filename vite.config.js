import { defineConfig } from 'vite';

// Link previews (og:image) need absolute URLs. On Vercel the production domain is filled in automatically;
// anywhere else, build with VITE_SITE_URL=https://your-site. Left empty (local builds) the tags use root-relative paths.
const siteUrl = () => {
  const v =
    process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    '';
  return v.replace(/\/$/, '');
};

export default defineConfig({
  base: './', // works from any sub-path (GitHub Pages, Netlify, a zip opened on a server)
  plugins: [{ name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl()) }],
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
