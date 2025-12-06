import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';




export default defineConfig({
 plugins: [
    react()],
  base: "my-he-project",  // <--- AJOUTE CETTE LIGNE (avec les slashs)
    nodePolyfills({
      // Ceci est vital pour SEAL
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  // Optimisation pour forcer le chargement de SEAL
  optimizeDeps: {
    include: ['node-seal'],
  }
});
