import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@svg': resolve(__dirname, '../worker/src/svg'),
    },
  },
});
