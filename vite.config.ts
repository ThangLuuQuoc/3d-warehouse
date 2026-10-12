import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js core is ~700 kB minified (~180 kB gzip) and cannot be tree-shaken further;
    // the limit sits just above it so any real growth in app code still warns.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        // Vendor libraries in their own long-lived chunks, cached across app releases.
        manualChunks: { three: ['three'], r3f: ['@react-three/fiber'], drei: ['@react-three/drei'] },
      },
    },
  },
});
