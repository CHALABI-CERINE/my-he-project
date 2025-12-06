import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// ⚠️ REMPLACEZ 'nom-de-votre-repo' PAR LE VRAI NOM DE VOTRE DÉPÔT GITHUB
// Exemple : si votre url est https://chalabi-cerine.github.io/secure-he-app/
// Alors base doit être '/secure-he-app/'
const REPO_NAME = "/my-he-project/"; 

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  // Important pour GitHub Pages
  base: REPO_NAME, 
  build: {
    target: 'esnext', // Indispensable pour le support Top-Level Await / WASM
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['node-seal'] // Souvent mieux d'exclure le WASM de l'optimisation pure
  }
});
