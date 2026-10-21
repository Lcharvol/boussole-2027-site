// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://lcharvol.github.io',
  base: '/boussole-2027-site',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  // Aucun script tiers, aucune télémétrie côté visiteur.
  devToolbar: { enabled: false },
});
